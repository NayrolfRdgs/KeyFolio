import React, { useState } from 'react'
import Icon from '../common/Icon'
import { formatEuro } from '../../lib/utils'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { openFilePath } from '../../lib/db'

export default function CautionEditModal({ bail, onClose, onSave }) {
  const [depotGarantie, setDepotGarantie] = useState(bail?.depot_garantie ?? '')
  const [statutGarantie, setStatutGarantie] = useState(bail?.statut_garantie || 'en_attente')
  const [fichierCaution, setFichierCaution] = useState(bail?.fichier_caution || '')
  const [saving, setSaving] = useState(false)

  const handlePickFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner le justificatif de caution (PDF / Reçu)',
        filters: [{ name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }]
      })
      if (selected) {
        setFichierCaution(selected)
      }
    } catch (e) {
      console.warn(e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updatedBail = {
        ...bail,
        depot_garantie: depotGarantie !== '' ? parseFloat(depotGarantie) : 0,
        statut_garantie: statutGarantie,
        fichier_caution: fichierCaution || null
      }
      await onSave(updatedBail)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-card" style={{ maxWidth: 520, width: '92%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>💶 Modifier le Dépôt de Garantie</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Locataire : <strong>{bail?.locataire_prenom} {bail?.locataire_nom}</strong> — Logement : <strong>{bail?.bien_nom}</strong>
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Montant du dépôt de garantie (€) *
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              required
              value={depotGarantie}
              placeholder="ex: 750.00"
              onChange={e => setDepotGarantie(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Statut de la caution *
            </label>
            <select
              className="form-control"
              value={statutGarantie}
              onChange={e => setStatutGarantie(e.target.value)}
            >
              <option value="en_attente">⏳ En attente de versement</option>
              <option value="recu">✅ Reçu / Encaissé sur compte</option>
              <option value="restitue">↩️ Restitué intégralement au locataire</option>
              <option value="partiel_restitue">⚠️ Retenue partielle / Sinistre</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Justificatif de virement / Reçu (PDF / Image)
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                className="form-control"
                readOnly
                value={fichierCaution}
                placeholder="Aucun document joint"
                style={{ fontSize: 12 }}
              />
              <button type="button" className="btn btn-secondary" onClick={handlePickFile}>
                Parcourir...
              </button>
            </div>
            {fichierCaution && (
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: '2px 6px', color: 'var(--color-primary)' }}
                  onClick={() => openFilePath(fichierCaution)}
                >
                  📄 Ouvrir le fichier joint
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: '2px 6px', color: 'var(--color-danger)' }}
                  onClick={() => setFichierCaution('')}
                >
                  ✕ Retirer
                </button>
              </div>
            )}
          </div>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 10, borderRadius: 6, fontSize: 11, color: '#1E40AF', marginBottom: 16 }}>
            🔄 La modification sera immédiatement enregistrée dans la base et synchronisée dans le fichier Excel <strong>07_LOCATION/Locataires_Baux.xlsx</strong> du bien.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Enregistrement...' : '💾 Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
