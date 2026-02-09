/**
 * @fileoverview Gère la communication avec WordPress et la génération de contenu d'article.
 */
/**
 * Génère un plan d'article de blog détaillé, une liste de mots-clés LSI, et les données de la recette.
 * Utilise "Structured Outputs" pour garantir le JSON et "Google Search Grounding" pour enrichir les données.
 *
 * @param {string} targetKeyword Le mot-clé SEO principal pour l'article.
 * @param {string} recipeContent Le contenu textuel de la recette (potentiellement enrichi).
 * @returns {{data: object, usage: object}|null} Un objet contenant les données générées et les métadonnées d'utilisation.
 */
function generateWordPressOutline(targetKeyword, recipeContent) {
  const GEMINI_API_KEY = getGeminiApiKey();

  // --- Configuration du prompt ---
  const prompt = `
    As a world-class SEO expert and culinary content strategist, create a comprehensive content brief for a 1500-word article.
    
    Target Keyword: "${targetKeyword}"
    Provided Context/Recipe Draft: "${recipeContent}"

     Instructions:
     1. **Research:** Use Google Search to enrich the data with helpful cooking tips and variations.
     2. **MEAT SUBSTITUTION:** If the recipe uses PORK, convert it to BEEF (e.g., pork shoulder -> beef chuck). Otherwise, use the original protein provided.
     3. **Recipe Card (DATA CLEANLINESS):** 
        - **DRACONIAN RULE:** The 'summary', 'ingredients', and 'instructions' fields MUST contain ONLY the final data.
        - **ABSOLUTE PROHIBITION:** NEVER include any internal reasoning, "Chain of Thought", "thinking process", "meta-comments", "self-corrections", or conversational markers like "Actually", "Wait", "Let's see", "I will", etc. inside the JSON fields.
        - The 'name' and 'amount' fields must be clean strings (e.g., name: "Salmon fillets", amount: "1 lb").
        - 'prep_time', 'cook_time', and 'servings' must be Integers.
     4. **SEO (CRITICAL):** 
        - **targetKeyword**: Assign a strong 3-5 word keyword.
        - **seoTitle**: Max 60 chars, must include the targetKeyword.
        - **metaDescription**: 150-160 chars, MUST start with the targetKeyword.
        - Generate 5-10 complementary LSI keywords.
     5. **Outline:** Create a detailed Markdown outline (##, ###).
     6. **INTERNAL REASONING (HONEY POT):** Put ALL your reasoning, meat substitution thoughts, and self-corrections ONLY in the 'internal_reasoning' field. NEVER put them in ingredients or instructions.
  `;

  // --- Construction du payload (Texte seul pour 3.0 Pro) ---
  const parts = [{ "text": prompt }];

  // --- Définition du Schema JSON Strict (Structured Outputs) ---
  const responseSchema = {
    "type": "object",
    "properties": {
      "internal_reasoning": { "type": "string", "description": "PLACE ALL THOUGHTS, SUBSTITUTION LOGIC, AND META-COMMENTS HERE ONLY." },
      "lsi_keywords": { "type": "array", "items": { "type": "string" } },
      "targetKeyword": { "type": "string", "description": "The primary SEO keyword, substituted to BEEF if necessary." },
      "outline_markdown": { "type": "string" },
      "seoTitle": { "type": "string" },
      "metaDescription": { "type": "string" },
      "recipe_card": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "summary": { "type": "string" },
          "ingredients": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "amount": { "type": "string", "description": "Numerical quantity (e.g., '1', '1/2')." },
                "unit": { "type": "string", "description": "Measurement unit (e.g., 'cup', 'tbsp', 'g')." },
                "name": { "type": "string", "description": "The name of the ingredient (REQUIRED). NO MONOLOGUE." },
                "notes": { "type": "string", "description": "Additional notes. NO REASONING." }
              },
              "required": ["name"]
            },
            "minItems": 3
          },
          "ingredients_substituted": { "type": "array", "items": { "type": "string" }, "description": "List of original ingredients that were swapped (e.g., 'pork' -> 'beef'). Leave empty if none." },
          "instructions": { "type": "array", "items": { "type": "string" }, "minItems": 3 },
          "servings": { "type": "integer" },
          "prep_time": { "type": "integer" },
          "cook_time": { "type": "integer" }
        },
        "required": ["title", "summary", "ingredients", "instructions", "servings", "prep_time", "cook_time"]
      }
    },
    "required": ["lsi_keywords", "outline_markdown", "seoTitle", "metaDescription", "recipe_card", "internal_reasoning"]
  };

  const payload = {
    "contents": [{ "parts": parts }],
    "tools": [
      { "googleSearch": {} },
      { "urlContext": {} }
    ],
    "generationConfig": {
      "responseMimeType": "application/json",
      "responseJsonSchema": responseSchema,
      "maxOutputTokens": 50000, // Limite augmentée pour Gemini 3 (max 64k)
      "thinkingConfig": {
        "thinkingLevel": "high" // Maximise le raisonnement pour des résultats de haute qualité
      }
    }
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  // On utilise l'endpoint configuré (gemini-3-pro-preview)
  const url = `${CONFIG.GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`;
  const response = UrlFetchApp.fetch(url, options);
  const responseText = response.getContentText();

  try {
    const jsonResponse = JSON.parse(responseText);

    if (jsonResponse.error) {
      throw new Error(`Gemini API Error: ${jsonResponse.error.message}`);
    }

    if (!jsonResponse.candidates || !jsonResponse.candidates[0].content.parts[0].text) {
      throw new Error("Pas de réponse texte de Gemini.");
    }

    const data = JSON.parse(jsonResponse.candidates[0].content.parts[0].text);
    const usage = jsonResponse.usageMetadata;

    // --- Post-processing Global : Nettoyage de TOUS les champs texte ---
    // Supprime les "Self-correction", "(substituted from Pork)", "(Better than Pork)", etc.
    const deepClean = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/\(.*substituted.*\)|--\s*\*?Self-correction.*$|\*?Wait.*$|\(Better Than Pork Chops!\)|\(Better Than Pork\)/gi, '')
            .replace(/NOTE:.*$|\*?Actually.*$|\*?I will.*$|\*?Let's see.*$|\*?Okay.*$|\(Self-correction:.*\)/gi, '')
            .replace(/Reasoning REMOVED.*$|Final Clean Data Only.*$|The output below is.*$|Wait, I must.*$|Resetting fields to.*$|Re-entering valid data.*$|I will output clean JSON.*$|STOP internal monologue.*$|The draconian rule says.*$|Clean data only.*$|Formatting into the schema.*$/gi, '')
            .replace(/^[ ]+|[ ]+$/g, '')
            .trim();

          if (key === 'name' && obj[key].length > 100) {
            const firstBreak = obj[key].match(/[,.]/);
            if (firstBreak) {
              obj[key] = obj[key].substring(0, firstBreak.index).trim();
            } else {
              obj[key] = obj[key].substring(0, 100).trim();
            }
          }
          if (key === 'notes' && obj[key].length > 150) {
            obj[key] = obj[key].substring(0, 150) + "...";
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          deepClean(obj[key]);
        }
      }
    };
    deepClean(data);

    // Supprimer le "Honey Pot" avant de renvoyer les données pour ne pas polluer l'article
    delete data.internal_reasoning;
    delete data.ingredients_substituted;

    return { data, usage };

  } catch (e) {
    const errorMsg = "Erreur dans generateWordPressOutline: " + e.message;
    Logger.log(errorMsg);
    Logger.log("Raw response: " + responseText);
    throw new Error(errorMsg); // On relance l'erreur pour qu'elle soit captée par processRecipeRow
  }
}
/**
 * Génère un mot-clé principal optimisé à partir d'un titre brut.
 * @param {string} rawTitle Le titre brut provenant de la source de données.
 * @returns {{data: string, usage: object}|null} Un objet contenant le mot-clé et les métadonnées d'utilisation.
 */
