import React from 'react'
import BienImage from './BienImage'

export default function BienPhotosGalleryModal({
  isOpen,
  photoPaths,
  activePhotoIdx,
  setActivePhotoIdx,
  onUploadPhotos,
  onClose
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card"
        style={{ maxWidth: 850, width: '94%', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>📷 Galerie photos ({photoPaths.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {photoPaths.length > 0 ? (
          <div>
            <div
              style={{
                width: '100%',
                height: 420,
                borderRadius: 10,
                overflow: 'hidden',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14
              }}
            >
              <BienImage
                src={photoPaths[activePhotoIdx] || photoPaths[0]}
                alt="Full view"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {photoPaths.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 70,
                    height: 50,
                    flexShrink: 0,
                    borderRadius: 6,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: activePhotoIdx === idx ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                    opacity: activePhotoIdx === idx ? 1 : 0.6
                  }}
                  onClick={() => setActivePhotoIdx(idx)}
                >
                  <BienImage src={p} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucune photo pour le moment.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => onUploadPhotos('00_ACHAT-VENTE/Annonce - Photos')}>
            + Ajouter des photos
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
