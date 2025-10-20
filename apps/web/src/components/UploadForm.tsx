'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

type UploadStatus = 'initial' | 'uploading' | 'creating_job' | 'success' | 'error';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('initial');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const { token } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setStatus('initial');
      setJobId(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError(null);
    setJobId(null);
    setStatus('uploading');

    try {
      const urlResponse = await fetch('http://localhost:3000/jobs/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!urlResponse.ok) throw new Error('Failed to get pre-signed URL.');
      const { url } = await urlResponse.json();

      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error('File upload to GCS failed.');

      setStatus('creating_job');

      const createJobResponse = await fetch('http://localhost:3000/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoFilename: file.name }),
      });
      if (!createJobResponse.ok) throw new Error('Failed to create job record.');
      const newJob: { id: string } = await createJobResponse.json();

      setJobId(newJob.id);
      setStatus('success');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('An unexpected error occurred.');
      setStatus('error');
    }
  };

  const isProcessing = status === 'uploading' || status === 'creating_job';

  let buttonText = 'Upload & Process';
  if (status === 'uploading') buttonText = 'Uploading...';
  if (status === 'creating_job') buttonText = 'Finalizing...';

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo"
          onChange={handleFileChange}
        />
        <button type="submit" disabled={!file || isProcessing}>
          {buttonText}
        </button>
      </form>

      {status === 'success' && (
        <p style={{ color: 'green' }}>
          Job created successfully! Job ID: {jobId}
        </p>
      )}
      {status === 'error' && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
