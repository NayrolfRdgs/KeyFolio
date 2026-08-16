import React from 'react'
import Icon from '../common/Icon'
import { formatDate, formatEuro, labelStatutBail } from '../../lib/utils'

const statutBadge = (statut) => {
  if (statut === 'actif') return 'badge-success'
  if (statut === 'termine') return 'badge-neutral'
  if (statut === 'resilie') return 'badge-danger'
  return 'badge-neutral'
}

export default function BauxTable({
  baux,
  onNavigate,
  onOpenDoc,
  onOpenBailGeneratorForRow,
  onOpenTerminateModal,
  onOpenEdlModal,
  onOpenMail,
  onEdit,
  onDelete
}) {
  if (baux.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>Aucun bail correspondant</h3>
          <p>Créez un bail pour lier un locataire à un logement</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Bien</th>
            <th>Locataire</th>
            <th>Début</th>
            <th>Fin</th>
            <th>Loyer net</th>
            <th>Charges</th>
            <th>Dépôt garantie</th>
            <th>Contrat de bail</th>
            <th>Statut</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {baux.map(b => {
            const isActif = b.statut === 'actif'
            return (
              <tr key={b.id} style={{ background: !isActif ? 'var(--color-surface-2)' : undefined }}>
                <td className="fw-600">
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}
                    onClick={() => onNavigate && onNavigate('bien', b.bien_id)}
                    title="Accéder directement à la fiche du bien"
                  >
                    🏠 {b.bien_nom || '—'}
                  </button>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: 13, fontWeight: 500 }}
                    onClick={() => onNavigate && onNavigate('locataires')}
                    title="Accéder à la section locataires"
                  >
                    👤 {b.locataire_prenom} {b.locataire_nom}
                  </button>
                </td>
                <td className="text-muted">{formatDate(b.date_debut)}</td>
                <td className="text-muted">
                  {b.date_fin ? formatDate(b.date_fin) : '—'}
                  {b.motif_fin && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.motif_fin}</div>
                  )}
                </td>
                <td className="fw-600">{formatEuro(b.loyer_mensuel)}</td>
                <td>{formatEuro(b.charges_mensuelles)}</td>
                <td>{b.depot_garantie ? formatEuro(b.depot_garantie) : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {b.fichier_bail ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => onOpenDoc(b.fichier_bail)}
                        title="Ouvrir le contrat de bail PDF"
                      >
                        📄 Bail PDF
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 11, border: '1px dashed #cbd5e1' }}
                        onClick={() => onOpenBailGeneratorForRow(b)}
                        title="Générer le contrat de bail officiel en PDF"
                      >
                        ✨ Générer bail
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${statutBadge(b.statut)}`}>
                    {labelStatutBail(b.statut)}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: 11, background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}
                      onClick={() => onOpenBailGeneratorForRow(b)}
                      title="Générer / Imprimer le contrat de bail type Loi ALUR"
                    >
                      ✨ Contrat
                    </button>
                    {isActif ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                        onClick={() => onOpenTerminateModal(b)}
                        title="Mettre fin au bail, faire l'état des lieux et archiver le contrat"
                      >
                        🚪 Fin de bail
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => onOpenEdlModal(b)}
                        title="Générer ou réimprimer l'état des lieux de sortie"
                      >
                        📋 État des lieux
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: 11 }}
                      onClick={() => onOpenMail(b)}
                      title="Ouvrir la boîte mail pour ce logement"
                    >
                      ✉️ Mail
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(b)} title="Modifier">
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(b.id)} title="Supprimer">
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
  )
}
