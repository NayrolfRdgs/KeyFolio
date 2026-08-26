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
  onSelectBail,
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
        <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="fileText" size={40} color="#cbd5e1" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Aucun bail correspondant</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Créez un bail pour lier un locataire à un logement et suivre les encaissements.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-wrapper" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Logement / Bien</th>
            <th>Locataire</th>
            <th>Période du bail</th>
            <th style={{ textAlign: 'right' }}>Loyer CC Total</th>
            <th style={{ textAlign: 'right' }}>Loyer Net (HC)</th>
            <th style={{ textAlign: 'right' }}>Charges</th>
            <th style={{ textAlign: 'center' }}>Dépôt Garantie</th>
            <th>Contrat</th>
            <th>Statut</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {baux.map(b => {
            const isActif = b.statut === 'actif'
            const loyerNu = Number(b.loyer_mensuel) || 0
            const charges = Number(b.charges_mensuelles) || 0
            const loyerCC = loyerNu + charges
            const depotGarantie = Number(b.depot_garantie) || 0
            const isDepotDepose = b.statut_garantie === 'encaissee' || b.statut_garantie === 'depose' || depotGarantie > 0

            return (
              <tr
                key={b.id}
                onClick={() => onSelectBail && onSelectBail(b)}
                title="Cliquer pour afficher l'historique financier et le détail complet"
                style={{
                  cursor: 'pointer',
                  background: !isActif ? '#f8fafc' : undefined,
                  transition: 'background 0.15s ease'
                }}
              >
                {/* 1. Logement */}
                <td className="fw-600">
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigate && onNavigate('bien', b.bien_id)
                    }}
                    title="Ouvrir la fiche du bien"
                  >
                    <Icon name="house" size={14} color="#4f46e5" />
                    {b.bien_nom || 'Logement'}
                  </button>
                </td>

                {/* 2. Locataire */}
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigate && onNavigate('locataires')
                    }}
                  >
                    <Icon name="user" size={13} color="#64748b" />
                    {b.locataire_prenom} {b.locataire_nom}
                  </button>
                </td>

                {/* 3. Début / Fin */}
                <td className="text-muted" style={{ fontSize: 12 }}>
                  <div>{formatDate(b.date_debut)}</div>
                  {b.date_fin && (
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Fin : {formatDate(b.date_fin)}</div>
                  )}
                </td>

                {/* 4. Loyer Total CC (Couleur Indigo bien visible) */}
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#4f46e5', fontSize: 14 }}>
                  {formatEuro(loyerCC)}
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>/m</span>
                </td>

                {/* 5. Loyer Net (HC) (Couleur Bleu) */}
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: 13 }}>
                  {formatEuro(loyerNu)}
                </td>

                {/* 6. Charges */}
                <td style={{ textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                  {formatEuro(charges)}
                </td>

                {/* 7. Dépôt de garantie (VERT si déposé) */}
                <td style={{ textAlign: 'center' }}>
                  {depotGarantie > 0 ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 99,
                        background: isDepotDepose ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: isDepotDepose ? '#16a34a' : '#d97706',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={isDepotDepose ? 'Dépôt de garantie encaissé et séquestré' : 'Dépôt de garantie en attente'}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDepotDepose ? '#16a34a' : '#d97706' }} />
                      {formatEuro(depotGarantie)}
                    </span>
                  ) : (
                    <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                  )}
                </td>

                {/* 8. Contrat PDF */}
                <td>
                  {b.fichier_bail ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenDoc(b.fichier_bail)
                      }}
                      title="Ouvrir le contrat de bail PDF"
                    >
                      <Icon name="fileText" size={12} color="#4f46e5" /> PDF
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Non joint</span>
                  )}
                </td>

                {/* 9. Statut */}
                <td>
                  <span className={`badge ${statutBadge(b.statut)}`} style={{ fontSize: 10 }}>
                    {labelStatutBail(b.statut)}
                  </span>
                </td>

                {/* 10. Actions */}
                <td style={{ textAlign: 'right' }}>
                  <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => onSelectBail && onSelectBail(b)}
                      title="Voir le détail et l'historique financier complet"
                    >
                      <Icon name="eye" size={12} /> Détail
                    </button>

                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '3px 6px' }}
                      onClick={() => onEdit && onEdit(b)}
                      title="Modifier les conditions du bail"
                    >
                      <Icon name="edit" size={13} />
                    </button>

                    {isActif && onOpenTerminateModal && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '3px 6px', color: '#ea580c' }}
                        onClick={() => onOpenTerminateModal(b)}
                        title="Fin de bail / État des lieux de sortie"
                      >
                        <Icon name="doorClosed" size={13} />
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
