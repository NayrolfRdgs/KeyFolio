import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import {
  getBiens,
  getBaux,
  getLocataires,
  getBienChampsLibres,
  openTemplatesFolder,
  saveEtatDesLieuxPdf,
  saveContratBailPdf,
  savePdfToBien,
  saveFileToDisk,
  openFilePath,
  saveEtatDesLieuxRecord,
  saveBienChampsLibresBatch,
  updateBien,
  updateLocataire,
  updateBail
} from '../../lib/db'
import {
  buildEtatDesLieuxPDF,
  buildContratBailPDF,
  buildQuittancePDF,
  buildAvisEcheancePDF,
  buildFinBailLetterPDF
} from '../../lib/pdfGenerator'
import { buildDataContext, replacePlaceholdersInText } from '../../lib/pdfTemplateEngine'
import { createPdfFromTemplate } from '../../lib/pdfTemplateCreator'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

const DOC_TYPES = [
  { id: 'etat_des_lieux_entree', label: "État des Lieux d'Entrée", icon: 'fileSignature', color: '#16a34a', templateName: 'modele_etat_des_lieux.pdf' },
  { id: 'etat_des_lieux_sortie', label: "État des Lieux de Sortie", icon: 'fileSignature', color: '#2563eb', templateName: 'modele_etat_des_lieux.pdf' },
  { id: 'contrat_bail', label: "Contrat de Location (Bail)", icon: 'fileText', color: '#4f46e5', templateName: 'modele_contrat_bail.pdf' },
  { id: 'quittance', label: "Quittance de Loyer", icon: 'receipt', color: '#059669', templateName: 'modele_quittance.pdf' },
  { id: 'avis_echeance', label: "Avis d'Échéance", icon: 'bell', color: '#d97706', templateName: 'modele_avis_echeance.pdf' },
  { id: 'fin_bail', label: "Attestation Fin de Bail & Caution", icon: 'logOut', color: '#dc2626', templateName: 'modele_fin_bail.pdf' }
]

