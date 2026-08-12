import React, { useEffect, useState } from 'react'
import { getBiens } from '../lib/db'
import Icon from './Icon'

const statutColor = {
  en_cours:  { dot: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  en_vente:  { dot: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  vendu:     { dot: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

export default function Sidebar({ currentPage, currentBienId, onNavigate, onOpenSearch, onOpenExcelGenerator, onOpenMail, onOpenSettings }) {
  const [biens, setBiens] = useState([])

  useEffect(() => {
    getBiens().then(setBiens).catch(() => {})
    // Rafraîchir toutes les 10s en cas d'ajout
    const iv = setInterval(() => getBiens().then(setBiens).catch(() => {}), 10000)
    return () => clearInterval(iv)
  }, [])

  return (
    <aside className="sidebar">
      {/* Logo + icônes outils */}
      <div className="sidebar-logo">
        <h1>🏠 LePuits</h1>
        <p>Gestion immobilière</p>
      </div>

      {/* Barre d'outils compacte — icônes uniquement */}
      <div className="sidebar-tools">
        <button
          className="sidebar-icon-btn"
          onClick={onOpenSearch}
          title="Recherche globale"
        >
          🔍
        </button>
        <button
          className="sidebar-icon-btn"
          onClick={() => onOpenExcelGenerator()}
          title="Générateur Excel"
        >
          📊
        </button>
      </div>

      <nav className="sidebar-nav">
        {/* Dashboard */}
        <button
          id="nav-dashboard"
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <Icon name="dashboard" size={16} />
          Tableau de bord
        </button>

        {/* Séparateur Logements */}
        <div className="nav-section-label">
          Mes logements
          <span style={{ marginLeft: 'auto', color: 'var(--color-accent)', fontSize: 11 }}>
            {biens.length}
          </span>
        </div>

        {biens.length === 0 ? (
          <div className="nav-empty-hint">Aucun logement — cliquez + pour commencer</div>
        ) : (
          biens.map(b => {
            const sc = statutColor[b.statut] || statutColor.en_cours
            const isActive = currentPage === 'bien' && currentBienId === b.id
            return (
              <div key={b.id} className={`nav-bien-item ${isActive ? 'active' : ''}`}>
                <button
                  className="nav-bien-btn"
                  onClick={() => onNavigate('bien', b.id)}
                  title={b.adresse || b.nom}
                >
                  <span className="nav-bien-dot" style={{ background: sc.dot }} />
                  <span className="nav-bien-name">{b.nom}</span>
                </button>
                <button
                  className="nav-bien-mail-btn"
                  onClick={(e) => { e.stopPropagation(); onOpenMail(b.id) }}
                  title={`Boîte mail — ${b.nom}`}
                >
                  ✉️
                </button>
              </div>
            )
          })
        )}

        {/* Bouton Ajouter Logement */}
        <button
          id="nav-add-bien"
          className="nav-item nav-add"
          onClick={() => onNavigate('biens')}
          style={{ marginTop: 8 }}
        >
          <Icon name="plus" size={14} />
          Ajouter un logement
        </button>

        {/* Séparateur Gestion */}
        <div className="nav-section-label" style={{ marginTop: 12 }}>Gestion</div>

        <button
          id="nav-locataires"
          className={`nav-item ${currentPage === 'locataires' ? 'active' : ''}`}
          onClick={() => onNavigate('locataires')}
        >
          <Icon name="locataires" size={16} />
          Locataires
        </button>

        <button
          id="nav-baux"
          className={`nav-item ${currentPage === 'baux' ? 'active' : ''}`}
          onClick={() => onNavigate('baux')}
        >
          🔑 Baux
        </button>

        <button
          id="nav-paiements"
          className={`nav-item ${currentPage === 'paiements' ? 'active' : ''}`}
          onClick={() => onNavigate('paiements')}
        >
          💳 Paiements
        </button>

        <button
          id="nav-depenses"
          className={`nav-item ${currentPage === 'depenses' ? 'active' : ''}`}
          onClick={() => onNavigate('depenses')}
        >
          📉 Dépenses
        </button>

        <button
          id="nav-maintenance"
          className={`nav-item ${currentPage === 'maintenance' ? 'active' : ''}`}
          onClick={() => onNavigate('maintenance')}
        >
          <Icon name="maintenance" size={16} />
          Maintenance
        </button>

        <button
          id="nav-documents"
          className={`nav-item ${currentPage === 'documents' ? 'active' : ''}`}
          onClick={() => onNavigate('documents')}
        >
          <Icon name="documents" size={16} />
          Documents
        </button>

        <button
          id="nav-options"
          className="nav-item"
          onClick={onOpenSettings}
          style={{ marginTop: 14, borderTop: '1px solid var(--border-color)', paddingTop: 10, color: 'var(--text-muted)' }}
        >
          ⚙️ Options & Réglages
        </button>
      </nav>

      <div className="sidebar-footer">
        LePuits v6 — Phase 6
      </div>
    </aside>
  )
}
