import React from 'react'
import { formatEuro, formatDate } from '../../lib/utils'

export default function LocataireStatsModal({
  locataire,
  stats,
  paiements,
  onOpenFile,
  onClose
}) {
  if (!locataire || !stats) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 850 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>📊 Bilan Financier & Historique — {locataire.prenom} {locataire.nom}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Synthèse complète des encaissements, ponctualité et état des cautionnements
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Grille des KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="dash-card" style={{ padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Total Encaissé</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
                {formatEuro(stats.total_encaisse)}
              </div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>sur {formatEuro(stats.total_du)} appelés</div>
            </div>

            <div
              className="dash-card"
              style={{
                padding: '12px 14px',
                background: stats.impayes_count > 0 ? '#FEF2F2' : '#F8FAFC',
                border: stats.impayes_count > 0 ? '1px solid #FECACA' : '1px solid var(--border-color)'
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: stats.impayes_count > 0 ? '#991B1B' : 'var(--text-muted)',
                  textTransform: 'uppercase'
                }}
              >
                Reste Dû / Impayés
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: stats.impayes_count > 0 ? '#DC2626' : 'var(--text-primary)',
                  marginTop: 4
                }}
              >
                {formatEuro(stats.total_du - stats.total_encaisse)}
              </div>
              <div style={{ fontSize: 11, color: stats.impayes_count > 0 ? '#B91C1C' : 'var(--text-muted)', marginTop: 2 }}>
                {stats.impayes_count} échéance(s) en retard
              </div>
            </div>

            <div className="dash-card" style={{ padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>Régularité %</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1D4ED8', marginTop: 4 }}>
                {stats.taux_regularite}%
              </div>
              <div style={{ fontSize: 11, color: '#1E40AF', marginTop: 2 }}>taux d'échéances réglées à temps</div>
            </div>

            <div className="dash-card" style={{ padding: '12px 14px', background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Dépôt de Garantie</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#B45309', marginTop: 4 }}>
                {formatEuro(stats.total_depot_garantie)}
              </div>
              <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                Statut : {stats.statut_caution_resume}
              </div>
            </div>
          </div>

          {/* Tableau de l'historique des paiements */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700 }}>
              📋 Historique des Loyers & Règlements ({paiements.length})
            </h4>
            {paiements.length === 0 ? (
              <div className="alert alert-info" style={{ fontSize: 12 }}>
                Aucun règlement enregistré pour ce locataire.
              </div>
            ) : (
              <div className="table-wrapper" style={{ maxHeight: 280, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date prévue</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Méthode</th>
                      <th>Quittance / Justificatif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paiements.map(p => (
                      <tr key={p.id}>
                        <td className="fw-600">{formatDate(p.date_prevue)}</td>
                        <td>{formatEuro(p.montant)}</td>
                        <td>
                          <span className={`badge ${p.statut === 'paye' ? 'badge-success' : 'badge-danger'}`}>
                            {p.statut === 'paye' ? 'Payé' : 'Impayé / En retard'}
                          </span>
                        </td>
                        <td>{p.methode || 'virement'}</td>
                        <td>
                          {p.fichier_quittance ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() => onOpenFile(p.fichier_quittance)}
                            >
                              📄 Ouvrir justificatif
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
