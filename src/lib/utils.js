import { useState, useCallback } from 'react'

export const SUBFOLDERS = [
  { id: '01_ADMINISTRATIF', label: '01. Administratif', icon: '📋' },
  { id: '02_DIAGNOSTICS_DDT', label: '02. Diagnostics (DDT)', icon: '🔍' },
  { id: '03_COPROPRIETE', label: '03. Copropriété', icon: '🏢' },
  { id: '04_FISCAL_FINANCIER', label: '04. Fiscal & Financier', icon: '💶' },
  { id: '05_TRAVAUX', label: '05. Travaux & Devis', icon: '🔨' },
  { id: '06_ENERGIE_CONTRATS', label: '06. Énergie & Contrats', icon: '⚡' },
  { id: '07_LOCATION', label: '07. Location (Baux)', icon: '🔑' },
  { id: '08_GESTION', label: '08. Gestion courante', icon: '📂' },
  { id: '09_VENTE', label: '09. Vente & Notaire', icon: '📜' },
  { id: '10_DIVERS', label: '10. Divers & Photos', icon: '📁' },
]

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 o'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// ─── useAsync : encapsule n'importe quelle fn async ──────────
export function useAsync(fn) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      return result
    } catch (err) {
      setError(err?.toString() || 'Erreur inconnue')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fn])

  return { execute, loading, error }
}

// ─── Format monétaire ─────────────────────────────────────────
export function formatEuro(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ─── Format date FR ──────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  } catch { return dateStr }
}

// ─── Today ISO ───────────────────────────────────────────────
export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ─── Statut loyer → badge class ──────────────────────────────
export function statutPaiementBadge(statut) {
  const map = {
    paye: 'badge-success',
    en_retard: 'badge-warning',
    impaye: 'badge-danger',
    partiel: 'badge-info',
  }
  return map[statut] || 'badge-muted'
}

// ─── Label statut loyer ──────────────────────────────────────
export function labelStatutPaiement(statut) {
  const map = {
    paye: 'Payé', en_retard: 'En retard', impaye: 'Impayé', partiel: 'Partiel'
  }
  return map[statut] || statut
}

export function labelStatutBail(statut) {
  const map = { actif: 'Actif', termine: 'Terminé', resilie: 'Résilié' }
  return map[statut] || statut
}

export function labelTypeBien(type) {
  const map = {
    location: 'Location', residence_principale: 'Résidence principale', secondaire: 'Secondaire'
  }
  return map[type] || type || '—'
}

export function labelPriorite(p) {
  const map = { urgent: 'Urgent', normal: 'Normal', faible: 'Faible' }
  return map[p] || p
}

export function prioriteBadge(p) {
  const map = { urgent: 'badge-danger', normal: 'badge-warning', faible: 'badge-muted' }
  return map[p] || 'badge-muted'
}

export function statutMaintenanceBadge(s) {
  const map = { ouvert: 'badge-danger', en_cours: 'badge-warning', resolu: 'badge-success' }
  return map[s] || 'badge-muted'
}
