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
import { convertFileSrc } from '@tauri-apps/api/core'
import Icon from '../components/Icon'
import ExcelGeneratorModal from '../components/ExcelGeneratorModal'
import SpreadsheetViewer from '../components/SpreadsheetViewer'

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

  // Sauvegarder les dossiers dépliés dans localStorage pour persistance
  const saveExpandedPathsToStorage = useCallback((pathsSet, bienId) => {
    if (!bienId) return
    try {
      const arr = Array.from(pathsSet)
      localStorage.setItem(`lepuits_expanded_folders_${bienId}`, JSON.stringify(arr))
    } catch (e) {
      console.warn('Impossible de sauvegarder l\'état des dossiers', e)
    }
  }, [])

  // Clic spécifique sur la FLÈCHE (▶/▼) = Déplier/Réduire ce dossier sans fermer les autres
  const toggleExpand = useCallback((path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      if (currentBienId) {
        saveExpandedPathsToStorage(next, currentBienId)
      }
      return next
    })
  }, [currentBienId, saveExpandedPathsToStorage])

  // Tout réduire rapidement (raptisir tous les dossiers)
  const collapseAllFolders = useCallback(() => {
    const emptySet = new Set()
    setExpandedPaths(emptySet)
    if (currentBienId) {
      saveExpandedPathsToStorage(emptySet, currentBienId)
    }
    addToast('Tous les dossiers ont été réduits', 'info')
  }, [currentBienId, saveExpandedPathsToStorage, addToast])

  // Tout déplier rapidement
  const expandAllFolders = useCallback(() => {
    const allPaths = getAllFolderPaths(treeNodes)
    const newSet = new Set(allPaths)
    setExpandedPaths(newSet)
    if (currentBienId) {
      saveExpandedPathsToStorage(newSet, currentBienId)
    }
    addToast('Tous les dossiers ont été dépliés', 'info')
  }, [treeNodes, currentBienId, saveExpandedPathsToStorage, addToast])

  // Extraire récursivement la liste de tous les dossiers
  const getAllFolders = useCallback((nodes, currentBienFolder = '') => {
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
  }, [])

  const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
  const availableFolders = getAllFolders(treeNodes, currentBien?.chemin_dossier || '')

  // Scanner le répertoire du bien sélectionné et restaurer l'état persistant
  const performScan = useCallback(async (bienId) => {
    if (!bienId) return
    setLoading(true)
    setError(null)
    try {
      const nodes = await scanBienDirectory(parseInt(bienId))
      setTreeNodes(nodes)

      // 1. Restaurer l'état ouvert/fermé des dossiers sauvegardé dans localStorage
      const savedExpandedJson = localStorage.getItem(`lepuits_expanded_folders_${bienId}`)
      if (savedExpandedJson) {
        try {
          const savedArray = JSON.parse(savedExpandedJson)
          setExpandedPaths(new Set(savedArray))
        } catch (e) {
          console.warn('Erreur lecture persistance dossiers', e)
        }
      } else {
        // Si aucune sauvegarde, déplier par défaut le 1er niveau
        const defaultExpanded = new Set()
        nodes.forEach((n) => {
          if (n.is_dir) defaultExpanded.add(n.relative_path)
        })
        setExpandedPaths(defaultExpanded)
        saveExpandedPathsToStorage(defaultExpanded, bienId)
      }

      // 2. Restaurer la sélection précédente
      const savedSelectedPath = localStorage.getItem(`lepuits_selected_path_${bienId}`)
      if (savedSelectedPath) {
        const found = findNodeByPath(nodes, savedSelectedPath)
        if (found) {
          setSelectedFile(found)
        }
      }
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }, [saveExpandedPathsToStorage])

  useEffect(() => {
    if (currentBienId) {
      setSelectedFile(null)
      setPreviewData(null)
      setExcelPreview(null)
      performScan(currentBienId)
    }
  }, [currentBienId, performScan])

  // ─── Auto-sélection depuis initialFilePath (navigation globale) ─────
  useEffect(() => {
    if (!initialFilePath || !treeNodes || treeNodes.length === 0) return

    // Trouver le noeud correspondant au filePath dans l'arborescence
    const foundNode = findNodeByPath(treeNodes, initialFilePath)
    if (foundNode) {
      setSelectedFile(foundNode)

      // Déplier tous les dossiers parents pour que le fichier soit visible
      const parts = initialFilePath.split('/')
      const parentPaths = []
      for (let i = 1; i < parts.length; i++) {
        parentPaths.push(parts.slice(0, i).join('/'))
      }
      setExpandedPaths(prev => {
        const next = new Set(prev)
        parentPaths.forEach(p => next.add(p))
        return next
      })
    }
  }, [initialFilePath, treeNodes])

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

  // Sélection de fichier avec persistance dans localStorage
  const handleSelectFile = useCallback((node) => {
    setSelectedFile(node)
    if (currentBienId && node?.relative_path) {
      localStorage.setItem(`lepuits_selected_path_${currentBienId}`, node.relative_path)
    }
  }, [currentBienId])

  // Cliquer sur le NOM/LIGNE d'un dossier : Ouvre ce dossier et RÉDUIT LES AUTRES (mode accordéon)
  const handleSelectFolder = useCallback((node) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      const isAlreadyExpanded = next.has(node.relative_path)

      if (isAlreadyExpanded && selectedFile?.relative_path === node.relative_path) {
        // Clic répété sur le dossier sélectionné ouvert => le réduire ("raptisir")
        next.delete(node.relative_path)
      } else {
        // Conserver les parents du dossier sélectionné et fermer les autres branches (accordéon)
        const getParentPaths = (targetRelPath) => {
          const parts = targetRelPath.split('/')
          const parents = []
          for (let i = 1; i <= parts.length; i++) {
            parents.push(parts.slice(0, i).join('/'))
          }
          return parents
        }

        const keepPaths = new Set(getParentPaths(node.relative_path))
        next.clear()
        keepPaths.forEach(p => next.add(p))
      }

      if (currentBienId) {
        saveExpandedPathsToStorage(next, currentBienId)
      }
      return next
    })

    setSelectedFile(node)
    if (currentBienId && node?.relative_path) {
      localStorage.setItem(`lepuits_selected_path_${currentBienId}`, node.relative_path)
    }
  }, [selectedFile, currentBienId, saveExpandedPathsToStorage])

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

  // Soumission modale (Fichier local OU Lien Web)
  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!currentBienId) return
    setUploading(true)
    setError(null)
    try {
      const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
      let subfolderPath = targetSubfolder
      if (currentBien?.chemin_dossier && subfolderPath.startsWith(currentBien.chemin_dossier)) {
        subfolderPath = subfolderPath.replace(currentBien.chemin_dossier, '').replace(/^\//, '')
      }
      if (!subfolderPath) subfolderPath = '01_ADMINISTRATIF'

      if (addDocType === 'file') {
        if (!sourcePath) return
        await copyFileToBien({
          bienId: parseInt(currentBienId),
          subfolder: subfolderPath,
          sourcePath,
        })
        addToast('Document ajouté avec succès')
      } else {
        // Mode Lien Web (URL)
        if (!webUrl || !webTitle) return
        let finalUrl = webUrl.trim()
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = `https://${finalUrl}`
        }

        const cleanTitle = webTitle.trim().replace(/[/\\?%*:|"<>]/g, '_')
        const filename = `${cleanTitle}.url`
        const shortcutString = `[InternetShortcut]\r\nURL=${finalUrl}\r\n`

        // Convertir la chaîne en base64 pour saveEmailAttachmentToBien
        const base64Data = btoa(unescape(encodeURIComponent(shortcutString)))

        await saveEmailAttachmentToBien({
          bienId: parseInt(currentBienId),
          subfolder: subfolderPath,
          filename,
          base64Data,
        })
        addToast(`Lien Web "${webTitle}" ajouté avec succès`, 'success')
      }

      setAddModal(false)
      setSourcePath('')
      setWebTitle('')
      setWebUrl('')
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

  // Suppression d'un fichier du disque avec confirmation
  const handleDeleteFile = useCallback(async (file) => {
    if (!file) return
    try {
      await deleteFileByPath(file.relative_path)
      if (selectedFile?.relative_path === file.relative_path) {
        setSelectedFile(null)
        setPreviewData(null)
      }
      addToast(`"${file.name}" supprimé du disque`, 'info')
      await performScan(currentBienId)
    } catch (err) {
      alert(`Erreur lors de la suppression: ${err}`)
    }
  }, [selectedFile, currentBienId, addToast, performScan])

  // Touche 'Delete' / 'Suppr' du clavier pour déclencher la modale de validation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (['input', 'textarea', 'select'].includes(activeTag)) return

      if ((e.key === 'Delete' || e.key === 'Del') && selectedFile && !selectedFile.is_dir) {
        e.preventDefault()
        setConfirmDeleteFile(selectedFile)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile])

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

  // Déplacer un fichier via la modale
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

  // ─── Importation par Glisser-Déposer Ciblée (Paths OS Windows) ────────────
  const handlePathsDrop = useCallback(async (pathsArray, targetFolderNode = null) => {
    if (!pathsArray || pathsArray.length === 0 || !currentBienId) return

    const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
    const bienFolder = currentBien?.chemin_dossier || ''

    let targetRelPath = targetFolderNode
      ? targetFolderNode.relative_path
      : selectedFile?.is_dir
      ? selectedFile.relative_path
      : ''

    let subfolder = targetRelPath
    if (bienFolder && subfolder.startsWith(bienFolder)) {
      subfolder = subfolder.replace(bienFolder, '').replace(/^\//, '')
    }
    if (!subfolder || subfolder.trim() === '') {
      subfolder = availableFolders[0]?.value || '01_ADMINISTRATIF'
    }

    let successCount = 0
    let errorCount = 0
    let lastAddedName = ''

    for (const filePath of pathsArray) {
      try {
        if (filePath && filePath.length > 0) {
          await copyFileToBien({
            bienId: parseInt(currentBienId),
            subfolder,
            sourcePath: filePath,
          })
          successCount++
          const parts = filePath.split(/[/\\]/)
          lastAddedName = parts[parts.length - 1] || filePath
        }
      } catch (err) {
        console.error('Erreur import fichier path:', filePath, err)
        errorCount++
      }
    }

    if (successCount > 0) {
      const isImg = (name) => /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name)
      const folderDisplayName = targetFolderNode ? targetFolderNode.name : subfolder
      const fileTypeLabel = isImg(lastAddedName) ? 'image(s)' : 'fichier(s)'

      addToast(
        `${successCount} ${fileTypeLabel} ajouté(e)s avec succès dans "${folderDisplayName}"`,
        'success'
      )

      if (targetRelPath) {
        setExpandedPaths((prev) => {
          const next = new Set(prev)
          next.add(targetRelPath)
          saveExpandedPathsToStorage(next, currentBienId)
          return next
        })
      }
      await performScan(currentBienId)
    }

    if (errorCount > 0) {
      addToast(`Erreur lors de l'importation de ${errorCount} fichier(s)`, 'error')
    }
  }, [currentBienId, biens, selectedFile, availableFolders, addToast, saveExpandedPathsToStorage, performScan])

  // ─── Écouter les événements de Glisser-Déposer Natifs Tauri v2 (OS Explorer) ───
  useEffect(() => {
    let unlisten = null
    let isMounted = true

    const setupTauriDragDrop = async () => {
      try {
        const webview = getCurrentWebview()
        if (webview && typeof webview.onDragDropEvent === 'function') {
          unlisten = await webview.onDragDropEvent((event) => {
            if (!isMounted) return
            const { type } = event.payload

            if (type === 'enter' || type === 'over') {
              setIsDraggingOverPanel(true)
            } else if (type === 'leave') {
              setIsDraggingOverPanel(false)
            } else if (type === 'drop') {
              setIsDraggingOverPanel(false)
              const droppedPaths = event.payload.paths || []
              if (droppedPaths.length > 0) {
                const targetFolder = selectedFile?.is_dir ? selectedFile : null
                handlePathsDrop(droppedPaths, targetFolder)
              }
            }
          })
        }
      } catch (err) {
        console.warn('Tauri dragDropEvent listener non disponible', err)
      }
    }

    setupTauriDragDrop()

    return () => {
      isMounted = false
      if (typeof unlisten === 'function') {
        unlisten()
      }
    }
  }, [handlePathsDrop, selectedFile])

  // ─── Importation par Glisser-Déposer (Alternative HTML5) ─────────────────
  const handleFilesDrop = async (filesList, targetFolderNode = null) => {
    if (!filesList || filesList.length === 0 || !currentBienId) return

    const currentBien = biens.find((b) => b.id === parseInt(currentBienId))
    const bienFolder = currentBien?.chemin_dossier || ''

    let targetRelPath = targetFolderNode ? targetFolderNode.relative_path : (selectedFile?.is_dir ? selectedFile.relative_path : '')

    let subfolder = targetRelPath
    if (bienFolder && subfolder.startsWith(bienFolder)) {
      subfolder = subfolder.replace(bienFolder, '').replace(/^\//, '')
    }
    if (!subfolder || subfolder.trim() === '') {
      subfolder = availableFolders[0]?.value || '01_ADMINISTRATIF'
    }

    let successCount = 0
    let errorCount = 0
    let lastAddedName = ''

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i]
      const filePath = file.path || file.webkitRelativePath

      try {
        if (filePath && filePath.length > 0) {
          await copyFileToBien({
            bienId: parseInt(currentBienId),
            subfolder,
            sourcePath: filePath,
          })
          successCount++
          lastAddedName = file.name
        } else {
          // Alternative FileReader en base64 (pour WebView ou navigateurs)
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const res = reader.result
              const base64 = res.substring(res.indexOf(',') + 1)
              resolve(base64)
            }
            reader.onerror = (e) => reject(e)
            reader.readAsDataURL(file)
          })

          await saveEmailAttachmentToBien({
            bienId: parseInt(currentBienId),
            subfolder,
            filename: file.name,
            base64Data,
          })
          successCount++
          lastAddedName = file.name
        }
      } catch (err) {
        console.error('Erreur import fichier glissé-déposé:', file.name, err)
        errorCount++
      }
    }

    if (successCount > 0) {
      const isImg = (name) => /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name)
      const folderDisplayName = targetFolderNode ? targetFolderNode.name : subfolder
      const fileTypeLabel = isImg(lastAddedName) ? 'image(s)' : 'fichier(s)'

      addToast(
        `${successCount} ${fileTypeLabel} ajouté(e)s avec succès dans "${folderDisplayName}"`,
        'success'
      )

      if (targetRelPath) {
        setExpandedPaths((prev) => {
          const next = new Set(prev)
          next.add(targetRelPath)
          saveExpandedPathsToStorage(next, currentBienId)
          return next
        })
      }
      await performScan(currentBienId)
    }

    if (errorCount > 0) {
      addToast(`Erreur lors de l'import de ${errorCount} fichier(s)`, 'error')
    }
  }

  // Drag & Drop interne entre dossiers dans la partie de gauche ou droite
  const handleDragStart = (e, fileOrNode) => {
    e.stopPropagation()
    e.dataTransfer.setData('application/json', JSON.stringify(fileOrNode))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleFolderDrop = async (e, targetFolderNode) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')

    // 1. Drop depuis l'explorateur de fichiers externe (OS)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesDrop(e.dataTransfer.files, targetFolderNode)
      return
    }

    // 2. Drop interne (déplacement de fichier/dossier entre dossiers)
    try {
      const rawData = e.dataTransfer.getData('application/json')
      if (rawData) {
        const itemData = JSON.parse(rawData)
        if (itemData && itemData.relative_path && currentBienId) {
          const currentBien = biens.find(b => b.id === parseInt(currentBienId))
          let targetFolder = targetFolderNode.relative_path
          if (currentBien?.chemin_dossier && targetFolder.startsWith(currentBien.chemin_dossier)) {
            targetFolder = targetFolder.replace(currentBien.chemin_dossier, '').replace(/^\//, '')
          }

          if (itemData.relative_path === targetFolderNode.relative_path) {
            return // Déplacé sur lui-même
          }

          await moveFileToSubfolder(parseInt(currentBienId), itemData.relative_path, targetFolder)
          addToast(`"${itemData.name}" déplacé vers ${targetFolderNode.name}`, 'success')

          // Déplier le dossier cible pour afficher l'élément déplacé
          setExpandedPaths((prev) => {
            const next = new Set(prev)
            next.add(targetFolderNode.relative_path)
            saveExpandedPathsToStorage(next, currentBienId)
            return next
          })

          await performScan(currentBienId)
        }
      }
    } catch (err) {
      console.warn('Drop error', err)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')
  }

  // Drag overlay pour le panneau principal droite
  const handlePanelDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      setIsDraggingOverPanel(true)
    }
  }

  const handlePanelDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDraggingOverPanel(false)
    }
  }

  const handlePanelDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handlePanelDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDraggingOverPanel(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const targetFolder = selectedFile?.is_dir ? selectedFile : null
      await handleFilesDrop(e.dataTransfer.files, targetFolder)
    }
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
    setWebTitle('')
    setWebUrl('')
    setTargetSubfolder(cleanFolder || '01_ADMINISTRATIF')
    setAddDocType('file')
    setAddModal(true)
  }

  // Extraire l'URL à partir du contenu d'un fichier .url
  const extractUrlFromContent = (text) => {
    if (!text) return ''
    const match = text.match(/URL=(https?:\/\/[^\s\r\n]+)/i)
    return match ? match[1] : ''
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
                title="Tout réduire (raptisir tous les dossiers)"
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

        {/* Panneau principal droite (Zone de dropzone d'images et prévisualisation) */}
        <div
          className="explorer-preview-panel"
          onDragEnter={handlePanelDragEnter}
          onDragLeave={handlePanelDragLeave}
          onDragOver={handlePanelDragOver}
          onDrop={handlePanelDrop}
        >
          {/* Overlay dropzone d'images et fichiers */}
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
              /* ── Vue contenu d'un dossier ── */
              <FolderContentView
                node={selectedFile}
                onSelectFile={handleSelectFile}
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
                onFolderDrop={handleFolderDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              />
            ) : (
              /* ── Prévisualisation fichier ── */
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
                      title={selectedFile.name.toLowerCase().endsWith('.url') ? "Ouvrir le lien web dans le navigateur" : "Ouvrir dans l'application externe"}
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
                      title="Supprimer du disque (ou touche Suppr / Delete)"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                <div className="preview-body">
                  {loadingPreview ? (
                    <div style={{ color: 'var(--text-muted)' }}>Chargement de l'aperçu...</div>
                  ) : selectedFile.name.toLowerCase().endsWith('.url') ? (
                    /* ── Aperçu Carte Lien Web (URL) ── */
                    (() => {
                      const urlFound = extractUrlFromContent(previewData?.text_content)
                      return (
                        <div style={{
                          padding: 32,
                          textAlign: 'center',
                          background: 'var(--color-surface-2)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border)',
                          margin: '24px auto',
                          maxWidth: 600,
                          boxShadow: 'var(--shadow)'
                        }}>
                          <div style={{ fontSize: 56, marginBottom: 12 }}>🌐</div>
                          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                            {selectedFile.name.replace(/\.url$/i, '')}
                          </h3>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                            Raccourci de lien Web enregistré
                          </p>

                          {urlFound ? (
                            <>
                              <div style={{
                                background: 'var(--color-surface)',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius)',
                                fontFamily: 'monospace',
                                fontSize: 13,
                                wordBreak: 'break-all',
                                marginBottom: 24,
                                color: 'var(--color-accent)',
                                border: '1px solid var(--color-border)',
                                textAlign: 'left'
                              }}>
                                🔗 {urlFound}
                              </div>
                              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => openExternalUrl(urlFound)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                  🌐 Ouvrir dans le navigateur
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    navigator.clipboard.writeText(urlFound)
                                    addToast('Adresse Web (URL) copiée !', 'info')
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                  📋 Copier l'URL
                                </button>
                              </div>
                            </>
                          ) : (
                            <button className="btn btn-primary" onClick={() => handleOpenFile(selectedFile.relative_path)}>
                              🌐 Ouvrir le lien Web
                            </button>
                          )}
                        </div>
                      )
                    })()
                  ) : previewData ? (
                    <>
                      {previewData.mime_type === 'application/pdf' && (
                        <iframe
                          src={convertFileSrc(selectedFile.absolute_path || selectedFile.relative_path)}
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
                    <SpreadsheetViewer
                      filePath={selectedFile.relative_path}
                      fileName={selectedFile.name}
                      onOpenExternal={() => handleOpenFile(selectedFile.relative_path)}
                      onToast={addToast}
                    />
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
                <div className="empty-state-icon">🖼️ 🌐 📂</div>
                <h3>Sélectionnez un dossier, fichier ou lien web</h3>
                <p>Glissez-déposez des images, ajoutez des liens web ou naviguez dans les dossiers.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
          <button className="context-menu-item" onClick={() => { handleOpenFile(ctxMenu.file.relative_path); setCtxMenu(null) }}>
            {ctxMenu.file.name.toLowerCase().endsWith('.url') ? '🌐 Ouvrir le lien web' : '↗️ Ouvrir avec le système'}
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
          <button className="context-menu-item danger" onClick={() => { setConfirmDeleteFile(ctxMenu.file); setCtxMenu(null) }}>
            🗑️ Supprimer
          </button>
        </div>
      )}

      {/* Modale Ajout de Document / Lien Web */}
      {addModal && (
        <div className="modal-backdrop" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajouter un document au bien</h3>
              <button className="modal-close" onClick={() => setAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              {/* Selecteur d'Onglets: Fichier local vs Lien Web */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--color-surface-2)', padding: 4, borderRadius: 'var(--radius)' }}>
                <button
                  type="button"
                  className={`btn ${addDocType === 'file' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
                  onClick={() => setAddDocType('file')}
                >
                  📄 Fichier local
                </button>
                <button
                  type="button"
                  className={`btn ${addDocType === 'link' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
                  onClick={() => setAddDocType('link')}
                >
                  🌐 Lien Web (URL)
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Dossier de destination *</label>
                <select className="form-control" value={targetSubfolder} onChange={(e) => setTargetSubfolder(e.target.value)}>
                  {availableFolders.map((f) => (
                    <option key={f.value} value={f.value}>📁 {f.label}</option>
                  ))}
                </select>
              </div>

              {addDocType === 'file' ? (
                /* Mode Fichier Local */
                <div className="form-group">
                  <label className="form-label">Fichier source *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-control" readOnly required value={sourcePath} placeholder="Sélectionnez un fichier..." />
                    <button type="button" className="btn btn-secondary" onClick={handlePickFile}>Parcourir...</button>
                  </div>
                </div>
              ) : (
                /* Mode Lien Web */
                <>
                  <div className="form-group">
                    <label className="form-label">Titre du lien (Nom du document) *</label>
                    <input
                      className="form-control"
                      required
                      value={webTitle}
                      onChange={(e) => setWebTitle(e.target.value)}
                      placeholder="ex: Espace Client EDF, Contrat Notaire..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Adresse Web (URL) *</label>
                    <input
                      type="url"
                      className="form-control"
                      required
                      value={webUrl}
                      onChange={(e) => setWebUrl(e.target.value)}
                      placeholder="https://www.exemple.com/document.pdf"
                    />
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={(addDocType === 'file' ? !sourcePath : (!webUrl || !webTitle)) || uploading}>
                  {uploading ? 'Enregistrement...' : addDocDocTypeLabel(addDocType)}
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

      {/* Modale Validation de Suppression de Fichier */}
      {confirmDeleteFile && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteFile(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
                <Icon name="trash" size={18} /> Suppression de fichier
              </h3>
              <button className="modal-close" onClick={() => setConfirmDeleteFile(null)}>×</button>
            </div>
            <div style={{ padding: '16px 0' }}>
              <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-primary)' }}>
                Voulez-vous vraiment supprimer définitivement ce fichier du disque dur ?
              </p>
              <div style={{
                background: 'var(--color-surface-2)',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 13,
                fontWeight: 600,
              }}>
                <span style={{ fontSize: 22 }}>{getFileIcon(confirmDeleteFile.name)}</span>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <div style={{ wordBreak: 'break-all' }}>{confirmDeleteFile.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {formatBytes(confirmDeleteFile.size_bytes)} • {confirmDeleteFile.relative_path}
                  </div>
                </div>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-danger)', fontWeight: 500 }}>
                ⚠️ Cette action supprimera physiquement le fichier sur votre ordinateur.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteFile(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  const targetFile = confirmDeleteFile
                  setConfirmDeleteFile(null)
                  await handleDeleteFile(targetFile)
                }}
              >
                🗑️ Supprimer définitivement
              </button>
            </div>
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

function addDocDocTypeLabel(type) {
  return type === 'file' ? 'Copier le fichier' : 'Enregistrer le lien Web'
}

// ─── Vue contenu d'un dossier (panneau de droite) ────────────────────────────
function FolderContentView({
  node, onSelectFile, onOpenFile, onAddDocument, onGenerateExcel, onContextMenu, onDragStart,
  onFolderDrop, onDragOver, onDragLeave
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
          <div className="folder-label">
            <span
              style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px', userSelect: 'none' }}
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.relative_path)
              }}
              title={isExpanded ? 'Réduire ce dossier sans fermer les autres' : 'Déplier ce dossier sans fermer les autres'}
            >
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
      style={{ marginLeft: depth > 0 ? 12 : 0, cursor: 'grab' }}
      draggable="true"
      onDragStart={(e) => onDragStart(e, node)}
      onClick={() => onSelectFile(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      <div className="file-name-text">
        {getFileIcon(node.name)} {node.name.replace(/\.url$/i, '')}
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
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) return '🖼️'
  if (['doc', 'docx', 'txt', 'odt', 'md'].includes(ext)) return '📝'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  if (['url', 'html', 'htm', 'link', 'website'].includes(ext)) return '🌐'
  return '📁'
}
