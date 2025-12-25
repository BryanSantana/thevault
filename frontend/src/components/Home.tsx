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
  isOwner: boolean;
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
      <div className="home-actions">
        <Link to="/create" className="button create-button cta">create new drop</Link>
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
                {drop.isOwner && (
                  <span className="owner-badge">mine</span>
                )}
              </div>
              <div className="folder-body">
                <Folder size={48} className="folder-icon" />
                <div>
                  <h3>{drop.title}</h3>
                  <div className="meta">{new Date(drop.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {drops.length === 0 && (
        <div className="empty-state">
          <p>no drops yet. create your first memory.</p>
        </div>
      )}
    </div>
  );
};

export default Home;
