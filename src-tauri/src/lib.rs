// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
pub mod models;
pub mod commands;
mod excel;

use std::sync::Mutex;
use rusqlite::Connection;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let db_path = db::get_db_path(app.handle());
            let conn = db::open_connection(&db_path)
                .expect("Impossible d'ouvrir la base de données SQLite");
            db::run_migrations(&conn)
                .expect("Échec de la migration de la base de données");

            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Commandes Biens
            commands::biens::get_biens,
            commands::biens::create_bien,
            commands::biens::update_bien,
            commands::biens::delete_bien,
            commands::biens::copy_file_to_bien,
            commands::biens::open_file_path,
            commands::biens::get_file_preview,
            commands::biens::read_excel_file_preview,
            commands::biens::read_excel_sheet,
            commands::biens::save_excel_file,
            commands::biens::save_bien_email_config,
            commands::biens::get_bien_email_config,
            commands::biens::clear_bien_email_config,
            commands::biens::scan_bien_directory,
            commands::biens::list_bien_files,
            commands::biens::delete_document_file,
            commands::biens::delete_file_by_path,
            commands::biens::rename_document_file,
            commands::biens::move_file_to_subfolder,
            commands::biens::get_bien_champs_libres,
            commands::biens::save_bien_champ_libre,
            commands::biens::save_bien_champs_libres_batch,
            commands::biens::delete_bien_champ_libre,
            commands::biens::create_bien_wizard,
            commands::biens::sync_bien_excel,
            commands::biens::import_bien_folder,
            commands::biens::generate_questionnaire_excel,

            // Commandes Locataires & Baux
            commands::locataires::get_locataires,
            commands::locataires::create_locataire,
            commands::locataires::update_locataire,
            commands::locataires::delete_locataire,
            commands::locataires::get_baux,
            commands::locataires::create_bail,
            commands::locataires::update_bail,
            commands::locataires::delete_bail,
            commands::locataires::terminate_bail,
            commands::locataires::get_locataire_stats,
            commands::locataires::get_candidatures,
            commands::locataires::create_candidature,
            commands::locataires::update_candidature,
            commands::locataires::update_candidature_statut,
            commands::locataires::delete_candidature,

            // Commandes Paiements & Loyers
            commands::paiements::get_paiements,
            commands::paiements::create_paiement,
            commands::paiements::update_paiement,
            commands::paiements::delete_paiement,
            commands::paiements::attach_quittance_to_paiement,

            // Commandes Dépenses
            commands::depenses::get_depenses,
            commands::depenses::create_depense,
            commands::depenses::update_depense,
            commands::depenses::delete_depense,

            // Commandes Documents
            commands::documents::get_documents,
            commands::documents::create_document,
            commands::documents::delete_document,

            // Commandes Maintenance
            commands::maintenance::get_maintenance,
            commands::maintenance::create_maintenance,
            commands::maintenance::update_maintenance,
            commands::maintenance::delete_maintenance,

            // Commandes Dashboard & Recherche
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::global_search,

            // Commandes Mail & OAuth
            commands::mail::fetch_emails,
            commands::mail::send_email,
            commands::mail::open_external_url,
            commands::mail::start_google_oauth,
            commands::mail::save_email_attachment_to_bien,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du démarrage de l'application LePuits");
}
