import React from 'react'
import Icon from '../common/Icon'
import { formatDate, formatEuro, statutPaiementBadge } from '../../lib/utils'

export default function PaiementsTable({
  paiements,
  isAllTab,
  biens,
  locataires,
  baux,
  dragOverId,
  onNavigate,
  onOpenDoc,
  onAttachQuittance,
  onStatusChange,
  onMarkPaid,
  onOpenQuittanceModal,
  onEdit,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop
}) {
  return (
    <div>
      {isAllTab && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="creditCard" size={16} color="var(--color-accent)" />
            Échéancier des Loyers ({paiements.length})
          </h3>
        </div>
      )}

      {paiements.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name="creditCard" size={40} color="#94a3b8" />
            </div>
            <h3>Aucun paiement correspondant</h3>
            <p>Les loyers s'affichent automatiquement dès qu'un bail actif est créé.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bien</th>
                <th>Locataire</th>
                <th>Date prévue</th>
                <th>Date payé</th>
                <th>Montant</th>
                <th>Justificatif / Virement</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map(p => {
                const isPaye = p.statut === 'paye'
                const targetBail = baux.find(b => b.id === p.bail_id)
                const targetBien = biens.find(b => b.id === targetBail?.bien_id)
                const targetLoc  = locataires.find(l => l.id === targetBail?.locataire_id)

                return (
                  <tr
                    key={p.id}
                    className={dragOverId === p.id ? 'drag-over-row' : ''}
                    onDragOver={(e) => onDragOver(e, p.id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, p.id)}
                    style={{ transition: 'all 0.15s ease' }}
                  >
                    <td className="fw-600">
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => onNavigate && targetBien && onNavigate('bien', targetBien.id)}
                      >
                        <Icon name="house" size={13} color="#64748b" />
                        {p.bien_nom || '—'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => onNavigate && onNavigate('locataires')}
                      >
                        <Icon name="user" size={13} color="#64748b" />
                        {p.locataire_nom || '—'}
                      </button>
                    </td>
                    <td className="text-muted">{formatDate(p.date_prevue)}</td>
                    <td className="text-muted">{p.date_reelle ? formatDate(p.date_reelle) : '—'}</td>
                    <td className="fw-600">{formatEuro(p.montant)}</td>
                    <td>
                      {p.fichier_quittance ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => onOpenDoc(p.fichier_quittance)}
                          title="Ouvrir le justificatif attaché"
                        >
                          <Icon name="fileText" size={12} /> Justificatif PDF
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11, border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => onAttachQuittance(p)}
                          title="Attacher un PDF de virement ou justificatif"
                        >
                          <Icon name="paperclip" size={12} /> Glisser PDF ici
                        </button>
                      )}
                    </td>
                    <td>
                      <select
                        className={`badge ${statutPaiementBadge(p.statut)}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none', padding: '4px 8px', fontWeight: 600 }}
                        value={p.statut}
                        onChange={(e) => onStatusChange(p, e.target.value)}
                      >
                        <option value="impaye" style={{ color: '#000' }}>Impayé</option>
                        <option value="paye" style={{ color: '#000' }}>Payé</option>
                        <option value="en_retard" style={{ color: '#000' }}>En retard</option>
                        <option value="partiel" style={{ color: '#000' }}>Partiel</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        {!isPaye && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => onMarkPaid(p)}
                            title="Marquer comme payé"
                          >
                            <Icon name="check" size={13} /> Payé
                          </button>
                        )}

                        {isPaye && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11, background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => onOpenQuittanceModal({
                              paiement: p,
                              bien: targetBien,
                              locataire: targetLoc,
                              bail: targetBail
                            })}
                            title="Générer ou imprimer la quittance de loyer officielle"
                          >
                            <Icon name="fileText" size={12} /> Quittance
                          </button>
                        )}

                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(p)} title="Modifier">
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(p.id)} title="Supprimer">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
