import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';

interface LoginProps {
  onLogin: (user: any, token: string) => void;
  onSwitchToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignup }) => {
  const [phoneOrUsername, setPhoneOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/users/login`, {
        phoneNumber: phoneOrUsername,
        password
      });

      onLogin(response.data.user, response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>login to [the vault.]</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="tel"
              placeholder="phone number or username"
              value={phoneOrUsername}
              onChange={(e) => setPhoneOrUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'logging in...' : 'login'}
          </button>
        </form>
        <p className="auth-switch">
          don't have an account?{' '}
          <button onClick={onSwitchToSignup} className="link-button">
            sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
