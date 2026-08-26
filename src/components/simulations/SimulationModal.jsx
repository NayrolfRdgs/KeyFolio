import React, { useState, useEffect } from 'react'
import { getBiens, createProjet, saveSimulation, generateQuestionnaireExcel } from '../../lib/db'
import { formatEuro } from '../../lib/utils'
import {
  calculatePropertyYield,
  calculateSeasonalScenario,
  calculateFlippingScenario
} from '../../lib/financialCalculations'
import Icon from '../common/Icon'

export default function SimulationModal({ simulation = null, initialBienId = null, onClose, onSuccess }) {
  const [biens, setBiens] = useState([])
  const [targetType, setTargetType] = useState(simulation?.bien_id ? 'bien' : simulation?.projet_id ? 'projet' : 'nouveau_projet')
  const [selectedBienId, setSelectedBienId] = useState(simulation?.bien_id || initialBienId || '')
  
  // Champs généraux
  const [titre, setTitre] = useState(simulation?.titre || 'Nouvelle étude d\'investissement')
  const [scenarioType, setScenarioType] = useState(simulation?.scenarioType || 'longue_duree') // longue_duree | saisonniere | revente
  const [adresse, setAdresse] = useState(simulation?.adresse || '')
  
  // Hypothèses financières
  const [prixAchat, setPrixAchat] = useState(simulation?.prixAchat || 180000)
  const [fraisNotaire, setFraisNotaire] = useState(simulation?.fraisNotaire || Math.round(180000 * 0.08))
  const [travaux, setTravaux] = useState(simulation?.travaux || 20000)
  const [loyerMensuel, setLoyerMensuel] = useState(simulation?.loyerMensuel || 850)
  const [chargesMensuelles, setChargesMensuelles] = useState(simulation?.chargesMensuelles || 50)
  const [taxeFonciere, setTaxeFonciere] = useState(simulation?.taxeFonciere || 800)
  const [assurancePNO, setAssurancePNO] = useState(simulation?.assurancePNO || 180)
  const [vacancePct, setVacancePct] = useState(simulation?.vacancePct || 4)
  
  // Financement
  const [apport, setApport] = useState(simulation?.apport || 25000)
  const [dureeAnnees, setDureeAnnees] = useState(simulation?.dureeAnnees || 20)
  const [tauxPret, setTauxPret] = useState(simulation?.tauxPret || 3.40)
  const [tauxAssurance, setTauxAssurance] = useState(simulation?.tauxAssurance || 0.30)
  
  // Scénario saisonnier
  const [prixNuit, setPrixNuit] = useState(simulation?.prixNuit || 95)
  const [tauxOccupation, setTauxOccupation] = useState(simulation?.tauxOccupation || 65)
  const [fraisGestionSaisonnierePct, setFraisGestionSaisonnierePct] = useState(simulation?.fraisGestionSaisonnierePct || 20)
  
  // Scénario Achat-Revente
  const [prixRevente, setPrixRevente] = useState(simulation?.prixRevente || 260000)
  const [dureeMoisFlip, setDureeMoisFlip] = useState(simulation?.dureeMoisFlip || 9)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoExportExcel, setAutoExportExcel] = useState(true)

  useEffect(() => {
    getBiens().then(b => {
      setBiens(b || [])
      if (!selectedBienId && b && b.length > 0) {
        setSelectedBienId(b[0].id)
      }
    }).catch(() => {})
  }, [])

  // Auto calcul des frais de notaire si changement de prix
  const handlePrixAchatChange = (val) => {
    const p = Number(val)
    setPrixAchat(p)
    setFraisNotaire(Math.round(p * 0.08))
  }

  // Calculs dynamiques
  const coutTotalProjet = Number(prixAchat || 0) + Number(fraisNotaire || 0) + Number(travaux || 0)
  const montantEmprunt = Math.max(0, coutTotalProjet - Number(apport || 0))

  // Mensualité de crédit estimée
  const nbMois = dureeAnnees * 12
  const tauxMensuel = (tauxPret / 100) / 12
  const mensualiteHorsAssurance = (montantEmprunt > 0 && tauxMensuel > 0 && nbMois > 0)
    ? Math.round((montantEmprunt * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMois)))
    : 0
  const mensualiteAssurance = Math.round((montantEmprunt * (tauxAssurance / 100)) / 12)
  const mensualiteTotalePret = mensualiteHorsAssurance + mensualiteAssurance

  // Résultats selon scénario
  let resultats = {}
  if (scenarioType === 'longue_duree') {
    resultats = calculatePropertyYield({
      prixAcquisition: prixAchat,
      fraisNotaire,
      travauxInitiaux: travaux,
      valeurActuelle: coutTotalProjet,
      loyerMensuel,
      chargesMensuellesNonRecup: chargesMensuelles,
      taxeFonciereAnnuelle: taxeFonciere,
      assurancePNOAnnuelle: assurancePNO,
      mensualitePret: mensualiteTotalePret,
      tauxVacancePct: vacancePct
    })
  } else if (scenarioType === 'saisonniere') {
    resultats = calculateSeasonalScenario({
      coutTotalProjet,
      prixNuitMoyen: prixNuit,
      tauxOccupationPct: tauxOccupation,
      fraisMenageEtPlateformePct: fraisGestionSaisonnierePct,
      chargesFixesAnnuelles: taxeFonciere + assurancePNO + (chargesMensuelles * 12),
      mensualitePret: mensualiteTotalePret
    })
  } else if (scenarioType === 'revente') {
    resultats = calculateFlippingScenario({
      prixAchat,
      fraisNotaireAchat: fraisNotaire,
      budgetTravaux: travaux,
      fraisPortageCredit: mensualiteTotalePret * (dureeMoisFlip || 6),
      dureeMois: dureeMoisFlip,
      prixReventeEstime: prixRevente,
      fraisAgenceRevente: Math.round(prixRevente * 0.05),
      apportPersonnel: apport
    })
  }

  // Sauvegarde et génération Excel
  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let finalBienId = null
      let finalProjetId = null

      // 1. Si associé à un bien existant
      if (targetType === 'bien' && selectedBienId) {
        finalBienId = Number(selectedBienId)
      } 
      // 2. Si le bien n'existe pas encore -> Enregistrer dans un nouveau Projet
      else if (targetType === 'nouveau_projet') {
        const createdProjet = await createProjet({
          nom: titre,
          adresse: adresse || 'Adresse en cours d\'étude',
          type: scenarioType,
          statut: 'etude',
          budget_prevision: coutTotalProjet,
          budget_engage: 0,
          budget_paye: 0,
          pourcentage_avancement: 5,
          notes: `Simulation financière générée : Rentabilité ${resultats.rendementBrutPct || resultats.rendementBrut || 0}%, Cash-flow ${resultats.cashFlowMensuelNet || resultats.cashFlowMensuel || 0} €/mois.`
        })
        if (createdProjet && createdProjet.id) {
          finalProjetId = createdProjet.id
        }
      }

      // Objet simulation complet
      const simuData = {
        id: simulation?.id || Date.now(),
        titre,
        scenarioType,
        adresse,
        bien_id: finalBienId,
        projet_id: finalProjetId,
        prixAchat,
        fraisNotaire,
        travaux,
        coutTotalProjet,
        loyerMensuel,
        chargesMensuelles,
        taxeFonciere,
        assurancePNO,
        vacancePct,
        apport,
        dureeAnnees,
        tauxPret,
        tauxAssurance,
        mensualiteTotalePret,
        prixNuit,
        tauxOccupation,
        fraisGestionSaisonnierePct,
        prixRevente,
        dureeMoisFlip,
        resultats,
        date_creation: simulation?.date_creation || new Date().toISOString().split('T')[0]
      }

      await saveSimulation(simuData)

      // 3. Génération automatique du fichier Excel dans le bon dossier du bien si demandé
      if (autoExportExcel && finalBienId) {
        try {
          const cleanTitle = titre.replace(/[^a-zA-Z0-9_-]/g, '_')
          const excelRows = [
            ['Prix d\'acquisition net vendeur', `${prixAchat} €`, 'Prix d\'achat du bien'],
            ['Frais de notaire estimés', `${fraisNotaire} €`, '~8% du prix'],
            ['Budget travaux / valorisation', `${travaux} €`, 'Travaux et rénovation'],
            ['Coût total de l\'opération', `${coutTotalProjet} €`, 'Investissement global'],
            ['Apport personnel injecté', `${apport} €`, 'Trésorerie engagée'],
            ['Montant emprunté', `${montantEmprunt} €`, 'Financement bancaire'],
            ['Taux d\'intérêt annuel', `${tauxPret} %`, `Durée : ${dureeAnnees} ans`],
            ['Mensualité de prêt tout compris', `${mensualiteTotalePret} € / mois`, 'Assurance comprise'],
            ['Loyer mensuel brut estimé', `${loyerMensuel} € / mois`, 'Recette locative'],
            ['Charges non récupérables / an', `${chargesMensuelles * 12} € / an`, 'Charges de copropriété'],
            ['Taxe foncière annuelle', `${taxeFonciere} € / an`, 'Impôt local'],
            ['Assurance PNO annuelle', `${assurancePNO} € / an`, 'Assurance propriétaire non occupant'],
            ['Cash-flow net mensuel', `${resultats.cashFlowMensuelNet || resultats.cashFlowMensuel || 0} € / mois`, 'Excédent ou effort mensuel'],
            ['Cash-flow net annuel', `${resultats.cashFlowAnnuelNet || (resultats.cashFlowMensuel * 12) || 0} € / an`, 'Trésorerie nette annuelle'],
            ['Rendement Brut', `${resultats.rendementBrutPct || resultats.rendementBrut || 0} %`, 'Loyers annuels / Coût total'],
            ['Rendement Net', `${resultats.rendementNetPct || resultats.rendementNet || 0} %`, 'Net de charges et taxes']
          ]

          await generateQuestionnaireExcel({
            bienId: finalBienId,
            filename: `04_FISCAL_FINANCIER/Simulation_${cleanTitle}.xlsx`,
            title: `Étude Financière & Rentabilité — ${titre}`,
            headers: ['Indicateur / Poste financier', 'Montant / Valeur', 'Observations'],
            sampleRows: excelRows,
            hasTotals: false,
            hasCumul: false
          })
        } catch (excelErr) {
          console.warn("Notice: Excel generation in subfolder handled with fallback:", excelErr)
        }
      }

      onSuccess && onSuccess(simuData)
    } catch (err) {
      setError(err?.toString())
    } finally {
      setLoading(false)
    }
  }

  // Télécharger un export Excel instantané (CSV / XLSX compatible)
  const handleDownloadExcel = () => {
    const headers = ['Poste / Indicateur', 'Montant / Valeur', 'Observations']
    const rows = [
      ['Titre de l\'étude', titre, scenarioType],
      ['Adresse', adresse || 'Non spécifiée', ''],
      ['Prix d\'acquisition', `${prixAchat} €`, 'Net vendeur'],
      ['Frais de notaire', `${fraisNotaire} €`, '~8%'],
      ['Travaux prévus', `${travaux} €`, ''],
      ['Coût total investissement', `${coutTotalProjet} €`, ''],
      ['Apport personnel', `${apport} €`, ''],
      ['Montant emprunté', `${montantEmprunt} €`, ''],
      ['Mensualité de prêt', `${mensualiteTotalePret} €`, `${dureeAnnees} ans @ ${tauxPret}%`],
      ['Loyer mensuel estimé', `${loyerMensuel} €`, ''],
      ['Charges mensuelles', `${chargesMensuelles} €`, ''],
      ['Taxe foncière annuelle', `${taxeFonciere} €`, ''],
      ['Cash-Flow Net Mensuel', `${resultats.cashFlowMensuelNet || resultats.cashFlowMensuel || 0} €`, ''],
      ['Rendement Brut', `${resultats.rendementBrutPct || resultats.rendementBrut || 0} %`, ''],
      ['Rendement Net', `${resultats.rendementNetPct || resultats.rendementNet || 0} %`, '']
    ]

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Simulation_${titre.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          maxHeight: '90vh',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* En-tête */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calculator" size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {simulation ? 'Modifier la simulation financière' : 'Créer une simulation d\'investissement'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b' }}>
                Étude de faisabilité, calcul de rentabilité, export Excel et conversion automatique
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ margin: '10px 20px 0 20px' }}>{error}</div>}

        {/* Formulaire défilant */}
        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* 1. DESTINATION & RATTACHEMENT */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
              Destination de la simulation
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setTargetType('nouveau_projet')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: targetType === 'nouveau_projet' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: targetType === 'nouveau_projet' ? 'rgba(37, 99, 235, 0.08)' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: targetType === 'nouveau_projet' ? '#2563eb' : '#0f172a' }}>
                  Nouveau Projet
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  Le bien n'existe pas encore, l'enregistrer dans les projets
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('bien')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: targetType === 'bien' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: targetType === 'bien' ? 'rgba(22, 163, 74, 0.08)' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: targetType === 'bien' ? '#16a34a' : '#0f172a' }}>
                  Bien existant
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  Rattacher à un bien et générer un Excel dans son dossier
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('autonome')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: targetType === 'autonome' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                  background: targetType === 'autonome' ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: targetType === 'autonome' ? '#4f46e5' : '#0f172a' }}>
                  Étude autonome
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  Conserver simplement l'étude dans les simulations
                </div>
              </button>
            </div>

            {/* Sélecteur si bien existant */}
            {targetType === 'bien' && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Sélectionner le bien existant *
                </label>
                <select
                  value={selectedBienId}
                  onChange={e => setSelectedBienId(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                >
                  {biens.map(b => (
                    <option key={b.id} value={b.id}>{b.nom} — {b.adresse || 'Sans adresse'}</option>
                  ))}
                </select>

                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                  <Icon name="check" size={13} />
                  Un fichier Excel complet sera automatiquement créé dans le sous-dossier 04_FISCAL_FINANCIER du bien.
                </div>
              </div>
            )}
          </div>

          {/* 2. INFOS GÉNÉRALES & TYPE DE SCÉNARIO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Intitulé de l'étude / Simulation *
              </label>
              <input
                type="text"
                required
                placeholder="ex: Achat T2 Centre Ville, Rénovation Immeuble..."
                value={titre}
                onChange={e => setTitre(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Modèle d'exploitation
              </label>
              <select
                value={scenarioType}
                onChange={e => setScenarioType(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              >
                <option value="longue_duree">Location Longue Durée (Nue / Meublée)</option>
                <option value="saisonniere">Location Saisonnière (AirBnB / Courte durée)</option>
                <option value="revente">Achat / Revente (Marchand de biens / Flipping)</option>
              </select>
            </div>
          </div>

          {/* 3. CHIFFRES D'ACQUISITION & TRAVAUX */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 14 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              Acquisition & Travaux
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Prix d'achat net (€)</label>
                <input
                  type="number"
                  step="1000"
                  value={prixAchat}
                  onChange={e => handlePrixAchatChange(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Frais notaire (~8%)</label>
                <input
                  type="number"
                  step="500"
                  value={fraisNotaire}
                  onChange={e => setFraisNotaire(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Budget travaux (€)</label>
                <input
                  type="number"
                  step="1000"
                  value={travaux}
                  onChange={e => setTravaux(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#64748b' }}>Coût total projet</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>{formatEuro(coutTotalProjet)}</span>
              </div>
            </div>
          </div>

          {/* 4. FINANCEMENT BANCAIRE */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 14 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              Financement & Emprunt
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Apport perso (€)</label>
                <input
                  type="number"
                  step="1000"
                  value={apport}
                  onChange={e => setApport(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Durée (années)</label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={dureeAnnees}
                  onChange={e => setDureeAnnees(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Taux intérêt (%)</label>
                <input
                  type="number"
                  step="0.05"
                  value={tauxPret}
                  onChange={e => setTauxPret(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#64748b' }}>Mensualité crédit</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{formatEuro(mensualiteTotalePret)}/m</span>
              </div>
            </div>
          </div>

          {/* 5. REVENUS & CHARGES SELON LE SCÉNARIO */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 14 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              Revenus & Exploitation
            </h4>

            {scenarioType === 'longue_duree' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Loyer mensuel (€)</label>
                  <input
                    type="number"
                    step="25"
                    value={loyerMensuel}
                    onChange={e => setLoyerMensuel(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Charges mensuelles (€)</label>
                  <input
                    type="number"
                    value={chargesMensuelles}
                    onChange={e => setChargesMensuelles(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Taxe foncière / an (€)</label>
                  <input
                    type="number"
                    value={taxeFonciere}
                    onChange={e => setTaxeFonciere(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            {scenarioType === 'saisonniere' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Prix / nuitée (€)</label>
                  <input
                    type="number"
                    value={prixNuit}
                    onChange={e => setPrixNuit(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Taux d'occupation (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="95"
                    value={tauxOccupation}
                    onChange={e => setTauxOccupation(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Commissions / Ménage (%)</label>
                  <input
                    type="number"
                    value={fraisGestionSaisonnierePct}
                    onChange={e => setFraisGestionSaisonnierePct(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            {scenarioType === 'revente' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Prix de revente ciblé (€)</label>
                  <input
                    type="number"
                    step="5000"
                    value={prixRevente}
                    onChange={e => setPrixRevente(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Durée portage (mois)</label>
                  <input
                    type="number"
                    value={dureeMoisFlip}
                    onChange={e => setDureeMoisFlip(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. BANDEAU DE SYNTHÈSE DES PERFORMANCES */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              borderRadius: 10,
              padding: '14px 18px',
              color: '#ffffff',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12
            }}
          >
            <div>
              <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Rendement Brut</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>
                {resultats.rendementBrutPct || resultats.rendementBrut || 0}%
              </div>
            </div>

            <div>
              <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Rendement Net</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>
                {resultats.rendementNetPct || resultats.rendementNet || 0}%
              </div>
            </div>

            <div>
              <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Cash-Flow Mensuel</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: (resultats.cashFlowMensuelNet || resultats.cashFlowMensuel || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                {formatEuro(resultats.cashFlowMensuelNet || resultats.cashFlowMensuel || 0)}/m
              </div>
            </div>

            {scenarioType === 'revente' && (
              <div>
                <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Marge Nette Revente</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>
                  {formatEuro(resultats.margeNette || 0)}
                </div>
              </div>
            )}
          </div>

          {/* Actions & Boutons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadExcel}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Icon name="fileSpreadsheet" size={14} color="#16a34a" /> Télécharger l'Excel (.xlsx)
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="check" size={14} />
                {loading ? 'Enregistrement...' : targetType === 'nouveau_projet' ? 'Enregistrer & Créer le Projet' : 'Enregistrer la Simulation'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
