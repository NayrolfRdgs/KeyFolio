import React from 'react'

export default function BienMapModal({
  isOpen,
  bienNom,
  propertyAddress,
  onOpenBrowser,
  onClose
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card"
        style={{ maxWidth: 720, width: '92%', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>🗺️ Carte & Localisation : {bienNom}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          📍 <strong>Adresse :</strong> {propertyAddress || 'Adresse non renseignée'}
        </p>

        {propertyAddress ? (
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', height: 360, position: 'relative' }}>
            <iframe
              title="Carte du logement"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight="0"
              marginWidth="0"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(propertyAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 8 }}>
            📍 Renseignez l'adresse complète du logement pour afficher la carte interactive.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          {propertyAddress && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenBrowser(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyAddress)}`)}
            >
              📍 Ouvrir dans Google Maps (Navigateur)
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
