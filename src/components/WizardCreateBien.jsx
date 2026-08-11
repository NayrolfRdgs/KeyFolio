import React, { useState } from 'react'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { createBienWizard } from '../lib/db'
import { SUBFOLDERS } from '../lib/utils'
import Icon from './Icon'

// Étapes dynamiques selon le type d'occupation
function getSteps(occupation) {
  if (occupation === 'location') {
    return [
      { num: 1, label: '1. Informations' },
      { num: 2, label: '2. Occupation' },
      { num: 3, label: '3. Locataire & Bail' },
      { num: 4, label: '4. Documents' },
      { num: 5, label: '5. Récapitulatif' },
    ]
  }
  return [
    { num: 1, label: '1. Informations' },
    { num: 2, label: '2. Occupation' },
    { num: 3, label: '3. Documents' },
    { num: 4, label: '4. Récapitulatif' },
  ]
}

export default function WizardCreateBien({ onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Étape 1 : Infos bien
  const [bien, setBien] = useState({
    nom: '', adresse: '', type_bien: 'location', statut: 'en_cours',
    chemin_dossier: '', email_dedie: '', date_acquisition: '', surface_m2: '', notes: ''
  })

  // Étape 2 : Occupation
  const [occupation, setOccupation] = useState('location')

  // Étape 3 : Locataire & Bail (seulement si location)
  const [locataire, setLocataire] = useState({
    nom: '', prenom: '', telephone: '', email: '', garant_nom: '', garant_contact: '', notes: ''
  })
  const [bail, setBail] = useState({
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '', loyer_mensuel: '650', charges_mensuelles: '50',
    depot_garantie: '650', jour_paiement: 5, statut: 'actif', fichier_bail: ''
  })

  // Documents initiaux
  const [initialDocs, setInitialDocs] = useState([])
  const [uploadSubfolder, setUploadSubfolder] = useState(SUBFOLDERS[0]?.id || '01_ADMINISTRATIF')
  const [docType, setDocType] = useState('diagnostic')

  const isLocation = occupation === 'location'
  const steps = getSteps(occupation)
  const maxStep = steps.length

  // Calcul de l'étape logique réelle (1-indexée dans les étapes affichées)
  const displayStep = steps.findIndex((s) => s.num === step) + 1

  const handlePickInitialDoc = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        title: 'Sélectionner un document initial pour le bien'
      })
      if (selected) {
        setInitialDocs([...initialDocs, {
          source_path: selected,
          subfolder: uploadSubfolder,
          type_doc: docType
        }])
      }
    } catch (err) {
      console.warn('Dialog cancel', err)
    }
  }

  const removeDoc = (idx) => {
    setInitialDocs(initialDocs.filter((_, i) => i !== idx))
  }

  const handleNext = () => {
    if (step === 1 && !bien.nom.trim()) {
      setError('Le nom du bien est obligatoire.')
      return
    }
    setError(null)

    if (isLocation) {
      // Étapes : 1 → 2 → 3 → 4 → 5
      setStep(s => s + 1)
    } else {
      // Pas d'étape 3 (locataire/bail) pour résidence principale ou vacant
      // Étapes affichées : 1 → 2 → (saute 3) → 4 → 5
      if (step === 2) {
        setStep(4) // Sauter l'étape 3
      } else {
        setStep(s => s + 1)
      }
    }
  }

  const handleBack = () => {
    setError(null)
    if (!isLocation && step === 4) {
      setStep(2) // Sauter l'étape 3 en arrière aussi
    } else {
      setStep(s => s - 1)
    }
  }

  // Étape finale = étape 5 si location, étape 5 aussi (mais step=4 affiché comme récap)
  const isFinalStep = isLocation ? step === 5 : step === 5

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        bien: {
          ...bien,
          surface_m2: bien.surface_m2 !== '' ? parseFloat(bien.surface_m2) : null,
          type_bien: isLocation ? 'location' : (occupation === 'residence_principale' ? 'residence_principale' : 'location')
        },
        locataire: isLocation && locataire.nom.trim() ? locataire : null,
        bail: isLocation && locataire.nom.trim() ? {
          ...bail,
          bien_id: 0,
          locataire_id: 0,
          loyer_mensuel: parseFloat(bail.loyer_mensuel || 0),
          charges_mensuelles: parseFloat(bail.charges_mensuelles || 0),
          depot_garantie: parseFloat(bail.depot_garantie || 0),
          jour_paiement: parseInt(bail.jour_paiement || 5, 10)
        } : null,
        documents: initialDocs
      }

      await createBienWizard(payload)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  // Contenu affiché en fonction de l'étape courante
  const renderStepContent = () => {
    switch (step) {
      // ─── ÉTAPE 1 : INFOS GÉNÉRALES ─────────────────────────────
      case 1:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Nom du bien *</label>
              <input
                type="text" className="form-control"
                placeholder="ex: Appt T3 Centre-Ville, Le Puits..."
                value={bien.nom}
                onChange={e => setBien({ ...bien, nom: e.target.value })}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Adresse complète</label>
              <input
                type="text" className="form-control"
                placeholder="ex: 12 Rue de la Paix, 75001 Paris"
                value={bien.adresse}
                onChange={e => setBien({ ...bien, adresse: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Type de bien</label>
              <select className="form-control" value={bien.type_bien} onChange={e => setBien({ ...bien, type_bien: e.target.value })}>
                <option value="location">Appartement / Maison en location</option>
                <option value="residence_principale">Résidence principale</option>
                <option value="secondaire">Résidence secondaire</option>
              </select>
            </div>
            <div className="form-group">
              <label>Surface (m²)</label>
              <input
                type="number" step="0.1" className="form-control"
                placeholder="ex: 64.5"
                value={bien.surface_m2}
                onChange={e => setBien({ ...bien, surface_m2: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Date d'acquisition</label>
              <input
                type="date" className="form-control"
                value={bien.date_acquisition}
                onChange={e => setBien({ ...bien, date_acquisition: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email dédié (optionnel)</label>
              <input
                type="email" className="form-control"
                placeholder="bien-12paix@domaine.com"
                value={bien.email_dedie}
                onChange={e => setBien({ ...bien, email_dedie: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Notes & observations</label>
              <textarea
                className="form-control" rows={2}
                placeholder="Remarques particulières..."
                value={bien.notes}
                onChange={e => setBien({ ...bien, notes: e.target.value })}
              />
            </div>
          </div>
        )

      // ─── ÉTAPE 2 : OCCUPATION ───────────────────────────────────
      case 2:
        return (
          <div>
            <h4 style={{ marginTop: 0 }}>Régime d'occupation actuel</h4>
            <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 20 }}>
              Votre choix détermine les étapes suivantes. Seule la location nécessite la saisie d'un locataire et d'un bail.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {[
                {
                  id: 'location',
                  title: 'En location',
                  desc: 'Bien loué à un locataire — les étapes Locataire & Bail s\'ajoutent.',
                  icon: '🔑',
                  next: '→ Étape Locataire & Bail'
                },
                {
                  id: 'residence_principale',
                  title: 'Résidence principale',
                  desc: 'Occupé par vous-même — pas de locataire ni de bail.',
                  icon: '🏡',
                  next: '→ Directement aux Documents'
                },
                {
                  id: 'vacant',
                  title: 'Vacant',
                  desc: 'En attente de location ou en travaux — aucun locataire pour le moment.',
                  icon: '⏳',
                  next: '→ Directement aux Documents'
                },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setOccupation(opt.id)}
                  style={{
                    border: occupation === opt.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: occupation === opt.id ? 'rgba(99, 102, 241, 0.08)' : 'var(--color-bg)',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{opt.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 8 }}>{opt.desc}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                    color: occupation === opt.id ? 'var(--color-accent)' : 'var(--color-muted)',
                    borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 4
                  }}>
                    {opt.next}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      // ─── ÉTAPE 3 : LOCATAIRE & BAIL (location seulement) ────────
      case 3:
        return (
          <div>
            <h4 style={{ marginTop: 0 }}>Profil du locataire & Conditions du bail</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 10, padding: '6px 10px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 4 }}>
                  👤 Locataire principal
                </div>
              </div>
              <div className="form-group">
                <label>Nom locataire *</label>
                <input type="text" className="form-control" placeholder="Dupont" value={locataire.nom} onChange={e => setLocataire({ ...locataire, nom: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Prénom locataire *</label>
                <input type="text" className="form-control" placeholder="Jean" value={locataire.prenom} onChange={e => setLocataire({ ...locataire, prenom: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input type="text" className="form-control" placeholder="06 12 34 56 78" value={locataire.telephone} onChange={e => setLocataire({ ...locataire, telephone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" placeholder="jean.dupont@email.com" value={locataire.email} onChange={e => setLocataire({ ...locataire, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nom du garant</label>
                <input type="text" className="form-control" placeholder="Garant (ex: Dupont Marie)" value={locataire.garant_nom} onChange={e => setLocataire({ ...locataire, garant_nom: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Contact du garant</label>
                <input type="text" className="form-control" placeholder="Tél / Email du garant" value={locataire.garant_contact} onChange={e => setLocataire({ ...locataire, garant_contact: e.target.value })} />
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 10, padding: '6px 10px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 4 }}>
                  📋 Conditions du bail
                </div>
              </div>
              <div className="form-group">
                <label>Date de début de bail</label>
                <input type="date" className="form-control" value={bail.date_debut} onChange={e => setBail({ ...bail, date_debut: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date de fin (optionnel)</label>
                <input type="date" className="form-control" value={bail.date_fin} onChange={e => setBail({ ...bail, date_fin: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Loyer mensuel hors charges (€)</label>
                <input type="number" className="form-control" value={bail.loyer_mensuel} onChange={e => setBail({ ...bail, loyer_mensuel: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Charges mensuelles (€)</label>
                <input type="number" className="form-control" value={bail.charges_mensuelles} onChange={e => setBail({ ...bail, charges_mensuelles: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Dépôt de garantie (€)</label>
                <input type="number" className="form-control" value={bail.depot_garantie} onChange={e => setBail({ ...bail, depot_garantie: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Jour de paiement du loyer</label>
                <input type="number" min="1" max="28" className="form-control" value={bail.jour_paiement} onChange={e => setBail({ ...bail, jour_paiement: e.target.value })} />
              </div>
            </div>
          </div>
        )

      // ─── ÉTAPE 4 : DOCUMENTS & ARBORESCENCE ─────────────────────
      case 4:
        return (
          <div>
            <h4 style={{ marginTop: 0 }}>Arborescence et documents de départ</h4>
            <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
              L'arborescence physique complète sera créée automatiquement. Vous pouvez déposer des premiers documents maintenant ou plus tard.
            </p>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--color-bg-subtle)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12 }}>Sous-dossier de destination</label>
                <select
                  className="form-control"
                  value={uploadSubfolder}
                  onChange={e => setUploadSubfolder(e.target.value)}
                >
                  {SUBFOLDERS.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12 }}>Type de document</label>
                <select className="form-control" value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="diagnostic">Diagnostic DDT</option>
                  <option value="bail">Bail signé</option>
                  <option value="assurance">Assurance PNO</option>
                  <option value="facture">Facture / Travaux</option>
                  <option value="photo">Photo / État des lieux</option>
                  <option value="autre">Autre document</option>
                </select>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handlePickInitialDoc}>
                <Icon name="plus" size={14} /> Choisir fichier
              </button>
            </div>

            {initialDocs.length > 0 ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Fichier</th><th>Destination</th><th>Type</th><th></th></tr>
                  </thead>
                  <tbody>
                    {initialDocs.map((doc, idx) => (
                      <tr key={idx}>
                        <td className="fw-600">{doc.source_path.split(/[/\\]/).pop()}</td>
                        <td className="text-muted" style={{ fontSize: 11 }}>{doc.subfolder}</td>
                        <td><span className="badge badge-info">{doc.type_doc}</span></td>
                        <td>
                          <button type="button" className="btn btn-ghost btn-icon text-danger" onClick={() => removeDoc(idx)}>
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, border: '1px dashed var(--color-border)', borderRadius: 6, color: 'var(--color-muted)', fontSize: 13 }}>
                Aucun document ajouté — vous pourrez en déposer à tout moment dans l'explorateur de documents.
              </div>
            )}
          </div>
        )

      // ─── ÉTAPE 5 : RÉCAPITULATIF ────────────────────────────────
      case 5:
        return (
          <div>
            <h4 style={{ marginTop: 0 }}>Récapitulatif avant création finale</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ background: 'var(--color-bg-subtle)', padding: 14, borderRadius: 8, borderLeft: '3px solid var(--color-accent)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>🏠 Bien</div>
                <div><strong>{bien.nom}</strong> {bien.surface_m2 ? `— ${bien.surface_m2} m²` : ''}</div>
                <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{bien.adresse || 'Adresse non renseignée'}</div>
              </div>

              <div style={{ background: 'var(--color-bg-subtle)', padding: 14, borderRadius: 8, borderLeft: '3px solid var(--color-success)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {occupation === 'location' ? '🔑 En location' : occupation === 'residence_principale' ? '🏡 Résidence principale' : '⏳ Vacant'}
                </div>
                {isLocation && locataire.nom && (
                  <div style={{ fontSize: 13 }}>
                    <strong>Locataire :</strong> {locataire.nom} {locataire.prenom}
                    {locataire.telephone && <span style={{ color: 'var(--color-muted)' }}> — {locataire.telephone}</span>}
                    <br />
                    <strong>Loyer :</strong> {bail.loyer_mensuel} € + {bail.charges_mensuelles} € charges
                    <span style={{ color: 'var(--color-muted)' }}> — DG: {bail.depot_garantie} €</span>
                    <br />
                    <strong>Début du bail :</strong> {bail.date_debut}
                  </div>
                )}
                {isLocation && !locataire.nom && (
                  <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>Locataire non renseigné — pourra être ajouté plus tard.</div>
                )}
              </div>

              <div style={{ background: 'var(--color-bg-subtle)', padding: 14, borderRadius: 8, borderLeft: '3px solid #F59E0B' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>📁 Fichiers Excel auto-générés</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  Fiche_Bien.xlsx &nbsp;·&nbsp; Suivi_Loyers.xlsx &nbsp;·&nbsp; Suivi_Depenses.xlsx &nbsp;·&nbsp; Locataires_Baux.xlsx
                </div>
              </div>

              {initialDocs.length > 0 && (
                <div style={{ background: 'var(--color-bg-subtle)', padding: 14, borderRadius: 8, borderLeft: '3px solid #10B981' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>📄 {initialDocs.length} document(s) à copier</div>
                  {initialDocs.map((d, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                      {d.source_path.split(/[/\\]/).pop()} → {d.subfolder}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 760, width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Assistant de création de bien</h3>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              Étape {displayStep} sur {maxStep}
              {step === 2 && !isLocation && (
                <span style={{ marginLeft: 8, color: 'var(--color-accent)', fontWeight: 600 }}>
                  — L'étape Locataire & Bail sera ignorée
                </span>
              )}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} type="button"><Icon name="x" size={18} /></button>
        </div>

        {/* Stepper dynamique */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <div
              key={s.num}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                textAlign: 'center',
                background: s.num === step ? 'var(--color-accent)'
                  : s.num < step ? 'rgba(99, 102, 241, 0.15)'
                  : 'var(--color-bg-subtle)',
                color: s.num === step ? '#fff'
                  : s.num < step ? 'var(--color-accent)'
                  : 'var(--color-muted)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {s.num < step ? '✓ ' : ''}{s.label}
            </div>
          ))}
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

        {/* Corps de l'étape — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {renderStepContent()}
        </div>

        {/* Boutons navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={loading}>
              ← Précédent
            </button>
          ) : <div />}

          {!isFinalStep ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Suivant →
            </button>
          ) : (
            <button type="button" className="btn btn-success" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Création & Génération Excel...' : '✅ Créer le bien & Générer les fichiers'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
