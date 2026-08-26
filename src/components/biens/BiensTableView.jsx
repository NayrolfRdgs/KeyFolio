import React from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'
import { getStatutColor } from './BiensMapView'

export default function BiensTableView({
  biens = [],
  selectedBienId,
  onSelectBien,
  onOpenWizard,
  onDeleteBien
}) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 16 }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Logement</th>
            <th>Localisation</th>
            <th>Type & Surface</th>
            <th>Valeur estimée</th>
            <th>Statut</th>
            <th>Avancement</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {biens.map(b => {
            const isSelected = b.id === selectedBienId
            const color = getStatutColor(b.statut)
            const isProjet = String(b.statut).toLowerCase() === 'projet'

            return (
              <tr
                key={b.id}
                onClick={() => onSelectBien(b)}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(37, 99, 235, 0.08)' : undefined,
                  transition: 'background 0.15s ease'
                }}
              >
                <td className="fw-600">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: isProjet ? 'rgba(37, 99, 235, 0.1)' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)',
                      flexShrink: 0
                    }}>
                      {isProjet ? (
                        <Icon name="hardhat" size={18} color="#2563eb" />
                      ) : (
                        <Icon name="house" size={18} color="#475569" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{b.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.type_bien || 'Appartement'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.adresse || '—'}</div>
                </td>
                <td>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {b.surface_m2 ? `${b.surface_m2} m²` : '—'}
                    {b.nb_pieces ? ` • ${b.nb_pieces} p.` : ''}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {b.valeur_estimee ? formatEuro(b.valeur_estimee) : '—'}
                  </div>
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: color.bg,
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: 6
                    }}
                  >
                    {color.label}
                  </span>
                </td>
                <td>
                  {isProjet ? (
                    <div style={{ width: 120 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                        <span>{b.phase_actuelle || 'En cours'}</span>
                        <span>{b.pourcentage_avancement || 0}%</span>
                      </div>
                      <div style={{ height: 6, width: '100%', background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${b.pourcentage_avancement || 0}%`, background: '#2563eb', borderRadius: 3 }} />
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectBien(b)
                      }}
                      title="Afficher les détails"
                    >
                      <Icon name="eye" size={14} />
                    </button>
                    {onDeleteBien && (
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteBien(e, b.id)
                        }}
                        title="Supprimer"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
