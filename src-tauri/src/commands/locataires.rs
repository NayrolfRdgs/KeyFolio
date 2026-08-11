use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;

#[tauri::command]
pub fn get_locataires(state: State<AppState>) -> Result<Vec<Locataire>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, nom, prenom, telephone, email, garant_nom, garant_contact, notes, created_at
         FROM locataires ORDER BY nom, prenom"
    ).map_err(|e| e.to_string())?;

    let locataires = stmt.query_map([], |row| {
        Ok(Locataire {
            id: row.get(0)?,
            nom: row.get(1)?,
            prenom: row.get(2)?,
            telephone: row.get(3)?,
            email: row.get(4)?,
            garant_nom: row.get(5)?,
            garant_contact: row.get(6)?,
            notes: row.get(7)?,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(locataires)
}

#[tauri::command]
pub fn create_locataire(state: State<AppState>, locataire: Locataire) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO locataires (nom, prenom, telephone, email, garant_nom, garant_contact, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            locataire.nom, locataire.prenom, locataire.telephone, locataire.email,
            locataire.garant_nom, locataire.garant_contact, locataire.notes
        ],
    ).map_err(|e| e.to_string())?;
    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn update_locataire(state: State<AppState>, locataire: Locataire) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE locataires SET nom=?1, prenom=?2, telephone=?3, email=?4,
                                garant_nom=?5, garant_contact=?6, notes=?7
         WHERE id=?8",
        params![
            locataire.nom, locataire.prenom, locataire.telephone, locataire.email,
            locataire.garant_nom, locataire.garant_contact, locataire.notes, locataire.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_locataire(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM locataires WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_baux(state: State<AppState>, bien_id: Option<i64>) -> Result<Vec<Bail>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sql = "SELECT b.id, b.bien_id, b.locataire_id, b.date_debut, b.date_fin,
                      b.loyer_mensuel, b.charges_mensuelles, b.depot_garantie,
                      b.jour_paiement, b.statut, b.fichier_bail, b.created_at,
                      bi.nom as bien_nom, l.nom as loc_nom, l.prenom as loc_prenom
               FROM baux b
               LEFT JOIN biens bi ON bi.id = b.bien_id
               LEFT JOIN locataires l ON l.id = b.locataire_id
               WHERE (?1 IS NULL OR b.bien_id = ?1)
               ORDER BY b.date_debut DESC";

    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let baux = stmt.query_map(params![bien_id], |row| {
        Ok(Bail {
            id: row.get(0)?,
            bien_id: row.get(1)?,
            locataire_id: row.get(2)?,
            date_debut: row.get(3)?,
            date_fin: row.get(4)?,
            loyer_mensuel: row.get(5)?,
            charges_mensuelles: row.get(6)?,
            depot_garantie: row.get(7)?,
            jour_paiement: row.get(8)?,
            statut: row.get(9)?,
            fichier_bail: row.get(10)?,
            created_at: row.get(11)?,
            bien_nom: row.get(12)?,
            locataire_nom: row.get(13)?,
            locataire_prenom: row.get(14)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(baux)
}

#[tauri::command]
pub fn create_bail(state: State<AppState>, bail: Bail) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO baux (bien_id, locataire_id, date_debut, date_fin, loyer_mensuel,
                           charges_mensuelles, depot_garantie, jour_paiement, statut, fichier_bail)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            bail.bien_id, bail.locataire_id, bail.date_debut, bail.date_fin,
            bail.loyer_mensuel, bail.charges_mensuelles, bail.depot_garantie,
            bail.jour_paiement, bail.statut, bail.fichier_bail
        ],
    ).map_err(|e| e.to_string())?;
    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn update_bail(state: State<AppState>, bail: Bail) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE baux SET bien_id=?1, locataire_id=?2, date_debut=?3, date_fin=?4,
                         loyer_mensuel=?5, charges_mensuelles=?6, depot_garantie=?7,
                         jour_paiement=?8, statut=?9, fichier_bail=?10
         WHERE id=?11",
        params![
            bail.bien_id, bail.locataire_id, bail.date_debut, bail.date_fin,
            bail.loyer_mensuel, bail.charges_mensuelles, bail.depot_garantie,
            bail.jour_paiement, bail.statut, bail.fichier_bail, bail.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_bail(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM baux WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
