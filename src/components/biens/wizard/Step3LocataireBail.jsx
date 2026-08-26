import React from 'react'
import Icon from '../../common/Icon'

export default function Step3LocataireBail({
  locataire,
  setLocataire,
  bail,
  setBail
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Infos Locataire */}
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="user" size={15} color="#4f46e5" /> Locataire en place
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Prénom du locataire</label>
            <input
              className="form-control"
              value={locataire.prenom}
              onChange={e => setLocataire({ ...locataire, prenom: e.target.value })}
              placeholder="Prénom"
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nom de famille</label>
            <input
              className="form-control"
              value={locataire.nom}
              onChange={e => setLocataire({ ...locataire, nom: e.target.value })}
              placeholder="Nom"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Téléphone</label>
            <input
              className="form-control"
              type="tel"
              value={locataire.telephone}
              onChange={e => setLocataire({ ...locataire, telephone: e.target.value })}
              placeholder="06 xx xx xx xx"
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Email</label>
            <input
              className="form-control"
              type="email"
              value={locataire.email}
              onChange={e => setLocataire({ ...locataire, email: e.target.value })}
              placeholder="email@locataire.fr"
            />
          </div>
        </div>
      </div>

      {/* Conditions du Bail */}
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="fileSignature" size={15} color="#4f46e5" /> Conditions Financières du Bail
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Loyer net Hors Charges (€)</label>
            <input
              type="number"
              className="form-control"
              value={bail.loyer_mensuel}
              onChange={e => setBail({ ...bail, loyer_mensuel: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Charges (€)</label>
            <input
              type="number"
              className="form-control"
              value={bail.charges_mensuelles}
              onChange={e => setBail({ ...bail, charges_mensuelles: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12, color: '#16a34a' }}>Dépôt de garantie (€)</label>
            <input
              type="number"
              className="form-control"
              value={bail.depot_garantie}
              onChange={e => setBail({ ...bail, depot_garantie: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Date de début du bail</label>
            <input
              type="date"
              className="form-control"
              value={bail.date_debut}
              onChange={e => setBail({ ...bail, date_debut: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Type de bail</label>
            <select
              className="form-control"
              value={bail.type_bail}
              onChange={e => setBail({ ...bail, type_bail: e.target.value })}
            >
              <option value="meuble">Meublé (1 an renouvelable)</option>
              <option value="nu">Nu classique (3 ans)</option>
              <option value="colocation">Colocation</option>
              <option value="commercial">Commercial / Professionnel</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
