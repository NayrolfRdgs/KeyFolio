use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;

#[tauri::command]
pub fn get_depenses(state: State<AppState>, bien_id: Option<i64>) -> Result<Vec<Depense>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sql = "SELECT d.id, d.bien_id, d.date, d.categorie, d.description, d.montant,
                      d.fournisseur, d.fichier_justificatif, d.created_at, bi.nom
               FROM depenses d
               LEFT JOIN biens bi ON bi.id = d.bien_id
               WHERE (?1 IS NULL OR d.bien_id = ?1)
               ORDER BY d.date DESC";

    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let depenses = stmt.query_map(params![bien_id], |row| {
        Ok(Depense {
            id: row.get(0)?,
            bien_id: row.get(1)?,
            date: row.get(2)?,
            categorie: row.get(3)?,
            description: row.get(4)?,
            montant: row.get(5)?,
            fournisseur: row.get(6)?,
            fichier_justificatif: row.get(7)?,
            created_at: row.get(8)?,
            bien_nom: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(depenses)
}

#[tauri::command]
pub fn create_depense(app: tauri::AppHandle, state: State<AppState>, depense: Depense) -> Result<i64, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO depenses (bien_id, date, categorie, description, montant, fournisseur, fichier_justificatif)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            depense.bien_id, depense.date, depense.categorie, depense.description,
            depense.montant, depense.fournisseur, depense.fichier_justificatif
        ],
    ).map_err(|e| e.to_string())?;
    let new_id = db.last_insert_rowid();

    // Auto-sync Excel Suivi_Depenses (bien_id est i64, toujours présent)
    crate::excel::sync_all_property_excels(&db, &base_dir, depense.bien_id).ok();

    Ok(new_id)
}

#[tauri::command]
pub fn update_depense(app: tauri::AppHandle, state: State<AppState>, depense: Depense) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE depenses SET bien_id=?1, date=?2, categorie=?3, description=?4,
                             montant=?5, fournisseur=?6, fichier_justificatif=?7
         WHERE id=?8",
        params![
            depense.bien_id, depense.date, depense.categorie, depense.description,
            depense.montant, depense.fournisseur, depense.fichier_justificatif, depense.id
        ],
    ).map_err(|e| e.to_string())?;

    // Auto-sync Excel Suivi_Depenses
    crate::excel::sync_all_property_excels(&db, &base_dir, depense.bien_id).ok();

    Ok(())
}

#[tauri::command]
pub fn delete_depense(app: tauri::AppHandle, state: State<AppState>, id: i64) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Résoudre le bien_id avant suppression
    let bien_id: Option<i64> = db.query_row(
        "SELECT bien_id FROM depenses WHERE id = ?1",
        params![id],
        |r| r.get(0),
    ).ok();

    db.execute("DELETE FROM depenses WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;

    // Auto-sync Excel Suivi_Depenses
    if let Some(bid) = bien_id {
        crate::excel::sync_all_property_excels(&db, &base_dir, bid).ok();
    }

    Ok(())
}
