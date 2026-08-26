import React, { useEffect, useState } from 'react'
import { getBiens, getProjets, getPrets, getBaux, getPaiements, getDepenses } from '../lib/db'
import { formatEuro, formatDate } from '../lib/utils'
import Icon from '../components/common/Icon'
import PatrimoineValueChart from '../components/dashboard/PatrimoineValueChart'
import PortfolioDonutChart from '../components/dashboard/PortfolioDonutChart'

export default function AnalysesRapports({ onNavigate }) {
  const [biens, setBiens] = useState([])
  const [projets, setProjets] = useState([])
  const [prets, setPrets] = useState([])
  const [baux, setBaux] = useState([])
  const [paiements, setPaiements] = useState([])
  const [depenses, setDepenses] = useState([])

  useEffect(() => {
    Promise.all([
      getBiens().catch(() => []),
      getProjets().catch(() => []),
      getPrets().catch(() => []),
      getBaux().catch(() => []),
      getPaiements().catch(() => []),
      getDepenses().catch(() => [])
    ]).then(([bi, pr, lo, ba, pa, de]) => {
      setBiens(bi || [])
      setProjets(pr || [])
      setPrets(lo || [])
      setBaux(ba || [])
      setPaiements(pa || [])
      setDepenses(de || [])
    })
  }, [])

  const valeurTotale = biens.reduce((s, b) => s + (b.valeur_estimee || b.prix_achat || 180000), 0)
  const detteTotale = prets.reduce((s, p) => s + (p.montant_emprunt || 0), 0)
  const patrimoineNet = Math.max(0, valeurTotale - (detteTotale * 0.75))
  const loyersAnnuels = baux.reduce((s, b) => s + ((b.loyer_mensuel || 0) + (b.charges_mensuelles || 0)) * 12, 0)
  const depensesAnnuelles = depenses.reduce((s, d) => s + (d.montant || 0), 0)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="page-content">
      {/* ── EN-TÊTE HARMONISÉ ── */}
      <div className="page-header">
        <div>
          <h2>Analyses & Rapports Patrimoniaux</h2>
          <p className="page-subtitle">
            Bilans patrimoniaux consolidés, performance locative globale et synthèses fiscales
          </p>
        </div>

        <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="download" size={14} /> Imprimer / Exporter le bilan
        </button>
      </div>

      {/* ── CONTENU DU RAPPORT DÉTACHÉ ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Bilan Patrimonial Consolidé */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            Bilan d'Actif et de Passif Consolidé
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-2)', padding: 18, borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actif Brut Immobilier</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{formatEuro(valeurTotale)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{biens.length} biens détenus</div>
            </div>

            <div style={{ background: 'var(--color-surface-2)', padding: 18, borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passif / Dette Bancaire</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{formatEuro(detteTotale)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{prets.length} prêts rattachés</div>
            </div>

            <div style={{ background: 'rgba(22, 163, 74, 0.08)', padding: 18, borderRadius: 10, border: '1px solid rgba(22, 163, 74, 0.25)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Actif Net Patrimonial</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{formatEuro(patrimoineNet)}</div>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Capitaux propres nets</div>
            </div>
          </div>
        </div>

        {/* Graphiques consolidés */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 22 }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 800 }}>Évolution de la valeur</h4>
            <PatrimoineValueChart currentValue={valeurTotale} />
          </div>

          <div className="card" style={{ padding: 22 }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 800 }}>Ventilation du parc</h4>
            <PortfolioDonutChart biens={biens} />
          </div>
        </div>

        {/* Synthèse des flux annuels */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            Synthèse Annuelle des Revenus & Charges
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
            <div style={{ background: 'var(--color-surface-2)', padding: 18, borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Revenus Locatifs Annuels</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>+{formatEuro(loyersAnnuels)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Moyenne mensuelle : {formatEuro(loyersAnnuels / 12)}/m</div>
            </div>

            <div style={{ background: 'var(--color-surface-2)', padding: 18, borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Dépenses & Travaux Annuels</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>-{formatEuro(depensesAnnuelles)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Charges déductibles réelles</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
