use rusqlite::params;
use tauri::State;
use crate::AppState;
use crate::models::*;
use mail_parser::MimeHeaders;
use base64::Engine;

const GOOGLE_CLIENT_ID: &str = "1098485292358-00000000000000000000000000000000.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET: &str = "GOCSPX-0000000000000000000000000000";

struct GmailXoauth2Authenticator {
    user: String,
    access_token: String,
}

impl imap::Authenticator for GmailXoauth2Authenticator {
    type Response = String;
    fn process(&self, _challenge: &[u8]) -> Self::Response {
        format!("user={}\x01auth=Bearer {}\x01\x01", self.user, self.access_token)
    }
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL invalide: doit commencer par http:// ou https://".to_string());
    }

    open::that(&url).map_err(|e| format!("Erreur d'ouverture du navigateur: {}", e))?;

    Ok(())
}

pub fn refresh_gmail_token(token_val: &str) -> Result<String, String> {
    if token_val.starts_with("oauth2_token:") {
        return Ok(token_val[13..].to_string());
    }
    
    let raw = if token_val.starts_with("oauth2:") {
        &token_val[7..]
    } else {
        token_val
    };

    let parts: Vec<&str> = raw.splitn(3, '|').collect();
    let (client_id, client_secret, refresh_token) = if parts.len() == 3 {
        (parts[0], parts[1], parts[2])
    } else {
        (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, raw)
    };

    let res = ureq::post("https://oauth2.googleapis.com/token")
        .send_form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .map_err(|e| format!("Erreur rafraîchissement token Google: {}", e))?;

    let json: serde_json::Value = res.into_json().map_err(|e| e.to_string())?;
    if let Some(token) = json["access_token"].as_str() {
        Ok(token.to_string())
    } else {
        Err(format!("Réponse Google invalide lors du rafraîchissement token: {:?}", json))
    }
}



#[tauri::command]
pub fn start_google_oauth(
    state: State<AppState>,
    bien_id: i64,
    custom_client_id: Option<String>,
    custom_client_secret: Option<String>,
) -> Result<String, String> {
    use std::net::TcpListener;
    use std::io::{Read, Write};

    let cid = custom_client_id
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or(GOOGLE_CLIENT_ID);

    let csec = custom_client_secret
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or(GOOGLE_CLIENT_SECRET);

    // 1. Lancer l'écouteur TCP local
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Impossible de lancer le serveur local de redirection: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_uri = format!("http://127.0.0.1:{}", port);

    // 2. Construction de l'URL Google OAuth
    let scope = "https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email";
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        urlencoding::encode(cid),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(scope)
    );

    // 3. Ouvrir le navigateur Web
    open_external_url(auth_url.clone())?;

    // 4. Attendre la redirection Google dans le navigateur
    listener.set_nonblocking(false).ok();
    let (mut stream, _) = listener.accept()
        .map_err(|e| format!("Erreur attente connexion navigateur: {}", e))?;
    stream.set_read_timeout(Some(std::time::Duration::from_secs(60))).ok();
    stream.set_write_timeout(Some(std::time::Duration::from_secs(10))).ok();

    let mut buffer = [0u8; 2048];
    let bytes_read = stream.read(&mut buffer).unwrap_or(0);
    let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);

    let first_line = request_str.lines().next().unwrap_or_default();
    let code = if let Some(start) = first_line.find("code=") {
        let after = &first_line[start + 5..];
        let end = after.find('&').or_else(|| after.find(' ')).unwrap_or(after.len());
        after[..end].to_string()
    } else {
        let err_html = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<html><body><h2>Erreur d'autorisation Google.</h2></body></html>";
        stream.write_all(err_html.as_bytes()).ok();
        return Err("Autorisation Google annulée ou code non reçu.".to_string());
    };

    let success_html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n<!DOCTYPE html><html><head><meta charset='utf-8'><title>Succès</title></head><body style='font-family:system-ui,sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f8fafc;'><h1 style='color:#4ade80;'>✅ Connexion Google réussie !</h1><p style='font-size:18px;'>Votre compte Gmail est associé à LePuits.</p><p style='color:#94a3b8;'>Vous pouvez fermer cette fenêtre et revenir sur l'application.</p><script>setTimeout(() => window.close(), 2500);</script></body></html>";
    stream.write_all(success_html.as_bytes()).ok();
    stream.flush().ok();

    // 5. Échanger le code contre un refresh_token & access_token
    let token_res = ureq::post("https://oauth2.googleapis.com/token")
        .send_form(&[
            ("client_id", cid),
            ("client_secret", csec),
            ("code", &code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", &redirect_uri),
        ])
        .map_err(|e| format!("Échec d'échange de jeton Google: {}", e))?;

    let token_json: serde_json::Value = token_res.into_json().map_err(|e| e.to_string())?;
    let access_token = token_json["access_token"].as_str()
        .ok_or_else(|| "Pas d'access_token dans la réponse Google".to_string())?;
    let refresh_token = token_json["refresh_token"].as_str().unwrap_or_default();

    // 6. Récupérer l'adresse email depuis Google UserInfo API
    let user_res = ureq::get("https://www.googleapis.com/oauth2/v2/userinfo")
        .set("Authorization", &format!("Bearer {}", access_token))
        .call()
        .map_err(|e| format!("Impossible de récupérer les infos compte Google: {}", e))?;

    let user_json: serde_json::Value = user_res.into_json().map_err(|e| e.to_string())?;
    let email_adresse = user_json["email"].as_str()
        .ok_or_else(|| "Impossible d'obtenir l'adresse email Google".to_string())?;

    // 7. Enregistrer dans la base de données
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO bien_email_config (bien_id, email_adresse, imap_host, imap_port, smtp_host, smtp_port, use_ssl)
         VALUES (?1, ?2, 'imap.gmail.com', 993, 'smtp.gmail.com', 465, 1)
         ON CONFLICT(bien_id) DO UPDATE SET
           email_adresse = excluded.email_adresse,
           imap_host = 'imap.gmail.com',
           imap_port = 993,
           smtp_host = 'smtp.gmail.com',
           smtp_port = 465,
           use_ssl = 1",
        params![bien_id, email_adresse],
    ).map_err(|e| e.to_string())?;

    // 8. Stocker le token dans Keyring avec les identifiants client
    let entry = keyring::Entry::new("lepuits", &format!("bien_email:{}", bien_id))
        .map_err(|e| format!("Erreur keyring: {}", e))?;

    let stored_token = if !refresh_token.is_empty() {
        format!("oauth2:{}|{}|{}", cid, csec, refresh_token)
    } else {
        format!("oauth2_token:{}", access_token)
    };
    entry.set_password(&stored_token).map_err(|e| format!("Erreur enregistrement clé sécurisée: {}", e))?;

    Ok(email_adresse.to_string())
}

