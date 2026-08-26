use rusqlite::params;
use tauri::State;
use calamine::{Reader, Xlsx};
use rust_xlsxwriter::Workbook as XlsxWorkbook;
use base64::Engine;
use crate::AppState;
use crate::models::*;

#[tauri::command]
pub fn get_biens(state: State<AppState>) -> Result<Vec<Bien>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, nom, adresse, type_bien, statut, chemin_dossier, email_dedie,
                date_acquisition, surface_m2, notes, created_at,
                phase_actuelle, pourcentage_avancement, date_livraison_prevue, budget_prevision,
                valeur_estimee, latitude, longitude, nb_pieces, nb_chambres, nb_salles_bain,
                surface_terrain, annee_construction, classe_energetique, description
         FROM biens ORDER BY nom"
    ).map_err(|e| e.to_string())?;

    let biens = stmt.query_map([], |row| {
        Ok(Bien {
            id: row.get(0)?,
            nom: row.get(1)?,
            adresse: row.get(2)?,
            type_bien: row.get(3)?,
            statut: row.get(4)?,
            chemin_dossier: row.get(5)?,
            email_dedie: row.get(6)?,
            date_acquisition: row.get(7)?,
            surface_m2: row.get(8)?,
            notes: row.get(9)?,
            created_at: row.get(10)?,
            phase_actuelle: row.get(11)?,
            pourcentage_avancement: row.get(12)?,
            date_livraison_prevue: row.get(13)?,
            budget_prevision: row.get(14)?,
            valeur_estimee: row.get(15)?,
            latitude: row.get(16)?,
            longitude: row.get(17)?,
            nb_pieces: row.get(18)?,
            nb_chambres: row.get(19)?,
            nb_salles_bain: row.get(20)?,
            surface_terrain: row.get(21)?,
            annee_construction: row.get(22)?,
            classe_energetique: row.get(23)?,
            description: row.get(24)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(biens)
}

#[tauri::command]
pub fn create_bien(app: tauri::AppHandle, state: State<AppState>, mut bien: Bien) -> Result<BienCreationResult, String> {
    let base_dir = crate::db::get_base_dir(&app);

    let chemin_dossier = match &bien.chemin_dossier {
        Some(path) if !path.trim().is_empty() => path.clone(),
        _ => {
            let (rel_path, _) = crate::db::create_property_folder_tree(&base_dir, &bien.nom)
                .map_err(|e| format!("Erreur création dossiers: {}", e))?;
            rel_path
        }
    };

    bien.chemin_dossier = Some(chemin_dossier.clone());

    let safe_type_bien = bien.type_bien.as_deref().unwrap_or("Appartement");
    let safe_statut = bien.statut.as_deref().unwrap_or("vacant");

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO biens (
            nom, adresse, type_bien, statut, chemin_dossier, email_dedie,
            date_acquisition, surface_m2, notes,
            phase_actuelle, pourcentage_avancement, date_livraison_prevue, budget_prevision,
            valeur_estimee, latitude, longitude, nb_pieces, nb_chambres, nb_salles_bain,
            surface_terrain, annee_construction, classe_energetique, description
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
        params![
            bien.nom, bien.adresse, safe_type_bien, safe_statut,
            bien.chemin_dossier, bien.email_dedie, bien.date_acquisition,
            bien.surface_m2, bien.notes,
            bien.phase_actuelle, bien.pourcentage_avancement.unwrap_or(0), bien.date_livraison_prevue, bien.budget_prevision,
            bien.valeur_estimee, bien.latitude, bien.longitude, bien.nb_pieces, bien.nb_chambres, bien.nb_salles_bain,
            bien.surface_terrain, bien.annee_construction, bien.classe_energetique, bien.description
        ],
    ).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();

    // Génération automatique des fichiers Excel de synthèse dans les bons sous-dossiers avec date du jour
    crate::excel::sync_all_property_excels(&db, &base_dir, id).ok();

    Ok(BienCreationResult {
        id,
        chemin_dossier,
    })
}

#[tauri::command]
pub fn update_bien(app: tauri::AppHandle, state: State<AppState>, bien: Bien) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let safe_type_bien = bien.type_bien.as_deref().unwrap_or("Appartement");
    let safe_statut = bien.statut.as_deref().unwrap_or("vacant");

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE biens SET
            nom=?1, adresse=?2, type_bien=?3, statut=?4,
            chemin_dossier=?5, email_dedie=?6, date_acquisition=?7,
            surface_m2=?8, notes=?9,
            phase_actuelle=?10, pourcentage_avancement=?11, date_livraison_prevue=?12, budget_prevision=?13,
            valeur_estimee=?14, latitude=?15, longitude=?16, nb_pieces=?17, nb_chambres=?18, nb_salles_bain=?19,
            surface_terrain=?20, annee_construction=?21, classe_energetique=?22, description=?23
         WHERE id=?24",
        params![
            bien.nom, bien.adresse, safe_type_bien, safe_statut,
            bien.chemin_dossier, bien.email_dedie, bien.date_acquisition,
            bien.surface_m2, bien.notes,
            bien.phase_actuelle, bien.pourcentage_avancement, bien.date_livraison_prevue, bien.budget_prevision,
            bien.valeur_estimee, bien.latitude, bien.longitude, bien.nb_pieces, bien.nb_chambres, bien.nb_salles_bain,
            bien.surface_terrain, bien.annee_construction, bien.classe_energetique, bien.description,
            bien.id
        ],
    ).map_err(|e| e.to_string())?;

    if let Some(bid) = bien.id {
        crate::excel::sync_all_property_excels(&db, &base_dir, bid).ok();
    }

    Ok(())
}

#[tauri::command]
pub fn delete_bien(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM biens WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn copy_file_to_bien(
    app: tauri::AppHandle,
    state: State<AppState>,
    bien_id: i64,
    subfolder: String,
    source_path: String,
    type_doc: Option<String>,
    date_document: Option<String>,
    notes: Option<String>,
) -> Result<String, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let clean_subfolder = if subfolder.trim().is_empty() || subfolder.trim() == "/" {
        "01_ADMINISTRATIF".to_string()
    } else {
        subfolder.trim_start_matches('/').to_string()
    };

    let (nom_bien, chemin_dossier): (String, Option<String>) = db.query_row(
        "SELECT nom, chemin_dossier FROM biens WHERE id = ?1",
        params![bien_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| format!("Bien non trouvé: {}", e))?;

    let bien_rel_path = match chemin_dossier {
        Some(path) if !path.trim().is_empty() => path,
        _ => {
            let (rel_path, _) = crate::db::create_property_folder_tree(&base_dir, &nom_bien)
                .map_err(|e| format!("Erreur création dossier: {}", e))?;
            db.execute("UPDATE biens SET chemin_dossier = ?1 WHERE id = ?2", params![rel_path, bien_id])
                .map_err(|e| e.to_string())?;
            rel_path
        }
    };

    let target_subfolder_dir = base_dir.join(&bien_rel_path).join(&clean_subfolder);
    std::fs::create_dir_all(&target_subfolder_dir).map_err(|e| format!("Erreur création sous-dossier: {}", e))?;

    let src = std::path::Path::new(&source_path);
    let filename = src.file_name()
        .ok_or_else(|| "Nom de fichier source invalide".to_string())?
        .to_string_lossy();

    let target_file_path = target_subfolder_dir.join(filename.as_ref());
    std::fs::copy(&src, &target_file_path).map_err(|e| format!("Impossible de copier le fichier: {}", e))?;

    let relative_file_path = format!("{}/{}/{}", bien_rel_path, clean_subfolder, filename);

    let default_type = match clean_subfolder.as_str() {
        "02_DIAGNOSTICS_DDT" => "diagnostic",
        "04_FISCAL_FINANCIER" | "05_TRAVAUX" => "facture",
        "07_LOCATION" => "bail",
        "06_ENERGIE_CONTRATS" => "assurance",
        "09_VENTE" => "vente",
        _ => "autre",
    };
    let final_type = type_doc.unwrap_or_else(|| default_type.to_string());

    db.execute(
        "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier, date_document, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![bien_id, final_type, clean_subfolder, relative_file_path, date_document, notes],
    ).map_err(|e| e.to_string())?;

    Ok(relative_file_path)
}

#[tauri::command]
pub fn open_file_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let target = if std::path::Path::new(&path).is_absolute() {
        std::path::PathBuf::from(&path)
    } else {
        base_dir.join(&path)
    };

    if !target.exists() {
        return Err(format!("Fichier non trouvé sur le disque: {}", target.display()));
    }

    if let Some(ext) = target.extension() {
        if ext.to_string_lossy().eq_ignore_ascii_case("url") {
            if let Ok(content) = std::fs::read_to_string(&target) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.to_lowercase().starts_with("url=") {
                        let url = trimmed[4..].trim().to_string();
                        return crate::commands::mail::open_external_url(url);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", target.to_str().unwrap_or_default()])
            .spawn()
            .map_err(|e| format!("Erreur d'ouverture du fichier: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let target_str = target.to_string_lossy();
        std::process::Command::new("open")
            .arg(target_str.as_ref())
            .spawn()
            .map_err(|e| format!("Erreur d'ouverture: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_bien_folder(app: tauri::AppHandle, state: State<AppState>, bien_id: i64) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let chemin_dossier: String = db.query_row(
        "SELECT chemin_dossier FROM biens WHERE id = ?1",
        params![bien_id],
        |r| r.get(0),
    ).map_err(|e| format!("Bien non trouvé: {}", e))?;

    let abs_dir = base_dir.join(&chemin_dossier);
    if !abs_dir.exists() {
        std::fs::create_dir_all(&abs_dir).ok();
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(abs_dir.to_str().unwrap_or_default())
            .spawn()
            .map_err(|e| format!("Erreur d'ouverture du dossier: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("open")
            .arg(abs_dir.to_str().unwrap_or_default())
            .spawn()
            .map_err(|e| format!("Erreur d'ouverture du dossier: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn read_excel_file_preview(app: tauri::AppHandle, path: String) -> Result<ExcelSheetPreview, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let target = if std::path::Path::new(&path).is_absolute() {
        std::path::PathBuf::from(&path)
    } else {
        base_dir.join(&path)
    };

    if !target.exists() {
        return Err(format!("Fichier non trouvé: {}", target.display()));
    }

    let ext = target.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();

    if ext == "csv" {
        let content = std::fs::read_to_string(&target).map_err(|e| format!("Lecture CSV impossible: {}", e))?;
        let rows = content
            .lines()
            .take(50)
            .map(|line| line.split(';').map(str::to_string).collect::<Vec<_>>())
            .collect::<Vec<_>>();
        return Ok(ExcelSheetPreview { rows, sheet_name: "CSV".to_string() });
    }

    let mut workbook = calamine::open_workbook::<Xlsx<_>, _>(&target)
        .map_err(|e| format!("Lecture du fichier Excel impossible: {}", e))?;

    let sheet_names = workbook.sheet_names();
    let sheet_name = sheet_names.first().cloned().unwrap_or_else(|| "Feuil1".to_string());
    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| format!("Lecture de la feuille Excel impossible: {}", e))?;

    let rows = range
        .rows()
        .take(50)
        .map(|row| {
            row.iter()
                .map(|cell| cell.to_string())
                .collect()
        })
        .collect();

    Ok(ExcelSheetPreview { rows, sheet_name })
}

#[tauri::command]
pub fn read_excel_sheet(app: tauri::AppHandle, path: String, sheet_name: String) -> Result<ExcelSheetFullPreview, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let target = if std::path::Path::new(&path).is_absolute() {
        std::path::PathBuf::from(&path)
    } else {
        base_dir.join(&path)
    };

    if !target.exists() {
        return Err(format!("Fichier non trouvé: {}", target.display()));
    }

    let ext = target.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();

    if ext == "csv" {
        let content = std::fs::read_to_string(&target).map_err(|e| format!("Lecture CSV impossible: {}", e))?;
        let rows: Vec<Vec<String>> = content
            .lines()
            .map(|line| line.split(';').map(str::to_string).collect())
            .collect();
        let total_rows = rows.len();
        let total_cols = rows.first().map(|r| r.len()).unwrap_or(0);
        return Ok(ExcelSheetFullPreview {
            rows,
            sheet_name: "CSV".to_string(),
            sheet_names: vec!["CSV".to_string()],
            total_rows,
            total_cols,
        });
    }

    let mut workbook = calamine::open_workbook::<Xlsx<_>, _>(&target)
        .map_err(|e| format!("Lecture du fichier Excel impossible: {}", e))?;

    let all_sheet_names = workbook.sheet_names().to_vec();
    let target_sheet = if all_sheet_names.contains(&sheet_name) {
        sheet_name.clone()
    } else {
        all_sheet_names.first().cloned().unwrap_or_else(|| "Feuil1".to_string())
    };

    let range = workbook
        .worksheet_range(&target_sheet)
        .map_err(|e| format!("Lecture de la feuille '{}' impossible: {}", target_sheet, e))?;

    let total_rows = range.height();
    let total_cols = range.width();

    let rows: Vec<Vec<String>> = range
        .rows()
        .map(|row| {
            row.iter()
                .map(|cell| cell.to_string())
                .collect()
        })
        .collect();

    Ok(ExcelSheetFullPreview {
        rows,
        sheet_name: target_sheet,
        sheet_names: all_sheet_names,
        total_rows,
        total_cols,
    })
}

#[tauri::command]
pub fn save_excel_file(app: tauri::AppHandle, path: String, sheets_data: Vec<SheetSaveData>) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let target = if std::path::Path::new(&path).is_absolute() {
        std::path::PathBuf::from(&path)
    } else {
        base_dir.join(&path)
    };

    if !target.exists() {
        return Err(format!("Fichier non trouvé: {}", target.display()));
    }

    // Create backup
    let backup_path = target.with_extension("xlsx.bak");
    std::fs::copy(&target, &backup_path)
        .map_err(|e| format!("Impossible de créer la sauvegarde: {}", e))?;

    // Write new file using rust_xlsxwriter
    let mut workbook = XlsxWorkbook::new();

    for sheet_data in &sheets_data {
        let worksheet = workbook.add_worksheet();
        worksheet.set_name(&sheet_data.sheet_name)
            .map_err(|e| format!("Erreur nom de feuille: {}", e))?;

        // Header format (bold, background)
        let header_format = rust_xlsxwriter::Format::new()
            .set_bold()
            .set_background_color(rust_xlsxwriter::Color::RGB(0xD9E1F2))
            .set_border(rust_xlsxwriter::FormatBorder::Thin);

        let cell_format = rust_xlsxwriter::Format::new()
            .set_border(rust_xlsxwriter::FormatBorder::Thin);

        for (row_idx, row) in sheet_data.rows.iter().enumerate() {
            for (col_idx, cell_value) in row.iter().enumerate() {
                let fmt = if row_idx == 0 { &header_format } else { &cell_format };

                // Try to parse as number
                if let Ok(num) = cell_value.parse::<f64>() {
                    worksheet.write_number_with_format(
                        row_idx as u32,
                        col_idx as u16,
                        num,
                        fmt,
                    ).map_err(|e| format!("Erreur écriture cellule: {}", e))?;
                } else {
                    worksheet.write_string_with_format(
                        row_idx as u32,
                        col_idx as u16,
                        cell_value,
                        fmt,
                    ).map_err(|e| format!("Erreur écriture cellule: {}", e))?;
                }
            }
        }
    }

    workbook.save(&target)
        .map_err(|e| format!("Impossible de sauvegarder le fichier Excel: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_file_preview(app: tauri::AppHandle, path: String) -> Result<FilePreviewData, String> {
    use base64::Engine;

    let base_dir = crate::db::get_base_dir(&app);
    let target = if std::path::Path::new(&path).is_absolute() {
        std::path::PathBuf::from(&path)
    } else {
        base_dir.join(&path)
    };

    if !target.exists() {
        return Err(format!("Fichier non trouvé: {}", target.display()));
    }

    let bytes = std::fs::read(&target).map_err(|e| format!("Erreur de lecture du fichier: {}", e))?;
    let ext = target.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

    let mime_type = match ext.as_str() {
        "pdf" => "application/pdf",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "txt" | "md" | "csv" | "json" | "log" | "url" => "text/plain",
        _ => "application/octet-stream",
    };

    let base64_data = base64::engine::general_purpose::STANDARD.encode(&bytes);

    let text_content = if mime_type.starts_with("text/") {
        String::from_utf8(bytes).ok()
    } else {
        None
    };

    Ok(FilePreviewData {
        mime_type: mime_type.to_string(),
        base64_data,
        text_content,
    })
}

#[tauri::command]
pub fn scan_bien_directory(app: tauri::AppHandle, state: State<AppState>, bien_id: i64) -> Result<Vec<FileNode>, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (nom_bien, chemin_dossier): (String, Option<String>) = db.query_row(
        "SELECT nom, chemin_dossier FROM biens WHERE id = ?1",
        params![bien_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| format!("Bien non trouvé: {}", e))?;

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

    let bien_abs_dir = base_dir.join(&bien_rel_path);
    if !bien_abs_dir.exists() {
        std::fs::create_dir_all(&bien_abs_dir).map_err(|e| format!("Erreur création dossier: {}", e))?;
    }

    let root_nodes = build_node_recursive(&bien_abs_dir, &bien_rel_path, &base_dir, bien_id, &db);

    Ok(root_nodes)
}

fn build_node_recursive(
    dir_path: &std::path::Path,
    bien_rel_root: &str,
    base_dir: &std::path::Path,
    bien_id: i64,
    conn: &rusqlite::Connection,
) -> Vec<FileNode> {
    let mut nodes = Vec::new();

    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();

            if filename.starts_with('.') || filename.to_lowercase() == "thumbs.db" {
                continue;
            }

            let relative_path = path.strip_prefix(base_dir)
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_else(|_| path.to_string_lossy().to_string());

            let is_dir = path.is_dir();
            let metadata = entry.metadata().ok();
            let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified_at = metadata
                .and_then(|m| m.modified().ok())
                .map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%d/%m/%Y %H:%M").to_string())
                .unwrap_or_default();

            if is_dir {
                let children = build_node_recursive(&path, bien_rel_root, base_dir, bien_id, conn);
                nodes.push(FileNode {
                    name: filename,
                    relative_path,
                    absolute_path: path.to_string_lossy().to_string(),
                    is_dir: true,
                    size_bytes: 0,
                    modified_at,
                    children,
                    doc_id: None,
                    type_doc: None,
                });
            } else {
                let mut stmt = conn.prepare_cached(
                    "SELECT id, type_doc FROM documents WHERE bien_id = ?1 AND (chemin_fichier = ?2 OR chemin_fichier LIKE '%' || ?3)"
                ).ok();

                let db_info = stmt.as_mut().and_then(|s| {
                    s.query_row(params![bien_id, relative_path, filename], |r| {
                        Ok((r.get::<_, i64>(0)?, r.get::<_, Option<String>>(1)?))
                    }).ok()
                });

                let (doc_id, type_doc) = match db_info {
                    Some((id, t)) => (Some(id), t),
                    None => {
                        let subfolder = relative_path
                            .strip_prefix(bien_rel_root)
                            .unwrap_or(&relative_path)
                            .trim_start_matches('/')
                            .rsplit_once('/')
                            .map(|(parent, _)| parent)
                            .unwrap_or("08_DIVERS")
                            .to_string();

                        let res = conn.execute(
                            "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier) VALUES (?1, 'autre', ?2, ?3)",
                            params![bien_id, subfolder, relative_path],
                        );
                        if res.is_ok() {
                            (Some(conn.last_insert_rowid()), Some("autre".to_string()))
                        } else {
                            (None, None)
                        }
                    }
                };

                nodes.push(FileNode {
                    name: filename,
                    relative_path,
                    absolute_path: path.to_string_lossy().to_string(),
                    is_dir: false,
                    size_bytes,
                    modified_at,
                    children: Vec::new(),
                    doc_id,
                    type_doc,
                });
            }
        }
    }

    nodes.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else {
            b.is_dir.cmp(&a.is_dir)
        }
    });

    nodes
}

#[tauri::command]
pub fn list_bien_files(app: tauri::AppHandle, state: State<AppState>, bien_id: i64) -> Result<Vec<BienFileItem>, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (nom_bien, chemin_dossier): (String, Option<String>) = db.query_row(
        "SELECT nom, chemin_dossier FROM biens WHERE id = ?1",
        params![bien_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| format!("Bien non trouvé: {}", e))?;

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

    let bien_abs_dir = base_dir.join(&bien_rel_path);

    let mut stmt = db.prepare(
        "SELECT id, type_doc, sous_categorie, chemin_fichier, date_document, notes FROM documents WHERE bien_id = ?1"
    ).map_err(|e| e.to_string())?;

    let db_docs: Vec<(i64, Option<String>, Option<String>, String, Option<String>, Option<String>)> = stmt
        .query_map(params![bien_id], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    let mut scanned_paths = std::collections::HashSet::new();

    fn scan_dir(
        dir: &std::path::Path,
        bien_abs_dir: &std::path::Path,
        bien_rel_path: &str,
        db_docs: &[(i64, Option<String>, Option<String>, String, Option<String>, Option<String>)],
        result: &mut Vec<BienFileItem>,
        scanned_paths: &mut std::collections::HashSet<String>,
    ) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    scan_dir(&path, bien_abs_dir, bien_rel_path, db_docs, result, scanned_paths);
                } else if path.is_file() {
                    let absolute_path = path.to_string_lossy().to_string();
                    if scanned_paths.contains(&absolute_path) {
                        continue;
                    }
                    scanned_paths.insert(absolute_path.clone());

                    let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let rel_sub = path.strip_prefix(bien_abs_dir)
                        .unwrap_or(&path)
                        .to_string_lossy()
                        .replace('\\', "/");
                    let relative_file_path = format!("{}/{}", bien_rel_path, rel_sub);

                    let metadata = entry.metadata().ok();
                    let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    let modified_at = metadata
                        .and_then(|m| m.modified().ok())
                        .map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%d/%m/%Y %H:%M").to_string())
                        .unwrap_or_default();

                    let matched_doc = db_docs.iter().find(|d| d.3 == relative_file_path || d.3.ends_with(&filename));
                    let subfolder = std::path::Path::new(&rel_sub)
                        .parent()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();

                    result.push(BienFileItem {
                        doc_id: matched_doc.map(|d| d.0),
                        filename,
                        relative_path: relative_file_path,
                        absolute_path,
                        subfolder,
                        size_bytes,
                        modified_at,
                        type_doc: matched_doc.and_then(|d| d.1.clone()),
                        date_document: matched_doc.and_then(|d| d.4.clone()),
                        notes: matched_doc.and_then(|d| d.5.clone()),
                    });
                }
            }
        }
    }

    scan_dir(&bien_abs_dir, &bien_abs_dir, &bien_rel_path, &db_docs, &mut result, &mut scanned_paths);

    Ok(result)
}

#[tauri::command]
pub fn delete_document_file(app: tauri::AppHandle, state: State<AppState>, id: i64) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let path_str: String = db.query_row(
        "SELECT chemin_fichier FROM documents WHERE id = ?1",
        params![id],
        |r| r.get(0),
    ).map_err(|e| format!("Document non trouvé: {}", e))?;

    let abs_path = if std::path::Path::new(&path_str).is_absolute() {
        std::path::PathBuf::from(&path_str)
    } else {
        base_dir.join(&path_str)
    };

    if abs_path.exists() {
        std::fs::remove_file(&abs_path).map_err(|e| format!("Impossible de supprimer le fichier physique: {}", e))?;
    }

    db.execute("DELETE FROM documents WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

/// Validation stricte de sécurité des chemins de fichiers pour empêcher les attaques de traversée de dossier (`../`).
pub fn validate_safe_path(base_dir: &std::path::Path, target_relative: &str) -> Result<std::path::PathBuf, String> {
    if target_relative.contains("..") {
        return Err("Sécurité : Le chemin spécifié contient un motif de traversée interdit ('..')".to_string());
    }

    let full_path = base_dir.join(target_relative);

    if full_path.exists() {
        if let (Ok(canonical_base), Ok(canonical_target)) = (base_dir.canonicalize(), full_path.canonicalize()) {
            if !canonical_target.starts_with(&canonical_base) {
                return Err("Alerte de Sécurité : accès interdit hors de l'arborescence KeyFolio".to_string());
            }
        }
    }

    Ok(full_path)
}

#[tauri::command]
pub fn delete_file_by_path(app: tauri::AppHandle, state: State<AppState>, relative_path: String) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let abs_path = validate_safe_path(&base_dir, &relative_path)?;

    if abs_path.exists() {
        std::fs::remove_file(&abs_path).map_err(|e| format!("Impossible de supprimer le fichier: {}", e))?;
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM documents WHERE chemin_fichier = ?1", params![relative_path]).ok();

    Ok(())
}

#[tauri::command]
pub fn rename_document_file(
    app: tauri::AppHandle,
    state: State<AppState>,
    relative_path: String,
    new_filename: String,
) -> Result<String, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let old_abs_path = validate_safe_path(&base_dir, &relative_path)?;

    if !old_abs_path.exists() {
        return Err("Le fichier source n'existe pas".to_string());
    }

    if new_filename.contains("..") || new_filename.contains('/') || new_filename.contains('\\') {
        return Err("Nom de fichier invalide".to_string());
    }

    let parent = old_abs_path.parent().ok_or_else(|| "Dossier parent invalide".to_string())?;
    let new_abs_path = parent.join(&new_filename);

    std::fs::rename(&old_abs_path, &new_abs_path).map_err(|e| format!("Impossible de renommer le fichier: {}", e))?;

    let relative_parent = relative_path.rsplit_once('/').map(|(p, _)| p).unwrap_or("");
    let new_relative_path = format!("{}/{}", relative_parent, new_filename);

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE documents SET chemin_fichier = ?1 WHERE chemin_fichier = ?2",
        params![new_relative_path, relative_path],
    ).ok();

    Ok(new_relative_path)
}

#[tauri::command]
pub fn move_file_to_subfolder(
    app: tauri::AppHandle,
    state: tauri::State<crate::AppState>,
    bien_id: i64,
    source_relative_path: String,
    target_subfolder: String,
) -> Result<String, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let old_abs_path = validate_safe_path(&base_dir, &source_relative_path)?;
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let chemin_dossier: String = db.query_row(
        "SELECT chemin_dossier FROM biens WHERE id = ?1",
        rusqlite::params![bien_id],
        |r| r.get(0),
    ).map_err(|e| format!("Bien non trouvé: {}", e))?;

    let old_abs_path = base_dir.join(&source_relative_path);
    if !old_abs_path.exists() {
        return Err("Le fichier source n'existe pas".to_string());
    }

    let target_dir = base_dir.join(&chemin_dossier).join(&target_subfolder);
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir).map_err(|e| format!("Impossible de créer le dossier cible: {}", e))?;
    }

    let final_filename = old_abs_path.file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Nom de fichier invalide".to_string())?
        .to_string();

    let mut new_abs_path = target_dir.join(&final_filename);
    
    let mut counter = 1;
    let file_stem = std::path::Path::new(&final_filename).file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let ext = std::path::Path::new(&final_filename).extension().and_then(|s| s.to_str()).map(|e| format!(".{}", e)).unwrap_or_default();
    let mut actual_filename = final_filename.clone();

    while new_abs_path.exists() {
        actual_filename = format!("{}_{}{}", file_stem, counter, ext);
        new_abs_path = target_dir.join(&actual_filename);
        counter += 1;
    }

    if old_abs_path.is_dir() {
        std::fs::rename(&old_abs_path, &new_abs_path).map_err(|e| format!("Impossible de déplacer le dossier: {}", e))?;
        let new_relative_path = format!("{}/{}/{}", chemin_dossier, target_subfolder, actual_filename);
        let old_prefix = format!("{}/", source_relative_path);
        let new_prefix = format!("{}/", new_relative_path);
        db.execute(
            "UPDATE documents SET chemin_fichier = ?1 || SUBSTR(chemin_fichier, LENGTH(?2) + 1), sous_categorie = ?3 WHERE chemin_fichier LIKE ?2 || '%'",
            rusqlite::params![new_prefix, old_prefix, target_subfolder],
        ).ok();
        return Ok(new_relative_path);
    }

    if let Err(_e) = std::fs::rename(&old_abs_path, &new_abs_path) {
        std::fs::copy(&old_abs_path, &new_abs_path).map_err(|e| format!("Impossible de copier le fichier: {}", e))?;
        std::fs::remove_file(&old_abs_path).map_err(|e| format!("Impossible de supprimer l'ancien fichier: {}", e))?;
    }

    let new_relative_path = format!("{}/{}/{}", chemin_dossier, target_subfolder, actual_filename);

    db.execute(
        "UPDATE documents SET chemin_fichier = ?1, sous_categorie = ?2 WHERE chemin_fichier = ?3",
        rusqlite::params![new_relative_path, target_subfolder, source_relative_path],
    ).map_err(|e| e.to_string())?;

    Ok(new_relative_path)
}

