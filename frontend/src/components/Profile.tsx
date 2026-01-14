import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../api';
import DropCard from './DropCard';

interface Drop {
  id: string;
  dropId: string;
  title: string;
  createdAt: string;
  isPublic: boolean;
  isOwner?: boolean;
}

interface UserProfile {
  id: number;
  name?: string;
  username?: string;
  profilePictureUrl?: string;
  isOwner?: boolean;
}

const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`${API_BASE}/users/profile/${id}`)
      .then((res) => {
        setUser(res.data.user);
        setDrops(res.data.drops);
      })
      .catch((err) => {
        console.error('error loading profile', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="home">loading profile...</div>;
  }

  if (!user) {
    return <div className="home">profile not found.</div>;
  }

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('profilePicture', selectedFile);
      const res = await axios.post(`${API_BASE}/users/profile-picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newUrl = res.data.profilePictureUrl;
      setUser({ ...user, profilePictureUrl: newUrl });
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.profilePictureUrl = newUrl;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'failed to upload');
    } finally {
      setUploading(false);
    }
  };

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

  const handleDelete = async (dropId: string) => {
    const confirmed = window.confirm('delete this drop and all of its media?');
    if (!confirmed) return;
    setDeletingId(dropId);
    try {
      await axios.delete(`${API_BASE}/drops/${dropId}`);
      setDrops((prev) => prev.filter((d) => d.dropId !== dropId));
    } catch (err) {
      console.error('error deleting drop', err);
      alert('unable to delete drop');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="home profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.profilePictureUrl ? (
            <img src={user.profilePictureUrl} alt={user.username || 'profile'} />
          ) : (
            <div className="avatar-fallback">{user.username?.[0] || '?'}</div>
          )}
        </div>
        <div className="profile-meta">
          <h2>{user.username ? `@${user.username}` : 'user'}</h2>
          {user.name && <p>{user.name}</p>}
          {user.isOwner && <span className="badge">this is you</span>}
        </div>
      </div>

      {user.isOwner && (
        <div className="profile-upload">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button className="button logout-button" onClick={handleUpload} disabled={uploading || !selectedFile}>
            {uploading ? 'uploading...' : 'update picture'}
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
      )}

      <div className="home-actions">
        {user.isOwner && (
          <Link to="/create" className="button create-button cta">create new drop</Link>
        )}
      </div>

      <div className="drops-grid">
        {drops.map((drop) => (
          <DropCard
            key={drop.id}
            drop={{ ...drop, isOwner: !!drop.isOwner }}
            onCopyLink={handleCopyLink}
            copied={copiedId === drop.dropId}
            onDelete={handleDelete}
            deleting={deletingId === drop.dropId}
          />
        ))}
      </div>
      {drops.length === 0 && (
        <div className="empty-state">
          <p>no drops yet.</p>
        </div>
      )}
    </div>
  );
};

export default Profile;
