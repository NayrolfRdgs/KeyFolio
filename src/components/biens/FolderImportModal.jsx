import React, { useState } from 'react'
import { open as openDirectoryDialog } from '@tauri-apps/plugin-dialog'
import { importBienFolder } from '../../lib/db'
import Icon from '../common/Icon'

export default function FolderImportModal({ onClose, onSuccess }) {
  const [folderPath, setFolderPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const handlePickDirectory = async () => {
    try {
      const selected = await openDirectoryDialog({
        directory: true,
        multiple: false,
        title: 'Sélectionner le dossier du bien à importer/adopter'
      })
      if (selected) {
        setFolderPath(selected)
      }
    } catch (e) {
      console.warn('Dialog cancel', e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!folderPath.trim()) {
      setError('Veuillez sélectionner un dossier.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const bienId = await importBienFolder(folderPath.trim())
      setSuccessMsg(`Dossier bien adopté avec succès ! (ID Bien: #${bienId})`)
      if (onSuccess) onSuccess()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            Importer / Adopter un dossier bien
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 16 }}>
          Sélectionnez un dossier de bien existant (venant d'une clé USB, d'un autre ordinateur ou créé manuellement). Le logiciel analysera les fichiers Excel (`Fiche_Bien.xlsx`, `Suivi_Loyers.xlsx`, etc.) pour reconstruire automatiquement la base SQLite.
        </p>

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}
        {successMsg && <div className="alert alert-success" style={{ marginBottom: 14 }}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Chemin du dossier bien *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" className="form-control"
                value={folderPath}
                onChange={e => setFolderPath(e.target.value)}
                placeholder="ex: E:\biens_data\APPT_PARIS_12"
              />
              <button type="button" className="btn btn-secondary" onClick={handlePickDirectory}>
                Parcourir...
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Analyse & Importation...' : 'Scanner & Adopter le bien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
