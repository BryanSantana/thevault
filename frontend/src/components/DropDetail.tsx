import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
import axios from 'axios';

interface Media {
  id: string;
  type: string;
  position: number;
  url: string;
}

const DropDetail: React.FC = () => {
  const { dropId } = useParams<{ dropId: string }>();
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockCount, setUnlockCount] = useState<number | null>(null);
  const [ownerPasscode, setOwnerPasscode] = useState<string | null>(null);
  const [dropInfo, setDropInfo] = useState<{ title: string; isLive: boolean; isPublic?: boolean; isOwner?: boolean } | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  useEffect(() => {
    // Fetch drop info
    axios.get(`http://localhost:4000/drops/${dropId}`)
      .then(response => setDropInfo(response.data))
      .catch(error => console.error('Error fetching drop info:', error));
  }, [dropId]);

  useEffect(() => {
    if (dropInfo?.isOwner && !unlocked) {
      handleUnlock();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropInfo]);

  useEffect(() => {
    // Keyboard navigation
    const handleKeyPress = (e: KeyboardEvent) => {
      if (selectedMediaIndex === null) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateMedia(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateMedia(1);
          break;
        case 'Escape':
          e.preventDefault();
          closeViewer();
          break;
      }
    };

    if (selectedMediaIndex !== null) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [selectedMediaIndex, media.length]);

  const handleUnlock = async () => {
    try {
      const response = await axios.post(`http://localhost:4000/drops/${dropId}/unlock`, { passcode });
      setMedia(response.data.media);
      setUnlocked(true);
      if (typeof response.data.unlockCount === 'number' && dropInfo?.isOwner) {
        setUnlockCount(response.data.unlockCount);
      }
      if (response.data.passcode) {
        setOwnerPasscode(response.data.passcode);
      }
    } catch (error) {
      alert('invalid passcode');
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
      alert('media uploaded');
      setFile(null);
      // Refresh media
      if (unlocked) {
        const response = await axios.post(`http://localhost:4000/drops/${dropId}/unlock`, { passcode });
        setMedia(response.data.media);
      }
    } catch (error) {
      alert('upload failed');
    }
  };

  const openViewer = (index: number) => {
    setSelectedMediaIndex(index);
  };

  const closeViewer = () => {
    setSelectedMediaIndex(null);
  };

  const handleDownload = async () => {
    if (selectedMediaIndex === null) return;
    const current = media[selectedMediaIndex];
    if (!current) return;

    const passcodeParam = dropInfo?.isOwner || dropInfo?.isPublic ? '' : passcode ? `?passcode=${encodeURIComponent(passcode)}` : '';
    const downloadUrl = `http://localhost:4000/drops/${dropId}/media/${current.id}/download${passcodeParam}`;
    window.location.href = downloadUrl;
  };

  const navigateMedia = (direction: number) => {
    if (selectedMediaIndex === null) return;
    const newIndex = selectedMediaIndex + direction;
    if (newIndex >= 0 && newIndex < media.length) {
      setSelectedMediaIndex(newIndex);
    }
  };

  return (
    <div className="drop-detail">
      <div className="drop-header">
        <button className="button back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          back
        </button>
        <h2>{dropInfo?.title || 'loading...'}</h2>
        {unlocked && dropInfo?.isOwner && (
          <div className="drop-meta">
            {typeof unlockCount === 'number' && <span className="badge">unlocks: {unlockCount}</span>}
            {ownerPasscode && <span className="badge">passcode: {ownerPasscode}</span>}
          </div>
        )}
      </div>
      {!unlocked ? (
        <div className="unlock-section">
          <input
            type="password"
            placeholder="enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <button onClick={handleUnlock} className="button">unlock</button>
        </div>
      ) : (
        <div className="media-section">
          <div className="media-grid">
            {media.map((m, index) => (
              <div key={m.id} className="media-item" onClick={() => openViewer(index)}>
                {m.type === 'photo' ? (
                  <img src={m.url} alt={`Media ${m.position}`} />
                ) : (
                  <video src={m.url} />
                )}
              </div>
            ))}
          </div>

          <div className="upload">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} className="button">upload</button>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedMediaIndex !== null && (
        <div className="media-viewer" onClick={closeViewer}>
          <div className="viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-viewer" onClick={closeViewer}>
              <X size={24} />
            </button>

            {selectedMediaIndex > 0 && (
              <button className="nav-arrow nav-left" onClick={() => navigateMedia(-1)}>
                <ChevronLeft size={32} />
              </button>
            )}

            {selectedMediaIndex < media.length - 1 && (
              <button className="nav-arrow nav-right" onClick={() => navigateMedia(1)}>
                <ChevronRight size={32} />
              </button>
            )}

            <div className="media-display">
              {media[selectedMediaIndex].type === 'photo' ? (
                <img
                  src={media[selectedMediaIndex].url}
                  alt={`Media ${media[selectedMediaIndex].position}`}
                  className="viewer-image"
                />
              ) : (
                <video
                  src={media[selectedMediaIndex].url}
                  controls
                  autoPlay
                  className="viewer-video"
                />
              )}
            </div>
            <div className="viewer-actions">
              <button className="button" onClick={handleDownload}>download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropDetail;
