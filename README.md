# 🏠 LePuits — Application de Gestion Immobilière Desktop 100% Portable

> **LePuits** est un logiciel desktop moderne, rapide et ultra-complet dédié à la gestion multi-biens immobiliers pour bailleurs et investisseurs.  
> **100% autonome, hors-ligne et portable** — sans serveur web, sans abonnement et sans installation requise. Il fonctionne directement depuis une clé USB ou un disque externe sous Windows.

---

## 🌟 Points Forts & Vision

- **📦 100% Portable & Autonome** : L'exécutable et la base de données SQLite résident au même endroit. Emportez votre gestion complète sur une clé USB.
- **🔒 Confidentialité Maximale** : Vos données financières, bailleurs, locataires et factures restent exclusivement stockées en local sur votre machine.
- **📂 Arborescence Automatisée (40+ Dossiers)** : Création automatique d'une structure de classement complète (Achat, Diagnostics, Copropriété, Travaux, Location, Fiscalité, etc.) pour chaque logement.
- **✉️ Client Mail Intégré par Bien** : Gestionnaire IMAP/SMTP et Google OAuth dédié à chaque logement avec téléchargement des pièces jointes directement dans les dossiers du bien.
- **📊 Bilan Financier & Exports Excel** : Suivi des loyers, charges, impayés, dépenses et génération de rapports Excel prêts pour la comptabilité.
- **🎨 Interface Sombre & Moderne** : Conçue avec React 19 et Tauri 2, offrant une fluidité maximale, un design sombre élégant et des micro-animations intuitives.

---

## 🚀 Navigation & Fonctionnalités du Logiciel

L'application est structurée de manière claire et fluide via sa barre latérale de navigation :

### 1. 📊 Tableau de Bord (Dashboard)
- **KPIs en Temps Réel** : Nombre de biens, taux d'occupation, total des loyers perçus, montant des impayés et dépenses globales.
- **Alertes Instantanées** : Visualisation directe des retards de paiement, des tickets de maintenance ouverts et des alertes de baux.
- **Accès Rapide** : Raccourcis vers la création de logement, l'importation de dossier et la recherche globale.

### 2. 🏠 Gestion des Biens & Fiches Biens (`Biens` & `BienPanel`)
- **Vue d'Ensemble des Biens** : Filtres par statut (*En cours*, *En vente*, *Vendu*) et par type (*Location*, *Résidence principale*, *Secondaire*).
- **Assistant de Création (`Wizard`)** : Création pas-à-pas avec génération automatique de l'arborescence physique `biens_data/[NOM_BIEN]/`.
- **Importation de Dossier** : Scan et association rapide d'un dossier existant sur le disque.
- **Fiche Bien Détaillée** :
  - Métriques clés (loyer, charges, rentabilité, surface).
  - Gestion des champs libres (informations personnalisées).
  - Synchronisation avec fichier Excel dédié.
  - Onglet **Messagerie E-mail** dédié au logement.

### 3. 👥 Gestion des Locataires (`Locataires`)
- Fiches détaillées des locataires (Nom, Prénom, Téléphone, E-mail).
- Informations sur les garants et personnes de caution.
- Historique des baux et des paiements associés.

### 4. 🔑 Contrats de Bail (`Baux`)
- Création et modification des contrats de bail rattachés aux biens et aux locataires.
- Suivi du loyer hors charges, des charges mensuelles, du dépôt de garantie et de la date d'échéance du paiement.
- Statuts des baux (*Actif*, *Terminé*, *Résilié*).
- Association directe des fichiers de bail au format PDF/Word.

### 5. 💳 Suivi des Loyers & Paiements (`Paiements`)
- Suivi rigoureux des échéances de paiement des loyers.
- Statuts automatiques (*Payé*, *En retard*, *Impayé*, *Partiel*).
- Enregistrement des modes de règlement (virement, chèque, espèces, prélèvement).
- **Génération & Attachement de Quittances** : Association directe d'un justificatif ou d'une quittance au paiement.

### 6. 📉 Dépenses & Charges (`Depenses`)
- Suivi de toutes les charges et dépenses par logement.
- Catégorisation complète : *Travaux*, *Énergie*, *Assurance*, *Taxe foncière*, *Entretien*, *Frais de gestion*, *Autre*.
- Historique fournisseur, montants et attachement des factures justificatives.

### 7. 🛠️ Maintenance & Tickets Travaux (`Maintenance`)
- Suivi des interventions, réparations et sinistres.
- Gestion des priorités (*Urgent*, *Normal*, *Faible*) et des statuts (*Ouvert*, *En cours*, *Résolu*).
- Suivi du coût des prestations et des coordonnées des artisans/prestataires.

### 8. 📁 Gestionnaire de Documents & Prévisualisation (`Documents`)
- Explorateur de fichiers intégré parcourant directement l'arborescence `biens_data/`.
- **Prévisualisation multi-formats** : Affichage direct des PDF, des images et prévisualisation rapide des tableurs Excel (`.xlsx`, `.xls`).
- Renommage, suppression, déplacement de fichiers vers sous-dossiers et ouverture directe dans l'explorateur Windows.

