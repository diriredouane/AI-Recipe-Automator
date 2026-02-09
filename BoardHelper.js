/**
 * @fileoverview Gère les interactions avec les tableaux (boards) Pinterest pour le multi-sites.
 */

/**
 * Initialise l'onglet "Boards" avec la nouvelle structure incluant le nom du site.
 * Crée la feuille si elle n'existe pas.
 */
function initializeBoardsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName("Boards");

  const headers = ["Site Name", "Board Name", "Board ID", "Pin Count", "Follower Count", "Description", "Last Checked"];

  if (!sheet) {
    sheet = spreadsheet.insertSheet("Boards");
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#e0e0e0");
    sheet.setFrozenRows(1);
    Logger.log("'Boards' sheet created with new structure.");
    SpreadsheetApp.getUi().alert("'Boards' sheet created successfully.");
  } else {
    // Si la feuille existe, on vérifie juste si la colonne Site Name est là
    const firstHeader = sheet.getRange(1, 1).getValue();
    if (firstHeader !== "Site Name") {
      SpreadsheetApp.getUi().alert("Warning: The 'Boards' sheet has an old structure. Please delete the 'Boards' tab and rerun this initialization.");
    } else {
      Logger.log("'Boards' sheet is valid and up to date.");
    }
  }
}

/**
 * Parcourt la configuration multi-comptes et demande la mise à jour des boards pour CHAQUE site.
 */
function updateAllSitesBoards() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = spreadsheet.getSheetByName("Config_Accounts");

  if (!configSheet) {
    SpreadsheetApp.getUi().alert("'Config_Accounts' sheet not found.");
    return;
  }

  // Initialiser la feuille Boards si elle n'existe pas
  initializeBoardsSheet();

  // Trouver dynamiquement les index des colonnes basés sur les en-têtes officiels
  const siteNameCol = getColumnIndexByHeader(configSheet, "Site Name");
  const listWebhookCol = getColumnIndexByHeader(configSheet, "Pabbly List Webhook");

  if (siteNameCol === -1 || listWebhookCol === -1) {
    SpreadsheetApp.getUi().alert("Erreur : Impossible de trouver les colonnes 'Site Name' ou 'Pabbly List Webhook' dans Config_Accounts.");
    return;
  }

  const configData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, configSheet.getLastColumn()).getValues();
  let requestCount = 0;

  configData.forEach(row => {
    const siteName = row[siteNameCol - 1];
    const listWebhookUrl = row[listWebhookCol - 1];

    if (siteName && listWebhookUrl) {
      Logger.log(`--- Board Sync Request for: ${siteName} ---`);

      try {
        const payload = {
          "action": "list_boards",
          "site_name": siteName
        };

        Logger.log(`📡 Webhook URL: ${listWebhookUrl}`);
        Logger.log(`📦 Payload: ${JSON.stringify(payload)}`);

        const options = {
          'method': 'post',
          'contentType': 'application/json',
          'payload': JSON.stringify(payload)
        };

        const response = UrlFetchApp.fetch(listWebhookUrl, options);
        Logger.log(`📥 Response Code: ${response.getResponseCode()}`);
        Logger.log(`📥 Response Body: ${response.getContentText()}`);

        requestCount++;

        // --- CRUCIAL : Pause pour éviter la concurrence ---
        Utilities.sleep(Math.floor(Math.random() * 3000) + 2000);

      } catch (e) {
        Logger.log(`❌ Error during call for ${siteName}: ${e.message}`);
      }
    }
  });

  SpreadsheetApp.getUi().alert(`${requestCount} update requests sent. Boards will appear progressively in the 'Boards' tab.`);
}

/**
 * Alias ou point d'entrée pour la mise à jour des détails des tableaux via le menu.
 * Appelle la synchronisation globale des sites.
 */
function updateAllBoardDetails() {
  Logger.log("Mise à jour des détails des tableaux demandée...");
  updateAllSitesBoards();
}