import React from 'react'

export default function PaiementModal({
  modal,
  editing,
  form,
  setForm,
  baux,
  loading,
  setModal,
  handleSubmit
}) {
  if (!modal) return null

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="modal-backdrop" onClick={() => setModal(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editing ? 'Modifier le paiement' : 'Nouveau paiement'}</h3>
          <button className="modal-close" onClick={() => setModal(false)}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Bail *</label>
            <select id="paiement-bail" className="form-control" required
              value={form.bail_id} onChange={f('bail_id')}>
              <option value="">Sélectionner un bail</option>
              {baux.map(b => (
                <option key={b.id} value={b.id}>
                  {b.bien_nom} — {b.locataire_prenom} {b.locataire_nom} ({b.statut})
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date prévue *</label>
              <input type="date" className="form-control" required
                value={form.date_prevue} onChange={f('date_prevue')} />
            </div>
            <div className="form-group">
              <label className="form-label">Date de paiement réel</label>
              <input type="date" className="form-control"
                value={form.date_reelle || ''} onChange={f('date_reelle')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Montant (€) *</label>
              <input type="number" step="0.01" className="form-control" required
                value={form.montant} onChange={f('montant')} placeholder="Ex. 750" />
            </div>
            <div className="form-group">
              <label className="form-label">Méthode</label>
              <select className="form-control" value={form.methode} onChange={f('methode')}>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="prelevement">Prélèvement</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Statut</label>
            <select className="form-control" value={form.statut} onChange={f('statut')}>
              <option value="impaye">Impayé</option>
              <option value="paye">Payé</option>
              <option value="en_retard">En retard</option>
              <option value="partiel">Partiel</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-control"
              value={form.notes || ''} onChange={f('notes')} placeholder="Remarques..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
