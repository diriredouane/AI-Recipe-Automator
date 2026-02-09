/**
 * @fileoverview Gère la configuration multi-comptes (Site Web + Pinterest).
 * Permet de centraliser les réglages pour basculer facilement d'un projet à l'autre.
 */

const ACCOUNTS_CONFIG_SHEET_NAME = "Config_Accounts";

/**
 * Initialise l'onglet de configuration multi-comptes.
 * - Si le sheet n'existe pas, le crée avec tous les en-têtes.
 * - Si le sheet existe, insère les colonnes manquantes au bon endroit sans détruire les données.
 */
function initializeAccountsConfigSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(ACCOUNTS_CONFIG_SHEET_NAME);

    // --- DÉFINITION DES EN-TÊTES ATTENDUS (ordre officiel de Config.js) ---
    const expectedHeaders = CONFIG.ACCOUNTS_HEADERS;

    // --- CAS 1: Le sheet n'existe pas -> On le crée proprement ---
    if (!sheet) {
        sheet = spreadsheet.insertSheet(ACCOUNTS_CONFIG_SHEET_NAME);
        Logger.log(`Sheet '${ACCOUNTS_CONFIG_SHEET_NAME}' created.`);

        // Configurer les en-têtes
        sheet.getRange(1, 1, 1, expectedHeaders.length)
            .setValues([expectedHeaders])
            .setFontWeight("bold")
            .setBackground("#d9ead3")
            .setHorizontalAlignment("center");
        sheet.setFrozenRows(1);

        // Remplir une ligne d'exemple
        const exampleRow = [
            "ExampleSite",
            "Paused", // Dropdown: Active / Paused
            "https://mydomain.com", // WP Base URL
            `=C2 & "/wp-json/custom/v1/create-recipe-post"`, // WP Recipe API (Formula)
            "Enter your WP Username",
            "Enter your WP App Password",
            "Enter your WP Author ID",
            "Enter your Facebook Page URL here (for articles)", // Facebook URL
            `=C2 & "/post-sitemap.xml"`, // Sitemap URL (Formula)
            "see documentation how to setup", // Pabbly Main Webhook
            "see documentation how to setup", // Pabbly List Webhook
            "see documentation how to setup", // Pabbly Board Info Webhook
            CONFIG.SLIDE_TEMPLATE_ID || "",
            CONFIG.COLLAGE_SLIDE_TEMPLATE_ID || "",
            "", 6, 0, "", "" // Drive Folder, Max, Counter, Date, FeaturedTemplate
        ];
        sheet.getRange(2, 1, 1, exampleRow.length).setValues([exampleRow]);

        // Ajouter la liste déroulante pour la colonne "Active"
        _applyActiveColumnValidation(sheet, 2);

        sheet.autoResizeColumns(1, expectedHeaders.length);
        SpreadsheetApp.getUi().alert(`Sheet '${ACCOUNTS_CONFIG_SHEET_NAME}' created successfully with ${expectedHeaders.length} columns.`);
        return;
    }

    // --- CAS 2: Le sheet existe -> Migration intelligente ---
    Logger.log(`Sheet '${ACCOUNTS_CONFIG_SHEET_NAME}' exists. Checking for missing columns...`);

    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let columnsAdded = 0;

    // Parcourir les en-têtes attendus dans l'ordre
    for (let i = 0; i < expectedHeaders.length; i++) {
        const expectedHeader = expectedHeaders[i];
        const currentHeaderAtPosition = existingHeaders[i];

        // Si l'en-tête attendu n'est pas à la bonne position
        if (currentHeaderAtPosition !== expectedHeader) {
            // Vérifier si cet en-tête existe ailleurs (pour éviter les doublons)
            const existingIndex = existingHeaders.indexOf(expectedHeader);

            if (existingIndex === -1) {
                // L'en-tête n'existe pas du tout -> On insère une nouvelle colonne
                sheet.insertColumnBefore(i + 1); // +1 car 1-indexed
                sheet.getRange(1, i + 1).setValue(expectedHeader)
                    .setFontWeight("bold")
                    .setBackground("#d9ead3")
                    .setHorizontalAlignment("center");

                // Définir une valeur par défaut pour les lignes existantes
                const lastRow = sheet.getLastRow();
                if (lastRow > 1 && expectedHeader === "Active") {
                    // Mettre "Active" par défaut pour tous les comptes existants
                    sheet.getRange(2, i + 1, lastRow - 1, 1).setValue("Active");
                    // Appliquer la validation dropdown
                    _applyActiveColumnValidation(sheet, i + 1);
                }

                // Mettre à jour notre copie locale des headers
                existingHeaders.splice(i, 0, expectedHeader);
                columnsAdded++;
                Logger.log(`✅ Column '${expectedHeader}' inserted at position ${i + 1}.`);
            }
        }
    }

    // Mettre à jour le style des en-têtes (au cas où)
    sheet.getRange(1, 1, 1, sheet.getLastColumn())
        .setFontWeight("bold")
        .setBackground("#d9ead3")
        .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getLastColumn());

    // --- MIGRATION DES VALEURS "Active" (TRUE/FALSE -> Active/Paused) ---
    const activeColIndex = existingHeaders.indexOf("Active");
    if (activeColIndex !== -1) {
        const activeColumn = activeColIndex + 1; // 1-based
        const lastRow = sheet.getLastRow();

        if (lastRow > 1) {
            const activeValues = sheet.getRange(2, activeColumn, lastRow - 1, 1).getValues();
            let valuesUpdated = 0;

            for (let i = 0; i < activeValues.length; i++) {
                const val = activeValues[i][0];
                // Convertir TRUE/true/1 -> "Active", FALSE/false/0/"" -> "Paused"
                if (val === true || val === "TRUE" || val === "true" || val === 1) {
                    activeValues[i][0] = "Active";
                    valuesUpdated++;
                } else if (val === false || val === "FALSE" || val === "false" || val === 0 || val === "") {
                    activeValues[i][0] = "Paused";
                    valuesUpdated++;
                }
                // Si déjà "Active" ou "Paused", on ne touche pas
            }

            if (valuesUpdated > 0) {
                sheet.getRange(2, activeColumn, lastRow - 1, 1).setValues(activeValues);
                Logger.log(`✅ Converted ${valuesUpdated} value(s) in 'Active' column to dropdown format.`);
            }

            // Appliquer la validation dropdown dans tous les cas
            _applyActiveColumnValidation(sheet, activeColumn);
        }
    }

    if (columnsAdded > 0) {
        SpreadsheetApp.getUi().alert(`Migration complete! ${columnsAdded} new column(s) added to '${ACCOUNTS_CONFIG_SHEET_NAME}'.`);
    } else {
        SpreadsheetApp.getUi().alert(`Sheet '${ACCOUNTS_CONFIG_SHEET_NAME}' updated. Dropdown validation applied.`);
    }
}

