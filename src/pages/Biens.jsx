import React, { useEffect, useState, useMemo } from 'react'
import { getBiens, getProjets, getBaux, deleteBien, deleteProjet, updateBien } from '../lib/db'
import { geocodeAddress } from '../lib/geocoding'
import Icon from '../components/common/Icon'
import WizardCreateBien from '../components/biens/WizardCreateBien'
import FicheBienDetailModal from '../components/biens/FicheBienDetailModal'
import FolderImportModal from '../components/biens/FolderImportModal'
import BiensMapView from '../components/biens/BiensMapView'
import BienDetailDrawer from '../components/biens/BienDetailDrawer'
import BienCardGrid from '../components/biens/BienCardGrid'
import BiensTableView from '../components/biens/BiensTableView'
import NewProjetModal from '../components/projets/NewProjetModal'
import LoanSimulatorModal from '../components/prets/LoanSimulatorModal'
import BiensToolbar from '../components/biens/BiensToolbar'
import BiensSidebarList from '../components/biens/BiensSidebarList'

export default function Biens({ onNavigate, initialFilter = 'all' }) {
  const [biens, setBiens] = useState([])
  const [projets, setProjets] = useState([])
  const [baux, setBaux] = useState([])
  const [error, setError] = useState(null)
  const [selectedBien, setSelectedBien] = useState(null)
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statutFilter, setStatutFilter] = useState(initialFilter || 'all')
  const [currentView, setCurrentView] = useState('carte')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Modales
  const [wizardModal, setWizardModal] = useState(false)
  const [projetModal, setProjetModal] = useState(false)
  const [simuModal, setSimuModal] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [detailBien, setDetailBien] = useState(null)

  const load = async () => {
    try {
      const [biensData, projetsData, bauxData] = await Promise.all([
        getBiens().catch(() => []),
        getProjets().catch(() => []),
        getBaux().catch(() => [])
      ])
      setBiens(biensData || [])
      setProjets(projetsData || [])
      setBaux(bauxData || [])

      if (selectedBien) {
        const allItems = [...(biensData || []), ...(projetsData || []).map(p => ({
          ...p,
          id: `p-${p.id}`,
          projet_id: p.id,
          type_bien: p.type || 'Projet',
          statut: 'projet',
          valeur_estimee: p.budget_prevision || 0,
          is_projet_entity: true
        }))]
        const refreshed = allItems.find(b => b.id === selectedBien.id || b.projet_id === selectedBien.projet_id)
        if (refreshed) setSelectedBien(refreshed)
      } else if (biensData && biensData.length > 0) {
        setSelectedBien(biensData[0])
      }

      // Géocodage des adresses sans coordonnées
      (biensData || []).forEach(async (b) => {
        if ((!b.latitude || !b.longitude) && b.adresse && b.adresse.trim()) {
          const coords = await geocodeAddress(b.adresse)
          if (coords) {
            await updateBien({
              ...b,
              latitude: coords.lat,
              longitude: coords.lon
            })
          }
        }
      })
    } catch (e) {
      setError(e?.toString())
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSelectBien = (b) => {
    setSelectedBien(b)
    setIsDrawerCollapsed(false)
  }

  const handleDelete = async (id, isProjet = false, realProjetId = null) => {
    if (!confirm('Supprimer définitivement cet élément ?')) return
    try {
      if (isProjet && realProjetId) {
        await deleteProjet(realProjetId)
      } else {
        await deleteBien(id)
      }
      setSelectedBien(null)
      load()
    } catch (err) {
      setError(err?.toString())
    }
  }

  // Calcul combiné des actifs et projets
  const combinedItems = useMemo(() => {
    const listBiens = (biens || []).map(b => ({
      ...b,
      is_projet_entity: false
    }))

    const listProjets = (projets || []).map(p => ({
      ...p,
      id: `p-${p.id}`,
      projet_id: p.id,
      type_bien: p.type || 'Projet',
      statut: 'projet',
      surface_m2: p.surface_m2 || null,
      valeur_estimee: p.budget_prevu || p.budget_prevision || 0,
      is_projet_entity: true
    }))

    return [...listBiens, ...listProjets]
  }, [biens, projets])

  // KPIs
  const kpis = useMemo(() => {
    const total = combinedItems.length
    const actifs = biens.filter(b => String(b.statut).toLowerCase() !== 'inactif' && String(b.statut).toLowerCase() !== 'projet').length
    const projCount = projets.length + biens.filter(b => String(b.statut).toLowerCase() === 'projet').length
    const valeurTotale = biens.reduce((acc, b) => acc + (b.valeur_estimee || b.prix_achat || 0), 0) +
      projets.reduce((acc, p) => acc + (p.budget_prevu || p.budget_prevision || 0), 0)

    return { total, actifs, projets: projCount, valeurTotale }
  }, [combinedItems, biens, projets])

  // Filtrage
  const filteredBiens = useMemo(() => {
    return combinedItems.filter(b => {
      const q = searchQuery.toLowerCase().trim()
      const matchQuery = !q ||
        (b.nom && b.nom.toLowerCase().includes(q)) ||
        (b.adresse && b.adresse.toLowerCase().includes(q)) ||
        (b.type_bien && b.type_bien.toLowerCase().includes(q))

      if (!matchQuery) return false

      if (statutFilter === 'all') return true
      if (statutFilter === 'projet') return String(b.statut).toLowerCase() === 'projet' || b.is_projet_entity
      if (statutFilter === 'actif') return String(b.statut).toLowerCase() !== 'projet' && String(b.statut).toLowerCase() !== 'inactif' && !b.is_projet_entity
      if (statutFilter === 'vacant') return String(b.statut).toLowerCase() === 'vacant'
      if (statutFilter === 'inactif') return String(b.statut).toLowerCase() === 'inactif'

      return true
    })
  }, [combinedItems, searchQuery, statutFilter])

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Barre d'outils, commutateurs et KPIs */}
      <BiensToolbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSimu={() => setSimuModal(true)}
        onOpenProjet={() => setProjetModal(true)}
        onOpenWizard={() => setWizardModal(true)}
        kpis={kpis}
      />

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Espace de travail principal */}
      <div style={{ display: 'flex', flex: 1, gap: 16, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {/* Liste latérale */}
        <BiensSidebarList
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statutFilter={statutFilter}
          setStatutFilter={setStatutFilter}
          filteredBiens={filteredBiens}
          selectedBien={selectedBien}
          onSelectBien={handleSelectBien}
          onNavigate={onNavigate}
        />

        {/* Espace central */}
        <div
          className="card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
            position: 'relative',
            padding: 0,
            height: '100%'
          }}
        >
          {/* Vue 1 : Carte */}
          {currentView === 'carte' && (
            <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
              <BiensMapView
                biens={filteredBiens}
                selectedBienId={selectedBien?.id}
                onSelectBien={handleSelectBien}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                onMapInteract={() => setIsDrawerCollapsed(true)}
              />
            </div>
          )}

          {/* Vue 2 : Grille de cartes */}
          {currentView === 'cartes' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <BienCardGrid
                biens={filteredBiens}
                baux={baux}
                onSelectBien={handleSelectBien}
                onNavigate={onNavigate}
              />
            </div>
          )}

          {/* Vue 3 : Tableau liste */}
          {currentView === 'liste' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <BiensTableView
                biens={filteredBiens}
                onSelectBien={handleSelectBien}
                onNavigate={onNavigate}
                onDeleteBien={(id) => handleDelete(id, selectedBien?.is_projet_entity, selectedBien?.projet_id)}
              />
            </div>
          )}

          {/* Volet flottant rétractable */}
          {selectedBien && !isFullscreen && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                bottom: 14,
                width: 440,
                maxWidth: 'calc(100% - 28px)',
                zIndex: 500,
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                boxShadow: isDrawerCollapsed ? 'none' : '0 20px 45px rgba(15, 23, 42, 0.22)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transform: isDrawerCollapsed ? 'translateX(calc(100% + 30px))' : 'translateX(0)',
                opacity: isDrawerCollapsed ? 0 : 1,
                pointerEvents: isDrawerCollapsed ? 'none' : 'auto',
                transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease, box-shadow 0.45s ease'
              }}
            >
              <BienDetailDrawer
                bien={selectedBien}
                onClose={() => setIsDrawerCollapsed(true)}
                onNavigate={onNavigate}
                onFocusMap={() => {}}
                onEditBien={(b) => setDetailBien(b)}
              />
            </div>
          )}

          {/* Bouton de réouverture du volet */}
          {selectedBien && !isFullscreen && (
            <button
              onClick={() => setIsDrawerCollapsed(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                zIndex: 500,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 24,
                padding: '8px 16px',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12.5,
                color: '#0f172a',
                transform: isDrawerCollapsed ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.9)',
                opacity: isDrawerCollapsed ? 1 : 0,
                pointerEvents: isDrawerCollapsed ? 'auto' : 'none',
                transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease'
              }}
              title="Afficher la fiche du bien sélectionné"
            >
              <Icon name="chevronLeft" size={16} color="#4f46e5" />
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedBien.nom}
              </span>
              <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4f46e5', padding: '2px 7px', borderRadius: 12, fontWeight: 800 }}>
                Aperçu
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modales */}
      {wizardModal && (
        <WizardCreateBien
          onClose={() => setWizardModal(false)}
          onSuccess={() => { setWizardModal(false); load() }}
        />
      )}

      {projetModal && (
        <NewProjetModal
          onClose={() => setProjetModal(false)}
          onSuccess={() => { setProjetModal(false); load() }}
        />
      )}

      {simuModal && (
        <LoanSimulatorModal
          targetBienId={selectedBien?.id}
          onClose={() => setSimuModal(false)}
          onSuccess={() => { setSimuModal(false); load() }}
        />
      )}

      {importModal && (
        <FolderImportModal
          onClose={() => setImportModal(false)}
          onSuccess={() => { setImportModal(false); load() }}
        />
      )}

      {detailBien && (
        <FicheBienDetailModal
          bien={detailBien}
          onClose={() => setDetailBien(null)}
          onSave={() => { setDetailBien(null); load() }}
        />
      )}
    </div>
  )
}
