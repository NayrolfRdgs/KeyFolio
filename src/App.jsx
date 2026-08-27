import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import Sidebar from './components/layout/Sidebar'
import ErrorBoundary from './components/common/ErrorBoundary'
import Icon from './components/common/Icon'
import { initThemeListener } from './lib/theme'

// Lazy loading des pages pour un code-splitting optimal (réduction drastique du bundle initial)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Biens = lazy(() => import('./pages/Biens'))
const Prets = lazy(() => import('./pages/Prets'))
const Rendements = lazy(() => import('./pages/Rendements'))
const Simulations = lazy(() => import('./pages/Simulations'))
const Locataires = lazy(() => import('./pages/Locataires'))
const Baux = lazy(() => import('./pages/Baux'))
const EtatsDesLieux = lazy(() => import('./pages/EtatsDesLieux'))
const Paiements = lazy(() => import('./pages/Paiements'))
const Depenses = lazy(() => import('./pages/Depenses'))
const Documents = lazy(() => import('./pages/Documents'))
const Maintenance = lazy(() => import('./pages/Maintenance'))
const TachesEcheances = lazy(() => import('./pages/TachesEcheances'))
const AnalysesRapports = lazy(() => import('./pages/AnalysesRapports'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const BienPanel = lazy(() => import('./pages/BienPanel'))

// Lazy loading des modales lourdes
const GlobalSearchModal = lazy(() => import('./components/common/GlobalSearchModal'))
const WizardCreateBien = lazy(() => import('./components/biens/WizardCreateBien'))
const SettingsModal = lazy(() => import('./components/common/SettingsModal'))
const UpdateBanner = lazy(() => import('./components/common/UpdateBanner'))
const PatchingFilesModal = lazy(() => import('./components/common/PatchingFilesModal'))

function PageFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '60vh',
        color: 'var(--text-muted, #64748b)',
        gap: 12
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(99, 102, 241, 0.15)',
          borderTopColor: 'var(--color-accent, #4f46e5)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Chargement de l'espace...</span>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [currentBienId, setCurrentBienId] = useState(null)
  const [, setSelectedBienId] = useState(null)
  const [, setMailBienId] = useState(null)
  const [mailOptions, setMailOptions] = useState(null)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('general')
  const [documentFilePath, setDocumentFilePath] = useState(null)
  const [patchingOpen, setPatchingOpen] = useState(false)

  useEffect(() => {
    initThemeListener()

    // Raccourci universel Ctrl + K pour la recherche globale
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchModalOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleOpenSettings = useCallback((targetTab = 'general') => {
    setSettingsTab(typeof targetTab === 'string' ? targetTab : 'general')
    setSettingsOpen(true)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false)
  }, [])

  const navigate = useCallback((p, param = null) => {
    setMailOptions(null)
    setDocumentFilePath(null)
    if (p === 'settings') {
      handleOpenSettings('general')
      return
    }
    if (p === 'bien' && param) {
      setCurrentBienId(param)
      setSelectedBienId(param)
      setPage('bien')
    } else if (p === 'documents' && param) {
      if (typeof param === 'object' && param.bienId) {
        setSelectedBienId(param.bienId)
        setDocumentFilePath(param.filePath || null)
      } else if (typeof param === 'number' || typeof param === 'string') {
        setSelectedBienId(param)
      }
      setPage('documents')
    } else {
      setPage(p)
    }
  }, [handleOpenSettings])

  const openMail = useCallback((bienId, options = null) => {
    setCurrentBienId(bienId)
    setSelectedBienId(bienId)
    setMailBienId(bienId)
    setMailOptions(options)
    setPage('bien')
  }, [])

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} onOpenWizard={() => setWizardOpen(true)} />
      case 'biens':
        return <Biens onNavigate={navigate} onOpenWizard={() => setWizardOpen(true)} />
      case 'projets':
      case 'carte':
        return <Biens onNavigate={navigate} initialFilter="projet" onOpenWizard={() => setWizardOpen(true)} />
      case 'prets':
        return <Prets onNavigate={navigate} />
      case 'rendements':
        return <Rendements onNavigate={navigate} />
      case 'simulations':
        return <Simulations onNavigate={navigate} />
      case 'locataires':
        return <Locataires onNavigate={navigate} onOpenMail={openMail} />
      case 'baux':
        return <Baux onNavigate={navigate} onOpenMail={openMail} />
      case 'edl':
        return <EtatsDesLieux onNavigate={navigate} />
      case 'paiements':
        return <Paiements onNavigate={navigate} onOpenMail={openMail} />
      case 'depenses':
        return <Depenses onNavigate={navigate} />
      case 'maintenance':
        return <Maintenance onNavigate={navigate} />
      case 'taches':
      case 'echeances':
        return <TachesEcheances onNavigate={navigate} />
      case 'documents':
        return <Documents onNavigate={navigate} initialFilePath={documentFilePath} />
      case 'analyses':
      case 'rapports':
        return <AnalysesRapports onNavigate={navigate} />
      case 'notifications':
        return <NotificationsPage onNavigate={navigate} />
      case 'bien':
        return <BienPanel bienId={currentBienId} onNavigate={navigate} initialOptions={mailOptions} onOpenSettings={handleOpenSettings} />
      default:
        return <Dashboard onNavigate={navigate} onOpenWizard={() => setWizardOpen(true)} />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <UpdateBanner />
      </Suspense>

      <div className="app-layout" style={{ flex: 1, minHeight: 0 }}>
        <Sidebar
          currentPage={page}
          currentBienId={currentBienId}
          onNavigate={navigate}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenMail={openMail}
          onOpenSettings={handleOpenSettings}
        />
        <main className="app-main">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <Suspense fallback={null}>
        {searchModalOpen && (
          <GlobalSearchModal
            onClose={() => setSearchModalOpen(false)}
            onNavigate={navigate}
          />
        )}

        {wizardOpen && (
          <WizardCreateBien
            onClose={() => setWizardOpen(false)}
            onSuccess={() => { setWizardOpen(false) }}
          />
        )}

        <SettingsModal
          isOpen={settingsOpen}
          initialTab={settingsTab}
          onClose={handleCloseSettings}
        />

        {patchingOpen && (
          <PatchingFilesModal onClose={() => setPatchingOpen(false)} />
        )}
      </Suspense>
    </div>
  )
}
