use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::Manager;

#[allow(dead_code)]
pub const FCS_STUDIO_MARKER: &str = "FlowCreativeStudio::Flow";

pub const DEFAULT_FOLDER_HIERARCHY: &[&str] = &[
    "00_ACHAT-VENTE/Annonce - Photos",
    "00_ACHAT-VENTE/Plans",
    "00_ACHAT-VENTE/Compromis de vente",
    "00_ACHAT-VENTE/Correspondances agence - notaire",
    "00_ACHAT-VENTE/Offres recues",
    "01_ADMINISTRATIF/Justificatifs domicile",
    "01_ADMINISTRATIF/Livret de famille - Pieces identite",
    "01_ADMINISTRATIF/Titre de propriete",
    "02_DIAGNOSTICS_DDT",
    "03_COPROPRIETE/Charges",
    "03_COPROPRIETE/PV Assemblees generales",
    "03_COPROPRIETE/Reglement copropriete",
    "04_FISCAL_FINANCIER/Attestations bancaires",
    "04_FISCAL_FINANCIER/Credit immobilier - Tableau amortissement",
    "04_FISCAL_FINANCIER/Regime fiscal",
    "04_FISCAL_FINANCIER/Revenus fonciers",
    "04_FISCAL_FINANCIER/Taxe fonciere",
    "04_FISCAL_FINANCIER/Taxe habitation",
    "05_TRAVAUX/Factures travaux/Chauffage",
    "05_TRAVAUX/Factures travaux/Electricite",
    "05_TRAVAUX/Factures travaux/Plomberie",
    "05_TRAVAUX/Factures travaux/Toiture",
    "05_TRAVAUX/Certificats conformite",
    "05_TRAVAUX/Garanties - Assurances decennales",
    "05_TRAVAUX/Permis de construire - Declarations",
    "06_ENERGIE_CONTRATS/Assurance habitation",
    "06_ENERGIE_CONTRATS/Contrats entretien",
    "06_ENERGIE_CONTRATS/Factures eau",
    "06_ENERGIE_CONTRATS/Factures electricite",
    "06_ENERGIE_CONTRATS/Factures gaz",
    "07_LOCATION/Bail/Baux_anciens",
    "07_LOCATION/Bail/Bail_en_cours",
    "07_LOCATION/Etat des lieux/Entree",
    "07_LOCATION/Etat des lieux/Sortie",
    "07_LOCATION/Locataires/Caution - Garant",
    "07_LOCATION/Locataires/Correspondances",
    "07_LOCATION/Locataires/Dossier candidature",
    "07_LOCATION/Assurance PNO",
    "07_LOCATION/Depot de garantie",
    "07_LOCATION/Quittances de loyer",
    "08_DIVERS",
];

/// Retourne le dossier racine où sont stockées la DB et les données des biens.
pub fn get_base_dir(app: &tauri::AppHandle) -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    #[cfg(debug_assertions)]
    {
        let data_dir = app.path().app_data_dir().unwrap_or(exe_dir.clone());
        std::fs::create_dir_all(&data_dir).ok();
        data_dir
    }
    #[cfg(not(debug_assertions))]
    {
        exe_dir
    }
}

/// Retourne le chemin vers le fichier SQLite.
pub fn get_db_path(app: &tauri::AppHandle) -> PathBuf {
    get_base_dir(app).join("lepuits.db")
}

/// Normalise un nom de bien pour créer un nom de dossier propre
pub fn normalize_folder_name(name: &str) -> String {
    let unaccented = name
        .chars()
        .map(|c| match c {
            'à' | 'â' | 'ä' | 'À' | 'Â' | 'Ä' => 'A',
            'é' | 'è' | 'ê' | 'ë' | 'É' | 'È' | 'Ê' | 'Ë' => 'E',
            'î' | 'ï' | 'Î' | 'Ï' => 'I',
            'ô' | 'ö' | 'Ô' | 'Ö' => 'O',
            'ù' | 'û' | 'ü' | 'Ù' | 'Û' | 'Ü' => 'U',
            'ç' | 'Ç' => 'C',
            _ => c,
        })
        .collect::<String>();

    let cleaned: String = unaccented
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_uppercase();

    if cleaned.is_empty() {
        "BIEN_UNNAMED".to_string()
    } else {
        cleaned
    }
}

/// Crée l'arborescence physique complète d'un bien dans `biens_data/[NOM_NORMALISE]/`
pub fn create_property_folder_tree(
    base_dir: &PathBuf,
    bien_name: &str,
) -> std::io::Result<(String, PathBuf)> {
    let biens_root = base_dir.join("biens_data");
    std::fs::create_dir_all(&biens_root)?;

    let base_normalized = normalize_folder_name(bien_name);
    let mut folder_name = base_normalized.clone();
    let mut target_dir = biens_root.join(&folder_name);

    let mut counter = 1;
    while target_dir.exists() {
        folder_name = format!("{}_{}", base_normalized, counter);
        target_dir = biens_root.join(&folder_name);
        counter += 1;
    }

    std::fs::create_dir_all(&target_dir)?;

    for sub in DEFAULT_FOLDER_HIERARCHY {
        std::fs::create_dir_all(target_dir.join(sub))?;
    }

    let relative_path = format!("biens_data/{}", folder_name);
    Ok((relative_path, target_dir))
}

