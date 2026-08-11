use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;

#[tauri::command]
pub fn get_maintenance(state: State<AppState>, bien_id: Option<i64>) -> Result<Vec<Maintenance>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sql = "SELECT m.id, m.bien_id, m.titre, m.description, m.priorite, m.statut,
                      m.date_signalement, m.date_resolution, m.cout, m.prestataire, bi.nom
               FROM maintenance m
               LEFT JOIN biens bi ON bi.id = m.bien_id
               WHERE (?1 IS NULL OR m.bien_id = ?1)
               ORDER BY m.priorite ASC, m.date_signalement DESC";

    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let items = stmt.query_map(params![bien_id], |row| {
        Ok(Maintenance {
            id: row.get(0)?,
            bien_id: row.get(1)?,
            titre: row.get(2)?,
            description: row.get(3)?,
            priorite: row.get(4)?,
            statut: row.get(5)?,
            date_signalement: row.get(6)?,
            date_resolution: row.get(7)?,
            cout: row.get(8)?,
            prestataire: row.get(9)?,
            bien_nom: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_maintenance(state: State<AppState>, item: Maintenance) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO maintenance (bien_id, titre, description, priorite, statut, prestataire, cout)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            item.bien_id, item.titre, item.description, item.priorite,
            item.statut, item.prestataire, item.cout
        ],
    ).map_err(|e| e.to_string())?;
    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn update_maintenance(state: State<AppState>, item: Maintenance) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE maintenance SET bien_id=?1, titre=?2, description=?3, priorite=?4,
                                statut=?5, date_resolution=?6, cout=?7, prestataire=?8
         WHERE id=?9",
        params![
            item.bien_id, item.titre, item.description, item.priorite,
            item.statut, item.date_resolution, item.cout, item.prestataire, item.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_maintenance(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM maintenance WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
