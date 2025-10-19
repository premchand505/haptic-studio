// apps/web/src/components/JobsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Job {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  videoFilename: string;
  createdAt: string;
}

export default function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    const fetchJobs = async () => {
      try {
        const response = await fetch('http://localhost:3000/jobs', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch jobs.');
        const data = await response.json();
        setJobs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (isLoading) setIsLoading(false);
      }
    };
    fetchJobs();
    const intervalId = setInterval(fetchJobs, 3000);
    return () => clearInterval(intervalId);
  }, [token, isLoading]);

  // --- 🚀 DEFINITIVE DOWNLOAD FUNCTION 🚀 ---
  const handleDownload = async (jobId: string, fileType: 'json' | 'ahap') => {
    const downloadStateId = `${jobId}-${fileType}`;
    setDownloading(downloadStateId);
    setError(null);

    try {
      // Step 1: Get the temporary download URLs from our API
      const urlResponse = await fetch(`http://localhost:3000/jobs/${jobId}/download-urls`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!urlResponse.ok) throw new Error('Could not get download links.');
      const urls = await urlResponse.json();

      const urlToFetch = fileType === 'json' ? urls.json : urls.ahap;
      const filename = `haptic-${jobId}.${fileType}`;

      // Step 2: Fetch the actual file content from the GCS URL
      const fileResponse = await fetch(urlToFetch);
      if (!fileResponse.ok) throw new Error(`Failed to download ${filename}.`);

      // Step 3: Convert the response into a Blob (a file-like object)
      const blob = await fileResponse.blob();

      // Step 4: Create a temporary, local URL for the Blob
      const objectUrl = URL.createObjectURL(blob);

      // Step 5: Trigger the download using the invisible link trick
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename; // This attribute forces the download
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Step 6: Clean up the temporary URL
      URL.revokeObjectURL(objectUrl);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };
  // --- 🚀 END OF FUNCTION 🚀 ---

  if (isLoading) return <p>Loading jobs...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <section>
      <h2>My Jobs</h2>
      {jobs.length === 0 ? (
        <p>You haven't created any jobs yet.</p>
      ) : (
        <ul>
          {jobs.map((job) => (
            <li key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong>File:</strong> {job.videoFilename} | <strong>Status:</strong> {job.status}
              </span>
              <div>
                {job.status === 'COMPLETED' && (
                  <>
                    <button onClick={() => handleDownload(job.id, 'json')} disabled={downloading === `${job.id}-json`}>
                      {downloading === `${job.id}-json` ? '...' : 'JSON'}
                    </button>
                    <button onClick={() => handleDownload(job.id, 'ahap')} disabled={downloading === `${job.id}-ahap`}>
                      {downloading === `${job.id}-ahap` ? '...' : 'AHAP'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}