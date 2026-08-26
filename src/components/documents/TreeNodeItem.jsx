import React from 'react'
import { formatBytes } from '../../lib/utils'
import Icon from '../common/Icon'

export function getFileIcon(filename) {
  if (!filename) return <Icon name="folder" size={14} color="#f59e0b" />
  const ext = filename.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return <Icon name="fileText" size={14} color="#ef4444" />
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) return <Icon name="image" size={14} color="#3b82f6" />
  if (['doc', 'docx', 'txt', 'odt', 'md'].includes(ext)) return <Icon name="fileText" size={14} color="#6366f1" />
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <Icon name="fileSpreadsheet" size={14} color="#16a34a" />
  if (['url', 'html', 'htm', 'link', 'website'].includes(ext)) return <Icon name="globe" size={14} color="#0ea5e9" />
  return <Icon name="file" size={14} color="#64748b" />
}

export default function TreeNodeItem({
  node,
  depth,
  searchQuery,
  expandedPaths,
  toggleExpand,
  selectedFile,
  onSelectFile,
  onSelectFolder,
  countFilesRecursive,
  onDragStart,
  onFolderDrop,
  onDragOver,
  onDragLeave,
  onContextMenu,
}) {
  const matchesSearch = (n) => {
    if (!searchQuery) return true
    if (n.name.toLowerCase().includes(searchQuery.toLowerCase())) return true
    if (n.children) return n.children.some(matchesSearch)
    return false
  }

  if (!matchesSearch(node)) return null

  const isExpanded = expandedPaths.has(node.relative_path) || searchQuery.length > 0
  const isSelected = selectedFile?.relative_path === node.relative_path

  if (node.is_dir) {
    const fileCount = countFilesRecursive(node)

    return (
      <div className="tree-folder-group" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        <div
          className={`tree-folder-header ${isSelected ? 'active' : ''}`}
          draggable="true"
          onDragStart={(e) => onDragStart(e, node)}
          onClick={() => onSelectFolder(node)}
          onDoubleClick={(e) => { e.stopPropagation(); toggleExpand(node.relative_path) }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={(e) => onFolderDrop(e, node)}
          style={{
            background: isSelected ? 'var(--color-accent-dim)' : undefined,
            cursor: 'pointer',
          }}
        >
          <div className="folder-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', userSelect: 'none' }}
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.relative_path)
              }}
              title={isExpanded ? 'Réduire ce dossier' : 'Déplier ce dossier'}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
            <Icon name={isExpanded ? 'folderOpen' : 'folder'} size={15} color="#f59e0b" />
            <span>{node.name}</span>
          </div>
          <span className="badge badge-muted" style={{ fontSize: 10 }}>
            {fileCount}
          </span>
        </div>

        {isExpanded && node.children && node.children.length > 0 && (
          <div className="tree-file-list" style={{ paddingLeft: 12 }}>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.relative_path}
                node={child}
                depth={depth + 1}
                searchQuery={searchQuery}
                expandedPaths={expandedPaths}
                toggleExpand={toggleExpand}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                onSelectFolder={onSelectFolder}
                countFilesRecursive={countFilesRecursive}
                onDragStart={onDragStart}
                onFolderDrop={onFolderDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`tree-file-item ${isSelected ? 'active' : ''}`}
      style={{ marginLeft: depth > 0 ? 12 : 0, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      draggable="true"
      onDragStart={(e) => onDragStart(e, node)}
      onClick={() => onSelectFile(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      <div className="file-name-text" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {getFileIcon(node.name)}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name.replace(/\.url$/i, '')}
        </span>
      </div>
      <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>
        {formatBytes(node.size_bytes)}
      </span>
    </div>
  )
}
