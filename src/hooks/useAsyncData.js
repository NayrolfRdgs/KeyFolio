import { useState, useEffect, useCallback } from 'react'

/**
 * Hook générique pour le chargement asynchrone de données avec état de chargement et rechargement facile.
 * 
 * @param {Function} fetcherFn - Fonction async retournant les données
 * @param {Array} deps - Dépendances déclenchant la ré-exécution
 * @param {*} initialData - Valeur initiale des données
 */
export function useAsyncData(fetcherFn, deps = [], initialData = null) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherFn()
      setData(result)
      setLoading(false)
      return result
    } catch (err) {
      console.error('[useAsyncData] Fetch failed:', err)
      setError(err)
      setLoading(false)
      throw err
    }
  }, deps)

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  return { data, loading, error, reload, setData }
}

export default useAsyncData
