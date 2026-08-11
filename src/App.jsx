import React, { useState } from 'react'
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

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [currentBienId, setCurrentBienId] = useState(null)
  const [selectedBienId, setSelectedBienId] = useState(null)
  const [mailBienId, setMailBienId] = useState(null)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [excelGenModalOpen, setExcelGenModalOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  const navigate = (p, param = null) => {
    if (p === 'bien' && param) {
      setCurrentBienId(param)
      setSelectedBienId(param) // Synchroniser le bien sélectionné
      setPage('bien')
    } else if (p === 'documents' && param) {
      setSelectedBienId(param)
      setCurrentBienId(param) // Synchroniser dans l'autre sens
      setPage('documents')
    } else {
      setPage(p)
    }
  }

  const openMail = (bienId) => {
    setCurrentBienId(bienId)
    setMailBienId(bienId)
    setPage('bien')
    // On passe l'info d'onglet via un state séparé que BienPanel lira
    setTimeout(() => setMailBienId(null), 100)
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />
      case 'bien':
        return <BienPanel
          bienId={currentBienId}
          initialTab={mailBienId ? 'email' : 'generale'}
          onNavigate={navigate}
        />
      case 'biens':
        return <Biens onNavigate={navigate} onWizardDone={() => {}} />
      case 'locataires':
        return <Locataires />
      case 'baux':
        return <Baux />
      case 'paiements':
        return <Paiements />
      case 'depenses':
        return <Depenses />
      case 'documents':
        return <Documents selectedBienId={selectedBienId} />
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
    </div>
  )
}
