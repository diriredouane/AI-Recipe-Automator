/**
 * @fileoverview Fichier de configuration central pour le projet d'automatisation Pinterest.
 * NE PAS stocker de clés d'API ou de secrets ici. Utilisez les Propriétés du script.
 */

const CONFIG = {
  // Folder ID for the Master Documentation to be copied during install
  MASTER_DOC_FOLDER_ID: '1QMIHEkkNkAOYSIRcgU2ipKPfENLkolRx', // Folder: 📚 Documentation

  // --- Configuration Google Sheet ---
  // SHEET_NAME n'est plus utilisé directement. On utilise "Data-{SiteName}" généré dynamiquement.
  TRIGGER_COLUMN_INDEX: 1, // Colonne A pour le déclencheur
  STATUS_COLUMN_INDEX: 2, // Colonne B pour le statut
  RECIPE_TITLE_COLUMN_INDEX: 3, // Colonne C
  PHOTO_URL_COLUMN_INDEX: 4, // Colonne D
  SOURCE_NAME_COLUMN_INDEX: 5, // Colonne E
  SOURCE_POST_LINK_COLUMN_INDEX: 6, // Colonne F
  WP_EDIT_URL_COLUMN_INDEX: 7, // Colonne G - Lien de modification
  WP_PUBLIC_URL_COLUMN_INDEX: 8, // Colonne H - Lien public final
  PIN_IMAGE_URL_COLUMN_INDEX: 9, // Colonne I
  PIN_ID_COLUMN_INDEX: 10, // Colonne J
  BOARD_ID_COLUMN_INDEX: 11, // Colonne K
  PIN_URL_COLUMN_INDEX: 12, // Colonne L
  ERROR_COLUMN_INDEX: 13, // Colonne M
  IMAGE_TO_TEXT_COLUMN_INDEX: 14, // Colonne N
  PUBLICATION_DATE_COLUMN_INDEX: 16, // Colonne P
  TOTAL_COST_COLUMN_INDEX: 18, // Colonne R
  PUBLISHED_BOARD_NAME_COLUMN_INDEX: 19, // Colonne S
  PINTEREST_TITLE_COLUMN_INDEX: 20, // Colonne T
  IMAGE_TITLE_COLUMN_INDEX: 21, // Colonne U
  PINTEREST_DESCRIPTION_COLUMN_INDEX: 22, // Colonne V
  TRIGGER_PIN_LINK_TEXT: "PIN_LINK",
  TRIGGER_PIN_TEXT: "PIN",
  TRIGGER_DRAFT_TEXT: "DRAFT",
  TRIGGER_TEXT: "OK",
  TRIGGER_UPDATE_TEXT: "UPDATE_ARTICLE",
  TRIGGER_ADD_CARD_TEXT: "ADD_CARD",
  TRIGGER_AUTOMATION_TEXT: "AUTO", // Déclencheur interne pour l'automatisation
  // Noms des en-têtes pour la feuille "Recipes". L'ordre DOIT correspondre aux index ci-dessus.
  SHEET_HEADERS: [
    'trigger', 'status', 'recipe_title', 'photo_url',
    'source_name', 'source_post_link',
    'wordpress_edit_url', 'wordpress_public_url', 'pin_image_url',
    'pin_id', 'board_id', 'pin_url', 'error_message',
    'image_to_text_result', 'title_char_count', 'publication_date', '', 'cost_details', 'published_board_name',
    'pinterest_title', 'image_title', 'pinterest_description'
  ],

  // --- Configuration Config_Accounts ---
  ACCOUNTS_HEADERS: [
    "Site Name",
    "Active",
    "WP Base URL",
    "WP Recipe API",
    "WP User",
    "WP App Password",
    "WP Author ID",
    "Facebook URL",
    "Sitemap URL",
    "Pabbly Main Webhook",
    "Pabbly List Webhook",
    "Pabbly Board Info Webhook",
    "Pin Slide Template ID",
    "Collage Slide Template ID",
    "Drive Export Folder ID",
    "Max Posts / Day",
    "Daily Counter",
    "Last Reset Date",
    "WP Featured Image Template ID"
  ],

  // --- Configuration des Services Externes ---
  // Note: Les endpoints spécifiques sont maintenant gérés via Config_Accounts (AccountHelper.js)
  GEMINI_API_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent", // Modèle puissant avec Tools & Structured Outputs
  GEMINI_FLASH_API_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", // Modèle rapide Stable (v2.5)

  // --- UI Settings ---
  HIDE_PROJECT_MGMT_MENU: true, // Set to false to show the Project MGMT menu
  HIDE_AUDIT_MENU: true, // Set to false to show the Audit menu
  HIDE_INIT_CONFIG_MENU: true // Set to false to show Initialize Multi-Account Config
};

/**
 * Utilité pour trouver l'index d'une colonne par son nom d'en-tête.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet La feuille à scanner.
 * @param {string} headerName Le nom de l'en-tête recherché.
 * @returns {number} L'index de la colonne (1-based), ou -1 si non trouvé.
 */
function getColumnIndexByHeader(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf(headerName);
  return index !== -1 ? index + 1 : -1;
}