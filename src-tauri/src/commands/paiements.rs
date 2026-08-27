use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;

/// Résout le bien_id depuis un bail_id (non-optionnel dans Paiement)
fn resolve_bien_id_from_bail(db: &rusqlite::Connection, bail_id: i64) -> Option<i64> {
    db.query_row(
        "SELECT bien_id FROM baux WHERE id = ?1",
        params![bail_id],
        |r| r.get(0),
    ).ok()
}

/// Résout le bien_id depuis un paiement_id
fn resolve_bien_id_from_paiement(db: &rusqlite::Connection, paiement_id: Option<i64>) -> Option<i64> {
    let pid = paiement_id?;
    db.query_row(
        "SELECT b.bien_id FROM paiements p JOIN baux b ON b.id = p.bail_id WHERE p.id = ?1",
        params![pid],
        |r| r.get(0),
    ).ok()
}

#[tauri::command]
pub fn get_paiements(state: State<AppState>, bail_id: Option<i64>) -> Result<Vec<Paiement>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Auto-génération des échéances impayées du mois en cours pour chaque bail actif
    let now = chrono::Local::now();
    let current_ym = now.format("%Y-%m").to_string();

    let active_baux_sql = "SELECT id, bien_id, loyer_mensuel, charges_mensuelles, jour_paiement, date_debut FROM baux WHERE statut = 'actif'";
    if let Ok(mut stmt_baux) = db.prepare(active_baux_sql) {
        let baux_rows = stmt_baux.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, f64>(2)? + row.get::<_, Option<f64>>(3)?.unwrap_or(0.0),
                row.get::<_, Option<i32>>(4)?.unwrap_or(5),
                row.get::<_, String>(5)?,
            ))
        });
        if let Ok(rows) = baux_rows {
            for b in rows.flatten() {
                let (b_id, total_montant, jour, date_debut) = b;
                let start_ym = date_debut.chars().take(7).collect::<String>();
                if current_ym >= start_ym {
                    let day_str = format!("{:02}", jour.clamp(1, 28));
                    let date_prevue = format!("{}-{}", current_ym, day_str);

                    let count: i64 = db.query_row(
                        "SELECT COUNT(*) FROM paiements WHERE bail_id = ?1 AND strftime('%Y-%m', date_prevue) = ?2",
                        params![b_id, current_ym],
                        |r| r.get(0),
                    ).unwrap_or(0);

                    if count == 0 {
                        db.execute(
                            "INSERT INTO paiements (bail_id, date_prevue, montant, methode, statut, notes)
                             VALUES (?1, ?2, ?3, 'virement', 'impaye', 'Loyers & charges mensuels')",
                            params![b_id, date_prevue, total_montant],
                        ).ok();
                    }
                }
            }
        }
    }

    let sql = "SELECT p.id, p.bail_id, p.date_prevue, p.date_reelle, p.montant,
                      p.methode, p.statut, p.fichier_quittance, p.notes, p.created_at,
                      bi.nom as bien_nom, l.nom || ' ' || l.prenom as loc_nom
               FROM paiements p
               LEFT JOIN baux b ON b.id = p.bail_id
               LEFT JOIN biens bi ON bi.id = b.bien_id
               LEFT JOIN locataires l ON l.id = b.locataire_id
               WHERE (?1 IS NULL OR p.bail_id = ?1)
               ORDER BY p.date_prevue DESC";

    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let paiements = stmt.query_map(params![bail_id], |row| {
        Ok(Paiement {
            id: row.get(0)?,
            bail_id: row.get(1)?,
            date_prevue: row.get(2)?,
            date_reelle: row.get(3)?,
            montant: row.get(4)?,
            methode: row.get(5)?,
            statut: row.get(6)?,
            fichier_quittance: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
            bien_nom: row.get(10)?,
            locataire_nom: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(paiements)
}

#[tauri::command]
pub fn create_paiement(app: tauri::AppHandle, state: State<AppState>, paiement: Paiement) -> Result<i64, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO paiements (bail_id, date_prevue, date_reelle, montant, methode, statut, fichier_quittance, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            paiement.bail_id, paiement.date_prevue, paiement.date_reelle,
            paiement.montant, paiement.methode, paiement.statut, paiement.fichier_quittance, paiement.notes
        ],
    ).map_err(|e| e.to_string())?;
    let new_id = db.last_insert_rowid();

    // Auto-sync Excel Suivi_Loyers
    if let Some(bien_id) = resolve_bien_id_from_bail(&db, paiement.bail_id) {
        crate::excel::sync_all_property_excels(&db, &base_dir, bien_id).ok();
    }

    Ok(new_id)
}

#[tauri::command]
pub fn update_paiement(app: tauri::AppHandle, state: State<AppState>, paiement: Paiement) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Résoudre le bien_id avant la mise à jour
    let bien_id = resolve_bien_id_from_bail(&db, paiement.bail_id)
        .or_else(|| resolve_bien_id_from_paiement(&db, paiement.id));

    db.execute(
        "UPDATE paiements SET bail_id=?1, date_prevue=?2, date_reelle=?3, montant=?4,
                              methode=?5, statut=?6, notes=?7, fichier_quittance=?8
         WHERE id=?9",
        params![
            paiement.bail_id, paiement.date_prevue, paiement.date_reelle,
            paiement.montant, paiement.methode, paiement.statut, paiement.notes,
            paiement.fichier_quittance, paiement.id
        ],
    ).map_err(|e| e.to_string())?;

    // Auto-sync Excel Suivi_Loyers
    if let Some(bid) = bien_id {
        crate::excel::sync_all_property_excels(&db, &base_dir, bid).ok();
    }

    Ok(())
}

