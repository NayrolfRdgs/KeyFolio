import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'keyfolio_bailleur_profile'

const DEFAULT_PROFILE = {
  nom: 'Bailleur / Propriétaire',
  adresse: '',
  ville: '',
  codePostal: '',
  telephone: '',
  email: '',
  iban: 'FR76 3000 4000 5000 6000 7000 890',
  bic: 'BNPAFRPP',
  siret: ''
}

export function useBailleurProfile() {
  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      return cached ? { ...DEFAULT_PROFILE, ...JSON.parse(cached) } : DEFAULT_PROFILE
    } catch {
      return DEFAULT_PROFILE
    }
  })

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(e.newValue) })
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const updateProfile = useCallback((updates) => {
    setProfile(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch (e) {
        console.error('Failed to save bailleur profile:', e)
      }
      return next
    })
  }, [])

  return { profile, updateProfile }
}

export default useBailleurProfile
