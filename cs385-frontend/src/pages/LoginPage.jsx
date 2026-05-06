import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import CryptoJS from 'crypto-js';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const CLIENT_ID = '63mgullqo4qp0igefff8ecqnh1';
  const CLIENT_SECRET = 'u2btemms0adgepfn7pjifss2gb7j2dlo6nkb1h6c2me84hkbvjm';
  const REGION = 'us-west-2';

  const cognito = new CognitoIdentityServiceProvider({ region: REGION });

  const calculateSecretHash = (username) => {
    const hmac = CryptoJS.HmacSHA256(username + CLIENT_ID, CLIENT_SECRET);
    return CryptoJS.enc.Base64.stringify(hmac);
  };

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const secretHash = calculateSecretHash(email);

      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash,
        },
      };

      const response = await cognito.initiateAuth(params).promise();

      localStorage.setItem('authToken', response.AuthenticationResult.IdToken);
      localStorage.setItem('userId', email);
      localStorage.setItem('userEmail', email);

      window.location.href = '/upload';
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Check email/password.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isPasswordValid) {
        setError('Password does not meet requirements');
        setLoading(false);
        return;
      }

      const secretHash = calculateSecretHash(email);

      const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        SecretHash: secretHash,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
        ],
      };

      await cognito.signUp(params).promise();
      
      navigate('/confirm', { state: { email } });
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err.message || 'Sign up failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-gradient-to-br from-blue-500 to-purple-600 d-flex align-items-center justify-content-center p-4">
      <div className="card p-5" style={{ maxWidth: '450px', width: '100%' }}>
        <h2 className="text-center mb-4">CS385 Records Manager</h2>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {isSignUp && (
            <div className="alert alert-info mb-3">
              <small>
                <strong>Password Requirements:</strong>
                <ul className="mb-0 mt-2">
                  <li className={passwordRequirements.length ? 'text-success' : 'text-danger'}>
                    ✓ At least 8 characters
                  </li>
                  <li className={passwordRequirements.uppercase ? 'text-success' : 'text-danger'}>
                    ✓ One uppercase letter (A-Z)
                  </li>
                  <li className={passwordRequirements.lowercase ? 'text-success' : 'text-danger'}>
                    ✓ One lowercase letter (a-z)
                  </li>
                  <li className={passwordRequirements.number ? 'text-success' : 'text-danger'}>
                    ✓ One number (0-9)
                  </li>
                  <li className={passwordRequirements.special ? 'text-success' : 'text-danger'}>
                    ✓ One special character (!@#$%^&*)
                  </li>
                </ul>
              </small>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100 mb-2"
            disabled={loading || (isSignUp && !isPasswordValid)}
          >
            {loading ? (isSignUp ? 'Signing up...' : 'Logging in...') : isSignUp ? 'Sign Up' : 'Login'}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setEmail('');
              setPassword('');
            }}
            disabled={loading}
          >
            {isSignUp ? 'Back to Login' : 'Create Account'}
          </button>
        </form>

        <hr />
        <small className="text-muted">
          {isSignUp ? '💡 Create a strong password with uppercase, lowercase, numbers, and symbols.' : '💡 First time? Click "Create Account".'}
        </small>
      </div>
    </div>
  );
}

export default LoginPage;