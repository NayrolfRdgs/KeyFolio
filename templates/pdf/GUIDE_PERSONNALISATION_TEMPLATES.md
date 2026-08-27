# Guide de Personnalisation des Modèles PDF KeyFolio

Bienvenue dans le guide de personnalisation documentaire de **KeyFolio** !

---

## Comment personnaliser vos modèles PDF ?

KeyFolio utilise directement les fichiers `.pdf` stockés dans ce dossier. Vous pouvez les ouvrir, les modifier ou créer de nouveaux documents avec n'importe quel logiciel de votre choix :
* **Canva** (import de PDF et édition vectorielle)
* **Microsoft Word / LibreOffice** (export en PDF)
* **Adobe Acrobat / Illustrator / InDesign**
* **Figma** (export en PDF)

Il vous suffit de placer vos balises de texte entre guillemets doubles `"{{nom_de_variable}}"` à l'endroit souhaité. Lors de la génération dans KeyFolio, le logiciel remplacera automatiquement et instantanément ces balises par les vraies informations de votre bien, locataire ou bail !

---

## Liste complète des balises disponibles

### 1. Informations du Bailleur / Propriétaire
* `"{{bailleur_nom}}"` : Nom complet ou raison sociale (ex: *M. Jean DUPONT*)
* `"{{bailleur_adresse}}"` : Adresse postale du bailleur
* `"{{bailleur_email}}"` : Adresse email de contact
* `"{{bailleur_telephone}}"` : Numéro de téléphone
* `"{{bailleur_iban}}"` : Numéro de compte IBAN pour les virements
* `"{{bailleur_bic}}"` : Code BIC / SWIFT

### 2. Informations du Locataire
* `"{{locataire_nom}}"` : Nom et prénom complet du locataire
* `"{{locataire_prenom}}"` : Prénom du locataire
* `"{{locataire_email}}"` : Email du locataire
* `"{{locataire_telephone}}"` : Téléphone du locataire

### 3. Informations du Logement / Bien
* `"{{bien_nom}}"` : Nom / désignation du bien (ex: *Appartement T2 Centre*)
* `"{{bien_adresse}}"` : Adresse complète du logement
* `"{{bien_surface}}"` : Surface habitable avec unité (ex: *52 m²*)
* `"{{bien_pieces}}"` : Nombre de pièces (ex: *2 pièces*)
* `"{{bien_type}}"` : Régime de location (*Meublé* ou *Nu*)

### 4. Informations Financières
* `"{{loyer_hc}}"` : Montant du loyer hors charges en euros (ex: *680,00 €*)
* `"{{charges}}"` : Provisions sur charges locatives en euros (ex: *70,00 €*)
* `"{{montant_total}}"` : Montant total loyer + charges en euros (ex: *750,00 €*)
* `"{{depot_garantie}}"` : Montant du dépôt de garantie / caution versé (ex: *680,00 €*)
* `"{{montant_retenu}}"` : Montant retenu sur la caution lors de la sortie (ex: *50,00 €*)
* `"{{solde_restitue}}"` : Solde net restitué au locataire (ex: *630,00 €*)
* `"{{motif_retenue}}"` : Motif de la retenue sur caution

### 5. Dates et Périodes
* `"{{periode}}"` : Période ou mois acquitté (ex: *Août 2026*)
* `"{{date_jour}}"` : Date du jour
* `"{{date_paiement}}"` : Date de règlement
* `"{{date_echeance}}"` : Date limite d'échéance de loyer
* `"{{date_debut_bail}}"` : Date de prise d'effet du bail
* `"{{date_fin_bail}}"` : Date de fin / sortie du logement
* `"{{motif_fin}}"` : Motif de fin de contrat

### 6. Compteurs et Clés
* `"{{index_elec}}"` : Relevé du compteur électrique (ex: *14 250 kWh*)
* `"{{index_eau}}"` : Relevé du compteur d'eau (ex: *385 m³*)
* `"{{index_gaz}}"` : Relevé du compteur de gaz (ex: *890 m³*)
* `"{{cles_remises}}"` : Nombre et description des clés et badges remis

---

## Modèles officiels fournis dans ce dossier

| Fichier PDF | Usage |
| :--- | :--- |
| **`modele_quittance.pdf`** | Quittance de loyer mensuelle certifiée |
| **`modele_avis_echeance.pdf`** | Avis d'échéance / Appel de loyer mensuel |
| **`modele_fin_bail.pdf`** | Attestation de fin de bail & décompte caution |
| **`modele_etat_des_lieux.pdf`** | État des lieux contradictoire (Entrée & Sortie) |
| **`modele_contrat_bail.pdf`** | Contrat de location d'habitation (Loi ALUR) |
