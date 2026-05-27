import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import './AdminLogin.css';

const AdminLogin = ({ mode = 'admin' }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already authenticated
    if (mode === 'employee' && authService.isEmployeeAuthenticated()) {
      navigate(authService.getDefaultEmployeePath());
    } else if (mode === 'admin' && authService.isAuthenticated()) {
      navigate(authService.getDefaultAdminPath());
    }
  }, [mode, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = mode === 'employee'
        ? await authService.loginEmployee(formData.username, formData.password)
        : await authService.login(formData.username, formData.password);

      if (response.success) {
        toast.success('Login successful! Redirecting...');
        setTimeout(() => {
          navigate(mode === 'employee'
            ? authService.getDefaultEmployeePath()
            : authService.getDefaultAdminPath());
        }, 500);
      } else {
        const errorMessage = response.message || 'Login failed';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An error occurred during login. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>{mode === 'employee' ? 'Employee Portal' : 'Synchrony Admin'}</h1>
          <p>{mode === 'employee' ? 'Sign in with your SSO and temporary password' : 'Sign in to access the admin panel'}</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={formData.username}
              onChange={handleChange}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="admin-login-footer">
          {mode === 'employee' ? (
            <>
              <p>Default credentials: your SSO / Temp@1234</p>
              <small className="text-muted">
                Change the password after first login
              </small>
              <div style={{ marginTop: '12px' }}>
                <Link to="/" style={{ color: '#323232', textDecoration: 'none', fontSize: '13px' }}>Admin login</Link>
              </div>
            </>
          ) : (
            <>
              <p>Default credentials: admin / admin123</p>
              <small className="text-muted">
                Please change the default password after first login
              </small>
              <div style={{ marginTop: '12px' }}>
                <Link to="/employee/login" style={{ color: '#323232', textDecoration: 'none', fontSize: '13px' }}>Employee login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
