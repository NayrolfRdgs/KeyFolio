import { useState, useEffect, useRef } from 'react'

/**
 * Hook personnalisé pour générer et prévisualiser un PDF avec debounce et nettoyage automatique de l'URL Blob.
 * 
 * @param {Function} generateFn - Fonction async retournant { blobUrl, blob, base64, dataUri } ou un Uint8Array/Blob
 * @param {Array} deps - Dépendances déclenchant la régénération
 * @param {number} delayMs - Délai de debounce en ms (défaut: 250ms)
 */
export function usePdfPreview(generateFn, deps = [], delayMs = 250) {
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentBlobUrlRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(async () => {
      try {
        const result = await generateFn()
        let newUrl = null

        if (typeof result === 'string') {
          newUrl = result
        } else if (result?.blobUrl) {
          newUrl = result.blobUrl
        } else if (result?.dataUri) {
          newUrl = result.dataUri
        } else if (result instanceof Blob) {
          newUrl = URL.createObjectURL(result)
        } else if (result instanceof Uint8Array || result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'application/pdf' })
          newUrl = URL.createObjectURL(blob)
        }

        // Nettoyer l'ancienne URL blob si c'était un blob créé localement
        if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:') && currentBlobUrlRef.current !== newUrl) {
          try {
            URL.revokeObjectURL(currentBlobUrlRef.current)
          } catch {}
        }

        currentBlobUrlRef.current = newUrl
        setPdfUrl(newUrl)
        setLoading(false)
      } catch (err) {
        console.error('[usePdfPreview] Error generating PDF preview:', err)
        setError(err)
        setLoading(false)
      }
    }, delayMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, deps)

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(currentBlobUrlRef.current)
        } catch {}
      }
    }
  }, [])

  return { pdfUrl, loading, error }
}

export default usePdfPreview
