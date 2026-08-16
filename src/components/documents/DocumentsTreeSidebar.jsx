import React from 'react'
import TreeNodeItem from './TreeNodeItem'

export default function DocumentsTreeSidebar({
  biens,
  currentBienId,
  setCurrentBienId,
  search,
  setSearch,
  onCollapseAll,
  onExpandAll,
  loading,
  treeNodes,
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
  onContextMenu
}) {
  return (
    <div className="explorer-tree-panel">
      <div className="explorer-tree-header">
        <select
          className="form-control"
          style={{ fontWeight: 600, marginBottom: 8 }}
          value={currentBienId}
          onChange={(e) => setCurrentBienId(e.target.value)}
        >
          {biens.map((b) => (
            <option key={b.id} value={b.id}>
              🏠 {b.nom}
            </option>
          ))}
        </select>

        {/* Barre de recherche + Boutons rapides Réduire/Déplier */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="form-control"
            placeholder="🔍 Filtrer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCollapseAll}
            title="Tout réduire"
            style={{ whiteSpace: 'nowrap', padding: '5px 8px', fontSize: 11 }}
          >
            📐 Réduire
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onExpandAll}
            title="Tout déplier"
            style={{ whiteSpace: 'nowrap', padding: '5px 8px', fontSize: 11 }}
          >
            📂 Déplier
          </button>
        </div>
      </div>

      <div className="explorer-tree-content">
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            Scan dynamique du disque...
          </div>
        ) : treeNodes.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            Dossier du bien vide.
          </div>
        ) : (
          treeNodes.map((node) => (
            <TreeNodeItem
              key={node.relative_path}
              node={node}
              depth={0}
              searchQuery={search}
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
          ))
        )}
      </div>
    </div>
  )
}
