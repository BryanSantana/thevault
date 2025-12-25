import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Lock, Unlock } from 'lucide-react';
import axios from 'axios';

const CreateDrop: React.FC = () => {
  const [title, setTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generatedDropId, setGeneratedDropId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length !== droppedFiles.length) {
      alert('only image and video files are allowed');
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (dropId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      `http://localhost:4000/drops/${dropId}/media`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return response.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title) {
      alert('please enter a title for your drop');
      return;
    }

    if (!isPublic && !passcode) {
      alert('private drops require a passcode');
      return;
    }

    setIsUploading(true);

    try {
      // Create the drop
      const dropResponse = await axios.post('http://localhost:4000/drops', {
        title,
        passcode: isPublic ? '' : passcode,
        isPublic
      });

      const createdDropId = dropResponse.data.dropId;
      setGeneratedDropId(createdDropId);

      // Upload all media files
      if (files.length > 0) {
        const uploadPromises = files.map(file => uploadMedia(createdDropId, file));
        await Promise.all(uploadPromises);
      }

      navigate('/');
    } catch (error) {
      console.error('Error creating drop:', error);
      alert('failed to create drop');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="create-drop">
      <h2>create new drop</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="drop title (e.g., summer vacation photos)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <div className="visibility-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">
                {isPublic ? (
                  <>
                    <Unlock size={16} />
                    public drop
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    private drop
                  </>
                )}
              </span>
            </label>
          </div>
        </div>

        {!isPublic && (
          <div className="form-group">
            <input
              type="password"
              placeholder="passcode (required for private drops)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required={!isPublic}
            />
          </div>
        )}

        <div className="form-group">
          <div
            className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} className="upload-icon" />
            <p>drag & drop images/videos here, or click to browse</p>
            <p className="file-types">supported: jpg, png, mp4, mov</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h3>files to upload ({files.length})</h3>
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
                <button
                  type="button"
                  className="remove-file"
                  onClick={() => removeFile(index)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          className="button create-button"
          disabled={isUploading}
        >
          {isUploading ? 'creating drop...' : 'create drop'}
        </button>
      </form>
    </div>
  );
};

export default CreateDrop;
