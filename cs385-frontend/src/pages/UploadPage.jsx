import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function UploadPage() {
  // STATE: File upload
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('Invoice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // STATE: File list
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const API_BASE_URL = 'https://mnyt0kl257.execute-api.us-west-2.amazonaws.com/dev';

  // LOAD FILES ON PAGE LOAD
  useEffect(() => {
    loadFiles();
  }, []);

  // FETCH USER'S FILES FROM API
  const loadFiles = async () => {
    try {
      setFilesLoading(true);
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');

      const response = await fetch(`${API_BASE_URL}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId
        }
      });

      const data = await response.json();
      console.log('Files loaded:', data);

      if (response.ok) {
        setFiles(data.files || []);
      } else {
        console.error('Error loading files:', data);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  // HANDLE FILE SELECTION
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      console.log(`File selected: ${selectedFile.name}`);
    }
  };

  // HANDLE UPLOAD
  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!file) {
        setError('Please select a file to upload');
        setLoading(false);
        return;
      }

      console.log(`Uploading file: ${fileName}, Type: ${docType}`);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Content = event.target.result.split(',')[1];
          const token = localStorage.getItem('authToken');
          const userId = localStorage.getItem('userId');

          console.log(`Token: ${token}, UserId: ${userId}`);

          const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-User-ID': userId
            },
            body: JSON.stringify({
              fileName: fileName,
              docType: docType,
              fileContent: base64Content
            })
          });

          const data = await response.json();

          if (response.ok) {
            console.log('Upload successful!', data);
            setSuccess(`File "${fileName}" uploaded successfully!`);
            setFile(null);
            setFileName('');
            setDocType('Invoice');
            
            // Reload file list
            setTimeout(() => {
              loadFiles();
            }, 1000);
          } else {
            console.error('Upload failed:', data);
            setError(data.error || 'Upload failed');
          }
        } catch (err) {
          console.error('Error processing file:', err);
          setError('Error processing file');
        } finally {
          setLoading(false);
        }
      };

      reader.readAsDataURL(file);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
      setLoading(false);
    }
  };

  // HANDLE LOGOUT
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    window.location.href = '/login';
  };

  // FORMAT DATE FOR DISPLAY
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // CALCULATE DAYS UNTIL EXPIRATION
  const daysUntilExpiration = (expirationTimestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.ceil((expirationTimestamp - now) / 86400);
    return daysRemaining > 0 ? daysRemaining : 'Expired';
  };

  return (
    <div className="min-vh-100 bg-light p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-5">
        <h1>CS385 Records Management</h1>
        <button className="btn btn-outline-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="row">
          {/* Upload Form */}
          <div className="col-md-6">
            <div className="card p-4 mb-4">
              <h3 className="mb-4">Upload Document</h3>

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

              <form onSubmit={handleUpload}>
                <div className="mb-3">
                  <label className="form-label">Document Type</label>
                  <select
                    className="form-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    disabled={loading}
                  >
                    <option value="Invoice">Invoice (7 years)</option>
                    <option value="Contract">Contract (5 years)</option>
                    <option value="Employee">Employee Record (3 years)</option>
                    <option value="Compliance">Compliance Report (10 years)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Select PDF File</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </div>

                {fileName && (
                  <div className="alert alert-info" role="alert">
                    Selected: <strong>{fileName}</strong>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading || !file}
                >
                  {loading ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>
            </div>
          </div>

          {/* File List */}
          <div className="col-md-6">
            <div className="card p-4">
              <h3 className="mb-4">Your Documents</h3>

              {filesLoading ? (
                <p className="text-muted">Loading files...</p>
              ) : files.length === 0 ? (
                <p className="text-muted">No documents uploaded yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.fileId}>
                          <td>{file.fileName}</td>
                          <td>
                            <span className="badge bg-info">
                              {file.docType}
                            </span>
                          </td>
                          <td>
                            <small>
                              {formatDate(file.expirationDate)}
                              <br />
                              ({daysUntilExpiration(file.expirationDate)} days)
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;