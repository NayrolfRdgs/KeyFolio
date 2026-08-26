import Icon from '../common/Icon'
import React from 'react'
import { formatDate } from '../../lib/utils'

export default function BienFilesTab({
  files,
  loadingFiles,
  onOpenFile,
  onDeleteFile,
  onUploadFile
}) {
  if (loadingFiles) {
    return (
      <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
        Chargement des documents du bien...
      </div>
    )
  }

  return (
    <div className="bien-files-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Documents et Fichiers</h3>
        <button className="btn btn-primary btn-sm" onClick={onUploadFile}>
          + Ajouter un document
        </button>
      </div>

      {(!files || files.length === 0) ? (
        <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Icon name="folderOpen" size={36} color="#94a3b8" /></div>
          <h4>Aucun document dans le dossier de ce bien</h4>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Ajoutez vos diagnostics, actes de propriété ou factures de travaux.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom du fichier</th>
                <th>Sous-dossier</th>
                <th>Type / Catégorie</th>
                <th>Dernière modif.</th>
                <th>Taille</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr key={file.doc_id || idx}>
                  <td className="fw-600">
                    <button
                      className="btn-link"
                      onClick={() => onOpenFile(file.relative_path || file.absolute_path)}
                      style={{ textDecoration: 'none', textAlign: 'left' }}
                    >
                      {file.filename}
                    </button>
                  </td>
                  <td><span className="badge badge-secondary">{file.subfolder}</span></td>
                  <td>{file.type_doc || '—'}</td>
                  <td className="text-muted">{file.modified_at}</td>
                  <td className="text-muted">{Math.round((file.size_bytes || 0) / 1024)} ko</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onOpenFile(file.relative_path || file.absolute_path)}
                      title="Ouvrir le fichier"
                    >
                      Ouvrir
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => onDeleteFile(file)}
                      title="Supprimer"
                      style={{ marginLeft: 6 }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