function generateTargetKeyword(rawTitle) {
  const GEMINI_API_KEY = getGeminiApiKey();

  const prompt = `
    You are a food blog SEO expert. Your task is to extract a short, powerful, and SEO-friendly primary keyword from the following raw post title.

    Raw Title: "${rawTitle}"

    Instructions:
    1. Identify the core subject of the recipe.
    2. Create a concise keyword phrase (3-5 words) that a user would type into Google.
    3. **MANDATORY SUBSTITUTION:** If the input title mentions "Pork" or any pig-related meat, you MUST substitute it with "Beef" in your output keyword.
    4. Return ONLY the keyword phrase as a plain string. Do not add any other text or quotes.

    Example:
    Raw Title: "The Most Amazing and Easy Fireball Whiskey Jalapeño Popper Burger with Cream Cheese Drizzle"
    Your output: "Fireball Whiskey Jalapeño Popper Burger"
  `;

  const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
  const options = { 'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload), 'muteHttpExceptions': true };

  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const jsonResponse = JSON.parse(response.getContentText());
  const data = jsonResponse.candidates[0].content.parts[0].text.trim();
  return { data, usage: jsonResponse.usageMetadata };
}
/**
 * Extracts a clean H1 title and a primary SEO keyword from raw text using an LLM.
 * @param {string} rawText The raw text from the source (can be a full paragraph).
 * @returns {{data: {postTitle: string, targetKeyword: string}, usage: object}|null} An object containing the title, keyword, and usage data.
 */
function extractTitleAndKeyword(rawText) {
  const GEMINI_API_KEY = getGeminiApiKey();

  const prompt = `
    You are a food blog SEO expert. Your task is to extract a clean H1 blog post title and a short, powerful, SEO-friendly primary keyword from the following raw text.

    Raw Text: "${rawText}"

    Instructions:
    1.  **Analyze the text** to find the actual name of the recipe.
    2.  **MANDATORY SUBSTITUTION:** If the recipe uses PORK, you MUST convert the title and keyword to BEEF.
    3.  **Create a clean H1 Title:** The full, appealing name of the recipe (Sub Beef for Pork).
    4.  **Create a primary SEO Keyword:** A concise keyword phrase (Sub Beef for Pork).
    5.  **NO META-COMMENTARY:** Do not include "substituted", "better than", or any explanations in the output.
    6.  **Return a single, valid JSON object:**
        {
          "postTitle": "Recipe Title",
          "targetKeyword": "SEO Keyword"
        }

    Example:
    Raw Text: "I received this recipe as part of a wedding gift. It's the most amazing Fireball Whiskey Jalapeño Popper Burger. —Tricia Bryan, Bolivar, Ohio | Get the recipe at the link in the comments ⬇️"
    Your output:
    {
      "postTitle": "Fireball Whiskey Jalapeño Popper Burger",
      "targetKeyword": "Fireball Whiskey Jalapeño Burger"
    }

    Example 2 (Title not found):
    Raw Text: "I received this recipe as part of a wedding gift. I have made it for a couple of summer gatherings with friends. —Tricia Bryan, Bolivar, Ohio"
    Your output:
    {
      "postTitle": null,
      "targetKeyword": null
    }
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }],
    "generationConfig": { "responseMimeType": "application/json" }
  };
  const options = { 'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload), 'muteHttpExceptions': true };

  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const responseText = response.getContentText();

  try {
    const jsonResponse = JSON.parse(responseText);

    if (jsonResponse.error) {
      throw new Error(`Gemini Flash Error: ${jsonResponse.error.message}`);
    }

    if (!jsonResponse.candidates || !jsonResponse.candidates[0].content.parts[0].text) {
      throw new Error("Pas de réponse valide de Gemini Flash.");
    }

    const data = JSON.parse(jsonResponse.candidates[0].content.parts[0].text);
    return { data, usage: jsonResponse.usageMetadata };
  } catch (e) {
    Logger.log(`Error in extractTitleAndKeyword: ${e.message}`);
    Logger.log("Raw response: " + responseText);
    throw new Error(`Identification du titre échouée: ${e.message}`);
  }
}
/**
 * Génère le contenu complet d'un article de blog au format HTML à partir d'un plan et de mots-clés.
 *
 * @param {string} targetKeyword Le mot-clé SEO principal pour l'article.
 * @param {string} outlineMarkdown Le plan de l'article au format Markdown.
 * @param {string[]} lsiKeywords Un tableau de mots-clés LSI à intégrer.
 * @returns {{data: string, usage: object}|null} Un objet contenant l'article HTML et les métadonnées d'utilisation.
 */
function generateWordPressArticle(targetKeyword, outlineMarkdown, lsiKeywords, facebookUrl) {
  const GEMINI_API_KEY = getGeminiApiKey();

  // Gestion du fallback pour l'URL Facebook
  let actualFacebookUrl = facebookUrl;
  if (!actualFacebookUrl || actualFacebookUrl.includes("Enter your Facebook Page URL") || actualFacebookUrl.trim() === "") {
    actualFacebookUrl = "https://www.facebook.com";
  }

  const prompt = `
    You are an expert food blogger and SEO copywriter. Your task is to write a high-value blog post based on the provided content brief.

    **CRITICAL INSTRUCTION: The final article's word count MUST be between 1,000 and 1,500 words. Do not exceed this limit.**

    **CONTENT BRIEF:**
    - **Primary Keyword:** "${targetKeyword}"
    - **LSI & NLP Keywords to include:** ${lsiKeywords.join(', ')}
    - **Facebook Page URL:** "${actualFacebookUrl}" (Include a call to action to follow this page at the end)
    - **Article Outline (based on this structure):**
      ---
      ${outlineMarkdown}
      ---

    **MANDATORY SUBSTITUTION RULE (CRITICAL):**
    - IF the recipe originally used PORK, you MUST write it as BEEF.
    - **ABSOLUTE PROHIBITION:** NEVER use the word "Pork" or mention pigs. 
    - NEVER mention "substituted", "alternative to", or "original recipe". 
    - The article MUST read as if it were always originally intended as is.
    - NO META-COMMENTARY: Do not explain the conversion.
 
     **INSTRUCTIONS:**
     1.  **Word Count:** Adhere strictly to the 1,000-1,500 word count limit.
     5.  **Formatting Rules:**
         - The article must NOT begin with an <h1> tag, as the title is handled by the CMS.
         - Use <h2> for main sections and <h3> for sub-sections, following the structure of the provided outline.
         - Use <p> tags for all paragraphs.
         - Use <strong> and <em> tags to emphasize important words and phrases.
         - Use <ul><li>...</li></ul> for bulleted lists and <ol><li>...</li></ol> for numbered lists.
         - Use <blockquote> for expert quotes or key takeaways.
        - **ABSOLUTE FORBIDDEN CONTENT:** 
          - Do NOT add "Discover more" sections, related link lists, or lists of keywords.
          - **NO HTML LINKS:** Do NOT include any '<a>' tags or hypothetical URLs during this writing phase. 
          - ONLY write the core article text.
     6.  **SEO Requirements:**
         - **Primary Keyword:** Ensure the primary keyword "${targetKeyword}" appears in the FIRST paragraph and naturally throughout the text.
         - **Keyword Density:** Maintain a natural density between 1% and 1.5%.
         - **Featured Snippets:** Structure answers (especially in lists and the FAQ section) to be easily captured by Google as a 'Featured Snippet'.
     7.  **Tone:** Adopt a warm, engaging, and accessible tone.

    **Output only the final, complete HTML code for the article body. Do not include any explanatory text before or after the HTML.**
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const responseText = response.getContentText();

  try {
    const jsonResponse = JSON.parse(responseText);

    if (jsonResponse.error) {
      throw new Error(`Gemini Article Error: ${jsonResponse.error.message}`);
    }

    if (!jsonResponse.candidates || !jsonResponse.candidates[0].content.parts[0].text) {
      throw new Error("Pas de contenu généré pour l'article.");
    }

    let articleHtml = jsonResponse.candidates[0].content.parts[0].text;
    // Nettoyeur encore plus agressif
    // Supprime globalement les blocs de code markdown (```html, ```) et les caractères parasites («)
    const data = articleHtml
      .replace(/^[«\s]*```(?:html)?\s*/gi, '') // Supprime le marqueur de début (insensible à la casse)
      .replace(/\s*```[«\s]*$/gi, '')         // Supprime le marqueur de fin
      .replace(/^[\n\r]+|[\n\r]+$/g, '')      // Supprime les sauts de ligne inutiles au début/fin
      .trim();
    const usage = jsonResponse.usageMetadata;
    return { data, usage };
  } catch (e) {
    Logger.log("Gemini JSON parsing error for WordPress article: " + e.toString());
    Logger.log("Raw response: " + responseText);
    return null;
  }
}
/**
 * Sélectionne les 4 liens internes les plus pertinents pour un article.
 * C'est la première étape du processus de maillage interne en deux temps.
 *
 * @param {string} articleHtml Le contenu HTML de l'article.
 * @param {string} targetKeyword Le mot-clé principal de l'article pour le contexte.
 * @param {string[]} sitemapUrls Une liste de toutes les URLs disponibles pour le maillage interne.
 * @returns {{data: string[], usage: object}|null} Un objet contenant un tableau de 4 URLs et les métadonnées d'utilisation.
 */
function selectInternalLinks(articleHtml, targetKeyword, sitemapUrls) {
  const GEMINI_API_KEY = getGeminiApiKey();

  const prompt = `
    You are an SEO expert specializing in internal linking strategy.
    Your task is to analyze an article and select the most relevant internal links from a provided list.

    **Article HTML to modify:**
    ---
    ${articleHtml}
    ---

    **List of available internal URLs from the blog (choose from this list):**
    ${sitemapUrls.join('\n')}
    
    **Instructions:**
    1.  Read the article's content to understand its main topics.
    2.  From the list of available URLs, select exactly 4 of the MOST RELEVANT URLs to link to.
    3.  Return a single, valid JSON object with a single key "selected_urls" containing an array of the 4 chosen URL strings.

    **CRITICAL RULE: The output MUST be a JSON array containing exactly 4 URLs.**

    Example Output:
    {
      "selected_urls": [
        "https://site.com/related-article-1",
        "https://site.com/related-article-2",
        "https://site.com/related-article-3",
        "https://site.com/related-article-4"
      ]
    }
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }],
    "generationConfig": { "response_mime_type": "application/json" }
  };
  const options = { 'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload), 'muteHttpExceptions': true };

  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const responseText = response.getContentText();

  const jsonResponse = JSON.parse(responseText);
  const result = JSON.parse(jsonResponse.candidates[0].content.parts[0].text);
  return { data: result.selected_urls || [], usage: jsonResponse.usageMetadata };
}

/**
 * Ajoute une liste de liens internes prédéfinis à un article HTML.
 * C'est la deuxième étape du processus de maillage interne.
 *
 * @param {string} articleHtml Le contenu HTML de l'article.
 * @param {string} targetKeyword Le mot-clé principal de l'article pour le contexte.
 * @param {string[]} selectedUrls Un tableau contenant les 4 URLs à insérer.
 * @returns {{data: string, usage: object}|null} Un objet contenant l'article HTML modifié et les métadonnées d'utilisation.
 */
function addInternalLinks(articleHtml, targetKeyword, selectedUrls) {
  const GEMINI_API_KEY = getGeminiApiKey();

  const prompt = `
    You are an SEO copywriter. Your task is to enrich the following HTML article by inserting a specific list of internal links.

    **Article HTML to modify:**
    ---
    ${articleHtml}
    ---

    **Links to insert (insert all of them):**
    ${selectedUrls.join('\n')}
    
    **Instructions:**
    1.  For each URL in the provided list, find ONE natural anchor text within the article's existing paragraphs.
    2.  Wrap the existing text in an <a> tag using the EXACT URL provided.
    3.  **STRICTLY FORBIDDEN:**
        - Do NOT create links that are not in the provided list.
        - NEVER invent or hallucinate URLs (e.g., example.com, generic urls).
        - Do NOT create links to the current page itself (self-referencing).
        - Do NOT use '#' as a href.
        - Do NOT add "Discover more", "Related articles", or new content sections.
        - Do NOT change any existing URLs.
    4.  If you cannot find a natural anchor text for a URL, simply SKIP it. Do not force it.
    5.  Return ONLY the modified, complete HTML code for the article.
  `;

  const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
  const options = { 'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload), 'muteHttpExceptions': true };

  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const responseText = response.getContentText();

  const jsonResponse = JSON.parse(responseText);
  const data = jsonResponse.candidates[0].content.parts[0].text.trim();
  return { data: data, usage: jsonResponse.usageMetadata };
}

/**
 * Nettoie un contenu HTML en ne conservant que les 4 premiers liens internes.
 * Les liens internes suivants sont remplacés par leur texte d'ancre.
 *
 * @param {string} htmlContent Le contenu HTML à nettoyer.
 * @returns {string} Le contenu HTML nettoyé.
 */
function cleanupInternalLinks(htmlContent, baseUrl) {
  // Regex pour trouver TOUS les liens <a> et capturer leur URL et leur texte.
  const allLinksRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
  let validInternalLinkCount = 0;
  let cleanedLinksCount = 0;

  // Clean trailing slash for matching
  const cleanBaseUrl = baseUrl ? baseUrl.replace(/\/$/, "") : "";

  const cleanedHtml = htmlContent.replace(allLinksRegex, (match, url, anchorText) => {
    // Cas 1: C'est un lien d'ancre invalide (href="#...") causé par un bug précédent. On le supprime toujours.
    if (url.startsWith("#")) {
      Logger.log(`Invalid anchor link (href="${url}") found and removed. Text: "${anchorText}"`);
      cleanedLinksCount++;
      return `<span>${anchorText}</span>`; // Remplacer par un span pour éviter la "réparation" de WordPress.
    }
    // Cas 2: C'est un vrai lien interne. On applique la règle des 4 liens.
    else if (cleanBaseUrl && (url.startsWith(cleanBaseUrl) || url.startsWith(cleanBaseUrl.replace("https://", "http://")))) {
      if (validInternalLinkCount < 4) {
        validInternalLinkCount++;
        Logger.log(`Valid internal link kept (${validInternalLinkCount}/4): ${url}`);
        return match; // On garde le lien.
      } else {
        Logger.log(`Extra valid internal link removed: ${url}`);
        cleanedLinksCount++;
        return `<span>${anchorText}</span>`; // On supprime le lien en trop.
      }
    }
    // Cas 3: C'est un lien externe (ex: Facebook) ou autre. On n'y touche pas.
    return match;
  });

  Logger.log(`Cleanup complete. ${cleanedLinksCount} link(s) total were cleaned/removed.`);

  return cleanedHtml;
}

/**
 * Determines the best category ID for an article based on its target keyword.
 *
 * @param {string} targetKeyword The main keyword of the article.
 * @param {Array<{id: number, name: string}>} availableCategories A list of available WordPress categories.
 * @returns {{data: number, usage: object}|null} Un objet contenant l'ID de la catégorie et les métadonnées d'utilisation.
 */
function getBestCategoryId(targetKeyword, availableCategories) {
  const GEMINI_API_KEY = getGeminiApiKey();

  const prompt = `
    You are an expert content classifier for a food blog.
    Your task is to choose the single best category for an article from a given list.

    - **Article's Main Keyword:** "${targetKeyword}"

    - **Available Categories (with their IDs):**
    ${JSON.stringify(availableCategories, null, 2)}

    Instructions:
    1. Analyze the keyword.
    2. Choose the most relevant category from the list provided.
    3. Return a single, valid JSON object with the ID of your chosen category. Example: {"category_id": 15}

    Do not output any other text.
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": prompt }] }],
    "generationConfig": { "response_mime_type": "application/json" }
  };
  const options = { 'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload), 'muteHttpExceptions': true };

  const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}&fields=candidates(content),usageMetadata`;
  const response = UrlFetchApp.fetch(url, options);
  const responseText = response.getContentText();

  const jsonResponse = JSON.parse(responseText);
  const result = JSON.parse(jsonResponse.candidates[0].content.parts[0].text);
  return { data: result.category_id || null, usage: jsonResponse.usageMetadata };
}

/**
 * FONCTION DE TEST: Appelle generateWordPressOutline pour créer un plan,
 * puis appelle generateWordPressArticle pour générer l'article complet.
 */
function test_WordPressGeneration() {
  const testKeyword = "Molten Chocolate Lava Cake";
  const testContent = "An incredibly rich cake with a gooey, liquid center. Ingredients: 200g dark chocolate, 150g butter, 4 eggs, 200g sugar, 100g flour. Preheat oven to 180°C...";
  Logger.log(`--- 🧪 Starting WordPress generation test for keyword: "${testKeyword}" ---`);

  const outlineResult = generateWordPressOutline(testKeyword, testContent);
  if (!outlineResult || !outlineResult.data.outline_markdown) {
    Logger.log("--- ❌ Content brief generation failed ---");
    return;
  }

  Logger.log("--- ✅ Content Brief generated ---");
  Logger.log("LSI Keywords: " + outlineResult.data.lsi_keywords.join(', '));
  Logger.log("SEO Title: " + outlineResult.data.seoTitle);
  Logger.log("Meta Description: " + outlineResult.data.metaDescription);
  Logger.log("Markdown Outline: \n" + outlineResult.data.outline_markdown);

  const articleResult = generateWordPressArticle(testKeyword, outlineResult.data.outline_markdown, outlineResult.data.lsi_keywords);
  Logger.log("\n--- 📄 Full Markdown Article generated ---");
  Logger.log(articleResult.data);
}

/**
 * Uploads an image from a URL to the WordPress Media Library.
 *
 * @param {string} imageUrl The URL of the image to upload.
 * @param {string} filename The desired filename for the image in WordPress.
 * @param {string} [altText=''] Optional. The alt text for the image.
 * @param {object} [siteConfig=null] Optional. Configuration spécifique au site.
 * @return {{id: number, url: string}|null} An object with the new media ID and URL, or null on error.
 */
function uploadImageToWordPress(imageUrl, filename, altText = '', siteConfig = null) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const username = siteConfig ? siteConfig.wpUser : scriptProperties.getProperty('WORDPRESS_USER');
  const password = siteConfig ? siteConfig.wpAppPassword : scriptProperties.getProperty('WORDPRESS_APP_PASSWORD');
  const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;

  if (!username || !password) {
    throw new Error("WORDPRESS_USER ou WORDPRESS_APP_PASSWORD ne sont pas définis.");
  }
  if (!baseUrl || baseUrl === "https://VOTRE-BLOG.com") {
    throw new Error("Veuillez définir WORDPRESS_BASE_URL dans le fichier Config.js.");
  }

  const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
  const mediaApiUrl = `${baseUrl}/wp-json/wp/v2/media`;

  try {
    // Utilisation de la logique de _fetchImageBlob pour gérer les URLs Drive
    const imageBlob = _wpFetchImageBlob(imageUrl);
    if (!imageBlob) {
      throw new Error(`Impossible de récupérer l'image depuis l'URL: ${imageUrl}`);
    }
    imageBlob.setName(filename);

    const options = {
      'method': 'POST',
      'headers': {
        'Authorization': basicAuth,
        'Content-Type': imageBlob.getContentType(),
        'Content-Disposition': 'attachment; filename="' + filename + '"'
      },
      'payload': imageBlob,
      'muteHttpExceptions': true,
    };

    const response = UrlFetchApp.fetch(mediaApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 201) { // 201 Created
      const media = JSON.parse(responseText);
      Logger.log('Image uploaded successfully: ' + media.source_url);

      if (altText) {
        _wpUpdateMediaDetails(media.id, { alt_text: altText }, basicAuth, siteConfig);
      }

      return {
        id: media.id,
        url: media.source_url
      };
    } else {
      Logger.log(`Error uploading image. Code: ${responseCode}. Response: ${responseText}`);
      return null;
    }
  } catch (e) {
    Logger.log(`Exception during image upload: ${e.toString()}`);
    return null;
  }
}

/**
 * Helper function to update media details like alt text.
 * @private
 * @param {number} mediaId The ID of the media item.
 * @param {object} details An object with details to update (e.g., { alt_text: "My text" }).
 * @param {string} basicAuth The pre-encoded basic authentication header.
 */
function _wpUpdateMediaDetails(mediaId, details, basicAuth, siteConfig = null) {
  const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;
  const url = `${baseUrl}/wp-json/wp/v2/media/${mediaId}`;
  const options = {
    'method': 'POST',
    'headers': {
      'Authorization': basicAuth,
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(details),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      Logger.log(`Details updated for media ID ${mediaId}.`);
    } else {
      Logger.log(`Unable to update details for media ID ${mediaId}. Response: ${response.getContentText()}`);
    }
  } catch (e) {
    Logger.log(`Exception updating media ID ${mediaId} details: ${e.toString()}`);
  }
}

/**
 * Récupère le blob d'une image depuis une URL, en gérant plusieurs formats d'URL Google Drive.
 * @private
 * @param {string} url L'URL de l'image.
 * @returns {GoogleAppsScript.Base.Blob|null} Le blob de l'image.
 */
function _wpFetchImageBlob(url) {
  let effectiveUrl = url;
  const fetchOptions = { muteHttpExceptions: true };

  // Regex pour extraire l'ID de différents formats d'URL Google Drive
  const driveFileRegexes = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/, // Format /file/d/ID/...
    /[?&]id=([a-zA-Z0-9-_]+)/      // Format ?id=ID ou &id=ID
  ];

  for (const regex of driveFileRegexes) {
    const match = url.match(regex);
    if (match && match[1]) {
      const imageId = match[1];
      effectiveUrl = `https://drive.google.com/uc?export=download&id=${imageId}`;
      Logger.log(`Google Drive URL detected. Using download URL: ${effectiveUrl}`);
      break; // On a trouvé, on arrête de chercher
    }
  }

  // Ajoute le token d'authentification pour toutes les URLs Google Drive
  if (effectiveUrl.includes("drive.google.com")) {
    fetchOptions.headers = { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() };
  }

  const imageResp = UrlFetchApp.fetch(effectiveUrl, fetchOptions);
  return imageResp.getBlob();
}

