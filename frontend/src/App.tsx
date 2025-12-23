import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CreateDrop from './components/CreateDrop';
import DropDetail from './components/DropDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>The Vault</h1>
          <p>Sony Handycam Memories</p>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateDrop />} />
            <Route path="/drop/:dropId" element={<DropDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;