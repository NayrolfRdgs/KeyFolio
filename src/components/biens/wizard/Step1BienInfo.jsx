import React from 'react'
import Icon from '../../common/Icon'

export default function Step1BienInfo({ bien, setBien }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="house" size={15} color="#4f46e5" /> Identification Principale
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nom du bien / Désignation *</label>
            <input
              type="text"
              className="form-control"
              placeholder="ex: Appartement T3 Centre, Résidence Les Oliviers..."
              value={bien.nom}
              onChange={e => setBien({ ...bien, nom: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Type de bien</label>
            <select
              className="form-control"
              value={bien.type_bien}
              onChange={e => setBien({ ...bien, type_bien: e.target.value })}
            >
              <option value="Appartement">Appartement</option>
              <option value="Maison">Maison</option>
              <option value="Studio">Studio</option>
              <option value="Villa">Villa</option>
              <option value="Immeuble de rapport">Immeuble de rapport</option>
              <option value="Local commercial">Local commercial</option>
              <option value="Bureau">Bureau</option>
              <option value="Garage / Parking">Garage / Parking</option>
              <option value="Terrain">Terrain</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Adresse complète (pour géolocalisation automatique sur la carte)</label>
          <input
            type="text"
            className="form-control"
            placeholder="ex: 14 Rue de la République, 69002 Lyon"
            value={bien.adresse}
            onChange={e => setBien({ ...bien, adresse: e.target.value })}
          />
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="tag" size={15} color="#4f46e5" /> Caractéristiques & Valeur
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Surface (m²)</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              placeholder="ex: 68.5"
              value={bien.surface_m2}
              onChange={e => setBien({ ...bien, surface_m2: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Valeur estimée (€)</label>
            <input
              type="number"
              step="1000"
              className="form-control"
              placeholder="ex: 240000"
              value={bien.valeur_estimee}
              onChange={e => setBien({ ...bien, valeur_estimee: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Nombre de pièces</label>
            <input
              type="number"
              className="form-control"
              placeholder="ex: 3"
              value={bien.nb_pieces}
              onChange={e => setBien({ ...bien, nb_pieces: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Chambres</label>
            <input
              type="number"
              className="form-control"
              placeholder="ex: 2"
              value={bien.nb_chambres}
              onChange={e => setBien({ ...bien, nb_chambres: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Date d'acquisition</label>
            <input
              type="date"
              className="form-control"
              value={bien.date_acquisition}
              onChange={e => setBien({ ...bien, date_acquisition: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: 12 }}>Classe Énergie (DPE)</label>
            <select
              className="form-control"
              value={bien.classe_energetique}
              onChange={e => setBien({ ...bien, classe_energetique: e.target.value })}
            >
              <option value="A">A - Très économe</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
              <option value="F">F - Passoire thermique</option>
              <option value="G">G - Passoire thermique</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
