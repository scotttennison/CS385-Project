import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';  // ADD THIS LINE
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in when app loads
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* If logged in, redirect to upload page; otherwise show login */}
        <Route
          path="/login"
          element={!isLoggedIn ? <LoginPage /> : <Navigate to="/upload" />}
        />
        
        <Route
          path="/upload"
          element={isLoggedIn ? <UploadPage /> : <Navigate to="/login" />}
        />

        {/* Default: show login */}
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? '/upload' : '/login'} />}
        />
      </Routes>
    </Router>
  );
}

export default App;