import React, { useState, useEffect } from 'react'
import Sidebar             from './components/layout/Sidebar'
import Dashboard           from './pages/Dashboard'
import Biens               from './pages/Biens'
import Prets               from './pages/Prets'
import Rendements          from './pages/Rendements'
import Simulations         from './pages/Simulations'
import Locataires          from './pages/Locataires'
import Baux                from './pages/Baux'
import EtatsDesLieux       from './pages/EtatsDesLieux'
import Paiements           from './pages/Paiements'
import Depenses            from './pages/Depenses'
import Documents           from './pages/Documents'
import Maintenance         from './pages/Maintenance'
import TachesEcheances     from './pages/TachesEcheances'
import AnalysesRapports    from './pages/AnalysesRapports'
import NotificationsPage   from './pages/NotificationsPage'
import BienPanel           from './pages/BienPanel'
import GlobalSearchModal   from './components/common/GlobalSearchModal'
import WizardCreateBien    from './components/biens/WizardCreateBien'
import SettingsModal       from './components/common/SettingsModal'
import UpdateBanner        from './components/common/UpdateBanner'
import PatchingFilesModal  from './components/common/PatchingFilesModal'
import { initThemeListener } from './lib/theme'

export default function App() {
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

  const [page, setPage] = useState('dashboard')
  const [currentBienId, setCurrentBienId] = useState(null)
  const [selectedBienId, setSelectedBienId] = useState(null)
  const [mailBienId, setMailBienId] = useState(null)
  const [mailOptions, setMailOptions] = useState(null)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('general')
  const [documentFilePath, setDocumentFilePath] = useState(null)


  const handleOpenSettings = (targetTab = 'general') => {
    setSettingsTab(typeof targetTab === 'string' ? targetTab : 'general')
    setSettingsOpen(true)
  }

  const navigate = (p, param = null) => {
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
  }

  const openMail = (bienId, options = null) => {
    setCurrentBienId(bienId)
    setSelectedBienId(bienId)
    setMailBienId(bienId)
    setMailOptions(options)
    setPage('bien')
  }

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
      <UpdateBanner />
      <div className="app-layout" style={{ flex: 1, minHeight: 0 }}>
        <Sidebar
          currentPage={page}
          currentBienId={currentBienId}
          onNavigate={navigate}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenMail={openMail}
          onOpenSettings={handleOpenSettings}
        />
        <main className="app-main">{renderPage()}</main>
      </div>

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
        onClose={() => setSettingsOpen(false)}
      />

      {patchingOpen && (
        <PatchingFilesModal onClose={() => setPatchingOpen(false)} />
      )}
    </div>
  )
}
