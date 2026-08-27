import Icon from '../common/Icon'
import React from 'react'
import { formatDate } from '../../lib/utils'

export default function BienFilesTab({
  files,
  bienFiles,
  loadingFiles,
  onOpenFile,
  onOpen,
  onDeleteFile,
  onUploadFile,
  onDeposer,
  onEditFile
}) {
  if (loadingFiles) {
    return (
      <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
        Chargement des documents du bien...
      </div>
    )
  }

  const allFileList = files || bienFiles || []
  const handleOpenTarget = onOpenFile || onOpen

  return (
    <div className="bien-files-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Documents et Fichiers</h3>
        <button className="btn btn-primary btn-sm" onClick={onUploadFile || onDeposer}>
          + Ajouter un document
        </button>
      </div>

      {(!allFileList || allFileList.length === 0) ? (
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
              {allFileList.map((file, idx) => (
                <tr key={file.doc_id || idx}>
                  <td className="fw-600">
                    <button
                      className="btn-link"
                      onClick={() => handleOpenTarget && handleOpenTarget(file.relative_path || file.absolute_path)}
                      style={{ textDecoration: 'none', textAlign: 'left' }}
                    >
                      {file.filename || file.name}
                    </button>
                  </td>
                  <td><span className="badge badge-secondary">{file.subfolder}</span></td>
                  <td>{file.type_doc || '—'}</td>
                  <td className="text-muted">{file.modified_at}</td>
                  <td className="text-muted">{Math.round((file.size_bytes || 0) / 1024)} ko</td>
                  <td style={{ textAlign: 'right' }}>
                    {(file.filename?.toLowerCase().endsWith('.pdf') || file.name?.toLowerCase().endsWith('.pdf')) && onEditFile && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEditFile(file)}
                        title="Modifier / Compléter ce document"
                        style={{ marginRight: 6, fontWeight: 700, color: '#4f46e5', borderColor: '#c7d2fe', background: '#eef2ff' }}
                      >
                        <Icon name="fileSignature" size={12} color="#4f46e5" /> Remplir
                      </button>
                    )}
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
