// apps/web/src/components/JobsDashboard.tsx
// This is the complete, correct code for this file.
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

  useEffect(() => {
    // Do not fetch if the user is not logged in.
    if (!token) {
      setIsLoading(false);
      return;
    }

    const fetchJobs = async () => {
      setError(null); // Clear previous errors
      try {
        const response = await fetch('http://localhost:3000/jobs', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          // Handle cases where token might be expired
          setError('Authentication failed. Please log out and log back in.');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch jobs.');
        }
        const data = await response.json();
        setJobs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (isLoading) {
          setIsLoading(false);
        }
      }
    };

    fetchJobs(); // Fetch immediately
    const intervalId = setInterval(fetchJobs, 3000); // And then poll every 3 seconds

    // Cleanup function to stop polling when the component unmounts or token changes
    return () => clearInterval(intervalId);

    // <-- FIX: The effect now depends on the token. It will re-run on login/logout.
  }, [token, isLoading]);

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