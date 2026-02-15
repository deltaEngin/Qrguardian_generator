# 🛡️ QRGuardian – Écosystème Anti-Fraude Professionnel

**QRGuardian** est une solution complète de génération et de vérification de QR codes sécurisés.  
Elle se compose de deux applications web progressives (PWA) **100% locales**, fonctionnant sans serveur, et conçues pour lutter contre la fraude par duplication de QR codes.

---

## 📦 Architecture

| Application          | Rôle                                                                 |
|----------------------|----------------------------------------------------------------------|
| **QRGuardian Generator** | Génère des QR codes authentiques avec un code secret unique intégré. |
| **QRGuardian Terminal**  | Scanne et vérifie les QR codes en temps réel, détecte les doublons.  |

Les deux systèmes communiquent via un **code secret unique** synchronisé par QR code de connexion.

---

## ✨ Fonctionnalités

### ✅ Générateur
- Génération de QR codes sécurisés (données compressées + code secret unique).
- Formulaire avec saisie intuitive, compteurs de caractères, taille optimale.
- **Génération en lot** (jusqu’à 1000 QR codes) avec export PDF (grille A4, ID affiché).
- Interface responsive, thèmes sombre/clair.
- **Authentification par code PIN 4 chiffres** (inscription unique, connexion, déconnexion).
- **Code de secours aléatoire** affiché de manière masquée.
- **Synchronisation multi‑appareils** : génère un QR code de connexion contenant le code secret.
- Gestion du stockage local (IndexedDB) avec jauge d’utilisation.
- **Progressive Web App** : installation, fonctionnement hors ligne.

### ✅ Terminal
- Scan de QR codes en temps réel (caméra) ou via import d’image.
- Vérification stricte du code secret.
- Détection automatique des **doublons** (chaque QR code est à usage unique).
- Affichage détaillé du résultat (valide / fraude / doublon) avec informations de l’événement.
- **Historique complet** des scans avec filtres (tous, valides, invalides, doublons, connexions).
- **Statistiques** (compteurs, graphique circulaire) et export CSV/JSON.
- **Synchronisation** : scan d’un QR de connexion pour importer le code secret du générateur.
- Gestion du stockage local et du code secret.
- **Progressive Web App** : installation, fonctionnement hors ligne.

---

## 🛠️ Technologies

- **Front-end** : HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+)
- **Icônes** : Font Awesome 6 (local)
- **QR codes** : `qrcode.min.js`, `jsQR.min.js`
- **PDF** : `jspdf.umd.min.js` (générateur)
- **Stockage local** : IndexedDB (via une couche d’abstraction maison)
- **PWA** : manifest.json, service worker (cache statique, stale‑while‑revalidate)
- **Déploiement** : GitHub Pages

---

## 📁 Installation & Configuration

### 🔧 Prérequis
- Navigateur moderne (Chrome, Edge, Firefox, Safari).
- Serveur local ou distant en **HTTPS** (obligatoire pour les PWA).

### 📥 Installation locale
1. Clonez le dépôt ou téléchargez les fichiers.
2. Placez les deux dossiers `generator/` et `terminal/` à la racine de votre serveur web.
3. Assurez-vous que l’arborescence suivante est respectée :

📦 votre-projet/
├── generator/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── icons/ (8 icônes PWA)
│   ├── css/all.min.css
│   ├── webfonts/ (polices Font Awesome)
│   └── js/ (tous les scripts)
├── terminal/
│   └── ... (même structure)
└── (éventuelle page d’accueil)


4. **Fichiers de configuration à adapter** (si nécessaire) :
   - `manifest.json` : vérifiez les chemins des icônes.
   - `sw.js` : la liste `urlsToCache` doit correspondre à votre arborescence réelle.
   - `js/database.js` (générateur) : la version de la base est incrémentée automatiquement.

---

## 🚀 Utilisation

### 🖥️ QRGuardian Generator
1. Ouvrez `generator/index.html`.
2. **Premier démarrage** : créez un compte (nom + code PIN 4 chiffres).  
   Un code de secours aléatoire vous sera présenté (conservez‑le).
