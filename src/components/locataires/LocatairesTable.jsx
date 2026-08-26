import React from 'react'
import Icon from '../common/Icon'
import { formatDate, formatEuro } from '../../lib/utils'

export default function LocatairesTable({
  locataires,
  biens,
  onNavigate,
  onOpenDoc,
  onSelectLocataire,
  onOpenLocStats,
  onOpenMail,
  onEdit,
  onDelete
}) {
  if (locataires.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="user" size={40} color="#cbd5e1" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Aucun locataire dans cette catégorie</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Modifiez les filtres ou ajoutez un nouveau locataire.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-wrapper" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Statut</th>
            <th>Locataire</th>
            <th>Logement / Bien</th>
            <th>Contact</th>
            <th>Profession & Revenus</th>
            <th>Garant</th>
            <th>Dossier</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {locataires.map(l => (
            <tr
              key={l.id}
              onClick={() => onSelectLocataire && onSelectLocataire(l)}
              title="Cliquer pour afficher la fiche profil complète"
              style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
            >
              {/* Statut */}
              <td>
                {l.isActuel ? (
                  <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="checkCircle" size={10} color="#ffffff" /> Actuel
                  </span>
                ) : (
                  <div>
                    <span className="badge badge-muted" style={{ fontSize: 10, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="fileText" size={10} color="#64748b" /> Ancien
                    </span>
                    {l.lastBail?.motif_fin && (
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>
                        {l.lastBail.motif_fin}
                      </div>
                    )}
                  </div>
                )}
              </td>

              {/* Nom & Profil */}
              <td className="fw-600">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'rgba(79, 70, 229, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4f46e5',
                      fontWeight: 700,
                      fontSize: 12
                    }}
                  >
                    {l.prenom ? l.prenom[0].toUpperCase() : 'L'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{l.prenom} {l.nom}</div>
                  </div>
                </div>
              </td>

              {/* Logement */}
              <td>
                {l.bien_id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate && onNavigate('bien', l.bien_id)
                      }}
                      title="Accéder à la fiche du bien"
                    >
                      <Icon name="house" size={12} color="#4f46e5" /> {l.bien_nom || 'Voir logement'}
                    </button>
                  </div>
                ) : l.lastBail ? (
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Dernier : <strong>{l.lastBail.bien_nom || '—'}</strong>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Aucun logement</span>
                )}
              </td>

              {/* Contact */}
              <td>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>{l.email || '—'}</div>
                <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 500 }}>{l.telephone || '—'}</div>
              </td>

              {/* Revenus */}
              <td>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                  {l.revenus_mensuels ? formatEuro(l.revenus_mensuels) : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{l.profession || 'Non spécifié'}</div>
              </td>

              {/* Garant */}
              <td>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{l.garant_nom || '—'}</div>
                <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{l.garant_contact || ''}</div>
              </td>

              {/* Dossier PDF */}
              <td>
                {l.fichier_dossier ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDoc(l.fichier_dossier)
                    }}
                    title="Voir les pièces du dossier"
                  >
                    <Icon name="fileText" size={12} color="#4f46e5" /> PDF
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
                )}
              </td>

              {/* Actions */}
              <td style={{ textAlign: 'right' }}>
                <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => onSelectLocataire && onSelectLocataire(l)}
                    title="Voir la fiche profil complète"
                  >
                    <Icon name="eye" size={12} /> Profil
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px', fontSize: 11, background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => onOpenLocStats(l)}
                    title="Voir le bilan financier complet et l'historique des loyers"
                  >
                    <Icon name="chart" size={12} color="#166534" /> Bilan
                  </button>

                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => {
                      const targetBienId = l.bien_id || (biens[0]?.id)
                      if (targetBienId && onOpenMail) {
                        onOpenMail(targetBienId, { recipientEmail: l.email || '' })
                      }
                    }}
                    title="Ouvrir la boîte mail pour ce locataire"
                  >
                    <Icon name="mail" size={13} />
                  </button>

                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(l)} title="Modifier la fiche">
                    <Icon name="edit" size={13} />
                  </button>

                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(l.id)} title="Supprimer">
                    <Icon name="trash" size={13} />
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
