/**
 * @fileoverview Helper pour interagir avec le plugin WP Recipe Maker via l'API REST personnalisée.
 */

/**
 * Crée une fiche recette dans WP Recipe Maker via l'API personnalisée.
 * @param {string} title Le titre de la recette.
 * @param {string} summary Un court résumé de la recette.
 * @param {object[]} ingredients Liste des ingrédients (objets avec amount, unit, name, notes).
 * @param {string[]} instructions Liste des instructions.
 * @param {number} servings Nombre de parts.
 * @param {number} prepTime Temps de préparation en minutes.
 * @param {number} cookTime Temps de cuisson en minutes.
 * @returns {object} La réponse de l'API contenant l'ID, le shortcode, etc.
 */
/**
 * Crée une fiche recette dans WP Recipe Maker via l'API personnalisée.
 * @param {string} title Le titre de la recette.
 * @param {string} summary Un court résumé de la recette.
 * @param {object[]} ingredients Liste des ingrédients (objets avec amount, unit, name, notes).
 * @param {string[]} instructions Liste des instructions.
 * @param {number} servings Nombre de parts.
 * @param {number} prepTime Temps de préparation en minutes.
 * @param {number} cookTime Temps de cuisson en minutes.
 * @param {object} siteConfig Configuration du site (optionnel).
 * @param {number} imageId ID de l'image mise en avant dans WordPress (optionnel).
 * @returns {object} La réponse de l'API contenant l'ID, le shortcode, etc.
 */
function createRecipeCard(title, summary, ingredients, instructions, servings, prepTime, cookTime, siteConfig = null, imageId = null) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;

    // Endpoint DÉDIÉ pour WP Recipe Maker (WPRM)
    let recipeApi = siteConfig ? siteConfig.wpRecipeApi : CONFIG.WORDPRESS_RECIPE_API_ENDPOINT;

    // Auto-correction : Si l'utilisateur a mis la route des posts par erreur (-post)
    if (recipeApi && recipeApi.includes('create-recipe-post')) {
        recipeApi = recipeApi.replace('create-recipe-post', 'create-recipe');
    }

    const url = (recipeApi && recipeApi.startsWith('http')) ? recipeApi : `${baseUrl}${recipeApi}`;

    const username = siteConfig ? siteConfig.wpUser : scriptProperties.getProperty('WORDPRESS_USER');
    const password = siteConfig ? siteConfig.wpAppPassword : scriptProperties.getProperty('WORDPRESS_APP_PASSWORD');

    if (!username || !password) {
        throw new Error("Identifiants WordPress manquants (User/App Password).");
    }

    const headers = {
        'Authorization': 'Basic ' + Utilities.base64Encode(username + ':' + password),
        'Content-Type': 'application/json'
    };

    const payload = {
        title: title,
        summary: summary,
        ingredients: ingredients,
        instructions: instructions,
        servings: servings,
        prep_time: prepTime,
        cook_time: cookTime
    };

    // Ajout de l'image si fournie
    if (imageId) {
        payload.image_id = imageId;
    }

    const options = {
        'method': 'post',
        'headers': headers,
        'payload': JSON.stringify(payload),
        'muteHttpExceptions': true
    };

    Logger.log(`Sending recipe creation request to: ${url}`);
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
        const data = JSON.parse(responseBody);
        if (data.success) {
            Logger.log(`Recipe created successfully! ID: ${data.id}`);
            return data;
        } else {
            Logger.log(`API logic error: ${responseBody}`);
            throw new Error(`Erreur API WP Recipe Maker : ${responseBody}`);
        }
    } else {
        Logger.log(`HTTP Error ${responseCode}: ${responseBody}`);
        throw new Error(`Erreur HTTP lors de la création de la recette : ${responseCode} - ${responseBody}`);
    }
}

/**
 * Fonction de test unitaire pour valider la création d'une recette.
 */
function test_createRecipeCard() {
    Logger.log("--- 🧪 Starting test: WP Recipe Card creation ---");

    // Données de test en dur
    const title = "Test Omelette with Cheese";
    const summary = "A simple and delicious cheese omelette for breakfast.";
    const ingredients = [
        "2 eggs",
        "1 tbsp butter",
        "1/4 cup shredded cheddar cheese",
        "Salt and pepper to taste"
    ];
    const instructions = [
        "Beat the eggs in a bowl with salt and pepper.",
        "Melt butter in a non-stick pan over medium heat.",
        "Pour eggs into the pan and let set for 1 minute.",
        "Add cheese, fold, and serve."
    ];
    const servings = 1;
    const prepTime = 5;
    const cookTime = 5;

    try {
        const result = createRecipeCard(title, summary, ingredients, instructions, servings, prepTime, cookTime);

        Logger.log("--- ✅ Test Passed! ---");
        Logger.log(`Recipe ID: ${result.id}`);
        Logger.log(`Shortcode : ${result.shortcode}`);
        Logger.log(`Edit link: ${result.edit_link}`);

        // Optionnel : Retourner le résultat pour une utilisation dans d'autres tests
        return result;

    } catch (error) {
        Logger.log("--- ❌ Test Failed ---");
        Logger.log(error.message);
    }
}
