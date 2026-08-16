# 🔑 KeyFolio — Gestion Immobilière Desktop 100% Locale & Portable

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg?logo=tauri)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-Bundled-003B57.svg?logo=sqlite)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial-green.svg)](LICENSE)
[![GitHub Releases](https://img.shields.io/badge/Releases-NayrolfRdgs%2FKeyFolio-purple.svg)](https://github.com/NayrolfRdgs/KeyFolio/releases)

> **KeyFolio** est un logiciel desktop ultra-rapide, autonome et 100% portable dédié à la gestion immobilière multi-biens pour bailleurs indépendants, propriétaires bailleurs et investisseurs.

---

## 💡 Philosophie & Architecture 100% Locale

KeyFolio est spécialement conçu pour fonctionner de manière **100% autonome et portable** :

- 📁 **Données locales et étanches** : L'exécutable `KeyFolio.exe` lit et écrit la base de données `keyfolio.db` et l'arborescence des documents `biens_data/` directement à côté de l'application.
- 💾 **Zéro cloud obligatoire** : Aucune dépendance externe ni abonnement SaaS requis.
- 🚀 **Performance Native** : Backend en **Rust** (ultra-rapide, sécurisé en mémoire) + Interface utilisateur fluide en **React 19**.
- 🔒 **Sécurité renforcée** : Protection native contre la traversée de fichiers (`canonicalize()` & contrôle strict sous `base_dir`).
- 📊 **Synchronisation Excel Bidirectionnelle** : Tableaux Excel générés automatiquement pour chaque bien avec calcul automatique des amortissements, cash-flow et rentabilité.

---

## 📂 Arborescence Standardisée des Dossiers (`biens_data/`)

Pour chaque logement créé, KeyFolio génère et maintient automatiquement une arborescence structurée et hiérarchisée :

```text
biens_data/
└── [Nom_Du_Logement]/
    ├── 00_ACHAT-VENTE/
    │   ├── Annonce - Photos/
    │   ├── Plans/
    │   ├── Compromis de vente/
    │   ├── Correspondances agence - notaire/
    │   └── Offres recues/
    ├── 01_ADMINISTRATIF/
    │   ├── Justificatifs domicile/
    │   ├── Livret de famille - Pieces identite/
    │   └── Titre de propriete/
    ├── 02_DIAGNOSTICS_DDT/
    ├── 03_COPROPRIETE/
    │   ├── Charges/
    │   ├── PV Assemblees generales/
    │   └── Reglement copropriete/
    ├── 04_FISCAL_FINANCIER/
    │   ├── Attestations bancaires/
    │   ├── Credit immobilier - Tableau amortissement/
    │   ├── Regime fiscal/
    │   ├── Revenus fonciers/
    │   ├── Taxe fonciere/
    │   ├── Taxe habitation/
    │   ├── Bilans et syntheses/
    │   └── Declarations fiscales - LMNP - 2044/
    ├── 05_TRAVAUX/
    │   ├── Devis/
    │   ├── Factures travaux/
    │   │   ├── Chauffage/
    │   │   ├── Electricite/
    │   │   ├── Plomberie/
    │   │   └── Toiture/
    │   ├── Certificats conformite/
    │   ├── Garanties - Assurances decennales/
    │   └── Permis de construire - Declarations/
    ├── 06_ENERGIE_CONTRATS/
    │   ├── Assurance habitation/
    │   ├── Contrats entretien/
    │   ├── Factures eau/
    │   ├── Factures electricite/
    │   └── Factures gaz/
    ├── 07_LOCATION/
    │   ├── Bail/
    │   │   ├── Bail_en_cours/
    │   │   └── Baux_anciens/
    │   ├── Etat des lieux/
    │   │   ├── Entree/
    │   │   └── Sortie/
    │   ├── Locataires/
    │   │   ├── Caution - Garant/
    │   │   ├── Correspondances/
    │   │   └── Dossier candidature/
    │   ├── Assurance PNO/
    │   ├── Depot de garantie/
    │   ├── Quittances de loyer/
    │   ├── Avis d echeance et Relances/
    │   └── Regularisations de charges/
    └── 08_DIVERS/
```

---

## ✨ Fonctionnalités Disponibles

### 🏠 1. Gestion Multi-Biens & Fiche Logement Interactive (`Biens` & `BienPanel`)
- Vue détaillée par bien avec résumé synthétique, indicateurs KPI et graphiques financiers interactifs SVG (*Cashflow 12 mois, répartition des charges, projection de patrimoine sur 15 ans*).
- Assistant de création pas-à-pas (**Wizard**) avec enregistrement immédiat de l'ensemble des caractéristiques (*surface, pièces, clés, diagnostics, charges, copropriété*).
- Distinction automatique entre **Location** et **Occupation Personnelle / Résidence Principale**.

### 👥 2. Locataires, Candidatures & Bilan Financier (`Locataires`)
- **Gestion des Candidatures** : Réception des dossiers, scoring, classement et conversion directe en bail actif en 1 clic.
- **Gestion des Anciens Locataires** : Séparation claire entre locataires actuels et archivés avec enregistrement des motifs de fin de bail (*Congé locataire, Congé bailleur, Mutation, Impayés*).
- **📊 Bilan Financier & Historique Individuel** : Modal complet synthétisant le total encaissé, le reste dû, le taux de ponctualité (%), le statut du dépôt de garantie et le journal exhaustif des règlements.

### 🔑 3. Contrats de Baux & Révision IRL (`Baux` & `NewBailModal`)
- Création assistée de baux avec clôture automatique du bail précédent et archivage du dossier.
- **Générateur Légal de Contrat de Bail** : Génération de contrat conforme à la loi ALUR avec clauses types personnalisables.
- **Calculateur de Révision IRL** : Révision automatique du loyer selon l'indice INSEE officiel en 1 clic.
- Suivi du dépôt de garantie et des actes de cautionnement rattachés.

### 📄 4. Générateurs de Documents Officiels PDF
- **Quittances de Loyer Officielles** (`QuittanceModal`) : Génération instantanée avec tampon/signature et envoi par e-mail en 1 clic.
- **États des Lieux d'Entrée / Sortie** (`EtatDesLieuxModal`) : Grille pièce par pièce, relevé des compteurs et état des clés.
- **Contrat de Bail Conforme** (`BailGenerateurModal`).

### 💳 5. Suivi des Loyers & Règlements (`Paiements`)
- Échéancier automatique mensuel avec statuts dynamiques (*Payé, Impayé, En retard, Partiel*).
- Attachement et prévisualisation directe de justificatifs bancaires et reçus PDF.
- Journal de caisse et filtres multi-critères.

### 📊 6. Tableaux de Bord & Générateur Excel Automatique
- **Dashboard Global** : Taux d'occupation global, revenus mensuels, alertes de diagnostics (DPE) et suivi des impayés.
- **Génération Excel en Temps Réel** : Mise à jour automatique de 5 classeurs professionnels (`Synthese_Financiere.xlsx`, `Tableau_Baux_Locataires.xlsx`, `Journal_Paiements.xlsx`, `Suivi_Depenses.xlsx`, `Tableau_Amortissement.xlsx`).
- **Visualiseur de Tableurs Intégré** (`SpreadsheetViewer`) : Lecture et manipulation des classeurs directement dans l'application.

### ✉️ 7. Boîte E-mail Intégrée & Envoi Rapide (`MailboxPanel` & `QuickMailModal`)
- Client mail autonome par logement (IMAP / SMTP ou **Google OAuth 2.0**).
- Modèles d'e-mails pré-remplis pour les quittances, relances et notifications de passage.

### 🚀 8. Détection Automatique des Mises à Jour (GitHub API)
- Bannière d'information au démarrage lorsqu'une nouvelle version est disponible sur le dépôt GitHub.

---

## 🔮 Roadmap & Évolutions Futures

### 🧠 Phase 1 : Automatisation & Intelligence Locale
- [ ] **OCR Local Factures & Documents (Ollama / PaddleOCR)** : Extraction automatique des montants, TVA, dates et prestataires depuis les factures PDF scannées sans aucun appel cloud.
- [ ] **Rapprochement Bancaire CSV / OFX** : Import de relevés bancaires pour pointer automatiquement les virements de loyers reçus.
- [ ] **Automatisation Mensuelle des Quittances** : Option de génération et envoi automatique de la quittance par e-mail dès réception du paiement.

### 📑 Phase 2 : Fiscalité & Déclarations Officielles
- [ ] **Export Liasse Fiscale Cerfa 2044 (Revenus Fonciers)** : Pré-remplissage automatique des cases de la déclaration 2044.
- [ ] **Bilan Fiscal LMNP Réel (Formulaires 2031 & 2033)** : Calcul complet des amortissements comptables (bâti, mobilier, travaux) et génération du tableau de résultat.
- [ ] **Régularisation Annuelle des Charges Locatives** : Décompte automatique comparant provisions sur charges et dépenses réelles récupérables.

### 💻 Phase 3 : Ergonomie Desktop & Sauvegardes
- [ ] **Notifications Natives Windows / macOS** : Alertes de loyers en retard, échéances de baux et renouvellement de diagnostics DDT.
- [ ] **Sauvegarde & Chiffrement 1-Clic** : Export d'archive ZIP chiffrée (AES-256) de l'ensemble de la base et des documents vers clé USB ou disque externe.
- [ ] **Mode Sombre / Clair Personnalisé** : Thème automatique synchronisé avec le système d'exploitation.

---

## 🛠️ Instructions de Build & Développement

### Prérequis
- [Node.js](https://nodejs.org/) v18+ & `npm`
- [Rust](https://www.rust-lang.org/) & `cargo`

### Installation des dépendances
```bash
npm install
```

### Lancer en Mode Développement (Hot Reload)
```bash
npm run tauri dev
```

### Générer le Binaire Portable Production (Windows / macOS / Linux)
```bash
npm run tauri build
```
L'exécutable portable `KeyFolio.exe` sera disponible dans `src-tauri/target/release/bundle/`.

---

## 📦 Organisation des Releases GitHub

1. Allez dans l'onglet **Releases** : `https://github.com/NayrolfRdgs/KeyFolio/releases/new`
2. Créez un tag avec la version (ex: `v0.2.0`).
3. Renseignez les notes de version (**Release Notes**).
4. Attachez l'exécutable portable `KeyFolio.exe` ou l'installeur `KeyFolio_x64-setup.exe`.
5. Cliquez sur **Publish Release**. KeyFolio avertira automatiquement les utilisateurs !

---

## 📄 Licence & Crédits

Ce projet est distribué sous la licence [PolyForm Noncommercial 1.0.0](LICENSE).  
© 2026 **Flow (Florian) — FlowCreativeStudio**. Tous droits réservés.

