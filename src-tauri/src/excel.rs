use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use rust_xlsxwriter::*;
use calamine::{DataType, Reader, Xlsx, open_workbook};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(dead_code)]
pub struct CustomChampLibre {
    pub id: Option<i64>,
    pub bien_id: i64,
    pub cle: String,
    pub valeur: String,
}

/// Synchronise automatiquement tous les fichiers Excel standards dans le dossier d'un bien.
/// Garantit qu'aucune donnée d'un autre bien ne fuite dans ce dossier.
pub fn sync_all_property_excels(conn: &Connection, base_dir: &PathBuf, bien_id: i64) -> Result<(), String> {
    let (nom_bien, chemin_dossier): (String, Option<String>) = conn
        .query_row(
            "SELECT nom, chemin_dossier FROM biens WHERE id = ?1",
            params![bien_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Bien #{} introuvable: {}", bien_id, e))?;

    let relative_path = match chemin_dossier {
        Some(p) if !p.trim().is_empty() => p,
        _ => return Ok(()), // Pas de dossier encore créé
    };

    let bien_dir = base_dir.join(&relative_path);
    if !bien_dir.exists() {
        std::fs::create_dir_all(&bien_dir).map_err(|e| e.to_string())?;
    }

    sync_fiche_bien_excel(conn, &bien_dir, bien_id, &nom_bien)?;
    sync_suivi_loyers_excel(conn, &bien_dir, bien_id)?;
    sync_suivi_depenses_excel(conn, &bien_dir, bien_id)?;
    sync_locataires_baux_excel(conn, &bien_dir, bien_id)?;
    sync_tableau_amortissement_excel(conn, &bien_dir, bien_id)?;

    Ok(())
}

fn create_header_format() -> Format {
    Format::new()
        .set_bold()
        .set_background_color(Color::RGB(0x1E293B))
        .set_font_color(Color::RGB(0xFFFFFF))
        .set_font_size(11)
}

fn create_title_format() -> Format {
    Format::new()
        .set_bold()
        .set_font_size(14)
        .set_font_color(Color::RGB(0x0F172A))
}

fn create_currency_format() -> Format {
    Format::new().set_num_format("#,##0.00 €")
}

fn create_total_format() -> Format {
    Format::new()
        .set_bold()
        .set_num_format("#,##0.00 €")
        .set_border_top(FormatBorder::Thin)
        .set_border_bottom(FormatBorder::Double)
}

/// Helper pour placer les fichiers Excel auto-générés dans le sous-dossier adéquat avec la date du jour AAAA-MM-JJ.
/// Nettoie les anciens fichiers de synthèse pour éviter les doublons ou la présence à la racine / mauvais sous-dossier.
fn get_dated_subfolder_file_path(bien_dir: &Path, subfolder: &str, file_base: &str) -> PathBuf {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let target_dir = bien_dir.join(subfolder);
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir).ok();
    }

    // 1. Nettoyer tout ancien fichier de synthèse directement à la racine du bien
    clean_old_files_in_dir(bien_dir, file_base);

    // 2. Nettoyer dans les dossiers parents intermédiaires (ex: 07_LOCATION, 04_FISCAL_FINANCIER)
    if let Some(parent_sub) = subfolder.split('/').next() {
        let parent_dir = bien_dir.join(parent_sub);
        if parent_dir != target_dir && parent_dir.exists() {
            clean_old_files_in_dir(&parent_dir, file_base);
        }
    }

    // 3. Nettoyer les anciennes versions dans le sous-dossier de destination
    clean_old_files_in_dir(&target_dir, file_base);

    target_dir.join(format!("{}_{}.xlsx", today, file_base))
}

fn clean_old_files_in_dir(dir: &Path, file_base: &str) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name == format!("{}.xlsx", file_base) || name.ends_with(&format!("_{}.xlsx", file_base)) {
                    std::fs::remove_file(entry.path()).ok();
                }
            }
        }
    }
}

