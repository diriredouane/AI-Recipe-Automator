# Règles de Gestion de Projet

Ce document définit les règles de travail pour le développement de ce projet.

## R1. Source de Vérité

**R1.1.** Le code présent dans ce répertoire local est la **seule et unique source de vérité** pour l'ensemble du projet (code de l'application et plan de projet).

## R2. Flux de Travail (Workflow)

**R2.1.** **Modification (Local) :** Toutes les modifications (code, statut des tâches) se font dans les fichiers locaux (`.js`, `.md`, etc.) via un éditeur de code.
**R2.2.** **Synchronisation (Local -> Cloud) :** Pour envoyer les modifications vers Google, la commande `clasp push` est utilisée. C'est notre "bouton de mise à jour" global.
**R2.3.** **Visualisation (Cloud) :** Pour voir les changements du plan de projet, on utilise le menu `Project Management > Update Project Plan from Code` dans Google Sheets.

## R3. Gestion des Tâches

### R3.1. Mise en Statut "En cours"

**R3.1.1.** Une tâche (ou sa phase parente) est marquée comme **"En cours"** dès que la conversation porte sur elle.
**R3.1.2.** Je dois identifier la ou les tâches concernées par la discussion et les mettre à jour.
**R3.1.3.** Si une sous-tâche est "En cours", sa tâche parente (la phase) doit automatiquement être marquée comme "En cours" également.
**R3.1.4.** Une phase est considérée "En cours" si au moins une de ses sous-tâches est "En cours" ou "Terminé", mais que toutes ne sont pas "Terminé".

### R3.2. Validation et Statut "Terminé"

**R3.2.1.** Je ne peux **jamais** marquer une tâche comme "Terminé" de ma propre initiative.
**R3.2.2.** Pour chaque tâche "Auto" que j'accomplis, je dois présenter le travail et **demander explicitement la validation**.
**R3.2.3.** Votre réponse ("OK", "c'est validé", etc.) est la validation officielle.
**R3.2.4.** Une fois la validation reçue, je dois mettre à jour le plan de projet en :
    - Changeant le statut à **"Terminé"**.
    - Remplissant la colonne **"Vérifié ?"** avec la justification (ex: "Vérifié : Validé par votre réponse '...'").

## R4. Gestion des Feuilles de Calcul (Sheets)

**R4.1.** La création de nouvelles feuilles de calcul nécessaires au projet (ex: "Recipes") est une tâche **"Auto"**.
**R4.2.** Cette création doit être intégrée dans la fonction `createSheetIfNeeded()`, qui est appelée par le menu `Create Tracking Sheet (if needed)`.
**R4.3.** La fonction doit vérifier si la feuille existe avant de la créer pour éviter les doublons.

## R5. Tests Unitaires

**R5.1.** Pour chaque fonction principale dans un fichier "helper" (ex: `generateAllContent`), une fonction de test unitaire correspondante doit être créée (ex: `test_generateAllContent`).
**R5.2.** Cette fonction de test doit utiliser des données d'exemple en dur (`hardcoded`) et appeler la fonction principale.
**R5.3.** Le résultat de la fonction de test doit être affiché dans les logs avec `Logger.log()` pour vérification.

## R5. Tests Unitaires

**R5.1.** Pour chaque fonction principale dans un fichier "helper" (ex: `generateAllContent`), une fonction de test unitaire correspondante doit être créée (ex: `test_generateAllContent`).
**R5.2.** Cette fonction de test doit utiliser des données d'exemple en dur (`hardcoded`) et appeler la fonction principale.
**R5.3.** Le résultat de la fonction de test doit être affiché dans les logs avec `Logger.log()` pour vérification.