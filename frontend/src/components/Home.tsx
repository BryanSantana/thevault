import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DropCard from './DropCard';
import axios from 'axios';
import { API_BASE } from '../api';

interface Drop {
  id: string;
  dropId: string;
  title: string;
  createdAt: string;
  isPublic: boolean;
  isOwner: boolean;
}

interface HomeProps {
  isAuthenticated: boolean;
}

const Home: React.FC<HomeProps> = ({ isAuthenticated }) => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/drops`)
      .then(response => setDrops(response.data))
      .catch(error => console.error('Error fetching drops:', error));
  }, []);

  const handleCopyLink = (dropId: string) => {
    const origin = window.location.origin;
    const url = `${origin}/drop/${dropId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(dropId);
      setTimeout(() => setCopiedId(null), 1200);
    }).catch(() => {
      alert('unable to copy link');
    });
  };

  return (
    <div className="home">
      {isAuthenticated && (
        <div className="home-actions">
          <Link to="/create" className="button create-button cta">create new drop</Link>
        </div>
      )}
      <div className="drops-grid">
        {drops.map(drop => (
          <DropCard
            key={drop.id}
            drop={drop}
            onCopyLink={handleCopyLink}
            copied={copiedId === drop.dropId}
          />
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