/// 1. Fiche_Bien.xlsx — Informations générales + Champs libres
pub fn sync_fiche_bien_excel(conn: &Connection, bien_dir: &Path, bien_id: i64, _nom_bien: &str) -> Result<(), String> {
    let file_path = get_dated_subfolder_file_path(bien_dir, "01_ADMINISTRATIF", "Fiche_Bien");

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Fiche du bien").map_err(|e| e.to_string())?;

    let header_fmt = create_header_format();
    let title_fmt = create_title_format();

    // Titre
    worksheet.write_with_format(0, 0, "FICHE SIGNALÉTIQUE DU BIEN IMMOBILIER", &title_fmt).map_err(|e| e.to_string())?;

    // Entêtes
    worksheet.write_with_format(2, 0, "Champ", &header_fmt).map_err(|e| e.to_string())?;
    worksheet.write_with_format(2, 1, "Valeur", &header_fmt).map_err(|e| e.to_string())?;

    let (
        nom, adresse, type_bien, statut, date_acq, surface, notes, email_dedie,
        phase_actuelle, avancement, date_livraison, budget_prev, valeur_est,
        nb_pieces, nb_chambres, nb_sdb, surface_terrain, annee_const, dpe, desc
    ): (
        String, Option<String>, Option<String>, Option<String>, Option<String>, Option<f64>, Option<String>, Option<String>,
        Option<String>, Option<i64>, Option<String>, Option<f64>, Option<f64>,
        Option<i64>, Option<i64>, Option<i64>, Option<f64>, Option<i64>, Option<String>, Option<String>
    ) = conn.query_row(
        "SELECT nom, adresse, type_bien, statut, date_acquisition, surface_m2, notes, email_dedie,
                phase_actuelle, pourcentage_avancement, date_livraison_prevue, budget_prevision, valeur_estimee,
                nb_pieces, nb_chambres, nb_salles_bain, surface_terrain, annee_construction, classe_energetique, description
         FROM biens WHERE id = ?1",
        params![bien_id],
        |row| Ok((
            row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?,
            row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?,
            row.get(8)?, row.get(9)?, row.get(10)?, row.get(11)?, row.get(12)?,
            row.get(13)?, row.get(14)?, row.get(15)?, row.get(16)?, row.get(17)?, row.get(18)?, row.get(19)?
        ))
    ).map_err(|e| e.to_string())?;

    let mut row_idx = 3;
    let mut fields = vec![
        ("ID Bien", bien_id.to_string()),
        ("Nom du bien", nom),
        ("Adresse complète", adresse.unwrap_or_default()),
        ("Type de bien", type_bien.unwrap_or_default()),
        ("Statut d'occupation", statut.clone().unwrap_or_default()),
        ("Date d'acquisition", date_acq.unwrap_or_default()),
        ("Surface habitable (m²)", surface.map(|s| format!("{} m²", s)).unwrap_or_default()),
        ("Valeur estimée (€)", valeur_est.map(|v| format!("{:.2} €", v)).unwrap_or_default()),
        ("Email dédié", email_dedie.unwrap_or_default()),
        ("Nombre de pièces", nb_pieces.map(|n| n.to_string()).unwrap_or_default()),
        ("Nombre de chambres", nb_chambres.map(|n| n.to_string()).unwrap_or_default()),
        ("Nombre de salles de bain", nb_sdb.map(|n| n.to_string()).unwrap_or_default()),
        ("Surface terrain (m²)", surface_terrain.map(|s| format!("{} m²", s)).unwrap_or_default()),
        ("Année de construction", annee_const.map(|a| a.to_string()).unwrap_or_default()),
        ("Classe énergétique (DPE)", dpe.unwrap_or_default()),
        ("Description", desc.unwrap_or_default()),
        ("Notes & Remarques", notes.unwrap_or_default()),
    ];

    if statut.as_deref() == Some("projet") {
        fields.push(("--- SUIVI DE PROJET ---", "----------------".to_string()));
        fields.push(("Phase actuelle", phase_actuelle.unwrap_or_default()));
        fields.push(("Avancement (%)", avancement.map(|p| format!("{} %", p)).unwrap_or_default()));
        fields.push(("Date de livraison prévue", date_livraison.unwrap_or_default()));
        fields.push(("Budget prévisionnel (€)", budget_prev.map(|b| format!("{:.2} €", b)).unwrap_or_default()));
    }

    for (label, val) in fields {
        worksheet.write(row_idx, 0, label).map_err(|e| e.to_string())?;
        worksheet.write(row_idx, 1, val).map_err(|e| e.to_string())?;
        row_idx += 1;
    }

    // Champs libres
    row_idx += 1;
    worksheet.write_with_format(row_idx, 0, "CHAMPS LIBRES PERSONNALISÉS", &title_fmt).map_err(|e| e.to_string())?;
    row_idx += 1;
    worksheet.write_with_format(row_idx, 0, "Clé / Intitulé", &header_fmt).map_err(|e| e.to_string())?;
    worksheet.write_with_format(row_idx, 1, "Valeur enregistrée", &header_fmt).map_err(|e| e.to_string())?;
    row_idx += 1;

    let mut stmt = conn.prepare("SELECT cle, valeur FROM bien_champs_libres WHERE bien_id = ?1 ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let champs = stmt.query_map(params![bien_id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;

    for champ in champs {
        if let Ok((cle, val)) = champ {
            worksheet.write(row_idx, 0, cle).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 1, val).map_err(|e| e.to_string())?;
            row_idx += 1;
        }
    }

    worksheet.autofit();
    workbook.save(&file_path).map_err(|e| format!("Erreur écriture Fiche_Bien.xlsx: {}", e))?;

    Ok(())
}

