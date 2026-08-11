use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;

#[tauri::command]
pub fn get_dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let total_biens: i64 = db.query_row(
        "SELECT COUNT(*) FROM biens", [], |r| r.get(0)
    ).unwrap_or(0);

    let biens_en_location: i64 = db.query_row(
        "SELECT COUNT(*) FROM biens WHERE type_bien = 'location'", [], |r| r.get(0)
    ).unwrap_or(0);

    let loyers_mois: f64 = db.query_row(
        "SELECT COALESCE(SUM(loyer_mensuel + COALESCE(charges_mensuelles,0)), 0)
         FROM baux WHERE statut = 'actif'", [], |r| r.get(0)
    ).unwrap_or(0.0);

    let loyers_payes: f64 = db.query_row(
        "SELECT COALESCE(SUM(montant), 0) FROM paiements
         WHERE statut = 'paye' AND strftime('%Y-%m', date_prevue) = strftime('%Y-%m', 'now')",
        [], |r| r.get(0)
    ).unwrap_or(0.0);

    let loyers_impayes: i64 = db.query_row(
        "SELECT COUNT(*) FROM paiements WHERE statut IN ('impaye','en_retard')", [], |r| r.get(0)
    ).unwrap_or(0);

    let depenses_mois: f64 = db.query_row(
        "SELECT COALESCE(SUM(montant), 0) FROM depenses
         WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')",
        [], |r| r.get(0)
    ).unwrap_or(0.0);

    let tickets_ouverts: i64 = db.query_row(
        "SELECT COUNT(*) FROM maintenance WHERE statut IN ('ouvert','en_cours')", [], |r| r.get(0)
    ).unwrap_or(0);

    Ok(DashboardStats {
        total_biens,
        biens_en_location,
        loyers_mois,
        loyers_payes,
        loyers_impayes,
        depenses_mois,
        tickets_ouverts,
    })
}

#[tauri::command]
pub fn global_search(state: State<AppState>, query: String) -> Result<Vec<SearchResultItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let q = format!("%{}%", query.trim().to_lowercase());
    let mut results = Vec::new();

    if query.trim().is_empty() {
        return Ok(results);
    }

    // 1. Biens
    let mut stmt = db.prepare("SELECT id, nom, adresse FROM biens WHERE LOWER(nom) LIKE ?1 OR LOWER(adresse) LIKE ?1").unwrap();
    let rows = stmt.query_map(params![q], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, Option<String>>(2)?))).unwrap();
    for r in rows.flatten() {
        results.push(SearchResultItem {
            category: "Bien".to_string(),
            title: r.1,
            subtitle: r.2.unwrap_or_default(),
            target_page: "biens".to_string(),
            param: Some(r.0),
        });
    }

    // 2. Locataires
    let mut stmt = db.prepare("SELECT id, nom, prenom, email FROM locataires WHERE LOWER(nom) LIKE ?1 OR LOWER(prenom) LIKE ?1 OR LOWER(email) LIKE ?1").unwrap();
    let rows = stmt.query_map(params![q], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, Option<String>>(3)?))).unwrap();
    for r in rows.flatten() {
        results.push(SearchResultItem {
            category: "Locataire".to_string(),
            title: format!("{} {}", r.1, r.2),
            subtitle: r.3.unwrap_or_default(),
            target_page: "locataires".to_string(),
            param: Some(r.0),
        });
    }

    // 3. Dépenses
    let mut stmt = db.prepare("SELECT id, description, montant, date FROM depenses WHERE LOWER(description) LIKE ?1 OR LOWER(fournisseur) LIKE ?1").unwrap();
    let rows = stmt.query_map(params![q], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, Option<String>>(1)?, r.get::<_, f64>(2)?, r.get::<_, String>(3)?))).unwrap();
    for r in rows.flatten() {
        results.push(SearchResultItem {
            category: "Dépense".to_string(),
            title: r.1.unwrap_or_else(|| "Dépense".to_string()),
            subtitle: format!("{} € - {}", r.2, r.3),
            target_page: "depenses".to_string(),
            param: Some(r.0),
        });
    }

    // 4. Documents
    let mut stmt = db.prepare("SELECT id, chemin_fichier, type_doc FROM documents WHERE LOWER(chemin_fichier) LIKE ?1 OR LOWER(notes) LIKE ?1").unwrap();
    let rows = stmt.query_map(params![q], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, Option<String>>(2)?))).unwrap();
    for r in rows.flatten() {
        let name = std::path::Path::new(&r.1).file_name().map(|f| f.to_string_lossy().to_string()).unwrap_or(r.1);
        results.push(SearchResultItem {
            category: "Document".to_string(),
            title: name,
            subtitle: r.2.unwrap_or_default(),
            target_page: "documents".to_string(),
            param: Some(r.0),
        });
    }

    Ok(results)
}