/**
 * FONCTION DE TEST: Teste l'upload d'une image vers WordPress.
 */
function test_uploadImageToWordPress() {
  const imageUrlToUpload = "https://drive.google.com/file/d/1kO9XKE7exhjjs_Gdw10iBHxFcu4cQXAr/view"; // Image sur Google Drive
  const filename = "test-cake-from-drive.jpg";
  const altText = "A delicious test cake with chocolate frosting.";

  Logger.log("--- 🧪 Starting WordPress image upload test ---");
  const result = uploadImageToWordPress(imageUrlToUpload, filename, altText);

  if (result && result.id) {
    Logger.log(`--- ✅ SUCCESS --- \nMedia ID: ${result.id}\nURL: ${result.url}`);
  } else {
    Logger.log("--- ❌ FAILED --- Image upload failed. Check logs above.");
  }
}

/**
 * Creates a WordPress post as a draft with a featured image and Rank Math focus keyword.
 *
 * @param {string} title The title of the post.
 * @param {string} content The Markdown content of the post.
 * @param {number} featuredMediaId The ID of the image to set as featured media.
 * @param {string} targetKeyword The target focus keyword for Rank Math.
 * @param {string} [seoTitle] Optional. The SEO title for Rank Math. Defaults to the main title.
 * @param {string} [metaDescription] Optional. The meta description for Rank Math.
 * @param {number} [authorId] Optional. The ID of the post author.
 * @param {number[]} [categoryIds] Optional. An array of category IDs to assign to the post.
 * @param {string} [collageImageUrl] Optional. The URL of a collage image to insert in the middle of the article.
 * @param {string} [status='draft'] Optional. The post status ('draft', 'publish', 'pending'). Defaults to 'draft'.
 * @return {{id: number, link: string}|null} An object containing the new post ID and its public link, or null on error.
 */
