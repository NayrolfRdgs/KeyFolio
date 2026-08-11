import React, { useEffect, useState } from 'react'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { getBiens, copyFileToBien } from '../lib/db'
import { SUBFOLDERS } from '../lib/utils'
import Icon from './Icon'

export default function QuickDocumentModal({ initialBienId = null, onClose, onSuccess }) {
  const [biens, setBiens] = useState([])
  const [bienId, setBienId] = useState(initialBienId || '')
  const [subfolder, setSubfolder] = useState(SUBFOLDERS[0]?.id || '01_ADMINISTRATIF')
  const [typeDoc, setTypeDoc] = useState('facture')
  const [selectedFile, setSelectedFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getBiens().then(bList => {
      setBiens(bList)
      if (!bienId && bList.length > 0) {
        setBienId(bList[0].id)
      }
    }).catch(console.error)
  }, [])

  const handlePickFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner un document (PDF, image, etc.)'
      })
      if (selected) {
        setSelectedFile(selected)
      }
    } catch (e) {
      console.warn('Dialog cancel', e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!bienId) {
      setError('Veuillez sélectionner un bien.')
      return
    }
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await copyFileToBien({
        bienId: parseInt(bienId, 10),
        subfolder,
        sourcePath: selectedFile,
        typeDoc,
        notes: notes.trim() || null
      })
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            📎 Associer un document au bien
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Bien immobilier de rattachement *</label>
            <select className="form-control" value={bienId} onChange={e => setBienId(e.target.value)}>
              {biens.map(b => (
                <option key={b.id} value={b.id}>{b.nom} ({b.adresse || 'N/C'})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Dossier de destination *</label>
            <select className="form-control" value={subfolder} onChange={e => setSubfolder(e.target.value)}>
              {SUBFOLDERS.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Type de document</label>
            <select className="form-control" value={typeDoc} onChange={e => setTypeDoc(e.target.value)}>
              <option value="facture">Facture / Reçu</option>
              <option value="quittance">Quittance de loyer</option>
              <option value="bail">Bail d'habitation</option>
              <option value="diagnostic">Diagnostic technique (DDT)</option>
              <option value="assurance">Attestation assurance</option>
              <option value="photo">Photo / État des lieux</option>
              <option value="autre">Autre document</option>
            </select>
          </div>

          <div className="form-group">
            <label>Fichier à copier *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" className="form-control" readOnly value={selectedFile || ''} placeholder="Aucun fichier sélectionné" />
              <button type="button" className="btn btn-secondary" onClick={handlePickFile}>Parcourir...</button>
            </div>
          </div>

          <div className="form-group">
            <label>Notes / Remarques (optionnel)</label>
            <input type="text" className="form-control" placeholder="ex: Facture plombier juillet 2026" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Copie & Rattachement...' : 'Confirmer & Copier dans le bien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
