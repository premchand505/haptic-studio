// apps/web/src/components/AuthForm.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AuthForm() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { login } = useAuth(); //
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const endpoint = isLoginMode ? '/auth/login' : '/auth/signup';
    const url = `http://localhost:3000${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (isLoginMode) {
        // If login is successful, the API returns a token.
        // We use our context's login function to store it globally.
        login(data.access_token);
      } else {
        // If signup is successful, show a message.
        setMessage('Sign up successful! Please log in.');
        setIsLoginMode(true); // Switch to login mode
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h2>{isLoginMode ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button type="submit">{isLoginMode ? 'Login' : 'Sign Up'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p>{message}</p>}
      <button onClick={() => setIsLoginMode(!isLoginMode)}>
        {isLoginMode ? 'Need an account? Sign Up' : 'Have an account? Login'}
      </button>
    </section>
  );
}