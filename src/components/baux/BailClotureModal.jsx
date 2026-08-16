import React from 'react'
import { formatEuro, todayISO } from '../../lib/utils'

export default function BailClotureModal({
  modalData,
  setModalData,
  onSubmit,
  onClose
}) {
  if (!modalData) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 620, width: '92%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>🚪 Clôturer le bail — {modalData.locataireNom}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Logement : {modalData.bienNom}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700 }}>Date effective de départ *</label>
              <input
                type="date"
                className="form-control"
                required
                value={modalData.dateFin || todayISO()}
                onChange={e => setModalData({ ...modalData, dateFin: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700 }}>Motif de fin de bail *</label>
              <select
                className="form-control"
                required
                value={modalData.motifFin || 'Congé locataire'}
                onChange={e => setModalData({ ...modalData, motifFin: e.target.value })}
              >
                <option value="Congé locataire">Congé donné par le locataire (Départ)</option>
                <option value="Congé bailleur (Vente)">Congé bailleur — Vente du logement</option>
                <option value="Congé bailleur (Reprise)">Congé bailleur — Reprise personnelle</option>
                <option value="Résiliation impayés / Contentieux">Résiliation impayés / Contentieux</option>
                <option value="Expiration normale du contrat">Expiration normale du contrat</option>
                <option value="Autre motif">Autre motif</option>
              </select>
            </div>
          </div>

          {/* Dépôt de garantie / Caution */}
          <div style={{ background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              💶 Restitution du dépôt de garantie (Caution initiale : {formatEuro(modalData.bail?.depot_garantie || 0)})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Modalité de restitution</label>
                <select
                  className="form-control"
                  value={modalData.restitutionCaution}
                  onChange={e => setModalData({ ...modalData, restitutionCaution: e.target.value })}
                >
                  <option value="restitue">✅ Restitution intégrale</option>
                  <option value="partiel_restitue">⚠️ Retenue partielle (Réparations/Charges)</option>
                  <option value="en_attente">⏳ En attente de régularisation</option>
                </select>
              </div>
              {modalData.restitutionCaution === 'partiel_restitue' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Montant retenu (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="ex: 150.00"
                    value={modalData.montantRetenu}
                    onChange={e => setModalData({ ...modalData, montantRetenu: e.target.value })}
                  />
                </div>
              )}
            </div>
            {modalData.restitutionCaution === 'partiel_restitue' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Motif de la retenue</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder="ex: Nettoyage approfondi, régularisation charges d'eau..."
                  value={modalData.motifRetenue}
                  onChange={e => setModalData({ ...modalData, motifRetenue: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Compteurs de sortie & Clés */}
          <div style={{ background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              ⚡ Relevé des compteurs de sortie & Clés
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Électricité (kWh)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder="Index..."
                  value={modalData.compteurElec}
                  onChange={e => setModalData({ ...modalData, compteurElec: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Eau (m³)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder="Index..."
                  value={modalData.compteurEau}
                  onChange={e => setModalData({ ...modalData, compteurEau: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gaz (m³)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder="Index..."
                  value={modalData.compteurGaz}
                  onChange={e => setModalData({ ...modalData, compteurGaz: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Restitution des clés</label>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: 12 }}
                value={modalData.clesRemises}
                onChange={e => setModalData({ ...modalData, clesRemises: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Observations / Notes complémentaires</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="ex: Appartement rendu propre, pas de dégradation majeure..."
              value={modalData.notesFin || ''}
              onChange={e => setModalData({ ...modalData, notesFin: e.target.value })}
            />
          </div>

          {/* Options complémentaires : État des lieux & Email */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="generate-edl-check"
                checked={modalData.generateEdl}
                onChange={e => setModalData({ ...modalData, generateEdl: e.target.checked })}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="generate-edl-check" style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF', cursor: 'pointer' }}>
                📋 Ouvrir et générer l'État des Lieux de Sortie officiel (PDF / Impression)
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="send-mail-check"
                checked={modalData.sendClosingMail}
                onChange={e => setModalData({ ...modalData, sendClosingMail: e.target.checked })}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="send-mail-check" style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', cursor: 'pointer' }}>
                ✉️ Étape suivante : Rédiger et envoyer un email de solde de tout compte au locataire
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-danger" style={{ fontWeight: 700 }}>
              🔒 Clôturer définitivement le bail
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
