import React, { useState, useEffect, useCallback, useRef } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import {
  saveContratBailPdf,
  saveFileToDisk,
  openFilePath,
  openTemplatesFolder,
  updateBien,
  getBienChampsLibres,
  saveBienChampsLibresBatch,
  updateLocataire,
  updateBail
} from '../../lib/db'
import { buildContratBailPDF } from '../../lib/pdfGenerator'
import { createPdfFromTemplate } from '../../lib/pdfTemplateCreator'
import { buildDataContext } from '../../lib/pdfTemplateEngine'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

const STEPS = [
  { num: 1, id: 'parties', label: '1. Parties' },
  { num: 2, id: 'logement', label: '2. Logement & Type' },
  { num: 3, id: 'duree_loyer', label: '3. Durée & Loyer' },
  { num: 4, id: 'compteurs', label: '4. Compteurs & Mobilier' },
  { num: 5, id: 'clauses', label: '5. Clauses & Finalisation' },
]

export default function BailGenerateurModal({
  bail,
  bien,
  locataire,
  formValues,
  onClose,
  onGenerated,
  onSendMail
}) {
  const [step, setStep] = useState(1)

  // Profil Bailleur sauvegardé
  const savedBailleur = (() => {
    try {
      const b = localStorage.getItem('keyfolio_bailleur_profile')
      return b ? JSON.parse(b) : {}
    } catch(e) { return {} }
  })()

  // 1. Informations Bailleur
  const [bailleurNom, setBailleurNom] = useState(savedBailleur.nom || localStorage.getItem('bailleur_nom') || 'Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState(savedBailleur.adresse || localStorage.getItem('bailleur_adresse') || 'Adresse du bailleur')
  const [bailleurEmail, setBailleurEmail] = useState(savedBailleur.email || localStorage.getItem('bailleur_email') || '')
  const [bailleurTelephone, setBailleurTelephone] = useState(savedBailleur.telephone || localStorage.getItem('bailleur_telephone') || '')

  // 2. Informations Logement
  const [bienNom, setBienNom] = useState(bien?.nom || formValues?.bien_nom || 'Logement')
  const [bienAdresse, setBienAdresse] = useState(bien?.adresse || '')
  const [bienSurface, setBienSurface] = useState(bien?.surface_m2 ?? '')
  const [bienType, setBienType] = useState(bien?.type_bien || 'appartement')

  // 3. Informations Locataire
  const [locatairePrenom, setLocatairePrenom] = useState(locataire?.prenom || formValues?.locataire_prenom || '')
  const [locataireNom, setLocataireNom] = useState(locataire?.nom || formValues?.locataire_nom || 'Locataire')
  const [locataireEmail, setLocataireEmail] = useState(locataire?.email || formValues?.locataire_email || '')
  const [locataireTelephone, setLocataireTelephone] = useState(locataire?.telephone || formValues?.locataire_telephone || '')
  const [locataireProfession, setLocataireProfession] = useState(locataire?.profession || '')

  // 4. Informations Bail & Finances
  const [typeBail, setTypeBail] = useState(formValues?.type_bail || bail?.type_bail || 'meuble')
  const [dateDebut, setDateDebut] = useState(formValues?.date_debut || bail?.date_debut || todayISO())
  const [dateFin, setDateFin] = useState(formValues?.date_fin || bail?.date_fin || '')
  const [loyerHC, setLoyerHC] = useState(formValues?.loyer_mensuel ?? bail?.loyer_mensuel ?? bien?.loyer_actuel ?? 750)
  const [charges, setCharges] = useState(formValues?.charges_mensuelles ?? bail?.charges_mensuelles ?? 50)
  const [depotGarantie, setDepotGarantie] = useState(formValues?.depot_garantie ?? bail?.depot_garantie ?? 750)
  const [jourPaiement, setJourPaiement] = useState(formValues?.jour_paiement ?? bail?.jour_paiement ?? 5)
  const [clauseIRL, setClauseIRL] = useState(formValues?.clause_irl ?? true)

  // 5. Index compteurs d'entrée & Équipements
  const [elecEntree, setElecEntree] = useState(formValues?.compteur_elec_entree || '')
  const [eauEntree, setEauEntree] = useState(formValues?.compteur_eau_entree || '')
  const [gazEntree, setGazEntree] = useState(formValues?.compteur_gaz_entree || '')
  const [equipements, setEquipements] = useState(
    bailTpl?.clauses?.equipementsMeuble || 'Cuisine équipée, literie conforme, rangements, luminaires, table et chaises, nécessaire d\'entretien ménager'
  )
  const [clausesParticulieres, setClausesParticulieres] = useState(
    bailTpl?.clauses?.clausesParticulieres || 'Interdiction de sous-louer sans accord exprès et écrit du bailleur. Respect de la tranquillité et du règlement de copropriété.'
  )

  const [savedPath, setSavedPath] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  // Live PDF preview state
  const [pdfUrl, setPdfUrl] = useState(null)
  const debounceRef = useRef(null)

  const targetBienId = bien?.id || bail?.bien_id || (formValues?.bien_id ? parseInt(formValues.bien_id) : null)
  const targetLocataireId = locataire?.id || bail?.locataire_id || (formValues?.locataire_id ? parseInt(formValues.locataire_id) : null)

  // Chargement des compteurs existants du bien
  useEffect(() => {
    if (targetBienId) {
      getBienChampsLibres(targetBienId).then(champs => {
        if (champs && Array.isArray(champs)) {
          const map = {}
          champs.forEach(c => { map[c.cle] = c.valeur })
          if (map.compteur_elec && !elecEntree) setElecEntree(map.compteur_elec)
          if (map.compteur_eau && !eauEntree) setEauEntree(map.compteur_eau)
          if (map.compteur_gaz && !gazEntree) setGazEntree(map.compteur_gaz)
        }
      }).catch(() => {})
    }
  }, [targetBienId])

  const isMeuble = typeBail === 'meuble' || typeBail === 'etudiant' || typeBail === 'mobilite'
  const totalLoyer = parseFloat(loyerHC || 0) + parseFloat(charges || 0)

  // Génération du document PDF
  const getPdfDoc = useCallback(() => {
    return buildContratBailPDF({
      bail,
      bien: {
        ...bien,
        nom: bienNom,
        adresse: bienAdresse,
        surface_m2: parseFloat(bienSurface || 0),
        type_bien: bienType
      },
      locataire: {
        ...locataire,
        prenom: locatairePrenom,
        nom: locataireNom,
        email: locataireEmail,
        telephone: locataireTelephone,
        profession: locataireProfession
      },
      bailleurNom,
      bailleurAdresse,
      bailleurEmail,
      bailleurTelephone,
      typeBail,
      dateDebut,
      dateFin,
      loyerHC: parseFloat(loyerHC || 0),
      charges: parseFloat(charges || 0),
      depotGarantie: parseFloat(depotGarantie || 0),
      jourPaiement: parseInt(jourPaiement || 5),
      clauseIRL,
      elecEntree,
      eauEntree,
      gazEntree,
      equipements,
      clausesParticulieres
    })
  }, [bail, bien, locataire, bienNom, bienAdresse, bienSurface, bienType, locatairePrenom, locataireNom, locataireEmail, locataireTelephone, locataireProfession, bailleurNom, bailleurAdresse, bailleurEmail, bailleurTelephone, typeBail, dateDebut, dateFin, loyerHC, charges, depotGarantie, jourPaiement, clauseIRL, elecEntree, eauEntree, gazEntree, equipements, clausesParticulieres])

  // Construction du résultat PDF (en utilisant le template PDF réel du disque ou le générateur)
  const getPdfResult = useCallback(async () => {
    const dataCtx = buildDataContext({
      bail,
      bien: { ...bien, nom: bienNom, adresse: bienAdresse, surface_m2: parseFloat(bienSurface || 0), type_bien: bienType },
      locataire: { ...locataire, prenom: locatairePrenom, nom: locataireNom, email: locataireEmail, telephone: locataireTelephone, profession: locataireProfession },
      dateDoc: dateDebut,
      loyerHC: parseFloat(loyerHC || 0),
      charges: parseFloat(charges || 0),
      depotGarantie: parseFloat(depotGarantie || 0),
      elecIndex: elecEntree,
      eauIndex: eauEntree,
      gazIndex: gazEntree,
      customValues: {
        bailleur_nom: bailleurNom,
        bailleur_adresse: bailleurAdresse,
        bailleur_email: bailleurEmail,
        bailleur_telephone: bailleurTelephone
      }
    })

    return await createPdfFromTemplate({
      templatePdfName: 'modele_contrat_bail.pdf',
      dataContext: dataCtx,
      fallbackGenerator: getPdfDoc
    })
  }, [bail, bien, locataire, bienNom, bienAdresse, bienSurface, bienType, locatairePrenom, locataireNom, locataireEmail, locataireTelephone, locataireProfession, dateDebut, loyerHC, charges, depotGarantie, elecEntree, eauEntree, gazEntree, bailleurNom, bailleurAdresse, bailleurEmail, bailleurTelephone, getPdfDoc])

  // PDF Preview live update with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getPdfResult()
        setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return res.blobUrl })
      } catch (e) {
        console.warn('PDF preview error', e)
      }
    }, 450)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [getPdfResult])

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }
  }, [])

  // Synchronisation avec la base de données
  const syncEntitiesToDatabase = async () => {
    try {
      localStorage.setItem('keyfolio_bailleur_profile', JSON.stringify({
        nom: bailleurNom,
        adresse: bailleurAdresse,
        email: bailleurEmail,
        telephone: bailleurTelephone
      }))

      if (targetBienId && bien) {
        await updateBien(targetBienId, {
          ...bien,
          nom: bienNom,
          adresse: bienAdresse,
          surface_m2: bienSurface !== '' ? parseFloat(bienSurface) : null,
          type_bien: bienType,
          loyer_actuel: parseFloat(loyerHC || 0)
        })

        const champsToSave = []
        if (elecEntree) champsToSave.push({ cle: 'compteur_elec', valeur: String(elecEntree) })
        if (eauEntree) champsToSave.push({ cle: 'compteur_eau', valeur: String(eauEntree) })
        if (gazEntree) champsToSave.push({ cle: 'compteur_gaz', valeur: String(gazEntree) })
        if (champsToSave.length > 0) {
          await saveBienChampsLibresBatch(targetBienId, champsToSave)
        }
      }

      if (targetLocataireId && locataire) {
        await updateLocataire(targetLocataireId, {
          ...locataire,
          prenom: locatairePrenom,
          nom: locataireNom,
          email: locataireEmail,
          telephone: locataireTelephone,
          profession: locataireProfession
        })
      }

      if (bail?.id) {
        await updateBail(bail.id, {
          ...bail,
          type_bail: typeBail,
          date_debut: dateDebut,
          date_fin: dateFin || null,
          loyer_mensuel: parseFloat(loyerHC || 0),
          charges_mensuelles: parseFloat(charges || 0),
          depot_garantie: parseFloat(depotGarantie || 0),
          jour_paiement: parseInt(jourPaiement || 5),
          clause_irl: !!clauseIRL
        })
      }
    } catch (err) {
      console.warn('Erreur synchronisation BDD :', err)
    }
  }

  // Sauvegarde dans le sous-dossier 07_LOCATION/Baux du bien
  const handleSaveToProperty = async () => {
    if (!targetBienId) {
      setToastMsg('Aucun bien associé pour la sauvegarde.')
      return null
    }
    setSaving(true)
    try {
      await syncEntitiesToDatabase()
      const res = await getPdfResult()
      const pdfBase64 = res.dataUri
      const sanitizedLocataire = locataireNom.replace(/[^a-zA-Z0-9_-]/g, '_')
      const customFilename = `Contrat_Bail_${sanitizedLocataire}_${dateDebut || todayISO()}.pdf`

      const relPath = await saveContratBailPdf(targetBienId, pdfBase64, customFilename)
      setSavedPath(relPath)
      setToastMsg(`✅ Contrat de bail enregistré & synchronisé : ${relPath}`)
      if (onGenerated) onGenerated(relPath)
      return relPath
    } catch (err) {
      setToastMsg(`❌ Erreur d'enregistrement : ${err?.toString()}`)
      return null
    } finally {
      setSaving(false)
      setTimeout(() => setToastMsg(null), 6000)
    }
  }

  // Exportation locale du PDF
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await syncEntitiesToDatabase()
      const res = await getPdfResult()
      const sanitizedLocataire = locataireNom.replace(/[^a-zA-Z0-9_-]/g, '_')
      const defaultFilename = `Contrat_Bail_${sanitizedLocataire}_${dateDebut || todayISO()}.pdf`

      const savePath = await openSaveDialog({
        defaultPath: defaultFilename,
        filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
      })

      if (savePath) {
        const rawBase64 = res.dataUri.split(',')[1]
        await saveFileToDisk(savePath, rawBase64)
        setToastMsg(`✅ Contrat de bail exporté avec succès : ${savePath}`)
      }
    } catch (err) {
      setToastMsg(`❌ Erreur export PDF : ${err?.toString()}`)
    } finally {
      setExporting(false)
      setTimeout(() => setToastMsg(null), 5000)
    }
  }

  const handleOpenPDF = async () => {
    if (savedPath) {
      await openFilePath(savedPath)
    } else {
      const rel = await handleSaveToProperty()
      if (rel) await openFilePath(rel)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: 1460,
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
              <Icon name="fileText" size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                Contrat de Location & Bail d'Habitation
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Assistant pas-à-pas • Étape {step} sur {STEPS.length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

        {/* Toast notification message */}
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

            {/* ÉTAPE 1 : PARTIES CONTRACTANTES */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="user" size={16} color="#4f46e5" /> Bailleur / Propriétaire
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nom du bailleur ou SCI *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: M. Dupont Jean / SCI Les Oliviers"
                        value={bailleurNom}
                        onChange={e => setBailleurNom(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Adresse complète du bailleur</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 14 Rue de la République, 69002 Lyon"
                        value={bailleurAdresse}
                        onChange={e => setBailleurAdresse(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Email</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="bailleur@exemple.com"
                          value={bailleurEmail}
                          onChange={e => setBailleurEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Téléphone</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="06 12 34 56 78"
                          value={bailleurTelephone}
                          onChange={e => setBailleurTelephone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="users" size={16} color="#4f46e5" /> Locataire (Preneur)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Prénom *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Claire"
                          value={locatairePrenom}
                          onChange={e => setLocatairePrenom(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nom de famille *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Martin"
                          value={locataireNom}
                          onChange={e => setLocataireNom(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Profession / Statut</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: Salarié CDI, Cadre, Étudiant..."
                        value={locataireProfession}
                        onChange={e => setLocataireProfession(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Email</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="locataire@exemple.com"
                          value={locataireEmail}
                          onChange={e => setLocataireEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Téléphone</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="06 98 76 54 32"
                          value={locataireTelephone}
                          onChange={e => setLocataireTelephone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : LOGEMENT ET TYPE DE BAIL */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="tag" size={16} color="#4f46e5" /> Type de Location & Régime
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {[
                      { id: 'meuble', label: '🛋️ Meublé (1 an)' },
                      { id: 'non_meuble', label: '🏢 Nu / Non meublé (3 ans)' },
                      { id: 'etudiant', label: '🎓 Étudiant (9 mois)' },
                      { id: 'mobilite', label: '✈️ Bail Mobilité' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTypeBail(t.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: typeBail === t.id ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                          background: typeBail === t.id ? '#eef2ff' : '#ffffff',
                          color: typeBail === t.id ? '#4338ca' : '#475569',
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="house" size={16} color="#4f46e5" /> Description du Logement
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Désignation / Nom du bien</label>
                      <input
                        type="text"
                        className="form-control"
                        value={bienNom}
                        onChange={e => setBienNom(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Adresse complète des locaux loués</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Numéro, rue, code postal, ville, étage, porte"
                        value={bienAdresse}
                        onChange={e => setBienAdresse(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Type de bien</label>
                        <select
                          className="form-control"
                          value={bienType}
                          onChange={e => setBienType(e.target.value)}
                        >
                          <option value="appartement">Appartement</option>
                          <option value="maison">Maison individuelle</option>
                          <option value="studio">Studio / T1</option>
                          <option value="colocation">Colocation</option>
                          <option value="commercial">Local commercial</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Surface habitable (m²)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          placeholder="ex: 45"
                          value={bienSurface}
                          onChange={e => setBienSurface(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : DURÉE & CONDITIONS FINANCIÈRES */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="calendar" size={16} color="#4f46e5" /> Durée & Prise d'Effet
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Date de début (prise d'effet)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={dateDebut}
                        onChange={e => setDateDebut(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Date de fin prévisionnelle</label>
                      <input
                        type="date"
                        className="form-control"
                        value={dateFin}
                        onChange={e => setDateFin(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="coins" size={16} color="#4f46e5" /> Loyer, Charges & Caution
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Loyer mensuel HC (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          style={{ fontWeight: 700 }}
                          value={loyerHC}
                          onChange={e => setLoyerHC(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Provisions charges (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={charges}
                          onChange={e => setCharges(e.target.value)}
                        />
                      </div>
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
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>TOTAL MENSUEL CHARGES COMPRISES :</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#166534' }}>{formatEuro(totalLoyer)}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Jour d'exigibilité</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          className="form-control"
                          value={jourPaiement}
                          onChange={e => setJourPaiement(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Dépôt de garantie / Caution (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={depotGarantie}
                          onChange={e => setDepotGarantie(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : COMPTEURS & MOBILIER */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="activity" size={16} color="#4f46e5" /> Relevé des Compteurs à l'Entrée
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Électricité (kWh)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 14500"
                        value={elecEntree}
                        onChange={e => setElecEntree(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Eau froide (m³)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 380"
                        value={eauEntree}
                        onChange={e => setEauEntree(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Gaz (m³)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 125"
                        value={gazEntree}
                        onChange={e => setGazEntree(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {isMeuble && (
                  <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="sparkles" size={16} color="#4f46e5" /> Équipements et Mobilier (Inventaire légal)
                    </div>
                    <div className="form-group">
                      <textarea
                        rows={3}
                        className="form-control"
                        value={equipements}
                        onChange={e => setEquipements(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 5 : CLAUSES, IRL & FINALISATION */}
            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="fileText" size={16} color="#4f46e5" /> Clauses & Révision IRL
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={clauseIRL}
                        onChange={e => setClauseIRL(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#4f46e5' }}
                      />
                      Clause de révision annuelle du loyer selon l'Indice INSEE (IRL)
                    </label>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Clauses particulières complémentaires</label>
                      <textarea
                        rows={3}
                        className="form-control"
                        value={clausesParticulieres}
                        placeholder="Clauses spécifiques convenues entre les parties..."
                        onChange={e => setClausesParticulieres(e.target.value)}
                      />
                    </div>
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
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
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
                  APERÇU DU CONTRAT DE BAIL PDF
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  (Synchronisé en direct)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleOpenPDF}
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
                  title="Aperçu PDF Bail"
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
