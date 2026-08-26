import React, { useState } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate } from '../../lib/utils'

export default function LocataireProfileModal({
  locataire,
  bien,
  bail,
  onClose,
  onEdit,
  onSaveQuick,
  onOpenDoc,
  onOpenMail,
  onNavigate
}) {
  const [isEditingQuick, setIsEditingQuick] = useState(false)
  const [formData, setFormData] = useState({
    prenom: locataire?.prenom || '',
    nom: locataire?.nom || '',
    email: locataire?.email || '',
    telephone: locataire?.telephone || '',
    profession: locataire?.profession || '',
    revenus_mensuels: locataire?.revenus_mensuels || '',
    date_naissance: locataire?.date_naissance || '',
    garant_nom: locataire?.garant_nom || '',
    garant_contact: locataire?.garant_contact || '',
    notes: locataire?.notes || ''
  })
  const [saving, setSaving] = useState(false)

  if (!locataire) return null

  const handleQuickSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSaveQuick({
        ...locataire,
        ...formData,
        revenus_mensuels: formData.revenus_mensuels ? parseFloat(formData.revenus_mensuels) : null
      })
      setIsEditingQuick(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const loyerCC = (bail?.loyer_mensuel || 0) + (bail?.charges_mensuelles || 0)
  const tauxEffort = (formData.revenus_mensuels && loyerCC > 0)
    ? Math.round((loyerCC / formData.revenus_mensuels) * 100)
    : null

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div
        className="modal-box"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          boxShadow: '0 24px 50px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* ── EN-TÊTE DU PROFIL DU LOCATAIRE ── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              {locataire.prenom ? locataire.prenom[0].toUpperCase() : 'L'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                  {formData.prenom} {formData.nom}
                </h3>
                <span className={`badge ${locataire.isActuel ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                  {locataire.isActuel ? 'Locataire Actuel' : 'Ancien Locataire'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {formData.profession || 'Profession non renseignée'} {formData.revenus_mensuels ? `• ${formatEuro(formData.revenus_mensuels)}/mois` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={`btn btn-sm ${isEditingQuick ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setIsEditingQuick(!isEditingQuick)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Icon name="edit" size={13} /> {isEditingQuick ? 'Consulter' : 'Modifier'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* ── CONTENU DU PROFIL OU MODE ÉDITION RAPIDE ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isEditingQuick ? (
            /* ── FORMULAIRE D'ÉDITION DIRECTE DU LOCATAIRE ── */
            <form onSubmit={handleQuickSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Prénom *</label>
                  <input
                    className="form-control"
                    required
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Nom *</label>
                  <input
                    className="form-control"
                    required
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Téléphone</label>
                  <input
                    className="form-control"
                    type="tel"
                    value={formData.telephone}
                    onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="06 xx xx xx xx"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemple.fr"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Profession / Situation</label>
                  <input
                    className="form-control"
                    value={formData.profession}
                    onChange={e => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="Ex: CDI, Cadre, Fonctionnaire"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Revenus Mensuels Nets (€)</label>
                  <input
                    type="number"
                    step="50"
                    className="form-control"
                    value={formData.revenus_mensuels}
                    onChange={e => setFormData({ ...formData, revenus_mensuels: e.target.value })}
                    placeholder="Ex: 2500"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Garant (Nom / Organisme)</label>
                  <input
                    className="form-control"
                    value={formData.garant_nom}
                    onChange={e => setFormData({ ...formData, garant_nom: e.target.value })}
                    placeholder="Nom du garant ou Visale"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Garant (Contact Tél / Email)</label>
                  <input
                    className="form-control"
                    value={formData.garant_contact}
                    onChange={e => setFormData({ ...formData, garant_contact: e.target.value })}
                    placeholder="06... ou garant@email.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Notes & Remarques</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes sur le locataire..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingQuick(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          ) : (
            /* ── VUE DE CONSULTATION DU PROFIL ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* 1. CARTOUCHES RAPIDES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                
                {/* Contact Rapide */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contact</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{formData.email || 'Email non renseigné'}</div>
                  <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, marginTop: 2 }}>{formData.telephone || 'Tél non renseigné'}</div>
                </div>

                {/* Revenus & Solvabilité */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Revenus & Solvabilité</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                    {formData.revenus_mensuels ? formatEuro(formData.revenus_mensuels) : 'Non précisé'}
                  </div>
                  {tauxEffort && (
                    <div style={{ fontSize: 11, color: tauxEffort <= 33 ? '#16a34a' : '#d97706', fontWeight: 600, marginTop: 2 }}>
                      Taux d'effort loyer : {tauxEffort}% {tauxEffort <= 33 ? '(Idéal < 33%)' : '(Élevé)'}
                    </div>
                  )}
                </div>

                {/* Logement actuel */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Logement</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{bien?.nom || locataire.bien_nom || 'Aucun logement'}</div>
                  {bail && (
                    <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600, marginTop: 2 }}>
                      Loyer : {formatEuro(loyerCC)}/mois
                    </div>
                  )}
                </div>

              </div>

              {/* 2. DÉTAILS DU LOGEMENT ET DU BAIL */}
              {bien && (
                <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="house" size={15} color="#4f46e5" />
                      Logement associé : {bien.nom}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onClose()
                        if (onNavigate) onNavigate('bien', bien.id)
                      }}
                      style={{ fontSize: 11 }}
                    >
                      Voir la fiche du bien →
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {bien.adresse || '—'} {bien.surface_m2 ? `• ${bien.surface_m2} m²` : ''}
                  </div>
                  {bail && (
                    <div style={{ marginTop: 8, fontSize: 12, display: 'flex', gap: 16, color: '#475569' }}>
                      <span><strong>Début du bail :</strong> {formatDate(bail.date_debut)}</span>
                      <span><strong>Type :</strong> {bail.type_bail === 'meuble' ? 'Meublé' : 'Nu'}</span>
                      <span><strong>Dépôt de garantie :</strong> {formatEuro(bail.depot_garantie || 0)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 3. GARANT ET PIÈCES DU DOSSIER */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Garant */}
                <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="shieldCheck" size={14} color="#16a34a" /> Garant & Caution
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}><strong>Nom :</strong> {formData.garant_nom || 'Aucun garant spécifié'}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}><strong>Contact :</strong> {formData.garant_contact || '—'}</div>
                </div>

                {/* Pièces dossier */}
                <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="fileText" size={14} color="#4f46e5" /> Dossier Locataire
                  </div>
                  {locataire.fichier_dossier ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenDoc(locataire.fichier_dossier)}
                      style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}
                    >
                      <Icon name="fileText" size={12} color="#4f46e5" /> Ouvrir le dossier PDF
                    </button>
                  ) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Aucun document joint</div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {formData.notes && (
                <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Notes & Remarques</div>
                  <div style={{ fontSize: 12, color: '#475569', whiteSpace: 'pre-line' }}>{formData.notes}</div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── FOOTER D'ACTIONS ── */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onEdit(locataire)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Icon name="edit" size={13} /> Modifier complet
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Fermer
            </button>

            {onOpenMail && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose()
                  const targetBienId = locataire.bien_id || (bien?.id)
                  if (targetBienId) {
                    onOpenMail(targetBienId, { recipientEmail: formData.email || '' })
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Icon name="mail" size={13} /> Envoyer un email
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