function createWordPressPost(title, content, featuredMediaId, targetKeyword, seoTitle, metaDescription, authorId, categoryIds, collageImageUrl, status = 'draft', siteConfig = null) {
  const username = siteConfig ? siteConfig.wpUser : null;
  const password = siteConfig ? siteConfig.wpAppPassword : null;
  const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;

  if (!username || !password) {
    throw new Error("Identifiants WordPress manquants pour la création de l'article (User/App Password).");
  }

  const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);

  // Utilise la route standard de WordPress qui est la plus fiable pour la création
  const postsApiUrl = `${baseUrl}/wp-json/wp/v2/posts`;

  Logger.log(`[DEBUG] WP Account: ${username} | Route: ${postsApiUrl}`);

  let finalContent = content;
  // Insérer l'image de collage au milieu de l'article si elle est fournie
  if (collageImageUrl) {
    Logger.log(`Attempting to insert collage image: ${collageImageUrl}`);
    const paragraphs = finalContent.split('</p>');
    if (paragraphs.length > 2) {
      const middleIndex = Math.floor(paragraphs.length / 2);
      const collageHtml = `<p><img src="${collageImageUrl}" alt="${seoTitle || title}" style="width:100%;height:auto;"/></p>`;
      paragraphs.splice(middleIndex, 0, collageHtml);
      finalContent = paragraphs.join('</p>');
      Logger.log(`Collage inserted at index ${middleIndex} of ${paragraphs.length} paragraphs.`);
    } else {
      // Si trop peu de paragraphes, on l'ajoute simplement avant la fin
      finalContent += `<p><img src="${collageImageUrl}" alt="${seoTitle || title}" style="width:100%;height:auto;"/></p>`;
      Logger.log("Few paragraphs detected, collage added at end of article.");
    }
  }

  const payload = {
    title: title,
    content: finalContent,
    status: status,
    featured_media: featuredMediaId,
    slug: _generateSlug(targetKeyword),
    excerpt: metaDescription || '', // Use meta description for the excerpt
    meta: {
      // Rank Math specific fields
      rank_math_focus_keyword: targetKeyword.toLowerCase(),
      rank_math_title: seoTitle || title, // Use seoTitle if provided, otherwise default to post title
      rank_math_description: metaDescription || ''
    },
  };

  if (authorId) {
    payload.author = authorId;
  }

  if (categoryIds && categoryIds.length > 0) {
    payload.categories = categoryIds;
  }

  const options = {
    'method': 'POST',
    'headers': {
      'Authorization': basicAuth,
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
  };

  try {
    const response = UrlFetchApp.fetch(postsApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    Logger.log(`WordPress Response - Code: ${responseCode}`);

    if (responseCode === 201) { // Standard WP Created
      const post = JSON.parse(responseText);
      Logger.log(`Post created successfully. ID: ${post.id}, Status: ${post.status}`);
      const editLink = `${baseUrl}/wp-admin/post.php?post=${post.id}&action=edit`;

      return {
        id: post.id,
        link: post.link, // URL publique
        edit_link: editLink // URL de modification dans l'admin
      };
    } else {
      Logger.log(`Error creating post. Code: ${responseCode}. Response: ${responseText}`);
      return null;
    }
  } catch (e) {
    Logger.log(`Exception during post creation: ${e.toString()}`);
    return null;
  }
}

/**
 * Updates the content of an existing WordPress post, including Title and Meta (Rank Math).
 *
 * @param {number|string} postId The ID of the post to update.
 * @param {string} newContent The new HTML content for the post.
 * @param {object|null} siteConfig Configuration object.
 * @param {string|null} newTitle Optional new title.
 * @param {object|null} newMeta Optional meta fields (e.g. rank_math_focus_keyword).
 * @returns {boolean} True if the update was successful, false otherwise.
 */
function updateWordPressPostContent(postId, newContent, siteConfig = null, newTitle = null, newMeta = null) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const username = siteConfig ? siteConfig.wpUser : scriptProperties.getProperty('WORDPRESS_USER');
  const password = siteConfig ? siteConfig.wpAppPassword : scriptProperties.getProperty('WORDPRESS_APP_PASSWORD');

  if (!username || !password) {
    throw new Error("Identifiants WordPress manquants pour la mise à jour (User/App Password).");
  }

  const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
  const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;
  const postApiUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;

  const payload = {
    content: newContent,
  };

  // Ajout du Titre si fourni
  if (newTitle) {
    payload.title = newTitle;
  }

  // Ajout des Métas (Rank Math / Yoast) si fournis
  if (newMeta) {
    payload.meta = newMeta;
  }

  const options = {
    'method': 'POST',
    'headers': {
      'Authorization': basicAuth,
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
  };

  try {
    const response = UrlFetchApp.fetch(postApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`Post ID ${postId} content updated successfully (SEO Sync).`);
      return true;
    } else {
      Logger.log(`Update Post ID ${postId} error. Code: ${responseCode}. Response: ${responseText}`);
      return false;
    }
  } catch (e) {
    Logger.log(`Exception Update Post ID ${postId}: ${e.toString()}`);
    return false;
  }
}

