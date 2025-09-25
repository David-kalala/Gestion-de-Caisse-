## Gestion de Caisse — Vue 3 + Vite
Appli démo découpée en 3 vues : **Percepteur**, **Comptable**, **Manager**, avec **Vue Router** et **Pinia**. Les données sont persistées en **localStorage** pour simuler le flux (SOUMIS → APPROUVÉ/REJETÉ) et le **solde**.


### Lancer le projet
```bash
# 1) Créer un nouveau projet Vite (vanilla pour partir de zéro)
npm create vite@latest gestion-caisse -- --template vanilla
cd gestion-caisse


# 2) Installer les dépendances Vue/Router/Pinia
npm i vue vue-router pinia


# 3) Remplacer/ajouter les fichiers ci-dessous (respecter l'arborescence)
# 4) Démarrer
npm run dev
```