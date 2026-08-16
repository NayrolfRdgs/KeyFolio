import React from 'react'

export default function LocataireFormModal({
  isOpen,
  isEditing,
  form,
  setForm,
  sourcePath,
  onPickFile,
  onSubmit,
  onClose,
  loading
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Modifier le locataire' : 'Nouveau locataire'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input
                className="form-control"
                required
                value={form.prenom || ''}
                onChange={e => setForm({ ...form, prenom: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input
                className="form-control"
                required
                value={form.nom || ''}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder="Nom"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input
                className="form-control"
                type="tel"
                value={form.telephone || ''}
                onChange={e => setForm({ ...form, telephone: e.target.value })}
                placeholder="06 xx xx xx xx"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemple.fr"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Revenus mensuels (€) / Salaire</label>
              <input
                type="number"
                step="50"
                className="form-control"
                value={form.revenus_mensuels || ''}
                onChange={e => setForm({ ...form, revenus_mensuels: e.target.value })}
                placeholder="Ex: 2400"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Profession / Situation pro</label>
              <input
                className="form-control"
                value={form.profession || ''}
                onChange={e => setForm({ ...form, profession: e.target.value })}
                placeholder="Ex: CDI, Fonctionnaire, Cadre..."
              />
            </div>
          </div>

          <hr className="divider" style={{ margin: '12px 0' }} />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Garant (nom / organisme)</label>
              <input
                className="form-control"
                value={form.garant_nom || ''}
                onChange={e => setForm({ ...form, garant_nom: e.target.value })}
                placeholder="Nom du garant ou Visale"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Garant (contact)</label>
              <input
                className="form-control"
                value={form.garant_contact || ''}
                onChange={e => setForm({ ...form, garant_contact: e.target.value })}
                placeholder="Tél ou email du garant"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">📎 Pièces du dossier (PDF / Zip / Scan)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                readOnly
                value={sourcePath || form.fichier_dossier || ''}
                placeholder="Aucun fichier sélectionné"
              />
              <button type="button" className="btn btn-secondary" onClick={onPickFile}>
                Parcourir...
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              📁 Le fichier sera automatiquement copié dans <em>07_LOCATION/Locataires/Dossier candidature</em>.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Notes & Observations</label>
            <textarea
              className="form-control"
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Remarques..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
