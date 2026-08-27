import React, { useState, useEffect } from 'react'
import { AVAILABLE_VARIABLES, getLoadedTemplateConfig, DEFAULT_TEMPLATES, replaceTextTags } from '../../lib/pdfTemplateEngine'
import { getPdfTemplate, savePdfTemplate, openTemplatesFolder } from '../../lib/db'
import Icon from '../common/Icon'

const TEMPLATE_FILES = [
  { id: 'quittance_template', label: '📄 Quittance de Loyer', file: 'quittance_template.json', pdfFile: 'modele_quittance.pdf' },
  { id: 'avis_echeance_template', label: '📄 Avis d\'Échéance', file: 'avis_echeance_template.json', pdfFile: 'modele_avis_echeance.pdf' },
  { id: 'etat_des_lieux_template', label: '📄 État des Lieux', file: 'etat_des_lieux_template.json', pdfFile: 'modele_etat_des_lieux.pdf' },
  { id: 'fin_bail_template', label: '📄 Fin de Bail & Caution', file: 'fin_bail_template.json', pdfFile: 'modele_fin_bail.pdf' },
  { id: 'contrat_bail_template', label: '📄 Contrat de Bail ALUR', file: 'contrat_bail_template.json', pdfFile: 'modele_contrat_bail.pdf' }
]

