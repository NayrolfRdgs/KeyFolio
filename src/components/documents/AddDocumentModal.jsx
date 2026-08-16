import React from 'react'

export default function AddDocumentModal({
  isOpen,
  docType,
  setDocType,
  targetSubfolder,
  setTargetSubfolder,
  availableFolders,
  sourcePath,
  onPickFile,
  webTitle,
  setWebTitle,
  webUrl,
  setWebUrl,
  onSubmit,
  onClose,
  uploading
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ajouter un document au bien</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Sélecteur d'Onglets: Fichier local vs Lien Web */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--color-surface-2)', padding: 4, borderRadius: 'var(--radius)' }}>
            <button
              type="button"
              className={`btn ${docType === 'file' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
              onClick={() => setDocType('file')}
            >
              📄 Fichier local
            </button>
            <button
              type="button"
              className={`btn ${docType === 'link' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
              onClick={() => setDocType('link')}
            >
              🌐 Lien Web (URL)
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Dossier de destination *</label>
            <select
              className="form-control"
              value={targetSubfolder}
              onChange={(e) => setTargetSubfolder(e.target.value)}
            >
              {availableFolders.map((f) => (
                <option key={f.value} value={f.value}>📁 {f.label}</option>
              ))}
            </select>
          </div>

          {docType === 'file' ? (
            <div className="form-group">
              <label className="form-label">Fichier source *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-control"
                  readOnly
                  value={sourcePath}
                  placeholder="Sélectionner un fichier sur votre ordinateur..."
                  required
                />
                <button type="button" className="btn btn-secondary" onClick={onPickFile}>
                  Parcourir...
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Titre du lien Web *</label>
                <input
                  className="form-control"
                  required
                  placeholder="Ex: Espace Propriétaire EDF, Notice chaudière..."
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Adresse Web (URL) *</label>
                <input
                  type="url"
                  className="form-control"
                  required
                  placeholder="https://..."
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Enregistrement...' : docType === 'file' ? 'Copier le fichier' : 'Enregistrer le lien Web'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
