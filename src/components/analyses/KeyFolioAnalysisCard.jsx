import React from 'react'
import { formatEuro } from '../../lib/utils'
import Icon from '../common/Icon'

export default function KeyFolioAnalysisCard({
  patrimoineNet = 0,
  valeurTotale = 0,
  topProperty = null,
  cashFlowMensuel = 0,
  ltv = 0,
  tauxOccupation = 100,
  nbProjets = 0
}) {
  const isPositif = cashFlowMensuel >= 0

  return (
    <div className="card" style={{
      padding: '24px 26px',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
      color: '#f8fafc',
      borderRadius: 16,
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Halo lumineux de fond */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(99, 102, 241, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon name="sparkles" size={17} color="#a5b4fc" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
            Synthèse d'Analyse KeyFolio
          </h3>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Diagnostic patrimonial consolidé généré automatiquement
          </span>
        </div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.6, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0 }}>
          Votre patrimoine immobilier brut est valorisé à <strong>{formatEuro(valeurTotale)}</strong> pour un actif net de <strong>{formatEuro(patrimoineNet)}</strong>.
          {ltv > 0 && ` Votre niveau d'endettement (LTV) s'élève à ${ltv}% de la valeur du parc, ce qui constitue un ${ltv < 60 ? 'ratio d\'endettement très sécurisé' : ltv < 80 ? 'effet de levier équilibré' : 'levier d\'endettement significatif'}.`}
        </p>

        {topProperty && (
          <p style={{ margin: 0 }}>
            🏆 <strong>Actif le plus performant :</strong> Le bien <span style={{ color: '#86efac', fontWeight: 700 }}>{topProperty.bien?.nom}</span> affiche la meilleure rentabilité nette avec <strong>{topProperty.rendementNetPct || topProperty.rendementBrutPct}%</strong> et un cash-flow net de <strong>+{formatEuro(topProperty.cashFlowMensuelNet)}/mois</strong>.
          </p>
        )}

        <p style={{ margin: 0 }}>
          {isPositif ? (
            <span>
              💰 <strong>Trésorerie positive :</strong> Votre portefeuille dégage un excédent net de <strong>+{formatEuro(cashFlowMensuel)}/mois</strong> (soit +{formatEuro(cashFlowMensuel * 12)}/an) après paiement intégral des charges et des échéances de crédits.
            </span>
          ) : (
            <span>
              ⚠️ <strong>Trésorerie sous tension :</strong> Votre portefeuille nécessite actuellement un effort d'épargne personnel de <strong>{formatEuro(Math.abs(cashFlowMensuel))}/mois</strong> pour couvrir l'ensemble des crédits et charges d'exploitation.
            </span>
          )}
        </p>

        {nbProjets > 0 && (
          <p style={{ margin: 0 }}>
            🏗️ <strong>Projets en cours :</strong> Vous avez <strong>{nbProjets} projet{nbProjets > 1 ? 's' : ''}</strong> en développement qui viendront renforcer la valorisation globale du patrimoine à leur mise en service.
          </p>
        )}
      </div>
    </div>
  )
}