#[tauri::command]
pub fn get_bien_champs_libres(state: State<AppState>, bien_id: i64) -> Result<Vec<BienChampLibre>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT id, bien_id, cle, valeur, created_at FROM bien_champs_libres WHERE bien_id = ?1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let items = stmt.query_map(params![bien_id], |row| {
        Ok(BienChampLibre {
            id: row.get(0)?,
            bien_id: row.get(1)?,
            cle: row.get(2)?,
            valeur: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn save_bien_email_config(state: State<AppState>, config: BienEmailConfig) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO bien_email_config (bien_id, email_adresse, imap_host, imap_port, smtp_host, smtp_port, use_ssl)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(bien_id) DO UPDATE SET
           email_adresse = excluded.email_adresse,
           imap_host = excluded.imap_host,
           imap_port = excluded.imap_port,
           smtp_host = excluded.smtp_host,
           smtp_port = excluded.smtp_port,
           use_ssl = excluded.use_ssl",
        params![
            config.bien_id,
            config.email_adresse,
            config.imap_host,
            config.imap_port,
            config.smtp_host,
            config.smtp_port,
            config.use_ssl.unwrap_or(true) as i32
        ],
    ).map_err(|e| e.to_string())?;

    let entry = keyring::Entry::new("lepuits", &format!("bien_email:{}", config.bien_id))
        .map_err(|e| format!("Impossible d'initialiser le stockage sécurisé: {}", e))?;

    if let Some(password) = config.password.as_deref() {
        if !password.is_empty() {
            entry.set_password(password).map_err(|e| format!("Impossible de sécuriser le mot de passe: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_bien_email_config(state: State<AppState>, bien_id: i64) -> Result<Option<BienEmailConfig>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let res = db.query_row(
        "SELECT email_adresse, imap_host, imap_port, smtp_host, smtp_port, use_ssl
         FROM bien_email_config WHERE bien_id = ?1",
        params![bien_id],
        |row| Ok(BienEmailConfig {
            bien_id,
            email_adresse: row.get(0)?,
            password: None,
            imap_host: row.get(1)?,
            imap_port: row.get(2)?,
            smtp_host: row.get(3)?,
            smtp_port: row.get(4)?,
            use_ssl: row.get(5)?,
        }),
    );

    if let Ok(cfg) = res {
        Ok(Some(cfg))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn clear_bien_email_config(state: State<AppState>, bien_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM bien_email_config WHERE bien_id = ?1", params![bien_id]).map_err(|e| e.to_string())?;

    let entry = keyring::Entry::new("lepuits", &format!("bien_email:{}", bien_id)).map_err(|e| e.to_string())?;
    let _ = entry.delete_password();
    Ok(())
}

#[tauri::command]
pub fn save_bien_champ_libre(app: tauri::AppHandle, state: State<AppState>, bien_id: i64, cle: String, valeur: String) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO bien_champs_libres (bien_id, cle, valeur) VALUES (?1, ?2, ?3)
         ON CONFLICT(bien_id, cle) DO UPDATE SET valeur = excluded.valeur",
        params![bien_id, cle, valeur],
    ).map_err(|e| e.to_string())?;

    crate::excel::sync_all_property_excels(&db, &base_dir, bien_id).ok();

    Ok(())
}

#[tauri::command]
pub fn save_bien_champs_libres_batch(
    app: tauri::AppHandle,
    state: State<AppState>,
    bien_id: i64,
    items: Vec<BienChampLibreItem>,
) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let mut db = state.db.lock().map_err(|e| e.to_string())?;

    let tx = db.transaction().map_err(|e| e.to_string())?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO bien_champs_libres (bien_id, cle, valeur) VALUES (?1, ?2, ?3)
             ON CONFLICT(bien_id, cle) DO UPDATE SET valeur = excluded.valeur"
        ).map_err(|e| e.to_string())?;

        for item in &items {
            stmt.execute(params![bien_id, item.cle, item.valeur]).map_err(|e| e.to_string())?;

            if item.cle == "mode_occupation" {
                let val_lower = item.valeur.to_lowercase();
                let new_statut = if val_lower.contains("principale") {
                    Some("residence_principale")
                } else if val_lower.contains("secondaire") {
                    Some("residence_secondaire")
                } else if val_lower.contains("vente") {
                    Some("en_vente")
                } else if val_lower.contains("vacant") {
                    Some("vacant")
                } else {
                    None
                };
                if let Some(st) = new_statut {
                    tx.execute("UPDATE biens SET statut = ?1 WHERE id = ?2", params![st, bien_id]).ok();
                }
            }
        }
    }
    tx.commit().map_err(|e| e.to_string())?;

    crate::excel::sync_all_property_excels(&db, &base_dir, bien_id).ok();

    Ok(())
}

#[tauri::command]
pub fn delete_bien_champ_libre(app: tauri::AppHandle, state: State<AppState>, id: i64) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let bien_id: Option<i64> = db.query_row("SELECT bien_id FROM bien_champs_libres WHERE id = ?1", params![id], |r| r.get(0)).ok();

    db.execute("DELETE FROM bien_champs_libres WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if let Some(bid) = bien_id {
        crate::excel::sync_all_property_excels(&db, &base_dir, bid).ok();
    }

    Ok(())
}

#[tauri::command]
pub fn create_bien_wizard(app: tauri::AppHandle, state: State<AppState>, payload: WizardPayload) -> Result<BienCreationResult, String> {
    let base_dir = crate::db::get_base_dir(&app);

    // 1. Créer le bien
    let mut bien = payload.bien;
    let (rel_path, _) = crate::db::create_property_folder_tree(&base_dir, &bien.nom)
        .map_err(|e| format!("Erreur création arborescence: {}", e))?;
    bien.chemin_dossier = Some(rel_path.clone());

    let safe_type_bien = match bien.type_bien.as_deref() {
        Some("residence_principale") => "residence_principale",
        Some("secondaire") | Some("residence_secondaire") => "residence_secondaire",
        _ => "location",
    };

    let safe_statut = match bien.statut.as_deref() {
        Some("projet") => "projet",
        Some(s) if s.contains("principale") => "residence_principale",
        Some(s) if s.contains("secondaire") => "residence_secondaire",
        Some(s) if s.contains("vente") => "en_vente",
        Some(s) if s.contains("vendu") => "vendu",
        Some(s) if s.contains("vacant") => "vacant",
        Some(s) => s,
        None => "en_cours",
    };

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO biens (
            nom, adresse, type_bien, statut, chemin_dossier, email_dedie, date_acquisition, surface_m2, notes,
            phase_actuelle, pourcentage_avancement, date_livraison_prevue, budget_prevision,
            valeur_estimee, latitude, longitude, nb_pieces, nb_chambres, nb_salles_bain,
            surface_terrain, annee_construction, classe_energetique, description
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
        params![
            bien.nom, bien.adresse, safe_type_bien, safe_statut, bien.chemin_dossier, bien.email_dedie, bien.date_acquisition, bien.surface_m2, bien.notes,
            bien.phase_actuelle, bien.pourcentage_avancement.unwrap_or(0), bien.date_livraison_prevue, bien.budget_prevision,
            bien.valeur_estimee, bien.latitude, bien.longitude, bien.nb_pieces, bien.nb_chambres, bien.nb_salles_bain,
            bien.surface_terrain, bien.annee_construction, bien.classe_energetique, bien.description
        ],
    ).map_err(|e| format!("Erreur insertion bien: {}", e))?;

    let bien_id = db.last_insert_rowid();

    // Enregistrer automatiquement le mode d'occupation dans les champs libres du bien
    let mode_occ_val = match safe_statut {
        "residence_principale" => "Résidence principale (Propriétaire)",
        "residence_secondaire" => "Résidence secondaire",
        "en_vente" => "En vente",
        "vacant" => "Vacant",
        _ => "Location longue durée (Nue)",
    };
    db.execute(
        "INSERT INTO bien_champs_libres (bien_id, cle, valeur) VALUES (?1, 'mode_occupation', ?2)
         ON CONFLICT(bien_id, cle) DO UPDATE SET valeur = excluded.valeur",
        params![bien_id, mode_occ_val],
    ).ok();

    // 2. Si locataire & bail fournis
    if let (Some(loc), Some(mut bail)) = (payload.locataire, payload.bail) {
        db.execute(
            "INSERT INTO locataires (nom, prenom, telephone, email, revenus_mensuels, profession, garant_nom, garant_contact, notes, fichier_dossier)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                loc.nom, loc.prenom, loc.telephone, loc.email,
                loc.revenus_mensuels, loc.profession,
                loc.garant_nom, loc.garant_contact, loc.notes, loc.fichier_dossier
            ],
        ).map_err(|e| format!("Erreur insertion locataire: {}", e))?;
        let loc_id = db.last_insert_rowid();

        bail.bien_id = bien_id;
        bail.locataire_id = loc_id;
        db.execute(
            "INSERT INTO baux (bien_id, locataire_id, date_debut, date_fin, loyer_mensuel, charges_mensuelles, depot_garantie, jour_paiement, statut, fichier_bail)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![bail.bien_id, bail.locataire_id, bail.date_debut, bail.date_fin, bail.loyer_mensuel, bail.charges_mensuelles, bail.depot_garantie, bail.jour_paiement, bail.statut, bail.fichier_bail],
        ).map_err(|e| format!("Erreur insertion bail: {}", e))?;
    }

    // 3. Documents initiaux
    for doc in payload.documents {
        let src = std::path::Path::new(&doc.source_path);
        if src.exists() {
            let filename = src.file_name().map(|f| f.to_string_lossy().to_string()).unwrap_or_default();
            let dest_dir = base_dir.join(&rel_path).join(&doc.subfolder);
            std::fs::create_dir_all(&dest_dir).ok();
            let dest_file = dest_dir.join(&filename);
            if std::fs::copy(src, &dest_file).is_ok() {
                let doc_rel_path = format!("{}/{}/{}", rel_path, doc.subfolder, filename);
                db.execute(
                    "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier) VALUES (?1, ?2, ?3, ?4)",
                    params![bien_id, doc.type_doc.unwrap_or_else(|| "autre".to_string()), doc.subfolder, doc_rel_path],
                ).ok();
            }
        }
    }

    // 4. Champs libres additionnels renseignés lors de la création
    if let Some(items) = payload.champs_libres {
        for item in items {
            if !item.valeur.trim().is_empty() {
                db.execute(
                    "INSERT INTO bien_champs_libres (bien_id, cle, valeur) VALUES (?1, ?2, ?3)
                     ON CONFLICT(bien_id, cle) DO UPDATE SET valeur = excluded.valeur",
                    params![bien_id, item.cle, item.valeur],
                ).ok();
            }
        }
    }

    // 5. Génération automatique immédiate des fichiers Excel
    crate::excel::sync_all_property_excels(&db, &base_dir, bien_id).ok();

    Ok(BienCreationResult {
        id: bien_id,
        chemin_dossier: rel_path,
    })
}

