# 🏠 LePuits — Application de Gestion Immobilière Desktop 100% Portable

> **LePuits** est un logiciel desktop moderne, rapide et ultra-complet dédié à la gestion multi-biens immobiliers pour bailleurs et investisseurs.  
> **100% autonome, hors-ligne et portable** — sans serveur web, sans abonnement et sans installation requise. Il fonctionne directement depuis une clé USB ou un disque externe sous Windows.

---

## 🌟 Points Forts & Vision

- **📦 100% Portable & Autonome** : L'exécutable et la base de données SQLite résident au même endroit. Emportez votre gestion complète sur une clé USB.
- **🔒 Confidentialité Maximale** : Vos données financières, bailleurs, locataires et factures restent exclusivement stockées en local sur votre machine.
- **📂 Arborescence Automatisée (40+ Dossiers)** : Création automatique d'une structure de classement complète (Achat, Diagnostics, Copropriété, Travaux, Location, Fiscalité, etc.) pour chaque logement.
- **📊 Visualiseur de Tableaux Intégré (`SpreadsheetViewer`)** : Lecture et navigation interactive dans les fichiers Excel (`.xlsx`, `.xls`) et CSV sans nécessiter Microsoft Office.
- **📈 Calculateur & Révision de Loyer (`RentRevisionModal`)** : Calculateur natif de révision selon les indices IRL avec émission de notification.
- **✉️ Client Mail Intégré & Envoi Rapide (`QuickMailModal`)** : Gestionnaire IMAP/SMTP et Google OAuth dédié par bien avec génération de quittances et relances en 1 clic.
- **🎨 Interface Épurée & Moderne** : Conçue avec React 19 et Tauri 2, offrant une fluidité maximale, un design sombre élégant et des micro-animations intuitives.

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
  - Onglets modulaires dédiés : Infos générales, Fichiers & Documents, Baux & Occupation, Finances.
  - Gestion des champs libres (informations personnalisées).
  - Synchronisation automatique avec les fichiers Excel de synthèse.
  - Onglet **Messagerie E-mail** dédié au logement.

### 3. 👥 Gestion des Locataires & Bilan Financier (`Locataires`)
- Fiches détaillées des locataires (Nom, Prénom, Téléphone, E-mail, Garants).
- **📊 Bilan Financier & Statistiques Individuelles** : Fenêtre d'analyse affichant le total encaissé, le reste dû, le taux de ponctualité des règlements (%), le résumé du dépôt de garantie et l'historique complet des loyers passés et futurs.
- **Boutons d'action rapide** : Emission directes de quittances, relances par e-mail ou ouverture de l'historique.

### 4. 🔑 Contrats de Bail, Cautions & Révision IRL (`Baux`)
- Création et modification des contrats de bail rattachés aux biens et aux locataires.
- **🛡️ Suivi des Dépôts de Garantie & Cautions** : Enregistrement du montant et du statut du dépôt (*En attente*, *Reçu*, *Restitué*, *Retenu partiel*) et attachement d'actes de cautionnement.
- **Calculateur de Révision IRL** : Calcul automatique du nouveau loyer selon l'indice IRL officiel avec révision en 1 clic.
- Association directe des fichiers de bail au format PDF/Word.

### 5. 💳 Suivi des Loyers, Paiements & Justificatifs (`Paiements`)
- Suivi rigoureux des échéances de paiement des loyers avec cartes KPIs modulaires.
- Statuts automatiques (*Payé*, *En retard*, *Impayé*, *Partiel*).
- Enregistrement des modes de règlement (virement, chèque, espèces, prélèvement).
- **Justificatifs & Quittances** : Attachement et consultation directe des reçus et justificatifs PDF/Images rattachés à chaque paiement.

### 6. 📉 Dépenses & Charges (`Depenses`)
- Suivi de toutes les charges et dépenses par logement.
- Catégorisation complète : *Travaux*, *Énergie*, *Assurance*, *Taxe foncière*, *Entretien*, *Frais de gestion*, *Autre*.
- Historique fournisseur, montants et attachement des factures justificatives.

### 7. 🛠️ Maintenance & Tickets Travaux (`Maintenance`)
- Suivi des interventions, réparations et sinistres.
- Gestion des priorités (*Urgent*, *Normal*, *Faible*) et des statuts (*Ouvert*, *En cours*, *Résolu*).
- Transformation d'un e-mail reçu directement en ticket de maintenance.

### 8. 📁 Gestionnaire de Documents & Tableurs (`Documents`)
- Explorateur de fichiers intégré parcourant directement l'arborescence `biens_data/`.
- **Lecteur de Tableaux (`SpreadsheetViewer`)** : Visualiseur de tableurs Excel et CSV interactif intégré à l'application.
- Renommage, suppression, déplacement de fichiers vers sous-dossiers et ouverture directe dans l'explorateur Windows.

