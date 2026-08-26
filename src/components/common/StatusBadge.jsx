import React from 'react'
import Icon from './Icon'

export default function StatusBadge({
  status,
  type = 'bien', // 'bien' | 'projet' | 'pret' | 'maintenance' | 'paiement' | 'bail'
  label = null,
  size = 'md', // 'sm' | 'md' | 'lg'
  icon = true,
  className = ''
}) {
  const normalized = String(status || '').toLowerCase().trim()

  const config = getStatusConfig(normalized, type)
  const displayLabel = label || config.label

  const sizeStyles = {
    sm: { padding: '2px 6px', fontSize: 10, gap: 4 },
    md: { padding: '3px 8px', fontSize: 11, gap: 5 },
    lg: { padding: '5px 12px', fontSize: 12, gap: 6 },
  }[size] || { padding: '3px 8px', fontSize: 11, gap: 5 }

  return (
    <span
      className={`app-status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border || 'transparent'}`,
        borderRadius: 999,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        userSelect: 'none',
        ...sizeStyles
      }}
    >
      {icon && config.icon && (
        <Icon name={config.icon} size={size === 'sm' ? 11 : size === 'lg' ? 14 : 12} color={config.color} />
      )}
      <span>{displayLabel}</span>
    </span>
  )
}

function getStatusConfig(st, type) {
  // Projets
  if (type === 'projet') {
    if (st === 'etude') return { label: 'Étude', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.25)', icon: 'search' }
    if (st === 'acquisition') return { label: 'Acquisition', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', border: 'rgba(14, 165, 233, 0.25)', icon: 'fileSignature' }
    if (st === 'permis') return { label: 'Permis / Plans', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.25)', icon: 'draftingCompass' }
    if (st === 'travaux' || st === 'chantier') return { label: 'Chantier en cours', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', icon: 'hardhat' }
    if (st === 'finitions') return { label: 'Finitions', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', icon: 'sparkles' }
    if (st === 'termine' || st === 'livre') return { label: 'Livré / Terminé', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', border: 'rgba(22, 163, 74, 0.25)', icon: 'checkCircle' }
    if (st === 'annule') return { label: 'Annulé', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', icon: 'close' }
    return { label: 'Projet', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.25)', icon: 'hardhat' }
  }

  // Biens
  if (st === 'actif' || st === 'loue' || st === 'occupe') {
    return { label: 'Actif / Loué', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', border: 'rgba(22, 163, 74, 0.25)', icon: 'checkCircle' }
  }
  if (st === 'projet') {
    return { label: 'Projet', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.25)', icon: 'hardhat' }
  }
  if (st === 'vacant') {
    return { label: 'Vacant', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', icon: 'clock' }
  }
  if (st === 'en_travaux' || st === 'travaux') {
    return { label: 'En travaux', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.25)', icon: 'wrench' }
  }
  if (st === 'en_vente' || st === 'a_vendre') {
    return { label: 'À vendre', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', icon: 'wallet' }
  }
  if (st === 'inactif' || st === 'vendu') {
    return { label: 'Inactif', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.25)', icon: 'circleSlash' }
  }

  // Maintenance
  if (st === 'urgent') return { label: 'Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', icon: 'flame' }
  if (st === 'a_faire') return { label: 'À faire', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', icon: 'clock' }
  if (st === 'resolu' || st === 'termine') return { label: 'Terminé', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', border: 'rgba(22, 163, 74, 0.25)', icon: 'checkCircle' }

  // Défaut
  return { label: st || 'Statut', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.25)', icon: 'info' }
}
