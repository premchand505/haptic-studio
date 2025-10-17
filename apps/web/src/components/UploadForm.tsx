// apps/web/src/components/UploadForm.tsx
'use client'; 

import { useState, FormEvent } from 'react';

// Define a more robust status type to track the full process
type UploadStatus = 'initial' | 'uploading' | 'creating_job' | 'success' | 'error';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  // FIX 1: Add 'creating_job' to the allowed status types
  const [status, setStatus] = useState<UploadStatus>('initial');
  const [error, setError] = useState<string | null>(null);
  // FIX 2: Add state to hold the ID of the created job
  const [jobId, setJobId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      // Reset the state when a new file is selected
      setStatus('initial');
      setJobId(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Reset state for a new submission
    setError(null);
    setJobId(null);
    setStatus('uploading');

    try {
      // Step 1: Get the pre-signed URL from our API
      const urlResponse = await fetch('http://localhost:3000/jobs/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!urlResponse.ok) throw new Error('Failed to get pre-signed URL.');
      const { url } = await urlResponse.json();

      // Step 2: Upload the file directly to GCS
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error('File upload to GCS failed.');
      
      // Update status to show progress to the user
      setStatus('creating_job');

      // Step 3: After successful upload, create the job record in our database
      const createJobResponse = await fetch('http://localhost:3000/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoFilename: file.name }),
      });
      if (!createJobResponse.ok) throw new Error('Failed to create job record.');
      const newJob = await createJobResponse.json();
      
      setJobId(newJob.id); // Save the job ID to state
      setStatus('success');
      
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  // FIX 3: Combine uploading and creating_job for a single 'processing' state
  const isProcessing = status === 'uploading' || status === 'creating_job';
  
  let buttonText = 'Upload & Process';
  if (status === 'uploading') buttonText = 'Uploading...';
  if (status === 'creating_job') buttonText = 'Finalizing...';

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" onChange={handleFileChange} />
        <button type="submit" disabled={!file || isProcessing}>
          {buttonText}
        </button>
      </form>

      {/* FIX 4: Provide more specific feedback to the user */}
      {status === 'success' && <p style={{ color: 'green' }}>Job created successfully! Job ID: {jobId}</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}