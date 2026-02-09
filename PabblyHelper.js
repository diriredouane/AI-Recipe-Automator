/**
 * @fileoverview Gère l'envoi des données au webhook Pabbly Connect.
 */

/**
 * Envoie les données finales du Pin au webhook de Pabbly.
 * @param {object} pinData L'objet contenant toutes les informations du Pin.
 * @param {object} [siteConfig=null] Optional. Configuration spécifique au site.
 * @returns {string} La réponse du serveur Pabbly.
 */
function triggerPinCreation(pinData, siteConfig = null) {
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(pinData)
  };

  const webhookUrl = siteConfig ? siteConfig.pabblyWebhook : CONFIG.PABBLY_WEBHOOK_URL;
  const response = UrlFetchApp.fetch(webhookUrl, options);
  return response.getContentText();
}

/**
 * FONCTION DE TEST: Envoie des données d'exemple au webhook Pabbly Connect
 * pour la configuration initiale du workflow.
 */
/**
 * FONCTION DE TEST: Envoie des données d'exemple au webhook Pabbly Connect
 * pour la configuration initiale du workflow.
 */
function sendSampleDataToPabbly() {
  // Récupérer le premier webhook disponible dans Config_Accounts
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = spreadsheet.getSheetByName("Config_Accounts");

  if (!configSheet) {
    SpreadsheetApp.getUi().alert("Erreur: L'onglet 'Config_Accounts' est introuvable.");
    return;
  }

  // On trouve dynamiquement la colonne du webhook principal
  const webhookCol = getColumnIndexByHeader(configSheet, "Pabbly Main Webhook");

  if (webhookCol === -1) {
    SpreadsheetApp.getUi().alert("Erreur: La colonne 'Pabbly Main Webhook' est introuvable.");
    return;
  }

  const webhookUrl = configSheet.getRange(2, webhookCol).getValue();

  if (!webhookUrl || webhookUrl === "" || webhookUrl.includes("see documentation")) {
    SpreadsheetApp.getUi().alert("Attention: Aucun Webhook Pabbly valide trouvé en ligne 2 de 'Config_Accounts'.\nVeuillez configurer votre webhook avant de tester.");
    return;
  }

  const samplePinData = {
    row_number: 2, // Numéro de ligne d'exemple
    board_name: "Dessert Recipes",
    image_url: "https://images.pexels.com/photos/1055272/pexels-photo-1055272.jpeg",
    title: "The Best Fudgy Chocolate Brownie Recipe (Easy & Quick)",
    description: "Looking for the perfect brownie recipe? This one is incredibly fudgy, rich, and easy to make. Get the full recipe on the blog! #brownies #chocolaterecipe #baking #dessert",
    alt_text: "A close-up shot of a stack of freshly baked chocolate brownies on a wooden board.",
    destination_link: "https://your-blog.com/recipes/best-fudgy-brownies"
  };

  // On simule une config minimale avec le webhook trouvé
  const minimalConfig = { pabblyWebhook: webhookUrl };

  try {
    const response = triggerPinCreation(samplePinData, minimalConfig);
    SpreadsheetApp.getUi().alert(`✅ Données de test envoyées avec succès !\n\nRéponse Pabbly : ${response}`);
  } catch (e) {
    SpreadsheetApp.getUi().alert(`❌ Erreur lors de l'envoi : ${e.message}`);
  }
}

/**
 * FONCTION DE TEST: Simule un envoi complet à Pabbly avec des données réelles
 * pour diagnostiquer les problèmes de communication.
 */
function test_pabblyPinCreation() {
  Logger.log("--- 🧪 Starting Pabbly send test ---");

  try {
    // 1. Générer le contenu Pinterest
    const postContent = "😋Beef Lo Mein with Vegetables: A Flavorful Homemade Stir-Fry You’ll Love😋";
    const pinterestContent = generatePinterestContent(postContent);
    if (!pinterestContent) throw new Error("Échec de la génération du contenu Pinterest.");

    // 2. Créer l'image du Pin
    const imageUrl = "https://drive.google.com/file/d/1vYFJkpqpOFjmx9BzR8PUbQL1CTPbO36m/view?usp=drivesdk";
    const pinImage = createImageFromTemplate(imageUrl, pinterestContent.pinterest_title, "pabbly-test-pin");
    if (!pinImage) throw new Error("Échec de la création de l'image du Pin.");

    // 3. Préparer les données finales
    const pinData = {
      row_number: 999, // Numéro de ligne de test
      board_name: "Dinner Recipes",
      image_url: pinImage,
      title: pinterestContent.pinterest_title,
      description: pinterestContent.pinterest_description,
      destination_link: "https://simplebitesrecipes.com/ultimate-guide-to-easy-creamy-baked-corn-casserole/"
    };

    // 4. Envoyer à Pabbly et logger la réponse
    Logger.log("Sending data to Pabbly...");
    const pabblyResponse = triggerPinCreation(pinData);
    Logger.log(`--- ✅ Pabbly Response ---`);
    Logger.log(pabblyResponse);

  } catch (e) {
    Logger.log(`--- ❌ PABBLY TEST FAILED --- \nError: ${e.message}`);
  }
}

/**
 * FONCTION DE TEST: Simule le flux complet de création d'un Pin,
 * incluant la sélection du board par l'IA et l'envoi des données à Pabbly.
 */
function test_fullPinCreationFlow() {
  const testTitle = "Cheddar Ranch Crack Dip";
  const testImageUrl = "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"; // URL d'image d'exemple
  const testDestinationLink = "https://simplebitesrecipes.com/cheddar-ranch-crack-dip/"; // URL de destination d'exemple

  Logger.log(`--- 🧪 Starting full flow test for: "${testTitle}" ---`);

  try {
    // 1. Générer le contenu Pinterest et choisir le board
    const pinterestContentResult = generatePinterestContent(testTitle);
    if (!pinterestContentResult || !pinterestContentResult.data) throw new Error("Échec de la génération du contenu Pinterest.");
    const pinterestContent = pinterestContentResult.data;
    Logger.log(`Board chosen by AI: "${pinterestContent.chosen_board_name}"`);

    // 2. Récupérer l'ID du board correspondant
    const chosenBoardName = pinterestContent.chosen_board_name || "Quick Saves";
    let chosenBoardId = null;
    const boardsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Boards");
    if (boardsSheet) {
      const boardDataRange = boardsSheet.getRange(2, 1, boardsSheet.getLastRow() - 1, 2).getValues();
      for (const boardRow of boardDataRange) {
        if (boardRow[0] === chosenBoardName) {
          chosenBoardId = String(boardRow[1]).replace(/'/g, '');
          break;
        }
      }
    }
    if (!chosenBoardId) Logger.log(`Warning: Unable to find ID for board "${chosenBoardName}". ID will be null.`);

    // 3. Préparer les données finales pour Pabbly
    const pinData = {
      row_number: 999, // Ligne de test
      board_name: chosenBoardName,
      board_id: chosenBoardId,
      image_url: testImageUrl, // Pour ce test, nous utilisons une URL d'image directe
      title: pinterestContent.pinterest_title,
      description: pinterestContent.pinterest_description,
      destination_link: testDestinationLink
    };

    // 4. Envoyer à Pabbly et logger la réponse
    Logger.log("Sending data to Pabbly...");
    const pabblyResponse = triggerPinCreation(pinData);
    Logger.log(`--- ✅ Data sent to Pabbly. Response received: ${pabblyResponse} ---`);

  } catch (e) {
    Logger.log(`--- ❌ FULL FLOW TEST FAILED --- \nError: ${e.message}`);
  }
}