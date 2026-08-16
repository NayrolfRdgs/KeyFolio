import React from 'react'

export default function BailFormModal({
  isOpen,
  isEditing,
  form,
  setField,
  biens,
  locataires,
  onPickBailFile,
  onOpenBailGenerator,
  onSubmit,
  onClose,
  loading
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Modifier le bail' : 'Créer un nouveau bail'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bien immobilier *</label>
              <select
                className="form-control"
                required
                value={form.bien_id || ''}
                onChange={setField('bien_id')}
              >
                <option value="">Sélectionner un logement</option>
                {biens.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nom} ({b.adresse || 'Sans adresse'})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Locataire *</label>
              <select
                className="form-control"
                required
                value={form.locataire_id || ''}
                onChange={setField('locataire_id')}
              >
                <option value="">Sélectionner un locataire</option>
                {locataires.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.prenom} {l.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type de contrat de bail</label>
              <select
                className="form-control"
                value={form.type_bail || 'meuble'}
                onChange={setField('type_bail')}
              >
                <option value="meuble">Meublé (Résidence principale - 1 an)</option>
                <option value="nu">Non meublé / Nu (3 ans)</option>
                <option value="etudiant">Étudiant meublé (9 mois)</option>
                <option value="mobilite">Bail Mobilité (1 à 10 mois)</option>
                <option value="colocation">Bail de Colocation</option>
                <option value="professionnel">Bail Professionnel / Commercial</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jour d'échéance (du 1 au 28)</label>
              <input
                type="number"
                min="1"
                max="28"
                className="form-control"
                value={form.jour_paiement || 5}
                onChange={setField('jour_paiement')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date de début *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.date_debut || ''}
                onChange={setField('date_debut')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date de fin (optionnel)</label>
              <input
                type="date"
                className="form-control"
                value={form.date_fin || ''}
                onChange={setField('date_fin')}
                placeholder="Laisser vide si en cours"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Loyer hors charges (€) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                required
                value={form.loyer_mensuel || ''}
                onChange={setField('loyer_mensuel')}
                placeholder="750.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Provisions sur charges (€)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={form.charges_mensuelles || ''}
                onChange={setField('charges_mensuelles')}
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
                value={form.depot_garantie || ''}
                onChange={setField('depot_garantie')}
                placeholder="750.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Statut de la caution</label>
              <select
                className="form-control"
                value={form.statut_garantie || 'en_attente'}
                onChange={setField('statut_garantie')}
              >
                <option value="en_attente">⏳ En attente de versement</option>
                <option value="recu">✅ Reçu / Encaissé</option>
                <option value="restitue">↩️ Restitué au locataire</option>
                <option value="partiel_restitue">⚠️ Retenu partiel / Sinistre</option>
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              ⚡ Index des compteurs à l'entrée (Optionnel)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Électricité (kWh)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder="ex: 14250"
                  value={form.compteur_elec_entree || ''}
                  onChange={setField('compteur_elec_entree')}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Eau (m³)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder="ex: 345"
                  value={form.compteur_eau_entree || ''}
                  onChange={setField('compteur_eau_entree')}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gaz (m³)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: 12 }}
                  placeholder="ex: 120"
                  value={form.compteur_gaz_entree || ''}
                  onChange={setField('compteur_gaz_entree')}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Statut du bail</label>
            <select
              className="form-control"
              value={form.statut || 'actif'}
              onChange={setField('statut')}
            >
              <option value="actif">Actif (Bail en cours)</option>
              <option value="termine">Terminé (Bail antérieur / Archivé)</option>
              <option value="resilie">Résilié</option>
            </select>
          </div>

          {/* Générateur et attachement de contrat */}
          <div className="form-group" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#1E40AF' }}>
                📄 Contrat de bail de location (PDF)
              </label>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700 }}
                onClick={onOpenBailGenerator}
              >
                ✨ Générer le Bail officiel (PDF ALUR)
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                readOnly
                value={form.fichier_bail || ''}
                placeholder="Aucun contrat joint (cliquez sur Générer ou Parcourir)"
              />
              <button type="button" className="btn btn-secondary" onClick={onPickBailFile}>
                Parcourir...
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#1E40AF', marginTop: 4 }}>
              📁 Le contrat est automatiquement archivé dans <em>07_LOCATION/Bail/Bail_en_cours</em>.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le bail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
