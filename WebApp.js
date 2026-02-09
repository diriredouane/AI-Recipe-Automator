/**
 * @fileoverview Gère les requêtes POST entrantes de services externes comme Pabbly.
 * Ce script doit être déployé en tant que Web App.
 */

/**
 * Gère les requêtes POST. C'est le point d'entrée pour le webhook de Pabbly.
 * @param {object} e L'objet d'événement pour une requête POST.
 * @returns {ContentService.TextOutput} Une réponse à renvoyer à l'appelant.
 */
function doPost(e) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const body = e.postData.contents;
    // --- CORRECTION DU BUG D'AFFICHAGE ---
    // On force les IDs numériques de plus de 15 chiffres à devenir des String 
    // en ajoutant des guillemets AVANT le parsing JSON.
    // Cela protège le Pin ID et le Board ID de l'arrondi JavaScript.
    const cleanBody = body.replace(/":\s*([0-9]{15,})/g, '": "$1"');
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // --- AIGUILLEUR ---
    // On essaie de parser le corps de la requête.
    let requestData;
    try {
      requestData = JSON.parse(cleanBody); // <--- Utiliser cleanBody ici
    } catch (jsonError) {
      // Si le parsing échoue, ce n'est pas la liste des boards.
      // On passe directement au cas de la confirmation de Pin.
      requestData = null;
    }

    // --- AIGUILLEUR PRINCIPAL ---
    // On détermine la nature de la requête en se basant sur sa structure.
    const action = requestData ? requestData.action : null;
    const boardList = Array.isArray(requestData) ? requestData : (requestData && requestData.list_boards && Array.isArray(requestData.list_boards)) ? requestData.list_boards : null; // Pour la compatibilité

    // --- CAS 1: Pabbly envoie les informations d'un board spécifique ---
    // On rend le script plus robuste en gérant 2 formats de réception possibles.
    let boardData = null;
    if (requestData) {
      if (requestData.board_data) { // Format idéal (objet imbriqué)
        boardData = requestData.board_data;
      } else if (requestData['board_data.id']) { // Format "plat" envoyé par Pabbly
        Logger.log("Flat data format detected. Reconstructing board_data object.");
        boardData = {
          id: requestData['board_data.id'],
          name: requestData['board_data.name'],
          pin_count: requestData['board_data.pin_count'],
          follower_count: requestData['board_data.follower_count'],
          description: requestData['board_data.description']
        };
      }
    }
    Logger.log(`boardData value after determination: ${JSON.stringify(boardData)}`); // Pour confirmer la valeur de boardData

    if (boardData) {
      const boardsSheet = spreadsheet.getSheetByName("Boards");
      if (!boardsSheet) throw new Error("La feuille 'Boards' est introuvable.");

      // Trouver la ligne correspondant à l'ID du board
      const lastRow = boardsSheet.getLastRow();
      if (lastRow < 2) {
        Logger.log(`--- ⚠️ "Boards" sheet empty. Cannot update board '${boardData.name}'. ---`);
        throw new Error(`Feuille "Boards" vide. Impossible de mettre à jour le board '${boardData.name}'.`);
      }

      // Lire les noms des tableaux (colonne A) et les IDs (colonne B)
      const boardNames = boardsSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      const boardIds = boardsSheet.getRange(2, 2, lastRow - 1, 1).getValues().flat()
        .map(id => String(id).replace(/'/g, '')); // Nettoyer les IDs de la feuille (retirer l'apostrophe)

      let rowIndex = -1;

      // 1. Recherche par Nom (comme demandé)
      const nameIndex = boardNames.indexOf(boardData.name);
      if (nameIndex !== -1) {
        rowIndex = nameIndex + 2; // +2 pour l'en-tête et l'index 0-basé
        Logger.log(`--- ✅ Board '${boardData.name}' found by name at row ${rowIndex}. ---`);
      }

      // 2. Si non trouvé par nom, tenter la recherche par ID (plus précis si les noms ne sont pas uniques)
      if (rowIndex === -1) {
        Logger.log(`--- ⚠️ Board '${boardData.name}' not found by name. Trying search by ID: '${boardData.id}'. ---`);
        const idIndex = boardIds.indexOf(String(boardData.id)); // Assurer que boardData.id est une chaîne pour la comparaison
        if (idIndex !== -1) {
          rowIndex = idIndex + 2;
          Logger.log(`--- ✅ Board ID ${boardData.id} found by ID at row ${rowIndex}. ---`);
        }
      }

      if (rowIndex > 1) {
        // Écrire les informations dans les colonnes correspondantes
        boardsSheet.getRange(rowIndex, 3).setValue(boardData.pin_count);
        boardsSheet.getRange(rowIndex, 4).setValue(boardData.follower_count);
        boardsSheet.getRange(rowIndex, 5).setValue(boardData.description);
        boardsSheet.getRange(rowIndex, 6).setValue(new Date()); // Date de la mise à jour

        Logger.log(`--- ✅ Board '${boardData.name}' (ID: ${boardData.id}) info updated at row ${rowIndex}. ---`);
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": `Board '${boardData.name}' updated.` })).setMimeType(ContentService.MimeType.JSON);
      } else {
        Logger.log(`--- ⚠️ Board '${boardData.name}' (ID: ${boardData.id}) not found in "Boards" sheet by name or ID. ---`);
        throw new Error(`Board '${boardData.name}' (ID: ${boardData.id}) non trouvé.`);
      }

      // --- CAS 2: Pabbly envoie la liste de tous les boards ---
    } else if (boardList) {
      Logger.log(`--- 📥 'list_boards' request detected. ${boardList.length} board(s) received. ---`);

      const sheet = spreadsheet.getSheetByName("Boards");
      if (!sheet) throw new Error("La feuille 'Boards' est introuvable.");

      // Tentative de récupération du site_name depuis le payload (si format objet) ou par défaut
      let siteName = "Inconnu";
      if (requestData && requestData.site_name) {
        siteName = requestData.site_name;
      } else if (!Array.isArray(requestData) && requestData.site_name) {
        // Cas où requestData est l'objet racine contenant la liste
        siteName = requestData.site_name;
      }

      Logger.log(`Updating boards for site: ${siteName}`);

      // 1. Lire les données existantes
      const lastRow = sheet.getLastRow();
      let existingData = [];
      if (lastRow > 1) {
        existingData = sheet.getRange(2, 1, lastRow - 1, 7).getValues(); // 7 colonnes maintenant
      }

      // 2. Filtrer pour GARDER les lignes des AUTRES sites
      const otherSitesData = existingData.filter(row => row[0] !== siteName);

      // 3. Préparer les nouvelles lignes
      const newRows = boardList.map(board => [
        siteName,
        board.name,
        "'" + board.id,
        board.pin_count || "",
        board.follower_count || "",
        board.description || "",
        new Date()
      ]);

      // 4. Combiner et réécrire TOUT (méthode brutale mais sûre pour trier/regrouper)
      const finalData = [...otherSitesData, ...newRows];

      // Trier par Nom de Site puis par Nom de Board pour faire propre
      finalData.sort((a, b) => {
        if (a[0] === b[0]) {
          return (a[1] < b[1]) ? -1 : (a[1] > b[1]) ? 1 : 0;
        }
        return (a[0] < b[0]) ? -1 : 1;
      });

      // Effacer le contenu existant (sauf en-têtes) et réécrire
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 7).clearContent();

      if (finalData.length > 0) {
        sheet.getRange(2, 1, finalData.length, 7).setValues(finalData);
        SpreadsheetApp.flush(); // FORCE l'écriture immédiate pour éviter les conflits de concurrence
      }

      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": `${newRows.length} boards mis à jour pour ${siteName}.` })).setMimeType(ContentService.MimeType.JSON);

      // --- CAS 3: C'est une confirmation de création de Pin (comportement par défaut) ---
    } else {
      Logger.log("--- 📥 Pin confirmation request detected ---");

      // Remplacer l'extraction par regex par un parsing JSON plus fiable
      const pinConfirmationData = requestData || JSON.parse(cleanBody);

      const row = pinConfirmationData.row_number;
      const pinId = pinConfirmationData.pin_id;
      const boardId = pinConfirmationData.board_id;
      // Récupérer le nom de la feuille depuis la requête, ou fallback sur la config par défaut
      const targetSheetName = pinConfirmationData.sheet_name || CONFIG.SHEET_NAME;

      if (!row || !pinId || !boardId) {
        throw new Error(`Données manquantes (row, pinId, ou boardId) depuis Pabbly. Corps de la requête reçu: ${body}`);
      }

      const recipesSheet = spreadsheet.getSheetByName(targetSheetName);
      if (!recipesSheet) throw new Error(`La feuille cible "${targetSheetName}" est introuvable.`);

      // S'assurer que les IDs sont traités comme des chaînes de caractères pour une comparaison fiable
      const boardIdStr = String(boardId);
      const pinIdStr = String(pinId);

      const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
      recipesSheet.getRange(row, CONFIG.PIN_ID_COLUMN_INDEX).setValue("'" + pinIdStr);
      recipesSheet.getRange(row, CONFIG.BOARD_ID_COLUMN_INDEX).setValue("'" + boardIdStr);
      recipesSheet.getRange(row, CONFIG.PIN_URL_COLUMN_INDEX).setValue(pinUrl);
      recipesSheet.getRange(row, CONFIG.PUBLICATION_DATE_COLUMN_INDEX).setValue(new Date());

      const originalTrigger = recipesSheet.getRange(row, CONFIG.TRIGGER_COLUMN_INDEX).getValue();
      const finalStatus = (originalTrigger === "En attente de Pabbly...") ? "published (auto)" : "published (manual)";
      recipesSheet.getRange(row, CONFIG.STATUS_COLUMN_INDEX).setValue(finalStatus);
      recipesSheet.getRange(row, CONFIG.TRIGGER_COLUMN_INDEX).clearContent();

      Logger.log(`Row ${row} updated successfully. Pin ID: ${pinId}`);
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": `Row ${row} updated.` })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    Logger.log(`Erreur dans doPost: ${error.message}`);
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.message })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}