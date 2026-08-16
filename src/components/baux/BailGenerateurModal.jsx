import React, { useState, useEffect } from 'react'
import Icon from '../common/Icon'
import { formatEuro, formatDate, todayISO } from '../../lib/utils'
import {
  saveContratBailPdf, saveFileToDisk, openFilePath,
  updateBien, getBienChampsLibres, saveBienChampsLibresBatch,
  updateLocataire, updateBail
} from '../../lib/db'
import { buildContratBailPDF } from '../../lib/pdfGenerator'
import { save as openSaveDialog } from '@tauri-apps/plugin-dialog'

export default function BailGenerateurModal({
  bail,
  bien,
  locataire,
  formValues,
  onClose,
  onGenerated,
  onSendMail
}) {
  // Profil Bailleur en cache local
  const savedBailleur = (() => {
    try {
      const b = localStorage.getItem('keyfolio_bailleur_profile')
      return b ? JSON.parse(b) : {}
    } catch(e) { return {} }
  })()

  // Informations Bailleur
  const [bailleurNom, setBailleurNom] = useState(savedBailleur.nom || 'Bailleur / Propriétaire')
  const [bailleurAdresse, setBailleurAdresse] = useState(savedBailleur.adresse || 'Adresse du bailleur')
  const [bailleurEmail, setBailleurEmail] = useState(savedBailleur.email || '')
  const [bailleurTelephone, setBailleurTelephone] = useState(savedBailleur.telephone || '')

  // Informations Logement (auto-remplies et modifiables avec rétro-synchronisation)
  const [bienNom, setBienNom] = useState(bien?.nom || formValues?.bien_nom || 'Logement')
  const [bienAdresse, setBienAdresse] = useState(bien?.adresse || '')
  const [bienSurface, setBienSurface] = useState(bien?.surface_m2 ?? '')
  const [bienType, setBienType] = useState(bien?.type_bien || 'appartement')

  // Informations Locataire (auto-remplies et modifiables avec rétro-synchronisation)
  const [locatairePrenom, setLocatairePrenom] = useState(locataire?.prenom || formValues?.locataire_prenom || '')
  const [locataireNom, setLocataireNom] = useState(locataire?.nom || formValues?.locataire_nom || 'Locataire')
  const [locataireEmail, setLocataireEmail] = useState(locataire?.email || formValues?.locataire_email || '')
  const [locataireTelephone, setLocataireTelephone] = useState(locataire?.telephone || formValues?.locataire_telephone || '')
  const [locataireProfession, setLocataireProfession] = useState(locataire?.profession || '')

  // Informations Bail
  const [typeBail, setTypeBail] = useState(formValues?.type_bail || bail?.type_bail || 'meuble')
  const [dateDebut, setDateDebut] = useState(formValues?.date_debut || bail?.date_debut || todayISO())
  const [dateFin, setDateFin] = useState(formValues?.date_fin || bail?.date_fin || '')
  const [loyerHC, setLoyerHC] = useState(formValues?.loyer_mensuel ?? bail?.loyer_mensuel ?? bien?.loyer_actuel ?? 750)
  const [charges, setCharges] = useState(formValues?.charges_mensuelles ?? bail?.charges_mensuelles ?? 50)
  const [depotGarantie, setDepotGarantie] = useState(formValues?.depot_garantie ?? bail?.depot_garantie ?? 750)
  const [jourPaiement, setJourPaiement] = useState(formValues?.jour_paiement ?? bail?.jour_paiement ?? 5)
  const [clauseIRL, setClauseIRL] = useState(formValues?.clause_irl ?? true)

  // Index des compteurs d'entrée
  const [elecEntree, setElecEntree] = useState(formValues?.compteur_elec_entree || '')
  const [eauEntree, setEauEntree] = useState(formValues?.compteur_eau_entree || '')
  const [gazEntree, setGazEntree] = useState(formValues?.compteur_gaz_entree || '')

  const [activeTab, setActiveTab] = useState('logement') // 'logement' | 'locataire' | 'bailleur' | 'contrat'
  const [savedPath, setSavedPath] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const targetBienId = bien?.id || bail?.bien_id || (formValues?.bien_id ? parseInt(formValues.bien_id) : null)
  const targetLocataireId = locataire?.id || bail?.locataire_id || (formValues?.locataire_id ? parseInt(formValues.locataire_id) : null)

  // Chargement des champs libres du logement (compteurs existants etc.)
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

  const locataireFullName = `${locatairePrenom} ${locataireNom}`.trim() || 'Locataire'

  const getPdfDoc = () => {
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
      gazEntree
    })
  }

  // Synchronisation bidirectionnelle : met à jour le Logement, le Locataire et les Compteurs dans la BDD
  const syncEntitiesToDatabase = async () => {
    try {
      // 1. Sauvegarde du profil Bailleur
      localStorage.setItem('keyfolio_bailleur_profile', JSON.stringify({
        nom: bailleurNom,
        adresse: bailleurAdresse,
        email: bailleurEmail,
        telephone: bailleurTelephone
      }))

      // 2. Mise à jour du Logement si existant
      if (targetBienId && bien) {
        const updatedBien = {
          ...bien,
          nom: bienNom,
          adresse: bienAdresse,
          surface_m2: bienSurface !== '' ? parseFloat(bienSurface) : null,
          type_bien: bienType,
          loyer_actuel: parseFloat(loyerHC || 0)
        }
        await updateBien(updatedBien)

        // Sauvegarde des index de compteurs dans les champs libres du bien
        const batchItems = [
          { cle: 'compteur_elec', valeur: elecEntree },
          { cle: 'compteur_eau', valeur: eauEntree },
          { cle: 'compteur_gaz', valeur: gazEntree }
        ].filter(i => i.valeur && i.valeur.trim() !== '')

        if (batchItems.length > 0) {
          await saveBienChampsLibresBatch(targetBienId, batchItems)
        }
      }

      // 3. Mise à jour du Locataire si existant
      if (targetLocataireId && locataire) {
        const updatedLoc = {
          ...locataire,
          prenom: locatairePrenom,
          nom: locataireNom,
          email: locataireEmail,
          telephone: locataireTelephone,
          profession: locataireProfession
        }
        await updateLocataire(updatedLoc)
      }

      // 4. Mise à jour du Bail si en cours d'édition
      if (bail && bail.id) {
        const updatedBail = {
          ...bail,
          loyer_mensuel: parseFloat(loyerHC || 0),
          charges_mensuelles: parseFloat(charges || 0),
          depot_garantie: parseFloat(depotGarantie || 0),
          jour_paiement: parseInt(jourPaiement || 5),
          date_debut: dateDebut,
          date_fin: dateFin || null
        }
        await updateBail(updatedBail)
      }
    } catch (err) {
      console.warn('Avertissement synchronisation BDD :', err)
    }
  }

  // Sauvegarde automatique du PDF dans le dossier du bien
  const handleSaveToProperty = async () => {
    if (!targetBienId) return null
    setSaving(true)
    try {
      await syncEntitiesToDatabase()
      const doc = getPdfDoc()
      const pdfBase64 = doc.output('datauristring')
      const relPath = await saveContratBailPdf(
        bail?.id || null,
        targetBienId,
        locataireFullName,
        dateDebut,
        pdfBase64
      )
      setSavedPath(relPath)
      if (onGenerated) onGenerated(relPath)
      setToastMsg('💾 Contrat enregistré & Logement synchronisé !')
      return relPath
    } catch (err) {
      console.warn('Erreur sauvegarde contrat bail PDF :', err)
    } finally {
      setSaving(false)
      setTimeout(() => setToastMsg(null), 4000)
    }
  }

  // Exportation via dialogue natif Windows
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await syncEntitiesToDatabase()
      const doc = getPdfDoc()
      const safeNom = locataireFullName.replace(/[^a-zA-Z0-9_-]/g, '_')
      const defaultFilename = `Contrat_de_bail_${dateDebut}_${safeNom}.pdf`

      const relPath = await handleSaveToProperty()

      const chosenPath = await openSaveDialog({
        defaultPath: defaultFilename,
        filters: [{ name: 'Contrat de Bail PDF (*.pdf)', extensions: ['pdf'] }]
      })

      if (chosenPath) {
        const pdfBase64 = doc.output('datauristring')
        await saveFileToDisk(chosenPath, pdfBase64)
        setToastMsg(`✅ Contrat de bail exporté et logement synchronisé : ${chosenPath}`)
        await openFilePath(chosenPath)
      } else if (relPath) {
        await openFilePath(relPath)
      }
    } catch (err) {
      console.error('Erreur export bail PDF :', err)
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

  const isMeuble = typeBail === 'meuble' || typeBail === 'etudiant' || typeBail === 'mobilite'
  const totalLoyer = parseFloat(loyerHC || 0) + parseFloat(charges || 0)

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-card" style={{ maxWidth: 940, width: '96%', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>✨ Générateur de Contrat de Bail Type — Loi ALUR</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Les modifications saisies ici sont <strong>automatiquement synchronisées</strong> dans la fiche du logement et du locataire.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? '⏳ Exportation...' : '📥 Exporter le Bail en PDF'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenPDF}>
              📄 Ouvrir le PDF
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleSaveToProperty} disabled={saving}>
              {saving ? '⏳ Enregistrement...' : '💾 Sauvegarder & Synchroniser'}
            </button>
            {onSendMail && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onSendMail(targetBienId, {
                  recipientEmail: locataireEmail || '',
                  initialTemplate: 'nouveau_bail'
                })}
              >
                ✉️ Mail
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Toast info */}
        {toastMsg && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            {toastMsg}
          </div>
        )}

        {/* Onglets de saisie rapide */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button
            className={`btn btn-sm ${activeTab === 'logement' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('logement')}
          >
            🏠 Logement & Finances
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'locataire' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('locataire')}
          >
            👤 Locataire
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'bailleur' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('bailleur')}
          >
            🏢 Bailleur
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'contrat' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('contrat')}
          >
            ⚡ Compteurs & Conditions
          </button>
        </div>

        {/* PANNEAU 1 : LOGEMENT & FINANCES */}
        {activeTab === 'logement' && (
          <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              🏠 Informations du Logement (synchronisées avec le bien)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Nom du Logement</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={bienNom} onChange={e => setBienNom(e.target.value)} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Adresse complète</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={bienAdresse} placeholder="12 rue de la Paix, 75001 Paris" onChange={e => setBienAdresse(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Surface (m²)</label>
                <input type="number" step="0.1" className="form-control" style={{ fontSize: 12 }} value={bienSurface} placeholder="45" onChange={e => setBienSurface(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Type de bien</label>
                <select className="form-control" style={{ fontSize: 12 }} value={bienType} onChange={e => setBienType(e.target.value)}>
                  <option value="appartement">Appartement</option>
                  <option value="maison">Maison</option>
                  <option value="studio">Studio / T1</option>
                  <option value="colocation">Colocation</option>
                  <option value="commercial">Local Commercial</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Loyer HC (€)</label>
                <input type="number" step="0.01" className="form-control" style={{ fontSize: 12 }} value={loyerHC} onChange={e => setLoyerHC(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Provisions Charges (€)</label>
                <input type="number" step="0.01" className="form-control" style={{ fontSize: 12 }} value={charges} onChange={e => setCharges(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* PANNEAU 2 : LOCATAIRE */}
        {activeTab === 'locataire' && (
          <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              👤 Informations du Locataire (synchronisées avec la fiche locataire)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Prénom</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={locatairePrenom} onChange={e => setLocatairePrenom(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Nom</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={locataireNom} onChange={e => setLocataireNom(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Profession</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={locataireProfession} placeholder="ex: Ingénieur, Salarié..." onChange={e => setLocataireProfession(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Email du Locataire</label>
                <input type="email" className="form-control" style={{ fontSize: 12 }} value={locataireEmail} placeholder="locataire@email.com" onChange={e => setLocataireEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Téléphone</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={locataireTelephone} placeholder="06 12 34 56 78" onChange={e => setLocataireTelephone(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* PANNEAU 3 : BAILLEUR */}
        {activeTab === 'bailleur' && (
          <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              🏢 Coordonnées du Bailleur / Propriétaire (sauvegardées pour les prochains baux)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Nom complet ou Société</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={bailleurNom} onChange={e => setBailleurNom(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Adresse postale</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={bailleurAdresse} onChange={e => setBailleurAdresse(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Email</label>
                <input type="email" className="form-control" style={{ fontSize: 12 }} value={bailleurEmail} placeholder="bailleur@email.com" onChange={e => setBailleurEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Téléphone</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} value={bailleurTelephone} placeholder="06 00 00 00 00" onChange={e => setBailleurTelephone(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* PANNEAU 4 : COMPTEURS & CONDITIONS */}
        {activeTab === 'contrat' && (
          <div style={{ background: 'var(--color-surface-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              ⚡ Compteurs à l'Entrée & Paramètres du Contrat
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Électricité (kWh)</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} placeholder="ex: 14250" value={elecEntree} onChange={e => setElecEntree(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Eau froide (m³)</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} placeholder="ex: 345" value={eauEntree} onChange={e => setEauEntree(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Gaz (m³)</label>
                <input type="text" className="form-control" style={{ fontSize: 12 }} placeholder="ex: 120" value={gazEntree} onChange={e => setGazEntree(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Régime du bail</label>
                <select className="form-control" style={{ fontSize: 12 }} value={typeBail} onChange={e => setTypeBail(e.target.value)}>
                  <option value="meuble">Meublé (1 an)</option>
                  <option value="nu">Nu / Vide (3 ans)</option>
                  <option value="etudiant">Étudiant (9 mois)</option>
                  <option value="mobilite">Mobilité (1 à 10 mois)</option>
                  <option value="colocation">Colocation</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Date de prise d'effet</label>
                <input type="date" className="form-control" style={{ fontSize: 12 }} value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Caution / Dépôt (€)</label>
                <input type="number" step="0.01" className="form-control" style={{ fontSize: 12 }} value={depotGarantie} onChange={e => setDepotGarantie(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Jour d'échéance</label>
                <input type="number" min="1" max="28" className="form-control" style={{ fontSize: 12 }} value={jourPaiement} onChange={e => setJourPaiement(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* FEUILLE DE PRÉVISUALISATION DU CONTRAT DE BAIL */}
        <div style={{ background: '#ffffff', color: '#0f172a', padding: 28, borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'Arial, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          
          {/* Titre */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 17, fontWeight: 800, textTransform: 'uppercase' }}>
                {isMeuble ? 'CONTRAT DE LOCATION DE LOGEMENT MEUBLÉ' : 'CONTRAT DE LOCATION DE LOGEMENT NON MEUBLÉ'}
              </h2>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                Régime de la Loi n° 89-462 du 6 juillet 1989 modifiée — Décret type n° 2015-587 (Loi ALUR)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#2563eb' }}>KeyFolio</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Date : {formatDate(dateDebut)}</div>
            </div>
          </div>

          {/* I. Parties */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 6 }}>
              I. DÉSIGNATION DES PARTIES CONTRACTANTES
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>LE BAILLEUR</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{bailleurNom}</div>
                <div style={{ fontSize: 11, color: '#334155' }}>{bailleurAdresse}</div>
                {bailleurEmail && <div style={{ fontSize: 11, color: '#334155' }}>Email : {bailleurEmail}</div>}
              </div>

              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>LE LOCATAIRE</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{locataireFullName}</div>
                <div style={{ fontSize: 11, color: '#334155' }}>
                  {locataireEmail ? `Email : ${locataireEmail}` : ''}
                  {locataireTelephone ? ` | Tél : ${locataireTelephone}` : ''}
                </div>
                {locataireProfession && (
                  <div style={{ fontSize: 11, color: '#334155' }}>Profession : {locataireProfession}</div>
                )}
              </div>
            </div>
          </div>

          {/* II. Logement */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 6 }}>
              II. OBJET DU CONTRAT & DÉSIGNATION DU BIEN LOUÉ
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, fontSize: 11, lineHeight: 1.6 }}>
              <div>• <strong>Logement :</strong> {bienNom} — {bienAdresse || 'Adresse non spécifiée'}</div>
              <div>• <strong>Surface habitable :</strong> {bienSurface ? `${bienSurface} m²` : 'Non précisée'} | <strong>Type de bien :</strong> {bienType}</div>
              <div>• <strong>Destination :</strong> Usage exclusif d'habitation principale</div>
              <div>• <strong>Régime :</strong> Logement {isMeuble ? 'meublé selon inventaire' : 'vide / non meublé'}</div>
            </div>
          </div>

          {/* III. Conditions financières */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 6 }}>
              III. CONDITIONS FINANCIÈRES DU BAIL
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #cbd5e1', marginBottom: 10 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Désignation financière</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Montant mensuel</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px' }}>Loyer principal de base (hors charges)</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatEuro(loyerHC)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px' }}>Provisions sur charges locatives</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatEuro(charges)}</td>
                </tr>
                <tr style={{ background: '#f1f5f9', fontWeight: 800, color: '#166534' }}>
                  <td style={{ padding: '8px 8px' }}>TOTAL MENSUEL CHARGES COMPRISES</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>{formatEuro(totalLoyer)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
              <div>• <strong>Paiement :</strong> Le {jourPaiement} du mois par virement</div>
              <div>• <strong>Dépôt de garantie :</strong> {formatEuro(depotGarantie)}</div>
              <div>• <strong>Clause IRL :</strong> {clauseIRL ? 'Indexation annuelle prévue' : 'Non'}</div>
            </div>
          </div>

          {/* IV. Durée */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 6 }}>
              IV. DURÉE, PRISE D'EFFET & CONGÉS
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, fontSize: 11, lineHeight: 1.5 }}>
              <div>• <strong>Prise d'effet :</strong> {formatDate(dateDebut)}</div>
              <div>• <strong>Durée :</strong> {isMeuble ? '1 an (tacitement reconductible)' : '3 ans (tacitement reconductible)'}</div>
              <div>• <strong>Congés :</strong> Préavis légal de 1 mois pour le locataire (logement meublé ou zone tendue) et 3 mois pour le bailleur (vente/reprise).</div>
            </div>
          </div>

          {/* V. Compteurs d'entrée */}
          {(elecEntree || eauEntree || gazEntree) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 4 }}>
                V. RELEVÉ DES COMPTEURS D'ENTRÉE
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, fontSize: 11, color: '#334155' }}>
                Électricité : <strong>{elecEntree ? `${elecEntree} kWh` : '—'}</strong> | Eau : <strong>{eauEntree ? `${eauEntree} m³` : '—'}</strong> | Gaz : <strong>{gazEntree ? `${gazEntree} m³` : '—'}</strong>
              </div>
            </div>
          )}

          {/* VI. Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, borderTop: '1px solid #cbd5e1', paddingTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>Signature du Bailleur (ou mandataire) :</div>
              <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>Mention "Lu et approuvé"</div>
              <div style={{ height: 45, borderBottom: '1px dotted #94a3b8', marginTop: 8 }}></div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>Signature du Locataire :</div>
              <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>Mention "Lu et approuvé"</div>
              <div style={{ height: 45, borderBottom: '1px dotted #94a3b8', marginTop: 8 }}></div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={handleExportPDF} disabled={exporting}>
            {exporting ? '⏳ Génération du PDF...' : '📥 Exporter le Contrat en PDF direct'}
          </button>
        </div>
      </div>
    </div>
  )
}
