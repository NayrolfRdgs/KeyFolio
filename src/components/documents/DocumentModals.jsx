import React from 'react'
import Icon from '../Icon'
import { formatBytes } from '../../lib/utils'
import { getFileIcon } from './TreeNodeItem'

export function RenameModal({
  file,
  newFilename,
  setNewFilename,
  onSubmit,
  onClose
}) {
  if (!file) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>✏️ Renommer le document</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Nouveau nom de fichier *</label>
            <input
              className="form-control"
              required
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              autoFocus
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Conservez l'extension (ex: <code>.pdf</code>, <code>.jpg</code>)
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Renommer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function MoveModal({
  file,
  moveTarget,
  setMoveTarget,
  availableFolders,
  onSubmit,
  onClose
}) {
  if (!file) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>📂 Déplacer vers un autre dossier</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Dossier de destination *</label>
            <select
              className="form-control"
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
            >
              {availableFolders.map((f) => (
                <option key={f.value} value={f.value}>📁 {f.label}</option>
              ))}
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Déplacer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function DeleteConfirmModal({
  file,
  onConfirm,
  onClose
}) {
  if (!file) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
            <Icon name="trash" size={18} /> Suppression de fichier
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-primary)' }}>
            Voulez-vous vraiment supprimer définitivement ce fichier du disque dur ?
          </p>
          <div
            style={{
              background: 'var(--color-surface-2)',
              padding: 12,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 22 }}>{getFileIcon(file.name)}</span>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <div style={{ wordBreak: 'break-all' }}>{file.name}</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                {formatBytes(file.size_bytes)} • {file.relative_path}
              </div>
            </div>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-danger)', fontWeight: 500 }}>
            ⚠️ Cette action supprimera physiquement le fichier sur votre ordinateur.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onConfirm(file)}
          >
            🗑️ Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  )
}
