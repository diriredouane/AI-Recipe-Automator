/**
 * @fileoverview Batterie de tests unitaires pour le projet Pinterest & WordPress.
 * Ce fichier permet de valider chaque composant isolément pour diagnostiquer les erreurs.
 */

/**
 * TEST 1 : Gemini 3 Pro (Outline Generation)
 * C'est le suspect principal des Timeouts de 6 minutes.
 * Ce test vérifie si le modèle répond et en combien de temps.
 */
function test_Gemini3_Outline() {
    Logger.log("--- 🧪 DEBUT DU TEST : Gemini 3 Pro (Outline) ---");

    const testKeyword = "Glazed Sliced Beef Loin";
    const testContext = "Glazed Sliced Beef Loin with beef loin, sweet and savory glaze. Preparation style: Roasted and glazed, then sliced.";

    const startTime = new Date();

    try {
        Logger.log(`[INIT] Sending request to Gemini 3 for: "${testKeyword}"...`);
        Logger.log("[INFO] Ce test inclut Google Search Grounding (Recherche Web).");

        // Appel de la fonction réelle définie dans WordPressHelper.js
        const result = generateWordPressOutline(testKeyword, testContext);

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        if (result && result.data) {
            Logger.log("-----------------------------------------");
            Logger.log("✅ SUCCESS: Gemini 3 responded!");
            Logger.log(`⏱️ Execution time: ${duration.toFixed(2)} seconds`);
            Logger.log("-----------------------------------------");
            Logger.log("Generated title: " + result.data.seoTitle);
            Logger.log("Keywords LSI : " + result.data.lsi_keywords.join(", "));
            Logger.log("Outline preview: \n" + result.data.outline_markdown.substring(0, 200) + "...");
        } else {
            Logger.log("--- ❌ FAILED: AI responded but data is empty ---");
        }
    } catch (e) {
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        Logger.log("-----------------------------------------");
        Logger.log("❌ ERREUR DETECTÉE");
        Logger.log(`⏱️ Interrupted after: ${duration.toFixed(2)} seconds`);
        Logger.log("Message d'erreur : " + e.message);
        Logger.log("-----------------------------------------");

        if (e.message.includes("429")) {
            Logger.log("💡 Tip: Rate limiting (Too Many Requests). Wait 1 minute.");
        } else if (e.message.includes("500") || e.message.includes("503")) {
            Logger.log("💡 Tip: Google server error. Try again later.");
        }
    }
}

/**
 * TEST 2 : Comparaison avec Gemini Flash (Analyse d'image simple)
 * Pour vérifier que l'API en général fonctionne bien.
 */
function test_GeminiFlash_Ping() {
    Logger.log("--- 🧪 TEST RAPIDE : Gemini Flash Ping ---");
    const startTime = new Date();

    try {
        const result = extractTitleAndKeyword("Chicken noodle soup recipe for a healthy dinner");
        const duration = (new Date() - startTime) / 1000;

        Logger.log(`✅ Flash responded in ${duration.toFixed(2)}s`);
        Logger.log("Result: " + JSON.stringify(result.data));
    } catch (e) {
        Logger.log("❌ Erreur Flash : " + e.message);
    }
}

/**
 * TEST 3 : Lecture du Sitemap
 * Vérifie si le parsing du sitemap XML est rapide ou s'il sature GAS.
 */
function test_Sitemap_Parsing() {
    Logger.log("--- 🧪 DEBUT DU TEST : Lecture Sitemap ---");
    const accountConfig = getAccountConfigForSheet("Recipes");
    const sitemapUrl = accountConfig.sitemapUrl;

    if (!sitemapUrl) {
        Logger.log("❌ ERROR: No Sitemap URL configured.");
        return;
    }

    Logger.log(`[INIT] Fetching sitemap: ${sitemapUrl}...`);
    const startTime = new Date();

    try {
        const urls = _getSitemapUrls(sitemapUrl);
        const duration = (new Date() - startTime) / 1000;

        Logger.log("-----------------------------------------");
        Logger.log(`✅ SUCCÈS : Sitemap lu en ${duration.toFixed(2)} secondes`);
        Logger.log(`📊 Number of URLs found: ${urls.length}`);
        Logger.log("-----------------------------------------");

        if (urls.length > 500) {
            Logger.log("⚠️ ATTENTION : Le sitemap est volumineux. Le parsing XML peut ralentir GAS.");
        }
    } catch (e) {
        Logger.log("❌ ERREUR Sitemap : " + e.message);
    }
}

/**
 * TEST 4 : Maillage Interne
 * Teste la sélection et l'insertion de liens (2 appels Flash).
 */
