import React from 'react'
import Icon from '../common/Icon'

const STEPS = [
  { id: 'etude', label: 'Terrain & Études', desc: 'Prospection, compromis et faisabilité' },
  { id: 'plans', label: 'Plans & Architecte', desc: 'Conception architecturale et permis' },
  { id: 'permis', label: 'Permis de Construire', desc: 'Dépôt et purge des recours' },
  { id: 'gros_oeuvre', label: 'Gros Œuvre / Démolition', desc: 'Fondations, maçonnerie, toiture' },
  { id: 'second_oeuvre', label: 'Second Œuvre & Réseaux', desc: 'Plomberie, électricité, cloisons' },
  { id: 'finitions', label: 'Finitions & Équipements', desc: 'Peinture, sols, cuisine, sanitaires' },
  { id: 'livraison', label: 'Réception & Livraison', desc: 'Levée des réserves et mise en exploitation' },
]

export default function ProjetTimeline({ currentStepIndex = 3, onStepClick }) {
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STEPS.map((s, idx) => {
          const isDone = idx < currentStepIndex
          const isCurrent = idx === currentStepIndex
          const isUpcoming = idx > currentStepIndex

          return (
            <div
              key={s.id}
              onClick={() => onStepClick && onStepClick(idx)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                padding: '10px 14px',
                borderRadius: 8,
                background: isCurrent ? 'rgba(37, 99, 235, 0.06)' : isDone ? '#ffffff' : '#f8fafc',
                border: isCurrent ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Indicateur d'étape */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isDone ? '#16a34a' : isCurrent ? '#2563eb' : '#e2e8f0',
                  color: isUpcoming ? '#94a3b8' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                {isDone ? <Icon name="check" size={15} color="#ffffff" /> : idx + 1}
              </div>

              {/* Contenu de l'étape */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isUpcoming ? '#64748b' : '#0f172a' }}>
                    {s.label}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: isDone ? 'rgba(22, 163, 74, 0.1)' : isCurrent ? 'rgba(37, 99, 235, 0.1)' : '#f1f5f9',
                      color: isDone ? '#16a34a' : isCurrent ? '#2563eb' : '#94a3b8',
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  >
                    {isDone ? 'Terminé' : isCurrent ? 'En cours' : 'À venir'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {s.desc}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
