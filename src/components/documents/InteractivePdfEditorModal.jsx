import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Icon from '../common/Icon'
import {
  getBiens,
  getBaux,
  getLocataires,
  savePdfToBien,
  openFilePath,
  terminateBail
} from '../../lib/db'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import { createPdfFromTemplate } from '../../lib/pdfTemplateCreator'
import { buildDataContext } from '../../lib/pdfTemplateEngine'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

export const DOC_TEMPLATES = [
  // ── 07_LOCATION ──
  {
    id: 'quittance',
    category: '07_LOCATION',
    subfolderMatch: ['quittances', 'loyer', 'recus'],
    defaultSubfolder: '07_LOCATION/Quittances de loyer',
    title: "Quittance de Loyer Mensuelle",
    desc: "Attestation de paiement intégral du loyer et des charges pour le mois concerné.",
    icon: 'receipt',
    color: '#2563eb',
    bg: '#eff6ff',
    badge: 'Quittance',
    templateName: 'modele_quittance.pdf'
  },
  {
    id: 'avis_echeance',
    category: '07_LOCATION',
    subfolderMatch: ['avis', 'echeance', 'appel'],
    defaultSubfolder: '07_LOCATION/Quittances de loyer',
    title: "Avis d'Échéance / Appel de Loyer",
    desc: "Appel de loyer avec montant exigible, date d'échéance et coordonnées bancaires (IBAN).",
    icon: 'fileText',
    color: '#0284c7',
    bg: '#f0f9ff',
    badge: 'Appel loyer',
    templateName: 'modele_avis_echeance.pdf'
  },
  {
    id: 'etat_des_lieux_entree',
    category: '07_LOCATION',
    subfolderMatch: ['etat_des_lieux', 'edl', 'entree'],
    defaultSubfolder: '07_LOCATION/Etat des lieux/Entree',
    title: "État des Lieux d'Entrée",
    desc: "Constat contradictoire d'arrivée, remise des clés et relevés compteurs.",
    icon: 'clipboardCheck',
    color: '#16a34a',
    bg: '#f0fdf4',
    badge: 'Entrée',
    templateName: 'modele_etat_des_lieux.pdf'
  },
  {
    id: 'etat_des_lieux_sortie',
    category: '07_LOCATION',
    subfolderMatch: ['etat_des_lieux', 'edl', 'sortie'],
    defaultSubfolder: '07_LOCATION/Etat des lieux/Sortie',
    title: "État des Lieux de Sortie",
    desc: "Constat de départ, restitution des clés et solde du dépôt de garantie.",
    icon: 'clipboardX',
    color: '#0891b2',
    bg: '#ecfeff',
    badge: 'Sortie',
    templateName: 'modele_etat_des_lieux.pdf'
  },
  {
    id: 'fin_bail',
    category: '07_LOCATION',
    subfolderMatch: ['fin_bail', 'caution', 'baux_anciens', 'cloture'],
    defaultSubfolder: '07_LOCATION/Etat des lieux/Sortie',
    title: "Attestation Fin de Bail & Caution",
    desc: "Lettre de clôture, libération des lieux, décompte retenues et solde net restitué.",
    icon: 'logOut',
    color: '#dc2626',
    bg: '#fef2f2',
    badge: 'Clôture',
    templateName: 'modele_fin_bail.pdf'
  },
  {
    id: 'contrat_bail',
    category: '07_LOCATION',
    subfolderMatch: ['bail', 'contrat', 'baux'],
    defaultSubfolder: '07_LOCATION/Baux',
    title: "Contrat de Location (Loi ALUR)",
    desc: "Bail officiel d'habitation meublé ou nu complet avec conditions financières et clauses légales.",
    icon: 'fileCheck',
    color: '#4f46e5',
    bg: '#eef2ff',
    badge: 'Bail ALUR',
    templateName: 'modele_contrat_bail.pdf'
  }
]

export const CATEGORIES = [
  { id: 'all', label: 'Tous les documents' },
  { id: '07_LOCATION', label: 'Location & Baux' },
  { id: '01_ADMINISTRATIF', label: 'Administratif & Propriété' }
]