/// 2. Suivi_Loyers.xlsx — Historique des paiements de loyer
pub fn sync_suivi_loyers_excel(conn: &Connection, bien_dir: &Path, bien_id: i64) -> Result<(), String> {
    let file_path = get_dated_subfolder_file_path(bien_dir, "07_LOCATION/Quittances de loyer", "Suivi_Loyers");

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Suivi des Loyers").map_err(|e| e.to_string())?;

    let header_fmt = create_header_format();
    let title_fmt = create_title_format();
    let curr_fmt = create_currency_format();
    let total_fmt = create_total_format();

    worksheet.write_with_format(0, 0, "HISTORIQUE ET SUIVI DES LOYERS", &title_fmt).map_err(|e| e.to_string())?;

    let headers = vec![
        "ID Paiement", "Locataire", "Date prévue", "Date réelle",
        "Montant (€)", "Méthode", "Statut", "Quittance / Justificatif", "Notes"
    ];

    for (col, h) in headers.iter().enumerate() {
        worksheet.write_with_format(2, col as u16, *h, &header_fmt).map_err(|e| e.to_string())?;
    }

    let mut stmt = conn.prepare("
        SELECT p.id, l.nom || ' ' || l.prenom, p.date_prevue, p.date_reelle,
               p.montant, p.methode, p.statut, p.fichier_quittance, p.notes
        FROM paiements p
        JOIN baux b ON p.bail_id = b.id
        JOIN locataires l ON b.locataire_id = l.id
        WHERE b.bien_id = ?1
        ORDER BY p.date_prevue DESC
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![bien_id], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, f64>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, Option<String>>(7)?,
            row.get::<_, Option<String>>(8)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut row_idx: u32 = 3;
    let mut count = 0;
    for r in rows {
        if let Ok((id, loc, date_prev, date_reel, mont, methode, statut, fichier, notes)) = r {
            worksheet.write(row_idx, 0, id as f64).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 1, loc).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 2, date_prev).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 3, date_reel.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write_with_format(row_idx, 4, mont, &curr_fmt).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 5, methode.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 6, statut.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 7, fichier.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 8, notes.unwrap_or_default()).map_err(|e| e.to_string())?;
            row_idx += 1;
            count += 1;
        }
    }

    if count > 0 {
        worksheet.write(row_idx, 3, "TOTAL LOYERS").map_err(|e| e.to_string())?;
        let formula = format!("=SUM(E4:E{})", row_idx);
        worksheet.write_formula_with_format(row_idx, 4, Formula::new(formula), &total_fmt).map_err(|e| e.to_string())?;
    }

    worksheet.autofit();
    workbook.save(&file_path).map_err(|e| format!("Erreur écriture Suivi_Loyers.xlsx: {}", e))?;

    Ok(())
}

