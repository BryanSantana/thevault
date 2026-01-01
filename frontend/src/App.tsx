import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import Home from './components/Home';
import CreateDrop from './components/CreateDrop';
import DropDetail from './components/DropDetail';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import './App.css';

interface User {
  id: number;
  phoneNumber: string;
  name?: string;
  username?: string;
  profilePictureUrl?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    setLoading(false);
  }, []);

  const handleLogin = (userData: User, authToken: string) => {
    setUser(userData);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const handleSignup = (userData: User, authToken: string) => {
    setUser(userData);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (loading) {
    return <div className="app">loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <header className="header-bar full-width">
          <h1 className="vault-title">[the vault.]</h1>
            <div className="user-info">
            {user?.profilePictureUrl && (
              <img src={user.profilePictureUrl} alt="Profile" className="profile-pic" />
            )}
            {user ? (
              <>
                <span>welcome, {user.username || user.name || user.phoneNumber}</span>
                <Link to={`/profile/${user.id}`} className="button logout-button">profile</Link>
                <button onClick={handleLogout} className="button logout-button">logout</button>
              </>
            ) : (
              <div className="auth-actions">
                <button onClick={() => { setAuthMode('login'); setShowAuth(true); }} className="button logout-button">login</button>
                <button onClick={() => { setAuthMode('signup'); setShowAuth(true); }} className="button logout-button">sign up</button>
              </div>
            )}
          </div>
        </header>
        <main className="main-full">
          {!user && showAuth && (
            <div className="auth-flyout">
              <button className="button close-auth" onClick={() => setShowAuth(false)}>close</button>
              {authMode === 'login' ? (
                <Login
                  onLogin={(u, t) => { handleLogin(u, t); setShowAuth(false); }}
                  onSwitchToSignup={() => setAuthMode('signup')}
                />
              ) : (
                <Signup
                  onSignup={(u, t) => { handleSignup(u, t); setShowAuth(false); }}
                  onSwitchToLogin={() => setAuthMode('login')}
                />
              )}
            </div>
          )}
            <Routes>
              <Route path="/" element={<Home isAuthenticated={!!user} />} />
              <Route path="/create" element={<CreateDrop />} />
              <Route path="/drop/:dropId" element={<DropDetail />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/profiles/:id" element={<Profile />} />
              <Route path="*" element={<Home isAuthenticated={!!user} />} />
            </Routes>
          </main>
      </div>
    </Router>
  );
}

export default App;