export default function PdfTemplateManagerModal({ isOpen, onClose, initialTemplateId = 'quittance_template' }) {
  const [selectedTpl, setSelectedTpl] = useState(
    TEMPLATE_FILES.find(t => t.id === initialTemplateId || t.file === initialTemplateId) || TEMPLATE_FILES[0]
  )
  const [jsonContent, setJsonContent] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('visual') // 'visual' | 'code'

  useEffect(() => {
    if (initialTemplateId) {
      const match = TEMPLATE_FILES.find(t => t.id === initialTemplateId || t.file === initialTemplateId)
      if (match) setSelectedTpl(match)
    }
  }, [initialTemplateId, isOpen])

  // Charger le fichier JSON du template sélectionné (avec fallback immédiat)
  useEffect(() => {
    if (!isOpen || !selectedTpl) return
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    // Fallback instantané
    const fallbackData = getLoadedTemplateConfig(selectedTpl.file)
    setParsedData(fallbackData)
    setJsonContent(JSON.stringify(fallbackData, null, 2))

    // Tentative de chargement depuis Tauri
    getPdfTemplate(selectedTpl.file)
      .then(res => {
        if (res) {
          setJsonContent(res)
          try {
            const parsed = JSON.parse(res)
            setParsedData(parsed)
            localStorage.setItem(`keyfolio_tpl_${selectedTpl.file}`, JSON.stringify(parsed, null, 2))
          } catch (e) {
            console.warn('JSON parse error from tauri file, using fallback', e)
          }
        }
      })
      .catch(err => {
        console.info('Utilisation du modèle par défaut pour', selectedTpl.file, err)
      })
      .finally(() => setLoading(false))
  }, [selectedTpl, isOpen])

  if (!isOpen) return null

  // Sauvegarder les modifications
  const handleSave = async (contentToSave = jsonContent) => {
    setError(null)
    setSuccessMsg(null)
    try {
      const parsed = typeof contentToSave === 'string' ? JSON.parse(contentToSave) : contentToSave
      const strContent = JSON.stringify(parsed, null, 2)

      // 1. Sauvegarde dans localStorage pour synchronisation immédiate
      localStorage.setItem(`keyfolio_tpl_${selectedTpl.file}`, strContent)

      // 2. Sauvegarde dans le backend Tauri si disponible
      try {
        await savePdfTemplate(selectedTpl.file, strContent)
      } catch (tauriErr) {
        console.warn('Erreur savePdfTemplate Tauri (conservé en localStorage):', tauriErr)
      }

      setJsonContent(strContent)
      setParsedData(parsed)

      // 3. Notifier l'ensemble de l'application
      window.dispatchEvent(new Event('keyfolio_templates_updated'))

      setSuccessMsg('✨ Modèle enregistré avec succès ! Balises et textes pris en compte immédiatement.')
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (e) {
      setError(`Erreur de syntaxe JSON : ${e?.message}`)
    }
  }

  const updateNestedField = (path, value) => {
    const base = parsedData || getLoadedTemplateConfig(selectedTpl.file)
    const updated = JSON.parse(JSON.stringify(base))
    const parts = path.split('.')
    let curr = updated
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {}
      curr = curr[parts[i]]
    }
    curr[parts[parts.length - 1]] = value
    setParsedData(updated)
    setJsonContent(JSON.stringify(updated, null, 2))
  }

  // Calcul d'aperçu dynamique du texte d'attestation ou de clause
  const getSimulatedText = (rawText) => {
    if (!rawText) return ''
    const sampleCtx = {
      bailleur_nom: parsedData?.bailleur?.nomParDefaut || 'SCI Immobilière Dupont',
      bailleur_adresse: parsedData?.bailleur?.adresseParDefaut || '12 rue de la Paix, 75002 Paris',
      locataire_nom: 'Thomas Bernard',
      locataire_prenom: 'Thomas',
      bien_nom: 'Appartement T3 Centre',
      bien_adresse: '15 avenue des Lilas, 69003 Lyon',
      bien_surface: '65 m²',
      bien_pieces: '3 pièces',
      montant_total: '750.00 €',
      loyer_hc: '680.00 €',
      charges: '70.00 €',
      periode: 'Mars 2026',
      date_paiement: '05/03/2026',
      date_echeance: '05/03/2026',
      date_jour: '27/08/2026',
      depot_garantie: '680.00 €',
      montant_retenu: '50.00 €',
      solde_restitue: '630.00 €',
      index_elec: '14250 kWh',
      index_eau: '385 m³',
      index_gaz: '890 m³',
      cles_remises: '2 jeux complets + badge'
    }

    return replaceTextTags(rawText, sampleCtx)
  }

  const copyVariableTag = (varKey) => {
    navigator.clipboard.writeText(`{${varKey}}`)
    setSuccessMsg(`Balise {${varKey}} copiée dans le presse-papier !`)
    setTimeout(() => setSuccessMsg(null), 2500)
  }

  const renderVisualEditor = () => {
    const data = parsedData || {}

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* CHARTE GRAPHIQUE & COULEURS */}
        {data.theme && (
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="palette" size={15} color="#4f46e5" /> Charte graphique & Couleurs du modèle
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {data.theme.primaryColor !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Couleur Principale</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={data.theme.primaryColor || '#2563eb'}
                      onChange={e => updateNestedField('theme.primaryColor', e.target.value)}
                      style={{ width: 36, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={data.theme.primaryColor || ''}
                      onChange={e => updateNestedField('theme.primaryColor', e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    />
                  </div>
                </div>
              )}
              {data.theme.couleurEntree !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Couleur Entrée</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={data.theme.couleurEntree || '#16a34a'}
                      onChange={e => updateNestedField('theme.couleurEntree', e.target.value)}
                      style={{ width: 36, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={data.theme.couleurEntree || ''}
                      onChange={e => updateNestedField('theme.couleurEntree', e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    />
                  </div>
                </div>
              )}
              {data.theme.couleurSortie !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Couleur Sortie</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={data.theme.couleurSortie || '#2563eb'}
                      onChange={e => updateNestedField('theme.couleurSortie', e.target.value)}
                      style={{ width: 36, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={data.theme.couleurSortie || ''}
                      onChange={e => updateNestedField('theme.couleurSortie', e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COORDONNÉES BAILLEUR PAR DÉFAUT */}
        {data.bailleur && (
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="user" size={15} color="#4f46e5" /> Coordonnées Bailleur / Propriétaire par défaut
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {data.bailleur.nomParDefaut !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nom ou Raison Sociale</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.bailleur.nomParDefaut || ''}
                    onChange={e => updateNestedField('bailleur.nomParDefaut', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              )}
              {data.bailleur.adresseParDefaut !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Adresse du Bailleur</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.bailleur.adresseParDefaut || ''}
                    onChange={e => updateNestedField('bailleur.adresseParDefaut', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              )}
              {data.bailleur.iban !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>IBAN du Bailleur</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.bailleur.iban || ''}
                    onChange={e => updateNestedField('bailleur.iban', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              )}
              {data.bailleur.bic !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>BIC / SWIFT</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.bailleur.bic || ''}
                    onChange={e => updateNestedField('bailleur.bic', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TITRES & MENTIONS AVEC APERÇU DYNAMIQUE */}
        {data.mentions && (
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="fileText" size={15} color="#4f46e5" /> Titres, Clauses & Mentions Légales
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.mentions.titre !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Titre principal du document</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.mentions.titre || ''}
                    onChange={e => updateNestedField('mentions.titre', e.target.value)}
                    style={{ fontSize: 13, fontWeight: 700 }}
                  />
                </div>
              )}
              {data.mentions.sousTitre !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Sous-titre / Référence Légale</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.mentions.sousTitre || ''}
                    onChange={e => updateNestedField('mentions.sousTitre', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              )}
              {data.mentions.texteAttestation !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Texte d'attestation officiel (avec balises de substitution)
                  </label>
                  <textarea
                    rows={3}
                    className="form-control"
                    value={data.mentions.texteAttestation || ''}
                    onChange={e => updateNestedField('mentions.texteAttestation', e.target.value)}
                    style={{ fontSize: 13, fontFamily: 'monospace' }}
                  />
                  {/* Aperçu en direct */}
                  <div style={{ marginTop: 6, padding: '8px 12px', background: '#eef2ff', borderRadius: 6, border: '1px solid #c7d2fe' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#3730a3', marginBottom: 2 }}>👀 Aperçu du rendu avec les données :</div>
                    <div style={{ fontSize: 12, color: '#1e1b4b', fontStyle: 'italic' }}>
                      "{getSimulatedText(data.mentions.texteAttestation)}"
                    </div>
                  </div>
                </div>
              )}
              {data.mentions.mentionPiedDePage !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Mention de bas de page</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.mentions.mentionPiedDePage || ''}
                    onChange={e => updateNestedField('mentions.mentionPiedDePage', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* PIÈCES PAR DÉFAUT (POUR ÉTAT DES LIEUX) */}
        {data.piecesParDefaut && (
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="home" size={15} color="#4f46e5" /> Pièces & Espaces par défaut pour l'État des Lieux
              </h4>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const currentPieces = [...(data.piecesParDefaut || [])]
                  currentPieces.push({ nom: 'Nouvelle pièce', etat: 'Bon état', obs: 'RAS' })
                  updateNestedField('piecesParDefaut', currentPieces)
                }}
                style={{ fontSize: 11, padding: '3px 8px' }}
              >
                + Ajouter une pièce
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.piecesParDefaut.map((piece, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={piece.nom}
                    onChange={e => {
                      const updated = [...data.piecesParDefaut]
                      updated[idx].nom = e.target.value
                      updateNestedField('piecesParDefaut', updated)
                    }}
                    placeholder="Nom de la pièce"
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    value={piece.etat}
                    onChange={e => {
                      const updated = [...data.piecesParDefaut]
                      updated[idx].etat = e.target.value
                      updateNestedField('piecesParDefaut', updated)
                    }}
                    placeholder="État par défaut"
                    style={{ width: 130, fontSize: 12 }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    value={piece.obs}
                    onChange={e => {
                      const updated = [...data.piecesParDefaut]
                      updated[idx].obs = e.target.value
                      updateNestedField('piecesParDefaut', updated)
                    }}
                    placeholder="Observations"
                    style={{ flex: 2, fontSize: 12 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const updated = data.piecesParDefaut.filter((_, i) => i !== idx)
                      updateNestedField('piecesParDefaut', updated)
                    }}
                    style={{ color: '#ef4444', padding: '4px 8px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLAUSES DU CONTRAT DE BAIL */}
        {data.clauses && (
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="shield" size={15} color="#4f46e5" /> Clauses & Équipements du Contrat de Bail
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.clauses.texteClauseIRL !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Texte de la Clause de Révision IRL</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={data.clauses.texteClauseIRL || ''}
                    onChange={e => updateNestedField('clauses.texteClauseIRL', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              )}
              {data.clauses.texteClauseResolutoire !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Texte de la Clause Résolutoire</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={data.clauses.texteClauseResolutoire || ''}
                    onChange={e => updateNestedField('clauses.texteClauseResolutoire', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              )}
              {data.clauses.equipementsMeuble !== undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Équipements par défaut (Meublé)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={data.clauses.equipementsMeuble || ''}
                    onChange={e => updateNestedField('clauses.equipementsMeuble', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: 960,
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER MODALE */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
              <Icon name="sparkles" size={20} color="#4f46e5" /> Gestionnaire & Personnalisation des Modèles PDF
            </h3>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Détectez, personnalisez les mentions et gérez les balises de remplacement dynamique.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openTemplatesFolder()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            >
              <Icon name="folder" size={14} /> Ouvrir dossier Templates
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleSave()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4f46e5', borderColor: '#4f46e5', fontWeight: 700, fontSize: 12 }}
            >
              <Icon name="save" size={14} /> Enregistrer les balises
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              style={{ color: '#64748b' }}
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* FEEDBACKS ALERTES */}
        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 20px', fontSize: 12, borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="alertCircle" size={16} color="#dc2626" /> {error}
          </div>
        )}
        {successMsg && (
          <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 20px', fontSize: 12, borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="checkCircle" size={16} color="#16a34a" /> {successMsg}
          </div>
        )}

        {/* BARRE D'ONGLETS DES MODÈLES */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '10px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          {TEMPLATE_FILES.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setSelectedTpl(tpl)}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: selectedTpl.id === tpl.id ? '#4f46e5' : '#cbd5e1',
                background: selectedTpl.id === tpl.id ? '#ffffff' : '#f1f5f9',
                color: selectedTpl.id === tpl.id ? '#4f46e5' : '#475569',
                fontWeight: selectedTpl.id === tpl.id ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* CONTENU PRINCIPAL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* SÉLECTEUR DE MODE VISUEL / CODE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'visual' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('visual')}
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Icon name="layout" size={14} /> Éditeur Visuel Simplifié
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'code' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('code')}
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Icon name="code" size={14} /> Mode JSON Avancé
              </button>
            </div>

            <span style={{ fontSize: 11, color: '#64748b' }}>
              Fichier associé : <code>{selectedTpl.file}</code>
            </span>
          </div>

          {/* PALETTE DE BALISES COPIABLES EN UN CLIC */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="copy" size={13} color="#4f46e5" /> Balises KeyFolio détectées & pré-remplies (cliquez pour insérer) :
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {AVAILABLE_VARIABLES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => copyVariableTag(v.key)}
                  title={`${v.label} (Ex: ${v.sample})`}
                  style={{
                    fontSize: 11,
                    padding: '3px 7px',
                    borderRadius: 4,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  {`{${v.key}}`}
                </button>
              ))}
            </div>
          </div>

          {/* RENDU DE L'ONGLET SÉLECTIONNÉ */}
          {activeTab === 'visual' ? (
            renderVisualEditor()
          ) : (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                Éditeur direct du fichier de configuration JSON :
              </label>
              <textarea
                rows={16}
                className="form-control"
                value={jsonContent}
                onChange={e => {
                  setJsonContent(e.target.value)
                  try {
                    setParsedData(JSON.parse(e.target.value))
                  } catch (err) {}
                }}
                style={{
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  background: '#0f172a',
                  color: '#f8fafc',
                  padding: 12,
                  borderRadius: 6
                }}
              />
            </div>
          )}
        </div>

        {/* PIED DE MODALE */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            💡 Les balises insérées sont automatiquement remplacées lors de l'export PDF (quittances, baux, états des lieux, etc.).
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Fermer
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleSave()}
              style={{ background: '#4f46e5', borderColor: '#4f46e5', fontWeight: 700 }}
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
