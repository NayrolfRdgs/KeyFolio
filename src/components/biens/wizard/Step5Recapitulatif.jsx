import React from 'react'
import { formatEuro } from '../../../lib/utils'

export default function Step5Recapitulatif({
  bien,
  occupation,
  isLocation,
  isProjet,
  locataire,
  bail
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
        Récapitulatif avant création et génération de l'actif :
      </div>

      {/* Cartouche Bien */}
      <div style={{ background: 'rgba(79, 70, 229, 0.05)', padding: 14, borderRadius: 10, border: '1.5px solid rgba(79, 70, 229, 0.2)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Logement / Actif</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{bien.nom}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          {bien.type_bien} • {bien.surface_m2 ? `${bien.surface_m2} m²` : 'Surface non spécifiée'} • {bien.adresse || 'Adresse non renseignée'}
        </div>
      </div>

      {/* Cartouche Exploitation & Bail */}
      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Mode d'exploitation</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
          {occupation === 'location' ? 'Location Longue Durée' : occupation === 'projet' ? 'Projet / Rénovation' : occupation === 'residence_principale' ? 'Résidence Principale' : 'Vacant'}
        </div>
        {isLocation && locataire.nom && (
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            Locataire : <strong>{locataire.prenom} {locataire.nom}</strong> • Loyer CC : <strong style={{ color: '#4f46e5' }}>{formatEuro(Number(bail.loyer_mensuel || 0) + Number(bail.charges_mensuelles || 0))}/m</strong>
          </div>
        )}
        {isProjet && (
          <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4, fontWeight: 600 }}>
            Budget prévisionnel : {formatEuro(bien.budget_prevision || 0)} • Avancement : {bien.pourcentage_avancement || 0}%
          </div>
        )}
      </div>

      {/* Cartouche Tableurs Excel */}
      <div style={{ background: 'rgba(22, 163, 74, 0.06)', padding: 14, borderRadius: 10, border: '1.5px solid rgba(22, 163, 74, 0.2)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Initialisation Automatique</div>
        <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
          Création de l'arborescence physique complète et des tableurs Excel : <em>Fiche_Bien.xlsx</em>, <em>Suivi_Loyers.xlsx</em>, <em>Suivi_Depenses.xlsx</em>, <em>Locataires_Baux.xlsx</em>.
        </div>
      </div>
    </div>
  )
}
