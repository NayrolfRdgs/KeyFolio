use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;

#[tauri::command]
pub fn get_locataires(state: State<AppState>) -> Result<Vec<Locataire>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT l.id, l.nom, l.prenom, l.telephone, l.email, l.garant_nom, l.garant_contact, l.notes, l.created_at, b.bien_id, bi.nom as bien_nom
         FROM locataires l
         LEFT JOIN baux b ON b.locataire_id = l.id AND b.statut = 'actif'
         LEFT JOIN biens bi ON bi.id = b.bien_id
         ORDER BY l.nom, l.prenom"
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
            bien_id: row.get(9)?,
            bien_nom: row.get(10)?,
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
                      b.statut_garantie, b.fichier_caution,
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
            statut_garantie: row.get(8)?,
            fichier_caution: row.get(9)?,
            jour_paiement: row.get(10)?,
            statut: row.get(11)?,
            fichier_bail: row.get(12)?,
            created_at: row.get(13)?,
            bien_nom: row.get(14)?,
            locataire_nom: row.get(15)?,
            locataire_prenom: row.get(16)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(baux)
}

#[tauri::command]
pub fn create_bail(app: tauri::AppHandle, state: State<AppState>, mut bail: Bail) -> Result<i64, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let is_actif = bail.statut.as_deref().unwrap_or("actif") == "actif";

    if is_actif {
        // 1. Clôturer tout ancien bail actif pour ce logement et archiver son fichier dans Baux_anciens
        let old_baux: Vec<(i64, Option<String>)> = {
            let mut stmt = db.prepare("SELECT id, fichier_bail FROM baux WHERE bien_id = ?1 AND statut = 'actif'").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![bail.bien_id], |r| Ok((r.get(0)?, r.get(1)?))).map_err(|e| e.to_string())?;
            rows.flatten().collect()
        };

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        for (old_id, old_file) in old_baux {
            db.execute(
                "UPDATE baux SET statut = 'termine', date_fin = COALESCE(date_fin, ?1) WHERE id = ?2",
                params![today, old_id],
            ).ok();

            // S'il avait un fichier de bail dans Bail_en_cours, le déplacer vers Baux_anciens
            if let Some(rel_path) = old_file {
                let old_abs = base_dir.join(&rel_path);
                if old_abs.exists() {
                    let filename = old_abs.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let target_sub = "07_LOCATION/Bail/Baux_anciens";
                    let target_dir = old_abs.parent().and_then(|p| p.parent()).map(|p| p.join("Baux_anciens")).unwrap_or_else(|| base_dir.join(target_sub));
                    std::fs::create_dir_all(&target_dir).ok();
                    let new_abs = target_dir.join(&filename);
                    if std::fs::rename(&old_abs, &new_abs).is_err() {
                        std::fs::copy(&old_abs, &new_abs).ok();
                        std::fs::remove_file(&old_abs).ok();
                    }
                    let relative_parent = rel_path.rsplit_once('/').map(|(p, _)| p).unwrap_or("");
                    let new_rel = format!("{}/Baux_anciens/{}", relative_parent.trim_end_matches("/Bail_en_cours"), filename);
                    db.execute("UPDATE baux SET fichier_bail = ?1 WHERE id = ?2", params![new_rel, old_id]).ok();
                }
            }
        }
    }

    // 2. Traitement du fichier du nouveau bail
    if let Some(src_path) = bail.fichier_bail.clone() {
        if !src_path.trim().is_empty() && std::path::Path::new(&src_path).is_absolute() {
            let (nom_bien, chemin_dossier): (String, Option<String>) = db.query_row(
                "SELECT nom, chemin_dossier FROM biens WHERE id = ?1",
                params![bail.bien_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).map_err(|e| format!("Bien introuvable: {}", e))?;

            let bien_rel_path = match chemin_dossier {
                Some(p) if !p.trim().is_empty() => p,
                _ => {
                    let (rel_path, _) = crate::db::create_property_folder_tree(&base_dir, &nom_bien)
                        .map_err(|e| format!("Erreur dossier: {}", e))?;
                    db.execute("UPDATE biens SET chemin_dossier = ?1 WHERE id = ?2", params![rel_path, bail.bien_id]).ok();
                    rel_path
                }
            };

            let subfolder = if is_actif { "07_LOCATION/Bail/Bail_en_cours" } else { "07_LOCATION/Bail/Baux_anciens" };
            let target_subfolder_dir = base_dir.join(&bien_rel_path).join(subfolder);
            std::fs::create_dir_all(&target_subfolder_dir).ok();

            let src = std::path::Path::new(&src_path);
            if let Some(fname) = src.file_name() {
                let target_file_path = target_subfolder_dir.join(fname);
                if std::fs::copy(&src, &target_file_path).is_ok() {
                    let rel_file = format!("{}/{}/{}", bien_rel_path, subfolder, fname.to_string_lossy());
                    bail.fichier_bail = Some(rel_file.clone());

                    db.execute(
                        "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier, date_document, notes)
                         VALUES (?1, 'bail', ?2, ?3, date('now'), 'Contrat de bail')",
                        params![bail.bien_id, subfolder, rel_file],
                    ).ok();
                }
            }
        }
    }

    let statut_garantie = bail.statut_garantie.unwrap_or_else(|| "en_attente".to_string());

    db.execute(
        "INSERT INTO baux (bien_id, locataire_id, date_debut, date_fin, loyer_mensuel,
                           charges_mensuelles, depot_garantie, statut_garantie, fichier_caution,
                           jour_paiement, statut, fichier_bail)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            bail.bien_id, bail.locataire_id, bail.date_debut, bail.date_fin,
            bail.loyer_mensuel, bail.charges_mensuelles, bail.depot_garantie,
            statut_garantie, bail.fichier_caution,
            bail.jour_paiement, bail.statut, bail.fichier_bail
        ],
    ).map_err(|e| e.to_string())?;

    let bail_id = db.last_insert_rowid();

    // Régénérer la synthèse Excel du bien
    crate::excel::sync_all_property_excels(&db, &base_dir, bail.bien_id).ok();

    Ok(bail_id)
}

