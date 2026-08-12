use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bien {
    pub id: Option<i64>,
    pub nom: String,
    pub adresse: Option<String>,
    pub type_bien: Option<String>,
    pub statut: Option<String>,
    pub chemin_dossier: Option<String>,
    pub email_dedie: Option<String>,
    pub date_acquisition: Option<String>,
    pub surface_m2: Option<f64>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BienCreationResult {
    pub id: i64,
    pub chemin_dossier: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BienFileItem {
    pub doc_id: Option<i64>,
    pub filename: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub subfolder: String,
    pub size_bytes: u64,
    pub modified_at: String,
    pub type_doc: Option<String>,
    pub date_document: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilePreviewData {
    pub mime_type: String,
    pub base64_data: String,
    pub text_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub modified_at: String,
    pub children: Vec<FileNode>,
    pub doc_id: Option<i64>,
    pub type_doc: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Locataire {
    pub id: Option<i64>,
    pub nom: String,
    pub prenom: String,
    pub telephone: Option<String>,
    pub email: Option<String>,
    pub garant_nom: Option<String>,
    pub garant_contact: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub bien_id: Option<i64>,
    pub bien_nom: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bail {
    pub id: Option<i64>,
    pub bien_id: i64,
    pub locataire_id: i64,
    pub date_debut: String,
    pub date_fin: Option<String>,
    pub loyer_mensuel: f64,
    pub charges_mensuelles: Option<f64>,
    pub depot_garantie: Option<f64>,
    pub statut_garantie: Option<String>,
    pub fichier_caution: Option<String>,
    pub jour_paiement: Option<i64>,
    pub statut: Option<String>,
    pub fichier_bail: Option<String>,
    pub created_at: Option<String>,
    pub bien_nom: Option<String>,
    pub locataire_nom: Option<String>,
    pub locataire_prenom: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocataireStats {
    pub locataire_id: i64,
    pub total_encaisse: f64,
    pub total_du: f64,
    pub impayes_count: i64,
    pub taux_regularite: f64,
    pub total_depot_garantie: f64,
    pub statut_caution_resume: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Paiement {
    pub id: Option<i64>,
    pub bail_id: i64,
    pub date_prevue: String,
    pub date_reelle: Option<String>,
    pub montant: f64,
    pub methode: Option<String>,
    pub statut: Option<String>,
    pub fichier_quittance: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub bien_nom: Option<String>,
    pub locataire_nom: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Depense {
    pub id: Option<i64>,
    pub bien_id: i64,
    pub date: String,
    pub categorie: Option<String>,
    pub description: Option<String>,
    pub montant: f64,
    pub fournisseur: Option<String>,
    pub fichier_justificatif: Option<String>,
    pub created_at: Option<String>,
    pub bien_nom: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: Option<i64>,
    pub bien_id: i64,
    pub type_doc: Option<String>,
    pub sous_categorie: Option<String>,
    pub chemin_fichier: String,
    pub date_ajout: Option<String>,
    pub date_document: Option<String>,
    pub notes: Option<String>,
    pub bien_nom: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Maintenance {
    pub id: Option<i64>,
    pub bien_id: i64,
    pub titre: String,
    pub description: Option<String>,
    pub priorite: Option<String>,
    pub statut: Option<String>,
    pub date_signalement: Option<String>,
    pub date_resolution: Option<String>,
    pub cout: Option<f64>,
    pub prestataire: Option<String>,
    pub bien_nom: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_biens: i64,
    pub biens_en_location: i64,
    pub loyers_mois: f64,
    pub loyers_payes: f64,
    pub loyers_impayes: i64,
    pub depenses_mois: f64,
    pub tickets_ouverts: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BienChampLibre {
    pub id: Option<i64>,
    pub bien_id: i64,
    pub cle: String,
    pub valeur: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BienChampLibreItem {
    pub cle: String,
    pub valeur: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BienEmailConfig {
    pub bien_id: i64,
    pub email_adresse: String,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    pub imap_host: Option<String>,
    pub imap_port: Option<i32>,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<i32>,
    pub use_ssl: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelSheetPreview {
    pub rows: Vec<Vec<String>>,
    pub sheet_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcelSheetFullPreview {
    pub rows: Vec<Vec<String>>,
    pub sheet_name: String,
    pub sheet_names: Vec<String>,
    pub total_rows: usize,
    pub total_cols: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SheetSaveData {
    pub sheet_name: String,
    pub rows: Vec<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WizardInitialDoc {
    pub subfolder: String,
    pub source_path: String,
    pub type_doc: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WizardPayload {
    pub bien: Bien,
    pub locataire: Option<Locataire>,
    pub bail: Option<Bail>,
    pub documents: Vec<WizardInitialDoc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResultItem {
    pub category: String,
    pub title: String,
    pub subtitle: String,
    pub target_page: String,
    pub param: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailAttachment {
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: usize,
    pub base64_data: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FetchedEmail {
    pub uid: u32,
    pub date: String,
    pub from: String,
    pub subject: String,
    pub body_text: String,
    pub body_html: Option<String>,
    pub attachments: Vec<EmailAttachment>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SendEmailAttachment {
    pub filename: String,
    pub mime_type: String,
    pub base64_data: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Candidature {
    pub id: Option<i64>,
    pub bien_id: Option<i64>,
    pub nom: String,
    pub prenom: String,
    pub email: Option<String>,
    pub telephone: Option<String>,
    pub revenus_mensuels: Option<f64>,
    pub statut: Option<String>,
    pub garant_nom: Option<String>,
    pub garant_contact: Option<String>,
    pub notes: Option<String>,
    pub fichier_dossier: Option<String>,
    pub created_at: Option<String>,
    pub bien_nom: Option<String>,
}
