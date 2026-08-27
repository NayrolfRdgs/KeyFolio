import React from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function ProjetsPatrimoineCard({
  projets = [],
  patrimoineActuel = 0,
  onNavigate
}) {
  // Calcul de la valeur potentielle ajoutée par les projets livrés
  const valeurFutureProjets = projets.reduce((sum, p) => {
    // Si une valeur estimée après travaux existe, l'utiliser, sinon budget + marge
    return sum + (p.valeur_estimee || ((p.budget_prevision || p.budget_total || 150000) * 1.25))
  }, 0)

  const patrimoinePotentiel = patrimoineActuel + valeurFutureProjets
  const budgetGlobalProjets = projets.reduce((sum, p) => sum + (p.budget_prevision || p.budget_total || 0), 0)

  return (
    <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Projets & Patrimoine Potentiel
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Chantiers, valorisations futures et impact sur le patrimoine à livraison
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('projets')}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#fff',
            fontSize: 12,
            fontWeight: 600,
            color: '#4f46e5',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          Tous les projets <Icon name="chevronRight" size={13} />
        </button>
      </div>

      {/* ── ENCADRÉ VALEUR PATRIMONIALE POTENTIELLE ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
        border: '1.5px solid rgba(79, 70, 229, 0.25)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 18
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Patrimoine Actuel
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {formatEuro(patrimoineActuel)}
            </div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 900, color: '#94a3b8' }}>+</div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Projets Livrés ({projets.length})
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
              +{formatEuro(valeurFutureProjets)}
            </div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 900, color: '#94a3b8' }}>=</div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Patrimoine Potentiel
            </span>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', marginTop: 2 }}>
              {formatEuro(patrimoinePotentiel)}
            </div>
          </div>
        </div>
      </div>

      {/* ── LISTE DES PROJETS ACTIFS ── */}
      {projets.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12.5 }}>
          Aucun projet immobilier en cours actuellement.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projets.map((p, idx) => {
            const avancement = p.pourcentage_avancement || p.avancement || 0
            const budget = p.budget_prevision || p.budget_total || 0

            return (
              <div
                key={p.id || idx}
                onClick={() => onNavigate && onNavigate('bien', p.id)}
                style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      🏗️ {p.nom}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                      {p.adresse || p.localisation || 'En cours'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>
                      {formatEuro(budget)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
                      {avancement}%
                    </span>
                  </div>
                </div>

                {/* Barre d'avancement */}
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${avancement}%`,
                      background: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
