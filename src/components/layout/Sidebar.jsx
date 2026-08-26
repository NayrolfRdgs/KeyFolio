import React, { useEffect, useState } from 'react'
import { getBiens, getProjets, getTaches, getPaiements, getMaintenance } from '../../lib/db'
import Icon from '../common/Icon'

const statutColor = {
  actif:      { dot: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
  loue:       { dot: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
  occupe:     { dot: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
  en_cours:   { dot: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
  projet:     { dot: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' },
  vacant:     { dot: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  en_attente: { dot: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  en_vente:   { dot: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  inactif:    { dot: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  vendu:      { dot: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
}

export default function Sidebar({
  currentPage,
  currentBienId,
  onNavigate,
  onOpenSearch,
  onOpenExcelGenerator,
  onOpenMail,
  onOpenSettings
}) {
  const [biens, setBiens] = useState([])
  const [projetsCount, setProjetsCount] = useState(0)
  const [tachesCount, setTachesCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)

  // Gestion des sections repliables
  const [collapsedSections, setCollapsedSections] = useState({
    patrimoine: false,
    finances: false,
    location: false,
    suivi: false,
    documents: false,
    analyses: false,
  })

  const toggleSection = (sec) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  useEffect(() => {
    const fetchData = () => {
      getBiens().then(b => {
        setBiens(b || [])
      }).catch(() => {})

      getProjets().then(p => {
        setProjetsCount((p || []).length)
      }).catch(() => {})

      Promise.all([
        Promise.resolve(getTaches()).catch(() => []),
        getPaiements().catch(() => []),
        getMaintenance().catch(() => [])
      ]).then(([ta, pa, ma]) => {
        const pendingTaches = (ta || []).filter(x => !x.termine).length
        const impayes = (pa || []).filter(p => p.statut === 'impaye' || p.statut === 'en_retard').length
        const urgents = (ma || []).filter(m => m.priorite === 'urgent' && m.statut !== 'resolu').length
        setTachesCount(pendingTaches)
        setAlertCount(impayes + urgents + pendingTaches)
      }).catch(() => {})
    }

    fetchData()
    const iv = setInterval(fetchData, 10000)
    return () => clearInterval(iv)
  }, [])

  const navItem = (pageKey, label, iconName, count = null) => {
    const isActive = currentPage === pageKey
    return (
      <button
        key={pageKey}
        id={`nav-${pageKey}`}
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => onNavigate(pageKey)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '7px 10px',
          borderRadius: 6,
          border: 'none',
          background: isActive ? 'var(--color-primary, #4f46e5)' : 'transparent',
          color: isActive ? '#ffffff' : 'var(--text-secondary, #334155)',
          fontWeight: isActive ? 600 : 500,
          fontSize: 13,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
          marginBottom: 2
        }}
      >
        <Icon
          name={iconName}
          size={16}
          color={isActive ? '#ffffff' : 'var(--text-muted, #64748b)'}
          style={{ marginRight: 10, flexShrink: 0 }}
        />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {count != null && count > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 99,
              background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(99, 102, 241, 0.12)',
              color: isActive ? '#ffffff' : '#4f46e5',
              marginLeft: 6
            }}
          >
            {count}
          </span>
        )}
      </button>
    )
  }

  const sectionHeader = (secKey, label, count = null) => {
    const isCollapsed = collapsedSections[secKey]
    return (
      <div
        onClick={() => toggleSection(secKey)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px 4px 10px',
          marginTop: 6,
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted, #64748b)'
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {count != null && count > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent, #4f46e5)' }}>
              {count}
            </span>
          )}
          <Icon
            name={isCollapsed ? 'chevronRight' : 'chevronDown'}
            size={12}
            color="var(--text-muted, #94a3b8)"
          />
        </div>
      </div>
    )
  }

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── LOGO & OUTILS RAPIDES ── */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)'
            }}
          >
            <Icon name="key" size={17} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              KeyFolio
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>OS Patrimoine</div>
          </div>
        </div>

        {/* Boutons d'outils d'en-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="sidebar-icon-btn"
            onClick={onOpenSearch}
            title="Recherche globale (Ctrl + K)"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <Icon name="search" size={13} />
          </button>
          <button
            className="sidebar-icon-btn"
            onClick={onOpenExcelGenerator}
            title="Générateur Excel"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <Icon name="fileSpreadsheet" size={13} />
          </button>
        </div>
      </div>

      {/* ── NAVIGATION CATÉGORISÉE SANS DOUBLONS ── */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        
        {/* 1. ACCUEIL */}
        {navItem('dashboard', 'Tableau de bord', 'dashboard')}

        {/* 2. PATRIMOINE (BIENS & PROJETS UNIFIÉS + ACCÈS DIRECT AUX LOGEMENTS) */}
        {sectionHeader('patrimoine', 'Patrimoine', biens.length + projetsCount)}
        {!collapsedSections.patrimoine && (
          <div style={{ paddingLeft: 2 }}>
            {navItem('biens', 'Biens & Projets', 'house', biens.length + projetsCount)}
            
            {/* Liste d'accès rapide direct aux biens avec pastille de statut */}
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 6 }}>
              {biens.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px' }}>
                  Aucun bien enregistré
                </div>
              ) : (
                biens.map(b => {
                  const sc = statutColor[b.statut] || statutColor.actif
                  const isActive = currentPage === 'bien' && currentBienId === b.id

                  return (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 6,
                        background: isActive ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                        padding: '3px 6px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <button
                        onClick={() => onNavigate('bien', b.id)}
                        title={b.adresse || b.nom}
                        style={{
                          background: 'none',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          flex: 1,
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: 0,
                          minWidth: 0
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: sc.dot,
                            flexShrink: 0
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? '#4f46e5' : '#475569',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {b.nom}
                        </span>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenMail(b.id) }}
                        title={`Boîte mail — ${b.nom}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 4
                        }}
                      >
                        <Icon name="mail" size={12} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* 3. FINANCES */}
        {sectionHeader('finances', 'Finances')}
        {!collapsedSections.finances && (
          <div style={{ paddingLeft: 2 }}>
            {navItem('paiements', 'Revenus', 'revenus')}
            {navItem('depenses', 'Dépenses', 'depense')}
            {navItem('prets', 'Prêts', 'pret')}
            {navItem('rendements', 'Rendements', 'rendement')}
            {navItem('simulations', 'Simulations', 'simulation')}
          </div>
        )}

        {/* 4. LOCATION */}
        {sectionHeader('location', 'Location')}
        {!collapsedSections.location && (
          <div style={{ paddingLeft: 2 }}>
            {navItem('locataires', 'Locataires', 'locataire')}
            {navItem('baux', 'Locations / Baux', 'bail')}
            {navItem('edl', 'États des lieux', 'edl')}
          </div>
        )}

        {/* 5. SUIVI */}
        {sectionHeader('suivi', 'Suivi', tachesCount)}
        {!collapsedSections.suivi && (
          <div style={{ paddingLeft: 2 }}>
            {navItem('maintenance', 'Maintenance', 'maintenance')}
            {navItem('taches', 'Tâches & Échéances', 'tache', tachesCount)}
          </div>
        )}

        {/* 6. DOCUMENTS */}
        {sectionHeader('documents', 'Documents')}
        {!collapsedSections.documents && (
          <div style={{ paddingLeft: 2 }}>
            {navItem('documents', 'Documents', 'documents')}
          </div>
        )}

        {/* 7. ANALYSES */}
        {sectionHeader('analyses', 'Analyses')}
        {!collapsedSections.analyses && (
          <div style={{ paddingLeft: 2 }}>
            {navItem('analyses', 'Analyses & Rapports', 'analyse')}
          </div>
        )}

      </nav>

      {/* ── FOOTER SIDEBAR : VERSION + NOTIFICATIONS & PARAMÈTRES GROUPÉS ── */}
      <div
        className="sidebar-footer"
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-surface-2)'
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
          KeyFolio v0.2.0
        </span>

        {/* Boutons d'action système (Notifications + Paramètres) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Bouton Notifications */}
          <button
            onClick={() => onNavigate && onNavigate('notifications')}
            title="Centre de notifications & alertes"
            style={{
              position: 'relative',
              background: currentPage === 'notifications' ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              border: 'none',
              color: currentPage === 'notifications' ? '#4f46e5' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '5px 7px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="bell" size={15} color={currentPage === 'notifications' ? '#4f46e5' : 'currentColor'} />
            {alertCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 0 1.5px #ffffff'
                }}
              />
            )}
          </button>

          {/* Bouton Paramètres */}
          <button
            onClick={() => onOpenSettings && onOpenSettings('general')}
            title="Paramètres de l'application"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '5px 7px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon name="settings" size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