/**
 * Récupère la configuration spécifique à un site en fonction du nom de la feuille.
 * @param {string} sheetName Le nom de la feuille (ex: "Recipes" ou "Data-SimpleBites").
 * @returns {object} Un objet de configuration complet.
 */
function getAccountConfigForSheet(sheetName) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName(ACCOUNTS_CONFIG_SHEET_NAME);

    if (!configSheet) {
        throw new Error(`La feuille de configuration '${ACCOUNTS_CONFIG_SHEET_NAME}' est introuvable.`);
    }

    const data = configSheet.getDataRange().getValues();
    if (data.length < 2) {
        throw new Error("Le tableau de configuration Config_Accounts est vide.");
    }

    // --- MAPPING DES COLONNES PAR NOM (Flexible) ---
    const headers = data[0]; // La première ligne contient les noms
    const colMap = {};
    headers.forEach((header, index) => {
        colMap[header] = index;
    });

    // Fonction helper pour récupérer une valeur par nom de colonne
    const getValue = (row, colName) => {
        const index = colMap[colName];
        return (index !== undefined) ? row[index] : "";
    };

    let configRow = null;
    let rowIndex = -1;

    // Recherche de la ligne correspondant au site
    if (sheetName.startsWith("Data-")) {
        const targetSiteName = sheetName.replace("Data-", "").trim();
        const siteNameIndex = colMap["Site Name"];

        if (siteNameIndex === undefined) throw new Error("Colonne 'Site Name' introuvable dans Config_Accounts.");

        for (let i = 1; i < data.length; i++) {
            if (data[i][siteNameIndex] === targetSiteName) {
                configRow = data[i];
                rowIndex = i + 1; // 1-based index for Spreadsheets
                break;
            }
        }
    }

    // Si on a trouvé une ligne, on construit l'objet de config
    if (configRow) {
        Logger.log(`[CONFIG] Found config for '${sheetName}' (Row ${rowIndex})`);

        return {
            siteName: getValue(configRow, "Site Name"),
            isActive: getValue(configRow, "Active") === "Active", // TRUE seulement si exactement "Active"
            wpBaseUrl: getValue(configRow, "WP Base URL"),
            wpRecipeApi: getValue(configRow, "WP Recipe API"),
            wpUser: getValue(configRow, "WP User"),
            wpAppPassword: getValue(configRow, "WP App Password"),
            wpAuthorId: getValue(configRow, "WP Author ID"),
            facebookUrl: getValue(configRow, "Facebook URL"),
            sitemapUrl: getValue(configRow, "Sitemap URL"),
            pabblyWebhook: getValue(configRow, "Pabbly Main Webhook"),
            pabblyListWebhook: getValue(configRow, "Pabbly List Webhook"),
            pabblyBoardInfoWebhook: getValue(configRow, "Pabbly Board Info Webhook"),
            slideTemplateId: getValue(configRow, "Pin Slide Template ID"),
            collageTemplateId: getValue(configRow, "Collage Slide Template ID"),
            driveFolderId: getValue(configRow, "Drive Export Folder ID"),
            maxPostsPerDay: getValue(configRow, "Max Posts / Day") || 6,
            dailyCounter: getValue(configRow, "Daily Counter") || 0,
            lastResetDate: getValue(configRow, "Last Reset Date"),
            wpFeaturedImageTemplateId: getValue(configRow, "WP Featured Image Template ID"),
            // On sauvegarde les INDEX de colonnes pour les mises à jour (compteurs)
            configRowIndex: rowIndex,
            cols: {
                dailyCounter: (colMap["Daily Counter"] + 1), // +1 pour A1 notation
                lastResetDate: (colMap["Last Reset Date"] + 1)
            }
        };
    }

    // Par défaut, si rien n'est trouvé, on lève une erreur car chaque feuille de données DOIT correspondre à un site
    throw new Error(`No configuration found for sheet '${sheetName}'. Please ensure the sheet name follows the format 'Data-{SiteName}' and matches an entry in Config_Accounts.`);
}

