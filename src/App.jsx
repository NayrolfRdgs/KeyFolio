import React, { useState, useEffect } from 'react'
import Sidebar             from './components/Sidebar'
import Dashboard           from './pages/Dashboard'
import Biens               from './pages/Biens'
import Locataires          from './pages/Locataires'
import Baux                from './pages/Baux'
import Paiements           from './pages/Paiements'
import Depenses            from './pages/Depenses'
import Documents           from './pages/Documents'
import Maintenance         from './pages/Maintenance'
import BienPanel           from './pages/BienPanel'
import GlobalSearchModal   from './components/GlobalSearchModal'
import ExcelGeneratorModal from './components/ExcelGeneratorModal'
import WizardCreateBien    from './components/WizardCreateBien'
import SettingsModal       from './components/SettingsModal'
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
  const [documentFilePath, setDocumentFilePath] = useState(null)

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
        setCurrentBienId(param.bienId)
        setDocumentFilePath(param.filePath || null)
      } else {
        setSelectedBienId(param)
        setCurrentBienId(param)
      }
      setPage('documents')
    } else {
      setPage(p)
    }
  }

  // Ouvrir un fichier dans la page Documents (au lieu de l'ouvrir en externe)
  const openInDocuments = (bienId, filePath) => {
    if (!bienId) return
    navigate('documents', { bienId, filePath })
  }

  const openMail = (bienId, options = null) => {
    if (!bienId) return
    setCurrentBienId(bienId)
    setSelectedBienId(bienId)
    setMailOptions(options ? { initialView: 'compose', ...options } : { initialView: 'compose' })
    setPage('bien')
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />
      case 'bien':
        return <BienPanel
          key={`${currentBienId}-${mailOptions ? 'email' : 'gen'}`}
          bienId={currentBienId}
          initialTab={mailOptions ? 'email' : 'generale'}
          mailOptions={mailOptions}
          onNavigate={navigate}
          onOpenMail={openMail}
          onOpenInDocuments={openInDocuments}
        />
      case 'biens':
        return <Biens onNavigate={navigate} onWizardDone={() => {}} />
      case 'locataires':
        return <Locataires onNavigate={navigate} onOpenMail={openMail} />
      case 'baux':
        return <Baux onNavigate={navigate} onOpenMail={openMail} />
      case 'paiements':
        return <Paiements />
      case 'depenses':
        return <Depenses />
      case 'documents':
        return <Documents selectedBienId={selectedBienId} initialFilePath={documentFilePath} />
      case 'maintenance':
        return <Maintenance />
      default:
        return <Dashboard onNavigate={navigate} />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={page}
        currentBienId={currentBienId}
        onNavigate={navigate}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenExcelGenerator={() => setExcelGenModalOpen(true)}
        onOpenMail={openMail}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="app-main">{renderPage()}</main>

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
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

