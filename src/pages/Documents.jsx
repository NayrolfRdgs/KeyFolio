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
  saveEmailAttachmentToBien,
  openExternalUrl,
} from '../lib/db'
import { formatBytes } from '../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import Icon from '../components/Icon'
import ExcelGeneratorModal from '../components/ExcelGeneratorModal'

// Sous-composants découplés
import TreeNodeItem, { getFileIcon } from '../components/documents/TreeNodeItem'
import FolderContentView from '../components/documents/FolderContentView'
import DocumentPreviewer from '../components/documents/DocumentPreviewer'
import AddDocumentModal from '../components/documents/AddDocumentModal'
import { RenameModal, MoveModal, DeleteConfirmModal } from '../components/documents/DocumentModals'

// ─── Helpers d'arborescence ──────────────────────────────────────────────────
const findNodeByPath = (nodes, targetPath) => {
  if (!nodes || !targetPath) return null
  for (const node of nodes) {
    if (node.relative_path === targetPath) return node
    if (node.is_dir && node.children && node.children.length > 0) {
      const found = findNodeByPath(node.children, targetPath)
      if (found) return found
    }
  }
  return null
}

const getAllFolderPaths = (nodes) => {
  let paths = []
  for (const node of nodes) {
    if (node.is_dir) {
      paths.push(node.relative_path)
      if (node.children && node.children.length > 0) {
        paths = paths.concat(getAllFolderPaths(node.children))
      }
    }
  }
  return paths
}