export default function InteractivePdfEditorModal({
  document = null,
  initialBienId = null,
  targetSubfolder = null,
  onClose,
  onSaved
}) {
  const [step, setStep] = useState(document?.isNew ? 'select' : 'edit')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Données globales
  const [biens, setBiens] = useState([])
  const [baux, setBaux] = useState([])
  const [locataires, setLocataires] = useState([])
  const [selectedBienId, setSelectedBienId] = useState(initialBienId || '')

  // Modèle actif
  const [docType, setDocType] = useState('quittance')
  const [templateName, setTemplateName] = useState('modele_quittance.pdf')
  const [subfolder, setSubfolder] = useState(targetSubfolder || '07_LOCATION/Quittances de loyer')

  // Champs modifiables
  const [bailleurNom, setBailleurNom] = useState(localStorage.getItem('bailleur_nom') || 'Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState(localStorage.getItem('bailleur_adresse') || 'Adresse du bailleur')
  const [bailleurIban, setBailleurIban] = useState(localStorage.getItem('bailleur_iban') || 'FR76 3000 4000 5000 6000 7000 890')
  const [bailleurBic, setBailleurBic] = useState(localStorage.getItem('bailleur_bic') || 'BNPAFRPP')

  const [locataireNom, setLocataireNom] = useState('')
  const [locataireEmail, setLocataireEmail] = useState('')
  const [locataireTelephone, setLocataireTelephone] = useState('')

  const [bienNom, setBienNom] = useState('')
  const [bienAdresse, setBienAdresse] = useState('')
  const [bienSurface, setBienSurface] = useState('')
  const [bienPieces, setBienPieces] = useState('')

  const [loyerHC, setLoyerHC] = useState(680)
  const [charges, setCharges] = useState(70)
  const [depotGarantie, setDepotGarantie] = useState(680)
  const [montantRetenu, setMontantRetenu] = useState(0)
  const [motifRetenue, setMotifRetenue] = useState('')
  const [motifFin, setMotifFin] = useState('Départ convenu / Congé locataire')

  const [periode, setPeriode] = useState(() => {
    const d = new Date()
    return `${d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`
  })
  const [dateDoc, setDateDoc] = useState(todayISO())
  const [elecIndex, setElecIndex] = useState('')
  const [eauIndex, setEauIndex] = useState('')
  const [gazIndex, setGazIndex] = useState('')
  const [clesRemises, setClesRemises] = useState('2 jeux complets (porte + boîte aux lettres + badge)')
  const [syncTerminateLease, setSyncTerminateLease] = useState(true)

  // Aperçu PDF live
  const [pdfUrl, setPdfUrl] = useState(null)
  const [lastPdfBytes, setLastPdfBytes] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const debounceTimer = useRef(null)

  // Chargement initial
  useEffect(() => {
    Promise.all([
      getBiens().catch(() => []),
      getBaux().catch(() => []),
      getLocataires().catch(() => [])
    ]).then(([bi, ba, lo]) => {
      setBiens(bi || [])
      setBaux(ba || [])
      setLocataires(lo || [])

      const bid = selectedBienId || (bi && bi.length > 0 ? String(bi[0].id) : '')
      if (bid) setSelectedBienId(bid)
    })
  }, [])

  // Auto-remplissage selon le bien sélectionné
  useEffect(() => {
    if (!selectedBienId) return
    const currentBien = biens.find(b => String(b.id) === String(selectedBienId))
    const currentBail = baux.find(b => String(b.bien_id) === String(selectedBienId) && b.statut === 'actif') || baux.find(b => String(b.bien_id) === String(selectedBienId))
    const currentLocataire = currentBail ? locataires.find(l => String(l.id) === String(currentBail.locataire_id)) : null

    if (currentBien) {
      setBienNom(currentBien.nom || 'Logement')
      setBienAdresse(currentBien.adresse || '')
      setBienSurface(currentBien.surface_m2 ? `${currentBien.surface_m2} m²` : '')
      setBienPieces(currentBien.nb_pieces ? `${currentBien.nb_pieces} pièces` : '')
    }

    if (currentLocataire) {
      setLocataireNom(`${currentLocataire.prenom || ''} ${currentLocataire.nom || ''}`.trim())
      setLocataireEmail(currentLocataire.email || '')
      setLocataireTelephone(currentLocataire.telephone || '')
    } else if (currentBail) {
      setLocataireNom(`${currentBail.locataire_prenom || ''} ${currentBail.locataire_nom || ''}`.trim())
      setLocataireEmail(currentBail.locataire_email || '')
      setLocataireTelephone(currentBail.locataire_telephone || '')
    }

    if (currentBail) {
      setLoyerHC(currentBail.loyer_mensuel || 680)
      setCharges(currentBail.charges_mensuelles || 70)
      setDepotGarantie(currentBail.depot_garantie || 680)
    }
  }, [selectedBienId, biens, baux, locataires])

  // Sélection d'un modèle (Passe à l'étape 2)
  const handleSelectTemplate = (tpl) => {
    setDocType(tpl.id)
    setTemplateName(tpl.templateName)
    setSubfolder(tpl.defaultSubfolder)
    setStep('edit')
  }

  // Génération temps réel de l'aperçu PDF
  const updatePdfPreview = useCallback(async () => {
    const dataCtx = buildDataContext({
      bail: { loyer_mensuel: loyerHC, charges_mensuelles: charges, depot_garantie: depotGarantie, date_debut: dateDoc, date_fin: dateDoc },
      bien: { nom: bienNom, adresse: bienAdresse, surface_m2: bienSurface, nb_pieces: bienPieces },
      locataire: { nom: locataireNom, email: locataireEmail, telephone: locataireTelephone },
      periode,
      dateDoc,
      loyerHC,
      charges,
      depotGarantie,
      montantRetenu,
      motifRetenue,
      motifFin,
      elecIndex,
      eauIndex,
      gazIndex,
      clesRemises,
      bailleurNom,
      bailleurAdresse,
      bailleurIban,
      bailleurBic
    })

    try {
      const result = await createPdfFromTemplate({
        templatePdfName: templateName,
        dataContext: dataCtx
      })

      if (result?.blobUrl) {
        setPdfUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return result.blobUrl
        })
      }
      if (result?.doc) {
        const bytes = await result.doc.save()
        setLastPdfBytes(bytes)
      }
    } catch (err) {
      console.warn('Erreur aperçu PDF:', err)
    }
  }, [templateName, loyerHC, charges, depotGarantie, montantRetenu, motifRetenue, motifFin, periode, dateDoc, elecIndex, eauIndex, gazIndex, clesRemises, bailleurNom, bailleurAdresse, bailleurIban, bailleurBic, bienNom, bienAdresse, bienSurface, bienPieces, locataireNom, locataireEmail, locataireTelephone])

  useEffect(() => {
    if (step !== 'edit') return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      updatePdfPreview()
    }, 250)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [step, updatePdfPreview])

  // Sauvegarder dans le dossier du bien
  const handleSaveToProperty = async () => {
    if (!selectedBienId) {
      alert('Veuillez sélectionner un bien immobilier.')
      return
    }
    setSaving(true)
    try {
      const dataCtx = buildDataContext({
        bail: { loyer_mensuel: loyerHC, charges_mensuelles: charges, depot_garantie: depotGarantie, date_debut: dateDoc, date_fin: dateDoc },
        bien: { nom: bienNom, adresse: bienAdresse, surface_m2: bienSurface, nb_pieces: bienPieces },
        locataire: { nom: locataireNom, email: locataireEmail, telephone: locataireTelephone },
        periode,
        dateDoc,
        loyerHC,
        charges,
        depotGarantie,
        montantRetenu,
        motifRetenue,
        motifFin,
        elecIndex,
        eauIndex,
        gazIndex,
        clesRemises,
        bailleurNom,
        bailleurAdresse,
        bailleurIban,
        bailleurBic
      })

      const result = await createPdfFromTemplate({
        templatePdfName: templateName,
        dataContext: dataCtx
      })

      const dateClean = dateDoc ? dateDoc.replace(/-/g, '') : todayISO().replace(/-/g, '')
      const locClean = locataireNom ? locataireNom.replace(/[^a-zA-Z0-9]/g, '_') : 'Locataire'
      const finalFilename = `${docType.toUpperCase()}_${locClean}_${dateClean}.pdf`

      const currentBail = baux.find(b => String(b.bien_id) === String(selectedBienId) && b.statut === 'actif')
      if (docType === 'fin_bail' && syncTerminateLease && currentBail?.id) {
        const notesSum = `Fin de bail générée le ${dateDoc} | Motif : ${motifFin} | Retenue : ${montantRetenu || 0}€`
        await terminateBail(currentBail.id, dateDoc, motifFin, notesSum)
      }

      await savePdfToBien(
        parseInt(selectedBienId, 10),
        subfolder,
        finalFilename,
        result.dataUri,
        finalFilename.replace('.pdf', '')
      )

      setToastMsg('✅ Document enregistré et classé avec succès dans le dossier du bien !')
      setTimeout(() => {
        if (onSaved) onSaved()
        onClose()
      }, 1200)
    } catch (err) {
      alert(`Erreur d'enregistrement : ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  // Exporter sur le disque
  const handleExportPDF = async () => {
    if (!lastPdfBytes) return
    setExporting(true)
    try {
      const defaultName = `${docType}_${locataireNom ? locataireNom.replace(/\s+/g, '_') : 'document'}.pdf`
      const savePath = await openSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'Document PDF', extensions: ['pdf'] }]
      })
      if (savePath) {
        await writeFile(savePath, lastPdfBytes)
        setToastMsg('✅ PDF exporté avec succès !')
        setTimeout(() => setToastMsg(null), 3000)
      }
    } catch (e) {
      alert(`Erreur d'exportation : ${e.message || e}`)
    } finally {
      setExporting(false)
    }
  }

  // Filtre des cartes étape 1
  const filteredTemplates = useMemo(() => {
    return DOC_TEMPLATES.filter(t => {
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory
      const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchSearch
    })
  }, [selectedCategory, searchQuery])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        width: '94vw',
        maxWidth: 1280,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        {/* ─── EN-TÊTE DE LA MODALE ─── */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {step === 'edit' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStep('select')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Icon name="arrowLeft" size={14} />
                <span>← Changer de modèle</span>
              </button>
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                <Icon name="fileSignature" size={20} />
              </div>
            )}

            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {step === 'select' ? '1. Sélection du Document' : `2. Remplissage & Aperçu — ${DOC_TEMPLATES.find(t => t.id === docType)?.title || 'Document'}`}
              </h2>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                {step === 'select'
                  ? 'Choisissez le document officiel à générer parmi les modèles PDF harmonisés'
                  : 'Ajustez les informations ci-dessous et visualisez en direct le document final prêt à être archivé'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Bien :</span>
              <select
                value={selectedBienId}
                onChange={e => setSelectedBienId(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#fff'
                }}
              >
                {biens.map(b => (
                  <option key={b.id} value={b.id}>🏠 {b.nom}</option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid #cbd5e1', background: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
              }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* ─── CORPS SELON L'ÉTAPE ─── */}
        {step === 'select' ? (
          /* ═══════════════════════════════════════════════
             ÉTAPE 1 : GRILLE DE SÉLECTION DU DOCUMENT
             ═══════════════════════════════════════════════ */
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f8fafc' }}>
            {/* Barre de recherche et catégories */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontWeight: 700, fontSize: 12 }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: 280 }}>
                <input
                  type="text"
                  placeholder="Rechercher un document..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#fff'
                  }}
                />
                <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Icon name="search" size={14} />
                </div>
              </div>
            </div>

            {/* Grille des cartes de documents */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filteredTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    padding: 20,
                    border: '1.5px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    transition: 'all 0.18s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = tpl.color
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: tpl.bg, color: tpl.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon name={tpl.icon} size={22} />
                      </div>

                      <span style={{
                        fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 6,
                        background: tpl.bg, color: tpl.color
                      }}>
                        {tpl.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                      {tpl.title}
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                      {tpl.desc}
                    </p>
                  </div>

                  <div style={{
                    paddingTop: 12, borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 11.5, fontWeight: 700, color: tpl.color
                  }}>
                    <span>Rédiger et personnaliser</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════
             ÉTAPE 2 : FORMULAIRE D'ÉDITION & APERÇU LIVE
             ═══════════════════════════════════════════════ */
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* COLONNE GAUCHE (46%) : Formulaire de saisie dynamique */}
            <div style={{
              width: '46%',
              borderRight: '1px solid #e2e8f0',
              overflowY: 'auto',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: '#f8fafc'
            }}>
              {/* SECTION 1 : BAILLEUR */}
              <div style={{ background: '#ffffff', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="user" size={14} color="#4f46e5" /> 1. Bailleur / Propriétaire
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nom ou SCI</label>
                    <input
                      type="text"
                      className="form-control"
                      value={bailleurNom}
                      onChange={e => setBailleurNom(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Adresse</label>
                    <input
                      type="text"
                      className="form-control"
                      value={bailleurAdresse}
                      onChange={e => setBailleurAdresse(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2 : LOCATAIRE & LOGEMENT */}
              <div style={{ background: '#ffffff', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="users" size={14} color="#0284c7" /> 2. Locataire & Logement
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nom du Locataire</label>
                    <input
                      type="text"
                      className="form-control"
                      value={locataireNom}
                      onChange={e => setLocataireNom(e.target.value)}
                      style={{ fontSize: 12, fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Désignation Bien</label>
                    <input
                      type="text"
                      className="form-control"
                      value={bienNom}
                      onChange={e => setBienNom(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Adresse complète du logement</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bienAdresse}
                    onChange={e => setBienAdresse(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              {/* SECTION 3 : FINANCES & PAIEMENT */}
              <div style={{ background: '#ffffff', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="euro" size={14} color="#16a34a" /> 3. Conditions Financières
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Loyer HC (€)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={loyerHC}
                      onChange={e => setLoyerHC(parseFloat(e.target.value) || 0)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Charges (€)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={charges}
                      onChange={e => setCharges(parseFloat(e.target.value) || 0)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      {docType.includes('fin_bail') || docType.includes('sortie') ? 'Dépôt initial (€)' : 'Dépôt de garantie (€)'}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={depotGarantie}
                      onChange={e => setDepotGarantie(parseFloat(e.target.value) || 0)}
                      style={{ fontSize: 12 }}
                    />
                  </div>

                  {(docType.includes('fin_bail') || docType.includes('sortie')) && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: 4 }}>Retenue travaux (€)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={montantRetenu}
                        onChange={e => setMontantRetenu(parseFloat(e.target.value) || 0)}
                        style={{ fontSize: 12, borderColor: '#fca5a5' }}
                      />
                    </div>
                  )}
                </div>

                {/* Si fin de bail ou sortie : motif retenue & fin */}
                {(docType.includes('fin_bail') || docType.includes('sortie')) && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Motif fin de bail / Retenue</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Congé locataire / Nettoyage..."
                      value={motifFin}
                      onChange={e => setMotifFin(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                )}
              </div>

              {/* SECTION 4 : DATES, COMPTEURS & CLÉS */}
              <div style={{ background: '#ffffff', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="calendar" size={14} color="#f59e0b" /> 4. Dates & Éléments Techniques
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Période / Mois</label>
                    <input
                      type="text"
                      className="form-control"
                      value={periode}
                      onChange={e => setPeriode(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Date du document</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dateDoc}
                      onChange={e => setDateDoc(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Index Électricité (kWh)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: 14250"
                      value={elecIndex}
                      onChange={e => setElecIndex(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Index Eau (m³)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: 385"
                      value={eauIndex}
                      onChange={e => setEauIndex(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Clés & Accès remis</label>
                  <input
                    type="text"
                    className="form-control"
                    value={clesRemises}
                    onChange={e => setClesRemises(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* COLONNE DROITE (54%) : Aperçu PDF en temps réel */}
            <div style={{
              width: '54%',
              background: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}>
              {/* Barre d'actions supérieure */}
              <div style={{
                padding: '12px 18px',
                background: '#1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #334155',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ color: '#f8fafc', fontSize: 12, fontWeight: 700 }}>
                    Aperçu Direct du Document PDF
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportPDF}
                    disabled={exporting || !pdfUrl}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: '#475569',
                      color: '#ffffff',
                      fontSize: 11.5,
                      fontWeight: 700
                    }}
                  >
                    <Icon name="download" size={13} color="#ffffff" /> Exporter PDF
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveToProperty}
                    disabled={saving || !pdfUrl}
                    style={{
                      background: '#4f46e5',
                      borderColor: '#4f46e5',
                      fontSize: 11.5,
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
                    }}
                  >
                    <Icon name="save" size={13} color="#ffffff" /> Sauvegarder & Archiver
                  </button>
                </div>
              </div>

              {toastMsg && (
                <div style={{
                  background: toastMsg.startsWith('✅') ? '#059669' : '#dc2626',
                  color: '#ffffff',
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: 'center'
                }}>
                  {toastMsg}
                </div>
              )}

              {/* Rendu iFrame du PDF */}
              <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                    title="Document Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13 }}>
                    Génération de l'aperçu PDF en cours...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
