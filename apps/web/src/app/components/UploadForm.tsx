// apps/web/src/components/UploadForm.tsx
'use client'; // This is a client component

import { useState, FormEvent } from 'react';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'initial' | 'uploading' | 'success' | 'error'>('initial');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('uploading');
    setError(null);

    try {
      // 1. Get the pre-signed URL from our API
      const response = await fetch('http://localhost:3000/jobs/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!response.ok) throw new Error('Failed to get pre-signed URL.');

      const { url } = await response.json();

      // 2. Upload the file directly to GCS using the URL
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('File upload to GCS failed.');

      setStatus('success');
      // Optional: Here you would call your /jobs endpoint to create the DB record
      // and trigger the Pub/Sub message.

    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" onChange={handleFileChange} />
        <button type="submit" disabled={!file || status === 'uploading'}>
          {status === 'uploading' ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {status === 'success' && <p style={{ color: 'green' }}>Upload successful!</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}