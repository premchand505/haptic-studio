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
        // --- CORRECTED LINE ---
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch jobs.');
        
        const data: Job[] = await response.json();
        setJobs(data);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('An unexpected error occurred.');
      } finally {
        if (isLoading) setIsLoading(false);
      }
    };
    fetchJobs();
    const intervalId = setInterval(fetchJobs, 3000);
    return () => clearInterval(intervalId);
  }, [token, isLoading]);

  const handleDownload = async (jobId: string, fileType: 'json' | 'ahap') => {
    const downloadStateId = `${jobId}-${fileType}`;
    setDownloading(downloadStateId);
    setError(null);

    try {
      // --- CORRECTED LINE ---
      const urlResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/jobs/${jobId}/download-urls`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!urlResponse.ok) throw new Error('Could not get download links.');
      const urls: { json: string; ahap: string } = await urlResponse.json();
      
      const urlToFetch = fileType === 'json' ? urls.json : urls.ahap;
      const filename = `haptic-${jobId}.${fileType}`;

      const fileResponse = await fetch(urlToFetch);
      if (!fileResponse.ok)
        throw new Error(`Failed to download ${filename}.`);

      const blob = await fileResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('An unexpected error occurred.');
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) return <p>Loading jobs...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <section>
      <h2>My Jobs</h2>
      {jobs.length === 0 ? (
        <p>You haven&apos;t created any jobs yet.</p>
      ) : (
        <ul>
          {jobs.map((job) => (
            <li
              key={job.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>File:</strong> {job.videoFilename} |{' '}
                <strong>Status:</strong> {job.status}
              </span>
              <div>
                {job.status === 'COMPLETED' && (
                  <>
                    <button
                      onClick={() => handleDownload(job.id, 'json')}
                      disabled={downloading === `${job.id}-json`}
                    >
                      {downloading === `${job.id}-json` ? '...' : 'JSON'}
                    </button>
                    <button
                      onClick={() => handleDownload(job.id, 'ahap')}
                      disabled={downloading === `${job.id}-ahap`}
                    >
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