#[tauri::command]
pub fn terminate_bail(app: tauri::AppHandle, state: State<AppState>, bail_id: i64, date_fin: Option<String>) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (fichier_bail, bien_id): (Option<String>, i64) = db.query_row(
        "SELECT fichier_bail, bien_id FROM baux WHERE id = ?1",
        params![bail_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|e| format!("Bail introuvable: {}", e))?;

    let end_date = date_fin.unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());

    db.execute(
        "UPDATE baux SET statut = 'termine', date_fin = ?1 WHERE id = ?2",
        params![end_date, bail_id],
    ).map_err(|e| e.to_string())?;

    if let Some(rel_path) = fichier_bail {
        let old_abs = base_dir.join(&rel_path);
        if old_abs.exists() {
            let filename = old_abs.file_name().unwrap_or_default().to_string_lossy().to_string();
            let parent_dir = old_abs.parent().and_then(|p| p.parent());
            if let Some(p) = parent_dir {
                let target_dir = p.join("Baux_anciens");
                std::fs::create_dir_all(&target_dir).ok();
                let new_abs = target_dir.join(&filename);
                if std::fs::rename(&old_abs, &new_abs).is_err() {
                    std::fs::copy(&old_abs, &new_abs).ok();
                    std::fs::remove_file(&old_abs).ok();
                }
                let relative_parent = rel_path.rsplit_once('/').map(|(p, _)| p).unwrap_or("");
                let new_rel = format!("{}/Baux_anciens/{}", relative_parent.trim_end_matches("/Bail_en_cours"), filename);
                db.execute("UPDATE baux SET fichier_bail = ?1 WHERE id = ?2", params![new_rel, bail_id]).ok();
            }
        }
    }

    crate::excel::sync_all_property_excels(&db, &base_dir, bien_id).ok();

    Ok(())
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

// ─── Commandes CANDIDATURES ───────────────────────────────────────────────

