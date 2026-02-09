/**
 * @fileoverview Gère la communication avec l'API Gemini pour la génération de contenu Pinterest.
 */

/**
 * Récupère la clé API Gemini depuis la cellule B2 de l'onglet "Setting".
 * @returns {string} La clé API Gemini.
 * @throws {Error} Si la clé est introuvable.
 */
function getGeminiApiKey() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const settingSheet = spreadsheet.getSheetByName("Setting");

  if (!settingSheet) {
    throw new Error("L'onglet 'Setting' est introuvable. Veuillez le créer et placer votre clé Gemini en B2.");
  }

  const apiKey = settingSheet.getRange("B2").getValue();
  if (!apiKey || apiKey === "") {
    throw new Error("La clé d'API Gemini est vide en Setting!B2.");
  }

  return apiKey;
}

/**
 * Génère le contenu textuel pour un Pin Pinterest en un seul appel à l'API Gemini.
 * @param {string} postContent Le contenu du post, qui peut être une recette complète, une phrase ou une description.
 * @param {string} [siteName=null] Le nom du site pour filtrer les tableaux (optionnel).
 * @returns {{data: object, usage: object}|null} Un objet contenant le contenu généré et les métadonnées d'utilisation.
 */
function generatePinterestContent(postContent, siteName = null) {
  const GEMINI_API_KEY = getGeminiApiKey();

  // Lire la liste des tableaux (boards) depuis la feuille "Boards" avec filtrage
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const boardsSheet = spreadsheet.getSheetByName("Boards");
  let boardListString = "";

  if (boardsSheet) {
    const lastRow = boardsSheet.getLastRow();
    if (lastRow > 1) {
      // On lit les colonnes A (Site Name) et B (Board Name)
      // Note: InitializeBoardsSheet met Site Name en A et Board Name en B
      const boardData = boardsSheet.getRange(2, 1, lastRow - 1, 2).getValues();

      let filteredBoards = [];
      if (siteName) {
        // Filtrage strict par site
        filteredBoards = boardData
          .filter(row => row[0] === siteName)
          .map(row => row[1])
          .filter(String);

        // Fallback : Si aucun board trouvé pour ce site (ex: nouveau site), on ne met rien ou on avertit
        if (filteredBoards.length === 0) {
          Logger.log(`No board found for site '${siteName}'. AI cannot choose a board.`);
        }
      } else {
        // Comportement hérité (ou si pas de site spécifié) : on prend tout (Colonne B)
        // Attention : Si la structure a changé, la colonne B est maintenant "Board Name"
        filteredBoards = boardData.map(row => row[1]).filter(String);
      }

      if (filteredBoards.length > 0) {
        boardListString = `Available Pinterest Boards for ${siteName || 'all'}: [${filteredBoards.join(', ')}]`;
      }
    }
  }

  const prompt = `
    You are a Pinterest marketing expert specializing in the food niche.
    Analyze the following "Post Content". It could be a full recipe, a short description with a link, a simple sentence, or anything in between.
    Your task is to understand the core subject and generate the necessary content for a compelling Pinterest pin.
    
    Post Content: "${postContent}"
    ${boardListString}
    
    Based on the content and the available boards, return a single, valid JSON object with the following structure:
    {
      "pinterest_title": "A highly optimized Pinterest Pin title, under 100 characters, using strong keywords.",
      "pinterest_description": "A compelling 400-500 character description for the Pinterest Pin. Use keywords naturally, include a call-to-action (e.g., 'Get the full recipe on the blog!'), and use 3-5 relevant hashtags at the end (e.g., #chocolaterecipe #baking).",
      "image_title": "A very short, catchy, and complete title, under 10 words, perfect for overlaying on a Pinterest image. It must make complete sense on its own.",
      "chosen_board_name": "From the 'Available Pinterest Boards' list, choose the single most relevant board name for this content. The name must be an exact match from the provided list. If no board is relevant, return null."
    }
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }],
    "tools": [
      { "googleSearch": {} },
      { "urlContext": {} }
    ],
    "generationConfig": {
      "responseMimeType": "application/json"
    }
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const url = `${CONFIG.GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`;
    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();
    const jsonResponse = JSON.parse(responseText);

    // Cas 1: L'API Gemini renvoie une erreur structurée (ex: surcharge, clé invalide).
    if (jsonResponse.error) {
      const apiError = `Erreur API Gemini: ${jsonResponse.error.message} (Status: ${jsonResponse.error.status})`;
      throw new Error(apiError);
    }

    // Cas 2: La réponse n'a pas la structure attendue.
    if (!jsonResponse.candidates || !jsonResponse.candidates[0] || !jsonResponse.candidates[0].content) {
      throw new Error(`Réponse inattendue de l'API Gemini. Réponse brute: ${responseText}`);
    }

    // Si tout va bien, on extrait le contenu.
    const contentObject = JSON.parse(jsonResponse.candidates[0].content.parts[0].text);
    const usage = jsonResponse.usageMetadata;
    return { data: contentObject, usage: usage };

  } catch (e) {
    // Cas 3: Erreur générale (ex: JSON invalide, problème réseau).
    // On relance l'erreur pour qu'elle soit attrapée par le processus principal et affichée dans la feuille.
    const errorMessage = `Erreur dans generatePinterestContent: ${e.message}`;
    Logger.log(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * FONCTION DE TEST: Appelle generatePinterestContent avec des données d'exemple
 * et affiche le résultat dans les logs.
 */
function test_generatePinterestContent() {
  const testContent = `
    Chicken Cacciatore
    Rustic Italian Chicken Stew with Peppers and Tomatoes
    Ingredients:
    - 4 bone-in, skin-on chicken thighs
    - 2 tablespoons olive oil
  `;

  const result = generatePinterestContent(testContent);

  if (result) {
    Logger.log("--- ✅ PINTEREST TEST RESULT ---");
    Logger.log("---------------------------------");
    Logger.log("Pinterest Title: " + result.pinterest_title);
    Logger.log("---------------------------------");
    Logger.log("Image Title: " + result.image_title);
    Logger.log("---------------------------------");
    Logger.log("Pinterest Description: " + result.pinterest_description);
  }
}

/**
 * FONCTION DE TEST UNITAIRE: Vérifie la logique de sélection de board par l'IA.
 */
function test_boardSelection() {
  const testTitle = "Cheddar Ranch Crack Dip";
  Logger.log(`--- 🧪 Starting board selection test for title: "${testTitle}" ---`);

  try {
    const result = generatePinterestContent(testTitle);

    if (result && result.data) {
      const chosenBoard = result.data.chosen_board_name;
      Logger.log(`--- ✅ TEST RESULT ---`);
      Logger.log(`Analyzed title: ${testTitle}`);
      Logger.log(`Board chosen by AI: "${chosenBoard}"`);

      // Validation supplémentaire pour vérifier si le board choisi est bien dans la liste
      const boardsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Boards");
      if (boardsSheet) {
        const boardNames = boardsSheet.getRange(2, 1, boardsSheet.getLastRow() - 1, 1).getValues().flat();
        if (boardNames.includes(chosenBoard)) {
          Logger.log("Validation: Chosen board is part of the available boards list.");
        } else if (chosenBoard === null) {
          Logger.log("Validation: AI returned 'null', indicating no board was relevant.");
        } else {
          Logger.log(`⚠️ WARNING: Chosen board ("${chosenBoard}") does not match any name in the "Boards" sheet.`);
        }
      }
    } else {
      Logger.log("--- ❌ FAILED --- Function did not return valid data.");
    }
  } catch (e) {
    Logger.log(`--- ❌ TEST ERROR --- \n${e.message}`);
  }
}

/**
 * Génère une description textuelle à partir d'une URL d'image en utilisant l'API Gemini.
 * Affiche également un résumé des coûts de l'opération.
 * @param {string} imageUrl L'URL de l'image à analyser.
 * @param {string} promptText La question à poser sur l'image.
 * @returns {{text: string, usage: object}|null} Un objet contenant le texte généré et les métadonnées d'utilisation.
 */
function generateTextFromImageWithGemini(imageUrl, promptText) {
  const GEMINI_API_KEY = getGeminiApiKey();

  try {
    // Récupérer l'image et la convertir en base64
    const imageBlob = _wpFetchImageBlob(imageUrl); // Réutilisation de la fonction de WordPressHelper
    if (!imageBlob) {
      throw new Error("Impossible de récupérer le blob de l'image.");
    }
    const base64Image = Utilities.base64Encode(imageBlob.getBytes());

    const payload = {
      "contents": [{
        "parts": [
          { "text": promptText },
          { "inline_data": { "mime_type": imageBlob.getContentType(), "data": base64Image } }
        ]
      }],
      "generationConfig": { "responseMimeType": "application/json" }
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    // Utilisation du modèle Flash, plus économique, et récupération des métadonnées d'utilisation
    const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());

    if (jsonResponse.error) {
      throw new Error(`Erreur API Gemini (Image-to-Text): ${jsonResponse.error.message}`);
    }

    let generatedText = jsonResponse.candidates[0].content.parts[0].text.trim();
    const usageMetadata = jsonResponse.usageMetadata;

    // Nettoyer la réponse qui peut être retournée dans un bloc de code Markdown.
    generatedText = generatedText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    // Calculer et afficher les coûts
    const costs = calculateCost("gemini-1.5-flash", usageMetadata);
    logCostSummary("generateTextFromImageWithGemini", "gemini-1.5-flash", usageMetadata, costs);

    return { text: generatedText, usage: usageMetadata };

  } catch (e) {
    Logger.log(`Error in generateTextFromImageWithGemini: ${e.message}`);
    return null;
  }
}

/**
 * FONCTION DE TEST: Appelle generateTextFromImageWithGemini avec une image et une question d'exemple.
 */
function test_generateTextFromImageWithGemini() {
  Logger.log("--- 🧪 Starting Gemini (Image to Text) test ---");
  const testImageUrl = "https://drive.google.com/file/d/1dPc0JHrtfulbiXM0xZwZANbrsieANedC/view"; // Image avec des ingrédients
  const testQuestion = "You are an expert image classifier for a food blog. Your task is to analyze the image and return a structured JSON object. First, classify the image type. Then, if it's a finished dish, describe it. \n\nCRITICAL: Return ONLY a JSON object with the following keys:\n- 'image_type': (string) Classify the image as one of these exact values: 'FINISHED_DISH', 'INGREDIENTS_ONLY', or 'NOT_FOOD'.\n- 'dish_name': (string or null) The name of the dish if it's a finished dish.\n- 'visible_ingredients': (array of strings or null) The visible ingredients if it's a finished dish.\n- 'preparation_style': (string or null) The preparation style if it's a finished dish.";

  const imageText = generateTextFromImageWithGemini(testImageUrl, testQuestion);

  if (imageText) {
    Logger.log(`--- ✅ SUCCESS --- \nGenerated text: "${imageText}"`);
  } else {
    Logger.log("--- ❌ FAILED --- Function returned null. Check logs above.");
  }
}
/**
 * Extracts structured recipe details (ingredients, instructions, times) from raw text.
 * @param {string} recipeContent The raw text of the recipe.
 * @returns {{data: object, usage: object}|null} An object containing the structured data and usage stats.
 */
function extractRecipeDetails(recipeContent) {
  const GEMINI_API_KEY = getGeminiApiKey();

  const prompt = `
    You are a professional chef and data extractor. Your task is to extract structured recipe data from the following text to create a recipe card.
    
    Raw Text:
    "${recipeContent}"

    Instructions:
    1. Extract the Ingredients as a clean list of strings (include quantities).
    2. Extract the Instructions as a clean list of strings (steps).
    3. Extract/Estimate Prep Time and Cook Time in minutes (integer). If not found, estimate based on the recipe type.
    4. Extract/Estimate Servings (integer).
    5. Write a short, appetizing Summary (2-3 sentences).
    
    Return a single VALID JSON object with this exact structure:
    {
      "title": "Recipe Title",
      "summary": "Short description...",
      "ingredients": ["1 cup flour", "2 eggs", ...],
      "instructions": ["Mix ingredients.", "Bake at 350F.", ...],
      "servings": 4,
      "prep_time": 15,
      "cook_time": 30
    }
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }],
    "generationConfig": { "responseMimeType": "application/json" }
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const jsonResponse = JSON.parse(response.getContentText());

  try {
    const data = JSON.parse(jsonResponse.candidates[0].content.parts[0].text);
    return { data, usage: jsonResponse.usageMetadata };
  } catch (e) {
    Logger.log("Error parsing Gemini recipe: " + e.message);
    return null;
  }
}
/**
 * Extracts structured recipe data from a WordPress article's HTML content.
 * Specialized for the ADD_CARD trigger.
 * @param {string} htmlContent The HTML content of the article.
 * @returns {{data: object, usage: object}|null} An object containing the structured data and usage stats.
 */
function extractRecipeDataFromHtml(htmlContent) {
  const GEMINI_API_KEY = getGeminiApiKey();

  const prompt = `
    You are a professional chef and SEO expert. Analyze the provided HTML content of a blog post and extract the recipe details to create a WP Recipe Maker card.
    
    Article HTML:
    "${htmlContent}"

    Instructions:
    1. Identify the core recipe within the HTML text.
    2. Extract the Ingredients as an array of objects: {"amount": "1", "unit": "cup", "name": "flour", "notes": ""}.
    3. Extract the Instructions as an array of strings (the steps).
    4. Extract/Estimate Prep Time and Cook Time in minutes (integers).
    5. Extract/Estimate Servings (integer).
    6. Write a short, appetizing Summary (2-3 sentences).
    
    Return a single VALID JSON object with this exact structure:
    {
      "title": "Recipe Title",
      "summary": "Short description...",
      "ingredients": [{"amount": "1", "unit": "cup", "name": "flour", "notes": ""}, ...],
      "instructions": ["Step 1...", "Step 2...", ...],
      "servings": 4,
      "prep_time": 15,
      "cook_time": 30
    }
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }],
    "generationConfig": { "responseMimeType": "application/json" }
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const jsonResponse = JSON.parse(response.getContentText());

  try {
    const data = JSON.parse(jsonResponse.candidates[0].content.parts[0].text);
    return { data, usage: jsonResponse.usageMetadata };
  } catch (e) {
    Logger.log("Erreur parsing recipe from HTML: " + e.message);
    return null;
  }
}