/// 3. Suivi_Depenses.xlsx — Dépenses ventilées avec formule de total
pub fn sync_suivi_depenses_excel(conn: &Connection, bien_dir: &Path, bien_id: i64) -> Result<(), String> {
    let file_path = get_dated_subfolder_file_path(bien_dir, "04_FISCAL_FINANCIER/Bilans et syntheses", "Suivi_Depenses");

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Suivi des Dépenses").map_err(|e| e.to_string())?;

    let header_fmt = create_header_format();
    let title_fmt = create_title_format();
    let curr_fmt = create_currency_format();
    let total_fmt = create_total_format();

    worksheet.write_with_format(0, 0, "HISTORIQUE ET SUIVI DES DÉPENSES", &title_fmt).map_err(|e| e.to_string())?;

    let headers = vec![
        "ID Dépense", "Date", "Catégorie", "Description",
        "Montant (€)", "Fournisseur", "Justificatif (PDF/Image)"
    ];

    for (col, h) in headers.iter().enumerate() {
        worksheet.write_with_format(2, col as u16, *h, &header_fmt).map_err(|e| e.to_string())?;
    }

    let mut stmt = conn.prepare("
        SELECT id, date, categorie, description, montant, fournisseur, fichier_justificatif
        FROM depenses
        WHERE bien_id = ?1
        ORDER BY date DESC
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![bien_id], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, f64>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<String>>(6)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut row_idx: u32 = 3;
    let mut count = 0;
    for r in rows {
        if let Ok((id, date, cat, desc, mont, fourn, fich)) = r {
            worksheet.write(row_idx, 0, id as f64).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 1, date).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 2, cat.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 3, desc.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write_with_format(row_idx, 4, mont, &curr_fmt).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 5, fourn.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 6, fich.unwrap_or_default()).map_err(|e| e.to_string())?;
            row_idx += 1;
            count += 1;
        }
    }

    if count > 0 {
        worksheet.write(row_idx, 3, "TOTAL DÉPENSES").map_err(|e| e.to_string())?;
        let formula = format!("=SUM(E4:E{})", row_idx);
        worksheet.write_formula_with_format(row_idx, 4, Formula::new(formula), &total_fmt).map_err(|e| e.to_string())?;
    }

    worksheet.autofit();
    workbook.save(&file_path).map_err(|e| format!("Erreur écriture Suivi_Depenses.xlsx: {}", e))?;

    Ok(())
}

/// 4. Locataires_Baux.xlsx — Historique des baux et locataires
pub fn sync_locataires_baux_excel(conn: &Connection, bien_dir: &Path, bien_id: i64) -> Result<(), String> {
    let file_path = get_dated_subfolder_file_path(bien_dir, "07_LOCATION/Bail/Bail_en_cours", "Locataires_Baux");

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Locataires et Baux").map_err(|e| e.to_string())?;

    let header_fmt = create_header_format();
    let title_fmt = create_title_format();
    let curr_fmt = create_currency_format();

    worksheet.write_with_format(0, 0, "HISTORIQUE DES LOCATAIRES ET BAUX", &title_fmt).map_err(|e| e.to_string())?;

    let headers = vec![
        "ID Bail", "Nom Locataire", "Prénom", "Téléphone", "Email",
        "Garant", "Contact Garant", "Date Début", "Date Fin",
        "Loyer Mensuel (€)", "Charges (€)", "Dépôt Garantie (€)", "Statut Caution", "Justificatif Caution",
        "Jour Paiement", "Statut Bail", "Fichier Bail", "Motif Fin", "Notes Clôture"
    ];

    for (col, h) in headers.iter().enumerate() {
        worksheet.write_with_format(2, col as u16, *h, &header_fmt).map_err(|e| e.to_string())?;
    }

    let mut stmt = conn.prepare("
        SELECT b.id, l.nom, l.prenom, l.telephone, l.email,
               l.garant_nom, l.garant_contact, b.date_debut, b.date_fin,
               b.loyer_mensuel, b.charges_mensuelles, b.depot_garantie, b.statut_garantie, b.fichier_caution,
               b.jour_paiement, b.statut, b.fichier_bail, b.motif_fin, b.notes_fin
        FROM baux b
        JOIN locataires l ON b.locataire_id = l.id
        WHERE b.bien_id = ?1
        ORDER BY b.date_debut DESC
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![bien_id], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, String>(7)?,
            row.get::<_, Option<String>>(8)?,
            row.get::<_, f64>(9)?,
            row.get::<_, Option<f64>>(10)?,
            row.get::<_, Option<f64>>(11)?,
            row.get::<_, Option<String>>(12)?,
            row.get::<_, Option<String>>(13)?,
            row.get::<_, Option<i64>>(14)?,
            row.get::<_, Option<String>>(15)?,
            row.get::<_, Option<String>>(16)?,
            row.get::<_, Option<String>>(17)?,
            row.get::<_, Option<String>>(18)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut row_idx: u32 = 3;
    for r in rows {
        if let Ok((
            id, nom, prenom, tel, email, garant, g_contact, d_debut, d_fin,
            loyer, charges, depot, st_garantie, f_caution, jour, statut, fichier,
            m_fin, n_fin
        )) = r {
            worksheet.write(row_idx, 0, id as f64).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 1, nom).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 2, prenom).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 3, tel.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 4, email.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 5, garant.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 6, g_contact.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 7, d_debut).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 8, d_fin.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write_with_format(row_idx, 9, loyer, &curr_fmt).map_err(|e| e.to_string())?;
            worksheet.write_with_format(row_idx, 10, charges.unwrap_or(0.0), &curr_fmt).map_err(|e| e.to_string())?;
            worksheet.write_with_format(row_idx, 11, depot.unwrap_or(0.0), &curr_fmt).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 12, st_garantie.unwrap_or_else(|| "en_attente".to_string())).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 13, f_caution.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 14, (jour.unwrap_or(5)) as f64).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 15, statut.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 16, fichier.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 17, m_fin.unwrap_or_default()).map_err(|e| e.to_string())?;
            worksheet.write(row_idx, 18, n_fin.unwrap_or_default()).map_err(|e| e.to_string())?;
            row_idx += 1;
        }
    }

    worksheet.autofit();
    workbook.save(&file_path).map_err(|e| format!("Erreur écriture Locataires_Baux.xlsx: {}", e))?;

    Ok(())
}