export default function InteractivePdfEditorModal({
  document = null,
  initialType = null,
  initialBienId = null,
  initialLocataireId = null,
  onClose,
  onSaved
}) {
  const [allBiens, setAllBiens] = useState([])
  const [allLocataires, setAllLocataires] = useState([])
  const [allBaux, setAllBaux] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Détection du type de document
  const detectType = () => {
    if (initialType) return initialType
    const filename = (document?.name || document?.filename || document?.relative_path || '').toLowerCase()
    if (filename.includes('edl') || filename.includes('etat_des_lieux') || filename.includes('état des lieux')) {
      if (filename.includes('sortie')) return 'etat_des_lieux_sortie'
      return 'etat_des_lieux_entree'
    }
    if (filename.includes('bail') || filename.includes('contrat') || filename.includes('location')) return 'contrat_bail'
    if (filename.includes('quittance')) return 'quittance'
    if (filename.includes('avis') || filename.includes('echeance')) return 'avis_echeance'
    if (filename.includes('fin') || filename.includes('caution') || filename.includes('restitution')) return 'fin_bail'
    return 'contrat_bail'
  }

  const [docType, setDocType] = useState(detectType)
  const [step, setStep] = useState(1)

  // Sélection Entités
  const [currentBienId, setCurrentBienId] = useState(initialBienId || document?.bien_id || '')
  const [currentLocataireId, setCurrentLocataireId] = useState(initialLocataireId || document?.locataire_id || '')
  const [currentBailId, setCurrentBailId] = useState('')

  // Profil Bailleur
  const [bailleurNom, setBailleurNom] = useState(() => {
    const saved = localStorage.getItem('keyfolio_bailleur_profile')
    if (saved) try { return JSON.parse(saved).nom || 'Bailleur / Propriétaire' } catch (e) {}
    return 'Bailleur / Propriétaire'
  })
  const [bailleurAdresse, setBailleurAdresse] = useState(() => {
    const saved = localStorage.getItem('keyfolio_bailleur_profile')
    if (saved) try { return JSON.parse(saved).adresse || 'Adresse du bailleur' } catch (e) {}
    return 'Adresse du bailleur'
  })
  const [bailleurEmail, setBailleurEmail] = useState(() => {
    const saved = localStorage.getItem('keyfolio_bailleur_profile')
    if (saved) try { return JSON.parse(saved).email || '' } catch (e) {}
    return ''
  })
  const [bailleurTelephone, setBailleurTelephone] = useState(() => {
    const saved = localStorage.getItem('keyfolio_bailleur_profile')
    if (saved) try { return JSON.parse(saved).telephone || '' } catch (e) {}
    return ''
  })

  // Champs Logement personnalisés
  const [bienNomCustom, setBienNomCustom] = useState('')
  const [bienAdresseCustom, setBienAdresseCustom] = useState('')
  const [bienSurfaceCustom, setBienSurfaceCustom] = useState('')
  const [bienTypeCustom, setBienTypeCustom] = useState('Location nue')

  // Champs Locataire
  const [locataireNomCustom, setLocataireNomCustom] = useState('')
  const [locataireEmailCustom, setLocataireEmailCustom] = useState('')
  const [locataireTelephoneCustom, setLocataireTelephoneCustom] = useState('')
  const [locataireProfessionCustom, setLocataireProfessionCustom] = useState('')

  // Dates & Finances
  const [dateDoc, setDateDoc] = useState(todayISO())
  const [dateFinDoc, setDateFinDoc] = useState('')
  const [loyerHC, setLoyerHC] = useState('650')
  const [charges, setCharges] = useState('50')
  const [depotGarantie, setDepotGarantie] = useState('650')
  const [montantRetenu, setMontantRetenu] = useState('0')
  const [motifRetenue, setMotifRetenue] = useState('')
  const [motifFin, setMotifFin] = useState('Congé donné par le locataire')
  const [periodeStr, setPeriodeStr] = useState('')

  // Compteurs & Clés
  const [elecIndex, setElecIndex] = useState('')
  const [eauIndex, setEauIndex] = useState('')
  const [gazIndex, setGazIndex] = useState('')
  const [clesRemises, setClesRemises] = useState('2 jeux complets (porte d\'entrée + boîte aux lettres + badge)')

  // Grille des pièces (EDL)
  const [pieces, setPieces] = useState([
    { nom: 'Entrée / Dégagement', etat: 'Bon état', obs: 'Murs et interphone fonctionnels' },
    { nom: 'Séjour / Salon', etat: 'Très bon état', obs: 'Sols propres, fenêtres conformes' },
    { nom: 'Cuisine', etat: 'Bon état', obs: 'Évier et plaques nettoyés et testés' },
    { nom: 'Chambre(s)', etat: 'Très bon état', obs: 'Revêtement et prises conformes' },
    { nom: 'Salle d\'eau / WC', etat: 'Bon état', obs: 'Robinetterie et sanitaires sans fuite' }
  ])
  const [observationsGenerales, setObservationsGenerales] = useState('Logement remis en bon état général d\'usage et d\'entretien.')

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [savedPath, setSavedPath] = useState(null)

  const debounceRef = useRef(null)

  // Chargement des données
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [bi, lo, ba] = await Promise.all([
          getBiens().catch(() => []),
          getLocataires().catch(() => []),
          getBaux().catch(() => [])
        ])
        setAllBiens(bi || [])
        setAllLocataires(lo || [])
        setAllBaux(ba || [])

        // Initialiser l'entité sélectionnée
        let targetB = null
        if (currentBienId) targetB = (bi || []).find(b => String(b.id) === String(currentBienId))
        else if (bi && bi.length > 0) targetB = bi[0]

        if (targetB) {
          setCurrentBienId(targetB.id)
          setBienNomCustom(targetB.nom || '')
          setBienAdresseCustom(targetB.adresse || '')
          setBienSurfaceCustom(targetB.surface_m2 ? String(targetB.surface_m2) : '')
          setBienTypeCustom(targetB.type_bien || 'Location nue')
          if (targetB.loyer_actuel) setLoyerHC(String(targetB.loyer_actuel))

          // Rechercher le bail actif de ce bien
          const bailActif = (ba || []).find(b => String(b.bien_id) === String(targetB.id) && b.statut === 'actif')
          if (bailActif) {
            setCurrentBailId(bailActif.id)
            if (bailActif.loyer_mensuel) setLoyerHC(String(bailActif.loyer_mensuel))
            if (bailActif.charges_mensuelles) setCharges(String(bailActif.charges_mensuelles))
            if (bailActif.depot_garantie) setDepotGarantie(String(bailActif.depot_garantie))
            if (bailActif.date_debut) setDateDoc(bailActif.date_debut)
            if (bailActif.date_fin) setDateFinDoc(bailActif.date_fin)

            const loc = (lo || []).find(l => String(l.id) === String(bailActif.locataire_id))
            if (loc) {
              setCurrentLocataireId(loc.id)
              setLocataireNomCustom(`${loc.prenom} ${loc.nom}`.trim())
              setLocataireEmailCustom(loc.email || '')
              setLocataireTelephoneCustom(loc.telephone || '')
              setLocataireProfessionCustom(loc.profession || '')
            }
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Auto-remplissage lors du choix d'un bien
  const handleSelectBien = (bId) => {
    setCurrentBienId(bId)
    const b = allBiens.find(x => String(x.id) === String(bId))
    if (b) {
      setBienNomCustom(b.nom || '')
      setBienAdresseCustom(b.adresse || '')
      if (b.surface_m2) setBienSurfaceCustom(String(b.surface_m2))
      if (b.type_bien) setBienTypeCustom(b.type_bien)
      if (b.loyer_actuel) setLoyerHC(String(b.loyer_actuel))

      const bailDuBien = allBaux.find(ba => String(ba.bien_id) === String(bId) && ba.statut === 'actif') || allBaux.find(ba => String(ba.bien_id) === String(bId))
      if (bailDuBien) {
        setCurrentBailId(bailDuBien.id)
        if (bailDuBien.loyer_mensuel) setLoyerHC(String(bailDuBien.loyer_mensuel))
        if (bailDuBien.charges_mensuelles) setCharges(String(bailDuBien.charges_mensuelles))
        if (bailDuBien.depot_garantie) setDepotGarantie(String(bailDuBien.depot_garantie))
        if (bailDuBien.date_debut) setDateDoc(bailDuBien.date_debut)

        const loc = allLocataires.find(l => String(l.id) === String(bailDuBien.locataire_id))
        if (loc) {
          setCurrentLocataireId(loc.id)
          setLocataireNomCustom(`${loc.prenom} ${loc.nom}`.trim())
          setLocataireEmailCustom(loc.email || '')
          setLocataireTelephoneCustom(loc.telephone || '')
          setLocataireProfessionCustom(loc.profession || '')
        }
      }
    }
  }

  // Auto-remplissage lors du choix d'un locataire
  const handleSelectLocataire = (locId) => {
    setCurrentLocataireId(locId)
    const l = allLocataires.find(x => String(x.id) === String(locId))
    if (l) {
      setLocataireNomCustom(`${l.prenom} ${l.nom}`.trim())
      setLocataireEmailCustom(l.email || '')
      setLocataireTelephoneCustom(l.telephone || '')
      setLocataireProfessionCustom(l.profession || '')
    }
  }

  const currentBien = useMemo(() => allBiens.find(b => String(b.id) === String(currentBienId)), [allBiens, currentBienId])
  const currentLocataire = useMemo(() => allLocataires.find(l => String(l.id) === String(currentLocataireId)), [allLocataires, currentLocataireId])
  const currentBail = useMemo(() => allBaux.find(b => String(b.id) === String(currentBailId)), [allBaux, currentBailId])

  // Générateur jsPDF Fallback selon le type de document
  const getFallbackDoc = useCallback(() => {
    const isEdlEntree = docType === 'etat_des_lieux_entree'
    const isEdlSortie = docType === 'etat_des_lieux_sortie'

    if (isEdlEntree || isEdlSortie) {
      return buildEtatDesLieuxPDF({
        bail: currentBail,
        bien: { ...(currentBien || {}), nom: bienNomCustom, adresse: bienAdresseCustom },
        locataire: { ...(currentLocataire || {}), nom: locataireNomCustom },
        typeEdl: isEdlEntree ? 'entree' : 'sortie',
        bailleurNom,
        bailleurAdresse,
        dateEdl: dateDoc,
        elecIndex,
        eauIndex,
        gazIndex,
        clesRemises,
        depotGarantieInitial: parseFloat(depotGarantie || 0),
        montantRetenu: parseFloat(montantRetenu || 0),
        motifRetenue,
        pieces,
        observationsGenerales
      })
    }

    if (docType === 'contrat_bail') {
      return buildContratBailPDF({
        bail: currentBail,
        bien: { ...(currentBien || {}), nom: bienNomCustom, adresse: bienAdresseCustom, surface_m2: parseFloat(bienSurfaceCustom || 0), type_bien: bienTypeCustom },
        locataire: { ...(currentLocataire || {}), nom: locataireNomCustom, email: locataireEmailCustom, telephone: locataireTelephoneCustom, profession: locataireProfessionCustom },
        bienNom: bienNomCustom,
        bienAdresse: bienAdresseCustom,
        bienSurface: bienSurfaceCustom,
        bienType: bienTypeCustom,
        locatairePrenom: '',
        locataireNom: locataireNomCustom,
        locataireEmail: locataireEmailCustom,
        locataireTelephone: locataireTelephoneCustom,
        locataireProfession: locataireProfessionCustom,
        bailleurNom,
        bailleurAdresse,
        bailleurEmail,
        bailleurTelephone,
        typeBail: bienTypeCustom,
        dateDebut: dateDoc,
        dateFin: dateFinDoc,
        loyerHC: parseFloat(loyerHC || 0),
        charges: parseFloat(charges || 0),
        depotGarantie: parseFloat(depotGarantie || 0),
        jourPaiement: 5,
        clauseIRL: true,
        elecEntree: elecIndex,
        eauEntree: eauIndex,
        gazEntree: gazIndex,
        equipements: [],
        clausesParticulieres: ''
      })
    }

    if (docType === 'quittance') {
      return buildQuittancePDF({
        bail: currentBail,
        bien: { ...(currentBien || {}), nom: bienNomCustom, adresse: bienAdresseCustom },
        locataire: { ...(currentLocataire || {}), nom: locataireNomCustom },
        periode: periodeStr || `Mois de ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
        loyerHC: parseFloat(loyerHC || 0),
        charges: parseFloat(charges || 0),
        datePaiement: dateDoc,
        modePaiement: 'Virement bancaire',
        bailleurNom,
        bailleurAdresse
      })
    }

    if (docType === 'avis_echeance') {
      return buildAvisEcheancePDF({
        bail: currentBail,
        bien: { ...(currentBien || {}), nom: bienNomCustom, adresse: bienAdresseCustom },
        locataire: { ...(currentLocataire || {}), nom: locataireNomCustom },
        periode: periodeStr || `Mois de ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
        loyerHC: parseFloat(loyerHC || 0),
        charges: parseFloat(charges || 0),
        dateEcheance: dateDoc,
        bailleurNom,
        bailleurAdresse
      })
    }

    // Fin de bail
    return buildFinBailLetterPDF({
      bail: currentBail,
      bien: { ...(currentBien || {}), nom: bienNomCustom, adresse: bienAdresseCustom },
      locataire: { ...(currentLocataire || {}), nom: locataireNomCustom },
      dateFinBail: dateDoc,
      motifFin,
      depotGarantie: parseFloat(depotGarantie || 0),
      montantRetenu: parseFloat(montantRetenu || 0),
      motifRetenue,
      elecIndex,
      eauIndex,
      gazIndex,
      clesRemises,
      bailleurNom,
      bailleurAdresse
    })
  }, [docType, currentBail, currentBien, currentLocataire, bienNomCustom, bienAdresseCustom, bienSurfaceCustom, bienTypeCustom, locataireNomCustom, locataireEmailCustom, locataireTelephoneCustom, locataireProfessionCustom, bailleurNom, bailleurAdresse, bailleurEmail, bailleurTelephone, dateDoc, dateFinDoc, loyerHC, charges, depotGarantie, montantRetenu, motifRetenue, motifFin, periodeStr, elecIndex, eauIndex, gazIndex, clesRemises, pieces, observationsGenerales])

  // Résultat PDF (Template réel ou Fallback)
  const getPdfResult = useCallback(async () => {
    const dataCtx = buildDataContext({
      bail: currentBail,
      bien: { ...(currentBien || {}), nom: bienNomCustom, adresse: bienAdresseCustom, surface_m2: parseFloat(bienSurfaceCustom || 0), type_bien: bienTypeCustom },
      locataire: { ...(currentLocataire || {}), nom: locataireNomCustom, email: locataireEmailCustom, telephone: locataireTelephoneCustom },
      periode: periodeStr,
      dateDoc,
      loyerHC: parseFloat(loyerHC || 0),
      charges: parseFloat(charges || 0),
      depotGarantie: parseFloat(depotGarantie || 0),
      montantRetenu: parseFloat(montantRetenu || 0),
      motifRetenue,
      motifFin,
      elecIndex,
      eauIndex,
      gazIndex,
      clesRemises,
      customValues: {
        bailleur_nom: bailleurNom,
        bailleur_adresse: bailleurAdresse,
        bailleur_email: bailleurEmail,
        bailleur_telephone: bailleurTelephone
      }
    })

    const activeTypeConfig = DOC_TYPES.find(d => d.id === docType) || DOC_TYPES[0]
    return await createPdfFromTemplate({
      templatePdfName: activeTypeConfig.templateName,
      dataContext: dataCtx,
      fallbackGenerator: getFallbackDoc
    })
  }, [docType, currentBail, currentBien, currentLocataire, bienNomCustom, bienAdresseCustom, bienSurfaceCustom, bienTypeCustom, locataireNomCustom, locataireEmailCustom, locataireTelephoneCustom, periodeStr, dateDoc, loyerHC, charges, depotGarantie, montantRetenu, motifRetenue, motifFin, elecIndex, eauIndex, gazIndex, clesRemises, bailleurNom, bailleurAdresse, bailleurEmail, bailleurTelephone, getFallbackDoc])

  // Rafraîchissement live de l'aperçu PDF
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getPdfResult()
        setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return res.blobUrl })
      } catch (e) {
        console.warn('PDF preview error', e)
      }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [getPdfResult])

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }
  }, [])

  // Sauvegarde dans le sous-dossier correspondant du bien
  const handleSaveToProperty = async () => {
    const targetId = currentBienId || currentBien?.id
    if (!targetId) {
      setToastMsg('⚠️ Veuillez sélectionner un bien immobilier pour enregistrer le document.')
      return null
    }
    setSaving(true)
    try {
      const res = await getPdfResult()
      const sanitizedLoc = locataireNomCustom.replace(/[^a-zA-Z0-9_-]/g, '_')
      let subfolder = '01_ADMINISTRATIF'
      let filename = `Document_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
      let title = `Document - ${locataireNomCustom}`

      if (docType === 'etat_des_lieux_entree') {
        subfolder = '07_LOCATION/Etat des lieux/Entree'
        filename = `EDL_Entree_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
        title = `État des Lieux (Entrée) - ${locataireNomCustom}`
      } else if (docType === 'etat_des_lieux_sortie') {
        subfolder = '07_LOCATION/Etat des lieux/Sortie'
        filename = `EDL_Sortie_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
        title = `État des Lieux (Sortie) - ${locataireNomCustom}`
      } else if (docType === 'contrat_bail') {
        subfolder = '07_LOCATION/Bail/Bail_en_cours'
        filename = `Contrat_Bail_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
        title = `Contrat de Bail - ${locataireNomCustom}`
      } else if (docType === 'quittance') {
        subfolder = '07_LOCATION/Quittances de loyer'
        filename = `Quittance_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
        title = `Quittance de Loyer - ${locataireNomCustom}`
      } else if (docType === 'avis_echeance') {
        subfolder = '07_LOCATION/Avis d echeance et Relances'
        filename = `Avis_Echeance_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
        title = `Avis d'Échéance - ${locataireNomCustom}`
      } else if (docType === 'fin_bail') {
        subfolder = '07_LOCATION/Bail/Baux_anciens'
        filename = `Attestation_Fin_Bail_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
        title = `Attestation Fin de Bail - ${locataireNomCustom}`
      }

      let relPath = null
      if (docType.startsWith('etat_des_lieux')) {
        try {
          relPath = await saveEtatDesLieuxPdf(targetId, locataireNomCustom, dateDoc, res.dataUri, docType === 'etat_des_lieux_entree' ? 'entree' : 'sortie')
        } catch (e) {
          relPath = await savePdfToBien(targetId, subfolder, filename, res.dataUri, title)
        }
        await saveEtatDesLieuxRecord({
          bailId: currentBailId || null,
          bien_id: parseInt(targetId),
          bien_nom: bienNomCustom,
          locataire_id: currentLocataireId ? parseInt(currentLocataireId) : null,
          locataire_nom: locataireNomCustom,
          type_edl: docType === 'etat_des_lieux_entree' ? 'entree' : 'sortie',
          date_edl: dateDoc,
          pdf_path: relPath,
          elec_index: elecIndex,
          eau_index: eauIndex,
          gaz_index: gazIndex,
          cles_remises: clesRemises,
          pieces,
          observations: observationsGenerales,
          depot_garantie: parseFloat(depotGarantie || 0),
          montant_retenu: docType === 'etat_des_lieux_entree' ? 0 : parseFloat(montantRetenu || 0),
          motif_retenue: docType === 'etat_des_lieux_entree' ? null : motifRetenue
        })
      } else if (docType === 'contrat_bail') {
        relPath = await saveContratBailPdf(targetId, res.dataUri, filename)
      } else {
        relPath = await savePdfToBien(targetId, subfolder, filename, res.dataUri, title)
      }

      setSavedPath(relPath)
      setToastMsg(`✅ Document archivé avec succès : ${relPath}`)
      if (onSaved) onSaved(relPath)
      return relPath
    } catch (err) {
      setToastMsg(`❌ Erreur d'archivage : ${err?.toString()}`)
      return null
    } finally {
      setSaving(false)
      setTimeout(() => setToastMsg(null), 6000)
    }
  }

  // Export direct
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const res = await getPdfResult()
      const sanitizedLoc = locataireNomCustom.replace(/[^a-zA-Z0-9_-]/g, '_')
      const defaultFilename = `KeyFolio_${docType}_${sanitizedLoc}_${dateDoc || todayISO()}.pdf`
      const savePath = await openSaveDialog({
        defaultPath: defaultFilename,
        filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
      })
      if (savePath) {
        const rawBase64 = res.dataUri.split(',')[1]
        await saveFileToDisk(savePath, rawBase64)
        setToastMsg(`✅ Document PDF exporté : ${savePath}`)
      }
    } catch (err) {
      setToastMsg(`❌ Erreur export PDF : ${err?.toString()}`)
    } finally {
      setExporting(false)
      setTimeout(() => setToastMsg(null), 5000)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: 1480,
          width: '96vw',
          height: '92vh',
          maxHeight: '92vh',
          overflow: 'hidden',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ─── EN-TÊTE PRINCIPAL WIZARD ─── */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <Icon name="fileSignature" size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Remplisseur & Éditeur de Documents PDF
                </h3>
                <span className="badge badge-accent" style={{ fontSize: 11, fontWeight: 700 }}>
                  {DOC_TYPES.find(d => d.id === docType)?.label || 'Document'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Assistant interactif avec aperçu PDF instantané
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Sélecteur de type de document */}
            <select
              className="form-control"
              value={docType}
              onChange={e => setDocType(e.target.value)}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              {DOC_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={openTemplatesFolder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 700,
                fontSize: 11.5,
                color: '#4f46e5',
                borderColor: '#c7d2fe',
                background: '#eef2ff'
              }}
              title="Ouvrir le dossier contenant les fichiers modèles PDF et configurations"
            >
              <Icon name="folder" size={13} color="#4f46e5" /> 📂 Modèles PDF
            </button>

            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* ─── CORPS SPLIT-SCREEN (Gauche: Formulaire | Droite: Aperçu PDF) ─── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* COLONNE GAUCHE (46%) : Formulaire */}
          <div style={{
            width: '46%',
            borderRight: '1px solid var(--border-color)',
            overflowY: 'auto',
            background: '#f8fafc',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {/* 🎯 SÉLECTION RAPIDE BIEN & LOCATAIRE */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: '16px 18px',
              border: '1.5px solid #c7d2fe',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#1e1b4b' }}>
                  Sélection du Logement & Données Pré-remplies
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Bien Immobilier *</label>
                  <select
                    className="form-control"
                    value={currentBienId}
                    onChange={e => handleSelectBien(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 600, padding: '7px 10px' }}
                  >
                    <option value="">-- Choisir un bien --</option>
                    {allBiens.map(b => (
                      <option key={b.id} value={b.id}>{b.nom} ({b.adresse || 'Sans adresse'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Locataire lié</label>
                  <select
                    className="form-control"
                    value={currentLocataireId}
                    onChange={e => handleSelectLocataire(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 600, padding: '7px 10px' }}
                  >
                    <option value="">-- Choisir ou saisir libre --</option>
                    {allLocataires.map(l => (
                      <option key={l.id} value={l.id}>{l.prenom} {l.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* PARTIES CONTRACTANTES */}
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                1. Informations Parties & Logement
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Nom du Bailleur</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bailleurNom}
                    onChange={e => setBailleurNom(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Nom du Locataire</label>
                  <input
                    type="text"
                    className="form-control"
                    value={locataireNomCustom}
                    onChange={e => setLocataireNomCustom(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Adresse du Logement</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bienAdresseCustom}
                    onChange={e => setBienAdresseCustom(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* CONDITIONS FINANCIÈRES & DATES */}
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                2. Finances & Dates
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Date du document</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateDoc}
                    onChange={e => setDateDoc(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Loyer Hors Charges (€)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={loyerHC}
                    onChange={e => setLoyerHC(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Provisions Charges (€)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={charges}
                    onChange={e => setCharges(e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Dépôt Garantie (€)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={depotGarantie}
                    onChange={e => setDepotGarantie(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                {docType.includes('sortie') || docType === 'fin_bail' ? (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Retenue Travaux (€)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={montantRetenu}
                      onChange={e => setMontantRetenu(e.target.value)}
                      style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}
                    />
                  </div>
                ) : (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700 }}>Période / Mois</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Février 2026"
                      value={periodeStr}
                      onChange={e => setPeriodeStr(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                )}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>Total Mensuel CC</label>
                  <div style={{ padding: '7px 10px', background: '#dcfce7', borderRadius: 6, fontWeight: 800, fontSize: 13, color: '#166534' }}>
                    {formatEuro(parseFloat(loyerHC || 0) + parseFloat(charges || 0))}
                  </div>
                </div>
              </div>
            </div>

            {/* COMPTEURS & PIÈCES (Si applicable) */}
            {(docType.includes('etat_des_lieux') || docType === 'contrat_bail') && (
              <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                  3. Index des Compteurs & Clés
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700 }}>Compteur Élec (kWh)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: 45892"
                      value={elecIndex}
                      onChange={e => setElecIndex(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700 }}>Compteur Eau (m³)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: 124"
                      value={eauIndex}
                      onChange={e => setEauIndex(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, fontWeight: 700 }}>Compteur Gaz (m³)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: 850"
                      value={gazIndex}
                      onChange={e => setGazIndex(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Clés & Badges remis</label>
                  <input
                    type="text"
                    className="form-control"
                    value={clesRemises}
                    onChange={e => setClesRemises(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            {/* GRILLE DES PIÈCES POUR ÉTAT DES LIEUX */}
            {docType.includes('etat_des_lieux') && (
              <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                    4. Constat par Pièce
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPieces(prev => [...prev, { nom: 'Nouvelle pièce', etat: 'Bon état', obs: '' }])}
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    + Ajouter une pièce
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pieces.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#f8fafc', padding: 6, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={p.nom}
                        onChange={e => {
                          const val = e.target.value
                          setPieces(prev => prev.map((item, i) => i === idx ? { ...item, nom: val } : item))
                        }}
                        style={{ fontSize: 11, fontWeight: 700, width: '30%' }}
                      />
                      <select
                        className="form-control"
                        value={p.etat}
                        onChange={e => {
                          const val = e.target.value
                          setPieces(prev => prev.map((item, i) => i === idx ? { ...item, etat: val } : item))
                        }}
                        style={{ fontSize: 11, fontWeight: 600, width: '28%' }}
                      >
                        <option value="Très bon état">Très bon état</option>
                        <option value="Bon état">Bon état</option>
                        <option value="État d'usage">État d'usage</option>
                        <option value="Mauvais état">Mauvais état</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Observations..."
                        className="form-control"
                        value={p.obs}
                        onChange={e => {
                          const val = e.target.value
                          setPieces(prev => prev.map((item, i) => i === idx ? { ...item, obs: val } : item))
                        }}
                        style={{ fontSize: 11, flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setPieces(prev => prev.filter((_, i) => i !== idx))}
                        style={{ color: '#ef4444' }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE (54%) : Prévisualisation PDF Live */}
          <div style={{
            width: '54%',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '10px 16px',
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
                  Aperçu Document PDF — Temps Réel
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportPDF}
                  disabled={exporting}
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
                  disabled={saving}
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

            <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                  title="Document Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  Génération de l'aperçu PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
