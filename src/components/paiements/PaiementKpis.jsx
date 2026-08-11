import React from 'react'
import { formatEuro } from '../../lib/utils'

export default function PaiementKpis({ totalFiltered, totalPaye, countImpayes }) {
  return (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
      <div className="card">
        <div className="card-title">Total loyers prévus</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{formatEuro(totalFiltered)}</div>
      </div>
      <div className="card">
        <div className="card-title">Loyers encaissés</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-success)' }}>{formatEuro(totalPaye)}</div>
      </div>
      <div className="card" style={{ borderColor: countImpayes > 0 ? '#ef4444' : undefined }}>
        <div className="card-title">En attente / Impayés</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: countImpayes > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
          {countImpayes} loyer{countImpayes > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
