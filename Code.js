/**
 * @fileoverview Main orchestrator for the Pin creation process.
 * This file contains the `onEdit` trigger and main logic that calls helpers.
 */

/**
 * Triggers when the spreadsheet is opened.
 * Centralizes all menus to avoid conflicts between files.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Check if installation has been completed (both sheets exist)
  const settingSheet = ss.getSheetByName("Setting");
  const configSheet = ss.getSheetByName("Config_Accounts");
  const isInstalled = settingSheet && configSheet;

  // 0. Start Menu (Always visible)
  ui.createMenu('🏁 START HERE')
    .addItem('Install / Reset Project', 'installProject')
    .addToUi();

  // If not installed, hide all other menus
  if (!isInstalled) {
    return;
  }

  // 1. Actions Menu
  ui.createMenu('⚡ ACTIONS')
    .addItem('1. Create Site Sheets', 'createSiteDataSheets')
    .addSeparator()
    .addItem('2. Get/Sync All Pinterest Boards', 'updateAllSitesBoards')
    .addItem('3. Update Board Details', 'updateAllBoardDetails')
    .addSeparator()
    .addItem('4. Enable Automation (Triggers)', 'setupAutomatedTriggers')
    .addToUi();

  // 2. Help Menu
  ui.createMenu('📚 HELP & DOCS')
    .addSubMenu(ui.createMenu('📖 PDF Guides')
      .addItem('🚀 Getting Started Guide', 'openGettingStartedPDF')
      .addItem('🔗 Pabbly Connect Setup', 'openPabblyPDF')
      .addItem('🔧 WordPress Setup Guide', 'openWordPressPDF')
      .addItem('🎨 Slides Templates Guide', 'openSlidesPDF'))
    .addSeparator()
    .addItem('Quick Help: WordPress', 'showWordPressSetupHelp')
    .addItem('Quick Help: Pabbly', 'showPabblySetupHelp')
    .addItem('Quick Help: Web App', 'showWebAppDeployHelp')
    .addToUi();

  // Hidden Menus (Controlled by CONFIG flags)
  if (!CONFIG.HIDE_PROJECT_MGMT_MENU) {
    ui.createMenu('📊 PROJECT MGMT')
      .addItem('Update Development Roadmap', 'updateProjectPlan')
      .addToUi();
  }

  if (!CONFIG.HIDE_AUDIT_MENU) {
    ui.createMenu('📑 AUDIT')
      .addItem('1. Create Audit Tabs', 'createAuditSheets')
      .addItem('2. Scan Metadata (All Sites)', 'syncAllSitesAuditData')
      .addSeparator()
      .addItem('3. Help / Audit Guide', 'showAuditHelp')
      .addToUi();
  }
}

/**
 * Shows a help dialog for WordPress setup with a link to the PDF.
 */
function showWordPressSetupHelp() {
  const pdfUrl = PropertiesService.getScriptProperties().getProperty('PDF_WORDPRESS_URL');
  const message = `
    <h3 style="margin-top:0;">🔧 WORDPRESS SETUP QUICK GUIDE</h3>
    <ol style="text-align:left; padding-left:20px;">
      <li>Go to your Google Drive folder created during installation.</li>
      <li>Open the file '<b>wp-functions-snippet.php</b>'.</li>
      <li>Copy ALL the code inside.</li>
      <li>In WordPress, go to <b>Appearance > Theme File Editor > functions.php</b>.</li>
      <li>Paste the code at the bottom of the file and click <b>Update File</b>.</li>
    </ol>
    <p>This enables <b>Rank Math SEO</b> meta fields and <b>WP Recipe Maker</b> API creation.</p>
    <br>
    ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" style="background-color: #1a73e8; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">📖 OPEN FULL PDF GUIDE</a>` : '<p style="color:red;">PDF URL not found. Please run installation again.</p>'}
  `;
  showHtmlDialog('WordPress Setup', message);
}

/**
 * Shows a help dialog for Pabbly Connect setup with a link to the PDF.
 */
function showPabblySetupHelp() {
  const pdfUrl = PropertiesService.getScriptProperties().getProperty('PDF_PABBLY_URL');
  const message = `
    <h3 style="margin-top:0;">🔗 PABBLY CONNECT QUICK GUIDE</h3>
    <ol style="text-align:left; padding-left:20px;">
      <li>Clone the Pabbly workflows (links in README).</li>
      <li>Reconnect the <b>Google Sheets</b>, <b>Drive</b>, and <b>Pinterest</b> accounts.</li>
      <li>Copy the <b>Webhook URL</b> from Pabbly and paste it into the 'Config_Accounts' sheet.</li>
      <li>Deploy this script as a Web App (Extensions > Apps Script > Deploy > New deployment).</li>
      <li>Copy the Web App URL and paste it into the Pabbly 'HTTP Request' step.</li>
    </ol>
    <br>
    ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" style="background-color: #1a73e8; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">📖 OPEN FULL PDF GUIDE</a>` : '<p style="color:red;">PDF URL not found. Please run installation again.</p>'}
  `;
  showHtmlDialog('Pabbly Connect Setup', message);
}

/**
 * Shows a help dialog for Web App deployment.
 */
function showWebAppDeployHelp() {
  const pdfUrl = PropertiesService.getScriptProperties().getProperty('PDF_PABBLY_URL');
  const message = `
    <h3 style="margin-top:0;">☁️ WEB APP DEPLOYMENT</h3>
    <p>Pabbly needs a URL to communicate with this script.</p>
    <ol style="text-align:left; padding-left:20px;">
      <li>In this Sheet, go to <b>Extensions > Apps Script</b>.</li>
      <li>Top right, click <b>Deploy > New deployment</b>.</li>
      <li>Click the gear icon > Select <b>Web App</b>.</li>
      <li>Configure:
        <ul>
          <li>Description: "Prod"</li>
          <li>Execute as: "Me" (your email)</li>
          <li>Who has access: "Anyone"</li>
        </ul>
      </li>
      <li>Click <b>Deploy</b>.</li>
      <li>COPY the Web App URL.</li>
      <li>Paste it in the Pabbly "HTTP Request" step.</li>
    </ol>
    <p style="background-color:#fff3cd; padding:5px; border-radius:4px;">⚠️ Each time you update the code, create a NEW deployment!</p>
    <br>
    ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" style="background-color: #1a73e8; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">📖 OPEN PABBLY PDF GUIDE</a>` : '<p style="color:red;">PDF URL not found. Please run installation again.</p>'}
  `;
  showHtmlDialog('Web App Deployment', message);
}

/**
 * Opens the Pabbly PDF Guide URL stored in Script Properties.
 */
function openPabblyPDF() {
  const url = PropertiesService.getScriptProperties().getProperty('PDF_PABBLY_URL');
  if (url) {
    openUrlInDialog(url, 'Pabbly Setup Guide');
  } else {
    SpreadsheetApp.getUi().alert('PDF not found. Please run installation again.');
  }
}

/**
 * Opens the WordPress PDF Guide URL stored in Script Properties.
 */
function openWordPressPDF() {
  const url = PropertiesService.getScriptProperties().getProperty('PDF_WORDPRESS_URL');
  if (url) {
    openUrlInDialog(url, 'WordPress Setup Guide');
  } else {
    SpreadsheetApp.getUi().alert('PDF not found. Please run installation again.');
  }
}

/**
 * Opens the Getting Started PDF Guide URL stored in Script Properties.
 */
function openGettingStartedPDF() {
  const url = PropertiesService.getScriptProperties().getProperty('PDF_GETTING_STARTED_URL');
  if (url) {
    openUrlInDialog(url, 'Getting Started Guide');
  } else {
    SpreadsheetApp.getUi().alert('PDF not found. Please run installation again.');
  }
}

/**
 * Opens the Slides Templates PDF Guide URL stored in Script Properties.
 */
function openSlidesPDF() {
  const url = PropertiesService.getScriptProperties().getProperty('PDF_SLIDES_GUIDE_URL');
  if (url) {
    openUrlInDialog(url, 'Google Slides Templates Guide');
  } else {
    SpreadsheetApp.getUi().alert('PDF not found. Please run installation again.');
  }
}

/**
 * Opens a URL in a small dialog window.
 */
function openUrlInDialog(url, title) {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <p>Click the button below to open the <b>${title}</b>:</p>
        <br>
        <a href="${url}" target="_blank" 
           style="background-color: #1a73e8; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 4px; font-weight: bold;">
           OPEN PDF GUIDE
        </a>
        <br><br>
        <p style="font-size: 0.8em; color: #666;">Note: The link will open in a new tab.</p>
      </body>
    </html>
  `;
  const userInterface = HtmlService.createHtmlOutput(html)
    .setWidth(350)
    .setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(userInterface, title);
}