/**
 * Parcourt le tableau Config_Accounts et crée les feuilles "Data-NomDuSite" manquantes.
 */
function createSiteDataSheets() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName(ACCOUNTS_CONFIG_SHEET_NAME);
    if (!configSheet) {
        SpreadsheetApp.getUi().alert(`The '${ACCOUNTS_CONFIG_SHEET_NAME}' sheet was not found.`);
        return;
    }

    // Trouver l'index de la colonne "Site Name"
    const siteNameColIndex = getColumnIndexByHeader(configSheet, "Site Name");
    if (siteNameColIndex === -1) {
        SpreadsheetApp.getUi().alert("Error: 'Site Name' column not found in Config_Accounts.");
        return;
    }

    const configData = configSheet.getRange(2, siteNameColIndex, configSheet.getLastRow() - 1, 1).getValues();
    let createdCount = 0;

    configData.forEach(row => {
        const siteName = row[0];
        if (siteName) { // On traite TOUTES les lignes, même la première si elle a un nom
            const dataSheetName = `Data-${siteName}`;
            let dataSheet = spreadsheet.getSheetByName(dataSheetName);

            if (!dataSheet) {
                dataSheet = spreadsheet.insertSheet(dataSheetName);
                // Appliquer les en-têtes standards définis dans Config.js
                dataSheet.getRange(1, 1, 1, CONFIG.SHEET_HEADERS.length)
                    .setValues([CONFIG.SHEET_HEADERS])
                    .setFontWeight('bold')
                    .setBackground('#cfe2f3'); // Bleu clair pour distinguer des configs

                dataSheet.setFrozenRows(1);

                // Ajouter des lignes d'exemple pour tester
                const sampleData = [
                    ["", "", "Campfire Chicken Pot Pie Packets – Creamy, Cozy & Foil-Wrapped for Fall Nights", "https://drive.google.com/file/d/1WsR5TNeCfvCXXs5aCc0T2-9QhWvIDJrC/view?usp=drivesdk", "", ""],
                    ["", "", "This cranberry chutney combines tart cranberries and sweet apples with warm spices for a flavor-packed holiday side dish that’s anything but ordinary. | Get the recipe at the link in the comments ⬇️", "https://drive.google.com/file/d/1KtOJDQqkjFKRerqZMHhWLtRU8HZFDaiD/view?usp=drivesdk", "", ""],
                    ["", "", "Olive Gardens Slow Cooker Chicken Pasta is Our New Favorite Easy Weeknight Recipe | Get the recipe at the link in the comments ⬇️", "https://drive.google.com/file/d/1wq6g4ilMJ6isSW1XXPwpYCZ6eArDL2du/view?usp=drivesdk", "", ""]
                ];
                dataSheet.getRange(2, 1, 3, 6).setValues(sampleData);

                createdCount++;
                Logger.log(`Sheet '${dataSheetName}' created.`);

                // Appliquer la validation de liste déroulante sur la colonne Trigger (A)
                _applyTriggerColumnValidation(dataSheet);

                // Appliquer la formule de compte de caractères sur la colonne O (15)
                _applyFormulaToColumnO(dataSheet);
            }
        }
    });

    if (createdCount > 0) {
        SpreadsheetApp.getUi().alert(`${createdCount} new site sheet(s) created successfully.`);
    } else {
        SpreadsheetApp.getUi().alert("No new sites detected in configuration. All sheets already exist.");
    }
}

