import React from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function DebtCard({
  detteTotaleInitiale = 0,
  capitalRestantDu = 0,
  mensualitesTotales = 0,
  tauxMoyenPct = 0,
  dureeRestanteMoisMoyenne = 0,
  interetsRestants = 0,
  valeurImmobiliereTotale = 0,
  nbPrets = 0
}) {
  const capitalRembourse = Math.max(0, detteTotaleInitiale - capitalRestantDu)
  const pctRembourse = detteTotaleInitiale > 0 ? Math.min(100, Math.round((capitalRembourse / detteTotaleInitiale) * 100)) : 0
  const pctRestant = 100 - pctRembourse

  // LTV (Loan to value) : Dette / Valeur du parc
  const ltv = valeurImmobiliereTotale > 0 ? Math.min(100, Number(((capitalRestantDu / valeurImmobiliereTotale) * 100).toFixed(1))) : 0

  const dureeAnnees = Math.floor(dureeRestanteMoisMoyenne / 12)
  const dureeMois = dureeRestanteMoisMoyenne % 12

  return (
    <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Structure de la Dette & Passif
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
            {nbPrets} emprunt{nbPrets > 1 ? 's' : ''} bancaire{nbPrets > 1 ? 's' : ''} consolidé{nbPrets > 1 ? 's' : ''} et amortissement
          </p>
        </div>

        {/* Badge LTV */}
        <div style={{
          background: ltv < 60 ? '#dcfce7' : ltv < 80 ? '#fef3c7' : '#fee2e2',
          border: `1px solid ${ltv < 60 ? '#86efac' : ltv < 80 ? '#fde047' : '#fca5a5'}`,
          color: ltv < 60 ? '#166534' : ltv < 80 ? '#854d0e' : '#991b1b',
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 11.5,
          fontWeight: 700
        }}>
          LTV : {ltv}% ({ltv < 60 ? 'Endettement sain' : ltv < 80 ? 'Endettement modéré' : 'Levier élevé'})
        </div>
      </div>

      {/* ── BARRE VISUELLE D'AMORTISSEMENT DU CAPITAL ── */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
          <div>
            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Amorti : </span>
            <strong style={{ color: '#16a34a' }}>{formatEuro(capitalRembourse)} ({pctRembourse}%)</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Restant : </span>
            <strong style={{ color: '#e11d48' }}>{formatEuro(capitalRestantDu)} ({pctRestant}%)</strong>
          </div>
        </div>

        {/* Double jauge visuelle demandée */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            Capital Initial ({formatEuro(detteTotaleInitiale)})
          </div>
          <div style={{ height: 8, background: '#cbd5e1', borderRadius: 4, width: '100%' }} />

          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>
            Progression Réelle du Remboursement
          </div>
          <div style={{ height: 10, background: '#fee2e2', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
            <div
              style={{
                width: `${pctRembourse}%`,
                background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── GRILLE DE RATIOS CRÉDIT ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10
      }}>
        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Mensualités</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {formatEuro(mensualitesTotales)}/m
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Taux Moyen</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {tauxMoyenPct > 0 ? `${tauxMoyenPct}%` : '—'}
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Durée Restante</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {dureeAnnees > 0 ? `${dureeAnnees}a ${dureeMois}m` : `${dureeMois} mois`}
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Intérêts Restants</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#e11d48', marginTop: 2 }}>
            {formatEuro(interetsRestants)}
          </div>
        </div>
      </div>
    </div>
  )
}
