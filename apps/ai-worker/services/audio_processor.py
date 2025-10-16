# apps/ai-worker/services/audio_processor.py

import librosa
import numpy as np
from pydub import AudioSegment
import ffmpeg
import json
import os
import tempfile
from typing import List
from google.cloud import storage

class HapticGenerator:
    """Generate haptic patterns from audio using established algorithms"""

    def __init__(self):
        self.storage_client = storage.Client()

    def download_from_gcs(self, bucket_name: str, blob_name: str) -> str:
        """Downloads a video from GCS to a temporary local file."""
        bucket = self.storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        # Create a temporary file to download the video to
        _, temp_local_filename = tempfile.mkstemp(suffix=".mp4")
        blob.download_to_filename(temp_local_filename)
        
        print(f"Downloaded gs://{bucket_name}/{blob_name} to {temp_local_filename}")
        return temp_local_filename

    def upload_to_gcs(self, bucket_name: str, source_file_path: str, destination_blob_name: str):
        """Uploads a generated file to GCS."""
        bucket = self.storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)
        blob.upload_from_filename(source_file_path)
        print(f"Uploaded {source_file_path} to gs://{bucket_name}/{destination_blob_name}")

    async def process_gcs_video(self, job_id: str, input_bucket: str, input_filename: str, output_bucket: str, output_formats: List[str]):
        """
        Cloud version: Download from GCS -> Process -> Upload results to GCS
        """
        local_video_path = None
        temp_audio_path = None
        temp_output_files = {}

        try:
            # 1. Download video from GCS to a temporary local path
            local_video_path = self.download_from_gcs(input_bucket, input_filename)

            # 2. Extract audio into another temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio_file:
                temp_audio_path = temp_audio_file.name
            
            self.extract_audio(local_video_path, temp_audio_path)
            
            # 3. Load and analyze audio
            audio, sr = librosa.load(temp_audio_path, sr=44100, duration=180)
            
            # 4. Extract features and generate patterns
            features = self.extract_audio_features(audio, sr)
            haptic_patterns = self.generate_haptic_patterns(features)
            
            # 5. Create output files in a temporary location
            with tempfile.TemporaryDirectory() as temp_dir:
                output_paths = await self.create_outputs_local(temp_dir, haptic_patterns, output_formats)
                
                # 6. Upload each generated file to the output bucket
                for fmt, path in output_paths.items():
                    destination_blob = f"{job_id}/haptic.{fmt}"
                    self.upload_to_gcs(output_bucket, path, destination_blob)
            
            return {"status": "success", "job_id": job_id, "output_path": f"gs://{output_bucket}/{job_id}/"}

        finally:
            # 7. Clean up all temporary files
            if local_video_path and os.path.exists(local_video_path):
                os.remove(local_video_path)
            if temp_audio_path and os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)

    def extract_audio(self, video_path: str, audio_path: str):
        """Use FFmpeg to extract audio from video"""
        try:
            (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='44100')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            error_detail = e.stderr.decode('utf8')
            print("FFmpeg stderr:", error_detail)
            raise Exception(f"ffmpeg error: {error_detail}")

    async def create_outputs_local(self, output_dir: str, haptic_patterns: dict, formats: List[str]) -> dict:
        """Saves output files to a specified local directory."""
        output_paths = {}
        if 'json' in formats:
            path = os.path.join(output_dir, 'haptic.json')
            with open(path, 'w') as f:
                json.dump(haptic_patterns, f, indent=2)
            output_paths['json'] = path
        
        if 'ahap' in formats:
            path = os.path.join(output_dir, 'haptic.ahap')
            ahap_data = self.convert_to_ahap(haptic_patterns)
            with open(path, 'w') as f:
                f.write(ahap_data)
            output_paths['ahap'] = path
        return output_paths

    # --- (extract_audio_features, generate_haptic_patterns, convert_to_ahap methods remain the same) ---
    def extract_audio_features(self, audio: np.ndarray, sr: int) -> dict:
        onset_env = librosa.onset.onset_strength(y=audio, sr=sr)
        tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        return {
            'tempo': tempo, 'beats': librosa.frames_to_time(beats, sr=sr).tolist(),
            'onset_times': librosa.onset.onset_detect(y=audio, sr=sr, units='time').tolist(),
            'rms': librosa.feature.rms(y=audio)[0].tolist(),
            'spectral_centroid': librosa.feature.spectral_centroid(y=audio, sr=sr)[0].tolist(),
            'spectral_rolloff': librosa.feature.spectral_rolloff(y=audio, sr=sr)[0].tolist(),
            'duration_frames': len(audio)
        }

    def generate_haptic_patterns(self, features: dict) -> dict:
        haptic_events = []
        for beat_time in features['beats']:
            haptic_events.append({'time': beat_time, 'intensity': 1.0, 'duration': 0.1, 'type': 'transient', 'sharpness': 0.8})
        for onset_time in features['onset_times']:
            haptic_events.append({'time': onset_time, 'intensity': 0.6, 'duration': 0.05, 'type': 'transient', 'sharpness': 0.5})
        haptic_events.sort(key=lambda x: x['time'])
        unique_events = []
        last_time = -1
        for event in haptic_events:
            if event['time'] > last_time + 0.05:
                unique_events.append(event)
                last_time = event['time']
        return {
            'events': unique_events,
            'metadata': { 'tempo': features['tempo'], 'total_events': len(unique_events), 'duration': librosa.frames_to_time(features['duration_frames'], sr=44100) }
        }

    def convert_to_ahap(self, patterns: dict) -> str:
        ahap_pattern = []
        for event in patterns['events']:
            ahap_pattern.append({
                "Event": { "Time": event['time'], "EventType": "HapticTransient",
                    "EventParameters": [ {"ParameterID": "HapticIntensity", "ParameterValue": event['intensity']}, {"ParameterID": "HapticSharpness", "ParameterValue": event['sharpness']} ]
                }
            })
        return json.dumps({"Version": 1.0, "Pattern": ahap_pattern}, indent=2)