#[tauri::command]
pub fn delete_paiement(app: tauri::AppHandle, state: State<AppState>, id: i64) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Résoudre le bien_id avant suppression
    let bien_id = resolve_bien_id_from_paiement(&db, Some(id));

    db.execute("DELETE FROM paiements WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;

    // Auto-sync Excel Suivi_Loyers
    if let Some(bid) = bien_id {
        crate::excel::sync_all_property_excels(&db, &base_dir, bid).ok();
    }

    Ok(())
}

#[tauri::command]
pub fn attach_quittance_to_paiement(
    app: tauri::AppHandle,
    state: State<AppState>,
    paiement_id: i64,
    source_path: String,
) -> Result<String, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (bail_id, _cur_quittance): (i64, Option<String>) = db.query_row(
        "SELECT bail_id, fichier_quittance FROM paiements WHERE id = ?1",
        params![paiement_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|e| format!("Paiement non trouvé: {}", e))?;

    let (nom_bien, bien_id, chemin_dossier): (String, i64, Option<String>) = db.query_row(
        "SELECT bi.nom, bi.id, bi.chemin_dossier FROM baux b JOIN biens bi ON bi.id = b.bien_id WHERE b.id = ?1",
        params![bail_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|e| format!("Bien non trouvé pour ce bail: {}", e))?;

    let bien_rel_path = match chemin_dossier {
        Some(p) if !p.trim().is_empty() => p,
        _ => {
            let (rel_path, _) = crate::db::create_property_folder_tree(&base_dir, &nom_bien)
                .map_err(|e| format!("Erreur création dossier: {}", e))?;
            db.execute("UPDATE biens SET chemin_dossier = ?1 WHERE id = ?2", params![rel_path, bien_id])
                .map_err(|e| e.to_string())?;
            rel_path
        }
    };

    let subfolder = "07_LOCATION";
    let target_dir = base_dir.join(&bien_rel_path).join(subfolder);
    std::fs::create_dir_all(&target_dir).map_err(|e| format!("Erreur création sous-dossier: {}", e))?;

    let src = std::path::Path::new(&source_path);
    let filename = src.file_name()
        .ok_or_else(|| "Nom de fichier source invalide".to_string())?
        .to_string_lossy();

    let target_file = target_dir.join(filename.as_ref());
    std::fs::copy(&src, &target_file).map_err(|e| format!("Erreur copie du fichier: {}", e))?;

    let relative_file_path = format!("{}/{}/{}", bien_rel_path, subfolder, filename);
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    db.execute(
        "UPDATE paiements SET fichier_quittance = ?1, statut = 'paye', date_reelle = COALESCE(date_reelle, ?2) WHERE id = ?3",
        params![relative_file_path, today, paiement_id],
    ).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier, date_document, notes)
         VALUES (?1, 'facture', ?2, ?3, date('now'), 'Justificatif / Quittance de paiement')",
        params![bien_id, subfolder, relative_file_path],
    ).ok();

    // Auto-sync Excel Suivi_Loyers
    crate::excel::sync_all_property_excels(&db, &base_dir, bien_id).ok();

    Ok(relative_file_path)
}
