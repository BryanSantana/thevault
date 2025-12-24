import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  useEffect(() => {
    // Fetch drop info
    axios.get(`http://localhost:4000/drops/${dropId}`)
      .then(response => setDropInfo(response.data))
      .catch(error => console.error('Error fetching drop info:', error));
  }, [dropId]);

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
      // Refresh media
      if (unlocked) {
        const response = await axios.post(`http://localhost:4000/drops/${dropId}/unlock`, { passcode });
        setMedia(response.data.media);
      }
    } catch (error) {
      alert('Upload failed');
    }
  };

  const openViewer = (index: number) => {
    setSelectedMediaIndex(index);
  };

  const closeViewer = () => {
    setSelectedMediaIndex(null);
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
        <h2>{dropInfo?.title || 'Loading...'}</h2>
      </div>
      {!unlocked ? (
        <div className="unlock-section">
          <input
            type="password"
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <button onClick={handleUnlock} className="button">Unlock</button>
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
            <button onClick={handleUpload} className="button">Upload</button>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DropDetail;