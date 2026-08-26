import React from 'react'

export default function ConvertCandidatureModal({
  candidature,
  form,
  setForm,
  onPickFile,
  onSubmit,
  onClose,
  loading
}) {
  if (!candidature) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3> Processus de Création de Bail pour {candidature.prenom} {candidature.nom}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="alert alert-info" style={{ fontSize: 12, marginBottom: 14 }}>
            ℹ️ La création du bail actif enregistrera le locataire et clôturera tout bail en cours pour <strong>{candidature.bien_nom}</strong> en l'archivant dans les baux antérieurs (<em>07_LOCATION/Bail/Baux_anciens</em>).
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date de début du bail *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.date_debut}
                onChange={e => setForm({ ...form, date_debut: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date de fin (optionnelle)</label>
              <input
                type="date"
                className="form-control"
                value={form.date_fin}
                onChange={e => setForm({ ...form, date_fin: e.target.value })}
                placeholder="En cours"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Loyer net mensuel (€) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                required
                value={form.loyer_mensuel}
                onChange={e => setForm({ ...form, loyer_mensuel: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Charges mensuelles (€)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={form.charges_mensuelles}
                onChange={e => setForm({ ...form, charges_mensuelles: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Dépôt de garantie (€)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={form.depot_garantie}
                onChange={e => setForm({ ...form, depot_garantie: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Jour d'échéance du loyer</label>
              <input
                type="number"
                min="1"
                max="28"
                className="form-control"
                value={form.jour_paiement}
                onChange={e => setForm({ ...form, jour_paiement: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contrat de bail (PDF / Scan)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                readOnly
                value={form.fichier_bail}
                placeholder="Aucun contrat sélectionné"
              />
              <button type="button" className="btn btn-secondary" onClick={onPickFile}>
                Parcourir...
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Le fichier sera automatiquement copié dans <em>07_LOCATION/Bail/Bail_en_cours</em>.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
               Lancer & Valider le Bail Actif
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