3. Remplissez le formulaire (nom, lieu, prix optionnel).
4. Cliquez sur **« Générer QR Code »** pour un QR unique, ou utilisez la section **« Génération en Lot »** pour produire plusieurs QR codes.
5. Une fois le lot généré, cliquez sur **« Télécharger PDF »** pour obtenir un document A4 avec grille.
6. **Synchronisation** : dans l’onglet « Paramètres », cliquez sur **« Générer QR Connexion »**.  
   Scannez ce QR avec le Terminal pour partager le code secret.

### 📱 QRGuardian Terminal
1. Ouvrez `terminal/index.html`.
2. **Premier démarrage** : aucun compte requis. Le terminal attend un code secret.
3. Cliquez sur **« Démarrer le scan »** et placez un QR code généré devant la caméra.
   - ✅ **Valide** : affiche les informations de l’événement.
   - ❌ **Invalide / Fraude** : alerte sur le code secret incorrect.
   - ⚠️ **Doublon** : indique que le QR a déjà été scanné.
4. **Importer une image** : cliquez sur **« Importer une image »** pour scanner un QR depuis une photo.
5. **Synchronisation** : scannéz un QR de connexion (depuis le Générateur).  
   Le code secret est enregistré et le terminal devient opérationnel.
6. Consultez l’historique, les statistiques et exportez les données dans l’onglet dédié.

---

## 🌍 Déploiement sur GitHub Pages

1. Créez un dépôt GitHub.
2. Uploadez l’intégralité du projet (dossiers `generator/` et `terminal/` à la racine).
3. Activez **GitHub Pages** dans les paramètres du dépôt :
   - Source : `Deploy from a branch`
   - Branch : `main` (ou `master`)
   - Dossier : `/` (racine)
4. Votre application sera accessible à l’adresse :
   - `https://<votre-username>.github.io/<nom-du-repo>/generator/`
   - `https://<votre-username>.github.io/<nom-du-repo>/terminal/`

✅ **Important** : les chemins relatifs dans les fichiers `index.html`, `manifest.json` et `sw.js` fonctionnent parfaitement avec cette structure.

---

## 📲 Progressive Web App (PWA)

Les deux applications sont des PWA installables.

### ✅ Critères remplis
- Manifeste valide avec icônes de toutes tailles.
- Service Worker enregistré avec un chemin relatif.
- Cache statique des ressources locales et des polices.
- Fonctionnement **hors ligne** après la première visite.

### 📱 Installation
- **Android** : invite « Ajouter à l’écran d’accueil ».
- **iOS** : menu « Partager » → « Sur l’écran d’accueil ».
- **Desktop** : icône d’installation dans la barre d’adresse (Chrome/Edge).

### 🧪 Tester le mode hors ligne
1. Ouvrez l’application, parcourez les pages.
2. Passez en mode avion.
3. Rechargez la page : elle doit s’afficher sans erreur (sauf la caméra).

---

## 🔐 Sécurité & Bonnes pratiques

- **Code PIN** : stocké en clair dans IndexedDB (application locale uniquement).
- **Code secret** : partagé uniquement par QR code, jamais transmis sur le réseau.
- **Données** : 100% locales, aucun serveur, aucune fuite possible.
- **Console.log** : retirés de la version de production (sauf erreurs critiques).
- **Clic droit** : désactivé (protection dissuasive).

---

## 🤝 Contribution

Ce projet est privé et développé pour un usage professionnel.  
Pour toute suggestion ou signalement d’anomalie, contactez l’auteur.

---

## 📄 Licence

**QRGuardian** © 2026 – Tous droits réservés.  
L’utilisation, la modification ou la redistribution sans autorisation explicite est interdite.

---

## 🙏 Crédits

- **Développement** : [Ali Abass Ousmane]
- **Bibliothèques tierces** :
  - [QRCode.js](https://github.com/davidshimjs/qrcodejs)
  - [jsQR](https://github.com/cozmo/jsQR)
  - [jsPDF](https://github.com/parallax/jsPDF)
  - [Font Awesome](https://fontawesome.com)

---

> **QRGuardian** – La solution anti‑fraude qui protège vos événements.  
> 100% local, 100% fiable, 100% professionnel.