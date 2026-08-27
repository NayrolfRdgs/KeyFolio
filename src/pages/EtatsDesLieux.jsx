import React, { useEffect, useState, useMemo } from 'react'
import {
  getBiens,
  getLocataires,
  getBaux,
  getEtatsDesLieux,
  getDocuments,
  terminateBail,
  saveEtatDesLieuxRecord,
  deleteEtatDesLieuxRecord,
  openFilePath
} from '../lib/db'
import { formatDate, formatEuro, todayISO } from '../lib/utils'
import Icon from '../components/common/Icon'
import EtatDesLieuxModal from '../components/baux/EtatDesLieuxModal'
import PdfTemplateManagerModal from '../components/documents/PdfTemplateManagerModal'

export default function EtatsDesLieux({ onNavigate, onOpenMail }) {
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [baux, setBaux] = useState([])
  const [edlList, setEdlList] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtres
  const [filterStatut, setFilterStatut] = useState('all') // 'all' | 'actif' | 'termine' | 'vacant'
  const [searchTerm, setSearchTerm] = useState('')

  // Modale État des Lieux
  const [edlModalData, setEdlModalData] = useState(null) // { bail, bien, locataire, initialType, terminationInfo }
  const [tplEditorOpen, setTplEditorOpen] = useState(false)

  // Modale Mettre fin au bail & Déclencher EDL Sortie
  const [terminateModal, setTerminateModal] = useState(null) // { bail, bien, locataire, ... }

  const loadAll = async () => {
    setIsLoading(true)
    try {
      const [bi, lo, ba, ed, docs] = await Promise.all([
        Promise.resolve().then(() => getBiens()).catch(() => []),
        Promise.resolve().then(() => getLocataires()).catch(() => []),
        Promise.resolve().then(() => getBaux()).catch(() => []),
        Promise.resolve().then(() => getEtatsDesLieux()).catch(() => []),
        Promise.resolve().then(() => getDocuments()).catch(() => [])
      ])
      setBiens(bi || [])
      setLocataires(lo || [])
      setBaux(ba || [])

      // Fusionner les EDL enregistrés et les documents PDF trouvés dans SQLite
      const combinedEdls = [...(ed || [])]
      ;(docs || []).forEach(d => {
        const isEdl = d.type_doc === 'etat_des_lieux' ||
          (d.sous_categorie && d.sous_categorie.toLowerCase().includes('etat des lieux')) ||
          (d.chemin_fichier && d.chemin_fichier.toLowerCase().includes('etat_des_lieux')) ||
          (d.notes && d.notes.toLowerCase().includes('état des lieux'))

        if (isEdl) {
          const isEntree = (d.sous_categorie && d.sous_categorie.toLowerCase().includes('entree')) ||
                           (d.chemin_fichier && d.chemin_fichier.toLowerCase().includes('entree')) ||
                           (d.notes && d.notes.toLowerCase().includes('entrée'))

          const alreadyInList = combinedEdls.some(e => e.pdf_path === d.chemin_fichier || (String(e.bien_id) === String(d.bien_id) && e.type_edl === (isEntree ? 'entree' : 'sortie')))
          if (!alreadyInList) {
            const b = (bi || []).find(x => String(x.id) === String(d.bien_id))
            combinedEdls.push({
              id: d.id,
              bien_id: d.bien_id,
              bien_nom: b?.nom || 'Logement',
              locataire_nom: d.notes ? d.notes.split('-').pop().trim() : 'Locataire',
              type_edl: isEntree ? 'entree' : 'sortie',
              date_edl: d.date_document || d.created_at || todayISO(),
              pdf_path: d.chemin_fichier,
              cles_remises: 'Clés conformes'
            })
          }
        }
      })

      setEdlList(combinedEdls)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleDeleteEdl = (id) => {
    if (!confirm('Supprimer cet enregistrement d\'état des lieux ?')) return
    deleteEtatDesLieuxRecord(id)
    loadAll()
  }

  // Ouvrir la rédaction d'un EDL (Entrée ou Sortie)
  const handleOpenEdl = (bail = null, type = 'entree', terminationInfo = null) => {
    const bien = bail ? biens.find(bi => bi.id === bail?.bien_id) : (biens[0] || null)
    const locataire = bail ? locataires.find(l => l.id === bail?.locataire_id) : null

    setEdlModalData({
      bail,
      bien,
      locataire,
      initialType: type,
      terminationInfo
    })
  }

  // Ouvrir la modale pour mettre fin au bail et générer l'EDL
  const handleOpenTerminate = (bail) => {
    const bien = biens.find(bi => bi.id === bail.bien_id)
    const locataire = locataires.find(l => l.id === bail.locataire_id)
    const locName = locataire ? `${locataire.prenom} ${locataire.nom}` : bail.locataire_nom || 'Locataire'

    setTerminateModal({
      bailId: bail.id,
      bienId: bail.bien_id,
      bienNom: bien?.nom || bail.bien_nom,
      locataireNom: locName,
      dateFin: todayISO(),
      motifFin: 'Congé donné par le locataire (départ)',
      notesFin: '',
      restitutionCaution: 'integrale',
      montantRetenu: '',
      motifRetenue: '',
      compteurElec: '',
      compteurEau: '',
      compteurGaz: '',
      clesRemises: '2 jeux complets (porte d\'entrée + boîte aux lettres)',
      generateEdlSortie: true,
      bail,
      bien,
      locataire
    })
  }

  // Confirmer la fin du bail et ouvrir l'EDL de sortie
  const handleConfirmTerminate = async (e) => {
    e.preventDefault()
    if (!terminateModal) return

    const notesSummary = [
      terminateModal.notesFin ? `Observations : ${terminateModal.notesFin}` : '',
      terminateModal.restitutionCaution === 'partielle'
        ? `Retenue de ${terminateModal.montantRetenu}€ (${terminateModal.motifRetenue || 'Réparations'})`
        : 'Caution restituée intégralement',
      terminateModal.compteurElec ? `Elec=${terminateModal.compteurElec}` : '',
      terminateModal.compteurEau ? `Eau=${terminateModal.compteurEau}` : '',
      terminateModal.compteurGaz ? `Gaz=${terminateModal.compteurGaz}` : '',
      terminateModal.clesRemises ? `Clés : ${terminateModal.clesRemises}` : ''
    ].filter(Boolean).join(' | ')

    try {
      await terminateBail(
        terminateModal.bailId,
        terminateModal.dateFin,
        terminateModal.motifFin,
        notesSummary
      )

      const termCopy = { ...terminateModal }
      setTerminateModal(null)
      await loadAll()

      if (termCopy.generateEdlSortie) {
        handleOpenEdl(termCopy.bail, 'sortie', {
          dateFin: termCopy.dateFin,
          motifFin: termCopy.motifFin,
          notesFin: termCopy.notesFin,
          montantRetenu: termCopy.montantRetenu,
          motifRetenue: termCopy.motifRetenue,
          compteurElec: termCopy.compteurElec,
          compteurEau: termCopy.compteurEau,
          compteurGaz: termCopy.compteurGaz,
          clesRemises: termCopy.clesRemises
        })
      }
    } catch (err) {
      alert(`Erreur lors de la clôture du bail : ${err?.toString()}`)
    }
  }

  // Regrouper les biens avec leurs baux (actifs et passés)
  const propertyCards = useMemo(() => {
    return biens.map(bien => {
      const bauxDuBien = baux.filter(b => String(b.bien_id) === String(bien.id))
      const bailActif = bauxDuBien.find(b => b.statut === 'actif')
      const bauxTermines = bauxDuBien.filter(b => b.statut === 'termine').sort((a, b) => new Date(b.date_fin || 0) - new Date(a.date_fin || 0))
      const dernierBailTermine = bauxTermines[0] || null

      const edlsDuBien = edlList.filter(e => String(e.bien_id) === String(bien.id) || String(e.bienId) === String(bien.id))
      const edlEntree = edlsDuBien.find(e => e.type_edl === 'entree')
      const edlSortie = edlsDuBien.find(e => e.type_edl === 'sortie')

      let statusCategory = 'vacant'
      if (bailActif) statusCategory = 'actif'
      else if (dernierBailTermine) statusCategory = 'termine'

      return {
        bien,
        bailActif,
        dernierBailTermine,
        bauxDuBien,
        statusCategory,
        edlEntree,
        edlSortie,
        totalEdls: edlsDuBien.length
      }
    })
  }, [biens, baux, edlList])

  // Filtrage
  const filteredCards = useMemo(() => {
    return propertyCards.filter(card => {
      if (filterStatut !== 'all' && card.statusCategory !== filterStatut) {
        return false
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchBien = card.bien.nom.toLowerCase().includes(query) || (card.bien.adresse || '').toLowerCase().includes(query)
        const matchLocActif = card.bailActif && (
          (card.bailActif.locataire_nom || '').toLowerCase().includes(query) ||
          (card.bailActif.locataire_prenom || '').toLowerCase().includes(query)
        )
        const matchLocPast = card.dernierBailTermine && (
          (card.dernierBailTermine.locataire_nom || '').toLowerCase().includes(query)
        )
        return matchBien || matchLocActif || matchLocPast
      }

      return true
    })
  }, [propertyCards, filterStatut, searchTerm])

  const kpis = useMemo(() => {
    const totalBiens = biens.length
    const biensOccupes = propertyCards.filter(c => c.bailActif).length
    const personnesParties = propertyCards.filter(c => !c.bailActif && c.dernierBailTermine).length
    const totalEdls = edlList.length
    return { totalBiens, biensOccupes, personnesParties, totalEdls }
  }, [biens, propertyCards, edlList])

  return (
    <div className="page-content">
      {/* ── EN-TÊTE HARMONISÉ ── */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>États des Lieux & Entrées / Sorties</h2>
          <p className="page-subtitle">
            Gestion contradictoire des entrées, sorties de locataires, clôtures de bail et relevés conformes Loi ALUR
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => handleOpenEdl(baux[0] || null, 'entree')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Icon name="plus" size={15} /> + Rédiger un état des lieux
          </button>
        </div>
      </div>

      {/* ── BANDEAU KPI DÉTACHÉ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Biens sous gestion</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{kpis.totalBiens}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{kpis.biensOccupes} occupés actuellement</div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#16a34a' }}>🟢 Locataires en place</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{kpis.biensOccupes}</div>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>Baux actifs en cours</div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#d97706' }}>🟠 Personnes parties</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706', marginTop: 4 }}>{kpis.personnesParties}</div>
          <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 2 }}>Sorties & baux clôturés</div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb' }}>EDL Archivés</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{kpis.totalEdls}</div>
          <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>PDF & Historiques conformes</div>
        </div>
      </div>

      {/* ── BARRE DE FILTRES ET RECHERCHE ── */}
      <div className="card" style={{
        padding: '12px 18px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="filter" size={14} color="#64748b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Statut d'occupation :</span>
          </div>

          {[
            { id: 'all', label: `Tous les logements (${biens.length})` },
            { id: 'actif', label: `🟢 Locataire en place (${kpis.biensOccupes})` },
            { id: 'termine', label: `🟠 Personne partie (${kpis.personnesParties})` },
            { id: 'vacant', label: '⚪ Vacant / Sans bail' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatut(f.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: `1px solid ${filterStatut === f.id ? '#4f46e5' : '#cbd5e1'}`,
                background: filterStatut === f.id ? '#4f46e5' : '#ffffff',
                color: filterStatut === f.id ? '#ffffff' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ minWidth: 220 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher bien, locataire..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ fontSize: 12, padding: '6px 12px' }}
          />
        </div>
      </div>

      {/* ── SECTION 1 : LOGEMENTS & GESTION ENTRÉES / SORTIES ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="house" size={18} color="var(--color-accent)" />
          Situation des Logements ({filteredCards.length})
        </h3>

        {filteredCards.length === 0 ? (
          <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="search" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <div>Aucun logement ne correspond aux critères de recherche sélectionnés.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}>
            {filteredCards.map(({ bien, bailActif, dernierBailTermine, edlEntree, edlSortie }) => {
              const locataireActif = bailActif ? locataires.find(l => l.id === bailActif.locataire_id) : null
              const locatairePast = dernierBailTermine ? locataires.find(l => l.id === dernierBailTermine.locataire_id) : null

              return (
                <div
                  key={bien.id}
                  className="card"
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: bailActif ? '4px solid #16a34a' : dernierBailTermine ? '4px solid #d97706' : '4px solid #cbd5e1'
                  }}
                >
                  <div>
                    {/* Header carte */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {bien.nom}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {bien.adresse || 'Adresse non spécifiée'} • {bien.type_bien || 'Maison / Appartement'}
                        </div>
                      </div>

                      {/* Badge de statut */}
                      {bailActif ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 800,
                          background: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #bbf7d0'
                        }}>
                          🟢 LOCATAIRE EN PLACE
                        </span>
                      ) : dernierBailTermine ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 800,
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a'
                        }}>
                          🟠 PERSONNE PARTIE
                        </span>
                      ) : (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 800,
                          background: '#f1f5f9',
                          color: '#475569'
                        }}>
                          ⚪ LOGEMENT VACANT
                        </span>
                      )}
                    </div>

                    {/* Détails du locataire et du bail */}
                    {bailActif ? (
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          👤 {locataireActif ? `${locataireActif.prenom} ${locataireActif.nom}` : bailActif.locataire_nom || 'Locataire'}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Entrée : <strong>{formatDate(bailActif.date_debut)}</strong></span>
                          <span>Loyer : <strong>{formatEuro((bailActif.loyer_mensuel || 0) + (bailActif.charges_mensuelles || 0))}/m</strong></span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                          Caution : {formatEuro(bailActif.depot_garantie || 0)} • Bail {bailActif.type_bail === 'meuble' ? 'Meublé' : 'Nu'}
                        </div>
                      </div>
                    ) : dernierBailTermine ? (
                      <div style={{ background: '#fffbeb', padding: '10px 12px', borderRadius: 8, border: '1px solid #fef3c7', marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                          👤 Ancien locataire : {locatairePast ? `${locatairePast.prenom} ${locatairePast.nom}` : dernierBailTermine.locataire_nom}
                        </div>
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Sortie : <strong>{formatDate(dernierBailTermine.date_fin)}</strong></span>
                          <span>Motif : {dernierBailTermine.motif_fin || 'Départ locataire'}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
                        Aucun bail enregistré sur ce bien. Vous pouvez préparer l'état des lieux d'entrée pour le futur arrivant.
                      </div>
                    )}

                    {/* État des EDL (Entrée / Sortie) avec bouton Ouvrir si disponible */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontSize: 11 }}>
                      <div
                        onClick={() => edlEntree?.pdf_path && openFilePath(edlEntree.pdf_path)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: edlEntree ? '#dcfce7' : '#f1f5f9',
                          color: edlEntree ? '#166534' : '#64748b',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 5,
                          cursor: edlEntree?.pdf_path ? 'pointer' : 'default',
                          border: edlEntree ? '1px solid #bbf7d0' : '1px solid transparent'
                        }}
                        title={edlEntree?.pdf_path ? 'Cliquer pour ouvrir le PDF' : ''}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon name={edlEntree ? 'check' : 'fileText'} size={12} />
                          <span>EDL Entrée : {edlEntree ? formatDate(edlEntree.date_edl) : 'Non rédigé'}</span>
                        </div>
                        {edlEntree?.pdf_path && <Icon name="externalLink" size={11} color="#166534" />}
                      </div>

                      <div
                        onClick={() => edlSortie?.pdf_path && openFilePath(edlSortie.pdf_path)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: edlSortie ? '#eff6ff' : '#f1f5f9',
                          color: edlSortie ? '#1e40af' : '#64748b',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 5,
                          cursor: edlSortie?.pdf_path ? 'pointer' : 'default',
                          border: edlSortie ? '1px solid #bfdbfe' : '1px solid transparent'
                        }}
                        title={edlSortie?.pdf_path ? 'Cliquer pour ouvrir le PDF' : ''}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon name={edlSortie ? 'check' : 'fileText'} size={12} />
                          <span>EDL Sortie : {edlSortie ? formatDate(edlSortie.date_edl) : 'Non rédigé'}</span>
                        </div>
                        {edlSortie?.pdf_path && <Icon name="externalLink" size={11} color="#1e40af" />}
                      </div>
                    </div>
                  </div>

                  {/* ── BOUTONS D'ACTIONS ADAPTÉS À LA SITUATION ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                    {bailActif ? (
                      <>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, fontSize: 11, fontWeight: 700 }}
                            onClick={() => handleOpenEdl(bailActif, 'entree')}
                            title="Rédiger ou réviser l'état des lieux d'entrée"
                          >
                            <Icon name="fileSignature" size={13} color="#16a34a" /> EDL Entrée
                          </button>

                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, fontSize: 11, fontWeight: 700 }}
                            onClick={() => handleOpenEdl(bailActif, 'sortie')}
                            title="Rédiger directement l'état des lieux de sortie"
                          >
                            <Icon name="fileSignature" size={13} color="#2563eb" /> EDL Sortie
                          </button>
                        </div>

                        {/* BOUTON METTRE FIN AU BAIL & EDL SORTIE */}
                        <button
                          className="btn btn-sm"
                          onClick={() => handleOpenTerminate(bailActif)}
                          style={{
                            background: '#dc2626',
                            border: 'none',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 11,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                          }}
                        >
                          <Icon name="logOut" size={13} color="#ffffff" /> Mettre fin au bail & Générer EDL Sortie
                        </button>
                      </>
                    ) : dernierBailTermine ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontSize: 11, fontWeight: 700, background: '#2563eb', borderColor: '#2563eb' }}
                          onClick={() => handleOpenEdl(dernierBailTermine, 'sortie')}
                        >
                          <Icon name="fileSignature" size={13} /> {edlSortie ? 'Voir / Modifier EDL Sortie' : 'Rédiger l\'EDL de Sortie'}
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => handleOpenEdl(dernierBailTermine, 'entree')}
                          title="Consulter l'EDL d'entrée initial"
                        >
                          EDL Entrée initial
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (baux.length > 0) handleOpenEdl(baux[0], 'entree')
                          else alert('Créez d\'abord un bail pour ce bien dans l\'onglet Baux & Contrats.')
                        }}
                        style={{ fontSize: 11, fontWeight: 600 }}
                      >
                        + Préparer un état des lieux
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2 : HISTORIQUE DES ÉTATS DES LIEUX ARCHIVÉS ── */}
      <div>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="fileText" size={18} color="var(--color-accent)" />
          Historique des États des Lieux Réalisés ({edlList.length})
        </h3>

        {edlList.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Aucun état des lieux archivé pour l'instant. Rédigez-en un via les boutons ci-dessus.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Logement</th>
                  <th>Locataire</th>
                  <th>Type EDL</th>
                  <th>Date Réalisation</th>
                  <th>Clés remises</th>
                  <th>Document PDF</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {edlList.map(edl => (
                  <tr key={edl.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{edl.bien_nom || 'Logement'}</td>
                    <td>{edl.locataire_nom || 'Locataire'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 800,
                        background: edl.type_edl === 'entree' ? '#dcfce7' : '#eff6ff',
                        color: edl.type_edl === 'entree' ? '#166534' : '#1e40af'
                      }}>
                        {edl.type_edl === 'entree' ? '🟢 ENTRÉE' : '🔵 SORTIE'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(edl.date_edl)}</td>
                    <td style={{ fontSize: 12 }}>{edl.cles_remises || 'Clés conformes'}</td>
                    <td>
                      {edl.pdf_path ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => openFilePath(edl.pdf_path)}
                        >
                          <Icon name="fileText" size={13} /> Ouvrir PDF
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#64748b' }}>Enregistré</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDeleteEdl(edl.id)}
                        title="Supprimer l'enregistrement"
                      >
                        <Icon name="trash2" size={13} color="#ef4444" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALE ÉTAT DES LIEUX COMPLET ── */}
      {edlModalData && (
        <EtatDesLieuxModal
          bail={edlModalData.bail}
          bien={edlModalData.bien}
          locataire={edlModalData.locataire}
          initialType={edlModalData.initialType}
          terminationInfo={edlModalData.terminationInfo}
          onClose={() => { setEdlModalData(null); loadAll() }}
          onSendMail={onOpenMail}
          onSuccess={loadAll}
        />
      )}

      {/* ── MODALE METTRE FIN AU BAIL & DÉCLENCHER EDL SORTIE ── */}
      {terminateModal && (
        <div className="modal-backdrop" onClick={() => setTerminateModal(null)} style={{ zIndex: 99999 }}>
          <div
            className="modal-card"
            style={{ maxWidth: 580 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="logOut" size={20} color="#dc2626" />
                Mettre fin au bail & Déclencher l'EDL de Sortie
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setTerminateModal(null)}>
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmTerminate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
                Vous êtes sur le point de clôturer le bail de <strong>{terminateModal.locataireNom}</strong> pour le logement <strong>{terminateModal.bienNom}</strong>.
              </div>

              {/* Date & Motif */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Date effective de sortie *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={terminateModal.dateFin}
                    onChange={e => setTerminateModal({ ...terminateModal, dateFin: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Motif de départ *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={terminateModal.motifFin}
                    onChange={e => setTerminateModal({ ...terminateModal, motifFin: e.target.value })}
                  />
                </div>
              </div>

              {/* Relevé des compteurs */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Relevé des index compteurs de sortie
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Elec (kWh)"
                    value={terminateModal.compteurElec}
                    onChange={e => setTerminateModal({ ...terminateModal, compteurElec: e.target.value })}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Eau (m³)"
                    value={terminateModal.compteurEau}
                    onChange={e => setTerminateModal({ ...terminateModal, compteurEau: e.target.value })}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Gaz (m³)"
                    value={terminateModal.compteurGaz}
                    onChange={e => setTerminateModal({ ...terminateModal, compteurGaz: e.target.value })}
                  />
                </div>
              </div>

              {/* Clés */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Clés et accès restitués
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={terminateModal.clesRemises}
                  onChange={e => setTerminateModal({ ...terminateModal, clesRemises: e.target.value })}
                />
              </div>

              {/* Restitution Caution */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Restitution du Dépôt de Garantie
                </label>
                <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="restitution"
                      checked={terminateModal.restitutionCaution === 'integrale'}
                      onChange={() => setTerminateModal({ ...terminateModal, restitutionCaution: 'integrale', montantRetenu: '', motifRetenue: '' })}
                    />
                    Restitution intégrale
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="restitution"
                      checked={terminateModal.restitutionCaution === 'partielle'}
                      onChange={() => setTerminateModal({ ...terminateModal, restitutionCaution: 'partielle' })}
                    />
                    Retenue pour dégradations / travaux
                  </label>
                </div>

                {terminateModal.restitutionCaution === 'partielle' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginTop: 8 }}>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="Montant retenu (€)"
                      required
                      value={terminateModal.montantRetenu}
                      onChange={e => setTerminateModal({ ...terminateModal, montantRetenu: e.target.value })}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Motif de la retenue"
                      required
                      value={terminateModal.motifRetenue}
                      onChange={e => setTerminateModal({ ...terminateModal, motifRetenue: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Checkbox Générer EDL de Sortie */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={terminateModal.generateEdlSortie}
                  onChange={e => setTerminateModal({ ...terminateModal, generateEdlSortie: e.target.checked })}
                  style={{ accentColor: '#2563eb' }}
                />
                Ouvrir et générer immédiatement l'État des Lieux de Sortie officiel (PDF)
              </label>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setTerminateModal(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: 700 }}
                >
                  Confirmer la fin du bail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tplEditorOpen && (
        <PdfTemplateManagerModal
          isOpen={tplEditorOpen}
          initialTemplateId="etat_des_lieux_template"
          onClose={() => setTplEditorOpen(false)}
        />
      )}
    </div>
  )
}
