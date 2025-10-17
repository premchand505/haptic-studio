// apps/web/src/components/JobsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const fetchJobs = async () => {
      // We don't need the initial loading state for background refreshes
      // setIsLoading(true); 
      try {
        const response = await fetch('http://localhost:3000/jobs');
        if (!response.ok) {
          throw new Error('Failed to fetch jobs.');
        }
        const data = await response.json();
        setJobs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        // Only set loading to false on the very first fetch
        if (isLoading) {
          setIsLoading(false);
        }
      }
    };

    // --- 🚀 NEW CODE STARTS HERE 🚀 ---

    // 1. Fetch data immediately when the component loads
    fetchJobs();

    // 2. Then, set up an interval to fetch data every 3 seconds (3000ms)
    const intervalId = setInterval(fetchJobs, 3000);

    // 3. This is a cleanup function. React runs this when the component
    //    is removed from the page to prevent memory leaks.
    return () => clearInterval(intervalId);
    
    // --- 🚀 NEW CODE ENDS HERE 🚀 ---

  }, [isLoading]); // Re-added isLoading to the dependency array for the initial load logic

  if (isLoading) {
    return <p>Loading jobs...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <section>
      <h2>My Jobs</h2>
      {jobs.length === 0 ? (
        <p>You haven't created any jobs yet.</p>
      ) : (
        <ul>
          {jobs.map((job) => (
            <li key={job.id}>
              <strong>File:</strong> {job.videoFilename} | <strong>Status:</strong> {job.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}