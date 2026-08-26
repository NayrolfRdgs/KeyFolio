import React from 'react'
import Icon from '../common/Icon'
import { formatEuro } from '../../lib/utils'

export default function BiensToolbar({
  currentView,
  setCurrentView,
  onOpenSimu,
  onOpenProjet,
  onOpenWizard,
  kpis
}) {
  return (
    <>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>Parc Immobilier & Cartographie</h2>
          <p>Supervision des logements en exploitation et des projets de travaux</p>
        </div>

        {/* Boutons de vue et d'action */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--color-surface-2)',
              borderRadius: 8,
              padding: 2,
              border: '1px solid var(--color-border)'
            }}
          >
            <button
              onClick={() => setCurrentView('carte')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: currentView === 'carte' ? 'var(--color-accent)' : 'transparent',
                color: currentView === 'carte' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentView === 'carte' ? 700 : 500,
                fontSize: 11.5,
                cursor: 'pointer'
              }}
            >
              <Icon name="map" size={13} color={currentView === 'carte' ? '#ffffff' : 'currentColor'} /> Carte
            </button>

            <button
              onClick={() => setCurrentView('cartes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: currentView === 'cartes' ? 'var(--color-accent)' : 'transparent',
                color: currentView === 'cartes' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentView === 'cartes' ? 700 : 500,
                fontSize: 11.5,
                cursor: 'pointer'
              }}
            >
              <Icon name="grid" size={13} color={currentView === 'cartes' ? '#ffffff' : 'currentColor'} /> Grille
            </button>

            <button
              onClick={() => setCurrentView('liste')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: currentView === 'liste' ? 'var(--color-accent)' : 'transparent',
                color: currentView === 'liste' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentView === 'liste' ? 700 : 500,
                fontSize: 11.5,
                cursor: 'pointer'
              }}
            >
              <Icon name="fileSpreadsheet" size={13} color={currentView === 'liste' ? '#ffffff' : 'currentColor'} /> Liste
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={onOpenSimu}
            title="Lancer une simulation financière"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Icon name="calculator" size={14} color="#4f46e5" /> Simuler
          </button>

          <button
            className="btn btn-secondary"
            onClick={onOpenProjet}
            title="Créer un nouveau projet (rénovation, construction, achat...)"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderColor: '#2563eb', color: '#2563eb' }}
          >
            <Icon name="hardHat" size={14} color="#2563eb" /> + Créer un projet
          </button>

          <button
            id="btn-add-bien"
            className="btn btn-primary"
            onClick={onOpenWizard}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Icon name="plus" size={14} /> + Ajouter un bien
          </button>
        </div>
      </div>

      {/* Bandeau KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Éléments</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{kpis.total}</div>
        </div>

        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Biens Actifs</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{kpis.actifs}</div>
        </div>

        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Projets / Travaux</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>{kpis.projets}</div>
        </div>

        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valeur Globale Estimée</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{formatEuro(kpis.valeurTotale)}</div>
        </div>
      </div>
    </>
  )
}
