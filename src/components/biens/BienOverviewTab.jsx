import React from 'react'
import { formatDate, formatEuro } from '../../lib/utils'

export default function BienOverviewTab({ bien, onEdit }) {
  if (!bien) return null

  return (
    <div className="bien-overview-tab">
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>📍 Informations générales</h3>
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>
            ✏️ Modifier le bien
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15 }}>
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Nom du bien</span>
            <div className="fw-600" style={{ fontSize: 15 }}>{bien.nom}</div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Type de bien</span>
            <div className="fw-600" style={{ fontSize: 15 }}>{bien.type_bien || '—'}</div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Surface</span>
            <div className="fw-600" style={{ fontSize: 15 }}>{bien.surface_m2 ? `${bien.surface_m2} m²` : '—'}</div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Statut</span>
            <div>
              <span className={`badge badge-${bien.statut === 'loue' ? 'success' : 'warning'}`}>
                {bien.statut === 'loue' ? 'En location' : bien.statut || 'Disponible'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Adresse</span>
            <div style={{ fontSize: 14 }}>{bien.adresse || '—'}</div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Date d'acquisition</span>
            <div style={{ fontSize: 14 }}>{bien.date_acquisition ? formatDate(bien.date_acquisition) : '—'}</div>
          </div>
        </div>

        {bien.notes && (
          <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid var(--border-color)' }}>
            <span className="text-muted" style={{ fontSize: 12 }}>Notes & Remarques</span>
            <div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{bien.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}
