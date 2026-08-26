import React, { useState, useEffect } from 'react'
import { getSimulations, deleteSimulation, getBiens, getProjets, createProjet, generateQuestionnaireExcel } from '../lib/db'
import { formatEuro, formatDate } from '../lib/utils'
import Icon from '../components/common/Icon'
import SimulationModal from '../components/simulations/SimulationModal'

export default function Simulations({ onNavigate }) {
  const [simulations, setSimulations] = useState([])
  const [biens, setBiens] = useState([])
  const [projets, setProjets] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'longue_duree' | 'saisonniere' | 'revente'
  
  // Modale
  const [modalOpen, setModalOpen] = useState(false)
  const [editSimu, setEditSimu] = useState(null)

  const loadData = () => {
    Promise.all([
      Promise.resolve(getSimulations()).catch(() => []),
      getBiens().catch(() => []),
      getProjets().catch(() => [])
    ]).then(([sims, b, p]) => {
      setSimulations(sims || [])
      setBiens(b || [])
      setProjets(p || [])
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = (id) => {
    if (!confirm('Supprimer cette étude / simulation ?')) return
    deleteSimulation(id)
    loadData()
  }

  const handleConvertToProject = async (s) => {
    try {
      await createProjet({
        nom: s.titre,
        adresse: s.adresse || 'Adresse de l\'opération',
        type: s.scenarioType || 'longue_duree',
        statut: 'etude',
        budget_prevision: s.coutTotalProjet || s.prixAchat || 150000,
        budget_engage: 0,
        budget_paye: 0,
        pourcentage_avancement: 10,
        notes: `Issu de la simulation financière. Rendement estimé : ${s.resultats?.rendementBrutPct || s.resultats?.rendementBrut || 0}%.`
      })
      alert(`Le projet "${s.titre}" a été créé avec succès dans votre patrimoine !`)
      loadData()
      if (onNavigate) onNavigate('biens')
    } catch (e) {
      alert("Erreur lors de la création du projet : " + e.toString())
    }
  }

  const handleExportExcel = async (s) => {
    const cleanTitle = s.titre.replace(/[^a-zA-Z0-9_-]/g, '_')
    const rows = [
      ['Titre de l\'étude', s.titre, s.scenarioType],
      ['Adresse du bien', s.adresse || 'Non précisée', ''],
      ['Prix d\'acquisition net vendeur', `${s.prixAchat} €`, ''],
      ['Frais de notaire estimés', `${s.fraisNotaire} €`, '~8%'],
      ['Budget travaux / aménagement', `${s.travaux} €`, ''],
      ['Coût total de l\'opération', `${s.coutTotalProjet} €`, 'Investissement global'],
      ['Apport personnel injecté', `${s.apport} €`, 'Trésorerie'],
      ['Mensualité de prêt', `${s.mensualiteTotalePret} € / mois`, `${s.dureeAnnees} ans @ ${s.tauxPret}%`],
      ['Loyer mensuel brut', `${s.loyerMensuel} € / mois`, ''],
      ['Taxe foncière annuelle', `${s.taxeFonciere} € / an`, ''],
      ['Cash-Flow Net Mensuel', `${s.resultats?.cashFlowMensuelNet || s.resultats?.cashFlowMensuel || 0} € / mois`, ''],
      ['Rendement Brut (%)', `${s.resultats?.rendementBrutPct || s.resultats?.rendementBrut || 0} %`, ''],
      ['Rendement Net (%)', `${s.resultats?.rendementNetPct || s.resultats?.rendementNet || 0} %`, '']
    ]

    // Si rattaché à un bien, enregistrer dans son sous-dossier
    if (s.bien_id) {
      try {
        await generateQuestionnaireExcel({
          bienId: s.bien_id,
          filename: `04_FISCAL_FINANCIER/Simulation_${cleanTitle}.xlsx`,
          title: `Étude Financière — ${s.titre}`,
          headers: ['Indicateur / Poste', 'Montant / Valeur', 'Observations'],
          sampleRows: rows,
          hasTotals: false,
          hasCumul: false
        })
        alert(`Fichier Excel généré avec succès dans le dossier 04_FISCAL_FINANCIER du bien !`)
        return
      } catch (err) {
        console.warn("Falling back to download:", err)
      }
    }

    // Téléchargement navigateur direct
    const csvContent = '\uFEFF' + [
      ['Poste / Indicateur', 'Montant / Valeur', 'Observations'].join(';'),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Simulation_${cleanTitle}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredSimus = simulations.filter(s => {
    if (filter === 'all') return true
    return s.scenarioType === filter
  })

  return (
    <div className="page-content">
      {/* ── EN-TÊTE HARMONISÉ ── */}
      <div className="page-header">
        <div>
          <h2>Simulations & Études Financières</h2>
          <p className="page-subtitle">
            Créez vos études, associez-les à un bien existant (avec export Excel automatique) ou convertissez-les en projets
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => { setEditSimu(null); setModalOpen(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={14} /> + Nouvelle simulation
        </button>
      </div>

      {/* ── FILTRE PAR SCÉNARIO DÉTACHÉ ── */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'all', label: `Toutes les études (${simulations.length})` },
            { id: 'longue_duree', label: 'Location Longue Durée' },
            { id: 'saisonniere', label: 'Courte Durée / LCD' },
            { id: 'revente', label: 'Achat-Revente' }
          ].map(t => (
            <button
              key={t.id}
              className={`btn btn-sm ${filter === t.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CARTES DES SIMULATIONS DÉTACHÉES ── */}
      {filteredSimus.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="calculator" size={44} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700 }}>Aucune étude financière enregistrée</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            Lancez une simulation pour comparer le rendement brut/net, le cash-flow et l'impact du crédit.
          </p>
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={() => { setEditSimu(null); setModalOpen(true) }}>
              + Créer ma première simulation
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
          {filteredSimus.map(s => {
            const res = s.resultats || {}
            const rBrut = res.rendementBrutPct || res.rendementBrut || 0
            const cfNet = res.cashFlowMensuelNet || res.cashFlowMensuel || 0
            const targetBien = biens.find(b => b.id === s.bien_id)

            return (
              <div key={s.id} className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* En-tête carte */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{s.titre}</h3>
                      <span className="badge badge-accent" style={{ fontSize: 10 }}>
                        {s.scenarioType === 'saisonniere' ? 'Saisonnier' : s.scenarioType === 'revente' ? 'Achat-Revente' : 'Location Nue/Meublée'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {targetBien ? (
                        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Associé au bien : {targetBien.nom}</span>
                      ) : (
                        <span>{s.adresse || 'Étude libre (sans bien associé)'}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{rBrut}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rendement brut</div>
                  </div>
                </div>

                {/* Chiffres clés */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--color-surface-2)', padding: '12px 14px', borderRadius: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Investissement Total</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{formatEuro(s.coutTotalProjet || s.prixAchat || 0)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Cash-Flow Net Estimé</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: cfNet >= 0 ? '#16a34a' : '#ef4444', marginTop: 2 }}>
                      {formatEuro(cfNet)}/m
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleExportExcel(s)}
                      style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      title="Télécharger ou synchroniser le tableur Excel"
                    >
                      <Icon name="fileSpreadsheet" size={12} color="#16a34a" /> Excel
                    </button>

                    {!s.bien_id && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleConvertToProject(s)}
                        style={{ fontSize: 11, color: '#2563eb', borderColor: '#2563eb' }}
                        title="Enregistrer cette simulation en Projet de rénovation/acquisition"
                      >
                        + Projet
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditSimu(s); setModalOpen(true) }}
                      title="Modifier les hypothèses"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(s.id)}
                      title="Supprimer"
                    >
                      <Icon name="trash2" size={13} />
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modale Simulation */}
      {modalOpen && (
        <SimulationModal
          simulation={editSimu}
          biens={biens}
          onClose={() => { setModalOpen(false); setEditSimu(null) }}
          onSaved={() => { setModalOpen(false); setEditSimu(null); loadData() }}
        />
      )}

    </div>
  )
}
