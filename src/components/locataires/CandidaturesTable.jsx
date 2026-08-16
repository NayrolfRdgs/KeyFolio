import React from 'react'
import Icon from '../common/Icon'
import { formatEuro } from '../../lib/utils'

export default function CandidaturesTable({
  candidatures,
  onNavigate,
  onOpenDoc,
  onStatutChange,
  onConvert,
  onOpenMail,
  onEdit,
  onDelete,
  onOpenCreate
}) {
  if (candidatures.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>Aucune candidature enregistrée</h3>
          <p>Ajoutez les dossiers des candidats pour les classer et lancer le processus de création de bail.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onOpenCreate}>
            + Ajouter une candidature
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Candidat</th>
            <th>Logement visé</th>
            <th>Contact</th>
            <th>Profession & Revenus</th>
            <th>Garant</th>
            <th>Pièces dossier</th>
            <th>Statut</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidatures.map(c => {
            const isConverti = c.statut === 'converti'
            return (
              <tr key={c.id}>
                <td className="fw-600">📂 {c.prenom} {c.nom}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: 12, fontWeight: 600 }}
                    onClick={() => c.bien_id && onNavigate && onNavigate('bien', c.bien_id)}
                  >
                    🏠 {c.bien_nom || 'Voir bien'}
                  </button>
                </td>
                <td>
                  <div style={{ fontSize: 13 }}>{c.email || '—'}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{c.telephone || '—'}</div>
                </td>
                <td>
                  <div className="fw-600">{c.revenus_mensuels ? formatEuro(c.revenus_mensuels) : '—'}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{c.profession || 'Non spécifié'}</div>
                </td>
                <td>
                  <div>{c.garant_nom || '—'}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{c.garant_contact || '—'}</div>
                </td>
                <td>
                  {c.fichier_dossier ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => onOpenDoc(c.fichier_dossier)}
                      title="Ouvrir les pièces du dossier"
                    >
                      📄 Pièces PDF
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucun fichier</span>
                  )}
                </td>
                <td>
                  <select
                    className="form-control"
                    style={{ fontSize: 12, padding: '3px 8px', height: 'auto', width: 'auto', minWidth: 120 }}
                    value={c.statut}
                    onChange={e => onStatutChange(c.id, e.target.value)}
                    disabled={isConverti}
                  >
                    <option value="nouveau">🟡 Nouveau</option>
                    <option value="retenu">🟢 Retenu</option>
                    <option value="refuse">🔴 Refusé</option>
                    <option value="converti">🔑 Converti en Bail</option>
                  </select>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                    {!isConverti && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: 11, background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE', fontWeight: 600 }}
                        onClick={() => onConvert(c)}
                        title="Créer automatiquement le bail et le profil locataire"
                      >
                        ✨ Convertir en Bail
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: 11 }}
                      onClick={() => onOpenMail(c)}
                      title="Contacter le candidat par email"
                    >
                      ✉️ Mail
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(c)} title="Modifier">
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(c.id)} title="Supprimer">
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
