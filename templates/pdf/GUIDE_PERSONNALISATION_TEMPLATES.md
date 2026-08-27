# 📄 Guide de Personnalisation des Modèles PDF KeyFolio

Bienvenue dans le guide de personnalisation des modèles de documents PDF de **KeyFolio** !

Ce système vous permet d'adapter facilement la charte graphique, les coordonnées par défaut du bailleur, les mentions légales, les clauses particulières et les textes types de l'ensemble des documents PDF générés par le logiciel.

---

## 📂 1. Emplacement des fichiers de modèles

À chaque démarrage de KeyFolio, les fichiers de modèles sont automatiquement copiés et maintenus dans le dossier :
```
[Dossier_KeyFolio]/Templates_PDF/
```
*(Ou dans le dossier `templates/pdf/` à la racine du projet).*

Vous pouvez ouvrir ce dossier directement depuis l'application via :
👉 **Options & Réglages (⚙️) ➔ Onglet « Modèles PDF » ➔ Ouvrir le dossier des Templates**.

---

## 📑 2. Liste des modèles disponibles

| Fichier | Document généré | Emplacement de destination |
| :--- | :--- | :--- |
| `quittance_template.json` | Quittance de loyer mensuelle | `07_LOCATION/Quittances de loyer/` |
| `avis_echeance_template.json` | Avis d'échéance / Appel de loyer | `07_LOCATION/Quittances de loyer/` |
| `etat_des_lieux_template.json` | États des lieux d'Entrée & de Sortie | `07_LOCATION/Etat des lieux/` |
| `fin_bail_template.json` | Attestation de fin de contrat & caution | `07_LOCATION/Etat des lieux/Sortie/` |
| `contrat_bail_template.json` | Contrat de location type Loi ALUR | `07_LOCATION/Baux/` |

---

## 🎨 3. Comment personnaliser un modèle ?

Chaque modèle est un simple fichier texte au format **JSON**, facilement modifiable avec n'importe quel éditeur de texte (Bloc-notes Windows, VS Code, Notepad++, etc.).

### A. Modifier la charte graphique & les couleurs
Vous pouvez changer les codes couleurs hexadécimaux (`#2563eb`, `#16a34a`, `#0f172a`, etc.) dans la section `"theme"` :
```json
"theme": {
  "primaryColor": "#2563eb",   // Couleur de la barre d'en-tête et des titres
  "darkColor": "#0f172a",      // Couleur du texte principal
  "textColor": "#334155",      // Couleur des paragraphes
  "textMuted": "#64748b"       // Couleur des sous-titres et notes
}
```

---

### B. Définir vos coordonnées bailleur par défaut
Pour ne plus avoir à ressaisir vos informations de bailleur à chaque document, renseignez la section `"bailleur"` :
```json
"bailleur": {
  "nomParDefaut": "SCI Immobilière Dupont",
  "adresseParDefaut": "12 rue de la Paix",
  "villeParDefaut": "75002 Paris",
  "email": "contact@sci-dupont.fr",
  "telephone": "06 12 34 56 78",
  "iban": "FR76 3000 4000 5000 6000 7000 890",
  "modePaiement": "Virement bancaire"
}
```

---

### C. Personnaliser le texte des attestations et mentions
Dans `quittance_template.json`, vous pouvez personnaliser le texte de la quittance :
```json
"mentions": {
  "texteAttestation": "Je soussigné {bailleurNom}, propriétaire du logement situé au {bienAdresse}, atteste avoir reçu de {locataireNom} la somme de {montantTotal} au titre du loyer et des charges pour la période mentionnée.",
  "mentionPiedDePage": "Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte. Document certifié conforme émis via KeyFolio."
}
```
*💡 Les balises `{bailleurNom}`, `{bienAdresse}`, `{locataireNom}`, `{montantTotal}` sont automatiquement remplacées par les vraies données lors de la génération.*

---

### D. Personnaliser les pièces par défaut de l'État des Lieux
Dans `etat_des_lieux_template.json`, modifiez ou ajoutez des pièces prédéfinies :
```json
"piecesParDefaut": [
  { "nom": "Entrée / Couloir", "etat": "Bon état", "obs": "Peinture propre, interphone fonctionnel" },
  { "nom": "Séjour / Salon", "etat": "Très bon état", "obs": "Murs et sols propres, fenêtres double vitrage" },
  { "nom": "Cuisine", "etat": "Bon état", "obs": "Évier, placards et plaques nettoyés et fonctionnels" },
  { "nom": "Chambre principale", "etat": "Très bon état", "obs": "Parquet et prises électriques conformes" },
  { "nom": "Salle d'eau / WC", "etat": "Bon état", "obs": "Robinetterie sans fuite" },
  { "nom": "Balcon / Terrasse", "etat": "Bon état", "obs": "Dalles propres, garde-corps scellé" }
]
```

---

### E. Personnaliser les clauses du Contrat de Bail
Dans `contrat_bail_template.json`, adaptez la clause d'indexation annuelle IRL, la clause résolutoire ou les équipements d'un meublé :
```json
"clauses": {
  "clauseIRL": true,
  "texteClauseIRL": "Le loyer sera révisé annuellement à la date anniversaire du contrat selon la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE.",
  "clauseResolutoire": true,
  "texteClauseResolutoire": "Il est expressément convenu qu'à défaut de paiement de tout ou partie du loyer ou des charges au terme convenu...",
  "equipementsMeuble": "Cuisine équipée, literie conforme, rangements, luminaires, table et chaises, nécessaire d'entretien ménager",
  "clausesParticulieres": "Interdiction de sous-louer sans accord exprès et écrit du bailleur. Respect de la tranquillité."
}
```

---

## ⚡ 4. Prise en compte immédiate

* Dès que vous enregistrez vos modifications dans un fichier `.json`, KeyFolio les applique **instantanément lors de votre prochaine génération de document**, sans redémarrage requis !
* Si vous souhaitez restaurer un modèle à son état d'origine, supprimez simplement le fichier `.json` concerné : KeyFolio le recréera automatiquement avec sa configuration standard lors du prochain lancement.
