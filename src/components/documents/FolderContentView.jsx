import React from 'react'
import { formatBytes } from '../../lib/utils'
import { getFileIcon } from './TreeNodeItem'

export default function FolderContentView({
  node,
  onSelectFile,
  onOpenFile,
  onAddDocument,
  onGenerateExcel,
  onContextMenu,
  onDragStart,
  onFolderDrop,
  onDragOver,
  onDragLeave
}) {
  const children = node.children || []
  const files = children.filter(c => !c.is_dir)
  const folders = children.filter(c => c.is_dir)

  return (
    <div className="folder-content-view" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="folder-content-header">
        <h3>
          📂 {node.name}
          <span className="badge badge-accent" style={{ fontSize: 10, marginLeft: 8 }}>
            {files.length} fichier{files.length !== 1 ? 's' : ''}
            {folders.length > 0 ? ` · ${folders.length} sous-dossier${folders.length !== 1 ? 's' : ''}` : ''}
          </span>
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={onAddDocument}>
            + Ajouter ici
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onGenerateExcel} title="Générer un fichier Excel dans ce dossier">
            📊 Générer Excel
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Sous-dossiers */}
        {folders.map(f => (
          <div
            key={f.relative_path}
            className="folder-file-row"
            draggable="true"
            onDragStart={(e) => onDragStart(e, f)}
            onClick={() => onSelectFile(f)}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={(e) => onFolderDrop(e, f)}
            style={{ fontWeight: 600, cursor: 'grab' }}
          >
            <span style={{ fontSize: 16 }}>📁</span>
            <span style={{ flex: 1 }}>{f.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {(f.children || []).length} éléments
            </span>
          </div>
        ))}

        {/* Fichiers */}
        {files.map(f => (
          <div
            key={f.relative_path}
            className="folder-file-row"
            draggable="true"
            onDragStart={(e) => onDragStart(e, f)}
            onClick={() => onSelectFile(f)}
            onContextMenu={(e) => onContextMenu(e, f)}
            style={{ cursor: 'grab' }}
          >
            <span style={{ fontSize: 14 }}>{getFileIcon(f.name)}</span>
            <span style={{ flex: 1, fontWeight: 500, wordBreak: 'break-all' }}>{f.name.replace(/\.url$/i, '')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {formatBytes(f.size_bytes)}
            </span>
            {f.modified_at && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {f.modified_at}
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 8px', fontSize: 11 }}
              onClick={(e) => { e.stopPropagation(); onOpenFile(f.relative_path) }}
              title={f.name.toLowerCase().endsWith('.url') ? "Ouvrir le lien web" : "Ouvrir le fichier"}
            >
              {f.name.toLowerCase().endsWith('.url') ? '🌐' : '↗️'}
            </button>
          </div>
        ))}

        {/* Dossier vide */}
        {files.length === 0 && folders.length === 0 && (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">🖼️ 🌐 📂</div>
            <h3>Ce dossier est vide</h3>
            <p>Ajoutez un document, un lien web ou glissez-déposez des fichiers ici</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onAddDocument}>
              + Ajouter un document / Lien web ici
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