export default function Documents({ selectedBienId, initialFilePath }) {
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

  // Drag & Drop global overlay
  const [isDraggingOverPanel, setIsDraggingOverPanel] = useState(false)
  const dragCounter = useRef(0)

  // Modale Ajout Fichier / Lien Web
  const [addModal, setAddModal] = useState(false)
  const [addDocType, setAddDocType] = useState('file') // 'file' | 'link'
  const [sourcePath, setSourcePath] = useState('')
  const [targetSubfolder, setTargetSubfolder] = useState('')
  const [webTitle, setWebTitle] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  // Modale Renommer
  const [renameFile, setRenameFile] = useState(null)
  const [newFilename, setNewFilename] = useState('')

  // Modale Déplacer
  const [moveFile, setMoveFile] = useState(null)
  const [moveTarget, setMoveTarget] = useState('')

  // Modale Validation Suppression Fichier
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(null)

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

  // Sauvegarder les dossiers dépliés dans localStorage
  useEffect(() => {
    if (!currentBienId) return
    const saved = localStorage.getItem(`expandedPaths_${currentBienId}`)
    if (saved) {
      try {
        setExpandedPaths(new Set(JSON.parse(saved)))
      } catch (e) {
        console.error('Erreur lecture expandedPaths', e)
      }
    }
  }, [currentBienId])

  const saveExpandedPaths = useCallback((newSet) => {
    if (!currentBienId) return
    localStorage.setItem(`expandedPaths_${currentBienId}`, JSON.stringify([...newSet]))
  }, [currentBienId])

  // Déplier / Replier un dossier
  const toggleExpand = useCallback((relPath) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(relPath)) {
        next.delete(relPath)
      } else {
        next.add(relPath)
      }
      saveExpandedPaths(next)
      return next
    })
  }, [saveExpandedPaths])

  // Replier tous les dossiers
  const collapseAllFolders = useCallback(() => {
    setExpandedPaths(new Set())
    if (currentBienId) {
      localStorage.removeItem(`expandedPaths_${currentBienId}`)
    }
    addToast('Tous les dossiers ont été réduits', 'info')
  }, [currentBienId, addToast])

  // Déplier tous les dossiers
  const expandAllFolders = useCallback(() => {
    const allPaths = getAllFolderPaths(treeNodes)
    const newSet = new Set(allPaths)
    setExpandedPaths(newSet)
    saveExpandedPaths(newSet)
    addToast('Tous les dossiers sont dépliés', 'info')
  }, [treeNodes, saveExpandedPaths, addToast])

  // Scanner le dossier du bien sélectionné
  const performScan = useCallback(async (bienId, targetPathToSelect = null) => {
    if (!bienId) return
    setLoading(true)
    setError(null)
    try {
      const nodes = await scanBienDirectory(parseInt(bienId))
      setTreeNodes(nodes)

      if (targetPathToSelect) {
        const found = findNodeByPath(nodes, targetPathToSelect)
        if (found) {
          setSelectedFile(found)
        }
      }
    } catch (e) {
      setError(`Erreur lors de la lecture du dossier : ${e}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentBienId) {
      performScan(currentBienId, initialFilePath)
    }
  }, [currentBienId, initialFilePath, performScan])

  // Ouvrir les dossiers parents du fichier ciblé
  useEffect(() => {
    if (initialFilePath && treeNodes.length > 0) {
      const parts = initialFilePath.split('/')
      parts.pop() // Enlever le nom du fichier
      let accumulated = ''
      const pathsToExpand = new Set(expandedPaths)
      for (const part of parts) {
        accumulated = accumulated ? `${accumulated}/${part}` : part
        pathsToExpand.add(accumulated)
      }
      setExpandedPaths(pathsToExpand)
      saveExpandedPaths(pathsToExpand)

      const target = findNodeByPath(treeNodes, initialFilePath)
      if (target) {
        setSelectedFile(target)
      }
    }
  }, [initialFilePath, treeNodes])

  // Prévisualisation d'un fichier sélectionné
  useEffect(() => {
    if (!selectedFile || selectedFile.is_dir) {
      setPreviewData(null)
      setExcelPreview(null)
      return
    }

    const ext = selectedFile.name.split('.').pop().toLowerCase()
    setLoadingPreview(true)

    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      readExcelFilePreview(selectedFile.relative_path)
        .then((res) => {
          setExcelPreview(res)
          setPreviewData(null)
        })
        .catch((e) => {
          console.error(e)
          setExcelPreview(null)
        })
        .finally(() => setLoadingPreview(false))
    } else {
      getFilePreview(selectedFile.relative_path)
        .then((res) => {
          setPreviewData(res)
          setExcelPreview(null)
        })
        .catch((e) => {
          console.error(e)
          setPreviewData(null)
        })
        .finally(() => setLoadingPreview(false))
    }
  }, [selectedFile])

  // Listeners Drag & Drop de l'OS via Tauri API
  useEffect(() => {
    let unlisten = null
    const setupListener = async () => {
      try {
        const webview = getCurrentWebview()
        unlisten = await webview.onDragDropEvent(async (event) => {
          if (event.payload.type === 'drop') {
            const paths = event.payload.paths
            if (paths && paths.length > 0 && currentBienId) {
              const targetFolder = selectedFile?.is_dir
                ? (() => {
                    const currentBienFolder = biens.find(b => b.id === parseInt(currentBienId))?.chemin_dossier || ''
                    let f = selectedFile.relative_path
                    if (currentBienFolder && f.startsWith(currentBienFolder)) {
                      f = f.replace(currentBienFolder, '').replace(/^\//, '')
                    }
                    return f || '00_ACHAT-VENTE/Annonce - Photos'
                  })()
                : '00_ACHAT-VENTE/Annonce - Photos'

              try {
                let lastPath = null
                for (const p of paths) {
                  lastPath = await copyFileToBien(parseInt(currentBienId), p, targetFolder)
                }
                addToast(`${paths.length} fichier(s) importé(s) avec succès !`)
                performScan(currentBienId, lastPath)
              } catch (err) {
                addToast(`Erreur d'importation : ${err}`, 'error')
              }
            }
          }
        })
      } catch (err) {
        console.warn('DragDrop non supporté dans cet environnement', err)
      }
    }
    setupListener()
    return () => {
      if (unlisten) unlisten()
    }
  }, [currentBienId, selectedFile, biens, performScan, addToast])

  // Raccourci clavier Suppr pour supprimer le fichier sélectionné
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFile && !selectedFile.is_dir) {
        const activeTag = document.activeElement?.tagName
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          e.preventDefault()
          setConfirmDeleteFile(selectedFile)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile])

  // Liste des sous-dossiers disponibles
  const availableFolders = (() => {
    const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
    const currentBienFolder = currentBien?.chemin_dossier || ''
    const rawPaths = getAllFolderPaths(treeNodes)

    return rawPaths.map((p) => {
      let label = p
      if (currentBienFolder && label.startsWith(currentBienFolder)) {
        label = label.replace(currentBienFolder, '').replace(/^\//, '')
      }
      return { value: label || p, label: label || 'Racine du bien' }
    })
  })()

  // Actions Fichiers
  const handleSelectFile = (node) => {
    setSelectedFile(node)
  }

  const handleSelectFolder = (node) => {
    setSelectedFile(node)
    toggleExpand(node.relative_path)
  }

  const handleOpenFile = async (relPath) => {
    try {
      await openFilePath(relPath)
    } catch (e) {
      addToast(`Erreur lors de l'ouverture du fichier : ${e}`, 'error')
    }
  }

  const handleDeleteFile = async (fileNode) => {
    try {
      await deleteFileByPath(fileNode.relative_path)
      addToast(`Fichier "${fileNode.name}" supprimé.`, 'info')
      setSelectedFile(null)
      performScan(currentBienId)
    } catch (e) {
      addToast(`Erreur lors de la suppression : ${e}`, 'error')
    }
  }

  // Renommer
  const handleOpenRename = (fileNode) => {
    setRenameFile(fileNode)
    setNewFilename(fileNode.name)
    setCtxMenu(null)
  }

  const handleRenameSubmit = async (e) => {
    e.preventDefault()
    if (!renameFile || !newFilename.trim()) return
    try {
      const updatedPath = await renameDocumentFile(renameFile.relative_path, newFilename.trim())
      addToast('Fichier renommé avec succès !')
      setRenameFile(null)
      performScan(currentBienId, updatedPath)
    } catch (err) {
      addToast(`Erreur de renommage : ${err}`, 'error')
    }
  }

  // Déplacer
  const handleMoveSubmit = async (e) => {
    e.preventDefault()
    if (!moveFile || !moveTarget) return
    try {
      const updatedPath = await moveFileToSubfolder(moveFile.relative_path, moveTarget)
      addToast('Fichier déplacé avec succès !')
      setMoveFile(null)
      performScan(currentBienId, updatedPath)
    } catch (err) {
      addToast(`Erreur lors du déplacement : ${err}`, 'error')
    }
  }

  // Ajout Fichier ou Lien Web
  const handlePickSourceFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner un document ou une image',
        filters: [{ name: 'Tous les fichiers', extensions: ['*'] }],
      })
      if (selected) {
        setSourcePath(selected)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!currentBienId) return

    setUploading(true)
    try {
      if (addDocType === 'file') {
        if (!sourcePath) return
        const newRelativePath = await copyFileToBien(
          parseInt(currentBienId),
          sourcePath,
          targetSubfolder || '01_ADMINISTRATIF'
        )
        addToast('Document importé avec succès !')
        setAddModal(false)
        performScan(currentBienId, newRelativePath)
      } else {
        if (!webTitle.trim() || !webUrl.trim()) return
        const filename = `${webTitle.trim().replace(/[/\\?%*:|"<>]/g, '_')}.url`
        const urlContent = `[InternetShortcut]\r\nURL=${webUrl.trim()}\r\n`
        const base64Data = btoa(unescape(encodeURIComponent(urlContent)))

        const newRelativePath = await saveEmailAttachmentToBien(
          parseInt(currentBienId),
          targetSubfolder || '01_ADMINISTRATIF',
          filename,
          base64Data
        )
        addToast('Raccourci Web enregistré avec succès !')
        setAddModal(false)
        performScan(currentBienId, newRelativePath)
      }
    } catch (err) {
      addToast(`Erreur : ${err}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  // Drag & Drop HTML5 interne
  const handleDragStart = (e, node) => {
    e.dataTransfer.setData('text/plain', node.relative_path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleFolderDrop = async (e, targetFolderNode) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')

    const sourceRelativePath = e.dataTransfer.getData('text/plain')
    if (!sourceRelativePath || sourceRelativePath === targetFolderNode.relative_path) return

    const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
    const currentBienFolder = currentBien?.chemin_dossier || ''
    let cleanTargetFolder = targetFolderNode.relative_path
    if (currentBienFolder && cleanTargetFolder.startsWith(currentBienFolder)) {
      cleanTargetFolder = cleanTargetFolder.replace(currentBienFolder, '').replace(/^\//, '')
    }

    try {
      const updatedPath = await moveFileToSubfolder(sourceRelativePath, cleanTargetFolder)
      addToast(`Fichier déplacé vers "${targetFolderNode.name}" !`)
      performScan(currentBienId, updatedPath)
    } catch (err) {
      addToast(`Erreur lors du déplacement : ${err}`, 'error')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')
  }

  // Panel global drag events
  const handlePanelDragEnter = (e) => {
    e.preventDefault()
    dragCounter.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOverPanel(true)
    }
  }

  const handlePanelDragLeave = (e) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current === 0) {
      setIsDraggingOverPanel(false)
    }
  }

  const handlePanelDragOver = (e) => {
    e.preventDefault()
  }

  const handlePanelDrop = (e) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDraggingOverPanel(false)
  }

  // Context menu
  const handleContextMenu = (e, file) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, file })
  }

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const countFilesRecursive = (node) => {
    if (!node.is_dir) return 1
    if (!node.children) return 0
    return node.children.reduce((sum, child) => sum + countFilesRecursive(child), 0)
  }

  const openAddForFolder = (folderRelPath) => {
    const currentBien = biens.find(b => b.id === parseInt(currentBienId))
    const currentBienFolder = currentBien?.chemin_dossier || ''
    let cleanFolder = folderRelPath
    if (currentBienFolder && cleanFolder.startsWith(currentBienFolder)) {
      cleanFolder = cleanFolder.replace(currentBienFolder, '').replace(/^\//, '')
    }
    setSourcePath('')
    setWebTitle('')
    setWebUrl('')
    setTargetSubfolder(cleanFolder || '01_ADMINISTRATIF')
    setAddDocType('file')
    setAddModal(true)
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>Documents & Fichiers</h2>
          <p>Explorateur de fichiers avec prévisualisation, liens web et glisser-déposer</p>
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
              setWebTitle('')
              setWebUrl('')
              setTargetSubfolder(availableFolders[0]?.value || '01_ADMINISTRATIF')
              setAddDocType('file')
              setAddModal(true)
            }}
            disabled={!currentBienId}
          >
            <Icon name="plus" size={14} /> Ajouter un document / Lien Web
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
                onClick={collapseAllFolders}
                title="Tout réduire"
                style={{ whiteSpace: 'nowrap', padding: '5px 8px', fontSize: 11 }}
              >
                📐 Réduire
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={expandAllFolders}
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
                  onSelectFile={handleSelectFile}
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
        <div
          className="explorer-preview-panel"
          onDragEnter={handlePanelDragEnter}
          onDragLeave={handlePanelDragLeave}
          onDragOver={handlePanelDragOver}
          onDrop={handlePanelDrop}
        >
          {isDraggingOverPanel && (
            <div className="drag-drop-overlay">
              <div style={{ fontSize: 44 }}>🖼️ 📥</div>
              <div style={{ fontSize: 16 }}>Déposez vos images ou documents ici</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Ils seront automatiquement enregistrés dans {selectedFile?.is_dir ? `"${selectedFile.name}"` : 'ce bien'}
              </div>
            </div>
          )}

          {selectedFile ? (
            selectedFile.is_dir ? (
              <FolderContentView
                node={selectedFile}
                onSelectFile={handleSelectFile}
                onOpenFile={handleOpenFile}
                onAddDocument={() => openAddForFolder(selectedFile.relative_path)}
                onGenerateExcel={() => {
                  const currentBien = biens.find(b => b.id === parseInt(currentBienId))
                  const cf = currentBien?.chemin_dossier || ''
                  let f = selectedFile.relative_path
                  if (cf && f.startsWith(cf)) f = f.replace(cf, '').replace(/^\//, '')
                  setExcelModal({ bienId: parseInt(currentBienId), targetSubfolder: f })
                }}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
                onFolderDrop={handleFolderDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              />
            ) : (
              <>
                <div className="preview-header">
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getFileIcon(selectedFile.name)} {selectedFile.name.replace(/\.url$/i, '')}
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
                      title={selectedFile.name.toLowerCase().endsWith('.url') ? "Ouvrir le lien web" : "Ouvrir dans l'application externe"}
                    >
                      {selectedFile.name.toLowerCase().endsWith('.url') ? '🌐 Ouvrir le lien' : '↗️ Ouvrir'}
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleOpenRename(selectedFile)}
                      title="Renommer le document"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => setConfirmDeleteFile(selectedFile)}
                      title="Supprimer du disque"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                <DocumentPreviewer
                  selectedFile={selectedFile}
                  previewData={previewData}
                  excelPreview={excelPreview}
                  loadingPreview={loadingPreview}
                  onOpenFile={handleOpenFile}
                  onOpenExternalUrl={openExternalUrl}
                  onToast={addToast}
                />
              </>
            )
          ) : (
            <DocumentPreviewer selectedFile={null} />
          )}
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
          <button className="context-menu-item" onClick={() => { handleOpenFile(ctxMenu.file.relative_path); setCtxMenu(null) }}>
            {ctxMenu.file.name.toLowerCase().endsWith('.url') ? '🌐 Ouvrir le lien web' : '↗️ Ouvrir avec le système'}
          </button>
          <button className="context-menu-item" onClick={() => handleOpenRename(ctxMenu.file)}>
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
          <button className="context-menu-item danger" onClick={() => { setConfirmDeleteFile(ctxMenu.file); setCtxMenu(null) }}>
            🗑️ Supprimer
          </button>
        </div>
      )}

      {/* Modale Ajout de Document / Lien Web */}
      <AddDocumentModal
        isOpen={addModal}
        docType={addDocType}
        setDocType={setAddDocType}
        targetSubfolder={targetSubfolder}
        setTargetSubfolder={setTargetSubfolder}
        availableFolders={availableFolders}
        sourcePath={sourcePath}
        onPickFile={handlePickSourceFile}
        webTitle={webTitle}
        setWebTitle={setWebTitle}
        webUrl={webUrl}
        setWebUrl={setWebUrl}
        onSubmit={handleAddSubmit}
        onClose={() => setAddModal(false)}
        uploading={uploading}
      />

      {/* Modale Renommer */}
      <RenameModal
        file={renameFile}
        newFilename={newFilename}
        setNewFilename={setNewFilename}
        onSubmit={handleRenameSubmit}
        onClose={() => setRenameFile(null)}
      />

      {/* Modale Déplacer */}
      <MoveModal
        file={moveFile}
        moveTarget={moveTarget}
        setMoveTarget={setMoveTarget}
        availableFolders={availableFolders}
        onSubmit={handleMoveSubmit}
        onClose={() => setMoveFile(null)}
      />

      {/* Modale Confirmation Suppression */}
      <DeleteConfirmModal
        file={confirmDeleteFile}
        onConfirm={handleDeleteFile}
        onClose={() => setConfirmDeleteFile(null)}
      />

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