### 9. 📧 Messagerie E-mail Dédiée par Bien
- Configuration réseau IMAP / SMTP autonome par logement ou authentification **Google OAuth 2.0**.
- Consultation des e-mails reçus/envoyés relatifs à un logement.
- Sauvegarde en 1 clic des pièces jointes directement dans la catégorie de documents appropriée du bien.

### 10. ⚡ Recherche Globale & Générateur Excel
- **Recherche Globale (Ctrl+K / 🔍)** : Recherche multi-critères instantanée parmi les biens, locataires, baux, paiements, factures, tickets et documents.
- **Générateur Excel (📊)** : Exportation automatique de bilans financiers, questionnaires et inventaires synthétiques.

---

## 🛠️ Stack Technique

| Couche | Technologie | Description |
|---|---|---|
| **Shell Desktop** | **Tauri 2** (Rust) | Performance native, consommation RAM minimale (< 50 Mo), sécurité renforcée |
| **Frontend UI** | **React 19 + Vite 7** | Composants réactifs, architecture moderne |
| **Base de données** | **SQLite 3** (`rusqlite`) | Base de données locale embarquée avec transactions WAL et clés étrangères activées |
| **Styling** | **CSS Vanilla** | Design system Sombre Premium, variables CSS modernes, effets glassmorphism |
| **Client E-mail** | **Rust IMAP/SMTP & OAuth** | Intégration autonome sans passer par un serveur tierce |
| **Fichiers & Excel** | **Rust `calamine` & `umya-spreadsheet`** | Traitement ultra-rapide des fichiers Excel et gestion d'arborescence |

---

## 💾 Portabilité & Mode Hors-Ligne

LePuits est spécialement conçu pour fonctionner de manière **100% autonome et portable** :

- **En mode Développement (`debug`)** :  
  La base de données et les dossiers sont créés dans `%APPDATA%\com.lepuits.app\`.

- **En mode Production (`release`)** :  
  La base de données SQLite `lepuits.db` ainsi que le dossier racine des documents `biens_data/` sont créés **dans le même répertoire que l'exécutable `.exe`**.

### 🚚 Déplacer l'application sur Clé USB :
1. Compilez ou récupérez le dossier de release.
2. Copiez le fichier `LePuits.exe`, la base `lepuits.db` et le dossier `biens_data/` sur votre clé USB ou disque dur externe.
3. Branchez la clé USB sur n'importe quel ordinateur Windows et lancez `LePuits.exe`. Tout est immédiatement disponible sans installation ni configuration !

---

## 🗄️ Modèle de Données SQLite

```
               ┌───────────────┐
               │    biens      │
               └───────┬───────┘
                       │
       ┌───────────────┼───────────────┬───────────────┬───────────────┐
       │ 1..N          │ 1..N          │ 1..N          │ 1..N          │ 1..N
┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
│    baux     │ │  depenses   │ │  documents  │ │ maintenance │ │ champs_libr │
└──────┬──────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
       │ 1..N
┌──────┴──────┐
│  paiements  │
└─────────────┘
       ▲
       │ N..1
