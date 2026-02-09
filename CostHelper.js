/**
 * @fileoverview Gère le calcul des coûts liés à l'utilisation de l'API Gemini.
 */

const GEMINI_PRICING_PER_MILLION_TOKENS = {
  "gemini-2.5-pro": {
    input: 1.25,  // Prix en USD pour 1 million de tokens en entrée
    output: 10.00 // Prix en USD pour 1 million de tokens en sortie
  },
  "gemini-2.5-flash": {
    input: 0.30, // Prix en USD pour 1 million de tokens en entrée
    output: 2.50 // Prix en USD pour 1 million de tokens en sortie
  }
};

/**
 * Calcule le coût d'un appel API basé sur l'utilisation des tokens.
 * @param {string} modelName Le nom du modèle utilisé (ex: "gemini-2.5-pro").
 * @param {object} usageMetadata L'objet usageMetadata retourné par l'API Gemini.
 * @returns {{inputCost: number, outputCost: number, totalCost: number}} Un objet avec les coûts calculés.
 */
function calculateCost(modelName, usageMetadata) {
  const pricing = GEMINI_PRICING_PER_MILLION_TOKENS[modelName];
  if (!pricing) {
    return { inputCost: 0, outputCost: 0, totalCost: 0 };
  }

  const inputTokens = usageMetadata.promptTokenCount || 0;
  const outputTokens = usageMetadata.candidatesTokenCount || 0;

  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return { inputCost, outputCost, totalCost };
}

/**
 * Formate et affiche un résumé des coûts pour un appel API.
 * @param {string} functionName Le nom de la fonction qui a fait l'appel.
 * @param {string} modelName Le nom du modèle utilisé.
 * @param {object} usageMetadata L'objet usageMetadata de l'API.
 * @param {{inputCost: number, outputCost: number, totalCost: number}} costs L'objet contenant les coûts.
 * @param {number} [inputWordCount=0] Le nombre de mots en entrée (optionnel).
 * @param {number} [outputWordCount=0] Le nombre de mots générés en sortie (optionnel).
 */
function logCostSummary(functionName, modelName, usageMetadata, costs, inputWordCount = 0, outputWordCount = 0) {
  const inputTokens = usageMetadata.promptTokenCount || 0;
  const outputTokens = usageMetadata.candidatesTokenCount || 0;
  const totalTokens = inputTokens + outputTokens; // Calculer le total manuellement pour être exact.

  let wordSummary = '';
  if (outputWordCount > 0) {
    wordSummary = `
    Mots (Entrée):    ~${inputWordCount}
    Mots (Sortie):    ~${outputWordCount}
    Mots (Total):     ~${inputWordCount + outputWordCount}`;
  }
  Logger.log(`
    --- Résumé des Coûts pour: ${functionName} ---
    Modèle Utilisé: ${modelName}
    ${wordSummary}
    Tokens (Entrée): ${inputTokens}
    Tokens (Sortie):  ${outputTokens}
    Tokens (Total):   ${totalTokens}
    -------------------------------------------------
    Coût (Entrée): $${costs.inputCost.toFixed(6)}
    Coût (Sortie):  $${costs.outputCost.toFixed(6)}
    Coût (Total):   $${costs.totalCost.toFixed(6)}
    -------------------------------------------------
  `);
}

/**
 * Formate et affiche le résumé final des coûts pour l'ensemble du processus.
 * @param {Array} allCosts Un tableau contenant les objets de coût de chaque étape.
 * @param {number} [inputWords=0] Le nombre total de mots en entrée.
 * @param {number} [outputWords=0] Le nombre total de mots en sortie.
 */
function logFinalTotalCost(allCosts, inputWords = 0, outputWords = 0) {
  const total = allCosts.reduce((acc, cost) => {
    acc.inputTokens += cost.usage.promptTokenCount || 0;
    acc.outputTokens += cost.usage.candidatesTokenCount || 0;
    acc.totalTokens += cost.usage.totalTokenCount || 0;
    acc.inputCost += cost.costs.inputCost || 0;
    acc.outputCost += cost.costs.outputCost || 0;
    acc.totalCost += cost.costs.totalCost || 0;
    return acc;
  }, { inputTokens: 0, outputTokens: 0, totalTokens: 0, inputCost: 0, outputCost: 0, totalCost: 0 });

  Logger.log(`
    =================================================
    ===          COÛT TOTAL DU PROCESSUS          ===
    =================================================
    Mots (Entrée Total): ~${inputWords}
    Mots (Sortie Total):  ~${outputWords}
    Mots (Total Global):   ~${inputWords + outputWords}
    -------------------------------------------------
    Tokens (Entrée Total): ${total.inputTokens}
    Tokens (Sortie Total):  ${total.outputTokens}
    Tokens (Total Global):   ${total.totalTokens}
    -------------------------------------------------
    Coût (Entrée Total): $${total.inputCost.toFixed(6)}
    Coût (Sortie Total):  $${total.outputCost.toFixed(6)}
    Coût (Total Global):   $${total.totalCost.toFixed(6)}
    =================================================
  `);
}