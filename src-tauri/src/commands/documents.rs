use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;

#[tauri::command]
pub fn get_documents(state: State<AppState>, bien_id: Option<i64>) -> Result<Vec<Document>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sql = "SELECT d.id, d.bien_id, d.type_doc, d.sous_categorie, d.chemin_fichier,
                      d.date_ajout, d.date_document, d.notes, bi.nom
               FROM documents d
               LEFT JOIN biens bi ON bi.id = d.bien_id
               WHERE (?1 IS NULL OR d.bien_id = ?1)
               ORDER BY d.date_ajout DESC";

    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let docs = stmt.query_map(params![bien_id], |row| {
        Ok(Document {
            id: row.get(0)?,
            bien_id: row.get(1)?,
            type_doc: row.get(2)?,
            sous_categorie: row.get(3)?,
            chemin_fichier: row.get(4)?,
            date_ajout: row.get(5)?,
            date_document: row.get(6)?,
            notes: row.get(7)?,
            bien_nom: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(docs)
}

#[tauri::command]
pub fn create_document(state: State<AppState>, document: Document) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier, date_document, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            document.bien_id, document.type_doc, document.sous_categorie,
            document.chemin_fichier, document.date_document, document.notes
        ],
    ).map_err(|e| e.to_string())?;
    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn delete_document(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM documents WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