/// 5. Tableau_Amortissement.xlsx — Amortissement LMNP/BIC, déductions temporelles et échéancier 30 ans
pub fn sync_tableau_amortissement_excel(conn: &Connection, bien_dir: &Path, bien_id: i64) -> Result<(), String> {
    let file_path = get_dated_subfolder_file_path(bien_dir, "04_FISCAL_FINANCIER/Credit immobilier - Tableau amortissement", "Tableau_Amortissement");

    let mut workbook = Workbook::new();

    // ── Feuille 1 : Synthèse Amortissements ──
    let sheet1 = workbook.add_worksheet();
    sheet1.set_name("Synthèse Amortissements").map_err(|e| e.to_string())?;

    let header_fmt = create_header_format();
    let title_fmt = create_title_format();
    let currency_fmt = create_currency_format();

    sheet1.write_with_format(0, 0, "PLAN D'AMORTISSEMENT IMMOBILIER & DÉDUCTIONS TEMPORELLES (LMNP / BIC)", &title_fmt).map_err(|e| e.to_string())?;

    // Récupérer les données du bien et champs libres
    let mut map = std::collections::HashMap::new();
    let mut stmt = conn.prepare("SELECT cle, valeur FROM bien_champs_libres WHERE bien_id = ?1").map_err(|e| e.to_string())?;
    let champs = stmt.query_map(params![bien_id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))).map_err(|e| e.to_string())?;
    for c in champs.flatten() {
        map.insert(c.0, c.1);
    }

    let (_nom_bien, _surface): (String, Option<f64>) = conn.query_row(
        "SELECT nom, surface_m2 FROM biens WHERE id = ?1",
        params![bien_id],
        |r| Ok((r.get(0)?, r.get(1)?))
    ).unwrap_or(("Logement".to_string(), None));

    let prix_achat: f64 = map.get("prix_achat").and_then(|v| v.parse().ok()).unwrap_or(150000.0);
    let frais_notaire: f64 = map.get("frais_notaire").and_then(|v| v.parse().ok()).unwrap_or(prix_achat * 0.08);
    let travaux_initiaux: f64 = map.get("travaux_initiaux").and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let part_terrain_pct: f64 = map.get("part_terrain_pct").and_then(|v| v.parse().ok()).unwrap_or(15.0);
    let valeur_mobilier: f64 = map.get("valeur_mobilier").and_then(|v| v.parse().ok()).unwrap_or(5000.0);

    let val_terrain = prix_achat * (part_terrain_pct / 100.0);
    let val_construction = prix_achat - val_terrain;
    let total_revient = prix_achat + frais_notaire + travaux_initiaux;

    let duree_construction: u32 = 30;
    let duree_notaire: u32 = 5;
    let duree_travaux: u32 = 10;
    let duree_mobilier: u32 = 7;

    let dot_const_annuelle = val_construction / (duree_construction as f64);
    let dot_notaire_annuelle = frais_notaire / (duree_notaire as f64);
    let dot_travaux_annuelle = if travaux_initiaux > 0.0 { travaux_initiaux / (duree_travaux as f64) } else { 0.0 };
    let dot_mobilier_annuelle = if valeur_mobilier > 0.0 { valeur_mobilier / (duree_mobilier as f64) } else { 0.0 };

    sheet1.write_with_format(2, 0, "Paramètre", &header_fmt).map_err(|e| e.to_string())?;
    sheet1.write_with_format(2, 1, "Valeur / Base", &header_fmt).map_err(|e| e.to_string())?;
    sheet1.write_with_format(2, 2, "Durée", &header_fmt).map_err(|e| e.to_string())?;
    sheet1.write_with_format(2, 3, "Dotation Annuelle (€/an)", &header_fmt).map_err(|e| e.to_string())?;

    let rows_data = vec![
        ("Prix d'achat global", prix_achat, "—", 0.0),
        ("Terrain (non amortissable)", val_terrain, "Infinie", 0.0),
        ("Bâtiment / Construction", val_construction, "30 ans", dot_const_annuelle),
        ("Frais de notaire & d'acquisition", frais_notaire, "5 ans", dot_notaire_annuelle),
        ("Travaux & Aménagements initiaux", travaux_initiaux, "10 ans", dot_travaux_annuelle),
        ("Mobilier & Équipements", valeur_mobilier, "7 ans", dot_mobilier_annuelle),
        ("PRIX DE REVIENT TOTAL", total_revient, "—", dot_const_annuelle + dot_notaire_annuelle + dot_travaux_annuelle + dot_mobilier_annuelle),
    ];

    for (idx, (label, base, duree, dot)) in rows_data.into_iter().enumerate() {
        let r = (idx + 3) as u32;
        sheet1.write(r, 0, label).map_err(|e| e.to_string())?;
        sheet1.write_with_format(r, 1, base, &currency_fmt).map_err(|e| e.to_string())?;
        sheet1.write(r, 2, duree).map_err(|e| e.to_string())?;
        sheet1.write_with_format(r, 3, dot, &currency_fmt).map_err(|e| e.to_string())?;
    }

    sheet1.autofit();

    // ── Feuille 2 : Échéancier 30 Ans ──
    let sheet2 = workbook.add_worksheet();
    sheet2.set_name("Échéancier 30 Ans").map_err(|e| e.to_string())?;

    sheet2.write_with_format(0, 0, "ÉCHÉANCIER DÉTAILLÉ DE L'AMORTISSEMENT SUR 30 ANS", &title_fmt).map_err(|e| e.to_string())?;

    let headers = vec![
        "Année", "Amort. Construction (€)", "Amort. Notaire (€)", "Amort. Travaux (€)",
        "Amort. Mobilier (€)", "Amort. Total Annuel (€)", "Amortissements Cumulés (€)", "VNC Restante (€)"
    ];

    for (col, h) in headers.into_iter().enumerate() {
        sheet2.write_with_format(2, col as u16, h, &header_fmt).map_err(|e| e.to_string())?;
    }

    let mut cumul: f64 = 0.0;
    let mut vnc: f64 = val_construction + frais_notaire + travaux_initiaux + valeur_mobilier;

    for y in 1..=30 {
        let r = (y + 2) as u32;
        let const_a = dot_const_annuelle;
        let notaire_a = if y <= duree_notaire { dot_notaire_annuelle } else { 0.0 };
        let travaux_a = if y <= duree_travaux { dot_travaux_annuelle } else { 0.0 };
        let mob_a = if y <= duree_mobilier { dot_mobilier_annuelle } else { 0.0 };

        let total_an = const_a + notaire_a + travaux_a + mob_a;
        cumul += total_an;
        vnc = (vnc - total_an).max(0.0);

        sheet2.write(r, 0, format!("Année {}", y)).map_err(|e| e.to_string())?;
        sheet2.write_with_format(r, 1, const_a, &currency_fmt).map_err(|e| e.to_string())?;
        sheet2.write_with_format(r, 2, notaire_a, &currency_fmt).map_err(|e| e.to_string())?;
        sheet2.write_with_format(r, 3, travaux_a, &currency_fmt).map_err(|e| e.to_string())?;
        sheet2.write_with_format(r, 4, mob_a, &currency_fmt).map_err(|e| e.to_string())?;
        sheet2.write_with_format(r, 5, total_an, &currency_fmt).map_err(|e| e.to_string())?;
        sheet2.write_with_format(r, 6, cumul, &currency_fmt).map_err(|e| e.to_string())?;
        sheet2.write_with_format(r, 7, vnc, &currency_fmt).map_err(|e| e.to_string())?;
    }

    sheet2.autofit();

    workbook.save(&file_path).map_err(|e| format!("Erreur écriture Tableau_Amortissement.xlsx: {}", e))?;

    Ok(())
}

