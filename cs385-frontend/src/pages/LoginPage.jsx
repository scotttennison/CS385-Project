import React, { useState } from 'react';


function LoginPage() {
  // STATE MANAGEMENT: Store email, password, loading, error
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // HANDLE LOGIN BUTTON CLICK
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page refresh
    setLoading(true);
    setError('');

    try {
      console.log(`Attempting login with email: ${email}`);

      // For MVP: Just validate the form and store email + token
      // (We'll integrate real Cognito later)
      
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }

      // TODO: Call Cognito authenticate
      // For now, create a fake token for testing
      const fakeToken = `fake-jwt-token-for-${email}`;
      const userId = `user-${email.split('@')[0]}`;

      // Store token + userId in localStorage (like browser cookies)
      localStorage.setItem('authToken', fakeToken);
      localStorage.setItem('userId', userId);
      localStorage.setItem('userEmail', email);

      console.log('Login successful! Token stored.');

      // Redirect to upload page
      window.location.href = '/upload';

    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card p-5" style={{ width: '400px' }}>
        <h2 className="mb-4 text-center">CS385 Records Management</h2>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-muted text-center mt-3">
          For MVP testing: use any email + password
        </p>
      </div>
    </div>
  );
}

export default LoginPage;