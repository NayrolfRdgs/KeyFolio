import React from 'react'
import Icon from '../common/Icon'

export default function LocataireFormModal({
  isOpen,
  isEditing,
  form,
  setForm,
  biens = [],
  sourcePath,
  onPickFile,
  onSubmit,
  onClose,
  loading
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div
        className="modal-box"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          boxShadow: '0 24px 50px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* En-tête */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Icon name="user" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {isEditing ? 'Modifier la fiche du locataire' : 'Ajouter un nouveau locataire'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b' }}>
                Identité, coordonnées, revenus, logement et garant
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Formulaire défilant */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Section 1 : Identité & Contact */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="user" size={14} color="#4f46e5" /> 1. Identité & Coordonnées
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Prénom *</label>
                  <input
                    className="form-control"
                    required
                    value={form.prenom || ''}
                    onChange={e => setForm({ ...form, prenom: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nom *</label>
                  <input
                    className="form-control"
                    required
                    value={form.nom || ''}
                    onChange={e => setForm({ ...form, nom: e.target.value })}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Téléphone</label>
                  <input
                    className="form-control"
                    type="tel"
                    value={form.telephone || ''}
                    onChange={e => setForm({ ...form, telephone: e.target.value })}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={form.email || ''}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="locataire@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 : Situation professionnelle & Logement */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="wallet" size={14} color="#4f46e5" /> 2. Situation Pro & Logement
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Profession / Statut</label>
                  <input
                    className="form-control"
                    value={form.profession || ''}
                    onChange={e => setForm({ ...form, profession: e.target.value })}
                    placeholder="Ex: CDI, Cadre, Étudiant..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Revenus nets mensuels (€)</label>
                  <input
                    type="number"
                    step="50"
                    className="form-control"
                    value={form.revenus_mensuels || ''}
                    onChange={e => setForm({ ...form, revenus_mensuels: e.target.value })}
                    placeholder="Ex: 2400"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Logement attribué</label>
                <select
                  className="form-control"
                  value={form.bien_id || ''}
                  onChange={e => setForm({ ...form, bien_id: e.target.value })}
                >
                  <option value="">-- Aucun logement / En recherche --</option>
                  {biens.map(b => (
                    <option key={b.id} value={b.id}>{b.nom} {b.adresse ? `(${b.adresse})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 3 : Garant & Pièces justificatives */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="shieldCheck" size={14} color="#4f46e5" /> 3. Garant & Pièces Dossier
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Garant (Nom / Organisme)</label>
                  <input
                    className="form-control"
                    value={form.garant_nom || ''}
                    onChange={e => setForm({ ...form, garant_nom: e.target.value })}
                    placeholder="Ex: Visale ou Nom du garant"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Garant (Contact Tél / Email)</label>
                  <input
                    className="form-control"
                    value={form.garant_contact || ''}
                    onChange={e => setForm({ ...form, garant_contact: e.target.value })}
                    placeholder="06... ou garant@email.com"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Pièces du dossier (PDF / Scan)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-control"
                    readOnly
                    value={sourcePath || form.fichier_dossier || ''}
                    placeholder="Aucun document sélectionné"
                  />
                  <button type="button" className="btn btn-secondary" onClick={onPickFile} style={{ whiteSpace: 'nowrap' }}>
                    Parcourir...
                  </button>
                </div>
              </div>
            </div>

            {/* Section 4 : Notes */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Notes & Observations</label>
              <textarea
                className="form-control"
                rows="2"
                value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Remarques particulières sur le locataire..."
              />
            </div>

          </div>

          {/* Boutons Footer */}
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: '#f8fafc'
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Ajouter le locataire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