/**
 * Retrieves the content of a specific WordPress post.
 *
 * @param {number|string} postId The ID of the post to retrieve.
 * @returns {string|null} The HTML content of the post, or null on error.
 */
function getWordPressPostContent(postId, siteConfig = null) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const username = siteConfig ? siteConfig.wpUser : scriptProperties.getProperty('WORDPRESS_USER');
  const password = siteConfig ? siteConfig.wpAppPassword : scriptProperties.getProperty('WORDPRESS_APP_PASSWORD');

  if (!username || !password) {
    throw new Error("Identifiants WordPress manquants pour la lecture (User/App Password).");
  }

  const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
  const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;
  // On ne demande que le champ "content" pour optimiser la requête
  const postApiUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}?_fields=content`;

  const options = {
    'method': 'GET',
    'headers': { 'Authorization': basicAuth },
    'muteHttpExceptions': true,
  };

  try {
    const response = UrlFetchApp.fetch(postApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      const post = JSON.parse(responseText);
      return post.content.rendered;
    } else {
      Logger.log(`Error fetching post ID ${postId}. Code: ${responseCode}. Response: ${responseText}`);
      return null;
    }
  } catch (e) {
    Logger.log(`Exception fetching post ID ${postId}: ${e.toString()}`);
    return null;
  }
}
/**
 * Updates the status of an existing WordPress post.
 *
 * @param {number} postId The ID of the post to update.
 * @param {string} newStatus The new status (e.g., 'publish').
 * @returns {{id: number, link: string, edit_link: string}|null} The updated post object, or null on error.
 */
function updateWordPressPostStatus(postId, newStatus, siteConfig = null) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const username = siteConfig ? siteConfig.wpUser : scriptProperties.getProperty('WORDPRESS_USER');
  const password = siteConfig ? siteConfig.wpAppPassword : scriptProperties.getProperty('WORDPRESS_APP_PASSWORD');

  if (!username || !password) {
    throw new Error("Identifiants WordPress manquants pour le statut (User/App Password).");
  }

  const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
  const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;
  const postApiUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;

  const payload = {
    status: newStatus,
  };

  const options = {
    'method': 'POST', // Using POST to update
    'headers': {
      'Authorization': basicAuth,
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
  };

  const response = UrlFetchApp.fetch(postApiUrl, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode === 200) { // 200 OK for updates
    const post = JSON.parse(responseText);
    Logger.log(`Post ID ${postId} updated with status "${newStatus}". New link: ${post.link}`);
    return post; // Retourne l'objet post complet
  } else {
    Logger.log(`Error updating post ID ${postId}. Code: ${responseCode}. Response: ${responseText}`);
    return null;
  }
}
/**
 * Retrieves all categories from the WordPress site.
 * @private
 * @param {string} basicAuth The pre-encoded basic authentication header.
 * @returns {Array<{id: number, name: string}>|null} A simplified list of categories or null.
 */
function _getWordPressCategories(basicAuth, siteConfig = null) {
  // We fetch up to 100 categories, which should be enough for most blogs.
  // The 'fields' parameter limits the returned data to what we need.
  const baseUrl = siteConfig ? siteConfig.wpBaseUrl : CONFIG.WORDPRESS_BASE_URL;
  const url = `${baseUrl}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`;
  const options = {
    'method': 'GET',
    'headers': { 'Authorization': basicAuth },
    'muteHttpExceptions': true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const categories = JSON.parse(response.getContentText());
      Logger.log(`Retrieved ${categories.length} WordPress categories.`);
      return categories; // Returns an array of {id, name}
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Generates a URL-friendly slug from a string.
 * @private
 * @param {string} text The text to convert.
 * @return {string} The generated slug.
 */
function _generateSlug(text) {
  if (!text) return '';
  return text.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux sauf les espaces et les tirets
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-'); // Remplace les tirets multiples par un seul
}

/**
 * Récupère toutes les URLs d'un sitemap XML.
 * @private
 * @param {string} sitemapUrl L'URL du fichier sitemap.xml.
 * @returns {string[]} Un tableau d'URLs.
 */
function _getSitemapUrls(sitemapUrl) {
  try {
    const xml = UrlFetchApp.fetch(sitemapUrl).getContentText();
    const document = XmlService.parse(xml);
    const root = document.getRootElement();
    const namespace = XmlService.getNamespace('http://www.sitemaps.org/schemas/sitemap/0.9');
    const urls = root.getChildren('url', namespace).map(urlElement => {
      return urlElement.getChild('loc', namespace).getText();
    });
    Logger.log(`Found ${urls.length} URLs in sitemap.`);
    return urls;
  } catch (e) {
    Logger.log(`Unable to fetch or parse sitemap: ${e.toString()}`);
    return [];
  }
}


/**
 * FONCTION DE TEST: Crée un article de blog en brouillon en uploadant d'abord une image réelle.
 */
function test_createWordPressPost() {
  Logger.log("--- 🧪 Starting WordPress post creation test (with real image upload) ---");

  // --- Étape 1: Upload de l'image ---
  const imageUrlToUpload = "https://drive.google.com/file/d/1kO9XKE7exhjjs_Gdw10iBHxFcu4cQXAr/view";
  const filename = `test-post-image-${new Date().getTime()}.jpg`; // Nom de fichier unique
  const altText = "A delicious test cake with chocolate frosting, uploaded for a test post.";

  Logger.log("Étape 1: Upload de l'image...");
  const imageUploadResult = uploadImageToWordPress(imageUrlToUpload, filename, altText);

  if (!imageUploadResult || !imageUploadResult.id) {
    Logger.log("--- ❌ FAILED --- Image upload failed. Stopping post creation test.");
    return;
  }
  Logger.log(`Image uploaded successfully. ID: ${imageUploadResult.id}`);

  // --- Étape 2: Création du post avec l'ID de l'image ---
  const postTitle = "My Test Post from Google Apps Script";
  const postContent = "## This is a heading\n\nThis is a test paragraph for the post created via GAS. It includes **bold** text.";
  const focusKeyword = "test post";
  const seoTitleForTest = "My Awesome SEO Title for the Test Post | Rank Math";
  const metaDescriptionForTest = "This is a super optimized meta description for the test post created from Google Apps Script, perfect for SEO.";
  const authorIdForTest = 2; // ID pour "Chef Savvy"

  Logger.log("Step 2: Creating WordPress post...");
  const result = createWordPressPost(postTitle, postContent, imageUploadResult.id, focusKeyword, seoTitleForTest, metaDescriptionForTest, authorIdForTest, [], null, 'draft');

  if (result && result.id) {
    Logger.log(`--- ✅ SUCCÈS --- \nPost ID: ${result.id}\nLink: ${result.link}`);
  } else {
    Logger.log("--- ❌ FAILED --- Post creation failed. Check logs above.");
  }
}

/**
 * FONCTION DE TEST D'INTÉGRATION: Simule le processus complet de création d'un article WordPress,
 * de la génération de contenu à la publication en brouillon.
 */
function test_fullWordPressArticleCreationProcess() {
  Logger.log("--- 🧪 Starting full WordPress integration test ---");
  const allCosts = [];
  let totalInputWords = 0;
  let totalOutputWords = 0;

  // --- 1. Définition des entrées (Inputs) ---
  const targetKeyword = "Easy Homemade Pizza Dough"; // Le mot-clé principal pour le SEO
  const recipeContent = "A simple recipe for a classic pizza dough that's perfect for beginners. Ingredients: flour, water, yeast, salt, sugar, olive oil."; // Le contenu de base pour le contexte
  const imageUrl = "https://drive.google.com/open?id=15oAiGRIYEDRZpAlASlSTa5X0rPGtW7v5&usp=drive_copy"; // L'image source à uploader
  const postTitle = "The Only Homemade Pizza Dough Recipe You'll Ever Need"; // Le titre H1 de l'article
  const authorId = 2; // L'ID de l'auteur WordPress (ex: 2 pour "Chef Savvy")

  try {
    // --- 2. Génération du plan et des mots-clés (Outline) ---
    Logger.log("Step 1: Generating article outline...");
    const outlineResult = generateWordPressOutline(targetKeyword, recipeContent);
    if (!outlineResult || !outlineResult.data.outline_markdown) {
      throw new Error("Échec de la génération du plan (content brief).");
    }
    const contentBrief = outlineResult.data;
    const outlineInputWords = _countWords(recipeContent);
    const outlineOutputWords = _countWords(contentBrief.outline_markdown);
    totalInputWords += outlineInputWords;
    totalOutputWords += outlineOutputWords;
    const outlineCosts = calculateCost("gemini-2.5-pro", outlineResult.usage);
    allCosts.push({ name: "generateWordPressOutline", usage: outlineResult.usage, costs: outlineCosts });
    logCostSummary("generateWordPressOutline", "gemini-2.5-pro", outlineResult.usage, outlineCosts, outlineInputWords, outlineOutputWords);

    // --- 3. Génération de l'article complet ---
    Logger.log("Step 2: Writing HTML article...");
    const articleResult = generateWordPressArticle(targetKeyword, contentBrief.outline_markdown, contentBrief.lsi_keywords);
    if (!articleResult || !articleResult.data) {
      throw new Error("Échec de la génération de l'article HTML.");
    }
    let articleHtml = articleResult.data;
    const articleInputWords = _countWords(contentBrief.outline_markdown);
    const articleOutputWords = _countWords(articleHtml);
    totalInputWords += articleInputWords;
    totalOutputWords += articleOutputWords;
    const articleCosts = calculateCost("gemini-2.5-flash", articleResult.usage);
    allCosts.push({ name: "generateWordPressArticle", usage: articleResult.usage, costs: articleCosts });
    logCostSummary("generateWordPressArticle", "gemini-2.5-flash", articleResult.usage, articleCosts, articleInputWords, articleOutputWords);

    // --- 4. Ajout du maillage interne ---
    Logger.log("Étape 3: Ajout du maillage interne...");
    const sitemapUrl = "https://simplebitesrecipes.com/post-sitemap.xml";
    const internalUrls = _getSitemapUrls(sitemapUrl);
    if (internalUrls.length > 0) {
      const internalLinksResult = addInternalLinks(articleHtml, targetKeyword, internalUrls);
      if (internalLinksResult && internalLinksResult.data) {
        const internalLinksInputWords = _countWords(articleHtml);
        totalInputWords += internalLinksInputWords;
        articleHtml = internalLinksResult.data;
        const internalLinksOutputWords = _countWords(articleHtml);
        totalOutputWords += internalLinksOutputWords;
        const internalLinksCosts = calculateCost("gemini-2.5-flash", internalLinksResult.usage);
        allCosts.push({ name: "addInternalLinks", usage: internalLinksResult.usage, costs: internalLinksCosts });
        logCostSummary("addInternalLinks", "gemini-2.5-flash", internalLinksResult.usage, internalLinksCosts, internalLinksInputWords, internalLinksOutputWords);
      }
    } else {
      Logger.log("Warning: No internal links could be added (sitemap empty or inaccessible).");
    }

    // --- 5. Créer et uploader l'image de collage pour le corps de l'article ---
    Logger.log("Step 4: Creating collage image...");
    const collageOutputName = `${_generateSlug(targetKeyword)}-collage-${new Date().getTime()}`;
    const collageDriveUrl = createCollageImageFromTemplate(imageUrl, collageOutputName);
    if (!collageDriveUrl) {
      throw new Error("Échec de la création de l'image de collage via Google Slides.");
    }
    Logger.log("Étape 5: Upload de l'image de collage sur WordPress...");
    const collageImageFilename = `${collageOutputName}.png`;
    const collageImageAltText = `${contentBrief.seoTitle} - collage`;
    const collageUploadResult = uploadImageToWordPress(collageDriveUrl, collageImageFilename, collageImageAltText);
    if (!collageUploadResult || !collageUploadResult.id) {
      throw new Error("Échec de l'upload de l'image de collage sur WordPress.");
    }
    const finalCollageUrl = collageUploadResult.url; // URL de l'image de collage sur WordPress

    // --- 6. Choisir la catégorie ---
    Logger.log("Step 6: Choosing article category...");
    const scriptProperties = PropertiesService.getScriptProperties();
    const username = scriptProperties.getProperty('WORDPRESS_USER');
    const password = scriptProperties.getProperty('WORDPRESS_APP_PASSWORD');
    const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
    const availableCategories = _getWordPressCategories(basicAuth);
    let chosenCategoryId = null;
    if (availableCategories) {
      const categoryResult = getBestCategoryId(targetKeyword, availableCategories);
      if (categoryResult && categoryResult.data) {
        chosenCategoryId = categoryResult.data;
      }
      const categoryCosts = calculateCost("gemini-2.5-flash", categoryResult.usage);
      allCosts.push({ name: "getBestCategoryId", usage: categoryResult.usage, costs: categoryCosts });
      // Pour cette étape, le nombre de mots n'est pas très significatif, on ne l'affiche pas.
      logCostSummary("getBestCategoryId", "gemini-2.5-flash", categoryResult.usage, categoryCosts);
    }
    const categoryIds = chosenCategoryId ? [chosenCategoryId] : [];

    // --- 7. Ajout du lien Facebook en bas de l'article ---
    Logger.log("Étape 7: Ajout du lien Facebook...");
    const facebookLinkHtml = `
      <hr>
      <p style="text-align:center;font-size:1.1em;">
        <strong>For more daily recipes and tips, follow us on Facebook!</strong><br>
        <a href="https://www.facebook.com/profile.php?id=61568538666337" target="_blank" rel="noopener noreferrer">Click here to join our community!</a>
      </p>`;
    articleHtml += facebookLinkHtml;

    // --- 8. Upload de l'image principale (Featured Image) ---
    Logger.log("Étape 8: Upload de l'image principale...");
    const imageFilename = `${_generateSlug(targetKeyword)}-featured-image-${new Date().getTime()}.jpg`; // Nom de fichier unique
    const imageAltText = contentBrief.seoTitle; // Utiliser le titre SEO comme texte alternatif pour l'image
    const imageUploadResult = uploadImageToWordPress(imageUrl, imageFilename, imageAltText);
    if (!imageUploadResult || !imageUploadResult.id) {
      throw new Error("Échec de l'upload de l'image sur WordPress.");
    }
    Logger.log(`Image uploaded successfully. ID: ${imageUploadResult.id}`);

    // --- 9. Création du post en brouillon ---
    Logger.log("Step 9: Creating post...");
    const postResult = createWordPressPost(
      postTitle,
      articleHtml,
      imageUploadResult.id,
      targetKeyword,
      contentBrief.seoTitle, // Utilisation des données générées
      contentBrief.metaDescription, // Utilisation des données générées
      authorId,
      categoryIds,
      finalCollageUrl, // URL de l'image de collage à insérer
      'draft' // On spécifie 'draft' pour le test
    );

    if (postResult && postResult.id) {
      Logger.log(`--- ✅ SUCCÈS FINAL --- \nPost ID: ${postResult.id}\nLink: ${postResult.link}`);
      logFinalTotalCost(allCosts, totalInputWords, totalOutputWords); // Affiche le résumé final des coûts
    } else {
      throw new Error("La création finale du post a échoué.");
    }
  } catch (e) {
    Logger.log(`--- ❌ ÉCHEC DU PROCESSUS --- \nErreur: ${e.message}`);
    logFinalTotalCost(allCosts, totalInputWords, totalOutputWords); // Affiche les coûts même en cas d'échec partiel
  }
}

/**
 * Compte le nombre de mots dans une chaîne de caractères, en retirant les balises HTML.
 * @private
 * @param {string} text Le texte à analyser.
 * @returns {number} Le nombre de mots.
 */
function _countWords(text) {
  if (!text) return 0;
  return text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
}

/**
 * FONCTION DE TEST CIBLÉ: Poste un article avec du code HTML en dur
 * pour vérifier rapidement que le formatage HTML s'affiche correctement sur le blog.
 */
function test_articleHtmlDisplay() {
  Logger.log("--- 🧪 Lancement du test d'affichage HTML sur WordPress ---");

  try {
    // 1. Définir un contenu HTML simple en dur (hardcoded)
    const articleHtml = `
      <h2>Titre de Section (H2)</h2>
      <p>Ceci est un paragraphe de texte normal. Il devrait s'afficher correctement.</p>
      <p>Ce paragraphe contient du texte en <strong>gras (strong)</strong> et en <em>italique (em)</em>.</p>
      <h3>Sous-titre (H3)</h3>
      <ul>
        <li>Élément de liste à puces 1</li>
        <li>Élément de liste à puces 2</li>
      </ul>
      <blockquote>Ceci est un bloc de citation (blockquote), parfait pour une astuce de chef.</blockquote>
    `;
    Logger.log("HTML content set.");

    // 2. Créer le post en brouillon avec ce contenu
    const postTitle = "Test d'affichage HTML simple";
    const realImageId = 2523; // ID d'une image réelle pour le test
    const authorId = 2;

    Logger.log("Creating draft post on WordPress...");
    const postResult = createWordPressPost(postTitle, articleHtml, realImageId, "test html", "Titre SEO Test", "Meta description test", authorId, [], null, 'draft');

    if (postResult && postResult.id) {
      Logger.log(`--- ✅ SUCCÈS ---`);
      Logger.log(`Post created as draft. Check the display here: ${CONFIG.WORDPRESS_BASE_URL}/wp-admin/post.php?post=${postResult.id}&action=edit`);
    } else {
      throw new Error("La création du post en brouillon a échoué.");
    }
  } catch (e) {
    Logger.log(`--- ❌ ÉCHEC DU TEST --- \nErreur: ${e.message}`);
  }
}

/**
 * FONCTION DE TEST: Teste le processus de nettoyage des liens sur un article spécifique.
 * Elle récupère le contenu, le nettoie, et affiche le résultat dans les logs sans le sauvegarder.
 */
function test_cleanupArticleLinks() {
  const editUrl = "https://simplebitesrecipes.com/wp-admin/post.php?post=2731&action=edit";
  Logger.log(`--- 🧪 Lancement du test de nettoyage de liens pour l'URL: ${editUrl} ---`);

  try {
    // 1. Extraire l'ID du post
    const postIdMatch = editUrl.match(/post=(\d+)/);
    if (!postIdMatch || !postIdMatch[1]) {
      throw new Error("Impossible d'extraire l'ID du post depuis l'URL.");
    }
    const postId = postIdMatch[1];
    Logger.log(`Post ID extrait: ${postId}`);

    // 2. Récupérer le contenu de l'article
    const originalContent = getWordPressPostContent(postId);
    if (originalContent === null) throw new Error("Impossible de récupérer le contenu de l'article.");

    // 3. Nettoyer le contenu
    Logger.log("--- Nettoyage des liens en cours... ---");
    const cleanedContent = cleanupInternalLinks(originalContent);
    Logger.log(`--- ✅ SUCCESS --- Cleanup process complete. Check logs above to see kept/removed links.`);
  } catch (e) {
    Logger.log(`--- ❌ ÉCHEC DU TEST --- \nErreur: ${e.message}`);
  }
}

