import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Home from './components/Home';
import CreateDrop from './components/CreateDrop';
import DropDetail from './components/DropDetail';
import Login from './components/Login';
import Signup from './components/Signup';
import './App.css';

interface User {
  id: number;
  phoneNumber: string;
  name?: string;
  profilePictureUrl?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    setLoading(false);
  }, []);

  const handleLogin = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const handleSignup = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (loading) {
    return <div className="app">loading...</div>;
  }

  if (!user) {
    return (
      <div className="app">
        <header className="header">
          <h1>the vault</h1>
          <p>sony handycam memories</p>
        </header>
        <main>
          {authMode === 'login' ? (
            <Login
              onLogin={handleLogin}
              onSwitchToSignup={() => setAuthMode('signup')}
            />
          ) : (
            <Signup
              onSignup={handleSignup}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <header className="header-bar full-width">
          <h1 className="vault-title">the vault</h1>
          <div className="user-info">
            {user.profilePictureUrl && (
              <img src={user.profilePictureUrl} alt="Profile" className="profile-pic" />
            )}
            <span>welcome, {user.name || user.phoneNumber}</span>
            <button onClick={handleLogout} className="button logout-button">logout</button>
          </div>
        </header>
        <main className="main-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateDrop />} />
            <Route path="/drop/:dropId" element={<DropDetail />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
