import React, { useState, useEffect, useCallback, useRef } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import { buildEtatDesLieuxPDF } from '../../lib/pdfGenerator'
import { buildDataContext } from '../../lib/pdfTemplateEngine'
import { createPdfFromTemplate } from '../../lib/pdfTemplateCreator'
import {
  getBiens,
  getBaux,
  getLocataires,
  getBienChampsLibres,
  openTemplatesFolder,
  saveEtatDesLieuxPdf,
  savePdfToBien,
  saveFileToDisk,
  openFilePath,
  saveEtatDesLieuxRecord,
  saveBienChampsLibresBatch
} from '../../lib/db'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

const parseNotesFin = (notes) => {
  if (!notes) return {}
  const res = {}
  const matchElec = notes.match(/Elec:\s*([^\s|]+)/i)
  const matchEau = notes.match(/Eau:\s*([^\s|]+)/i)
  const matchGaz = notes.match(/Gaz:\s*([^\s|]+)/i)
  const matchRetenue = notes.match(/Retenue:\s*([\d.]+)/i)
  const matchMotif = notes.match(/Motif:\s*([^|]+)/i)
  const matchCles = notes.match(/Cl[eé]s:\s*([^|]+)/i)
  if (matchElec) res.compteurElec = matchElec[1]
  if (matchEau) res.compteurEau = matchEau[1]
  if (matchGaz) res.compteurGaz = matchGaz[1]
  if (matchRetenue) res.montantRetenu = parseFloat(matchRetenue[1])
  if (matchMotif) res.motifRetenue = matchMotif[1].trim()
  if (matchCles) res.clesRemises = matchCles[1].trim()
  res.notesFin = notes
  return res
}

import { useBailleurProfile } from '../../hooks/useBailleurProfile'

// Steps config
const STEPS = [
  { num: 1, id: 'selection_parties', label: '1. Sélection & Parties' },
  { num: 2, id: 'logement', label: '2. Logement & Dates' },
  { num: 3, id: 'compteurs', label: '3. Compteurs & Clés' },
  { num: 4, id: 'pieces', label: '4. Pièces & Équipements' },
  { num: 5, id: 'caution', label: '5. Caution & Finalisation' },
]

