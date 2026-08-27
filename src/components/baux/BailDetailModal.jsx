import React, { useState, useEffect } from 'react'
import { getPaiements, updatePaiement, updateBail, generateQuestionnaireExcel, openFilePath } from '../../lib/db'
import { formatEuro, formatDate, labelStatutBail, todayISO } from '../../lib/utils'
import Icon from '../common/Icon'

export default function BailDetailModal({
  bail,
  bien,
  locataire,
  onClose,
  onNavigate,
  onOpenMail,
  onOpenDoc,
  onOpenBailGenerator,
  onOpenTerminateModal,
  onOpenEdlModal
}) {
  const [currentBail, setCurrentBail] = useState(bail)
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [excelMsg, setExcelMsg] = useState(null)

  const loadPaiements = () => {
    if (!bail?.id) return
    getPaiements(bail.id).then(p => {
      setPaiements(p || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    setCurrentBail(bail)
    loadPaiements()
  }, [bail?.id])

  if (!currentBail) return null

  const loyerNu = Number(currentBail.loyer_mensuel) || 0
  const charges = Number(currentBail.charges_mensuelles) || 0
  const loyerTotalCC = loyerNu + charges
  const depotGarantie = Number(currentBail.depot_garantie) || 0

  // Statut de la caution
  const statutGarantie = currentBail.statut_garantie || (depotGarantie > 0 ? 'encaissee' : 'en_attente')
  const isDepotDepose = statutGarantie === 'encaissee' || statutGarantie === 'depose'

  // Calculs cumulés réels des paiements
  const paiementsPayes = paiements.filter(p => p.statut === 'paye' || p.statut === 'regle')
  const totalLoyerPayeTTC = paiementsPayes.reduce((s, p) => s + (Number(p.montant) || 0), 0)
  const totalRapporteTTC = totalLoyerPayeTTC + (isDepotDepose ? depotGarantie : 0)
  
  // Ratio loyer nu vs charges
  const ratioNu = loyerTotalCC > 0 ? (loyerNu / loyerTotalCC) : 1
  const totalRapporteHorsCharges = Math.round(totalLoyerPayeTTC * ratioNu)
  const totalChargesRecup = Math.max(0, totalLoyerPayeTTC - totalRapporteHorsCharges)

  // 1. Mise à jour du statut d'une échéance de loyer
  const handleUpdatePaymentStatus = async (paiement, newStatus) => {
    const updated = {
      ...paiement,
      statut: newStatus,
      date_paiement: newStatus === 'paye' ? (paiement.date_paiement || todayISO()) : (newStatus === 'impaye' ? null : paiement.date_paiement)
    }

    try {
      await updatePaiement(updated)
      setPaiements(prev => prev.map(p => p.id === paiement.id ? updated : p))
    } catch (e) {
      console.error(e)
    }
  }

  // 2. Mise à jour du statut du dépôt de garantie
  const handleUpdateDepositStatus = async (newDepositStatus) => {
    const updatedBail = {
      ...currentBail,
      statut_garantie: newDepositStatus
    }

    try {
      await updateBail(updatedBail)
      setCurrentBail(updatedBail)
    } catch (e) {
      console.error(e)
    }
  }

  // 3. Génération du fichier Excel d'historique (incluant dépôt de garantie et échéances)
  const handleExportExcelHistorique = async () => {
    const locName = locataire ? `${locataire.prenom}_${locataire.nom}` : 'Locataire'
    const cleanTitle = `Historique_Bail_${locName}`.replace(/[^a-zA-Z0-9_-]/g, '_')

    const headers = ['Type / Objet', 'Date Échéance', 'Date Règlement', 'Montant TTC (€)', 'Loyer Nu (€)', 'Charges (€)', 'Mode Paiement', 'Statut']
    
    // Ligne 1 : Dépôt de garantie
    const sampleRows = [
      [
        'Dépôt de garantie (Caution)',
        currentBail.date_debut || '—',
        isDepotDepose ? (currentBail.date_debut || 'Déposé') : 'En attente',
        `${depotGarantie.toFixed(2)} €`,
        `${depotGarantie.toFixed(2)} €`,
        '0.00 €',
        'Virement / Chèque',
        isDepotDepose ? 'Encaissé' : statutGarantie === 'restitue' ? 'Restitué' : 'En attente'
      ]
    ]

    // Échéances de loyers
    paiements.forEach(p => {
      const montant = Number(p.montant) || loyerTotalCC
      const pLoyerNu = Math.round(montant * ratioNu)
      const pCharges = montant - pLoyerNu
      sampleRows.push([
        `Loyer Mensuel (${p.date_prevue ? p.date_prevue.substring(0, 7) : 'Échéance'})`,
        p.date_prevue || '—',
        p.date_paiement || (p.statut === 'paye' ? p.date_prevue : 'En attente'),
        `${montant.toFixed(2)} €`,
        `${pLoyerNu.toFixed(2)} €`,
        `${pCharges.toFixed(2)} €`,
        p.mode_paiement || 'Virement',
        p.statut === 'paye' ? 'Payé' : p.statut === 'impaye' ? 'Impayé' : p.statut === 'en_retard' ? 'En retard' : 'Partiel'
      ])
    })

    // Sauvegarde dans le sous-dossier 07_LOCATION/Quittances de loyer du bien si disponible
    if (currentBail.bien_id) {
      try {
        await generateQuestionnaireExcel({
          bienId: currentBail.bien_id,
          filename: `07_LOCATION/Quittances de loyer/${cleanTitle}.xlsx`,
          title: `Historique Complet des Paiements & Caution — ${locataire ? locataire.prenom + ' ' + locataire.nom : 'Bail'}`,
          headers,
          sampleRows,
          hasTotals: true,
          hasCumul: true
        })
        setExcelMsg(`Fichier Excel généré et synchronisé dans 07_LOCATION/Quittances de loyer/${cleanTitle}.xlsx`)
        return
      } catch (err) {
        console.warn("Notice: falling back to direct download:", err)
      }
    }

    // Téléchargement navigateur direct
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...sampleRows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${cleanTitle}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setExcelMsg("Fichier exporté avec succès !")
  }

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div
        className="modal-box"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 920,
          maxHeight: '90vh',
          boxShadow: '0 24px 50px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* ── EN-TÊTE DU BAIL ── */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                Bail de Location — {bien?.nom || currentBail.bien_nom || 'Logement'}
              </h3>
              <span className={`badge ${currentBail.statut === 'actif' ? 'badge-success' : 'badge-neutral'}`}>
                {labelStatutBail(currentBail.statut)}
              </span>
              <span className="badge badge-accent" style={{ fontSize: 10 }}>
                {currentBail.type_bail === 'meuble' ? 'Meublé (1 an)' : 'Nu (3 ans)'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="user" size={13} color="#64748b" />
              <strong>{locataire ? `${locataire.prenom} ${locataire.nom}` : currentBail.locataire_nom || 'Locataire'}</strong>
              <span>• Du {formatDate(currentBail.date_debut)} {currentBail.date_fin ? `au ${formatDate(currentBail.date_fin)}` : '(en cours)'}</span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {excelMsg && (
          <div className="alert alert-success" style={{ margin: '12px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{excelMsg}</span>
            <button onClick={() => setExcelMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {/* ── CONTENU DÉTAILLÉ DU BAIL ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* 1. CARTOUCHES FINANCIERS COLORÉS CLÉS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            
            {/* Loyer Total CC (Indigo/Violet) */}
            <div style={{ background: 'rgba(79, 70, 229, 0.07)', padding: '14px 16px', borderRadius: 10, border: '1.5px solid rgba(79, 70, 229, 0.25)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Loyer Mensuel CC
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#4f46e5', marginTop: 4 }}>
                {formatEuro(loyerTotalCC)}<span style={{ fontSize: 12, fontWeight: 500 }}>/m</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Net HC : {formatEuro(loyerNu)} · Charges : {formatEuro(charges)}
              </div>
            </div>

            {/* Dépôt de Garantie (VERT si déposé avec menu direct) */}
            <div
              style={{
                background: isDepotDepose ? 'rgba(22, 163, 74, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                padding: '14px 16px',
                borderRadius: 10,
                border: `1.5px solid ${isDepotDepose ? 'rgba(22, 163, 74, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isDepotDepose ? '#16a34a' : '#d97706', textTransform: 'uppercase' }}>
                  Dépôt de Garantie
                </span>
                
                {/* Sélecteur direct du statut du dépôt */}
                <select
                  value={statutGarantie}
                  onChange={e => handleUpdateDepositStatus(e.target.value)}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: isDepotDepose ? '#16a34a' : '#f59e0b',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="encaissee">Déposé / Encaissé</option>
                  <option value="en_attente">En attente</option>
                  <option value="restitue">Restitué</option>
                </select>
              </div>

              <div style={{ fontSize: 22, fontWeight: 800, color: isDepotDepose ? '#16a34a' : '#d97706', marginTop: 4 }}>
                {formatEuro(depotGarantie)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {isDepotDepose ? 'Séquestré sur le compte' : 'Paiement de caution attendu'}
              </div>
            </div>

            {/* Total TTC Rapporté Cumulé */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Total Encaissé (TTC)
              </span>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                +{formatEuro(totalRapporteTTC)}
              </div>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                Dont {formatEuro(totalRapporteHorsCharges)} de loyer net
              </div>
            </div>

            {/* Échéance mensuelle */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Paiement le
              </span>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {currentBail.jour_paiement || 5} du mois
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Révision IRL : {currentBail.clause_irl !== false ? 'Active' : 'Non'}
              </div>
            </div>

          </div>

          {/* 2. HISTORIQUE DE TOUS LES PAIEMENTS & DU DÉPÔT AVEC MODIFICATION DE STATUT */}
          <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div
              style={{
                padding: '12px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="history" size={15} color="#4f46e5" />
                Historique de Tous les Paiements & Dépôt ({paiements.length + 1} lignes)
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportExcelHistorique}
                style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: '#16a34a', borderColor: '#16a34a' }}
                title="Générer ou mettre à jour le fichier Excel dans le dossier 07_LOCATION du bien"
              >
                <Icon name="fileSpreadsheet" size={13} color="#16a34a" /> Synchroniser l'Excel du Bail
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chargement de l'historique...</div>
            ) : (
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type / Objet</th>
                      <th>Échéance</th>
                      <th>Date règlement</th>
                      <th style={{ textAlign: 'right' }}>Montant TTC</th>
                      <th>Mode</th>
                      <th style={{ textAlign: 'center' }}>Modifier Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ── LIGNE 1 : DÉPÔT DE GARANTIE / CAUTION ── */}
                    <tr style={{ background: isDepotDepose ? 'rgba(22, 163, 74, 0.04)' : 'rgba(245, 158, 11, 0.04)' }}>
                      <td style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="shieldCheck" size={14} color={isDepotDepose ? '#16a34a' : '#f59e0b'} />
                        Dépôt de garantie (Caution)
                      </td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(currentBail.date_debut)}</td>
                      <td style={{ color: isDepotDepose ? '#16a34a' : '#d97706', fontSize: 12 }}>
                        {isDepotDepose ? (formatDate(currentBail.date_debut) || 'Déposé') : 'En attente'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: isDepotDepose ? '#16a34a' : '#d97706' }}>
                        {formatEuro(depotGarantie)}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 11 }}>Virement / Chèque</td>
                      <td style={{ textAlign: 'center' }}>
                        <select
                          value={statutGarantie}
                          onChange={e => handleUpdateDepositStatus(e.target.value)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 11,
                            fontWeight: 700,
                            background: isDepotDepose ? '#16a34a' : '#f59e0b',
                            color: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="encaissee">Déposé / Encaissé</option>
                          <option value="en_attente">En attente</option>
                          <option value="restitue">Restitué</option>
                        </select>
                      </td>
                    </tr>

                    {/* ── LIGNES DES ÉCHÉANCES DE LOYERS ── */}
                    {paiements.map(p => {
                      const isPaye = p.statut === 'paye' || p.statut === 'regle'
                      const isImpaye = p.statut === 'impaye'
                      const isRetard = p.statut === 'en_retard'

                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: '#334155' }}>
                            Loyer {p.date_prevue ? p.date_prevue.substring(0, 7) : 'Mensuel'}
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{formatDate(p.date_prevue)}</td>
                          <td style={{ color: isPaye ? '#16a34a' : '#ef4444', fontSize: 12 }}>
                            {p.date_paiement ? formatDate(p.date_paiement) : isPaye ? formatDate(p.date_prevue) : 'En attente'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#4f46e5' }}>
                            {formatEuro(p.montant || loyerTotalCC)}
                          </td>
                          <td style={{ color: '#64748b', fontSize: 11 }}>{p.mode_paiement || 'Virement'}</td>
                          
                          {/* Sélecteur direct de statut de paiement */}
                          <td style={{ textAlign: 'center' }}>
                            <select
                              value={p.statut || 'paye'}
                              onChange={e => handleUpdatePaymentStatus(p, e.target.value)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 11,
                                fontWeight: 700,
                                background: isPaye ? '#16a34a' : isImpaye ? '#ef4444' : isRetard ? '#f59e0b' : '#2563eb',
                                color: '#ffffff',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="paye">Payé</option>
                              <option value="impaye">Impayé</option>
                              <option value="en_retard">En retard</option>
                              <option value="partiel">Partiel</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. COORDONNÉES & GARANTS DU LOCATAIRE */}
          {locataire && (
            <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Coordonnées du locataire</h5>
                <div style={{ color: '#475569', marginBottom: 2 }}><strong>Email :</strong> {locataire.email || 'Non renseigné'}</div>
                <div style={{ color: '#475569', marginBottom: 2 }}><strong>Téléphone :</strong> {locataire.telephone || 'Non renseigné'}</div>
                <div style={{ color: '#475569' }}><strong>Profession :</strong> {locataire.profession || '—'}</div>
              </div>

              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Garant & Caution</h5>
                <div style={{ color: '#475569', marginBottom: 2 }}><strong>Garant :</strong> {locataire.garant_nom ? `${locataire.garant_prenom || ''} ${locataire.garant_nom}` : 'Aucun garant'}</div>
                <div style={{ color: '#475569', marginBottom: 2 }}><strong>Contact Garant :</strong> {locataire.garant_telephone || locataire.garant_email || '—'}</div>
                <div style={{ color: isDepotDepose ? '#16a34a' : '#f59e0b', fontWeight: 700 }}>
                  Dépôt de garantie : {formatEuro(depotGarantie)} ({isDepotDepose ? 'Acquitté / Déposé' : 'En attente'})
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER AVEC ACTIONS DU BAIL ── */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {currentBail.fichier_bail && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenDoc && onOpenDoc(currentBail.fichier_bail)}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Icon name="fileText" size={13} /> Voir Contrat PDF
              </button>
            )}

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenBailGenerator && onOpenBailGenerator(currentBail)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Icon name="fileSignature" size={13} /> Éditer Contrat
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Fermer
            </button>

            {onOpenMail && locataire && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose()
                  onOpenMail(currentBail.bien_id)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Icon name="mail" size={13} /> Envoyer quittance / message
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
