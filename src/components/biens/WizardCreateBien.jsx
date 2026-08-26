import React, { useState } from 'react'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { createBienWizard } from '../../lib/db'
import { SUBFOLDERS } from '../../lib/utils'
import Icon from '../common/Icon'
import { geocodeAddress } from '../../lib/geocoding'
import Step1BienInfo from './wizard/Step1BienInfo'
import Step2ModeOccupation from './wizard/Step2ModeOccupation'
import Step3LocataireBail from './wizard/Step3LocataireBail'
import Step4Documents from './wizard/Step4Documents'
import Step5Recapitulatif from './wizard/Step5Recapitulatif'

function getSteps(occupation) {
  if (occupation === 'location') {
    return [
      { num: 1, label: '1. Informations' },
      { num: 2, label: '2. Exploitation' },
      { num: 3, label: '3. Locataire & Bail' },
      { num: 4, label: '4. Documents' },
      { num: 5, label: '5. Récapitulatif' },
    ]
  }
  return [
    { num: 1, label: '1. Informations' },
    { num: 2, label: '2. Statut & Projet' },
    { num: 3, label: '3. Documents' },
    { num: 4, label: '4. Récapitulatif' },
  ]
}

export default function WizardCreateBien({ onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Étape 1 : Infos bien & caractéristiques
  const [bien, setBien] = useState({
    nom: '',
    adresse: '',
    type_bien: 'Appartement',
    statut: 'en_cours',
    chemin_dossier: '',
    email_dedie: '',
    date_acquisition: '',
    surface_m2: '',
    valeur_estimee: '',
    nb_pieces: '',
    nb_chambres: '',
    nb_salles_bain: '',
    surface_terrain: '',
    annee_construction: '',
    classe_energetique: 'D',
    notes: '',
    phase_actuelle: 'Étude / Conception',
    pourcentage_avancement: 0,
    date_livraison_prevue: '',
    budget_prevision: ''
  })

  // Étape 2 : Mode d'exploitation
  const [occupation, setOccupation] = useState('location')

  // Étape 3 : Locataire & Bail
  const [locataire, setLocataire] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    revenus_mensuels: '',
    profession: '',
    garant_nom: '',
    garant_contact: '',
    notes: '',
    fichier_dossier: ''
  })

  const [bail, setBail] = useState({
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    type_bail: 'meuble',
    loyer_mensuel: '650',
    charges_mensuelles: '50',
    depot_garantie: '650',
    statut_garantie: 'encaissee',
    jour_paiement: 5,
    statut: 'actif',
    clause_irl: true,
    fichier_bail: ''
  })

  // Documents initiaux
  const [initialDocs, setInitialDocs] = useState([])
  const [uploadSubfolder, setUploadSubfolder] = useState(SUBFOLDERS[0]?.id || '01_ADMINISTRATIF')
  const [docType, setDocType] = useState('diagnostic')

  const isLocation = occupation === 'location'
  const isProjet = occupation === 'projet'
  const steps = getSteps(occupation)
  const maxStep = steps.length
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
      setStep(s => s + 1)
    } else {
      if (step === 2) {
        setStep(4) // Sauter l'étape locataire
      } else {
        setStep(s => s + 1)
      }
    }
  }

  const handleBack = () => {
    setError(null)
    if (!isLocation && step === 4) {
      setStep(2)
    } else {
      setStep(s => s - 1)
    }
  }

  const isFinalStep = isLocation ? step === 5 : step === 4

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const initialStatut = occupation === 'projet'
        ? 'projet'
        : occupation === 'residence_principale'
        ? 'residence_principale'
        : occupation === 'residence_secondaire'
        ? 'residence_secondaire'
        : (isLocation && locataire.nom.trim() ? 'en_cours' : 'vacant')

      let coords = null
      if (bien.adresse && bien.adresse.trim()) {
        coords = await geocodeAddress(bien.adresse)
      }

      const payload = {
        bien: {
          ...bien,
          surface_m2: bien.surface_m2 !== '' ? parseFloat(bien.surface_m2) : null,
          valeur_estimee: bien.valeur_estimee !== '' ? parseFloat(bien.valeur_estimee) : null,
          budget_prevision: bien.budget_prevision !== '' ? parseFloat(bien.budget_prevision) : null,
          pourcentage_avancement: bien.pourcentage_avancement !== '' ? parseInt(bien.pourcentage_avancement, 10) : 0,
          nb_pieces: bien.nb_pieces !== '' ? parseInt(bien.nb_pieces, 10) : null,
          nb_chambres: bien.nb_chambres !== '' ? parseInt(bien.nb_chambres, 10) : null,
          nb_salles_bain: bien.nb_salles_bain !== '' ? parseInt(bien.nb_salles_bain, 10) : null,
          surface_terrain: bien.surface_terrain !== '' ? parseFloat(bien.surface_terrain) : null,
          annee_construction: bien.annee_construction !== '' ? parseInt(bien.annee_construction, 10) : null,
          latitude: coords?.lat || (bien.latitude ? parseFloat(bien.latitude) : null),
          longitude: coords?.lon || (bien.longitude ? parseFloat(bien.longitude) : null),
          type_bien: bien.type_bien || 'Appartement',
          statut: initialStatut
        },
        locataire: isLocation && locataire.nom.trim() ? {
          ...locataire,
          revenus_mensuels: locataire.revenus_mensuels ? parseFloat(locataire.revenus_mensuels) : null
        } : null,
        bail: isLocation && locataire.nom.trim() ? {
          ...bail,
          bien_id: 0,
          locataire_id: 0,
          loyer_mensuel: parseFloat(bail.loyer_mensuel || 0),
          charges_mensuelles: parseFloat(bail.charges_mensuelles || 0),
          depot_garantie: parseFloat(bail.depot_garantie || 0),
          jour_paiement: parseInt(bail.jour_paiement || 5, 10)
        } : null,
        documents: initialDocs,
        champs_libres: [
          { cle: 'mode_occupation', valeur: occupation }
        ]
      }

      await createBienWizard(payload)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div
        className="modal-box"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 820,
          maxHeight: '92vh',
          boxShadow: '0 24px 50px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* En-tête */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 3px 8px rgba(79, 70, 229, 0.3)'
              }}
            >
              <Icon name="house" size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Création de Bien & Projet Immobilier
              </h3>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Assistant pas-à-pas • Étape {displayStep} sur {maxStep}
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 24px 8px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {steps.map((s) => {
            const isActive = s.num === step
            const isCompleted = s.num < step
            return (
              <div
                key={s.num}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 600,
                  textAlign: 'center',
                  background: isActive ? '#4f46e5' : isCompleted ? 'rgba(79, 70, 229, 0.12)' : '#ffffff',
                  color: isActive ? '#ffffff' : isCompleted ? '#4f46e5' : '#64748b',
                  border: isActive ? '1px solid #4f46e5' : isCompleted ? '1px solid rgba(79, 70, 229, 0.2)' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5
                }}
              >
                {isCompleted && <span>✓</span>}
                <span>{s.label}</span>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="alert alert-danger" style={{ margin: '12px 24px 0 24px' }}>
            {error}
          </div>
        )}

        {/* Contenu de l'étape */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && (
            <Step1BienInfo bien={bien} setBien={setBien} />
          )}

          {step === 2 && (
            <Step2ModeOccupation
              occupation={occupation}
              setOccupation={setOccupation}
              isProjet={isProjet}
              bien={bien}
              setBien={setBien}
            />
          )}

          {step === 3 && isLocation && (
            <Step3LocataireBail
              locataire={locataire}
              setLocataire={setLocataire}
              bail={bail}
              setBail={setBail}
            />
          )}

          {step === 4 && (
            <Step4Documents
              uploadSubfolder={uploadSubfolder}
              setUploadSubfolder={setUploadSubfolder}
              docType={docType}
              setDocType={setDocType}
              initialDocs={initialDocs}
              onPickDoc={handlePickInitialDoc}
              onRemoveDoc={removeDoc}
            />
          )}

          {isFinalStep && (
            <Step5Recapitulatif
              bien={bien}
              occupation={occupation}
              isLocation={isLocation}
              isProjet={isProjet}
              locataire={locataire}
              bail={bail}
            />
          )}
        </div>

        {/* Footer */}
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
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={loading}>
              ← Précédent
            </button>
          ) : (
            <div />
          )}

          {!isFinalStep ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Suivant →
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ background: '#16a34a', borderColor: '#16a34a' }}>
              {loading ? 'Création & Initialisation...' : '✓ Créer le bien & Initialiser les dossiers'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
