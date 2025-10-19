// apps/web/src/app/page.tsx
'use client'; // This must be a client component to use hooks

import AuthForm from "@/components/AuthForm";
import UploadForm from "@/components/UploadForm";
import JobsDashboard from "@/components/JobsDashboard";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { token, logout } = useAuth(); // <-- Get token and logout function

  // If a token exists, the user is logged in.
  if (token) {
    return (
      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Haptic Studio</h1>
          <button onClick={logout}>Logout</button>
        </div>
        <p>Welcome back! Upload a new video or view your past jobs.</p>
        <UploadForm />
        <hr style={{ margin: '20px 0' }} />
        <JobsDashboard />
      </main>
    );
  }

  // If there's no token, show the login/signup form.
  return (
    <main>
      <h1>Haptic Studio</h1>
      <AuthForm />
    </main>
  );
}