/// Générateur par questionnaire d'un modèle Excel style comptable
pub fn generate_questionnaire_excel(
    base_dir: &PathBuf,
    bien_dir_rel: &str,
    filename: &str,
    title: &str,
    headers: Vec<String>,
    sample_rows: Vec<Vec<String>>,
    has_totals: bool,
    _has_cumul: bool,
) -> Result<String, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    // Déterminer si le nom de fichier comporte un sous-dossier
    let (subfolder, raw_name) = if filename.contains('/') || filename.contains('\\') {
        let normalized = filename.replace('\\', "/");
        let parts: Vec<&str> = normalized.split('/').collect();
        (parts[0..parts.len() - 1].join("/"), parts[parts.len() - 1].to_string())
    } else {
        ("04_FISCAL_FINANCIER".to_string(), filename.to_string())
    };

    let target_dir = base_dir.join(bien_dir_rel).join(&subfolder);
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    }

    let clean_name = if raw_name.ends_with(".xlsx") {
        raw_name.clone()
    } else {
        format!("{}.xlsx", raw_name)
    };

    // Préfixer avec la date du jour si le nom ne commence pas déjà par YYYY-MM-DD
    let is_already_dated = clean_name.len() >= 10 && clean_name.chars().take(10).filter(|c| *c == '-').count() == 2;
    let final_filename = if is_already_dated {
        clean_name
    } else {
        format!("{}_{}", today, clean_name)
    };

    let file_path = target_dir.join(&final_filename);

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_fmt = create_header_format();
    let title_fmt = create_title_format();
    let curr_fmt = create_currency_format();
    let total_fmt = create_total_format();

    worksheet.write_with_format(0, 0, title.to_uppercase(), &title_fmt).map_err(|e| e.to_string())?;

    for (col, h) in headers.iter().enumerate() {
        worksheet.write_with_format(2, col as u16, h.as_str(), &header_fmt).map_err(|e| e.to_string())?;
    }

    let mut row_idx: u32 = 3;
    for row in sample_rows {
        for (col, val) in row.iter().enumerate() {
            if let Ok(num) = val.parse::<f64>() {
                worksheet.write_with_format(row_idx, col as u16, num, &curr_fmt).map_err(|e| e.to_string())?;
            } else {
                worksheet.write(row_idx, col as u16, val.as_str()).map_err(|e| e.to_string())?;
            }
        }
        row_idx += 1;
    }

    if has_totals && row_idx > 3 {
        let last_data_row = row_idx;
        worksheet.write(row_idx, 0, "TOTAUX").map_err(|e| e.to_string())?;
        for col in 1..headers.len() {
            let col_letter = (b'A' + col as u8) as char;
            let formula = format!("=SUM({}4:{}{})", col_letter, col_letter, last_data_row);
            worksheet.write_formula_with_format(row_idx, col as u16, Formula::new(formula), &total_fmt).map_err(|e| e.to_string())?;
        }
    }

    worksheet.autofit();
    workbook.save(&file_path).map_err(|e| format!("Impossible de créer le modèle Excel: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Helper pour chercher un fichier Excel correspondant à un motif à la racine ou dans un sous-dossier
fn find_excel_file_in_folder(folder: &Path, keyword: &str) -> Option<PathBuf> {
    if let Ok(entries) = std::fs::read_dir(folder) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.file_name().unwrap_or_default().to_string_lossy().contains(keyword) {
                return Some(path);
            }
            if path.is_dir() {
                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if sub_path.is_file() && sub_path.file_name().unwrap_or_default().to_string_lossy().contains(keyword) {
                            return Some(sub_path);
                        }
                    }
                }
            }
        }
    }
    None
}

