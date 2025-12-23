import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface Media {
  id: string;
  type: string;
  position: number;
  url: string;
}

const DropDetail: React.FC = () => {
  const { dropId } = useParams<{ dropId: string }>();
  const [passcode, setPasscode] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [dropInfo, setDropInfo] = useState<{ title: string; isLive: boolean } | null>(null);

  useEffect(() => {
    // Fetch drop info
    axios.get(`http://localhost:4000/drops/${dropId}`)
      .then(response => setDropInfo(response.data))
      .catch(error => console.error('Error fetching drop info:', error));
  }, [dropId]);

  const handleUnlock = async () => {
    try {
      const response = await axios.post(`http://localhost:4000/drops/${dropId}/unlock`, { passcode });
      setMedia(response.data.media);
      setUnlocked(true);
    } catch (error) {
      alert('Invalid passcode');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`http://localhost:4000/drops/${dropId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Media uploaded');
      setFile(null);
    } catch (error) {
      alert('Upload failed');
    }
  };

  return (
    <div className="drop-detail">
      <div className="drop-header">
        <h2>{dropInfo?.title || 'Loading...'}</h2>
        <div className="drop-code-display">
          <span className="code-label">Share Code:</span>
          <span className="code-value">{dropId}</span>
        </div>
      </div>
      {!unlocked ? (
        <div>
          <input
            type="password"
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <button onClick={handleUnlock} className="button">Unlock</button>
        </div>
      ) : (
        <div>
          <h3>Media</h3>
          <div className="media-grid">
            {media.map(m => (
              <div key={m.id}>
                {m.type === 'photo' ? (
                  <img src={m.url} alt={`Media ${m.position}`} style={{ width: '200px' }} />
                ) : (
                  <video src={m.url} controls style={{ width: '200px' }} />
                )}
              </div>
            ))}
          </div>
          <div className="upload">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} className="button">Upload</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropDetail;