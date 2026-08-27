import React, { useEffect, useState, useMemo } from 'react'
import {
  getBiens,
  getBaux,
  getLocataires,
  generateQuestionnaireExcel,
  savePdfToBien,
  openFilePath,
  openTemplatesFolder,
  terminateBail
} from '../../lib/db'
import {
  buildQuittancePDF,
  buildContratBailPDF,
  buildEtatDesLieuxPDF,
  buildFinBailLetterPDF,
  buildAvisEcheancePDF
} from '../../lib/pdfGenerator'
import { buildDataContext } from '../../lib/pdfTemplateEngine'
import { createPdfFromTemplate } from '../../lib/pdfTemplateCreator'
import { SUBFOLDERS, todayISO, formatEuro, formatDate } from '../../lib/utils'
import Icon from '../common/Icon'

const ALL_TEMPLATES = [
  // ─── DOCUMENTS PDF OFFICIELS ───
  {
    id: 'pdf_quittance',
    format: 'pdf',
    category: '07_LOCATION',
    categoryLabel: 'Location & Baux',
    title: 'Quittance de Loyer Mensuelle',
    desc: 'Document officiel attestant du paiement intégral du loyer et des charges pour le mois concerné.',
    defaultSubfolder: '07_LOCATION/Quittances de loyer',
    filename: 'Quittance_Loyer.pdf',
    badge: 'PDF Officiel',
    iconName: 'receipt',
    templatePdf: 'modele_quittance.pdf'
  },
  {
    id: 'pdf_avis_echeance',
    format: 'pdf',
    category: '07_LOCATION',
    categoryLabel: 'Location & Baux',
    title: 'Avis d\'Échéance / Appel de Loyer',
    desc: 'Appel de loyer mensuel formel adressé au locataire avec date limite de règlement et coordonnées RIB.',
    defaultSubfolder: '07_LOCATION/Quittances de loyer',
    filename: 'Avis_Echeance_Loyer.pdf',
    badge: 'PDF Officiel',
    iconName: 'fileText',
    templatePdf: 'modele_avis_echeance.pdf'
  },
  {
    id: 'pdf_edl_entree',
    format: 'pdf',
    category: '07_LOCATION',
    categoryLabel: 'Location & Baux',
    title: 'État des Lieux Contradictoire d\'Entrée',
    desc: 'Inventaire complet d\'arrivée, remise des clés et relevé des index compteurs à l\'entrée.',
    defaultSubfolder: '07_LOCATION/Etat des lieux/Entree',
    filename: 'Etat_des_lieux_entree.pdf',
    badge: 'PDF Officiel',
    iconName: 'fileSignature',
    templatePdf: 'modele_etat_des_lieux.pdf'
  },
  {
    id: 'pdf_edl_sortie',
    format: 'pdf',
    category: '07_LOCATION',
    categoryLabel: 'Location & Baux',
    title: 'État des Lieux Contradictoire de Sortie',
    desc: 'Inventaire contradictoire de départ, restitution des clés et solde du dépôt de garantie.',
    defaultSubfolder: '07_LOCATION/Etat des lieux/Sortie',
    filename: 'Etat_des_lieux_sortie.pdf',
    badge: 'PDF Officiel',
    iconName: 'fileSignature',
    templatePdf: 'modele_etat_des_lieux.pdf'
  },
  {
    id: 'pdf_fin_bail',
    format: 'pdf',
    category: '07_LOCATION',
    categoryLabel: 'Location & Baux',
    title: 'Attestation de Fin de Bail & Caution',
    desc: 'Lettre de clôture de contrat, libération des lieux, décompte de caution et solde de tout compte.',
    defaultSubfolder: '07_LOCATION/Etat des lieux/Sortie',
    filename: 'Attestation_Fin_Bail.pdf',
    badge: 'Fin de contrat',
    iconName: 'logOut',
    templatePdf: 'modele_fin_bail.pdf'
  },
  {
    id: 'pdf_contrat_bail',
    format: 'pdf',
    category: '07_LOCATION',
    categoryLabel: 'Location & Baux',
    title: 'Contrat de Location Type (Loi ALUR)',
    desc: 'Bail d\'habitation officiel meublé ou non meublé complet avec clauses légales.',
    defaultSubfolder: '07_LOCATION/Baux',
    filename: 'Contrat_de_Location.pdf',
    badge: 'PDF Conforme',
    iconName: 'fileText',
    templatePdf: 'modele_contrat_bail.pdf'
  },

  // ─── TABLEURS EXCEL (.XLSX) ───
  {
    id: 'xlsx_tresorerie_travaux',
    format: 'xlsx',
    category: '05_TRAVAUX',
    categoryLabel: 'Travaux & Chantiers',
    title: 'Trésorerie & Échéancier de Travaux',
    desc: 'Suivi des devis signés, acomptes versés, échéances futures et solde restant dû aux artisans.',
    defaultSubfolder: '05_TRAVAUX/Factures travaux',
    filename: 'Tresorerie_Travaux.xlsx',
    badge: 'Excel Tableur',
    iconName: 'fileSpreadsheet',
    headers: ['Date', 'Artisan / Entreprise', 'Poste de travaux', 'Montant Devis (€)', 'Acompte Versé (€)', 'Reste à Payer (€)', 'Échéance'],
    sampleRows: [
      ['2026-03-10', 'EURL Plomberie Martin', 'Rénovation Salle de Bain', '4500.00', '1500.00', '3000.00', '2026-04-15'],
      ['2026-03-15', 'Électricité Dupont', 'Mise aux normes tableau', '1800.00', '600.00', '1200.00', '2026-04-30']
    ]
  },
  {
    id: 'xlsx_depenses_charges',
    format: 'xlsx',
    category: '03_COPROPRIETE',
    categoryLabel: 'Copropriété & Charges',
    title: 'Grand Livre des Dépenses & Charges',
    desc: 'Répartition annuelle des charges déductibles, non déductibles et récupérables auprès du locataire.',
    defaultSubfolder: '03_COPROPRIETE/Charges',
    filename: 'Depenses_et_Charges.xlsx',
    badge: 'Excel Tableur',
    iconName: 'fileSpreadsheet',
    headers: ['Date', 'Catégorie', 'Fournisseur / Syndic', 'Libellé', 'Montant TTC (€)', 'Récupérable Locataire', 'Déductible Fiscal'],
    sampleRows: [
      ['2026-01-15', 'Syndic', 'Cabinet Immoplus', 'Appel de fonds T1 2026', '350.00', 'Oui', 'Oui'],
      ['2026-02-10', 'Assurance', 'AssurLogement', 'Assurance PNO annuelle', '180.00', 'Non', 'Oui']
    ]
  },
  {
    id: 'xlsx_suivi_loyers',
    format: 'xlsx',
    category: '07_LOCATION',
    categoryLabel: 'Location & Baux',
    title: 'Suivi Annuel des Encaissements de Loyers',
    desc: 'Tableau de bord récapitulatif des loyers payés, retards, impayés et régularisations annuelles.',
    defaultSubfolder: '07_LOCATION/Quittances de loyer',
    filename: 'Suivi_Encaissements_Loyers.xlsx',
    badge: 'Excel Tableur',
    iconName: 'fileSpreadsheet',
    headers: ['Mois', 'Locataire', 'Loyer HC (€)', 'Charges (€)', 'Total Dû (€)', 'Date Règlement', 'Montant Reçu (€)', 'Solde (€)'],
    sampleRows: [
      ['Janvier 2026', 'Thomas Bernard', '680.00', '70.00', '750.00', '2026-01-05', '750.00', '0.00'],
      ['Février 2026', 'Thomas Bernard', '680.00', '70.00', '750.00', '2026-02-04', '750.00', '0.00']
    ]
  }
]

export default function DocumentGeneratorModal({
  initialBienId = null,
  targetSubfolder = null,
  onClose,
  onSuccess
}) {
  const [biens, setBiens] = useState([])
  const [baux, setBaux] = useState([])
  const [locataires, setLocataires] = useState([])
  const [bienId, setBienId] = useState(initialBienId || '')

  // Filtre format & catégorie
  const [formatFilter, setFormatFilter] = useState('all') // 'all' | 'pdf' | 'xlsx'
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [subfolder, setSubfolder] = useState(targetSubfolder || '07_LOCATION')
  const [filename, setFilename] = useState('')
  const [customTitle, setCustomTitle] = useState('')

  // ─── Informations Personnalisables ───
  const [bailleurNom, setBailleurNom] = useState('Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState('Adresse du bailleur')
  const [selectedBailId, setSelectedBailId] = useState('')
  const [dateDoc, setDateDoc] = useState(todayISO())
  const [periode, setPeriode] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [montantLoyer, setMontantLoyer] = useState('')
  const [montantCharges, setMontantCharges] = useState('')
  const [depotGarantie, setDepotGarantie] = useState('')
  const [montantRetenu, setMontantRetenu] = useState('')
  const [motifRetenue, setMotifRetenue] = useState('')
  const [motifFin, setMotifFin] = useState('Congé donné par le locataire')
  const [elecIndex, setElecIndex] = useState('')
  const [eauIndex, setEauIndex] = useState('')
  const [gazIndex, setGazIndex] = useState('')
  const [clesRemises, setClesRemises] = useState('2 jeux complets (porte d\'entrée + boîte aux lettres + badge)')
  const [observations, setObservations] = useState('')
  const [typeBail, setTypeBail] = useState('meuble')

  // Option de synchronisation de fin de contrat
  const [syncTerminateLease, setSyncTerminateLease] = useState(true)

  // Options Excel
  const [hasTotals, setHasTotals] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [createdFilePath, setCreatedFilePath] = useState(null)

  // Charger les données
  useEffect(() => {
    Promise.all([
      getBiens().catch(() => []),
      getBaux().catch(() => []),
      getLocataires().catch(() => [])
    ]).then(([bi, ba, lo]) => {
      setBiens(bi || [])
      setBaux(ba || [])
      setLocataires(lo || [])

      const effectiveBienId = bienId || (bi && bi.length > 0 ? bi[0].id : '')
      if (effectiveBienId) setBienId(effectiveBienId)

      let initialTpl = null
      if (targetSubfolder) {
        initialTpl = ALL_TEMPLATES.find(t => targetSubfolder.startsWith(t.category))
      }
      if (!initialTpl) initialTpl = ALL_TEMPLATES[0]

      setSelectedTemplateId(initialTpl.id)
      setFilename(initialTpl.filename)
      setCustomTitle(initialTpl.title)
      setSubfolder(targetSubfolder || initialTpl.defaultSubfolder)
    })
  }, [targetSubfolder])

  // Mettre à jour les champs lors du changement de bien
  useEffect(() => {
    if (!bienId) return
    const bauxDuBien = baux.filter(b => b.bien_id === parseInt(bienId, 10))
    const activeBail = bauxDuBien.find(b => b.statut === 'actif') || bauxDuBien[0]

    if (activeBail) {
      setSelectedBailId(activeBail.id)
      setMontantLoyer(activeBail.loyer_mensuel || 680)
      setMontantCharges(activeBail.charges_mensuelles || 70)
      setDepotGarantie(activeBail.depot_garantie || 680)
      setTypeBail(activeBail.type_bail || 'meuble')
    }

    // Charger les infos par défaut du bailleur
    const savedNom = localStorage.getItem('bailleur_nom')
    const savedAdr = localStorage.getItem('bailleur_adresse')
    if (savedNom && bailleurNom === 'Bailleur / Propriétaire') {
      setBailleurNom(savedNom)
    }
    if (savedAdr && bailleurAdresse === 'Adresse du bailleur') {
      setBailleurAdresse(savedAdr)
    }
  }, [bienId, baux])

  // Modèles filtrés
  const visibleTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter(t => {
      if (formatFilter !== 'all' && t.format !== formatFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      return true
    })
  }, [formatFilter, categoryFilter])

  const activeTemplate = ALL_TEMPLATES.find(t => t.id === selectedTemplateId) || ALL_TEMPLATES[0]
  const currentBien = biens.find(b => b.id === parseInt(bienId, 10))
  const currentBail = baux.find(b => b.id === parseInt(selectedBailId, 10))
  const currentLocataire = locataires.find(l => l.id === currentBail?.locataire_id)

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id)
    setFilename(tpl.filename)
    setCustomTitle(tpl.title)
    if (!targetSubfolder) {
      setSubfolder(tpl.defaultSubfolder)
    }
  }

  // ─── GÉNÉRATION DU FICHIER ───
  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!bienId) {
      setError('Veuillez sélectionner un bien destinataire.')
      return
    }

    setLoading(true)
    setError(null)
    setCreatedFilePath(null)

    const chosenSubfolder = subfolder || targetSubfolder || activeTemplate.defaultSubfolder || '01_ADMINISTRATIF'

    try {
      if (activeTemplate.format === 'xlsx') {
        // ── GÉNÉRATION TABLEUR EXCEL ──
        const finalFilename = `${chosenSubfolder}/${filename}`
        const path = await generateQuestionnaireExcel({
          bienId: parseInt(bienId, 10),
          filename: finalFilename,
          title: customTitle || activeTemplate.title,
          headers: activeTemplate.headers,
          sampleRows: activeTemplate.sampleRows,
          hasTotals,
          hasCumul: true
        })
        setCreatedFilePath(path || finalFilename)
      } else {
        // ── GÉNÉRATION PDF OFFICIEL À PARTIR DU MODÈLE PDF ──
        const dataCtx = buildDataContext({
          bail: currentBail,
          bien: currentBien,
          locataire: currentLocataire,
          periode,
          dateDoc,
          loyerHC: montantLoyer,
          charges: montantCharges,
          depotGarantie,
          montantRetenu,
          motifRetenue,
          motifFin,
          elecIndex,
          eauIndex,
          gazIndex,
          clesRemises,
          bailleurNom,
          bailleurAdresse
        })

        const result = await createPdfFromTemplate({
          templatePdfName: activeTemplate.templatePdf || 'modele_contrat_bail.pdf',
          dataContext: dataCtx,
          fallbackGenerator: () => {
            if (activeTemplate.id === 'pdf_quittance') {
              return buildQuittancePDF({
                bail: currentBail, bien: currentBien, locataire: currentLocataire,
                bailleurNom, bailleurAdresse, datePaiement: dateDoc, periode,
                montantLoyer: parseFloat(montantLoyer || 0), montantCharges: parseFloat(montantCharges || 0)
              })
            } else if (activeTemplate.id === 'pdf_avis_echeance') {
              return buildAvisEcheancePDF({
                bail: currentBail, bien: currentBien, locataire: currentLocataire,
                bailleurNom, bailleurAdresse, periode, dateEcheance: dateDoc,
                loyerHC: parseFloat(montantLoyer || 0), charges: parseFloat(montantCharges || 0)
              })
            } else if (activeTemplate.id === 'pdf_edl_entree' || activeTemplate.id === 'pdf_edl_sortie') {
              return buildEtatDesLieuxPDF({
                bail: currentBail, bien: currentBien, locataire: currentLocataire,
                typeEdl: activeTemplate.id === 'pdf_edl_entree' ? 'entree' : 'sortie',
                bailleurNom, bailleurAdresse, dateEdl: dateDoc, elecIndex, eauIndex, gazIndex, clesRemises,
                depotGarantieInitial: parseFloat(depotGarantie || 0), montantRetenu: parseFloat(montantRetenu || 0),
                motifRetenue, observationsGenerales: observations
              })
            } else if (activeTemplate.id === 'pdf_fin_bail') {
              return buildFinBailLetterPDF({
                bail: currentBail, bien: currentBien, locataire: currentLocataire,
                bailleurNom, bailleurAdresse, dateFin: dateDoc, motifFin,
                depotGarantie: parseFloat(depotGarantie || 0), montantRetenu: parseFloat(montantRetenu || 0),
                motifRetenue, compteurElec: elecIndex, compteurEau: eauIndex, compteurGaz: gazIndex, clesRemises
              })
            }
            return buildContratBailPDF({
              bail: currentBail, bien: currentBien, locataire: currentLocataire,
              bailleurNom, bailleurAdresse, typeBail: typeBail || currentBail?.type_bail || 'meuble',
              dateDebut: dateDoc, loyerHC: parseFloat(montantLoyer || 0), charges: parseFloat(montantCharges || 0),
              depotGarantie: parseFloat(depotGarantie || 0), elecEntree: elecIndex, eauEntree: eauIndex, gazEntree: gazIndex
            })
          }
        })

        // Si fin de bail et option de synchronisation cochée
        if (activeTemplate.id === 'pdf_fin_bail' && syncTerminateLease && currentBail?.id) {
          const notesSum = `Fin de bail générée le ${dateDoc} | Motif : ${motifFin} | Retenue : ${montantRetenu || 0}€`
          await terminateBail(currentBail.id, dateDoc, motifFin, notesSum)
        }

        const rel = await savePdfToBien(
          parseInt(bienId, 10),
          chosenSubfolder,
          filename,
          result.dataUri,
          customTitle || activeTemplate.title
        )
        setCreatedFilePath(rel)
      }

      if (onSuccess) onSuccess()
    } catch (err) {
      setError(`Erreur de génération : ${err?.toString()}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 18,
        width: '100%',
        maxWidth: 900,
        maxHeight: '94vh',
        boxShadow: '0 32px 64px rgba(15, 23, 42, 0.28)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* ── EN-TÊTE MODERNE ── */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #eef4ff 0%, #f0f7ff 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#e0e7ff',
              border: '1px solid #c7d2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name="filePlus" size={22} color="#4f46e5" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                Générateur de Fichiers & Documents
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                {targetSubfolder ? (
                  <span>Modèles contextuels pour : <strong style={{ color: '#4f46e5' }}>{targetSubfolder}</strong></span>
                ) : (
                  <span>Documents PDF officiels, attestations de bail et tableurs Excel</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openTemplatesFolder()}
              title="Ouvrir le dossier contenant les fichiers modèles PDF pour les personnaliser"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, padding: '5px 12px', fontWeight: 700, color: '#4f46e5', borderColor: '#c7d2fe', background: '#eef2ff' }}
            >
              <Icon name="folderOpen" size={14} color="#4f46e5" />
              <span>Dossier Modèles PDF</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* ── CORPS DU FORMULAIRE ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {createdFilePath && (
            <div style={{
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="check" size={16} color="#166534" />
                <span><strong>Document généré et archivé avec succès :</strong> {createdFilePath}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => openFilePath(createdFilePath)}
                style={{ background: '#166534', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11 }}
              >
                Ouvrir le fichier →
              </button>
            </div>
          )}

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 1. SELECTION DU BIEN & DOSSIER CIBLE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>
                  Bien Immobilier Concerné *
                </label>
                <select
                  value={bienId}
                  onChange={e => setBienId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#fff'
                  }}
                >
                  {biens.map(b => (
                    <option key={b.id} value={b.id}>🏠 {b.nom} {b.adresse ? `(${b.adresse})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>
                  Dossier de destination
                </label>
                <select
                  value={subfolder}
                  onChange={e => setSubfolder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    background: '#fff'
                  }}
                >
                  {SUBFOLDERS.map(s => (
                    <option key={s.id || s} value={s.id || s}>📁 {s.label || s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. CHOIX DU TYPE DE DOCUMENT */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 }}>
                Modèles de Documents Disponibles
              </label>

              {/* Filtres rapides */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFormatFilter('all')}
                  className={`btn btn-sm ${formatFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11 }}
                >
                  Tous ({ALL_TEMPLATES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('pdf')}
                  className={`btn btn-sm ${formatFilter === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11 }}
                >
                  📄 Documents PDF ({ALL_TEMPLATES.filter(t => t.format === 'pdf').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('xlsx')}
                  className={`btn btn-sm ${formatFilter === 'xlsx' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11 }}
                >
                  📊 Tableurs Excel ({ALL_TEMPLATES.filter(t => t.format === 'xlsx').length})
                </button>
              </div>

              {/* Grille des cartes de modèles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10, maxHeight: 210, overflowY: 'auto', padding: 2 }}>
                {visibleTemplates.map(tpl => {
                  const isSelected = selectedTemplateId === tpl.id
                  const isPdf = tpl.format === 'pdf'

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: `1.5px solid ${isSelected ? (isPdf ? '#4f46e5' : '#16a34a') : '#e2e8f0'}`,
                        background: isSelected ? (isPdf ? '#eef2ff' : 'rgba(22, 163, 74, 0.05)') : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        position: 'relative',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: isPdf ? '#e0e7ff' : '#dcfce7',
                          color: isPdf ? '#4338ca' : '#166534'
                        }}>
                          {tpl.badge}
                        </span>

                        {isSelected && (
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: isPdf ? '#4f46e5' : '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon name="check" size={11} color="#fff" />
                          </div>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginTop: 2 }}>
                        {tpl.title}
                      </div>

                      <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.35 }}>
                        {tpl.desc}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 3. INFORMATIONS DU DOCUMENT & BALISES MODIFIABLES */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="edit" size={15} color="#4f46e5" />
                  Informations & Balises Pré-remplies ({activeTemplate.title})
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Modifiez les champs selon vos souhaits avant la génération
                </span>
              </div>

              {/* Coordonnées Bailleur */}
              {activeTemplate.format === 'pdf' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Nom du Bailleur / Propriétaire :
                    </label>
                    <input
                      type="text"
                      value={bailleurNom}
                      onChange={e => setBailleurNom(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Adresse du Bailleur :
                    </label>
                    <input
                      type="text"
                      value={bailleurAdresse}
                      onChange={e => setBailleurAdresse(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>
              )}

              {/* Si le modèle est lié à un bail ou un locataire */}
              {activeTemplate.category === '07_LOCATION' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Contrat de bail / Locataire :
                    </label>
                    <select
                      value={selectedBailId}
                      onChange={e => setSelectedBailId(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    >
                      {baux.filter(b => b.bien_id === parseInt(bienId, 10)).map(b => (
                        <option key={b.id} value={b.id}>
                          {b.locataire_nom || 'Locataire'} ({b.statut === 'actif' ? '🟢 Actif' : '🟠 Terminé'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Date du document :
                    </label>
                    <input
                      type="date"
                      value={dateDoc}
                      onChange={e => setDateDoc(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>
              )}

              {/* Si Quittance ou Avis d'échéance */}
              {(activeTemplate.id === 'pdf_quittance' || activeTemplate.id === 'pdf_avis_echeance') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Mois / Période concernée :
                    </label>
                    <input
                      type="month"
                      value={periode}
                      onChange={e => setPeriode(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Loyer Hors Charges (€) :
                    </label>
                    <input
                      type="number"
                      value={montantLoyer}
                      onChange={e => setMontantLoyer(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Provisions Charges (€) :
                    </label>
                    <input
                      type="number"
                      value={montantCharges}
                      onChange={e => setMontantCharges(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>
              )}

              {/* Si État des Lieux (Entrée ou Sortie) */}
              {(activeTemplate.id === 'pdf_edl_entree' || activeTemplate.id === 'pdf_edl_sortie') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Compteur Électricité (kWh) :
                      </label>
                      <input
                        type="text"
                        placeholder="ex: 14500"
                        value={elecIndex}
                        onChange={e => setElecIndex(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Compteur Eau (m³) :
                      </label>
                      <input
                        type="text"
                        placeholder="ex: 320"
                        value={eauIndex}
                        onChange={e => setEauIndex(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Compteur Gaz (m³) :
                      </label>
                      <input
                        type="text"
                        placeholder="ex: 850"
                        value={gazIndex}
                        onChange={e => setGazIndex(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Clés & Accès remis :
                      </label>
                      <input
                        type="text"
                        value={clesRemises}
                        onChange={e => setClesRemises(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Dépôt de garantie / Caution (€) :
                      </label>
                      <input
                        type="number"
                        value={depotGarantie}
                        onChange={e => setDepotGarantie(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                  </div>

                  {activeTemplate.id === 'pdf_edl_sortie' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                          Retenue sur caution (€) :
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={montantRetenu}
                          onChange={e => setMontantRetenu(e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                          Motif de retenue :
                        </label>
                        <input
                          type="text"
                          placeholder="ex: Nettoyage et remise en état"
                          value={motifRetenue}
                          onChange={e => setMotifRetenue(e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                      Observations générales de l'état des lieux :
                    </label>
                    <textarea
                      rows={2}
                      value={observations}
                      placeholder={activeTemplate.id === 'pdf_edl_entree' ? 'Logement remis en bon état général...' : 'Logement restitué propre et vidé...'}
                      onChange={e => setObservations(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>
              )}

              {/* Si Fin de bail */}
              {activeTemplate.id === 'pdf_fin_bail' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Motif de clôture de bail :
                      </label>
                      <input
                        type="text"
                        value={motifFin}
                        onChange={e => setMotifFin(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Dépôt de garantie initial (€) :
                      </label>
                      <input
                        type="number"
                        value={depotGarantie}
                        onChange={e => setDepotGarantie(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Retenue éventuelle (€) :
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={montantRetenu}
                        onChange={e => setMontantRetenu(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Motif de la retenue :
                      </label>
                      <input
                        type="text"
                        placeholder="ex: Nettoyage / Réparations"
                        value={motifRetenue}
                        onChange={e => setMotifRetenue(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                  </div>

                  {/* Compteurs & Clés sortie */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Électricité (kWh) :
                      </label>
                      <input
                        type="text"
                        value={elecIndex}
                        onChange={e => setElecIndex(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Eau (m³) :
                      </label>
                      <input
                        type="text"
                        value={eauIndex}
                        onChange={e => setEauIndex(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Clés remises :
                      </label>
                      <input
                        type="text"
                        value={clesRemises}
                        onChange={e => setClesRemises(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                  </div>

                  {/* Option de synchronisation */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#dc2626', cursor: 'pointer', marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={syncTerminateLease}
                      onChange={e => setSyncTerminateLease(e.target.checked)}
                      style={{ accentColor: '#dc2626' }}
                    />
                    Synchroniser et clôturer immédiatement le bail dans KeyFolio
                  </label>
                </div>
              )}

              {/* Si Contrat de bail ALUR */}
              {activeTemplate.id === 'pdf_contrat_bail' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Type de location :
                      </label>
                      <select
                        value={typeBail}
                        onChange={e => setTypeBail(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      >
                        <option value="meuble">Meublé (1 an)</option>
                        <option value="non_meuble">Non Meublé / Nu (3 ans)</option>
                        <option value="etudiant">Étudiant (9 mois)</option>
                        <option value="mobilite">Mobilité</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Loyer HC (€) :
                      </label>
                      <input
                        type="number"
                        value={montantLoyer}
                        onChange={e => setMontantLoyer(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                        Dépôt de garantie (€) :
                      </label>
                      <input
                        type="number"
                        value={depotGarantie}
                        onChange={e => setDepotGarantie(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Titre & Nom de fichier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                    Titre du document :
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                    Nom du fichier final :
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={e => setFilename(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>

            {/* 4. ACTIONS DU BAS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 700,
                  background: activeTemplate.format === 'pdf' ? '#4f46e5' : '#16a34a',
                  borderColor: activeTemplate.format === 'pdf' ? '#4f46e5' : '#16a34a'
                }}
              >
                {loading ? (
                  <span>Génération en cours...</span>
                ) : (
                  <>
                    <Icon name="check" size={16} />
                    <span>Générer et Enregistrer dans le Dossier</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
