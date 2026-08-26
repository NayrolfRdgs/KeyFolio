import React from 'react'
import Icon from '../common/Icon'
import StatusBadge from '../common/StatusBadge'
import { formatEuro, formatDate } from '../../lib/utils'

export default function ProjetCard({ projet, onSelect, onConvert }) {
  const avancement = projet.pourcentage_avancement || 0

  return (
    <div
      onClick={() => onSelect && onSelect(projet)}
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '16px 18px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      {/* En-tête de carte */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}
          >
            <Icon name="hardHat" size={18} color="#2563eb" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              {projet.nom}
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b' }}>
              {projet.adresse || 'Emplacement non défini'}
            </p>
          </div>
        </div>
        <StatusBadge status={projet.statut || 'travaux'} type="projet" size="sm" />
      </div>

      {/* Barre d'avancement */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>Avancement du chantier</span>
          <span style={{ fontWeight: 800, color: '#2563eb' }}>{avancement}%</span>
        </div>
        <div style={{ height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              width: `${avancement}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
              borderRadius: 99,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* Métriques clés */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          background: '#f8fafc',
          padding: '8px 10px',
          borderRadius: 8,
          fontSize: 11
        }}
      >
        <div>
          <span style={{ color: '#94a3b8', fontSize: 10 }}>BUDGET PRÉVU</span>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>{formatEuro(projet.budget_prevu)}</div>
        </div>
        <div>
          <span style={{ color: '#94a3b8', fontSize: 10 }}>LIVRAISON</span>
          <div style={{ fontWeight: 700, color: '#475569' }}>
            {projet.date_livraison_prevue ? formatDate(projet.date_livraison_prevue) : 'Non fixée'}
          </div>
        </div>
      </div>

      {/* Actions en bas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
          {projet.type_projet || 'Opération'}
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={(e) => { e.stopPropagation(); onSelect && onSelect(projet) }}
          style={{ fontSize: 11, padding: '4px 10px' }}
        >
          Ouvrir le projet →
        </button>
      </div>
    </div>
  )
}
