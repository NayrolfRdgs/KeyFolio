import { useState, useEffect, useCallback } from 'react'
import { getBiens, listBienFiles } from '../lib/db'

export function useBiens() {
  const [biens, setBiens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshBiens = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBiens()
      setBiens(data || [])
      setError(null)
    } catch (err) {
      setError(err?.toString() || 'Erreur lors du chargement des biens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshBiens()
  }, [refreshBiens])

  return { biens, loading, error, refreshBiens }
}

export function useBienFiles(bienId) {
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  const refreshFiles = useCallback(async () => {
    if (!bienId) return
    setLoadingFiles(true)
    try {
      const list = await listBienFiles(bienId)
      setFiles(list || [])
    } catch (err) {
      console.error('Erreur chargement fichiers bien:', err)
    } finally {
      setLoadingFiles(false)
    }
  }, [bienId])

  useEffect(() => {
    refreshFiles()
  }, [refreshFiles])

  return { files, loadingFiles, refreshFiles }
}
