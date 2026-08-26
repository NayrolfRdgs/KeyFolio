import React from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, statutPaiementBadge } from '../../lib/utils'
import { DetailedFinanceDashboard } from './FinanceCharts'

function FinKpi({ label, value, sub, color, alert }) {
  return (
    <div className={`fin-kpi-card ${alert ? 'alert-card' : ''}`} style={{ borderTopColor: color }}>
      <div className="fin-kpi-label">{label}</div>
      <div className="fin-kpi-val" style={{ color, fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div className="fin-kpi-sub">{sub}</div>
    </div>
  )
}

export default function BienFinanceTab({
  bien,
  champsMap,
  paiements,
  depenses,
  totalLoyer,
  loyerMensuel,
  charges,
  encaisseM,
  payesMois,
  depensesMois,
  bilanNet,
  onOpenNewPaiement,
  onMarkPaid,
  onDeletePaiement
}) {
  return (
    <div>
      {/* Graphiques Interactifs & Analytique Financière */}
      <DetailedFinanceDashboard
        bien={bien}
        champsMap={champsMap}
        paiements={paiements}
        depenses={depenses}
      />

      <div className="card" style={{ padding: 20 }}>
        <div className="finances-kpi-grid" style={{ marginBottom: 20 }}>
          <FinKpi
            label="Loyer mensuel"
            value={formatEuro(totalLoyer)}
            sub={`${formatEuro(loyerMensuel)} + ${formatEuro(charges)} charges`}
            color="#6366f1"
          />
          <FinKpi
            label="Encaissé ce mois"
            value={formatEuro(encaisseM)}
            sub={`${payesMois.length} paiement(s)`}
            color="#22c55e"
          />
          <FinKpi
            label="Dépenses ce mois"
            value={`-${formatEuro(depensesMois)}`}
            sub="charges du bien"
            color="#f59e0b"
          />
          <FinKpi
            label="Bilan net"
            value={formatEuro(bilanNet)}
            sub="encaissé - dépenses"
            color={bilanNet >= 0 ? '#22c55e' : '#ef4444'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Loyers & Paiements</h4>
          <button className="btn btn-primary btn-sm" onClick={onOpenNewPaiement}>
            <Icon name="plus" size={13} /> Saisir un paiement
          </button>
        </div>

        {paiements.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-state-icon"><Icon name="creditCard" size={40} color="#94a3b8" /></div>
            <p>Aucun paiement enregistré pour ce logement</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date prévue</th>
                  <th>Date réelle</th>
                  <th>Montant</th>
                  <th>Méthode</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paiements.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date_prevue)}</td>
                    <td className="text-muted">{p.date_reelle ? formatDate(p.date_reelle) : '—'}</td>
                    <td className="fw-600">{formatEuro(p.montant)}</td>
                    <td className="text-muted">{p.methode || '—'}</td>
                    <td>{statutPaiementBadge(p.statut)}</td>
                    <td>
                      <div className="actions-cell">
                        {p.statut !== 'paye' && (
                          <button className="btn btn-success btn-sm" onClick={() => onMarkPaid(p)}>
                            Payer
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => onDeletePaiement(p.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
