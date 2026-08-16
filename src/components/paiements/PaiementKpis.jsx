import React from 'react'
import { formatEuro } from '../../lib/utils'

export default function PaiementKpis({ totalFiltered, totalPaye, countImpayes, totalCautionsRecues = 0, countCautionsEnAttente = 0 }) {
  return (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="card-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Total loyers prévus
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{formatEuro(totalFiltered)}</div>
      </div>

      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="card-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Loyers encaissés
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-success)', marginTop: 4 }}>{formatEuro(totalPaye)}</div>
      </div>

      <div className="card" style={{ padding: '14px 16px', borderColor: countImpayes > 0 ? '#ef4444' : undefined, background: countImpayes > 0 ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
        <div className="card-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: countImpayes > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
          Loyers Impayés / En retard
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: countImpayes > 0 ? 'var(--color-danger)' : 'var(--text-primary)', marginTop: 4 }}>
          {countImpayes} loyer{countImpayes > 1 ? 's' : ''}
        </div>
      </div>

      <div className="card" style={{ padding: '14px 16px', borderColor: countCautionsEnAttente > 0 ? '#f59e0b' : undefined, background: countCautionsEnAttente > 0 ? 'rgba(245, 158, 11, 0.04)' : undefined }}>
        <div className="card-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: countCautionsEnAttente > 0 ? '#b45309' : 'var(--text-muted)' }}>
          Cautions / Dépôts de garantie
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
          {formatEuro(totalCautionsRecues)}
        </div>
        {countCautionsEnAttente > 0 && (
          <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 2 }}>
            ⚠️ {countCautionsEnAttente} caution{countCautionsEnAttente > 1 ? 's' : ''} en attente
          </div>
        )}
      </div>
    </div>
  )
}
