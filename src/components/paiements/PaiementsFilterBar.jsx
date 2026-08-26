import React from 'react'
import Icon from '../common/Icon'

export default function PaiementsFilterBar({
  activeTab,
  setActiveTab,
  paiementsCount,
  bauxWithDepositCount,
  cautionsEnAttenteCount,
  countImpayes,
  filterStatut,
  setFilterStatut,
  filterBien,
  setFilterBien,
  biens
}) {
  return (
    <>
      {/* Bannière Cautions en Attente si existantes */}
      {cautionsEnAttenteCount > 0 && (
        <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '14px 18px', borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="clock" size={24} color="#d97706" />
              <div>
                <strong style={{ color: '#92400E', fontSize: 14 }}>
                  {cautionsEnAttenteCount} dépôt{cautionsEnAttenteCount > 1 ? 's' : ''} de garantie en attente de versement !
                </strong>
                <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                  Validez la réception des cautions dès l'encaissement du virement ou du chèque.
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{ background: '#F59E0B', color: '#FFF', fontWeight: 700, border: 'none' }}
              onClick={() => setActiveTab('cautions')}
            >
              Voir les cautions en attente →
            </button>
          </div>
        </div>
      )}

      {/* Sous-filtres d'onglets */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setActiveTab('all')}
          >
            <Icon name="fileText" size={13} /> Tous les flux
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'loyers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setActiveTab('loyers')}
          >
            <Icon name="house" size={13} /> Loyers ({paiementsCount})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'cautions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setActiveTab('cautions')}
          >
            <Icon name="euro" size={13} /> Dépôts de garantie ({bauxWithDepositCount})
            {cautionsEnAttenteCount > 0 && ` (${cautionsEnAttenteCount} en attente)`}
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'impayes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('impayes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              ...(countImpayes > 0 ? { background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' } : {})
            }}
          >
            <Icon name="alert" size={13} color={countImpayes > 0 ? '#DC2626' : 'currentColor'} /> Impayés & En retard ({countImpayes})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeTab !== 'cautions' && (
            <select className="form-control" style={{ maxWidth: 180 }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="impaye">Impayé</option>
              <option value="paye">Payé</option>
              <option value="en_retard">En retard</option>
              <option value="partiel">Partiel</option>
            </select>
          )}

          <select className="form-control" style={{ maxWidth: 180 }} value={filterBien} onChange={e => setFilterBien(e.target.value)}>
            <option value="">Tous les logements</option>
            {biens.map(b => (
              <option key={b.id} value={b.id}>{b.nom}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}