/// Ouvre la connexion SQLite et active les foreign keys
pub fn open_connection(path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
    Ok(conn)
}

/// Crée toutes les tables si elles n'existent pas encore (migration initiale)
pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        BEGIN;

        CREATE TABLE IF NOT EXISTS biens (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            nom              TEXT    NOT NULL,
            adresse          TEXT,
            type_bien        TEXT    CHECK(type_bien IN ('location','residence_principale','secondaire')),
            statut           TEXT    CHECK(statut IN ('en_cours','en_vente','vendu')) DEFAULT 'en_cours',
            chemin_dossier   TEXT,
            email_dedie      TEXT,
            date_acquisition TEXT,
            surface_m2       REAL,
            notes            TEXT,
            created_at       TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS locataires (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            nom             TEXT    NOT NULL,
            prenom          TEXT    NOT NULL,
            telephone       TEXT,
            email           TEXT,
            garant_nom      TEXT,
            garant_contact  TEXT,
            notes           TEXT,
            created_at      TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS baux (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            bien_id             INTEGER NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
            locataire_id        INTEGER NOT NULL REFERENCES locataires(id),
            date_debut          TEXT    NOT NULL,
            date_fin            TEXT,
            loyer_mensuel       REAL    NOT NULL,
            charges_mensuelles  REAL    DEFAULT 0,
            depot_garantie      REAL    DEFAULT 0,
            jour_paiement       INTEGER DEFAULT 5,
            statut              TEXT    CHECK(statut IN ('actif','termine','resilie')) DEFAULT 'actif',
            fichier_bail        TEXT,
            created_at          TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS paiements (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            bail_id           INTEGER NOT NULL REFERENCES baux(id) ON DELETE CASCADE,
            date_prevue       TEXT    NOT NULL,
            date_reelle       TEXT,
            montant           REAL    NOT NULL,
            methode           TEXT    CHECK(methode IN ('virement','cheque','especes','prelevement')),
            statut            TEXT    CHECK(statut IN ('paye','en_retard','impaye','partiel')) DEFAULT 'impaye',
            fichier_quittance TEXT,
            notes             TEXT,
            created_at        TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS depenses (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            bien_id              INTEGER NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
            date                 TEXT    NOT NULL,
            categorie            TEXT    CHECK(categorie IN ('travaux','energie','assurance','taxe','entretien','frais_gestion','autre')),
            description          TEXT,
            montant              REAL    NOT NULL,
            fournisseur          TEXT,
            fichier_justificatif TEXT,
            created_at           TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS documents (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            bien_id        INTEGER NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
            type_doc       TEXT    CHECK(type_doc IN ('diagnostic','facture','bail','assurance','photo','vente','autre')),
            sous_categorie TEXT,
            chemin_fichier TEXT    NOT NULL,
            date_ajout     TEXT    DEFAULT (datetime('now')),
            date_document  TEXT,
            notes          TEXT
        );

        CREATE TABLE IF NOT EXISTS maintenance (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            bien_id           INTEGER NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
            titre             TEXT    NOT NULL,
            description       TEXT,
            priorite          TEXT    CHECK(priorite IN ('urgent','normal','faible')) DEFAULT 'normal',
            statut            TEXT    CHECK(statut IN ('ouvert','en_cours','resolu')) DEFAULT 'ouvert',
            date_signalement  TEXT    DEFAULT (datetime('now')),
            date_resolution   TEXT,
            cout              REAL,
            prestataire       TEXT
        );

        CREATE TABLE IF NOT EXISTS bien_champs_libres (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            bien_id    INTEGER NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
            cle        TEXT    NOT NULL,
            valeur     TEXT    NOT NULL,
            created_at TEXT    DEFAULT (datetime('now'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_bien_champs_libres_cle ON bien_champs_libres(bien_id, cle);

        CREATE TABLE IF NOT EXISTS bien_email_config (
            bien_id        INTEGER PRIMARY KEY REFERENCES biens(id) ON DELETE CASCADE,
            email_adresse  TEXT    NOT NULL,
            imap_host      TEXT,
            imap_port      INTEGER,
            smtp_host      TEXT,
            smtp_port      INTEGER,
            use_ssl        INTEGER DEFAULT 1,
            created_at     TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS candidatures (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            bien_id            INTEGER REFERENCES biens(id) ON DELETE CASCADE,
            nom                TEXT    NOT NULL,
            prenom             TEXT    NOT NULL,
            email              TEXT,
            telephone          TEXT,
            revenus_mensuels   REAL,
            statut             TEXT    CHECK(statut IN ('nouveau','retenu','refuse','converti')) DEFAULT 'nouveau',
            garant_nom         TEXT,
            garant_contact     TEXT,
            notes              TEXT,
            fichier_dossier    TEXT,
            created_at         TEXT    DEFAULT (datetime('now'))
        );

        COMMIT;
    ")?;
    Ok(())
}
