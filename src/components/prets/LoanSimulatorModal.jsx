import React, { useState } from 'react'
import { calculateLoanMonthly } from '../../lib/financialCalculations'
import { createPret } from '../../lib/db'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function LoanSimulatorModal({ onClose, onSuccess, targetBienId = null, targetProjetId = null }) {
  const [montantProjet, setMontantProjet] = useState(250000)
  const [apport, setApport] = useState(30000)
  const [dureeAnnees, setDureeAnnees] = useState(20)
  const [tauxNominal, setTauxNominal] = useState(3.40)
  const [tauxAssurance, setTauxAssurance] = useState(0.30)
  const [nomPret, setNomPret] = useState('Simulation Crédit')

  const montantEmprunt = Math.max(0, montantProjet - apport)

  const res = calculateLoanMonthly({
    montantEmprunt,
    tauxAnnuelPct: tauxNominal,
    dureeAnnees,
    tauxAssurancePct: tauxAssurance
  })

  const handleCreateLoan = async () => {
    try {
      await createPret({
        nom_banque: nomPret,
        bien_id: targetBienId,
        projet_id: targetProjetId,
        montant_emprunt: montantEmprunt,
        apport_personnel: apport,
        taux_interet: tauxNominal,
        taux_assurance: tauxAssurance,
        duree_annees: dureeAnnees,
        date_debut: new Date().toISOString().split('T')[0]
      })
      onSuccess && onSuccess()
    } catch (e) {
      alert("Erreur lors de la création du prêt : " + e.toString())
    }
  }

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div
        className="modal-box"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 620,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calculator" size={16} color="#ffffff" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Simulateur de Prêt Immobilier
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Sliders & Paramètres */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Montant total */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Prix d'acquisition / Coût du projet</span>
                <span style={{ color: '#0f172a' }}>{formatEuro(montantProjet)}</span>
              </div>
              <input
                type="range"
                min="30000"
                max="1500000"
                step="5000"
                value={montantProjet}
                onChange={e => setMontantProjet(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Apport personnel */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Apport personnel ({montantProjet > 0 ? Math.round((apport / montantProjet) * 100) : 0}%)</span>
                <span style={{ color: '#16a34a' }}>{formatEuro(apport)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={montantProjet}
                step="2500"
                value={apport}
                onChange={e => setApport(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Durée */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: '#475569' }}>Durée de l'emprunt</span>
                <span style={{ color: '#4f46e5' }}>{dureeAnnees} ans ({dureeAnnees * 12} mois)</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={dureeAnnees}
                onChange={e => setDureeAnnees(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Taux & Assurance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Taux d'intérêt annuel (%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={tauxNominal}
                  onChange={e => setTauxNominal(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Taux assurance emprunteur (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tauxAssurance}
                  onChange={e => setTauxAssurance(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>
            </div>

          </div>

          {/* Cartouche Résultats de la simulation */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
              color: '#ffffff',
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Mensualité tout compris</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8' }}>
                  {formatEuro(res.mensualiteTotale)}<span style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1' }}>/mois</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: '#cbd5e1' }}>
                Hors ass. : {formatEuro(res.mensualiteHorsAssurance)} | Ass. : {formatEuro(res.mensualiteAssurance)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 11 }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Montant net emprunté</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>{formatEuro(montantEmprunt)}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Intérêts cumulés</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#f87171' }}>{formatEuro(res.coutInteretsTotal)}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Coût total crédit</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>{formatEuro(res.coutTotalCredit)}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fermer
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateLoan}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="check" size={15} /> Valider & Créer ce prêt
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
