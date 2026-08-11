import { useState, useCallback } from 'react'
import { fetchEmails } from '../lib/db'

export function useMailbox(bienId) {
  const [emails, setEmails] = useState([])
  const [loadingMail, setLoadingMail] = useState(false)
  const [mailError, setMailError] = useState(null)

  const syncMail = useCallback(async () => {
    if (!bienId) return
    setLoadingMail(true)
    setMailError(null)
    try {
      const list = await fetchEmails(bienId)
      setEmails(list || [])
    } catch (err) {
      setMailError(err?.toString() || 'Erreur lors de la synchronisation e-mail')
    } finally {
      setLoadingMail(false)
    }
  }, [bienId])

  return { emails, loadingMail, mailError, syncMail }
}