fn parse_raw_email(uid: u32, raw_bytes: &[u8]) -> FetchedEmail {
    use mail_parser::MessageParser;

    if let Some(parsed) = MessageParser::default().parse(raw_bytes) {
        let subject = parsed.subject().unwrap_or("(Sans objet)").to_string();
        
        let from = parsed.from().and_then(|f| f.first()).map(|addr| {
            let name = addr.name().unwrap_or_default();
            let email = addr.address().unwrap_or_default();
            if !name.is_empty() && !email.is_empty() {
                format!("{} <{}>", name, email)
            } else if !email.is_empty() {
                email.to_string()
            } else {
                name.to_string()
            }
        }).unwrap_or_else(|| "Inconnu".to_string());

        let date = parsed.date().map(|d| d.to_rfc3339()).unwrap_or_default();

        let body_text = parsed.body_text(0).map(|s| s.to_string()).unwrap_or_default();
        let body_html = parsed.body_html(0).map(|s| s.to_string());

        let mut attachments = Vec::new();
        for (idx, att) in parsed.attachments().enumerate() {
            let filename = att.attachment_name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("piece_jointe_{}.bin", idx + 1));
            let mime_type = att.content_type()
                .map(|ct| format!("{}/{}", ct.c_type, ct.c_subtype.as_deref().unwrap_or("*")))
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let data_bytes = att.contents();
            let base64_data = base64::engine::general_purpose::STANDARD.encode(data_bytes);

            attachments.push(EmailAttachment {
                filename,
                mime_type,
                size_bytes: data_bytes.len(),
                base64_data,
            });
        }

        FetchedEmail {
            uid,
            date,
            from,
            subject,
            body_text,
            body_html,
            attachments,
        }
    } else {
        FetchedEmail {
            uid,
            date: String::new(),
            from: "Inconnu".to_string(),
            subject: "(Erreur décodage e-mail)".to_string(),
            body_text: String::from_utf8_lossy(raw_bytes).to_string(),
            body_html: None,
            attachments: Vec::new(),
        }
    }
}

