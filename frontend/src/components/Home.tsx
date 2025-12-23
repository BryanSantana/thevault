import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Lock, Unlock } from 'lucide-react';
import axios from 'axios';

interface Drop {
  id: string;
  dropId: string;
  title: string;
  createdAt: string;
  isPublic: boolean;
}

const Home: React.FC = () => {
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    axios.get('http://localhost:4000/drops')
      .then(response => setDrops(response.data))
      .catch(error => console.error('Error fetching drops:', error));
  }, []);

  return (
    <div className="home">
      <div className="header-bar">
        <h1 className="vault-title">The Vault</h1>
        <Link to="/create" className="button create-button">Create New Drop</Link>
      </div>
      <div className="drops-grid">
        {drops.map(drop => (
          <Link key={drop.id} to={`/drop/${drop.dropId}`} className="folder-link">
            <div className="folder-card">
              <div className="folder-header">
                {drop.isPublic ? (
                  <Unlock size={16} className="visibility-icon public" />
                ) : (
                  <Lock size={16} className="visibility-icon private" />
                )}
              </div>
              <Folder size={48} className="folder-icon" />
              <h3>{drop.title}</h3>
              <div className="drop-code">
                <span className="code-label">Code:</span>
                <span className="code-value">{drop.dropId}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;