### 9. 📧 Messagerie E-mail Dédiée & Envoi Rapide (`QuickMailModal`)
- Configuration réseau IMAP / SMTP autonome par logement ou authentification **Google OAuth 2.0**.
- Consultation des e-mails reçus/envoyés relatifs à un logement.
- **Fenêtre d'envoi rapide** : Emission de quittances, relances d'impayés ou avis de passage pré-remplis en 1 clic.
- Sauvegarde automatique des pièces jointes directement dans la catégorie de documents appropriée.

### 10. ⚡ Recherche Globale & Générateur Excel
- **Recherche Globale (Ctrl+K / 🔍)** : Recherche multi-critères instantanée parmi les biens, locataires, baux, paiements, factures, tickets et documents.
- **Générateur Excel (📊)** : Exportation automatique de bilans financiers, questionnaires et inventaires synthétiques.

---

## 🛠️ Architecture Modulaire & Stack Technique

| Couche | Technologie | Description |
|---|---|---|
| **Shell Desktop** | **Tauri 2** (Rust) | Performance native, consommation RAM minimale (< 50 Mo), sécurité renforcée |
| **Frontend UI** | **React 19 + Vite 7** | Composants réactifs modulaires, Custom Hooks (`useBiens`, `useMailbox`) |
| **Backend Rust** | **8 Sous-modules** | Découpage propre par domaine (`biens`, `locataires`, `paiements`, `depenses`, `documents`, `maintenance`, `mail`, `dashboard`) |
| **Base de données** | **SQLite 3** (`rusqlite`) | Base de données locale embarquée avec transactions WAL et clés étrangères activées |
| **Styling** | **CSS Vanilla** | Design system Sombre Premium, variables CSS modernes, effets glassmorphism |
| **Client E-mail** | **Rust IMAP/SMTP & OAuth** | Intégration autonome sans passer par un serveur tiers |
| **Fichiers & Excel** | **Rust `calamine` & `umya-spreadsheet`** | Traitement ultra-rapide des fichiers Excel et gestion d'arborescence |

---

## 💾 Portabilité & Mode Hors-Ligne

LePuits est spécialement conçu pour fonctionner de manière **100% autonome et portable** :

- **En mode Développement (`debug`)** :  
  La base de données et les dossiers sont créés dans `%APPDATA%\com.lepuits.app\`.

- **En mode Production (`release`)** :  
  L'exécutable `LePuits.exe` crée et lit la base de données `lepuits.db` et le dossier `biens_data/` **dans le même répertoire que l'exécutable**.  
  👉 Copiez le dossier complet sur une clé USB et lancez `LePuits.exe` sur n'importe quel PC Windows sans rien installer.

---

## 🔧 Installation & Développement

### Prérequis System
- **Node.js** v18+ & **npm**
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

- [x] **Core App (Phase 1-6)** : Biens, Locataires, Baux, Paiements, Dépenses, Maintenance, Documents, Client Mail par bien, Recherche Globale & Exports Excel.
- [x] **Visualiseur Tableaux Intégré (`SpreadsheetViewer`)** : Lecture interactive des tableurs Excel (`.xlsx`) et CSV sans logiciel tiers.
- [x] **Révision de Loyer IRL (`RentRevisionModal`)** : Calculateur natif de révision selon les indices IRL officiels.
- [x] **Envoi Rapide d'E-mails (`QuickMailModal`)** : Émission de quittances, relances et notifications en 1 clic.
- [ ] **Génération Natio de Quittances PDF** : Moteur de rendu PDF natif pour l'émission et l'exportation de quittances au format PDF sans connexion réseau.
- [ ] **Export Fiscale & Déclarations (LMNP / 2044)** : Génération automatique de récapitulatifs fiscaux prêts pour le Cerfa 2044 et la comptabilité LMNP.
- [ ] **Intégration IA Locale Hors-Ligne (Ollama / Llama 3)** : Extraction automatique de données (OCR & IA) sur les factures, diagnostics et baux importés.
- [ ] **Graphiques Analytiques & Cash-Flow** : Tableaux de bord de performance financière avec graphiques interactifs (rentabilité nette, évolution des loyers perçus vs charges).
- [ ] **Centre de Notifications Système (Windows)** : Notifications natives pour les échéances de baux, révisions IRL à venir et retards d'impayés.

---

## 📄 Licence & Crédits

Développé pour la gestion immobilière moderne, privée et autonome.  
© 2026 **LePuits** — Tous droits réservés.

---

<div align="center">

**FlowCreativeStudio** · Florian ([@NayrolfRdgs](https://github.com/NayrolfRdgs))

</div>
