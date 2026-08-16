import React from 'react'
import Icon from '../common/Icon'

export default function LocatairesHeader({
  activeTab,
  setActiveTab,
  locatairesCount,
  candidaturesCount,
  search,
  setSearch,
  locSubFilter,
  setLocSubFilter,
  countActuels,
  countAnciens,
  onOpenCreateLoc,
  onOpenCreateCand
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>Locataires & Candidatures</h2>
          <p>Gestion des dossiers locataires, candidatures et processus de création de baux</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'locataires' ? (
            <button id="btn-add-locataire" className="btn btn-primary" onClick={onOpenCreateLoc}>
              <Icon name="plus" size={14} /> Nouveau locataire
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onOpenCreateCand}>
              <Icon name="plus" size={14} /> Nouvelle candidature
            </button>
          )}
        </div>
      </div>

      {/* Onglets navigation Locataires / Candidatures */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'locataires' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('locataires')}
        >
          👤 Locataires enregistrés ({locatairesCount})
        </button>
        <button
          className={`btn ${activeTab === 'candidatures' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('candidatures')}
        >
          📂 Candidatures & Dossiers ({candidaturesCount})
        </button>
      </div>

      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Sous-filtres locataires (actuels vs anciens) */}
      {activeTab === 'locataires' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--color-surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border-color)', width: 'fit-content' }}>
          <button
            className={`btn btn-sm ${locSubFilter === 'actuels' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => setLocSubFilter('actuels')}
          >
            🟢 Locataires actuels ({countActuels})
          </button>
          <button
            className={`btn btn-sm ${locSubFilter === 'anciens' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => setLocSubFilter('anciens')}
          >
            📜 Anciens locataires ({countAnciens})
          </button>
          <button
            className={`btn btn-sm ${locSubFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => setLocSubFilter('all')}
          >
            Tous ({locatairesCount})
          </button>
        </div>
      )}
    </>
  )
}