#[tauri::command]
pub fn get_candidatures(state: State<AppState>, bien_id: Option<i64>) -> Result<Vec<Candidature>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sql = "SELECT c.id, c.bien_id, c.nom, c.prenom, c.email, c.telephone,
                      c.revenus_mensuels, c.statut, c.garant_nom, c.garant_contact,
                      c.notes, c.fichier_dossier, c.created_at, bi.nom as bien_nom
               FROM candidatures c
               LEFT JOIN biens bi ON bi.id = c.bien_id
               WHERE (?1 IS NULL OR c.bien_id = ?1)
               ORDER BY c.created_at DESC";

    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let candidatures = stmt.query_map(params![bien_id], |row| {
        Ok(Candidature {
            id: row.get(0)?,
            bien_id: row.get(1)?,
            nom: row.get(2)?,
            prenom: row.get(3)?,
            email: row.get(4)?,
            telephone: row.get(5)?,
            revenus_mensuels: row.get(6)?,
            statut: row.get(7)?,
            garant_nom: row.get(8)?,
            garant_contact: row.get(9)?,
            notes: row.get(10)?,
            fichier_dossier: row.get(11)?,
            created_at: row.get(12)?,
            bien_nom: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(candidatures)
}

#[tauri::command]
pub fn create_candidature(app: tauri::AppHandle, state: State<AppState>, mut candidature: Candidature, source_path: Option<String>) -> Result<i64, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if let (Some(b_id), Some(src)) = (candidature.bien_id, source_path) {
        if !src.trim().is_empty() && std::path::Path::new(&src).is_absolute() {
            let (nom_bien, chemin_dossier): (String, Option<String>) = db.query_row(
                "SELECT nom, chemin_dossier FROM biens WHERE id = ?1",
                params![b_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).map_err(|e| format!("Bien introuvable: {}", e))?;

            let bien_rel_path = match chemin_dossier {
                Some(p) if !p.trim().is_empty() => p,
                _ => {
                    let (rel_path, _) = crate::db::create_property_folder_tree(&base_dir, &nom_bien)
                        .map_err(|e| format!("Erreur dossier: {}", e))?;
                    db.execute("UPDATE biens SET chemin_dossier = ?1 WHERE id = ?2", params![rel_path, b_id]).ok();
                    rel_path
                }
            };

            let subfolder = "07_LOCATION/Locataires/Dossier candidature";
            let target_dir = base_dir.join(&bien_rel_path).join(subfolder);
            std::fs::create_dir_all(&target_dir).ok();

            let src_path = std::path::Path::new(&src);
            if let Some(fname) = src_path.file_name() {
                let target_file = target_dir.join(fname);
                if std::fs::copy(&src_path, &target_file).is_ok() {
                    let rel_file = format!("{}/{}/{}", bien_rel_path, subfolder, fname.to_string_lossy());
                    candidature.fichier_dossier = Some(rel_file.clone());

                    db.execute(
                        "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier, date_document, notes)
                         VALUES (?1, 'autre', ?2, ?3, date('now'), ?4)",
                        params![b_id, subfolder, rel_file, format!("Dossier candidature - {} {}", candidature.prenom, candidature.nom)],
                    ).ok();
                }
            }
        }
    }

    db.execute(
        "INSERT INTO candidatures (bien_id, nom, prenom, email, telephone, revenus_mensuels, statut, garant_nom, garant_contact, notes, fichier_dossier)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            candidature.bien_id, candidature.nom, candidature.prenom, candidature.email,
            candidature.telephone, candidature.revenus_mensuels,
            candidature.statut.unwrap_or_else(|| "nouveau".to_string()),
            candidature.garant_nom, candidature.garant_contact, candidature.notes, candidature.fichier_dossier
        ],
    ).map_err(|e| e.to_string())?;

    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn update_candidature(app: tauri::AppHandle, state: State<AppState>, mut candidature: Candidature, source_path: Option<String>) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if let (Some(b_id), Some(src)) = (candidature.bien_id, source_path) {
        if !src.trim().is_empty() && std::path::Path::new(&src).is_absolute() {
            let (nom_bien, chemin_dossier): (String, Option<String>) = db.query_row(
                "SELECT nom, chemin_dossier FROM biens WHERE id = ?1",
                params![b_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).map_err(|e| format!("Bien introuvable: {}", e))?;

            let bien_rel_path = match chemin_dossier {
                Some(p) if !p.trim().is_empty() => p,
                _ => {
                    let (rel_path, _) = crate::db::create_property_folder_tree(&base_dir, &nom_bien)
                        .map_err(|e| format!("Erreur dossier: {}", e))?;
                    db.execute("UPDATE biens SET chemin_dossier = ?1 WHERE id = ?2", params![rel_path, b_id]).ok();
                    rel_path
                }
            };

            let subfolder = "07_LOCATION/Locataires/Dossier candidature";
            let target_dir = base_dir.join(&bien_rel_path).join(subfolder);
            std::fs::create_dir_all(&target_dir).ok();

            let src_path = std::path::Path::new(&src);
            if let Some(fname) = src_path.file_name() {
                let target_file = target_dir.join(fname);
                if std::fs::copy(&src_path, &target_file).is_ok() {
                    let rel_file = format!("{}/{}/{}", bien_rel_path, subfolder, fname.to_string_lossy());
                    candidature.fichier_dossier = Some(rel_file.clone());

                    db.execute(
                        "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier, date_document, notes)
                         VALUES (?1, 'autre', ?2, ?3, date('now'), ?4)",
                        params![b_id, subfolder, rel_file, format!("Dossier candidature - {} {}", candidature.prenom, candidature.nom)],
                    ).ok();
                }
            }
        }
    }

    db.execute(
        "UPDATE candidatures SET bien_id=?1, nom=?2, prenom=?3, email=?4, telephone=?5,
                                 revenus_mensuels=?6, statut=?7, garant_nom=?8, garant_contact=?9,
                                 notes=?10, fichier_dossier=?11
         WHERE id=?12",
        params![
            candidature.bien_id, candidature.nom, candidature.prenom, candidature.email,
            candidature.telephone, candidature.revenus_mensuels,
            candidature.statut.unwrap_or_else(|| "nouveau".to_string()),
            candidature.garant_nom, candidature.garant_contact, candidature.notes,
            candidature.fichier_dossier, candidature.id
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_candidature_statut(state: State<AppState>, id: i64, statut: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE candidatures SET statut = ?1 WHERE id = ?2", params![statut, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_candidature(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM candidatures WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_locataire_stats(state: State<AppState>, locataire_id: i64) -> Result<LocataireStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let sql_paiements = "SELECT
                            COALESCE(SUM(CASE WHEN p.statut = 'paye' THEN p.montant ELSE 0 END), 0.0),
                            COALESCE(SUM(p.montant), 0.0),
                            COALESCE(SUM(CASE WHEN p.statut = 'impaye' OR p.statut = 'en_retard' THEN 1 ELSE 0 END), 0),
                            COUNT(p.id)
                         FROM paiements p
                         JOIN baux b ON b.id = p.bail_id
                         WHERE b.locataire_id = ?1";

    let (total_encaisse, total_du, impayes_count, total_paiements_count): (f64, f64, i64, i64) = db.query_row(
        sql_paiements,
        params![locataire_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    ).unwrap_or((0.0, 0.0, 0, 0));

    let taux_regularite = if total_paiements_count > 0 {
        ((total_paiements_count - impayes_count) as f64 / total_paiements_count as f64) * 100.0
    } else {
        100.0
    };

    let sql_caution = "SELECT
                         COALESCE(SUM(b.depot_garantie), 0.0),
                         GROUP_CONCAT(COALESCE(b.statut_garantie, 'en_attente'), ', ')
                       FROM baux b
                       WHERE b.locataire_id = ?1";

    let (total_depot_garantie, statut_caution_concat): (f64, Option<String>) = db.query_row(
        sql_caution,
        params![locataire_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap_or((0.0, None));

    let statut_caution_resume = statut_caution_concat.unwrap_or_else(|| "Aucune caution".to_string());

    Ok(LocataireStats {
        locataire_id,
        total_encaisse,
        total_du,
        impayes_count,
        taux_regularite: (taux_regularite * 10.0).round() / 10.0,
        total_depot_garantie,
        statut_caution_resume,
    })
}

