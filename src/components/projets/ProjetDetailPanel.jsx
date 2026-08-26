import React, { useState } from 'react'
import Icon from '../common/Icon'
import StatusBadge from '../common/StatusBadge'
import ProjetBudgetView from './ProjetBudgetView'
import ProjetPlanViewer from './ProjetPlanViewer'
import ProjetTimeline from './ProjetTimeline'
import ProjetConvertModal from './ProjetConvertModal'
import { formatEuro, formatDate } from '../../lib/utils'
import { updateProjet } from '../../lib/db'

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: 'hardHat' },
  { id: 'plan', label: 'Plans', icon: 'plan' },
  { id: 'budget', label: 'Budget', icon: 'wallet' },
  { id: 'financement', label: 'Financement', icon: 'circleDollarSign' },
  { id: 'rentabilite', label: 'Rentabilité & Scénarios', icon: 'trendingUp' },
  { id: 'planning', label: 'Planning & Étapes', icon: 'calendar' },
  { id: 'travaux', label: 'Travaux & Artisans', icon: 'wrench' },
]

export default function ProjetDetailPanel({ projet, onClose, onRefresh, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [avancement, setAvancement] = useState(projet?.pourcentage_avancement || 0)

  if (!projet) return null

  const handleUpdateAvancement = async (newVal) => {
    setAvancement(newVal)
    await updateProjet({ ...projet, pourcentage_avancement: newVal })
    onRefresh && onRefresh()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* ── 1. EN-TÊTE DU PROJET ── */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon name="hardHat" size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {projet.nom}
              </h3>
              <StatusBadge status={projet.statut || 'travaux'} type="projet" size="sm" />
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b' }}>
              {projet.adresse || 'Emplacement non défini'} · {projet.surface_m2 ? `${projet.surface_m2} m²` : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setConvertModalOpen(true)}
            style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Icon name="checkCircle" size={14} /> Convertir en bien réel
          </button>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* ── 2. BARRE D'ONGLETS DU PROJET ── */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '0 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          overflowX: 'auto'
        }}
      >
        {TABS.map(t => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon name={t.icon} size={14} color={isActive ? '#2563eb' : '#64748b'} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── 3. CONTENU DE L'ONGLET ACTIF ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        
        {/* TAB 1: VUE D'ENSEMBLE */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI Rapides du projet */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Budget prévisionnel</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{formatEuro(projet.budget_prevu)}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Livraison prévue</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {projet.date_livraison_prevue ? formatDate(projet.date_livraison_prevue) : 'À définir'}
                </div>
              </div>
              <div style={{ background: 'rgba(37, 99, 235, 0.06)', padding: 14, borderRadius: 8, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Avancement global</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{avancement}%</div>
              </div>
            </div>

            {/* Slider de mise à jour rapide de l'avancement */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Progression du chantier</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>{avancement}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={avancement}
                onChange={e => setAvancement(Number(e.target.value))}
                onMouseUp={() => handleUpdateAvancement(avancement)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Description & Objectifs */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>Description de l'opération</h4>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                {projet.description || 'Aucune description renseignée pour ce projet.'}
              </p>
            </div>

            {/* Timeline rapide */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700 }}>Étapes clés de réalisation</h4>
              <ProjetTimeline currentStepIndex={Math.min(6, Math.floor(avancement / 16))} />
            </div>
          </div>
        )}

        {/* TAB 2: PLANS */}
        {activeTab === 'plan' && (
          <ProjetPlanViewer targetId={projet.id} />
        )}

        {/* TAB 3: BUDGET */}
        {activeTab === 'budget' && (
          <ProjetBudgetView projetId={projet.id} totalBudgetPrevu={projet.budget_prevu} />
        )}

        {/* TAB 4: FINANCEMENT */}
        {activeTab === 'financement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>Prêts affectés à ce projet</h4>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px 0' }}>
                Associez ou simulez le financement bancaire de cette opération.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('prets')}>
                <Icon name="plus" size={13} /> Gérer les prêts dans la section Finances
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: RENTABILITÉ & SCÉNARIOS */}
        {activeTab === 'rentabilite' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>Simulations prévisionnelles pour ce projet</h4>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px 0' }}>
                Comparez les rendements de sortie : Location nue longue durée, Location saisonnière (AirBnB) ou Revente avec plus-value.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('simulations')}>
                <Icon name="calculator" size={13} /> Ouvrir le simulateur de scénarios
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: PLANNING */}
        {activeTab === 'planning' && (
          <ProjetTimeline
            currentStepIndex={Math.min(6, Math.floor(avancement / 16))}
            onStepClick={(idx) => handleUpdateAvancement(Math.min(100, Math.round((idx + 1) * 14.5)))}
          />
        )}

        {/* TAB 7: TRAVAUX */}
        {activeTab === 'travaux' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>Journal du chantier & Artisans</h4>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px 0' }}>
                Suivez les passages d'artisans, livraisons de matériaux et comptes-rendus de chantier.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate && onNavigate('maintenance')}>
                Voir les interventions dans le Suivi
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL CONVERSION PROJET -> BIEN ── */}
      {convertModalOpen && (
        <ProjetConvertModal
          projet={projet}
          onClose={() => setConvertModalOpen(false)}
          onSuccess={() => {
            setConvertModalOpen(false)
            onClose && onClose()
            onNavigate && onNavigate('biens')
          }}
        />
      )}

    </div>
  )
}