/// Scanner & Importer d'un dossier bien externe vers la DB SQLite
pub fn import_property_from_folder(conn: &Connection, folder_path: &Path) -> Result<i64, String> {
    if !folder_path.exists() || !folder_path.is_dir() {
        return Err("Le dossier spécifié n'existe pas ou n'est pas un répertoire valide.".to_string());
    }

    let folder_name = folder_path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "BIEN_IMPORTE".to_string());

    // 1. Lire Fiche_Bien.xlsx s'il existe
    let fiche_path_opt = find_excel_file_in_folder(folder_path, "Fiche_Bien");
    let mut nom_bien = folder_name.clone();
    let mut adresse = None;
    let mut type_bien = Some("location".to_string());
    let mut statut = Some("en_cours".to_string());
    let mut surface = None;

    if let Some(fiche_path) = fiche_path_opt {
        if let Ok(mut excel) = open_workbook::<Xlsx<_>, _>(&fiche_path) {
            if let Ok(range) = excel.worksheet_range("Fiche du bien") {
                for row in range.rows() {
                    if row.len() >= 2 {
                        let label = row[0].get_string().unwrap_or_default().trim().to_string();
                        let val = row[1].get_string().unwrap_or_default().trim().to_string();
                        match label.as_str() {
                            "Nom du bien" if !val.is_empty() => nom_bien = val.to_string(),
                            "Adresse complète" if !val.is_empty() => adresse = Some(val.to_string()),
                            "Type de bien" if !val.is_empty() => type_bien = Some(val.to_string()),
                            "Statut d'occupation" if !val.is_empty() => statut = Some(val.to_string()),
                            s if s.starts_with("Surface") => {
                                let cleaned = val.replace("m²", "").trim().to_string();
                                surface = cleaned.parse::<f64>().ok();
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    // Insérer ou mettre à jour le Bien
    let rel_path = format!("biens_data/{}", folder_name);
    conn.execute(
        "INSERT INTO biens (nom, adresse, type_bien, statut, chemin_dossier, surface_m2)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![nom_bien, adresse, type_bien, statut, rel_path, surface],
    ).map_err(|e| format!("Erreur création bien en DB: {}", e))?;

    let bien_id = conn.last_insert_rowid();

    // 2. Importer Locataires_Baux.xlsx s'il existe
    let baux_path_opt = find_excel_file_in_folder(folder_path, "Locataires_Baux");
    if let Some(baux_path) = baux_path_opt {
        if let Ok(mut excel) = open_workbook::<Xlsx<_>, _>(&baux_path) {
            if let Ok(range) = excel.worksheet_range("Locataires et Baux") {
                for (idx, row) in range.rows().enumerate() {
                    if idx < 3 || row.len() < 10 { continue; } // passer l'en-tête
                    let nom = row[1].get_string().unwrap_or_default();
                    let prenom = row[2].get_string().unwrap_or_default();
                    if nom.is_empty() { continue; }

                    let tel = row[3].get_string();
                    let email = row[4].get_string();
                    let d_debut = row[7].get_string().unwrap_or("2026-01-01");
                    let d_fin = row[8].get_string();
                    let loyer = row[9].get_float().unwrap_or(500.0);
                    let charges = row[10].get_float().unwrap_or(0.0);
                    let depot = row[11].get_float().unwrap_or(0.0);

                    // Insérer locataire
                    conn.execute(
                        "INSERT INTO locataires (nom, prenom, telephone, email) VALUES (?1, ?2, ?3, ?4)",
                        params![nom, prenom, tel, email],
                    ).ok();
                    let loc_id = conn.last_insert_rowid();

                    // Insérer bail
                    conn.execute(
                        "INSERT INTO baux (bien_id, locataire_id, date_debut, date_fin, loyer_mensuel, charges_mensuelles, depot_garantie)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                        params![bien_id, loc_id, d_debut, d_fin, loyer, charges, depot],
                    ).ok();
                }
            }
        }
    }

    Ok(bien_id)
}