/**
 * Applique une validation de liste déroulante (Active/Paused) à la colonne "Active".
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet La feuille Config_Accounts.
 * @param {number} columnIndex L'index de la colonne "Active" (1-based).
 * @private
 */
function _applyActiveColumnValidation(sheet, columnIndex) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return; // Pas de données à valider

    const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Active", "Paused"], true) // true = afficher dropdown
        .setAllowInvalid(false) // Empêcher les valeurs non valides
        .setHelpText("Choisir 'Active' pour activer le compte ou 'Paused' pour le mettre en pause.")
        .build();

    sheet.getRange(2, columnIndex, lastRow - 1, 1).setDataValidation(rule);
    Logger.log(`✅ Dropdown validation applied to 'Active' column (col ${columnIndex}).`);
}

/**
 * Applique une validation de liste déroulante à la colonne Trigger des feuilles Data.
 * Exclut UPDATE_ARTICLE selon la demande utilisateur.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet La feuille Data-XXX.
 * @private
 */
function _applyTriggerColumnValidation(sheet) {
    const triggerOptions = [
        CONFIG.TRIGGER_TEXT,       // OK
        CONFIG.TRIGGER_DRAFT_TEXT, // DRAFT
        CONFIG.TRIGGER_PIN_TEXT,   // PIN
        CONFIG.TRIGGER_PIN_LINK_TEXT, // PIN_LINK
        CONFIG.TRIGGER_ADD_CARD_TEXT  // ADD_CARD
    ];

    const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(triggerOptions, true)
        .setAllowInvalid(true) // On permet l'invalide au cas où l'utilisateur veut taper autre chose (ex: UPDATE_ARTICLE manuellement)
        .setHelpText("Choisissez une action pour cette ligne.")
        .build();

    // Appliquer sur les 1000 premières lignes (ou ajuster selon besoin)
    sheet.getRange(2, CONFIG.TRIGGER_COLUMN_INDEX, 1000, 1).setDataValidation(rule);
    Logger.log(`✅ Dropdown validation applied to Trigger column for ${sheet.getName()}.`);
}

/**
 * Applique la formule de compte de caractères à la colonne O.
 * Formule: =IF(C2="",, LEN(C2))
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet La feuille Data-XXX.
 * @private
 */
function _applyFormulaToColumnO(sheet) {
    // Colonne 15 (O), on se base sur la colonne 3 (C)
    // IMPORTANT : Apps Script utilise TOUJOURS la syntaxe US (IF, LEN, virgule) dans le code.
    // Google Sheets traduit AUTOMATIQUEMENT en Français (SI, NBCAR, ;) dans l'interface pour l'utilisateur.
    // Utiliser setFormula sur une plage ajuste automatiquement les références (C2 -> C3, etc.)
    const range = sheet.getRange(2, 15, 1000, 1);
    range.setFormula('=IF(C2="", "", LEN(C2))');

    Logger.log(`✅ Character count formula (US syntax, auto-translated to FR) applied to column O for ${sheet.getName()}.`);
}
