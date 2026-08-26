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
            <button id="btn-add-locataire" className="btn btn-primary" onClick={onOpenCreateLoc} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="plus" size={14} /> Nouveau locataire
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onOpenCreateCand} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Icon name="user" size={14} /> Locataires enregistrés ({locatairesCount})
        </button>
        <button
          className={`btn ${activeTab === 'candidatures' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('candidatures')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Icon name="folderOpen" size={14} /> Candidatures & Dossiers ({candidaturesCount})
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
            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setLocSubFilter('actuels')}
          >
            <Icon name="checkCircle" size={12} color={locSubFilter === 'actuels' ? '#ffffff' : '#16a34a'} />
            Locataires actuels ({countActuels})
          </button>
          <button
            className={`btn btn-sm ${locSubFilter === 'anciens' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setLocSubFilter('anciens')}
          >
            <Icon name="fileText" size={12} color={locSubFilter === 'anciens' ? '#ffffff' : '#64748b'} />
            Anciens locataires ({countAnciens})
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
