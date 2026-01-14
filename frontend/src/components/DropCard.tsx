import React from 'react';
import { Link } from 'react-router-dom';

interface Drop {
  id: string;
  dropId: string;
  title: string;
  createdAt: string;
  isPublic: boolean;
  isOwner: boolean;
}

interface DropCardProps {
  drop: Drop;
  onCopyLink: (dropId: string) => void;
  copied: boolean;
  onDelete: (dropId: string) => void;
  deleting: boolean;
}

const DropCard: React.FC<DropCardProps> = ({ drop, onCopyLink, copied, onDelete, deleting }) => {
  return (
    <Link to={`/drop/${drop.dropId}`} className="folder-link">
      <div className="drop-card">
        <div className="drop-bracket">
          <span className="brace">[</span>
          <div className="brace-content">
            <div className="brace-title">{drop.title}</div>
          </div>
          <span className="brace">]</span>
        </div>
        <div className="brace-date">{new Date(drop.createdAt).toLocaleDateString()}</div>
        {drop.isOwner && (
          <div className="drop-card-actions">
            <button
              className="button copy-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopyLink(drop.dropId);
              }}
            >
              {copied ? 'copied' : 'copy link'}
            </button>
            <button
              className="button delete-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(drop.dropId);
              }}
              disabled={deleting}
            >
              {deleting ? 'deleting' : 'delete'}
            </button>
          </div>
        )}
      </div>
    </Link>
  );
};

export default DropCard;
