import React from 'react'
import Icon from '../common/Icon'
import { formatDate, formatEuro } from '../../lib/utils'

export default function LocatairesTable({
  locataires,
  biens,
  onNavigate,
  onOpenDoc,
  onOpenLocStats,
  onOpenMail,
  onEdit,
  onDelete
}) {
  if (locataires.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <h3>Aucun locataire dans cette catégorie</h3>
          <p>Modifiez les filtres ou ajoutez un nouveau locataire</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Statut</th>
            <th>Locataire</th>
            <th>Logement & Bail</th>
            <th>Contact</th>
            <th>Profession & Revenus</th>
            <th>Garant</th>
            <th>Pièces dossier</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {locataires.map(l => (
            <tr key={l.id}>
              <td>
                {l.isActuel ? (
                  <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>🟢 Actuel</span>
                ) : (
                  <div>
                    <span className="badge badge-muted" style={{ fontSize: 10, padding: '2px 6px' }}>📜 Ancien</span>
                    {l.lastBail?.motif_fin && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                        {l.lastBail.motif_fin}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td className="fw-600">👤 {l.prenom} {l.nom}</td>
              <td>
                {l.bien_id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: 12, fontWeight: 600 }}
                      onClick={() => onNavigate && onNavigate('bien', l.bien_id)}
                      title="Accéder directement à la fiche de ce logement"
                    >
                      🏠 {l.bien_nom || 'Voir logement'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 6px', fontSize: 11 }}
                      onClick={() => onNavigate && onNavigate('baux')}
                      title="Voir les détails du bail"
                    >
                      🔑 Bail
                    </button>
                  </div>
                ) : l.lastBail ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Dernier logement : <strong>{l.lastBail.bien_nom || '—'}</strong>
                    <br />
                    Fin du bail : {formatDate(l.lastBail.date_fin)}
                  </div>
                ) : (
                  <span className="badge badge-muted" style={{ fontSize: 11 }}>Aucun bail</span>
                )}
              </td>
              <td>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{l.email || '—'}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{l.telephone || '—'}</div>
              </td>
              <td>
                <div className="fw-600">{l.revenus_mensuels ? formatEuro(l.revenus_mensuels) : '—'}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{l.profession || 'Non spécifié'}</div>
              </td>
              <td>
                <div>{l.garant_nom || '—'}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{l.garant_contact || '—'}</div>
              </td>
              <td>
                {l.fichier_dossier ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => onOpenDoc(l.fichier_dossier)}
                    title="Voir les pièces du dossier"
                  >
                    📄 Dossier PDF
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucun fichier</span>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: 11, background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}
                    onClick={() => onOpenLocStats(l)}
                    title="Voir le bilan financier complet et l'historique des loyers"
                  >
                    📊 Bilan & Stats
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => {
                      const targetBienId = l.bien_id || (biens[0]?.id)
                      if (targetBienId && onOpenMail) {
                        onOpenMail(targetBienId, { recipientEmail: l.email || '' })
                      }
                    }}
                    title="Ouvrir la boîte mail pour ce locataire"
                  >
                    ✉️ Mail
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(l)} title="Modifier">
                    <Icon name="edit" size={14} />
                  </button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(l.id)} title="Supprimer">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
