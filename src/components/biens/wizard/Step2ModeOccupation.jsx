import React from 'react'
import Icon from '../../common/Icon'

export default function Step2ModeOccupation({
  occupation,
  setOccupation,
  isProjet,
  bien,
  setBien
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
        Sélectionnez le mode d'exploitation du bien :
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        
        {/* Option 1 : Location */}
        <div
          onClick={() => setOccupation('location')}
          style={{
            padding: 16,
            borderRadius: 10,
            border: occupation === 'location' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
            background: occupation === 'location' ? 'rgba(79, 70, 229, 0.05)' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontWeight: 800, fontSize: 14 }}>
            <Icon name="key" size={18} color="#4f46e5" /> En Location (Rendement)
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            Logement loué ou à louer générant des revenus locatifs et nécessitant un suivi de bail.
          </div>
        </div>

        {/* Option 2 : Projet / Travaux */}
        <div
          onClick={() => setOccupation('projet')}
          style={{
            padding: 16,
            borderRadius: 10,
            border: occupation === 'projet' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            background: occupation === 'projet' ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb', fontWeight: 800, fontSize: 14 }}>
            <Icon name="hardHat" size={18} color="#2563eb" /> Projet / En Travaux
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            Opération en cours de rénovation, construction ou acquisition avec budget et avancement (%).
          </div>
        </div>

        {/* Option 3 : Résidence Principale */}
        <div
          onClick={() => setOccupation('residence_principale')}
          style={{
            padding: 16,
            borderRadius: 10,
            border: occupation === 'residence_principale' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            background: occupation === 'residence_principale' ? 'rgba(22, 163, 74, 0.05)' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontWeight: 800, fontSize: 14 }}>
            <Icon name="house" size={18} color="#16a34a" /> Résidence Principale
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            Logement occupé à titre personnel par le propriétaire.
          </div>
        </div>

        {/* Option 4 : Vacant */}
        <div
          onClick={() => setOccupation('vacant')}
          style={{
            padding: 16,
            borderRadius: 10,
            border: occupation === 'vacant' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            background: occupation === 'vacant' ? 'rgba(245, 158, 11, 0.05)' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 800, fontSize: 14 }}>
            <Icon name="doorClosed" size={18} color="#f59e0b" /> Logement Vacant
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            En attente de nouveau locataire ou de commercialisation.
          </div>
        </div>

      </div>

      {/* Paramètres additionnels si Projet */}
      {isProjet && (
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="hardHat" size={15} color="#2563eb" /> Paramètres du Projet
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Budget prévisionnel total (€)</label>
              <input
                type="number"
                className="form-control"
                placeholder="ex: 180000"
                value={bien.budget_prevision}
                onChange={e => setBien({ ...bien, budget_prevision: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Phase actuelle</label>
              <select
                className="form-control"
                value={bien.phase_actuelle}
                onChange={e => setBien({ ...bien, phase_actuelle: e.target.value })}
              >
                <option value="Étude / Conception">Étude / Conception</option>
                <option value="Permis de construire">Permis de construire</option>
                <option value="Gros œuvre / Démolition">Gros œuvre / Démolition</option>
                <option value="Second œuvre / Rénovation">Second œuvre / Rénovation</option>
                <option value="Finitions / Livraison">Finitions / Livraison</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
              <span>Avancement des travaux</span>
              <span style={{ color: '#2563eb', fontWeight: 800 }}>{bien.pourcentage_avancement || 0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={bien.pourcentage_avancement || 0}
              onChange={e => setBien({ ...bien, pourcentage_avancement: e.target.value })}
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
