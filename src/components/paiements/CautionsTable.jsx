import React, { useState } from 'react'
import { formatDate, formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'
import CautionEditModal from './CautionEditModal'

export const labelStatutCaution = (st) => {
  switch(st) {
    case 'recu':            return { label: 'Reçu / Encaissé', cls: 'badge-success' }
    case 'restitue':        return { label: 'Restitué', cls: 'badge-neutral' }
    case 'partiel_restitue':return { label: 'Retenue partielle', cls: 'badge-warning' }
    case 'en_attente':
    default:                return { label: 'En attente', cls: 'badge-danger' }
  }
}

export default function CautionsTable({
  bauxWithDeposit,
  totalCautionsRecues,
  isAllTab,
  onNavigate,
  onCautionStatusChange,
  onOpenDoc,
  onAttachCautionDoc,
  onValidateCaution,
  onUpdateCaution,
  onOpenMail
}) {
  const [editingBail, setEditingBail] = useState(null)

  return (
    <div style={{ marginBottom: isAllTab ? 24 : 0 }}>
      {isAllTab && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            💶 Dépôts de garantie & Cautions ({bauxWithDeposit.length})
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Montant total garanti : {formatEuro(totalCautionsRecues)}
          </span>
        </div>
      )}

      {bauxWithDeposit.length === 0 ? (
        <div className="table-wrapper" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          Aucun dépôt de garantie enregistré sur les baux.
        </div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Logement</th>
                <th>Locataire</th>
                <th>Date d'entrée</th>
                <th>Montant caution</th>
                <th>Statut caution</th>
                <th>Justificatif</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bauxWithDeposit.map(b => {
                const st = labelStatutCaution(b.statut_garantie || 'en_attente')
                const isEnAttente = (b.statut_garantie || 'en_attente') === 'en_attente'
                return (
                  <tr key={b.id} style={{ background: isEnAttente ? '#FFFBEB' : undefined }}>
                    <td className="fw-600">
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}
                        onClick={() => onNavigate && onNavigate('bien', b.bien_id)}
                      >
                        🏠 {b.bien_nom || '—'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 13, fontWeight: 500 }}
                        onClick={() => onNavigate && onNavigate('locataires')}
                      >
                        👤 {b.locataire_prenom} {b.locataire_nom}
                      </button>
                    </td>
                    <td className="text-muted">{formatDate(b.date_debut)}</td>
                    <td className="fw-600" style={{ fontSize: 14 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 14, fontWeight: 700 }}
                        onClick={() => setEditingBail(b)}
                        title="Cliquer pour modifier le montant ou les infos de caution"
                      >
                        {formatEuro(b.depot_garantie)} ✏️
                      </button>
                    </td>
                    <td>
                      <select
                        className={`badge ${st.cls}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none', padding: '4px 8px', fontWeight: 600 }}
                        value={b.statut_garantie || 'en_attente'}
                        onChange={(e) => onCautionStatusChange(b, e.target.value)}
                      >
                        <option value="en_attente" style={{ color: '#000' }}>⏳ En attente</option>
                        <option value="recu" style={{ color: '#000' }}>✅ Reçu / Encaissé</option>
                        <option value="restitue" style={{ color: '#000' }}>↩️ Restitué</option>
                        <option value="partiel_restitue" style={{ color: '#000' }}>⚠️ Retenue partielle</option>
                      </select>
                    </td>
                    <td>
                      {b.fichier_caution ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => onOpenDoc(b.fichier_caution)}
                          title="Ouvrir le justificatif de caution"
                        >
                          📄 Reçu PDF
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11, border: '1px dashed var(--border-color)' }}
                          onClick={() => onAttachCautionDoc(b)}
                          title="Attacher un justificatif de virement"
                        >
                          📎 Attacher reçu
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        {isEnAttente && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700 }}
                            onClick={() => onValidateCaution(b)}
                            title="Valider l'encaissement de la caution en 1 clic"
                          >
                            ✔️ Valider reçue
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setEditingBail(b)}
                          title="Modifier les détails de la caution"
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => onOpenMail(b)}
                          title="Contacter le locataire"
                        >
                          ✉️ Mail
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

      {/* Modale d'édition de caution */}
      {editingBail && (
        <CautionEditModal
          bail={editingBail}
          onClose={() => setEditingBail(null)}
          onSave={onUpdateCaution}
        />
      )}
    </div>
  )
}
