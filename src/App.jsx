import React, { useState, useEffect } from 'react'
import Sidebar             from './components/layout/Sidebar'
import Dashboard           from './pages/Dashboard'
import Biens               from './pages/Biens'
import Locataires          from './pages/Locataires'
import Baux                from './pages/Baux'
import Paiements           from './pages/Paiements'
import Depenses            from './pages/Depenses'
import Documents           from './pages/Documents'
import Maintenance         from './pages/Maintenance'
import BienPanel           from './pages/BienPanel'
import GlobalSearchModal   from './components/common/GlobalSearchModal'
import ExcelGeneratorModal from './components/documents/ExcelGeneratorModal'
import WizardCreateBien    from './components/biens/WizardCreateBien'
import SettingsModal       from './components/common/SettingsModal'
import UpdateBanner        from './components/common/UpdateBanner'
import { initThemeListener } from './lib/theme'

export default function App() {
  useEffect(() => {
    initThemeListener()
  }, [])

  const [page, setPage] = useState('dashboard')
  const [currentBienId, setCurrentBienId] = useState(null)
  const [selectedBienId, setSelectedBienId] = useState(null)
  const [mailBienId, setMailBienId] = useState(null)
  const [mailOptions, setMailOptions] = useState(null)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [excelGenModalOpen, setExcelGenModalOpen] = useState(false)
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
    if (p === 'bien' && param) {
      setCurrentBienId(param)
      setSelectedBienId(param) // Synchroniser le bien sélectionné
      setPage('bien')
    } else if (p === 'documents' && param) {
      // param peut être un objet { bienId, filePath } ou juste un id numérique
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
      case 'locataires':
        return <Locataires onNavigate={navigate} onOpenMail={openMail} />
      case 'baux':
        return <Baux onNavigate={navigate} onOpenMail={openMail} />
      case 'paiements':
        return <Paiements onNavigate={navigate} onOpenMail={openMail} />
      case 'depenses':
        return <Depenses onNavigate={navigate} />
      case 'documents':
        return <Documents onNavigate={navigate} initialFilePath={documentFilePath} />
      case 'maintenance':
        return <Maintenance onNavigate={navigate} />
      case 'bien':
        return <BienPanel bienId={currentBienId} onNavigate={navigate} initialOptions={mailOptions} onOpenSettings={handleOpenSettings} />
      default:
        return <Dashboard onNavigate={navigate} />
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
          onOpenExcelGenerator={() => setExcelGenModalOpen(true)}
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

      {excelGenModalOpen && (
        <ExcelGeneratorModal
          onClose={() => setExcelGenModalOpen(false)}
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
    </div>
  )
}