#[tauri::command]
pub fn fetch_emails(state: State<AppState>, bien_id: i64) -> Result<Vec<FetchedEmail>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    // 1. Lire la config email de la DB
    let config = db.query_row(
        "SELECT email_adresse, imap_host, imap_port, use_ssl
         FROM bien_email_config WHERE bien_id = ?1",
        params![bien_id],
        |row| Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<i32>>(2)?,
            row.get::<_, Option<i32>>(3)?,
        )),
    ).map_err(|e| format!("Pas de configuration email trouvée pour ce bien: {}", e))?;

    let email_adresse = config.0;
    let imap_host = config.1.unwrap_or_else(|| "imap.gmail.com".to_string());
    let imap_port = config.2.unwrap_or(993) as u16;
    let use_ssl = config.3.unwrap_or(1) != 0;

    // 2. Récupérer le mot de passe depuis le Keyring
    let entry = keyring::Entry::new("lepuits", &format!("bien_email:{}", bien_id))
        .map_err(|e| format!("Erreur keyring: {}", e))?;
    let password = entry.get_password()
        .map_err(|e| format!("Impossible de récupérer le mot de passe sécurisé : {}. Veuillez configurer votre mot de passe.", e))?;

    let is_oauth = password.starts_with("oauth2:") || password.starts_with("oauth2_token:");

    // Helper: extraire les emails depuis une session IMAP déjà authentifiée
    macro_rules! run_imap_session {
        ($session:expr) => {{
            let mut session = $session;
            session.select("INBOX").map_err(|e| format!("Erreur selection INBOX: {}", e))?;
            let search_results = session.search("ALL").map_err(|e| e.to_string())?;
            let mut fetched_emails: Vec<FetchedEmail> = Vec::new();
            let mut uids: Vec<u32> = search_results.into_iter().collect();
            uids.reverse();
            uids.truncate(20);
            if !uids.is_empty() {
                let uid_query: Vec<String> = uids.iter().map(|id| id.to_string()).collect();
                let query_str = uid_query.join(",");
                let messages = session.fetch(&query_str, "BODY[]")
                    .map_err(|e| format!("Erreur extraction IMAP: {}", e))?;
                for m in messages.iter() {
                    let uid = m.message;
                    if let Some(body_bytes) = m.body() {
                        let email_item = parse_raw_email(uid, body_bytes);
                        fetched_emails.push(email_item);
                    }
                }
            }
            session.logout().ok();
            Ok(fetched_emails)
        }};
    }

    // 3. Connexion IMAP
    use std::net::TcpStream;

    if is_oauth {
        let access_token = refresh_gmail_token(&password)?;
        let authenticator = GmailXoauth2Authenticator {
            user: email_adresse.clone(),
            access_token,
        };

        if use_ssl {
            let tcp = TcpStream::connect(format!("{}:{}", imap_host, imap_port))
                .map_err(|e| format!("Impossible de se connecter à {}:{} : {}", imap_host, imap_port, e))?;
            let tls = native_tls::TlsConnector::builder().build().map_err(|e| format!("Erreur TLS: {}", e))?;
            let tls_stream = tls.connect(&imap_host, tcp).map_err(|e| format!("Erreur handshake TLS vers {}: {}", imap_host, e))?;
            let client = imap::Client::new(tls_stream);
            let session = client.authenticate("XOAUTH2", &authenticator)
                .map_err(|(e, _)| format!("Échec d'identification IMAP Google XOAUTH2: {}", e))?;
            run_imap_session!(session)
        } else {
            let tcp = TcpStream::connect(format!("{}:{}", imap_host, imap_port))
                .map_err(|e| format!("Impossible de se connecter à {}:{} : {}", imap_host, imap_port, e))?;
            let client = imap::Client::new(tcp);
            let session = client.authenticate("XOAUTH2", &authenticator)
                .map_err(|(e, _)| format!("Échec d'identification IMAP Google XOAUTH2: {}", e))?;
            run_imap_session!(session)
        }
    } else {
        if use_ssl {
            let tcp = TcpStream::connect(format!("{}:{}", imap_host, imap_port))
                .map_err(|e| format!("Impossible de se connecter à {}:{} : {}", imap_host, imap_port, e))?;
            let tls = native_tls::TlsConnector::builder().build().map_err(|e| format!("Erreur TLS: {}", e))?;
            let tls_stream = tls.connect(&imap_host, tcp).map_err(|e| format!("Erreur handshake TLS vers {}: {}", imap_host, e))?;
            let client = imap::Client::new(tls_stream);
            let session = client.login(&email_adresse, &password)
                .map_err(|(e, _)| format!("Échec d'identification IMAP: {}", e))?;
            run_imap_session!(session)
        } else {
            let tcp = TcpStream::connect(format!("{}:{}", imap_host, imap_port))
                .map_err(|e| format!("Impossible de se connecter à {}:{} : {}", imap_host, imap_port, e))?;
            let client = imap::Client::new(tcp);
            let session = client.login(&email_adresse, &password)
                .map_err(|(e, _)| format!("Échec d'identification IMAP: {}", e))?;
            run_imap_session!(session)
        }
    }
}

