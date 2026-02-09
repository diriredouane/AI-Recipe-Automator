/**
 * @fileoverview Gestion de l'installation initiale du projet.
 * Crée les feuilles indispensables pour démarrer.
 */

/**
 * Lance l'installation initiale du projet.
 * 1. Crée l'onglet "Setting" pour la clé API Gemini.
 * 2. Initialise l'onglet "Config_Accounts" pour les sites.
 * 3. Affiche un guide de démarrage.
 */
function installProject() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    let createdCount = 0;

    Logger.log("--- 🏁 Starting Project Installation ---");

    // 1. Création de l'onglet "Setting"
    let settingSheet = spreadsheet.getSheetByName("Setting");
    if (!settingSheet) {
        settingSheet = spreadsheet.insertSheet("Setting");

        // En-têtes et exemple
        settingSheet.getRange("A1:B1").setValues([["LLM", "key"]]).setFontWeight("bold").setBackground("#d9ead3");
        settingSheet.getRange("A2:B2").setValues([["Gemini", "[ENTER YOUR KEY HERE]"]]);

        // Style
        settingSheet.autoResizeColumns(1, 2);
        createdCount++;
        Logger.log("✅ 'Setting' sheet created.");
    } else {
        Logger.log("ℹ️ 'Setting' sheet already exists.");
    }

    // 2. Création de "Config_Accounts" et des Dossiers Drive
    // Structure: Dossier Parent (Nom du Sheet) > Dossier Images (Pinterest Images Export)
    let imageFolderId = "";
    let copiedTemplateIds = {
        pin: "",
        collage: "",
        wp: ""
    };

    try {
        const spreadsheetName = spreadsheet.getName();
        const parentFolders = DriveApp.getFoldersByName(spreadsheetName);
        let parentFolder;

        // 2a. Création du Dossier Parent (Toujours un nouveau)
        parentFolder = DriveApp.createFolder(spreadsheetName);
        Logger.log(`✅ Parent folder created: '${spreadsheetName}' (ID: ${parentFolder.getId()})`);

        // 2b. Création du Sous-Dossier Images
        const imagesFolderName = "Pinterest Images Export";
        // Pas besoin de vérifier, "parentFolder" est tout neuf
        const newImageFolder = parentFolder.createFolder(imagesFolderName);
        imageFolderId = newImageFolder.getId();
        Logger.log(`✅ Image folder created: '${imagesFolderName}' (ID: ${imageFolderId})`);


        // 2c. Copie des Templates Slides (dans le Parent Folder) - ROBUSTE
        const templateIdsToCopy = {
            pin: "1aYdeZiRritOk_hTElA-X8YhzAVbIbTdeBF-JMC0yE1I",
            collage: "1GsylTeE4QzDknZ4-ROe0xTL5RzKQ12vtCiXo41-AjeU",
            wp: "1JIoiF4Fxi23olsnzqlvkz7NDK4fE08A7x_gDgDdbVdE"
        };
        // copiedTemplateIds est déjà déclaré plus haut

        // Copie Pin Slide
        try {
            const pinFile = DriveApp.getFileById(templateIdsToCopy.pin);
            const copiedPin = pinFile.makeCopy(`Pin Slide Template - ${spreadsheetName}`, parentFolder);
            copiedTemplateIds.pin = copiedPin.getId();
            Logger.log(`✅ Pin Slide Template copied (ID: ${copiedTemplateIds.pin})`);
        } catch (e) { Logger.log(`⚠️ Error copying PIN template: ${e.message}`); }

        // Copie Collage Slide
        try {
            const collageFile = DriveApp.getFileById(templateIdsToCopy.collage);
            const copiedCollage = collageFile.makeCopy(`Collage Slide Template - ${spreadsheetName}`, parentFolder);
            copiedTemplateIds.collage = copiedCollage.getId();
            Logger.log(`✅ Collage Slide Template copied (ID: ${copiedTemplateIds.collage})`);
        } catch (e) { Logger.log(`⚠️ Error copying COLLAGE template: ${e.message}`); }

        // Copie WP Featured Image
        try {
            const wpFile = DriveApp.getFileById(templateIdsToCopy.wp);
            const copiedWp = wpFile.makeCopy(`WP Featured Template - ${spreadsheetName}`, parentFolder);
            copiedTemplateIds.wp = copiedWp.getId();
            Logger.log(`✅ WP Featured Template copied (ID: ${copiedTemplateIds.wp})`);
        } catch (e) { Logger.log(`⚠️ Error copying WP template: ${e.message}`); }

        // 2d. Création du fichier PHP Snippet (pour functions.php)
        try {
            parentFolder.createFile("wp-functions-snippet.php", WP_FUNCTIONS_SNIPPET, MimeType.PLAIN_TEXT);
            Logger.log(`✅ 'wp-functions-snippet.php' created in parent folder.`);
        } catch (e) {
            Logger.log(`⚠️ Error creating PHP snippet file: ${e.message}`);
        }

        // 2e. Copie du dossier Documentation depuis le Master
        try {
            const docFolder = copyDocumentationFolder(parentFolder);
            if (docFolder) {
                Logger.log(`✅ Documentation folder copied successfully.`);
            } else {
                Logger.log(`⚠️ Documentation folder copy failed (returned null).`);
            }
        } catch (e) {
            Logger.log(`⚠️ Error copying Documentation folder: ${e.message}`);
        }

    } catch (e) {
        Logger.log(`⚠️ Error creating Drive folders: ${e.message}`);
    }

    // On appelle la fonction d'initialisation
    if (typeof initializeAccountsConfigSheet === 'function') {
        initializeAccountsConfigSheet();

        // INSTANTANÉMENT après la création, on injecte l'ID du dossier IMAGES et des TEMPLATES dans la config
        const configSheet = spreadsheet.getSheetByName("Config_Accounts");
        if (configSheet && configSheet.getLastRow() >= 2) {
            const headers = configSheet.getRange(1, 1, 1, configSheet.getLastColumn()).getValues()[0];

            // Helper pour trouver et remplir une colonne
            const setConfigValue = (headerName, value) => {
                const colIndex = headers.indexOf(headerName) + 1;
                if (colIndex > 0 && value) {
                    configSheet.getRange(2, colIndex).setValue(value);
                    Logger.log(`✅ '${headerName}' set to '${value}' (Col ${colIndex})`);
                }
            };

            // Injection des valeurs
            setConfigValue("Drive Export Folder ID", imageFolderId);
            setConfigValue("Pin Slide Template ID", copiedTemplateIds.pin);
            setConfigValue("Collage Slide Template ID", copiedTemplateIds.collage);
            // setConfigValue("WP Featured Image Template ID", copiedTemplateIds.wp); // Optionnel, on ne le remplit pas par défaut
        }
    } else {
        ui.alert("Erreur critique: La fonction 'initializeAccountsConfigSheet' est introuvable.");
        return;
    }

    // 3. Message final
    // 3. Final Message
    let message = "Installation successfully completed! 🎉\n\n";
    message += "✅ Drive Folders & Templates created:\n";
    message += "   📂 " + spreadsheet.getName() + " (Parent)\n";
    message += "   ├── 📂 Pinterest Images Export\n";
    message += "   ├── 📂 📚 Documentation\n";
    message += "   ├── 📄 Pin Slide Template\n";
    message += "   ├── 📄 Collage Slide Template\n";
    message += "   ├── 📄 WP Featured Template\n";
    message += "   └── 📄 wp-functions-snippet.php\n\n";
    message += "👉 STEP 1 : Go to 'Setting' tab and replace '[ENTER YOUR KEY HERE]' with your Gemini API Key (cell B2).\n";
    message += "👉 STEP 2 : Go to 'Config_Accounts' tab. Folder ID & Template IDs have been auto-filled!\n";
    message += "👉 STEP 3 : Configure the rest of your site, then run '🚀 AUTOMATION' > 'Update Site Tabs'.\n\n";

    ui.alert(message);

    // Refresh menus to show all available options now that installation is complete
    onOpen();
}


