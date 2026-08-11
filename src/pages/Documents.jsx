import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  getBiens,
  scanBienDirectory,
  copyFileToBien,
  openFilePath,
  deleteFileByPath,
  renameDocumentFile,
  moveFileToSubfolder,
  getFilePreview,
  readExcelFilePreview,
} from '../lib/db'
import { formatBytes } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import Icon from '../components/Icon'
import ExcelGeneratorModal from '../components/ExcelGeneratorModal'

export default function Documents({ selectedBienId }) {
  const [biens, setBiens] = useState([])
  const [currentBienId, setCurrentBienId] = useState(selectedBienId || '')
  const [treeNodes, setTreeNodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Chemins des dossiers dépliés (Set de relative_path)
  const [expandedPaths, setExpandedPaths] = useState(new Set())

  // Fichier ou dossier sélectionné
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [excelPreview, setExcelPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Recherche dans l'arborescence
  const [search, setSearch] = useState('')

  // Modale Ajout Fichier
  const [addModal, setAddModal] = useState(false)
  const [addTargetFolder, setAddTargetFolder] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [targetSubfolder, setTargetSubfolder] = useState('')
  const [uploading, setUploading] = useState(false)

  // Modale Renommer
  const [renameFile, setRenameFile] = useState(null)
  const [newFilename, setNewFilename] = useState('')

  // Modale Déplacer
  const [moveFile, setMoveFile] = useState(null)
  const [moveTarget, setMoveTarget] = useState('')

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, file }

  // Toast notifications
  const [toasts, setToasts] = useState([])

  // Excel Generator Modal
  const [excelModal, setExcelModal] = useState(null) // { bienId, targetSubfolder }

  // Toast helper
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  // Charger la liste des biens
  useEffect(() => {
    getBiens()
      .then((res) => {
        setBiens(res)
        if (res.length > 0 && !currentBienId) {
          setCurrentBienId(res[0].id)
        }
      })
      .catch((e) => setError(e?.toString()))
  }, [])

  // Scanner le répertoire du bien sélectionné
  const performScan = async (bienId) => {
    if (!bienId) return
    setLoading(true)
    setError(null)
    try {
      const nodes = await scanBienDirectory(parseInt(bienId))
      setTreeNodes(nodes)

      // Déplier automatiquement le 1er niveau par défaut
      const defaultExpanded = new Set()
      nodes.forEach((n) => {
        if (n.is_dir) defaultExpanded.add(n.relative_path)
      })
      setExpandedPaths((prev) => (prev.size === 0 ? defaultExpanded : prev))
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentBienId) {
      setSelectedFile(null)
      setPreviewData(null)
      setExcelPreview(null)
      performScan(currentBienId)
    }
  }, [currentBienId])

  // Charger la prévisualisation quand un fichier est sélectionné
  useEffect(() => {
    if (!selectedFile || selectedFile.is_dir) {
      setPreviewData(null)
      setExcelPreview(null)
      return
    }

    const lower = selectedFile.name.toLowerCase()
    const isExcelLike = ['.xlsx', '.xls', '.csv'].some((ext) => lower.endsWith(ext))

    setLoadingPreview(true)

    const loadPreview = async () => {
      try {
        if (isExcelLike) {
          const res = await readExcelFilePreview(selectedFile.relative_path)
          setExcelPreview(res)
          setPreviewData(null)
        } else {
          const res = await getFilePreview(selectedFile.relative_path)
          setPreviewData(res)
          setExcelPreview(null)
        }
      } catch (err) {
        console.warn('Aperçu indisponible', err)
        setPreviewData(null)
        setExcelPreview(null)
      } finally {
        setLoadingPreview(false)
      }
    }

    loadPreview()
  }, [selectedFile])

  const toggleExpand = (path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Cliquer sur un dossier = déplier + afficher son contenu dans le panneau droite
  const handleSelectFolder = (node) => {
    if (!expandedPaths.has(node.relative_path)) {
      toggleExpand(node.relative_path)
    }
    setSelectedFile(node) // Le panneau de droite affichera le contenu du dossier
  }

  const handlePickFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner un fichier à copier dans le bien',
      })
      if (selected) {
        setSourcePath(selected)
      }
    } catch (e) {
      console.warn('Dialog error', e)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!sourcePath || !currentBienId) return
    setUploading(true)
    setError(null)
    try {
      const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
      let subfolderPath = targetSubfolder
      if (currentBien?.chemin_dossier && subfolderPath.startsWith(currentBien.chemin_dossier)) {
        subfolderPath = subfolderPath.replace(currentBien.chemin_dossier, '').replace(/^\//, '')
      }

      await copyFileToBien({
        bienId: parseInt(currentBienId),
        subfolder: subfolderPath || '08_DIVERS',
        sourcePath,
      })
      setAddModal(false)
      setSourcePath('')
      addToast('Document ajouté avec succès')
      await performScan(currentBienId)
    } catch (err) {
      setError(err?.toString())
    } finally {
      setUploading(false)
    }
  }

  const handleOpenFile = async (relPath) => {
    try {
      await openFilePath(relPath)
    } catch (err) {
      alert(`Impossible d'ouvrir le fichier: ${err}`)
    }
  }

  const handleDeleteFile = async (file) => {
    if (!confirm(`Supprimer définitivement "${file.name}" du disque ?`)) return
    try {
      await deleteFileByPath(file.relative_path)
      if (selectedFile?.relative_path === file.relative_path) {
        setSelectedFile(null)
        setPreviewData(null)
      }
      addToast(`"${file.name}" supprimé`, 'info')
      performScan(currentBienId)
    } catch (err) {
      alert(`Erreur lors de la suppression: ${err}`)
    }
  }

  const handleOpenRename = (file) => {
    setRenameFile(file)
    setNewFilename(file.name)
    setCtxMenu(null)
  }

  const handleRenameSubmit = async (e) => {
    e.preventDefault()
    if (!renameFile || !newFilename) return
    try {
      const newRel = await renameDocumentFile(renameFile.relative_path, newFilename)
      setRenameFile(null)
      addToast(`Fichier renommé en "${newFilename}"`)
      await performScan(currentBienId)
      if (selectedFile?.relative_path === renameFile.relative_path) {
        setSelectedFile((prev) => prev ? { ...prev, name: newFilename, relative_path: newRel } : null)
      }
    } catch (err) {
      alert(`Erreur renommage: ${err}`)
    }
  }

  // Déplacer un fichier
  const handleMoveSubmit = async (e) => {
    e.preventDefault()
    if (!moveFile || !moveTarget || !currentBienId) return
    try {
      await moveFileToSubfolder(parseInt(currentBienId), moveFile.relative_path, moveTarget)
      addToast(`"${moveFile.name}" déplacé vers ${moveTarget}`)
      setMoveFile(null)
      await performScan(currentBienId)
    } catch (err) {
      alert(`Erreur déplacement: ${err}`)
    }
  }

  // Drag & Drop interne
  const handleDragStart = (e, file) => {
    e.dataTransfer.setData('application/json', JSON.stringify(file))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleFolderDrop = async (e, folderNode) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')

    // Drop depuis l'explorateur Windows
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      const filePath = droppedFile.path || droppedFile.name
      if (filePath && currentBienId) {
        try {
          const currentBien = biens.find(b => b.id === parseInt(currentBienId))
          let subfolder = folderNode.relative_path
          if (currentBien?.chemin_dossier && subfolder.startsWith(currentBien.chemin_dossier)) {
            subfolder = subfolder.replace(currentBien.chemin_dossier, '').replace(/^\//, '')
          }
          await copyFileToBien({
            bienId: parseInt(currentBienId),
            subfolder: subfolder || '08_DIVERS',
            sourcePath: filePath,
          })
          addToast(`Fichier ajouté dans ${folderNode.name}`)
          await performScan(currentBienId)
        } catch (err) {
          addToast(`Erreur: ${err}`, 'error')
        }
      }
      return
    }

    // Drop interne (déplacement entre dossiers)
    try {
      const fileData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (fileData && fileData.relative_path && currentBienId) {
        const currentBien = biens.find(b => b.id === parseInt(currentBienId))
        let targetFolder = folderNode.relative_path
        if (currentBien?.chemin_dossier && targetFolder.startsWith(currentBien.chemin_dossier)) {
          targetFolder = targetFolder.replace(currentBien.chemin_dossier, '').replace(/^\//, '')
        }
        await moveFileToSubfolder(parseInt(currentBienId), fileData.relative_path, targetFolder)
        addToast(`"${fileData.name}" déplacé vers ${folderNode.name}`)
        await performScan(currentBienId)
      }
    } catch (err) {
      console.warn('Drop error', err)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over')
  }

  // Context menu
  const handleContextMenu = (e, file) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, file })
  }

  // Fermer le context menu quand on clique ailleurs
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  // Extraire récursivement la liste de tous les dossiers
  const getAllFolders = (nodes, currentBienFolder = '') => {
    let folders = []
    for (const node of nodes) {
      if (node.is_dir) {
        let cleanRel = node.relative_path
        if (currentBienFolder && cleanRel.startsWith(currentBienFolder)) {
          cleanRel = cleanRel.replace(currentBienFolder, '').replace(/^\//, '')
        }
        folders.push({ label: cleanRel || node.name, value: cleanRel || node.name })
        if (node.children && node.children.length > 0) {
          folders = folders.concat(getAllFolders(node.children, currentBienFolder))
        }
      }
    }
    return folders
  }

  const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
  const availableFolders = getAllFolders(treeNodes, currentBien?.chemin_dossier || '')

  const countFilesRecursive = (node) => {
    if (!node.is_dir) return 1
    if (!node.children) return 0
    return node.children.reduce((sum, child) => sum + countFilesRecursive(child), 0)
  }

  // Ouvrir la modale d'ajout pré-ciblée sur un dossier
  const openAddForFolder = (folderRelPath) => {
    const currentBienFolder = currentBien?.chemin_dossier || ''
    let cleanFolder = folderRelPath
    if (currentBienFolder && cleanFolder.startsWith(currentBienFolder)) {
      cleanFolder = cleanFolder.replace(currentBienFolder, '').replace(/^\//, '')
    }
    setSourcePath('')
    setTargetSubfolder(cleanFolder || '01_ADMINISTRATIF')
    setAddModal(true)
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>Documents & Fichiers</h2>
          <p>Explorateur de fichiers avec prévisualisation</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => performScan(currentBienId)}
            title="Re-scanner le dossier sur le disque dur"
            disabled={loading || !currentBienId}
          >
            🔄 Actualiser
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSourcePath('')
              setTargetSubfolder(availableFolders[0]?.value || '01_ADMINISTRATIF')
              setAddModal(true)
            }}
            disabled={!currentBienId}
          >
            <Icon name="plus" size={14} /> Ajouter un document
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Split Explorer Layout */}
      <div className="explorer-layout">
        {/* Arborescence Verticale Gauche */}
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

            <input
              className="form-control"
              placeholder="🔍 Filtrer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                  onSelectFile={setSelectedFile}
                  onSelectFolder={handleSelectFolder}
                  countFilesRecursive={countFilesRecursive}
                  onDragStart={handleDragStart}
                  onFolderDrop={handleFolderDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onContextMenu={handleContextMenu}
                />
              ))
            )}
          </div>
        </div>

        {/* Panneau principal droite */}
        <div className="explorer-preview-panel">
          {selectedFile ? (
            selectedFile.is_dir ? (
              /* ── Vue contenu d'un dossier ── */
              <FolderContentView
                node={selectedFile}
                onSelectFile={setSelectedFile}
                onOpenFile={handleOpenFile}
                onAddDocument={() => openAddForFolder(selectedFile.relative_path)}
                onGenerateExcel={() => {
                  const cleanFolder = (() => {
                    const cf = currentBien?.chemin_dossier || ''
                    let f = selectedFile.relative_path
                    if (cf && f.startsWith(cf)) f = f.replace(cf, '').replace(/^\//, '')
                    return f
                  })()
                  setExcelModal({ bienId: parseInt(currentBienId), targetSubfolder: cleanFolder })
                }}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
              />
            ) : (
              /* ── Prévisualisation fichier ── */
              <>
                <div className="preview-header">
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getFileIcon(selectedFile.name)} {selectedFile.name}
                    </h3>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span>{formatBytes(selectedFile.size_bytes)}</span>
                      {selectedFile.modified_at && <span> • Modifié le {selectedFile.modified_at}</span>}
                      <span className="badge badge-accent" style={{ marginLeft: 8, fontSize: 10 }}>
                        {selectedFile.relative_path}
                      </span>
                    </div>
                  </div>

                  <div className="actions-cell">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenFile(selectedFile.relative_path)}
                      title="Ouvrir dans l'application Windows externe"
                    >
                      ↗️ Ouvrir
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleOpenRename(selectedFile)}
                      title="Renommer le fichier"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => handleDeleteFile(selectedFile)}
                      title="Supprimer du disque"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                <div className="preview-body">
                  {loadingPreview ? (
                    <div style={{ color: 'var(--text-muted)' }}>Chargement de l'aperçu...</div>
                  ) : previewData ? (
                    <>
                      {previewData.mime_type === 'application/pdf' && (
                        <iframe
                          src={`data:application/pdf;base64,${previewData.base64_data}`}
                          title={selectedFile.name}
                          width="100%"
                          height="100%"
                          style={{ border: 'none', borderRadius: '8px', flex: 1, minHeight: '480px' }}
                        />
                      )}

                      {previewData.mime_type.startsWith('image/') && (
                        <div style={{ overflow: 'auto', textAlign: 'center', maxHeight: '100%' }}>
                          <img
                            src={`data:${previewData.mime_type};base64,${previewData.base64_data}`}
                            alt={selectedFile.name}
                            style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow)' }}
                          />
                        </div>
                      )}

                      {previewData.mime_type.startsWith('text/') && (
                        <pre style={{ width: '100%', height: '100%', overflow: 'auto', background: 'var(--color-surface-2)', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>
                          {previewData.text_content || 'Fichier texte vide'}
                        </pre>
                      )}

                      {!previewData.mime_type.startsWith('image/') &&
                        !previewData.mime_type.startsWith('text/') &&
                        previewData.mime_type !== 'application/pdf' && (
                          <div className="empty-state">
                            <div className="empty-state-icon">📄</div>
                            <h3>Aperçu non disponible pour ce type</h3>
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => handleOpenFile(selectedFile.relative_path)}>
                              ↗️ Ouvrir avec le programme par défaut
                            </button>
                          </div>
                        )}
                    </>
                  ) : excelPreview ? (
                    <div style={{ overflow: 'auto', maxHeight: '100%' }}>
                      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        Feuille : {excelPreview.sheet_name}
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <tbody>
                          {excelPreview.rows.slice(0, 30).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td key={`${rowIndex}-${cellIndex}`} style={{
                                  border: '1px solid var(--color-border)',
                                  padding: '6px 8px',
                                  background: rowIndex === 0 ? 'var(--color-bg-subtle)' : 'transparent',
                                  fontWeight: rowIndex === 0 ? 700 : 400,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {cell || ' '}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ marginTop: 12 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenFile(selectedFile.relative_path)}>
                          ↗️ Ouvrir avec le programme par défaut
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">⚠️</div>
                      <h3>Impossible de charger l'aperçu</h3>
                      <button className="btn btn-secondary" onClick={() => handleOpenFile(selectedFile.relative_path)}>
                        Ouvrir avec le système
                      </button>
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            <div className="preview-body">
              <div className="empty-state">
                <div className="empty-state-icon">👈</div>
                <h3>Sélectionnez un dossier ou fichier</h3>
                <p>Cliquez sur un dossier pour voir son contenu, ou sur un fichier pour le prévisualiser.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
          <button className="context-menu-item" onClick={() => { handleOpenFile(ctxMenu.file.relative_path); setCtxMenu(null) }}>
            ↗️ Ouvrir avec le système
          </button>
          <button className="context-menu-item" onClick={() => { handleOpenRename(ctxMenu.file); }}>
            ✏️ Renommer
          </button>
          <button className="context-menu-item" onClick={() => {
            setMoveFile(ctxMenu.file)
            setMoveTarget(availableFolders[0]?.value || '')
            setCtxMenu(null)
          }}>
            📂 Déplacer vers…
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item danger" onClick={() => { handleDeleteFile(ctxMenu.file); setCtxMenu(null) }}>
            🗑️ Supprimer
          </button>
        </div>
      )}

      {/* Modale Ajout de Document */}
      {addModal && (
        <div className="modal-backdrop" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajouter un document au bien</h3>
              <button className="modal-close" onClick={() => setAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Dossier de destination *</label>
                <select className="form-control" value={targetSubfolder} onChange={(e) => setTargetSubfolder(e.target.value)}>
                  {availableFolders.map((f) => (
                    <option key={f.value} value={f.value}>📁 {f.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fichier source *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-control" readOnly required value={sourcePath} placeholder="Sélectionnez un fichier..." />
                  <button type="button" className="btn btn-secondary" onClick={handlePickFile}>Parcourir...</button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={!sourcePath || uploading}>
                  {uploading ? 'Copie en cours...' : 'Copier dans le dossier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Renommer */}
      {renameFile && (
        <div className="modal-backdrop" onClick={() => setRenameFile(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Renommer le fichier</h3>
              <button className="modal-close" onClick={() => setRenameFile(null)}>×</button>
            </div>
            <form onSubmit={handleRenameSubmit}>
              <div className="form-group">
                <label className="form-label">Nouveau nom *</label>
                <input className="form-control" required value={newFilename} onChange={(e) => setNewFilename(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRenameFile(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Renommer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Déplacer */}
      {moveFile && (
        <div className="modal-backdrop" onClick={() => setMoveFile(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Déplacer "{moveFile.name}"</h3>
              <button className="modal-close" onClick={() => setMoveFile(null)}>×</button>
            </div>
            <form onSubmit={handleMoveSubmit}>
              <div className="form-group">
                <label className="form-label">Dossier de destination *</label>
                <select className="form-control" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
                  {availableFolders.map((f) => (
                    <option key={f.value} value={f.value}>📁 {f.label}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setMoveFile(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Déplacer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Generator Modal ciblé sur un dossier */}
      {excelModal && (
        <ExcelGeneratorModal
          initialBienId={excelModal.bienId}
          targetSubfolder={excelModal.targetSubfolder}
          onClose={() => setExcelModal(null)}
          onSuccess={() => { setExcelModal(null); performScan(currentBienId) }}
        />
      )}

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === 'success' && '✅'}
              {t.type === 'error' && '❌'}
              {t.type === 'info' && 'ℹ️'}
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Vue contenu d'un dossier (panneau de droite) ────────────────────────────
function FolderContentView({ node, onSelectFile, onOpenFile, onAddDocument, onGenerateExcel, onContextMenu, onDragStart }) {
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
            onClick={() => onSelectFile(f)}
            style={{ fontWeight: 600 }}
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
          >
            <span style={{ fontSize: 14 }}>{getFileIcon(f.name)}</span>
            <span style={{ flex: 1, fontWeight: 500, wordBreak: 'break-all' }}>{f.name}</span>
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
            >
              ↗️
            </button>
          </div>
        ))}

        {/* Dossier vide */}
        {files.length === 0 && folders.length === 0 && (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">📂</div>
            <h3>Ce dossier est vide</h3>
            <p>Ajoutez un document ou glissez-déposez un fichier ici</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onAddDocument}>
              + Ajouter un document ici
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Composant Récursif Arbre de Dossiers / Fichiers ─────────────────────────
function TreeNodeItem({
  node, depth, searchQuery, expandedPaths, toggleExpand,
  selectedFile, onSelectFile, onSelectFolder, countFilesRecursive,
  onDragStart, onFolderDrop, onDragOver, onDragLeave, onContextMenu,
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
          onClick={() => onSelectFolder(node)}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={(e) => onFolderDrop(e, node)}
          style={isSelected ? { background: 'var(--color-accent-dim)' } : undefined}
        >
          <div className="folder-label">
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
            <span>📁 {node.name}</span>
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
      style={{ marginLeft: depth > 0 ? 12 : 0 }}
      draggable="true"
      onDragStart={(e) => onDragStart(e, node)}
      onClick={() => onSelectFile(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      <div className="file-name-text">
        {getFileIcon(node.name)} {node.name}
      </div>
      <span style={{ fontSize: 10, opacity: 0.7 }}>
        {formatBytes(node.size_bytes)}
      </span>
    </div>
  )
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return '📄'
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return '🖼️'
  if (['doc', 'docx', 'txt', 'odt', 'md'].includes(ext)) return '📝'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  return '📁'
}
