// apps/web/src/components/AuthForm.tsx
'use client';

import { useState, FormEvent } from 'react';

export default function AuthForm() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const endpoint = isLoginMode ? '/auth/login' : '/auth/signup';
    const url = `http://localhost:3000${endpoint}`;

    // NOTE: We will handle the response and token storage in the next step.
    console.log(`Submitting to ${url} with`, { email, password });
    setMessage('Submitting...');
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