/**
 * FONCTION DE TEST: Teste la fonction de classification de catégorie en utilisant les vraies catégories du blog.
 */
function test_getBestCategoryId() {
  Logger.log("--- 🧪 Starting category selection test with real data ---");

  try {
    // 1. Récupérer les vraies catégories du blog
    const scriptProperties = PropertiesService.getScriptProperties();
    const username = scriptProperties.getProperty('WORDPRESS_USER');
    const password = scriptProperties.getProperty('WORDPRESS_APP_PASSWORD');
    if (!username || !password) {
      throw new Error("WORDPRESS_USER ou WORDPRESS_APP_PASSWORD ne sont pas définis.");
    }
    const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
    const realCategories = _getWordPressCategories(basicAuth);

    if (!realCategories || realCategories.length === 0) {
      throw new Error("Impossible de récupérer les catégories depuis WordPress, ou aucune catégorie n'a été trouvée.");
    }

    // 2. Définir un mot-clé de test
    const testKeyword = "Healthy Chicken Salad Recipe";
    Logger.log(`Test keyword: "${testKeyword}"`);
    Logger.log(`Real categories found: ${realCategories.length}`);

    // 3. Appel de la fonction à tester
    const categoryResult = getBestCategoryId(testKeyword, realCategories);

    // 4. Vérification du résultat
    if (categoryResult && categoryResult.data) {
      const chosenCategory = realCategories.find(cat => cat.id === categoryResult.data);
      Logger.log(`--- ✅ SUCCÈS ---`);
      Logger.log(`AI chose category ID: ${categoryResult.data} (${chosenCategory ? `"${chosenCategory.name}"` : 'Unknown'})`);
    } else {
      throw new Error("L'IA n'a retourné aucun ID de catégorie.");
    }
  } catch (e) {
    Logger.log(`--- ❌ ÉCHEC DU TEST --- \nErreur: ${e.message}`);
  }
}