#[tauri::command]
pub fn save_email_attachment_to_bien(
    app: tauri::AppHandle,
    state: State<AppState>,
    bien_id: i64,
    subfolder: String,
    filename: String,
    base64_data: String,
) -> Result<i64, String> {
    let base_dir = crate::db::get_base_dir(&app);
    let db = state.db.lock().map_err(|e| e.to_string())?;

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

    let clean_subfolder = if subfolder.trim().is_empty() || subfolder.trim() == "/" {
        "01_ADMINISTRATIF".to_string()
    } else {
        subfolder.trim_start_matches('/').to_string()
    };

    let target_subfolder_dir = base_dir.join(&bien_rel_path).join(&clean_subfolder);
    std::fs::create_dir_all(&target_subfolder_dir).map_err(|e| format!("Erreur création sous-dossier: {}", e))?;

    let target_file_path = target_subfolder_dir.join(&filename);

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Erreur décodage base64: {}", e))?;

    std::fs::write(&target_file_path, bytes)
        .map_err(|e| format!("Erreur écriture fichier joint: {}", e))?;

    let relative_file_path = format!("{}/{}/{}", bien_rel_path, clean_subfolder, filename);

    let type_doc = match clean_subfolder.as_str() {
        "02_DIAGNOSTICS_DDT" => "diagnostic",
        "04_FISCAL_FINANCIER" | "05_TRAVAUX" => "facture",
        "07_LOCATION" => "bail",
        "06_ENERGIE_CONTRATS" => "assurance",
        _ => "autre",
    };

    db.execute(
        "INSERT INTO documents (bien_id, type_doc, sous_categorie, chemin_fichier, date_document, notes)
         VALUES (?1, ?2, ?3, ?4, date('now'), 'Pièce jointe enregistrée depuis la boîte mail')",
        params![bien_id, type_doc, clean_subfolder, relative_file_path],
    ).map_err(|e| e.to_string())?;

    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn send_email(
    state: State<AppState>,
    bien_id: i64,
    to: String,
    subject: String,
    body: String,
    attachments: Option<Vec<SendEmailAttachment>>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let config = db.query_row(
        "SELECT email_adresse, smtp_host, smtp_port, use_ssl
         FROM bien_email_config WHERE bien_id = ?1",
        params![bien_id],
        |row| Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<i32>>(2)?,
            row.get::<_, Option<i32>>(3)?,
        )),
    ).map_err(|e| format!("Pas de configuration email trouvée pour ce bien: {}", e))?;

    let email_adresse = config.0;
    let smtp_host = config.1.unwrap_or_else(|| "smtp.gmail.com".to_string());
    let smtp_port = config.2.unwrap_or(465) as u16;

    let entry = keyring::Entry::new("lepuits", &format!("bien_email:{}", bien_id))
        .map_err(|e| format!("Erreur keyring: {}", e))?;
    let password = entry.get_password()
        .map_err(|e| format!("Impossible de récupérer le mot de passe sécurisé : {}. Veuillez configurer votre mot de passe.", e))?;

    use lettre::message::header::ContentType;
    use lettre::message::{SinglePart, MultiPart, Attachment};
    use lettre::transport::smtp::authentication::{Credentials, Mechanism};
    use lettre::{Message, SmtpTransport, Transport};

    let builder = Message::builder()
        .from(email_adresse.parse().map_err(|e| format!("Adresse expéditeur invalide ({}) : {}", email_adresse, e))?)
        .to(to.parse().map_err(|e| format!("Adresse destinataire invalide ({}) : {}", to, e))?)
        .subject(subject);

    let mut multipart = MultiPart::mixed()
        .singlepart(SinglePart::builder().header(ContentType::TEXT_PLAIN).body(body));

    if let Some(atts) = attachments {
        for att in atts {
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(&att.base64_data) {
                let ct = att.mime_type.parse().unwrap_or(ContentType::TEXT_PLAIN);
                let attachment_part = Attachment::new(att.filename).body(bytes, ct);
                multipart = multipart.singlepart(attachment_part);
            }
        }
    }

    let email = builder.multipart(multipart).map_err(|e| format!("Erreur création message: {}", e))?;

    if password.starts_with("oauth2:") || password.starts_with("oauth2_token:") {
        let access_token = refresh_gmail_token(&password)?;
        let creds = Credentials::new(email_adresse, access_token);

        let mailer = SmtpTransport::relay(&smtp_host)
            .map_err(|e| format!("Erreur relais SMTP vers {}: {}", smtp_host, e))?
            .credentials(creds)
            .authentication(vec![Mechanism::Xoauth2])
            .port(smtp_port)
            .build();

        mailer.send(&email).map_err(|e| format!("Échec d'envoi SMTP XOAUTH2: {}", e))?;
    } else {
        let creds = Credentials::new(email_adresse, password);

        let mailer = SmtpTransport::relay(&smtp_host)
            .map_err(|e| format!("Erreur relais SMTP vers {}: {}", smtp_host, e))?
            .credentials(creds)
            .port(smtp_port)
            .build();

        mailer.send(&email).map_err(|e| format!("Échec d'envoi SMTP: {}", e))?;
    }

    Ok(())
}