function test_Internal_Linking_Perf() {
    Logger.log("--- 🧪 DEBUT DU TEST : Maillage Interne ---");
    const startTime = new Date();

    const testHtml = `<h2>Introduction</h2><p>This roasted beef loin is a classic holiday dish. Making perfect roast beef requires patience and the right glaze.</p><h3>Cooking Tips</h3><p>Ensure your oven is preheated. Slicing the beef thinly makes it more tender.</p>`;
    const testKeyword = "Glazed Sliced Beef Loin";
    const internalUrls = [
        "https://simplebitesrecipes.com/best-beef-stew",
        "https://simplebitesrecipes.com/how-to-roast-meat",
        "https://simplebitesrecipes.com/side-dishes-for-beef",
        "https://simplebitesrecipes.com/homemade-balsamic-glaze"
    ];

    try {
        const costBreakdown = [];
        const resultHtml = _applyInternalLinking(testHtml, testKeyword, internalUrls, costBreakdown);
        const duration = (new Date() - startTime) / 1000;

        Logger.log("-----------------------------------------");
        Logger.log(`✅ SUCCÈS : Maillage interne fini en ${duration.toFixed(2)} secondes`);
        Logger.log(`💡 Links inserted (preview): ${resultHtml.includes('<a') ? 'YES' : 'NO'}`);
        Logger.log("-----------------------------------------");
    } catch (e) {
        Logger.log("❌ ERREUR Maillage : " + e.message);
    }
}

/**
 * TEST 5 : Remastering d'image (Google Slides)
 * C'est souvent l'étape la plus lente après l'IA.
 */
function test_Remastering_Speed() {
    Logger.log("--- 🧪 DEBUT DU TEST : Remastering Image ---");
    const accountConfig = getAccountConfigForSheet("Recipes");
    const testImage = "https://drive.google.com/uc?export=download&id=1JAk2-SG9-i1J3-lf-liPUaLW2be1qc3S";
    const templateId = accountConfig.wpFeaturedImageTemplateId;
    const folderId = accountConfig.driveFolderId;

    if (!templateId) {
        Logger.log("❌ ERROR: No Slide template configured for remastering.");
        return;
    }

    const startTime = new Date();
    try {
        Logger.log("[INIT] Lancement de applyUniqueTemplateToImage...");
        const result = applyUniqueTemplateToImage(testImage, templateId, "Test-Remaster-Speed", folderId);
        const duration = (new Date() - startTime) / 1000;

        if (result) {
            Logger.log("-----------------------------------------");
            Logger.log(`✅ SUCCÈS : Remastering fini en ${duration.toFixed(2)} secondes`);
            Logger.log(`🔗 Image produite : ${result.viewUrl}`);
            Logger.log("-----------------------------------------");
        }
    } catch (e) {
        Logger.log("❌ ERREUR Remastering : " + e.message);
    }
}

/**
 * TEST 6 : Rédaction de l'Article (Gemini Flash)
 * Vérifie combien de temps prend la rédaction de 1500 mots.
 */
function test_Article_Generation_Speed() {
    Logger.log("--- 🧪 START OF TEST: Article Writing ---");
    const startTime = new Date();
    const testKeyword = "Glazed Sliced Beef Loin";
    const testOutline = "## Introduction\nDetailed history of beef loin.\n## Cooking Methods\nRoasting basics.\n## Glazing Techniques\nHow to glaze properly.";

    try {
        Logger.log("[INIT] Sending writing request to Gemini Flash...");
        const result = generateWordPressArticle(testKeyword, testOutline, ["roasted beef loin", "savory glaze"]);
        const duration = (new Date() - startTime) / 1000;

        if (result && result.data) {
            Logger.log("-----------------------------------------");
            Logger.log(`✅ SUCCESS: Article written in ${duration.toFixed(2)} seconds`);
            Logger.log(`📝 Estimated length: ${result.data.length} characters`);
            Logger.log("-----------------------------------------");
        }
    } catch (e) {
        Logger.log("❌ ERREUR Article : " + e.message);
    }
}

/**
 * TEST DEBUG: Vérifie que l'extraction nutritionnelle fonctionne.
 */
function test_NutritionExtraction() {
    Logger.log("--- 🧪 Test Extraction Nutrition ---");
    const testHtml = `
        <h1>Super Beef Tenderloin</h1>
        <p>This beef tenderloin is amazing. Serves 4 people. Prep time 10 mins. Cook time 20 mins.</p>
        <h2>Ingredients</h2>
        <ul><li>1kg Beef</li><li>Salt</li><li>Pepper</li></ul>
        <h2>Instructions</h2>
        <ol><li>Cook it.</li><li>Eat it.</li><li>Enjoy.</li></ol>
    `;

    try {
        const result = extractRecipeDataFromHtml(testHtml);
        Logger.log("Extracted data:");
        Logger.log(JSON.stringify(result.data, null, 2));

        if (result.data.nutrition) {
            Logger.log("✅ NUTRITION TROUVÉE !");
            Logger.log("Calories: " + result.data.nutrition.calories);
        } else {
            Logger.log("❌ NUTRITION MISSING in AI response.");
        }
    } catch (e) {
        Logger.log("❌ Erreur : " + e.message);
    }
}