#[tauri::command]
pub fn sync_bien_excel(app: tauri::AppHandle, state: State<AppState>, bien_id: i64) -> Result<(), String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::excel::sync_all_property_excels(&db, &base_dir, bien_id)
}

#[tauri::command]
pub fn import_bien_folder(app: tauri::AppHandle, state: State<AppState>, folder_path: String) -> Result<i64, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let path = std::path::PathBuf::from(&folder_path);
    let bien_id = crate::excel::import_property_from_folder(&db, &path)?;

    crate::excel::sync_all_property_excels(&db, &base_dir, bien_id).ok();

    Ok(bien_id)
}

#[tauri::command]
pub fn generate_questionnaire_excel(
    app: tauri::AppHandle,
    state: State<AppState>,
    bien_id: i64,
    filename: String,
    title: String,
    headers: Vec<String>,
    sample_rows: Vec<Vec<String>>,
    has_totals: bool,
    has_cumul: bool,
) -> Result<String, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let chemin_dossier: String = db.query_row(
        "SELECT chemin_dossier FROM biens WHERE id = ?1",
        params![bien_id],
        |r| r.get(0),
    ).map_err(|e| format!("Bien non trouvé: {}", e))?;

    crate::excel::generate_questionnaire_excel(
        &base_dir, &chemin_dossier, &filename, &title, headers, sample_rows, has_totals, has_cumul
    )
}

#[tauri::command]
pub fn save_file_to_disk(target_path: String, base64_data: String) -> Result<(), String> {
    use base64::Engine;
    let clean_b64 = if let Some(idx) = base64_data.find("base64,") {
        &base64_data[idx + 7..]
    } else {
        &base64_data
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_b64.trim())
        .map_err(|e| format!("Erreur décodage base64: {}", e))?;

    std::fs::write(&target_path, bytes).map_err(|e| format!("Erreur écriture fichier: {}", e))?;
    Ok(())
}

