import React from 'react'
import { formatBytes } from '../../lib/utils'
import { getFileIcon } from './TreeNodeItem'
import { getThemeForPath } from '../../lib/folderThemes'
import Icon from '../common/Icon'

export default function FolderContentView({
  node,
  onSelectFile,
  onOpenFile,
  onAddDocument,
  onGenerateExcel,
  onBackToThemes,
  onContextMenu,
  onDragStart,
  onFolderDrop,
  onDragOver,
  onDragLeave
}) {
  const children = node?.children || []
  const files = children.filter(c => !c.is_dir)
  const folders = children.filter(c => c.is_dir)

  const theme = getThemeForPath(node?.relative_path || node?.name)

  return (
    <div className="folder-content-view" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── EN-TÊTE DU DOSSIER ADAPTÉ AU THÈME ── */}
      <div style={{
        padding: '16px 20px',
        background: `linear-gradient(135deg, ${theme.bg} 0%, #ffffff 100%)`,
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBackToThemes && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onBackToThemes}
              title="Retourner à la vue de tous les thèmes"
              style={{
                fontSize: 11,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
                color: theme.badgeText,
                borderColor: theme.border
              }}
            >
              ← Thèmes
            </button>
          )}

          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#ffffff',
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
          }}>
            <Icon name={theme.icon || 'folderOpen'} size={18} color={theme.primary} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {node.name}
              </h3>
              <span style={{
                fontSize: 10.5,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 99,
                background: '#ffffff',
                color: theme.badgeText,
                border: `1px solid ${theme.border}`
              }}>
                {files.length} fichier{files.length !== 1 ? 's' : ''}
                {folders.length > 0 ? ` · ${folders.length} dossier${folders.length !== 1 ? 's' : ''}` : ''}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
              Thème : <strong style={{ color: theme.primary }}>{theme.label}</strong>
            </div>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onAddDocument}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
          >
            <Icon name="plus" size={13} /> Ajouter un fichier
          </button>

          <button
            className="btn btn-sm"
            onClick={onGenerateExcel}
            title="Générer un document PDF officiel ou un tableur Excel adapté à ce dossier"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: theme.primary,
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 6,
              boxShadow: `0 2px 6px ${theme.border}`,
              cursor: 'pointer'
            }}
          >
            <Icon name="filePlus" size={14} color="#ffffff" /> Générer un document
          </button>
        </div>
      </div>

      {/* ── LISTE DES ÉLÉMENTS DU DOSSIER ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {folders.length === 0 && files.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: theme.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Icon name="folder" size={24} color={theme.primary} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>Ce dossier est vide</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Glissez-déposez des fichiers ici ou cliquez sur « Générer un document ».
            </div>
          </div>
        )}

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
            style={{
              fontWeight: 600,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              marginBottom: 4
            }}
          >
            <Icon name="folder" size={17} color={theme.primary} />
            <span style={{ flex: 1, color: '#0f172a' }}>{f.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {(f.children || []).length} élément{(f.children || []).length > 1 ? 's' : ''}
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
            style={{
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              marginBottom: 4
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>{getFileIcon(f.name)}</span>
            <span style={{ flex: 1, fontWeight: 500, wordBreak: 'break-all', color: '#0f172a' }}>
              {f.name.replace(/\.url$/i, '')}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {formatBytes(f.size_bytes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
