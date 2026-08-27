import React from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function PatrimoineKPICards({
  patrimoineNet = 0,
  valeurImmobiliere = 0,
  detteRestante = 0,
  rendementGlobalNet = 0,
  rendementGlobalBrut = 0,
  cashFlowMensuel = 0,
  cashFlowAnnuel = 0,
  nbBiens = 0,
  nbPrets = 0,
  variationPatrimoine = null // e.g. +4.2% if calculable
}) {
  const isCashFlowPositif = cashFlowMensuel >= 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 16
    }}>
      {/* 1. PATRIMOINE NET */}
      <div className="card" style={{
        padding: '20px 22px',
        background: 'linear-gradient(145deg, rgba(79, 70, 229, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
        border: '1.5px solid rgba(79, 70, 229, 0.25)',
        boxShadow: '0 8px 24px rgba(79, 70, 229, 0.07)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary, #4f46e5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Patrimoine Net
            </span>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginTop: 4, letterSpacing: '-0.02em' }}>
              {formatEuro(patrimoineNet)}
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(79, 70, 229, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon name="wallet" size={20} color="#4f46e5" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: '#64748b' }}>
          <span>Actifs nets de dettes</span>
          {variationPatrimoine !== null ? (
            <span style={{ fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon name="trendingUp" size={12} color="#16a34a" /> {variationPatrimoine}
            </span>
          ) : (
            <span style={{ fontWeight: 600, color: '#64748b' }}>Capitaux propres</span>
          )}
        </div>
      </div>

      {/* 2. VALEUR IMMOBILIÈRE BRUTE */}
      <div className="card" style={{
        padding: '20px 22px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Valeur Immobilière
            </span>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginTop: 4, letterSpacing: '-0.02em' }}>
              {formatEuro(valeurImmobiliere)}
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon name="building" size={20} color="#334155" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: '#64748b' }}>
          <span>{nbBiens} bien{nbBiens > 1 ? 's' : ''} détenu{nbBiens > 1 ? 's' : ''}</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>Actif brut total</span>
        </div>
      </div>

      {/* 3. DETTE BANCAIRE (CAPITAL RESTANT) */}
      <div className="card" style={{
        padding: '20px 22px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dette Bancaire
            </span>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#e11d48', marginTop: 4, letterSpacing: '-0.02em' }}>
              {formatEuro(detteRestante)}
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#ffe4e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon name="creditcard" size={20} color="#e11d48" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: '#64748b' }}>
          <span>{nbPrets} emprunt{nbPrets > 1 ? 's' : ''} en cours</span>
          <span style={{ fontWeight: 600, color: '#e11d48' }}>Capital restant dû</span>
        </div>
      </div>

      {/* 4. RENDEMENT GLOBAL */}
      <div className="card" style={{
        padding: '20px 22px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Rendement Global
            </span>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#16a34a', marginTop: 4, letterSpacing: '-0.02em' }}>
              {rendementGlobalNet > 0 ? `${rendementGlobalNet}%` : `${rendementGlobalBrut}%`}
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon name="trendingUp" size={20} color="#16a34a" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: '#64748b' }}>
          <span>Brut : {rendementGlobalBrut}%</span>
          <span style={{ fontWeight: 600, color: '#16a34a' }}>Net de charges</span>
        </div>
      </div>

      {/* 5. CASH-FLOW MENSUEL */}
      <div className="card" style={{
        padding: '20px 22px',
        background: isCashFlowPositif
          ? 'linear-gradient(145deg, rgba(22, 163, 74, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)'
          : 'linear-gradient(145deg, rgba(225, 29, 72, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
        border: `1.5px solid ${isCashFlowPositif ? 'rgba(22, 163, 74, 0.3)' : 'rgba(225, 29, 72, 0.3)'}`,
        boxShadow: isCashFlowPositif ? '0 4px 16px rgba(22, 163, 74, 0.06)' : '0 4px 16px rgba(225, 29, 72, 0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: isCashFlowPositif ? '#16a34a' : '#e11d48', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cash-Flow Mensuel
            </span>
            <div style={{ fontSize: 26, fontWeight: 900, color: isCashFlowPositif ? '#16a34a' : '#e11d48', marginTop: 4, letterSpacing: '-0.02em' }}>
              {isCashFlowPositif ? '+' : ''}{formatEuro(cashFlowMensuel)}/m
            </div>
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: isCashFlowPositif ? 'rgba(22, 163, 74, 0.15)' : 'rgba(225, 29, 72, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon name={isCashFlowPositif ? 'euro' : 'alertCircle'} size={20} color={isCashFlowPositif ? '#16a34a' : '#e11d48'} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: '#64748b' }}>
          <span>Annuel : {isCashFlowPositif ? '+' : ''}{formatEuro(cashFlowAnnuel)}</span>
          <span style={{ fontWeight: 700, color: isCashFlowPositif ? '#16a34a' : '#e11d48' }}>
            {isCashFlowPositif ? 'Excédent net' : 'Effort d\'épargne'}
          </span>
        </div>
      </div>
    </div>
  )
}