┌──────┴──────┐
│ locataires  │
└─────────────┘
```

| Table | Description | Principaux champs |
|---|---|---|
| **`biens`** | Biens immobiliers gérés | `id`, `nom`, `adresse`, `type_bien`, `statut`, `chemin_dossier`, `email_dedie`, `surface_m2` |
| **`locataires`** | Fiches locataires & garants | `id`, `nom`, `prenom`, `telephone`, `email`, `garant_nom`, `garant_contact` |
| **`baux`** | Contrats de bail | `id`, `bien_id`, `locataire_id`, `date_debut`, `date_fin`, `loyer_mensuel`, `charges_mensuelles`, `statut` |
| **`paiements`** | Suivi des loyers perçus | `id`, `bail_id`, `date_prevue`, `date_reelle`, `montant`, `methode`, `statut`, `fichier_quittance` |
| **`depenses`** | Charges, factures et entretien | `id`, `bien_id`, `date`, `categorie`, `description`, `montant`, `fournisseur`, `fichier_justificatif` |
| **`documents`** | Index de fichiers rattachés | `id`, `bien_id`, `type_doc`, `sous_categorie`, `chemin_fichier`, `date_document` |
| **`maintenance`** | Tickets d'intervention & travaux | `id`, `bien_id`, `titre`, `priorite`, `statut`, `date_signalement`, `cout`, `prestataire` |
| **`bien_champs_libres`** | Méta-données personnalisées | `id`, `bien_id`, `cle`, `valeur` |
| **`bien_email_config`** | Configuration IMAP/SMTP/OAuth | `bien_id`, `email_adresse`, `imap_host`, `smtp_host`, `use_ssl` |

---

## 📂 Structure du Projet

```
LePuits/
├── src/                        # Code Frontend React 19
│   ├── App.jsx                 # Routeur principal & gestionnaire d'état de l'application
│   ├── index.css               # Design System complet (variables, composants, dark mode)
│   ├── main.jsx                # Point d'entrée React
│   ├── components/             # Composants réutilisables & modales
│   │   ├── Sidebar.jsx         # Barre de navigation latérale et aperçu des biens
│   │   ├── GlobalSearchModal.jsx# Modale de recherche globale instantanée
│   │   ├── ExcelGeneratorModal.jsx # Modale de génération d'exports Excel
│   │   ├── WizardCreateBien.jsx# Assistant pas-à-pas de création de bien
│   │   ├── FolderImportModal.jsx# Importation automatique de dossiers
│   │   ├── MailboxPanel.jsx    # Client mail IMAP/SMTP / OAuth Google
│   │   ├── FicheBienDetailModal.jsx # Consultation complète d'un bien
│   │   └── Icon.jsx            # Bibliothèque d'icônes SVG inline
│   ├── pages/                  # Vues de l'application
│   │   ├── Dashboard.jsx       # Vue d'ensemble, KPIs et alertes
│   │   ├── Biens.jsx           # Grille et liste des biens immobiliers
│   │   ├── BienPanel.jsx       # Tableau de bord complet d'un bien spécifique
│   │   ├── Locataires.jsx      # Gestion des locataires
│   │   ├── Baux.jsx            # Gestion des contrats de location
│   │   ├── Paiements.jsx       # Suivi financier des loyers et quittances
│   │   ├── Depenses.jsx        # Suivi des charges et factures
│   │   ├── Documents.jsx       # Explorateur et prévisualiseur de documents
│   │   └── Maintenance.jsx     # Gestion des tickets de travaux
│   └── lib/
│       ├── db.js               # Connecteur API Tauri (invocations IPC backend)
│       └── utils.js            # Helpers de formatage (dates, monnaie, statuts)
│
├── src-tauri/                  # Backend Native Rust & Tauri 2
│   ├── src/
│   │   ├── main.rs             # Point d'entrée de l'exécutable
│   │   ├── lib.rs              # Configuration Tauri, state et registres des commandes IPC
│   │   ├── db.rs               # Gestionnaire SQLite (connexion, migrations, arborescences)
│   │   ├── commands.rs         # Implémentation des handlers Rust (CRUD, fichiers, e-mails)
│   │   └── excel.rs            # Génération et lecture avancée de fichiers Excel
│   ├── Cargo.toml              # Dépendances Rust (rusqlite, tauri, imap, mail-builder, etc.)
│   └── tauri.conf.json         # Configuration Tauri (fenêtre, sécurité, bundles)
│
├── public/                     # Assets statiques web
├── package.json                # Dépendances Node.js & scripts npm
└── README.md                   # Documentation du projet
```

---

## 💻 Guide d'Installation & Développement

### Prérequis de Développement
- **Node.js** : v18+ (v22 recommandé)
- **Rust** : 1.70+ (`rustup` / `cargo`)
- **Environnement de build Windows** : C++ Build Tools (via Visual Studio Installer 2022)

### Procédure de Lancement en Débogage

1. **Cloner le projet et installer les dépendances JS** :
   ```powershell
   npm install
   ```

2. **Lancer le serveur de développement avec Tauri (Hot-Reload)** :
   ```powershell
   npm run tauri dev
   ```

---

## 📦 Compilation & Distribution

Pour générer l'exécutable autonome pour Windows :

```powershell
npm run tauri build
```

Les exécutables et installateurs sont générés dans :
```
src-tauri/target/release/
├── LePuits.exe                          ← Exécutable autonome portable
└── bundle/
    ├── nsis/LePuits_0.1.0_x64-setup.exe  ← Installeur automatique Windows
    └── msi/LePuits_0.1.0_x64_en-US.msi  ← Package MSI entreprise
```

---

## 🔮 Roadmap & Évolutions

- [x] **Phase 1-6** : Core app (Biens, Locataires, Baux, Paiements, Dépenses, Maintenance, Documents, Client Mail par bien, Recherche Globale & Exports Excel).
- [ ] **Génération Automatique de Quittances PDF** : Moteur de rendu PDF natif pour l'émission de quittances en 1 clic.
- [ ] **Export Comptable LMNP / 2044** : Génération de récapitulatifs fiscaux prêts à transmettre aux comptables.
- [ ] **Intégration IA Locale (Ollama)** : Extraction automatique des informations sur les factures et diagnostics importés sans aucun envoi de données en ligne.

---

## 📄 Licence & Crédits

Développé pour la gestion immobilière moderne, privée et autonome.
© 2026 **LePuits** — Tous droits réservés.

---

<div align="center">

**FlowCreativeStudio** · Florian ([@NayrolfRdgs](https://github.com/NayrolfRdgs))

</div>
