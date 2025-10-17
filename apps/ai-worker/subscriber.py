# apps/ai-worker/subscriber.py
import os
import json
import asyncio
import requests # <-- Import
from dotenv import load_dotenv
from google.cloud import pubsub_v1
from services.audio_processor import HapticGenerator

load_dotenv()

# --- Configuration ---
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
SUBSCRIPTION_ID = os.getenv("PUB_SUB_SUBSCRIPTION_ID")
INPUT_BUCKET = os.getenv("GCS_INPUT_BUCKET")
OUTPUT_BUCKET = os.getenv("GCS_OUTPUT_BUCKET")
API_BASE_URL = os.getenv("API_BASE_URL") # <-- Get API URL
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

haptic_generator = HapticGenerator()

# --- 🚀 NEW FUNCTION STARTS HERE 🚀 ---
def update_job_status(job_id: str, status: str, output_url: str = None):
    """Calls the NestJS API to update the job status."""
    update_url = f"{API_BASE_URL}/jobs/{job_id}"
    payload = {"status": status}
    if output_url:
        payload["outputUrl"] = output_url

    try:
        response = requests.patch(update_url, json=payload)
        response.raise_for_status() # Raises an exception for 4xx/5xx errors
        print(f"✅ API notified. Job {job_id} status updated to {status}.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to update job status via API: {e}")
# --- 🚀 NEW FUNCTION ENDS HERE 🚀 ---


def process_message(message: pubsub_v1.subscriber.message.Message) -> None:
    """Callback function to process a single Pub/Sub message."""
    job_id = None # Define job_id here to use in the except block
    try:
        data = json.loads(message.data.decode("utf-8"))
        job_id = data.get("jobId")
        video_filename = data.get("videoFilename")

        if not job_id or not video_filename:
            print("Error: Invalid message format received.")
            message.nack()
            return

        print(f"▶️ Received job: {job_id}. Processing file: {video_filename}")

        # Update status to PROCESSING in the database
        update_job_status(job_id, "PROCESSING")

        result = asyncio.run(
            haptic_generator.process_gcs_video(
                job_id=job_id,
                input_bucket=INPUT_BUCKET,
                input_filename=video_filename,
                output_bucket=OUTPUT_BUCKET,
                output_formats=["json", "ahap"]
            )
        )

        # If successful, update status to COMPLETED
        update_job_status(job_id, "COMPLETED", output_url=result.get("output_path"))
        print(f"✅ Finished processing job: {job_id}")
        message.ack()

    except Exception as e:
        print(f"❌ Error processing job {job_id}: {e}")
        if job_id:
            # If anything fails, update status to FAILED
            update_job_status(job_id, "FAILED")
        message.ack() # Ack the message so we don't retry a failing job

# ... (main() function remains the same)
def main():
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(GCP_PROJECT_ID, SUBSCRIPTION_ID)
    print(f"🎧 Listening for messages on {subscription_path}...")
    streaming_pull_future = subscriber.subscribe(subscription_path, callback=process_message)
    try:
        streaming_pull_future.result()
    except KeyboardInterrupt:
        streaming_pull_future.cancel()
        print("Subscriber stopped.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        streaming_pull_future.cancel()

if __name__ == "__main__":
    main()