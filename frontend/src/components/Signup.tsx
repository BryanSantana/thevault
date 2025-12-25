import React, { useState } from 'react';
import axios from 'axios';

interface SignupProps {
  onSignup: (user: any, token: string) => void;
  onSwitchToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup, onSwitchToLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:4000/users/signup', {
        phoneNumber,
        password,
        name: name.trim() || null
      });

      onSignup(response.data.user, response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>join the vault</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="tel"
              placeholder="phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
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
              minLength={6}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="display name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'creating account...' : 'sign up'}
          </button>
        </form>
        <p className="auth-switch">
          already have an account?{' '}
          <button onClick={onSwitchToLogin} className="link-button">
            login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