export default function EtatDesLieuxModal({
  bail: initialBail,
  bien: initialBien,
  locataire: initialLocataire,
  initialType = 'entree',
  terminationInfo = null,
  onClose,
  onSaved,
  onSuccess,
  onSendMail
}) {
  const [typeEdl, setTypeEdl] = useState(initialType || 'entree')
  const [step, setStep] = useState(1)
  const isEntree = typeEdl === 'entree'

  // Listes complètes pour sélection dynamique
  const [allBiens, setAllBiens] = useState([])
  const [allBaux, setAllBaux] = useState([])
  const [allLocataires, setAllLocataires] = useState([])

  const [currentBienId, setCurrentBienId] = useState(initialBien?.id || initialBail?.bien_id || '')
  const [currentBailId, setCurrentBailId] = useState(initialBail?.id || '')
  const [currentLocataireId, setCurrentLocataireId] = useState(initialLocataire?.id || initialBail?.locataire_id || '')

  const currentBien = allBiens.find(b => String(b.id) === String(currentBienId)) || initialBien
  const currentBail = allBaux.find(b => String(b.id) === String(currentBailId)) || initialBail
  const currentLocataire = allLocataires.find(l => String(l.id) === String(currentLocataireId)) || initialLocataire

  const bailId = currentBail?.id || 'new'
  const storageKey = `keyfolio_edl_cache_${bailId}_${typeEdl}`
  const parsedFromBail = parseNotesFin(currentBail?.notes_fin || terminationInfo?.notesFin || '')

  const { profile: savedBailleur } = useBailleurProfile()

  // State des champs du document
  const [bailleurNom, setBailleurNom] = useState(savedBailleur.nom || localStorage.getItem('bailleur_nom') || 'Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState(savedBailleur.adresse || localStorage.getItem('bailleur_adresse') || 'Adresse du bailleur')
  const [locataireNomCustom, setLocataireNomCustom] = useState(
    (currentLocataire ? `${currentLocataire.prenom} ${currentLocataire.nom}`.trim() : `${currentBail?.locataire_prenom || ''} ${currentBail?.locataire_nom || ''}`.trim()) || 'Locataire'
  )
  const [bienAdresseCustom, setBienAdresseCustom] = useState(currentBien?.adresse || currentBail?.bien_adresse || '')
  const [bienNomCustom, setBienNomCustom] = useState(currentBien?.nom || currentBail?.bien_nom || 'Logement')
  const [dateEdl, setDateEdl] = useState(terminationInfo?.dateFin || (isEntree ? currentBail?.date_debut : currentBail?.date_fin) || todayISO())
  const [elecIndex, setElecIndex] = useState(terminationInfo?.compteurElec || parsedFromBail.compteurElec || '')
  const [eauIndex, setEauIndex] = useState(terminationInfo?.compteurEau || parsedFromBail.compteurEau || '')
  const [gazIndex, setGazIndex] = useState(terminationInfo?.compteurGaz || parsedFromBail.compteurGaz || '')
  const [clesRemises, setClesRemises] = useState(terminationInfo?.clesRemises || parsedFromBail.clesRemises || '2 jeux complets (porte d\'entrée + boîte aux lettres + badge)')
  const [depotGarantieInitial, setDepotGarantieInitial] = useState(currentBail?.depot_garantie ?? 650)
  const [montantRetenu, setMontantRetenu] = useState(terminationInfo?.montantRetenu ?? parsedFromBail.montantRetenu ?? 0)
  const [motifRetenue, setMotifRetenue] = useState(terminationInfo?.motifRetenue || parsedFromBail.motifRetenue || '')

  const defaultPieces = [
    { nom: 'Entrée / Dégagement', etat: 'Bon état', obs: 'Peinture propre, interphone fonctionnel' },
    { nom: 'Séjour / Salon', etat: 'Très bon état', obs: 'Murs et sols propres, fenêtres en bon état' },
    { nom: 'Cuisine', etat: 'Bon état', obs: 'Évier, placards et plaques nettoyés et fonctionnels' },
    { nom: 'Chambre(s)', etat: 'Très bon état', obs: 'Revêtement de sol et prises conformes' },
    { nom: 'Salle d\'eau / WC', etat: 'Bon état', obs: 'Robinetterie et sanitaires sans fuite ni tartre' }
  ]
  const [pieces, setPieces] = useState(defaultPieces)

  const [observationsGenerales, setObservationsGenerales] = useState(
    terminationInfo?.notesFin || parsedFromBail.notesFin || (isEntree 
      ? 'Logement remis en bon état général d\'entretien et d\'usage. Les clés ont été remises en main propre au locataire ce jour.'
      : 'Logement restitué propre et vidé de tout meuble et encombrant. Clés remises en main propre au bailleur.')
  )

  const [savedPath, setSavedPath] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  // Live PDF preview state
  const [pdfUrl, setPdfUrl] = useState(null)
  const debounceRef = useRef(null)

  // Chargement des données globales
  useEffect(() => {
    Promise.all([
      Promise.resolve().then(() => getBiens()).catch(() => []),
      Promise.resolve().then(() => getBaux()).catch(() => []),
      Promise.resolve().then(() => getLocataires()).catch(() => [])
    ]).then(([bi, ba, lo]) => {
      setAllBiens(bi || [])
      setAllBaux(ba || [])
      setAllLocataires(lo || [])

      if (!currentBienId && bi && bi.length > 0) {
        handleSelectBien(bi[0].id, bi, ba, lo)
      }
    })
  }, [])

  // Auto-remplissage dès qu'un bien est sélectionné
  const handleSelectBien = async (bienId, biensList = allBiens, bauxList = allBaux, locatairesList = allLocataires) => {
    setCurrentBienId(bienId)
    const selected = biensList.find(b => String(b.id) === String(bienId))
    if (selected) {
      setBienNomCustom(selected.nom)
      setBienAdresseCustom(selected.adresse || '')

      // Trouver le bail actif ou le plus récent pour ce bien
      const bauxDuBien = bauxList.filter(b => String(b.bien_id) === String(bienId))
      const bailActif = bauxDuBien.find(b => b.statut === 'actif') || bauxDuBien[0]

      if (bailActif) {
        setCurrentBailId(bailActif.id)
        if (bailActif.depot_garantie) setDepotGarantieInitial(bailActif.depot_garantie)
        if (bailActif.date_debut && isEntree) setDateEdl(bailActif.date_debut)
        if (bailActif.date_fin && !isEntree) setDateEdl(bailActif.date_fin)

        const loc = locatairesList.find(l => String(l.id) === String(bailActif.locataire_id))
        if (loc) {
          setCurrentLocataireId(loc.id)
          setLocataireNomCustom(`${loc.prenom} ${loc.nom}`.trim())
        } else if (bailActif.locataire_nom) {
          setLocataireNomCustom(`${bailActif.locataire_prenom || ''} ${bailActif.locataire_nom}`.trim())
        }
      }

      // Charger automatiquement les index de compteurs existants pour ce bien
      try {
        const champs = await getBienChampsLibres(bienId)
        if (champs && Array.isArray(champs)) {
          const map = {}
          champs.forEach(c => { map[c.cle] = c.valeur })
          if (map.compteur_elec) setElecIndex(map.compteur_elec)
          if (map.compteur_eau) setEauIndex(map.compteur_eau)
          if (map.compteur_gaz) setGazIndex(map.compteur_gaz)
        }
      } catch (e) {}
    }
  }

  // Auto-remplissage dès qu'un bail est sélectionné
  const handleSelectBail = (bailId) => {
    setCurrentBailId(bailId)
    const selectedBail = allBaux.find(b => String(b.id) === String(bailId))
    if (selectedBail) {
      if (selectedBail.depot_garantie) setDepotGarantieInitial(selectedBail.depot_garantie)
      if (selectedBail.date_debut && isEntree) setDateEdl(selectedBail.date_debut)
      if (selectedBail.date_fin && !isEntree) setDateEdl(selectedBail.date_fin)

      const loc = allLocataires.find(l => String(l.id) === String(selectedBail.locataire_id))
      if (loc) {
        setCurrentLocataireId(loc.id)
        setLocataireNomCustom(`${loc.prenom} ${loc.nom}`.trim())
      } else if (selectedBail.locataire_nom) {
        setLocataireNomCustom(`${selectedBail.locataire_prenom || ''} ${selectedBail.locataire_nom}`.trim())
      }
    }
  }

  // Auto-remplissage dès qu'un locataire est sélectionné
  const handleSelectLocataire = (locId) => {
    setCurrentLocataireId(locId)
    const loc = allLocataires.find(l => String(l.id) === String(locId))
    if (loc) {
      setLocataireNomCustom(`${loc.prenom} ${loc.nom}`.trim())
    }
  }

  const soldeRestitue = Math.max(0, parseFloat(depotGarantieInitial || 0) - parseFloat(montantRetenu || 0))

  const getPdfDoc = useCallback(() => {
    return buildEtatDesLieuxPDF({
      bail: currentBail,
      bien: {
        ...(currentBien || {}),
        nom: bienNomCustom,
        adresse: bienAdresseCustom
      },
      locataire: {
        ...(currentLocataire || {}),
        nom: locataireNomCustom,
        prenom: ''
      },
      typeEdl,
      bailleurNom,
      bailleurAdresse,
      dateEdl,
      elecIndex,
      eauIndex,
      gazIndex,
      clesRemises,
      depotGarantieInitial: parseFloat(depotGarantieInitial || 0),
      montantRetenu: parseFloat(montantRetenu || 0),
      motifRetenue,
      pieces,
      observationsGenerales
    })
  }, [currentBail, currentBien, currentLocataire, bienNomCustom, bienAdresseCustom, locataireNomCustom, typeEdl, bailleurNom, bailleurAdresse, dateEdl, elecIndex, eauIndex, gazIndex, clesRemises, depotGarantieInitial, montantRetenu, motifRetenue, pieces, observationsGenerales])

  // Construction du résultat PDF (en utilisant le template PDF réel du disque ou le générateur)
  const getPdfResult = useCallback(async () => {
    const dataCtx = buildDataContext({
      bail: currentBail,
      bien: { ...(currentBien || {}), nom: bienNomCustom, adresse: bienAdresseCustom },
      locataire: { ...(currentLocataire || {}), nom: locataireNomCustom },
      dateDoc: dateEdl,
      elecIndex,
      eauIndex,
      gazIndex,
      clesRemises,
      depotGarantie: depotGarantieInitial,
      montantRetenu,
      motifRetenue,
      customValues: {
        bailleur_nom: bailleurNom,
        bailleur_adresse: bailleurAdresse
      }
    })

    return await createPdfFromTemplate({
      templatePdfName: 'modele_etat_des_lieux.pdf',
      dataContext: dataCtx,
      fallbackGenerator: getPdfDoc
    })
  }, [currentBail, currentBien, currentLocataire, bienNomCustom, bienAdresseCustom, locataireNomCustom, dateEdl, elecIndex, eauIndex, gazIndex, clesRemises, depotGarantieInitial, montantRetenu, motifRetenue, bailleurNom, bailleurAdresse, getPdfDoc])

  // Rafraîchissement live du PDF
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getPdfResult()
        setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return res.blobUrl })
      } catch (e) {
        console.warn('PDF preview error', e)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [getPdfResult])

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }
  }, [])

  // Enregistrement officiel et visibilité dans le logiciel
  const handleSaveToProperty = async () => {
    const targetId = currentBienId || currentBien?.id || initialBien?.id
    if (!targetId) {
      setToastMsg('⚠️ Veuillez sélectionner un logement pour enregistrer l\'état des lieux.')
      return null
    }
    setSaving(true)
    try {
      const res = await getPdfResult()
      const pdfBase64 = res.dataUri
      const subfolder = isEntree ? '07_LOCATION/Etat des lieux/Entree' : '07_LOCATION/Etat des lieux/Sortie'
      const sanitizedLoc = locataireNomCustom.replace(/[^a-zA-Z0-9_-]/g, '_')
      const filename = `EDL_${isEntree ? 'Entree' : 'Sortie'}_${sanitizedLoc}_${dateEdl || todayISO()}.pdf`
      const title = `État des Lieux (${isEntree ? 'Entrée' : 'Sortie'}) - ${locataireNomCustom}`

      // 1. Sauvegarde dans le dossier du bien et dans la table documents
      let relPath = null
      try {
        relPath = await saveEtatDesLieuxPdf(targetId, locataireNomCustom, dateEdl, pdfBase64, typeEdl)
      } catch (e) {
        relPath = await savePdfToBien(targetId, subfolder, filename, pdfBase64, title)
      }

      // 2. Enregistrement dans la table etats_des_lieux pour visibilité immédiate dans l'historique
      await saveEtatDesLieuxRecord({
        bailId: currentBailId || null,
        bien_id: parseInt(targetId),
        bien_nom: bienNomCustom,
        locataire_id: currentLocataireId ? parseInt(currentLocataireId) : null,
        locataire_nom: locataireNomCustom,
        type_edl: typeEdl,
        date_edl: dateEdl,
        pdf_path: relPath,
        elec_index: elecIndex,
        eau_index: eauIndex,
        gaz_index: gazIndex,
        cles_remises: clesRemises,
        pieces,
        observations: observationsGenerales,
        depot_garantie: parseFloat(depotGarantieInitial || 0),
        montant_retenu: isEntree ? 0 : parseFloat(montantRetenu || 0),
        motif_retenue: isEntree ? null : motifRetenue
      })

      // 3. Sauvegarder les index compteurs sur le bien
      const champs = []
      if (elecIndex) champs.push({ cle: 'compteur_elec', valeur: String(elecIndex) })
      if (eauIndex) champs.push({ cle: 'compteur_eau', valeur: String(eauIndex) })
      if (gazIndex) champs.push({ cle: 'compteur_gaz', valeur: String(gazIndex) })
      if (champs.length > 0) await saveBienChampsLibresBatch(targetId, champs)

      setSavedPath(relPath)
      setToastMsg(`✅ État des lieux archivé avec succès : ${relPath}`)
      if (onSaved) onSaved(relPath)
      if (onSuccess) onSuccess(relPath)
      return relPath
    } catch (err) {
      setToastMsg(`❌ Erreur d'enregistrement : ${err?.toString()}`)
      return null
    } finally {
      setSaving(false)
      setTimeout(() => setToastMsg(null), 6000)
    }
  }

  // Export PDF direct
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const res = await getPdfResult()
      const sanitizedLoc = locataireNomCustom.replace(/[^a-zA-Z0-9_-]/g, '_')
      const defaultFilename = `EDL_${isEntree ? 'Entree' : 'Sortie'}_${sanitizedLoc}_${dateEdl || todayISO()}.pdf`
      const savePath = await openSaveDialog({
        defaultPath: defaultFilename,
        filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
      })
      if (savePath) {
        const rawBase64 = res.dataUri.split(',')[1]
        await saveFileToDisk(savePath, rawBase64)
        setToastMsg(`✅ PDF exporté : ${savePath}`)
      }
    } catch (err) {
      setToastMsg(`❌ Erreur export PDF : ${err?.toString()}`)
    } finally {
      setExporting(false)
      setTimeout(() => setToastMsg(null), 5000)
    }
  }

  const handleOpenPDFDirect = async () => {
    if (savedPath) {
      await openFilePath(savedPath)
    } else {
      const rel = await handleSaveToProperty()
      if (rel) await openFilePath(rel)
    }
  }

  const handleEtatChange = (idx, field, val) => {
    const updated = [...pieces]
    updated[idx][field] = val
    setPieces(updated)
  }
  const handleAddPiece = () => setPieces(prev => [...prev, { nom: 'Nouvelle pièce', etat: 'Bon état', obs: '' }])
  const handleRemovePiece = (idx) => setPieces(prev => prev.filter((_, i) => i !== idx))

  // Baux disponibles pour le bien sélectionné
  const bauxDuBienSelectionne = allBaux.filter(b => String(b.bien_id) === String(currentBienId))

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
          padding: '16px 24px',
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
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                État des Lieux Contradictoire {isEntree ? "d'Entrée" : 'de Sortie'}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Assistant pas-à-pas • Étape {step} sur {STEPS.length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Type selector toggle */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 10,
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => setTypeEdl('entree')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: isEntree ? '#16a34a' : 'transparent',
                  color: isEntree ? '#ffffff' : '#64748b',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isEntree ? '0 2px 4px rgba(22, 163, 74, 0.2)' : 'none'
                }}
              >
                🟢 Entrée
              </button>
              <button
                type="button"
                onClick={() => setTypeEdl('sortie')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: !isEntree ? '#2563eb' : 'transparent',
                  color: !isEntree ? '#ffffff' : '#64748b',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: !isEntree ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none'
                }}
              >
                🔵 Sortie
              </button>
            </div>

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

        {/* ─── BARRE D'ONGLETS / ÉTAPES WIZARD ─── */}
        <div style={{
          padding: '10px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: 8,
          background: '#ffffff',
          flexShrink: 0,
          overflowX: 'auto'
        }}>
          {STEPS.map((s) => {
            const isActive = s.num === step
            const isCompleted = s.num < step
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.num)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: isActive ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isActive ? '#4f46e5' : '#ffffff',
                  color: isActive ? '#ffffff' : (isCompleted ? '#1e293b' : '#64748b'),
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none'
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Toast notification */}
        {toastMsg && (
          <div style={{ padding: '8px 24px', background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #bbf7d0', flexShrink: 0 }}>
            {toastMsg}
          </div>
        )}

        {/* ─── CORPS PRINCIPAL (FORMULAIRE GAUCHE + APERÇU PDF DROITE) ─── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ═════════ COLONNE GAUCHE : FORMULAIRE WIZARD ═════════ */}
          <div style={{
            flex: '0 0 46%',
            maxWidth: '46%',
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            background: '#ffffff'
          }}>

            {/* ÉTAPE 1 : SÉLECTION DU LOGEMENT, DU BAIL ET DES PARTIES */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 🎯 SÉLECTION RAPIDE BIEN & BAIL */}
                <div style={{
                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  padding: 18,
                  borderRadius: 12,
                  border: '1.5px solid #c7d2fe',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#3730a3', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="sparkles" size={16} color="#4f46e5" />
                    🎯 Remplissage Ultra-Rapide : Choisir le Logement & Bail
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Sélecteur de Bien */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#312e81' }}>
                        1. Sélectionner l'appartement / bien immobilier :
                      </label>
                      <select
                        className="form-control"
                        style={{ fontWeight: 700, background: '#ffffff' }}
                        value={currentBienId}
                        onChange={e => handleSelectBien(e.target.value)}
                      >
                        <option value="">-- Choisir un logement --</option>
                        {allBiens.map(b => (
                          <option key={b.id} value={b.id}>
                            🏢 {b.nom} {b.adresse ? `(${b.adresse})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sélecteur de Bail / Locataire lié */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: '#312e81' }}>
                        2. Sélectionner le bail / locataire concerné :
                      </label>
                      <select
                        className="form-control"
                        style={{ fontWeight: 600, background: '#ffffff' }}
                        value={currentBailId}
                        onChange={e => handleSelectBail(e.target.value)}
                      >
                        <option value="">-- Choisir un bail ou locataire --</option>
                        {bauxDuBienSelectionne.map(b => {
                          const isActif = b.statut === 'actif'
                          return (
                            <option key={b.id} value={b.id}>
                              {isActif ? '🟢 Bail actif' : '🟠 Bail terminé'} — {b.locataire_prenom || ''} {b.locataire_nom || 'Locataire'} ({formatDate(b.date_debut)})
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bailleur */}
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="user" size={16} color="#4f46e5" /> Bailleur / Propriétaire
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nom complet du bailleur / SCI *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: M. Dupont Jean / SCI Les Oliviers"
                        value={bailleurNom}
                        onChange={e => setBailleurNom(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Adresse postale du bailleur</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 14 Rue de la République, 69002 Lyon"
                        value={bailleurAdresse}
                        onChange={e => setBailleurAdresse(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Locataire */}
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="users" size={16} color="#4f46e5" /> {isEntree ? 'Locataire Entrant' : 'Locataire Sortant'}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nom et prénom du locataire *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ex: Martin Claire"
                      value={locataireNomCustom}
                      onChange={e => setLocataireNomCustom(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : LOGEMENT ET DATES */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="house" size={16} color="#4f46e5" /> Identification du Logement
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Désignation / Nom du bien</label>
                      <input
                        type="text"
                        className="form-control"
                        value={bienNomCustom}
                        placeholder="ex: Appartement T3 Centre"
                        onChange={e => setBienNomCustom(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Adresse complète du logement</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 14 Rue de la République, 69002 Lyon"
                        value={bienAdresseCustom}
                        onChange={e => setBienAdresseCustom(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>
                          {isEntree ? "Date d'entrée effective" : "Date de sortie effective"}
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={dateEdl}
                          onChange={e => setDateEdl(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Régime juridique</label>
                        <div style={{
                          padding: '9px 12px',
                          borderRadius: 8,
                          background: '#e0e7ff',
                          color: '#4338ca',
                          fontWeight: 700,
                          fontSize: 13
                        }}>
                          {currentBail?.type_bail === 'meuble' ? '🛋️ Meublé (Loi ALUR)' : '🏢 Nu / Non Meublé'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : COMPTEURS & CLÉS */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="activity" size={16} color="#4f46e5" /> Relevé des Compteurs
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Électricité (kWh)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 14500"
                        value={elecIndex}
                        onChange={e => setElecIndex(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Eau froide (m³)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 380"
                        value={eauIndex}
                        onChange={e => setEauIndex(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Gaz (m³)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 125"
                        value={gazIndex}
                        onChange={e => setGazIndex(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="key" size={16} color="#4f46e5" /> {isEntree ? 'Remise des clés & accès' : 'Restitution des clés'}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Inventaire des clés remises</label>
                    <input
                      type="text"
                      className="form-control"
                      value={clesRemises}
                      onChange={e => setClesRemises(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : PIÈCES & ÉQUIPEMENTS */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="clipboard" size={16} color="#4f46e5" /> État détaillé par pièce
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPiece}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 700, color: '#4f46e5', borderColor: '#c7d2fe', background: '#eef2ff' }}
                    >
                      + Ajouter une pièce
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pieces.map((p, idx) => (
                      <div key={idx} style={{
                        padding: 12,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                          <input
                            type="text"
                            className="form-control"
                            style={{ fontWeight: 700 }}
                            value={p.nom}
                            onChange={e => handleEtatChange(idx, 'nom', e.target.value)}
                          />
                          <select
                            className="form-control"
                            value={p.etat}
                            onChange={e => handleEtatChange(idx, 'etat', e.target.value)}
                          >
                            <option value="Très bon état">Très bon état</option>
                            <option value="Bon état">Bon état</option>
                            <option value="État d'usage normal">État d'usage normal</option>
                            <option value="Dégradé / Travaux">Dégradé / Travaux</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control"
                            style={{ flex: 1, fontSize: 12 }}
                            placeholder="Observations (murs, sols, fenêtres, prises, etc.)"
                            value={p.obs}
                            onChange={e => handleEtatChange(idx, 'obs', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePiece(idx)}
                            className="btn btn-ghost btn-icon"
                            style={{ color: '#94a3b8' }}
                            title="Supprimer cette pièce"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 5 : CAUTION, OBSERVATIONS & FINALISATION */}
            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="creditCard" size={16} color="#4f46e5" />
                    {isEntree ? 'Dépôt de Garantie Encaissé' : 'Synthèse du Dépôt de Garantie'}
                  </div>

                  {isEntree ? (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Montant versé par le locataire (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        style={{ fontWeight: 700 }}
                        value={depotGarantieInitial}
                        onChange={e => setDepotGarantieInitial(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Caution initiale versée (€)</label>
                          <input
                            type="number"
                            className="form-control"
                            value={depotGarantieInitial}
                            onChange={e => setDepotGarantieInitial(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Retenue éventuelle (€)</label>
                          <input
                            type="number"
                            className="form-control"
                            value={montantRetenu}
                            onChange={e => setMontantRetenu(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Motif de la retenue</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="ex: Nettoyage et réfection des peintures"
                          value={motifRetenue}
                          onChange={e => setMotifRetenue(e.target.value)}
                        />
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        padding: '10px 14px',
                        borderRadius: 8
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>SOLDE NET À RESTITUER :</span>
                        <span style={{ fontSize: 15, fontWeight: 900, color: '#166534' }}>{formatEuro(soldeRestitue)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="fileText" size={16} color="#4f46e5" /> Observations Générales
                  </div>
                  <div className="form-group">
                    <textarea
                      rows={3}
                      className="form-control"
                      value={observationsGenerales}
                      onChange={e => setObservationsGenerales(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── NAVIGATION PRÉCÉDENT / SUIVANT / EXPORT ─── */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid var(--border-color)'
            }}>
              {step > 1 ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(s => s - 1)}
                  style={{ fontWeight: 700 }}
                >
                  ← Précédent
                </button>
              ) : <div />}

              {step < STEPS.length ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStep(s => s + 1)}
                  style={{
                    fontWeight: 700,
                    padding: '8px 24px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
                  }}
                >
                  Suivant →
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleExportPDF}
                    disabled={exporting}
                    style={{ fontWeight: 700 }}
                  >
                    <Icon name="download" size={14} /> {exporting ? 'Exportation...' : 'Exporter le PDF'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveToProperty}
                    disabled={saving}
                    style={{
                      fontWeight: 700,
                      background: isEntree ? '#16a34a' : '#2563eb',
                      borderColor: isEntree ? '#16a34a' : '#2563eb'
                    }}
                  >
                    <Icon name="save" size={14} /> {saving ? 'Enregistrement...' : 'Sauvegarder & Archiver'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ═════════ COLONNE DROITE : APERÇU PDF EN TEMPS RÉEL (AGRANDI ET NET) ═════════ */}
          <div style={{
            flex: '1 1 54%',
            maxWidth: '54%',
            borderLeft: '1px solid var(--border-color)',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Barre d'outils du visualiseur PDF */}
            <div style={{
              padding: '10px 18px',
              background: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block'
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                  APERÇU DU DOCUMENT PDF
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  (Synchronisé en direct)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleOpenPDFDirect}
                  style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8' }}
                >
                  <Icon name="externalLink" size={12} /> Ouvrir
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleExportPDF}
                  style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}
                >
                  <Icon name="download" size={12} /> Télécharger
                </button>
              </div>
            </div>

            {/* Zone d'affichage du PDF */}
            <div style={{ flex: 1, padding: 8, background: '#0f172a', overflow: 'hidden' }}>
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 6,
                    background: '#ffffff'
                  }}
                  title="Aperçu PDF"
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: 13
                }}>
                  Génération de l'aperçu PDF...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── BANDEAU FICHIER ARCHIVÉ SI EXISTANT ─── */}
        {savedPath && (
          <div style={{
            padding: '8px 24px',
            background: '#dcfce7',
            borderTop: '1px solid #bbf7d0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#166534' }}>
              <Icon name="folder" size={14} />
              <span><strong>Document archivé dans le dossier du bien :</strong> {savedPath}</span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => openFilePath(savedPath)}
              style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}
            >
              Ouvrir le fichier →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