/**
 * Shows an HTML dialog with the given title and content.
 */
function showHtmlDialog(title, content) {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #333;">
        ${content}
      </body>
    </html>
  `;
  const userInterface = HtmlService.createHtmlOutput(html)
    .setWidth(450)
    .setHeight(400); // Increased height for content
  SpreadsheetApp.getUi().showModalDialog(userInterface, title);
}

/**
 * Triggers automatically when a user modifies the spreadsheet.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The event object.
 */
function onEditTrigger(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const triggerValue = range.getValue().toUpperCase();

  // Trigger for recipe processing (Data-XXX)
  const isRecipeSheet = sheet.getName().startsWith("Data-");

  if (isRecipeSheet &&
    range.getColumn() === CONFIG.TRIGGER_COLUMN_INDEX &&
    [CONFIG.TRIGGER_TEXT, CONFIG.TRIGGER_DRAFT_TEXT, CONFIG.TRIGGER_PIN_TEXT, CONFIG.TRIGGER_PIN_LINK_TEXT, CONFIG.TRIGGER_UPDATE_TEXT, CONFIG.TRIGGER_ADD_CARD_TEXT, CONFIG.TRIGGER_AUTOMATION_TEXT].includes(triggerValue)) {

    const row = range.getRow();
    processRecipeRow(sheet, row, triggerValue);
    return;
  }

  // Trigger for AUDIT (CALC or FIX)
  if (sheet.getName().startsWith("AUDIT-") &&
    range.getColumn() === 10) { // Colonne J

    const row = range.getRow();
    if (triggerValue === "CALC") {
      calculateRowHealth(sheet, row); // Appel de la fonction dans AuditHelper.js
    } else if (triggerValue === "FIX") {
      fixArticleUrls(sheet, row); // Appel de la fonction dans AuditHelper.js
    } else if (triggerValue === "SUPER_FIX") {
      superFixArticle(sheet, row); // Appel de la fonction dans AuditHelper.js
    } else if (triggerValue === "READ_SITEMAP") {
      testSitemapReading(sheet, row); // Nouvelle fonction de test
    } else if (triggerValue === "FIX_RECIPE_IMAGE") {
      fixRecipeImage(sheet, row); // Répare l'image de la recette
    } else if (triggerValue === "CORRECT_CATEGORY") {
      correctCategoryForPost(sheet, row); // Corrige la catégorie
    }
    return;
  }


}

/**
 * Traite une ligne spécifique de la feuille de calcul pour générer et publier une recette.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet L'objet de la feuille active.
 * @param {number} row Le numéro de la ligne à traiter.
 */
function processRecipeRow(sheet, row, triggerValue) {
  const accountConfig = getAccountConfigForSheet(sheet.getName());
  const errorCell = sheet.getRange(row, CONFIG.ERROR_COLUMN_INDEX);
  const triggerCell = sheet.getRange(row, CONFIG.TRIGGER_COLUMN_INDEX);

  const costBreakdown = []; // Initialiser le suivi des coûts pour cette ligne

  // --- VÉRIFICATION: Compte actif ? ---
  if (!accountConfig.isActive) {
    Logger.log(`⚠️ [PAUSED] Account '${accountConfig.siteName}' is disabled. Skipping row ${row}.`);
    triggerCell.setValue("⏸️ PAUSED");
    errorCell.setValue(`Account '${accountConfig.siteName}' is paused for maintenance.`);
    return;
  }

  triggerCell.setValue("1/X - Starting...");
  errorCell.clearContent();
  SpreadsheetApp.flush(); // Force la mise à jour de l'UI

  // Lire les données essentielles de la ligne une seule fois au début.
  let recipeContent = sheet.getRange(row, CONFIG.RECIPE_TITLE_COLUMN_INDEX).getValue();
  const sourceImageUrl = sheet.getRange(row, CONFIG.PHOTO_URL_COLUMN_INDEX).getValue();

  try {
    // --- NOUVEAU FLUX DE TRAVAIL POUR LE DÉCLENCHEUR "ADD_CARD" ---
    if (triggerValue === CONFIG.TRIGGER_ADD_CARD_TEXT) {
      const editUrl = sheet.getRange(row, CONFIG.WP_EDIT_URL_COLUMN_INDEX).getValue();
      if (!editUrl) throw new Error("Le déclencheur 'ADD_CARD' nécessite une URL d'édition WordPress dans la colonne G.");

      const postIdMatch = editUrl.match(/post=(\d+)/);
      if (!postIdMatch || !postIdMatch[1]) throw new Error("Impossible d'extraire l'ID du post depuis l'URL d'édition.");
      const postId = postIdMatch[1];

      triggerCell.setValue("1/4 - Reading WP post...");
      SpreadsheetApp.flush();
      const articleHtmlValue = getWordPressPostContent(postId, accountConfig);
      if (!articleHtmlValue) throw new Error("Impossible de récupérer le contenu du post.");

      // Détection rapide de carte existante
      if (articleHtmlValue.includes("wprm-recipe")) {
        triggerCell.setValue("Card already exists");
        sheet.getRange(row, CONFIG.STATUS_COLUMN_INDEX).setValue("Card exists");
        return;
      }

      // Récupérer l'Image Principale (Featured Media) pour la Recipe Card
      let featuredMediaId = null;
      try {
        const baseUrl = accountConfig.wpBaseUrl.replace(/\/$/, "");
        const wpHeaders = { 'Authorization': 'Basic ' + Utilities.base64Encode(accountConfig.wpUser + ':' + accountConfig.wpAppPassword) };
        const getUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}?_fields=featured_media`;
        const metaResponse = UrlFetchApp.fetch(getUrl, { 'headers': wpHeaders, 'muteHttpExceptions': true });
        const metaData = JSON.parse(metaResponse.getContentText());
        featuredMediaId = (metaData.featured_media && metaData.featured_media > 0) ? metaData.featured_media : null;
      } catch (e) {
        Logger.log("ADD_CARD: Could not fetch featured image - " + e.message);
      }

      triggerCell.setValue("2/4 - Gemini extraction...");
      SpreadsheetApp.flush();
      const recipeDataResult = extractRecipeDataFromHtml(articleHtmlValue);
      if (!recipeDataResult || !recipeDataResult.data) throw new Error("Échec de l'extraction des données de la recette.");
      costBreakdown.push({ name: 'Extract Recipe from HTML', usage: recipeDataResult.usage, model: 'gemini-2.5-flash' });

      triggerCell.setValue("3/4 - Creating card...");
      SpreadsheetApp.flush();
      const rd = recipeDataResult.data;
      const cardResult = createRecipeCard(
        rd.title,
        rd.summary,
        rd.ingredients,
        rd.instructions,
        rd.servings,
        rd.prep_time,
        rd.cook_time,
        accountConfig,
        featuredMediaId // AJOUT IMAGE (V30)
      );
      if (!cardResult || !cardResult.shortcode) throw new Error("Échec de la création de la fiche recette.");

      triggerCell.setValue("4/4 - Updating WP...");
      SpreadsheetApp.flush();
      const finalHtmlWithCard = articleHtmlValue + `\n\n<!-- WP Recipe Maker Card -->\n${cardResult.shortcode}\n`;
      const updateResult = updateWordPressPostContent(postId, finalHtmlWithCard, accountConfig);

      if (updateResult) {
        triggerCell.setValue("Card Added Successfully");
        sheet.getRange(row, CONFIG.STATUS_COLUMN_INDEX).setValue("Card added");
      } else {
        throw new Error("L'ajout de la card a échoué lors de la mise à jour WP.");
      }
      return;
    }

    // --- FLUX DE TRAVAIL POUR LE DÉCLENCHEUR "PIN_LINK" ---
    if (triggerValue === CONFIG.TRIGGER_PIN_LINK_TEXT) {
      const publicUrl = sheet.getRange(row, CONFIG.WP_PUBLIC_URL_COLUMN_INDEX).getValue();
      const editUrl = sheet.getRange(row, CONFIG.WP_EDIT_URL_COLUMN_INDEX).getValue();
      let destinationLink = "";

      if (publicUrl) {
        // Cas 1: L'URL publique existe déjà, on l'utilise.
        triggerCell.setValue("1/1 - Using existing public link...");
        destinationLink = publicUrl;
      } else if (editUrl) {
        // Cas 2: L'URL d'édition existe, on publie le brouillon.
        triggerCell.setValue("1/3 - Publishing draft...");
        SpreadsheetApp.flush();
        const postIdMatch = editUrl.match(/post=(\d+)/);
        if (!postIdMatch || !postIdMatch[1]) throw new Error("Impossible d'extraire l'ID du post depuis l'URL d'édition.");
        const postId = postIdMatch[1];

        const updatedPost = updateWordPressPostStatus(postId, 'publish', accountConfig);
        if (!updatedPost || !updatedPost.link) throw new Error("Échec de la mise à jour du post de brouillon à publié.");

        destinationLink = updatedPost.link;
        sheet.getRange(row, CONFIG.WP_PUBLIC_URL_COLUMN_INDEX).setValue(destinationLink); // Mettre à jour la feuille
        sheet.getRange(row, CONFIG.STATUS_COLUMN_INDEX).setValue("published (WP)"); // Mettre à jour le statut
        triggerCell.setValue("2/3 - Draft published...");
        SpreadsheetApp.flush();
      } else {
        // Cas 3: Aucune URL disponible. On arrête le processus.
        throw new Error("Le déclencheur 'pin_link' nécessite une URL publique ou une URL d'édition. Aucune n'a été trouvée.");
      }

      // Création du Pin (commun aux 3 cas)
      if (!recipeContent || !sourceImageUrl) throw new Error("Les colonnes 'recipe_title' ou 'photo_url' sont vides.");

      // Tenter d'extraire le titre du texte. Si ça échoue, enrichir avec l'image.
      let titleAndKeywordResult = extractTitleAndKeyword(recipeContent);
      if (titleAndKeywordResult && titleAndKeywordResult.usage) costBreakdown.push({ name: 'Extract Title/Keyword (1st pass)', usage: titleAndKeywordResult.usage, model: 'gemini-2.5-flash' });
      let postTitle = titleAndKeywordResult ? titleAndKeywordResult.data.postTitle : null;

      if (!postTitle) {
        Logger.log("Failed to extract title from text alone. Trying image enrichment...");
        const enrichmentResult = _enrichWeakContent(recipeContent, sourceImageUrl, triggerCell, sheet, row);
        recipeContent = enrichmentResult.content;
        if (enrichmentResult.usage) costBreakdown.push({ name: 'Image Analysis', usage: enrichmentResult.usage, model: 'gemini-2.5-flash' });

        titleAndKeywordResult = extractTitleAndKeyword(recipeContent);
        if (titleAndKeywordResult && titleAndKeywordResult.usage) costBreakdown.push({ name: 'Extract Title/Keyword (2nd pass)', usage: titleAndKeywordResult.usage, model: 'gemini-2.5-flash' });
        postTitle = titleAndKeywordResult ? titleAndKeywordResult.data.postTitle : null;
      }

      // IMPORTANT : On passe le SITE NAME pour filtrer les boards
      const pinterestContentResult = generatePinterestContent(postTitle, accountConfig.siteName);

      if (!pinterestContentResult || !pinterestContentResult.data.image_title) throw new Error("Erreur de génération de contenu Pinterest ou du titre de l'image.");
      costBreakdown.push({ name: 'Pinterest Content', usage: pinterestContentResult.usage, model: 'gemini-2.5-pro' });
      const pinterestContent = pinterestContentResult.data;
      // Écrire les titres générés dans les nouvelles colonnes
      sheet.getRange(row, CONFIG.PINTEREST_TITLE_COLUMN_INDEX).setValue(pinterestContent.pinterest_title);
      sheet.getRange(row, CONFIG.IMAGE_TITLE_COLUMN_INDEX).setValue(pinterestContent.image_title);
      sheet.getRange(row, CONFIG.PINTEREST_DESCRIPTION_COLUMN_INDEX).setValue(pinterestContent.pinterest_description);

      // Utiliser le titre pour l'image généré par le même appel API
      const imageTitle = pinterestContent.image_title;

      // OPTIMISATION : Vérifier si l'image existe déjà
      let existingPinImageUrl = sheet.getRange(row, CONFIG.PIN_IMAGE_URL_COLUMN_INDEX).getValue();
      let pinDownloadUrl = "";

      if (existingPinImageUrl && existingPinImageUrl !== "") {
        Logger.log("Existing Pin image detected. Skipping template creation.");
        pinDownloadUrl = existingPinImageUrl;
        if (existingPinImageUrl.includes("drive.google.com/file/d/")) {
          const fileIdMatch = existingPinImageUrl.match(/\/d\/(.*?)(\/|$)/);
          if (fileIdMatch) pinDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
      } else {
        const pinImage = createImageFromTemplate(sourceImageUrl, imageTitle, postTitle, accountConfig);
        if (!pinImage || !pinImage.viewUrl) throw new Error("Erreur lors de la création de l'image du Pin.");
        sheet.getRange(row, CONFIG.PIN_IMAGE_URL_COLUMN_INDEX).setValue(pinImage.viewUrl);
        pinDownloadUrl = pinImage.downloadUrl;
      }

      // --- NOUVEAU : Récupérer l'ID du board choisi par l'IA ---
      const chosenBoardName = pinterestContent.chosen_board_name;
      let chosenBoardId = null;

      const boardsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Boards");
      if (boardsSheet && chosenBoardName) {
        // Obtenir la plage jusqu'à la colonne C (ID) car : A=Site, B=Name, C=ID
        const boardDataRange = boardsSheet.getRange(2, 1, boardsSheet.getLastRow() - 1, 3).getValues();
        for (const boardRow of boardDataRange) {
          // boardRow[0] = Site Name, boardRow[1] = Board Name, boardRow[2] = ID
          if (boardRow[1] === chosenBoardName && boardRow[0] === accountConfig.siteName) {
            chosenBoardId = String(boardRow[2]).replace(/'/g, ''); // Nettoyer l'ID
            break;
          }
        }
      }

      // Fallback
      if (!chosenBoardName || !chosenBoardId) {
        Logger.log("Warning: No specific board found.");
      }

      const pinData = {
        row_number: row,
        board_name: chosenBoardName,
        board_id: chosenBoardId, // ID du tableau pour une correspondance exacte dans Pabbly
        image_url: pinDownloadUrl,
        title: pinterestContent.pinterest_title,
        description: pinterestContent.pinterest_description,
        destination_link: destinationLink,
        sheet_name: sheet.getName() // --- IMPORTANT : On passe le nom de l'onglet pour le retour ---
      };
      triggerPinCreation(pinData, accountConfig);
      triggerCell.setValue("Waiting for Pabbly...");
      return; // Fin du processus pour "pin_link"
    }
    // --- NOUVEAU FLUX DE TRAVAIL POUR LE DÉCLENCHEUR "PIN" ---
    if (triggerValue === CONFIG.TRIGGER_PIN_TEXT) {
      triggerCell.setValue("1/4 - Preparing Pin...");
      SpreadsheetApp.flush();

      if (!recipeContent || !sourceImageUrl) {
        throw new Error("Les colonnes 'recipe_title' ou 'photo_url' sont vides pour la création du Pin.");
      }

      // Tenter d'extraire le titre du texte. Si ça échoue, enrichir avec l'image.
      let titleAndKeywordResult = extractTitleAndKeyword(recipeContent);
      if (titleAndKeywordResult && titleAndKeywordResult.usage) costBreakdown.push({ name: 'Extract Title/Keyword (1st pass)', usage: titleAndKeywordResult.usage, model: 'gemini-2.5-flash' });
      let postTitle = titleAndKeywordResult ? titleAndKeywordResult.data.postTitle : null;

      if (!postTitle) {
        Logger.log("Failed to extract title from text alone. Trying image enrichment...");
        const enrichmentResultPin = _enrichWeakContent(recipeContent, sourceImageUrl, triggerCell, sheet, row);
        recipeContent = enrichmentResultPin.content; // On récupère le contenu enrichi
        if (enrichmentResultPin.usage) costBreakdown.push({ name: 'Image Analysis', usage: enrichmentResultPin.usage, model: 'gemini-2.5-flash' });

        titleAndKeywordResult = extractTitleAndKeyword(recipeContent);
        if (titleAndKeywordResult && titleAndKeywordResult.usage) costBreakdown.push({ name: 'Extract Title/Keyword (2nd pass)', usage: titleAndKeywordResult.usage, model: 'gemini-2.5-flash' });
        postTitle = titleAndKeywordResult ? titleAndKeywordResult.data.postTitle : null;
      }

      triggerCell.setValue("2/4 - Generating Pin content...");
      // IMPORTANT : On passe le SITE NAME pour filtrer les boards
      const pinterestContentResult = generatePinterestContent(postTitle, accountConfig.siteName);

      if (!pinterestContentResult || !pinterestContentResult.data.image_title) throw new Error("Erreur de génération de contenu Pinterest ou du titre de l'image.");
      costBreakdown.push({ name: 'Pinterest Content', usage: pinterestContentResult.usage, model: 'gemini-2.5-pro' });
      const pinterestContent = pinterestContentResult.data;
      // Écrire les titres générés dans les nouvelles colonnes
      sheet.getRange(row, CONFIG.PINTEREST_TITLE_COLUMN_INDEX).setValue(pinterestContent.pinterest_title);
      sheet.getRange(row, CONFIG.IMAGE_TITLE_COLUMN_INDEX).setValue(pinterestContent.image_title);
      sheet.getRange(row, CONFIG.PINTEREST_DESCRIPTION_COLUMN_INDEX).setValue(pinterestContent.pinterest_description);

      triggerCell.setValue("3/4 - Creating Pin image...");
      // Utiliser le titre pour l'image généré par le même appel API
      const imageTitle = pinterestContent.image_title;

      // OPTIMISATION : Vérifier si l'image existe déjà
      let existingPinImageUrl = sheet.getRange(row, CONFIG.PIN_IMAGE_URL_COLUMN_INDEX).getValue();
      let pinDownloadUrl = "";

      if (existingPinImageUrl && existingPinImageUrl !== "") {
        Logger.log("Existing Pin image detected. Skipping template creation.");
        pinDownloadUrl = existingPinImageUrl;
        if (existingPinImageUrl.includes("drive.google.com/file/d/")) {
          const fileIdMatch = existingPinImageUrl.match(/\/d\/(.*?)(\/|$)/);
          if (fileIdMatch) pinDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
      } else {
        const pinImage = createImageFromTemplate(sourceImageUrl, imageTitle, postTitle, accountConfig);
        if (!pinImage || !pinImage.viewUrl) throw new Error("Erreur lors de la création de l'image du Pin.");
        sheet.getRange(row, CONFIG.PIN_IMAGE_URL_COLUMN_INDEX).setValue(pinImage.viewUrl);
        pinDownloadUrl = pinImage.downloadUrl;
      }

      triggerCell.setValue("4/4 - Sending to Pabbly...");
      // --- NOUVEAU : Récupérer l'ID du board choisi par l'IA ---
      const chosenBoardName = pinterestContent.chosen_board_name;
      let chosenBoardId = null;

      const boardsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Boards");
      if (boardsSheet && chosenBoardName) {
        // Obtenir la plage jusqu'à la colonne C (ID) car : A=Site, B=Name, C=ID
        const boardDataRange = boardsSheet.getRange(2, 1, boardsSheet.getLastRow() - 1, 3).getValues();
        for (const boardRow of boardDataRange) {
          // boardRow[0] = Site Name, boardRow[1] = Board Name, boardRow[2] = ID
          if (boardRow[1] === chosenBoardName && boardRow[0] === accountConfig.siteName) {
            chosenBoardId = String(boardRow[2]).replace(/'/g, ''); // Nettoyer l'ID
            break;
          }
        }
      }

      // Fallback
      if (!chosenBoardName || !chosenBoardId) {
        Logger.log("Warning: No specific board found.");
      }

      const pinData = {
        row_number: row,
        board_name: chosenBoardName,
        board_id: chosenBoardId, // ID du tableau pour une correspondance exacte dans Pabbly
        image_url: pinDownloadUrl,
        title: pinterestContent.pinterest_title,
        description: pinterestContent.pinterest_description,
        destination_link: "", // Pas de lien de destination pour ce flux
        sheet_name: sheet.getName() // --- IMPORTANT : On passe le nom de l'onglet pour le retour ---
      };
      triggerPinCreation(pinData, accountConfig);
      triggerCell.setValue("Waiting for Pabbly...");
      return; // Fin du processus pour le mode "pin"
    }
    // --- NOUVEAU FLUX DE TRAVAIL POUR LE DÉCLENCHEUR "UPDATE_ARTICLE" ---
    if (triggerValue === CONFIG.TRIGGER_UPDATE_TEXT) {
      triggerCell.setValue("1/7 - Starting update...");
      SpreadsheetApp.flush();

      // 1. Récupérer l'ID du post
      const editUrl = sheet.getRange(row, CONFIG.WP_EDIT_URL_COLUMN_INDEX).getValue();
      const postIdMatch = editUrl.match(/post=(\d+)/);
      if (!postIdMatch || !postIdMatch[1]) {
        throw new Error("Impossible d'extraire l'ID du post depuis l'URL d'édition en colonne G.");
      }
      const postId = postIdMatch[1];

      // 2. Récupérer le contenu actuel de l'article depuis WordPress
      triggerCell.setValue("2/4 - Reading article...");
      SpreadsheetApp.flush();
      const currentContent = getWordPressPostContent(postId, accountConfig);
      if (currentContent === null) {
        throw new Error(`Impossible de récupérer le contenu de l'article ID ${postId}.`);
      }

      // 3. Nettoyer le contenu pour ne garder que les 4 premiers liens internes
      triggerCell.setValue("3/4 - Cleaning links...");
      SpreadsheetApp.flush();
      const cleanedContent = cleanupInternalLinks(currentContent, accountConfig.wpBaseUrl);

      // 4. Mettre à jour l'article sur WordPress avec le contenu nettoyé
      triggerCell.setValue("4/4 - Updating WordPress...");
      SpreadsheetApp.flush();
      const updateSuccess = updateWordPressPostContent(postId, cleanedContent, accountConfig);
      if (!updateSuccess) {
        throw new Error("La mise à jour du contenu de l'article sur WordPress a échoué.");
      }

      triggerCell.setValue("article updated");
      sheet.getRange(row, CONFIG.STATUS_COLUMN_INDEX).setValue("updated");
      return; // Fin du processus de mise à jour
    }

    // --- FLUX DE TRAVAIL EXISTANT POUR "OK" ET "DRAFT" ---
    const authorId = accountConfig.wpAuthorId || 2;
    const postStatus = (triggerValue === CONFIG.TRIGGER_TEXT || triggerValue === CONFIG.TRIGGER_AUTOMATION_TEXT) ? 'publish' : 'draft';

    // Règle d'or : On substitue le porc par le bœuf dès l'entrée pour que l'IA ne soit pas confuse
    const _globalMeatSubstitution = (text) => {
      if (!text) return text;
      return text.replace(/pork/gi, 'Beef').replace(/porc/gi, 'Bœuf');
    };

    recipeContent = _globalMeatSubstitution(recipeContent);

    // --- NOUVELLE ÉTAPE : Générer le mot-clé principal optimisé ---
    triggerCell.setValue("2/13 - Generating keyword...");
    SpreadsheetApp.flush();

    let titleAndKeywordResult = extractTitleAndKeyword(recipeContent);
    if (titleAndKeywordResult) costBreakdown.push({ name: 'Extract Title/Keyword (1st pass)', usage: titleAndKeywordResult.usage, model: 'gemini-2.5-flash' });

    let postTitle = titleAndKeywordResult ? _globalMeatSubstitution(titleAndKeywordResult.data.postTitle) : null;
    let targetKeyword = titleAndKeywordResult ? _globalMeatSubstitution(titleAndKeywordResult.data.targetKeyword) : null;

    let isEnriched = false;
    // Si la première tentative échoue, on enrichit le contenu avec l'image et on réessaie.
    if (!postTitle || !targetKeyword) {
      Logger.log("--- 🕵️ STARTING ENRICHMENT ---");
      Logger.log("Failed to extract title from text alone. Trying image enrichment...");
      const enrichmentResult = _enrichWeakContent(recipeContent, sourceImageUrl, triggerCell, sheet, row);
      Logger.log("--- 🏁 ENRICHMENT COMPLETE (Response received) ---");

      recipeContent = _globalMeatSubstitution(enrichmentResult.content);
      Logger.log("Meat substitutions after enrichment completed.");

      isEnriched = true;
      if (enrichmentResult.usage) costBreakdown.push({ name: 'Image Analysis', usage: enrichmentResult.usage, model: 'gemini-2.5-flash' });

      Logger.log("Starting 2nd pass Title/Keyword extraction...");
      titleAndKeywordResult = extractTitleAndKeyword(recipeContent);
      Logger.log("2nd pass completed.");

      if (titleAndKeywordResult) costBreakdown.push({ name: 'Extract Title/Keyword (2nd pass)', usage: titleAndKeywordResult.usage, model: 'gemini-2.5-flash' });
      postTitle = titleAndKeywordResult ? _globalMeatSubstitution(titleAndKeywordResult.data.postTitle) : null;
      targetKeyword = titleAndKeywordResult ? _globalMeatSubstitution(titleAndKeywordResult.data.targetKeyword) : null;
      Logger.log("Final postTitle: " + postTitle);
      Logger.log("Final targetKeyword: " + targetKeyword);
    }

    // Vérifications séparées pour des messages d'erreur plus clairs
    if (!sourceImageUrl) {
      throw new Error("La colonne D (photo_url) est vide. Impossible de continuer sans image.");
    }
    if (!postTitle || !targetKeyword) {
      throw new Error("L'IA n'a pas pu identifier un titre de recette valide à partir du texte ou de l'image.");
    }
    Logger.log(`Starting processing for row ${row}`);

    // --- NOUVEAU : Stratégie Unicité Image (Remastering) ---
    // On crée une variante unique de la photo principale pour WordPress si un template est configuré.
    let featuredImageUrl = sourceImageUrl;
    if (accountConfig.wpFeaturedImageTemplateId && accountConfig.wpFeaturedImageTemplateId !== "") {
      triggerCell.setValue("1b/13 - Remastering image...");
      SpreadsheetApp.flush();
      // On utilise le dossier spécifié pour le site
      const remasterResult = applyUniqueTemplateToImage(sourceImageUrl, accountConfig.wpFeaturedImageTemplateId, `Featured-${postTitle}-${accountConfig.siteName}`, accountConfig.driveFolderId);
      if (remasterResult && remasterResult.downloadUrl) {
        featuredImageUrl = remasterResult.downloadUrl;
        Logger.log(`[SEO] Remastered image generated for WordPress: ${featuredImageUrl}`);
      } else {
        Logger.log("⚠️ Remastering failed. Using original source image as default.");
      }
    }

    // --- ÉTAPE 2: Générer le plan, le titre SEO et la meta description ---
    // Optimisation : On n'enrichit via l'image que si nécessaire et pas déjà fait
    if (recipeContent.length < 400 && !isEnriched) {
      Logger.log("Weak text content detected (<400 chars). Analyzing image via legacy model...");
      const enrichmentResult = _enrichWeakContent(recipeContent, sourceImageUrl, triggerCell, sheet, row);
      recipeContent = enrichmentResult.content;
      if (enrichmentResult.usage) costBreakdown.push({ name: 'Image Analysis (Flash)', usage: enrichmentResult.usage, model: 'gemini-2.5-flash' });
    }

    // Appel du Super Plan (Gemini 3.0 Pro) - SANS IMAGE, mais avec Search Grounding
    const outlineResult = generateWordPressOutline(targetKeyword, recipeContent);
    if (!outlineResult || !outlineResult.data) throw new Error("Échec de la génération du plan.");
    costBreakdown.push({ name: 'WP Outline (v3.0)', usage: outlineResult.usage, model: 'gemini-3.0-pro' });
    const contentBrief = outlineResult.data;

    // --- Création de la Fiche Recette WP Recipe Maker (Sans image pour l'instant) ---
    let recipeCardShortcode = "";
    let recipeCardId = null;

    if (contentBrief.recipe_card) {
      triggerCell.setValue("3b/13 - Creating Recipe Card...");
      SpreadsheetApp.flush();

      try {
        const rd = contentBrief.recipe_card;
        Logger.log(`[RECIPE] Data extracted: ${rd.ingredients.length} ingredients, ${rd.instructions.length} steps.`);

        const prep_time = parseInt(rd.prep_time) || 0;
        const cook_time = parseInt(rd.cook_time) || 0;
        const servings = parseInt(rd.servings) || 4;

        // Créer la fiche SANS image (sera ajoutée après upload)
        const cardResult = createRecipeCard(
          rd.title || contentBrief.seoTitle,
          rd.summary,
          rd.ingredients,
          rd.instructions,
          servings,
          prep_time,
          cook_time,
          accountConfig,
          null // Pas d'image pour l'instant
        );

        if (cardResult && cardResult.shortcode) {
          recipeCardShortcode = cardResult.shortcode;
          recipeCardId = cardResult.id;
          Logger.log(`WP Recipe Maker Card created (ID ${recipeCardId}) - Image will be added after upload`);
        }
      } catch (e) {
        Logger.log(`Recipe card error (non-blocking): ${e.message}`);
      }
    }

    // --- ÉTAPE 3: Générer le contenu de l'article en HTML ---
    triggerCell.setValue("4/13 - Writing article...");
    SpreadsheetApp.flush();
    const articleResult = generateWordPressArticle(targetKeyword, contentBrief.outline_markdown, contentBrief.lsi_keywords, accountConfig.facebookUrl);
    costBreakdown.push({ name: 'WP Article', usage: articleResult.usage, model: 'gemini-2.5-flash' });
    if (!articleResult || !articleResult.data) throw new Error("Échec de la génération de l'article HTML.");
    let articleHtml = articleResult.data;

    // --- NOUVEAU : Insertion du Shortcode de la recette ---
    if (recipeCardShortcode) {
      articleHtml += `\n\n<!-- WP Recipe Maker Card -->\n${recipeCardShortcode}\n`;
    }

    // --- ÉTAPE 4: Ajouter le maillage interne ---
    triggerCell.setValue("5/13 - Reading sitemap...");
    SpreadsheetApp.flush();
    const sitemapUrl = accountConfig.sitemapUrl;
    const internalUrls = _getSitemapUrls(sitemapUrl);
    articleHtml = _applyInternalLinking(articleHtml, targetKeyword, internalUrls, costBreakdown);

    // --- ÉTAPES DE NETTOYAGE FINAUX (Pré-requis pour les images et le post) ---
    const cleanFinal = (str) => _globalMeatSubstitution(str || '')
      .replace(/\(.*substituted.*\)|--\s*\*?Self-correction.*$|\*?Wait.*$|\(Better Than Pork Chops!\)|\(Better Than Pork\)/gi, '')
      .trim();

    const finalPostTitle = cleanFinal(contentBrief.seoTitle || postTitle);
    const finalTargetKeyword = cleanFinal(contentBrief.targetKeyword || targetKeyword);
    const finalSeoTitle = cleanFinal(contentBrief.seoTitle);
    const finalMetaDescription = cleanFinal(contentBrief.metaDescription);

    // --- ÉTAPE 5: Créer et uploader les images (COLLAGE OPTIONNEL) ---
    let collageUploadResult = null;
    try {
      triggerCell.setValue("7/13 - Creating collage image...");
      SpreadsheetApp.flush();
      const collageOutputName = `${_generateSlug(targetKeyword)}-collage`;
      const collageImage = createCollageImageFromTemplate(sourceImageUrl, collageOutputName, accountConfig);

      if (collageImage) {
        triggerCell.setValue("8/13 - Uploading collage image...");
        SpreadsheetApp.flush();
        collageUploadResult = uploadImageToWordPress(collageImage.downloadUrl, `${collageOutputName}-${new Date().getTime()}.png`, `${finalSeoTitle} - collage`, accountConfig);
      } else {
        Logger.log("Collage not created (template not found or template error)");
      }
    } catch (collageError) {
      Logger.log("Non-blocking error during collage: " + collageError.message);
      sheet.getRange(row, CONFIG.ERROR_COLUMN_INDEX).setValue("Erreur Collage (ignorée): " + collageError.message);
    }

    triggerCell.setValue("9/13 - Uploading main image...");
    SpreadsheetApp.flush();
    const featuredImageFilename = `${_generateSlug(targetKeyword)}-featured-${new Date().getTime()}.jpg`;
    // On utilise featuredImageUrl (qui peut être la version remasterisée)
    const featuredImageUploadResult = uploadImageToWordPress(featuredImageUrl, featuredImageFilename, contentBrief.seoTitle, accountConfig);
    if (!featuredImageUploadResult) throw new Error("Échec de l'upload de l'image principale.");

    // --- UPDATE IMAGE DE LA RECIPE CARD ---
    if (recipeCardId && featuredImageUploadResult.id) {
      try {
        const baseUrl = accountConfig.wpBaseUrl.replace(/\/$/, "");
        const wpHeaders = { 'Authorization': 'Basic ' + Utilities.base64Encode(accountConfig.wpUser + ':' + accountConfig.wpAppPassword) };
        const recipeUpdateUrl = `${baseUrl}/wp-json/wp/v2/wprm_recipe/${recipeCardId}`;

        const payload = { featured_media: featuredImageUploadResult.id };
        const options = {
          'method': 'post',
          'headers': { 'Authorization': wpHeaders.Authorization, 'Content-Type': 'application/json' },
          'payload': JSON.stringify(payload),
          'muteHttpExceptions': true
        };

        const updateRes = UrlFetchApp.fetch(recipeUpdateUrl, options);
        if (updateRes.getResponseCode() === 200) {
          Logger.log(`Recipe Card Image Updated: ID ${featuredImageUploadResult.id} attached to Recipe ${recipeCardId}`);
        }
      } catch (e) {
        Logger.log(`Recipe Card Image Update Failed: ${e.message}`);
      }
    }

    // --- ÉTAPE 6: Choisir la catégorie ---
    triggerCell.setValue("10/13 - Choosing category...");
    SpreadsheetApp.flush();
    const scriptProperties = PropertiesService.getScriptProperties();
    const username = accountConfig.wpUser;
    const password = accountConfig.wpAppPassword;
    const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
    const availableCategories = _getWordPressCategories(basicAuth, accountConfig);
    let categoryIds = [];
    if (availableCategories) {
      const categoryResult = getBestCategoryId(targetKeyword, availableCategories);
      if (categoryResult) {
        if (categoryResult.data) categoryIds.push(categoryResult.data);
        if (categoryResult.usage) costBreakdown.push({ name: 'Category Selection', usage: categoryResult.usage, model: 'gemini-2.5-flash' });
      }
    }

    // --- ÉTAPE 7: Créer le post sur WordPress ---
    triggerCell.setValue("11/13 - Creating WP post...");
    SpreadsheetApp.flush();
    // --- ÉTAPE FINALE: Nettoyage et Création ---
    const facebookLinkHtml = `
      <hr>
      <p style="text-align:center;font-size:1.1em;">
        <strong>For more daily recipes and tips, follow us on Facebook!</strong><br>
        <a href="${accountConfig.facebookUrl}" target="_blank" rel="noopener noreferrer">Click here to join our community!</a>
      </p>`;
    articleHtml += facebookLinkHtml;

    // Suppression ultime et radicale de tout résidu de code Markdown (```html) et SUBSTITUTION FINALE PORK -> BEEF
    articleHtml = articleHtml.replace(/```(?:html)?|```/gi, '').trim();
    articleHtml = _globalMeatSubstitution(articleHtml); // Fail-safe ultime sur tout le corps de l'article

    const collageUrl = collageUploadResult ? collageUploadResult.url : null;
    const postResult = createWordPressPost(finalPostTitle, articleHtml, featuredImageUploadResult.id, finalTargetKeyword, finalSeoTitle, finalMetaDescription, authorId, categoryIds, collageUrl, postStatus, accountConfig);
    if (!postResult) throw new Error("La création finale du post a échoué.");

    // Remplir les colonnes d'URL WordPress
    sheet.getRange(row, CONFIG.WP_EDIT_URL_COLUMN_INDEX).setValue(postResult.edit_link);
    if (postStatus === 'publish') {
      sheet.getRange(row, CONFIG.WP_PUBLIC_URL_COLUMN_INDEX).setValue(postResult.link);
    }

    // Si le déclencheur est "DRAFT", on s'arrête ici.
    if (triggerValue === CONFIG.TRIGGER_DRAFT_TEXT) {
      triggerCell.setValue("draft created");
      sheet.getRange(row, CONFIG.STATUS_COLUMN_INDEX).setValue("draft");
      return; // Fin du processus pour le mode brouillon
    }

    // --- ÉTAPES SUIVANTES UNIQUEMENT POUR LE DÉCLENCHEUR "OK" ---
    if (triggerValue === CONFIG.TRIGGER_TEXT || triggerValue === CONFIG.TRIGGER_AUTOMATION_TEXT) {
      // --- ÉTAPE 8: Préparer le Pin Pinterest ---
      triggerCell.setValue("12/13 - Preparing Pin...");
      SpreadsheetApp.flush();
      // On passe le nom du site pour filtrer les boards
      const pinterestContentResult = generatePinterestContent(finalPostTitle, accountConfig.siteName);

      if (!pinterestContentResult || !pinterestContentResult.data.image_title) throw new Error("Erreur de génération de contenu Pinterest ou du titre de l'image.");
      costBreakdown.push({ name: 'Pinterest Content', usage: pinterestContentResult.usage, model: 'gemini-2.5-pro' });
      const pinterestContent = pinterestContentResult.data;
      // Écrire les titres générés dans les nouvelles colonnes
      sheet.getRange(row, CONFIG.PINTEREST_TITLE_COLUMN_INDEX).setValue(pinterestContent.pinterest_title);
      sheet.getRange(row, CONFIG.IMAGE_TITLE_COLUMN_INDEX).setValue(pinterestContent.image_title);
      sheet.getRange(row, CONFIG.PINTEREST_DESCRIPTION_COLUMN_INDEX).setValue(pinterestContent.pinterest_description);

      // Utiliser le titre pour l'image généré par le même appel API
      const imageTitle = pinterestContent.image_title;

      let existingPinImageUrl = sheet.getRange(row, CONFIG.PIN_IMAGE_URL_COLUMN_INDEX).getValue();
      let pinDownloadUrl = "";

      if (existingPinImageUrl && existingPinImageUrl !== "") {
        Logger.log("Existing Pin image detected. Skipping template creation.");
        pinDownloadUrl = existingPinImageUrl;
        if (existingPinImageUrl.includes("drive.google.com/file/d/")) {
          const fileIdMatch = existingPinImageUrl.match(/\/d\/(.*?)(\/|$)/);
          if (fileIdMatch) pinDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
      } else {
        const pinImage = createImageFromTemplate(sourceImageUrl, imageTitle, finalPostTitle, accountConfig);
        if (!pinImage || !pinImage.viewUrl) throw new Error("Erreur lors de la création de l'image du Pin.");
        sheet.getRange(row, CONFIG.PIN_IMAGE_URL_COLUMN_INDEX).setValue(pinImage.viewUrl);
        pinDownloadUrl = pinImage.downloadUrl;
      }

      // --- ÉTAPE 9: Envoyer à Pabbly ---
      triggerCell.setValue("13/13 - Sending to Pabbly...");
      SpreadsheetApp.flush();

      // --- NOUVEAU : Récupérer l'ID du board choisi par l'IA ---
      const chosenBoardName = pinterestContent.chosen_board_name;
      let chosenBoardId = null;

      const boardsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Boards");
      if (boardsSheet && chosenBoardName) {
        // Obtenir la plage jusqu'à la colonne C (ID) car : A=Site, B=Name, C=ID
        const boardDataRange = boardsSheet.getRange(2, 1, boardsSheet.getLastRow() - 1, 3).getValues();

        for (const boardRow of boardDataRange) {
          // boardRow[0] = Site Name, boardRow[1] = Board Name, boardRow[2] = ID
          // On vérifie que le Site ET le Nom du Board correspondent
          if (boardRow[1] === chosenBoardName && boardRow[0] === accountConfig.siteName) {
            chosenBoardId = String(boardRow[2]).replace(/'/g, ''); // Nettoyer l'ID
            break;
          }
        }
      }

      // Fallback si l'IA n'a pas trouvé de board ou s'il n'existe pas
      if (!chosenBoardName || !chosenBoardId) {
        Logger.log("Warning: No specific board found. Using default board 'Quick Saves'.");
        // Logique optionnelle : Trouver un ID par défaut ou laisser l'utilisateur gérer
      }

      const pinData = {
        row_number: row, // On envoie le numéro de ligne pour que Pabbly nous le retourne
        board_name: chosenBoardName,
        board_id: chosenBoardId, // ID du tableau pour une correspondance exacte dans Pabbly
        image_url: pinDownloadUrl, // On envoie le lien de téléchargement à Pabbly
        title: pinterestContent.pinterest_title,
        description: pinterestContent.pinterest_description,
        destination_link: postResult.link,// Utiliser l'URL du post WordPress qui vient d'être créé
        sheet_name: sheet.getName() // --- IMPORTANT : On passe le nom de l'onglet pour le retour ---
      };
      triggerPinCreation(pinData, accountConfig);
      triggerCell.setValue("Waiting for Pabbly..."); // Process complete, waiting for Pabbly callback.
    }
  } catch (error) {
    Logger.log(`ERROR at row ${row}: ${error.message}`);
    triggerCell.setValue("error");
    errorCell.setValue(error.message);
  } finally {
    _formatAndWriteCostDetails(sheet, row, costBreakdown);
  }
}

/**
 * Nettoie une chaîne de caractères pour la rendre utilisable comme titre ou mot-clé SEO.
 * Retire les emojis et les phrases promotionnelles courantes.
 * @param {string} text Le texte à nettoyer.
 * @returns {string} Le texte nettoyé.
 * @private
 */
function _cleanTextForSeo(text) {
  // Cette fonction est maintenant obsolète car l'extraction est gérée par l'IA.
  // On la garde pour la compatibilité au cas où, mais elle ne fait plus rien de complexe.
  return text ? text.trim() : "";
}

/**
 * Gère la logique de détection et d'enrichissement de contenu faible en analysant l'image.
 * @private
 * @param {string} recipeContent Le contenu textuel initial.
 * @param {string} sourceImageUrl L'URL de l'image associée.
 * @param {GoogleAppsScript.Spreadsheet.Range} triggerCell La cellule de statut à mettre à jour.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet La feuille de calcul active.
 * @param {number} row Le numéro de la ligne en cours de traitement.
 * @returns {string} Le contenu enrichi, ou le contenu original si non modifié.
 * @returns {{content: string, usage: object}} Un objet contenant le contenu et les données d'utilisation.
 * @throws {Error} Si l'analyse de l'image échoue.
 */
function _enrichWeakContent(recipeContent, sourceImageUrl, triggerCell, sheet, row) {
  Logger.log("DEBUG: _enrichWeakContent started.");
  if (sourceImageUrl) {
    Logger.log("DEBUG: sourceImageUrl present: " + sourceImageUrl);
    triggerCell.setValue("Weak content, analyzing image...");
    SpreadsheetApp.flush();

    const prompt = "You are an expert image classifier for a food blog. Your task is to analyze the image and return a structured JSON object. First, classify the image type. Then, if it's a finished dish, describe it. \n\nCRITICAL RULE: If the dish contains PORK, you MUST describe it as BEEF in your description. \n\nReturn ONLY a JSON object with the following keys:\n- 'image_type': (string) Classify the image as one of these exact values: 'FINISHED_DISH', 'INGREDIENTS_ONLY', or 'NOT_FOOD'.\n- 'dish_name': (string or null) The name of the dish (Sub Beef for Pork).\n- 'visible_ingredients': (array of strings or null) The visible ingredients.\n- 'preparation_style': (string or null) The preparation style.";

    Logger.log("DEBUG: Calling generateTextFromImageWithGemini...");
    const imageAnalysisResult = generateTextFromImageWithGemini(sourceImageUrl, prompt);
    Logger.log("DEBUG: generateTextFromImageWithGemini completed.");

    if (imageAnalysisResult && imageAnalysisResult.text) {
      const rawText = imageAnalysisResult.text;
      Logger.log("DEBUG: rawText received from image (excerpt): " + rawText.substring(0, 100));

      const cleanJson = _cleanJsonResponse(rawText);
      Logger.log("DEBUG: cleanJson prepared.");

      sheet.getRange(row, CONFIG.IMAGE_TO_TEXT_COLUMN_INDEX).setValue(rawText);
      Logger.log("DEBUG: rawText written to column N (Row " + row + ")");

      try {
        Logger.log("DEBUG: Attempting JSON.parse...");
        const imageAnalysis = JSON.parse(cleanJson);
        Logger.log("DEBUG: JSON.parse successful.");

        const descriptiveText = `${imageAnalysis.dish_name} with ${imageAnalysis.visible_ingredients.join(', ')}. Preparation style: ${imageAnalysis.preparation_style}.`;
        Logger.log(`Content enriched with image text: ${descriptiveText}`);

        return {
          content: `${descriptiveText}. ${recipeContent}`,
          usage: imageAnalysisResult.usage
        };
      } catch (e) {
        Logger.log("DEBUG: JSON.parse ERROR: " + e.message);
        Logger.log("cleanJson content on error: " + cleanJson);
        return { content: recipeContent, usage: imageAnalysisResult.usage };
      }
    } else {
      Logger.log("Warning: imageAnalysisResult empty or without text.");
      sheet.getRange(row, CONFIG.IMAGE_TO_TEXT_COLUMN_INDEX).setValue("Image analysis failed (Gemini)");
    }
  } else {
    Logger.log("DEBUG: sourceImageUrl is empty.");
  }

  Logger.log("DEBUG: _enrichWeakContent ending by default.");
  return {
    content: recipeContent, // Retourner le contenu original si non modifié
    usage: null
  };
}

/**
 * Nettoie une réponse JSON de l'IA qui pourrait être entourée de markdown blocks.
 * @private
 */
function _cleanJsonResponse(text) {
  if (!text) return "";
  // Enlever les blocs de code markdown ```json ... ``` ou ``` ... ```
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  return cleaned;
}

/**
 * Fonction helper pour appliquer le maillage interne en deux étapes et gérer les coûts.
 * @private
 * @param {string} articleHtml L'article HTML à modifier.
 * @param {string} targetKeyword Le mot-clé de l'article.
 * @param {string[]} internalUrls La liste des URLs du sitemap.
 * @param {Array} costBreakdown Le tableau pour enregistrer les coûts.
 * @returns {string} L'article HTML avec les liens internes.
 */
function _applyInternalLinking(articleHtml, targetKeyword, internalUrls, costBreakdown) {
  if (internalUrls.length > 0) {
    // Étape 1: Sélectionner les 4 liens pertinents
    const selectLinksResult = selectInternalLinks(articleHtml, targetKeyword, internalUrls);
    if (selectLinksResult && selectLinksResult.data && selectLinksResult.data.length > 0) {
      if (selectLinksResult.usage) costBreakdown.push({ name: 'Select Internal Links', usage: selectLinksResult.usage, model: 'gemini-2.5-flash' });
      // Étape 2: Insérer ces 4 liens dans l'article
      const insertLinksResult = addInternalLinks(articleHtml, targetKeyword, selectLinksResult.data);
      if (insertLinksResult && insertLinksResult.data) {
        if (insertLinksResult.usage) costBreakdown.push({ name: 'Insert Internal Links', usage: insertLinksResult.usage, model: 'gemini-2.5-flash' });
        return insertLinksResult.data; // Retourne le HTML modifié
      }
    }
  }
  return articleHtml; // Retourne le HTML original si quelque chose échoue
}

/**
 * Formate le détail des coûts et l'écrit dans la cellule appropriée.
 * @private
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet La feuille de calcul.
 * @param {number} row Le numéro de la ligne.
 * @param {Array} costBreakdown Le tableau des coûts.
 */
function _formatAndWriteCostDetails(sheet, row, costBreakdown) {
  if (!costBreakdown || costBreakdown.length === 0) return;

  let totalCost = 0;
  const details = costBreakdown.map(item => {
    const costs = calculateCost(item.model, item.usage);
    totalCost += costs.totalCost;
    return `${item.name} (${item.model}): $${costs.totalCost.toFixed(6)}`;
  }).join('\n');

  const summary = `Total: $${totalCost.toFixed(6)}\n\n${details}`;

  const costDetailCell = sheet.getRange(row, CONFIG.TOTAL_COST_COLUMN_INDEX);
  costDetailCell.setValue(summary);

  // Ajouter une note à la cellule pour une meilleure lisibilité
  costDetailCell.setNote(summary);
}

/**
 * Trouve la prochaine recette disponible et déclenche son traitement.
 * Cette fonction est conçue pour être appelée par un déclencheur temporel (Time-driven trigger).
 */
/**
 * Trouve la prochaine recette disponible et déclenche son traitement.
 * Cette fonction est conçue pour être appelée par un déclencheur temporel (Time-driven trigger).
 * Elle traite UNE SEULE recette tous sites confondus par exécution (Mode Relais).
 */
function automatedPostTrigger() {
  Logger.log("--- 🤖 Starting Multi-Site Automation Trigger (Relay Mode) ---");
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = spreadsheet.getSheetByName("Config_Accounts");

  if (!configSheet) {
    Logger.log("Error: 'Config_Accounts' sheet not found. Unable to load sites.");
    return;
  }

  // Trouver dynamiquement la colonne "Site Name"
  const siteNameColIndex = getColumnIndexByHeader(configSheet, "Site Name");
  if (siteNameColIndex === -1) {
    Logger.log("Error: 'Site Name' column not found in Config_Accounts.");
    return;
  }

  // Récupérer la liste des sites
  const configData = configSheet.getRange(2, siteNameColIndex, configSheet.getLastRow() - 1, 1).getValues();

  // On utilise un for...of pour Pouvoir faire un "return" global et s'arrêter après 1 post
  for (const siteRow of configData) {
    const siteName = siteRow[0]; // row[0] car on n'a extrait qu'une colonne
    if (!siteName) continue;

    // Déterminer le nom de la feuille : "Data-{SiteName}"
    const targetSheetName = `Data-${siteName}`;
    const sheet = spreadsheet.getSheetByName(targetSheetName);

    if (!sheet) {
      Logger.log(`⚠️ Warning: Sheet '${targetSheetName}' for site '${siteName}' does not exist.`);
      continue;
    }

    Logger.log(`🔍 Analyzing site: ${siteName} (Sheet: ${targetSheetName})`);

    // --- GESTION DES LIMITES (Rate Limiting & Velocity) ---
    const accountConfig = getAccountConfigForSheet(targetSheetName);

    // --- VÉRIFICATION: Compte actif ? ---
    if (!accountConfig.isActive) {
      Logger.log(`⏸️ [PAUSED] Account '${siteName}' is disabled. Skipping for automation.`);
      continue; // On passe au site suivant
    }

    const now = new Date();
    const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
    let currentCounter = Number(accountConfig.dailyCounter) || 0;
    const maxPosts = Number(accountConfig.maxPostsPerDay) || 6;

    // 1. Lazy Reset : Si la date de dernière publi n'est pas aujourd'hui, on reset
    let lastResetString = "";
    if (accountConfig.lastResetDate instanceof Date) {
      lastResetString = Utilities.formatDate(accountConfig.lastResetDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      lastResetString = String(accountConfig.lastResetDate);
    }

    if (lastResetString !== todayStr) {
      Logger.log(`🔄 New day detected for ${siteName}. Resetting counter.`);
      configSheet.getRange(accountConfig.configRowIndex, accountConfig.cols.dailyCounter).setValue(0);
      configSheet.getRange(accountConfig.configRowIndex, accountConfig.cols.lastResetDate).setValue(now); // On stocke la date du reset
      currentCounter = 0;
    }

    // 2. Vérification du quota journalier
    if (currentCounter >= maxPosts) {
      Logger.log(`⏳ Daily quota reached for ${siteName} (${currentCounter}/${maxPosts}).`);
      continue; // On passe au site suivant
    }

    // 3. --- CONTRÔLE DE VÉLOCITÉ (Intervalle) ---
    const minIntervalMs = (24 * 60 * 60 * 1000) / maxPosts;
    const latestPubDate = _getLatestPublicationDate(sheet);

    if (latestPubDate) {
      const timeSinceLastPost = now.getTime() - latestPubDate.getTime();
      if (timeSinceLastPost < minIntervalMs) {
        const remainingMs = minIntervalMs - timeSinceLastPost;
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        Logger.log(`🛑 Velocity too high for ${siteName}. Last post ${Math.floor(timeSinceLastPost / 60000)} min ago. Required wait: ${remainingMinutes} more min.`);
        continue; // On passe au site suivant
      }
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    const dataRange = sheet.getRange(1, 1, lastRow, CONFIG.RECIPE_TITLE_COLUMN_INDEX);
    const data = dataRange.getValues();

    for (let i = 1; i < data.length; i++) {
      const rowNumber = i + 1;
      const triggerValue = data[i][CONFIG.TRIGGER_COLUMN_INDEX - 1];
      const statusValue = data[i][CONFIG.STATUS_COLUMN_INDEX - 1];
      const recipeTitle = data[i][CONFIG.RECIPE_TITLE_COLUMN_INDEX - 1];

      if (recipeTitle && !triggerValue && !statusValue) {
        Logger.log(`   🚀 New recipe found at row ${rowNumber} for ${siteName}. Starting...`);

        processRecipeRow(sheet, rowNumber, CONFIG.TRIGGER_AUTOMATION_TEXT);

        // Mise à jour du compteur
        configSheet.getRange(accountConfig.configRowIndex, accountConfig.cols.dailyCounter).setValue(currentCounter + 1);
        Logger.log(`✅ Counter incremented for ${siteName}: ${currentCounter + 1}/${maxPosts}`);

        // --- TRÈS IMPORTANT : ARRET GLOBAL ---
        Logger.log(`🏁 Mission accomplished for this cycle. Stopping early to avoid Timeout and Spam.`);
        return; // ON S'ARRÊTE TOTALEMENT ICI
      }
    }
    Logger.log(`   Nothing to process for ${siteName}.`);
  }

  Logger.log("--- End of automation cycle (Nothing was ready) ---");
}

/**
 * FONCTION DE TEST pour le déclenchement automatique.
 * Cherche le déclencheur 'test_auto_mode' et lance le processus d'automatisation.
 */
function test_automationTriggerLogic() {
  Logger.log("--- 🧪 Lancement du test de la logique d'automatisation ---");
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    Logger.log("Erreur : La feuille 'Recipes' est introuvable.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const TEST_TRIGGER_TEXT = 'TEST_AUTO_MODE';

  for (let i = 1; i < data.length; i++) {
    const rowNumber = i + 1;
    const triggerValue = (data[i][CONFIG.TRIGGER_COLUMN_INDEX - 1] || '').toString().toUpperCase();
    const statusValue = data[i][CONFIG.STATUS_COLUMN_INDEX - 1];

    if (triggerValue === TEST_TRIGGER_TEXT && !statusValue) {
      Logger.log(`🧪 Test trigger found at row ${rowNumber}.`);
      processRecipeRow(sheet, rowNumber, CONFIG.TRIGGER_AUTOMATION_TEXT);
      return;
    }
  }
  Logger.log("🧪 No 'test_auto_mode' trigger found to process.");
}

/**
 * FONCTION DE TEST: Exécute la fonction d'automatisation principale `automatedPostTrigger`.
 */
function test_runAutomatedTrigger() {
  Logger.log("--- 🧪 Lancement manuel du test pour automatedPostTrigger ---");
  automatedPostTrigger();
  Logger.log("--- ✅ Test for automatedPostTrigger finished. ---");
}

/**
 * Parcourt toute la colonne publication_date pour trouver le timestamp le plus récent.
 * Gère le format : DD/MM/YYYY HH:mm:ss
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Date|null}
 */
function _getLatestPublicationDate(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const dates = sheet.getRange(2, CONFIG.PUBLICATION_DATE_COLUMN_INDEX, lastRow - 1, 1).getValues();
  let latestDate = null;

  for (let i = 0; i < dates.length; i++) {
    let val = dates[i][0];
    if (!val) continue;

    let dateObj = null;
    if (val instanceof Date) {
      dateObj = val;
    } else {
      // Tentative de parsing manuel si c'est une string (Format: DD/MM/YYYY HH:mm:ss)
      try {
        const parts = val.toString().split(' ');
        if (parts.length >= 2) {
          const dParts = parts[0].split('/');
          const tParts = parts[1].split(':');
          if (dParts.length === 3 && tParts.length === 3) {
            // JS Date(year, monthIndex, day, hours, minutes, seconds)
            dateObj = new Date(dParts[2], dParts[1] - 1, dParts[0], tParts[0], tParts[1], tParts[2]);
          }
        }
      } catch (e) {
        // Ignorer les erreurs de parsing individuelles
      }
    }

    if (dateObj && (!latestDate || dateObj > latestDate)) {
      latestDate = dateObj;
    }
  }

  return latestDate;
}
