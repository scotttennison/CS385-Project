import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import CryptoJS from 'crypto-js';

function ConfirmationPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';
  const CLIENT_ID = '63mgullqo4qp0igefff8ecqnh1';
  const CLIENT_SECRET = 'u2btemms0adgepfn7pjifss2gb7j2dlo6nkb1h6c2me84hkbvjm';
  const REGION = 'us-west-2';

  const cognito = new CognitoIdentityServiceProvider({ region: REGION });

  const calculateSecretHash = (username) => {
    const hmac = CryptoJS.HmacSHA256(username + CLIENT_ID, CLIENT_SECRET);
    return CryptoJS.enc.Base64.stringify(hmac);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const secretHash = calculateSecretHash(email);

      const params = {
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        SecretHash: secretHash,
      };

      await cognito.confirmSignUp(params).promise();
      setSuccess('Email confirmed! You can now login.');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-gradient-to-br from-blue-500 to-purple-600 d-flex align-items-center justify-content-center p-4">
      <div className="card p-5" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4">Confirm Email</h2>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        <p className="text-muted mb-4">
          We sent a confirmation code to <strong>{email}</strong>. Enter it below.
        </p>

        <form onSubmit={handleConfirm}>
          <div className="mb-3">
            <label className="form-label">Confirmation Code</label>
            <input
              type="text"
              className="form-control"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? 'Confirming...' : 'Confirm Email'}
          </button>
        </form>

        <hr />
        <small className="text-muted">
          Check your email (including spam folder) for the code.
        </small>
      </div>
    </div>
  );
}

export default ConfirmationPage;