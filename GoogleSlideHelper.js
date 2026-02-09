/**
 * @fileoverview Gère la création d'images de Pin en utilisant un template Google Slides.
 */

/**
 * Crée une image de Pin en dupliquant un template, en remplaçant les placeholders,
 * et en exportant le résultat en PNG.
 * @param {string} newImageUrl L'URL de l'image générée par Replicate.
 * @param {string} newTitle Le texte à insérer dans le placeholder "Titre" du template.
 * @param {string} outputFileName Le nom de fichier souhaité pour l'image PNG exportée.
 * @param {object} [siteConfig=null] Optional. Configuration spécifique au site.
 * @returns {{viewUrl: string, downloadUrl: string}|null} Un objet avec les URLs de l'image, ou null en cas d'erreur.
 */
function createImageFromTemplate(newImageUrl, newTitle, outputFileName, siteConfig = null) {
  let tempSlideFileId = null;
  try {
    // --- ÉTAPE 1: Télécharger le blob de l'image ---
    const imageBlob = _fetchImageBlob(newImageUrl);
    if (!imageBlob) {
      throw new Error("Impossible d'obtenir le blob de l'image source.");
    }

    // --- ÉTAPE 2: Dupliquer la présentation template ---
    const templateId = siteConfig ? siteConfig.slideTemplateId : CONFIG.SLIDE_TEMPLATE_ID;
    const templateFile = DriveApp.getFileById(templateId);
    const copyName = `Temp-Pin - ${newTitle} - ${new Date().toISOString()}`;
    const tempSlideFile = templateFile.makeCopy(copyName);
    tempSlideFileId = tempSlideFile.getId();

    // --- ÉTAPE 3: Remplacer les placeholders dans la copie ---
    const presentation = SlidesApp.openById(tempSlideFileId);
    const slide = presentation.getSlides()[0];

    slide.getPageElements().forEach(element => {
      const description = element.getDescription() ? element.getDescription().trim() : "";
      if (description === 'image principale' && element.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
        element.asImage().replace(imageBlob, true);
        Logger.log("✅ 'Main image' replaced.");
      } else if (description === 'Titre' && element.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
        element.asShape().getText().setText(newTitle);
        Logger.log("✅ 'Title' text replaced.");
      }
    });

    presentation.saveAndClose();

    // --- ÉTAPE 4: Exporter la slide en PNG ---
    const exportUrl = `https://docs.google.com/presentation/d/${tempSlideFileId}/export/png?pageid=${slide.getObjectId()}&dpi=150`;
    const oauthToken = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(exportUrl, { headers: { Authorization: 'Bearer ' + oauthToken } });

    if (response.getResponseCode() !== 200) {
      throw new Error(`Échec de l'exportation de l'image. Code: ${response.getResponseCode()}`);
    }

    // --- ÉTAPE 5: Sauvegarder l'image finale dans le dossier de destination ---
    const fileName = outputFileName ? `${outputFileName}.png` : `Slide-Image-${new Date().getTime()}.png`;
    const finalImageBlob = response.getBlob().setName(fileName);
    const destinationFolderId = siteConfig ? siteConfig.driveFolderId : null;
    if (!destinationFolderId) throw new Error("Aucun dossier de destination configuré. Veuillez remplir 'Drive Export Folder ID' dans Config_Accounts.");
    const destinationFolder = DriveApp.getFolderById(destinationFolderId);
    const finalImageFile = destinationFolder.createFile(finalImageBlob);
    finalImageFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Construire et retourner l'URL de téléchargement direct
    const fileId = finalImageFile.getId();
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    Logger.log(`Final image saved. Preview URL: ${viewUrl}`);
    return { viewUrl, downloadUrl };

  } catch (e) {
    Logger.log(`Error in createImageFromTemplate: ${e.message}\n${e.stack}`);
    return null;
  } finally {
    // --- ÉTAPE 6: Nettoyage ---
    if (tempSlideFileId) {
      DriveApp.getFileById(tempSlideFileId).setTrashed(true);
      Logger.log(`Temporary slide file (ID: ${tempSlideFileId}) deleted.`);
    }
  }
}

/**
 * Crée une image de collage en utilisant un template à 2 images.
 * La même image source est utilisée pour remplir les deux placeholders.
 *
 * @param {string} sourceImageUrl L'URL de l'image à utiliser.
 * @param {string} outputFileName Le nom de fichier souhaité pour l'image exportée.
 * @param {object} [siteConfig=null] Optional. Configuration spécifique au site.
 * @returns {{viewUrl: string, downloadUrl: string}|null} Un objet avec les URLs de l'image, ou null en cas d'erreur.
 */
function createCollageImageFromTemplate(sourceImageUrl, outputFileName, siteConfig = null) {
  let tempSlideFileId = null;
  try {
    // --- ÉTAPE 1: Télécharger le blob de l'image source ---
    const imageBlob = _fetchImageBlob(sourceImageUrl);
    if (!imageBlob) {
      throw new Error("Impossible d'obtenir le blob de l'image source pour le collage.");
    }

    // --- ÉTAPE 2: Dupliquer le template de collage ---
    const templateId = siteConfig ? siteConfig.collageTemplateId : CONFIG.COLLAGE_SLIDE_TEMPLATE_ID;
    const templateFile = DriveApp.getFileById(templateId);
    const copyName = `Temp-Collage - ${outputFileName} - ${new Date().toISOString()}`;
    const tempSlideFile = templateFile.makeCopy(copyName);
    tempSlideFileId = tempSlideFile.getId();

    // --- ÉTAPE 3: Remplacer les placeholders dans la copie ---
    const presentation = SlidesApp.openById(tempSlideFileId);
    const slide = presentation.getSlides()[0];

    slide.getPageElements().forEach(element => {
      const description = element.getDescription() ? element.getDescription().trim() : "";
      // Remplacer les deux placeholders avec la même image
      if ((description === 'image principale' || description === 'image principale 2') && element.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
        element.asImage().replace(imageBlob, true);
        Logger.log(`✅ Collage image '${description}' replaced.`);
      }
    });

    presentation.saveAndClose();

    // --- ÉTAPE 4: Exporter la slide en PNG ---
    const exportUrl = `https://docs.google.com/presentation/d/${tempSlideFileId}/export/png?pageid=${slide.getObjectId()}&dpi=150`;
    const oauthToken = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(exportUrl, { headers: { Authorization: 'Bearer ' + oauthToken } });

    if (response.getResponseCode() !== 200) {
      throw new Error(`Échec de l'exportation de l'image de collage. Code: ${response.getResponseCode()}`);
    }

    // --- ÉTAPE 5: Sauvegarder l'image finale ---
    const fileName = outputFileName ? `${outputFileName}.png` : `Collage-Image-${new Date().getTime()}.png`;
    const finalImageBlob = response.getBlob().setName(fileName);
    const destinationFolderId = siteConfig ? siteConfig.driveFolderId : null;
    if (!destinationFolderId) throw new Error("Aucun dossier de destination configuré. Veuillez remplir 'Drive Export Folder ID' dans Config_Accounts.");
    const destinationFolder = DriveApp.getFolderById(destinationFolderId);
    const finalImageFile = destinationFolder.createFile(finalImageBlob);
    finalImageFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Construire et retourner l'URL de téléchargement direct
    const fileId = finalImageFile.getId();
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    Logger.log(`Collage image saved. Preview URL: ${viewUrl}`);
    return { viewUrl, downloadUrl };

  } catch (e) {
    Logger.log(`Error in createCollageImageFromTemplate: ${e.message}\n${e.stack}`);
    return null;
  } finally {
    // --- ÉTAPE 6: Nettoyage ---
    if (tempSlideFileId) {
      DriveApp.getFileById(tempSlideFileId).setTrashed(true);
      Logger.log(`Temporary collage slide file (ID: ${tempSlideFileId}) deleted.`);
    }
  }
}

/**
 * Récupère le blob d'une image depuis une URL, en gérant les URLs Google Drive.
 * @param {string} url L'URL de l'image.
 * @returns {GoogleAppsScript.Base.Blob|null} Le blob de l'image.
 * @private
 */
function _fetchImageBlob(url) {
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
 * FONCTION DE TEST: Appelle createImageFromTemplate avec des données d'exemple.
 */
function test_createImageFromTemplate() {
  const testImageUrl = "https://drive.google.com/file/d/1kO9XKE7exhjjs_Gdw10iBHxFcu4cQXAr/view"; // Test avec une URL Google Drive
  const testTitle = "Titre de Test pour le Slide";
  const testOutputName = "Test Image - Delicious Cake";

  Logger.log("Starting image creation test via template...");
  const finalUrl = createImageFromTemplate(testImageUrl, testTitle, testOutputName);

  if (finalUrl) {
    Logger.log("--- ✅ GOOGLE SLIDES TEST RESULT ---");
    Logger.log("Final image URL: " + finalUrl);
  } else {
    Logger.log("--- ❌ GOOGLE SLIDES TEST FAILED ---");
  }
}

/**
 * FONCTION DE TEST: Appelle createCollageImageFromTemplate avec des données d'exemple.
 */
function test_createCollageImageFromTemplate() {
  const testImageUrl = "https://drive.google.com/file/d/1kO9XKE7exhjjs_Gdw10iBHxFcu4cQXAr/view";
  const testOutputName = "Test Collage - Delicious Cake";

  Logger.log("Starting collage image creation test...");
  const finalUrl = createCollageImageFromTemplate(testImageUrl, testOutputName);

  if (finalUrl) {
    Logger.log("--- ✅ COLLAGE TEST RESULT ---");
    Logger.log("Final collage image URL: " + finalUrl);
  } else {
    Logger.log("--- ❌ COLLAGE TEST FAILED ---");
  }
}

/**
 * FONCTION MOTEUR : Applique un template spécifique à une image source pour créer une version unique.
 * Utilisé pour la stratégie d'unicité (AdSense/Ezoic).
 * 
 * @param {string} sourceImageUrl L'URL de l'image de base.
 * @param {string} templateId L'ID du template Google Slides à utiliser.
 * @param {string} outputFileName Le nom de fichier de sortie.
 * @param {string} [destinationFolderId=null] Optional. ID du dossier Drive de destination.
 * @returns {{viewUrl: string, downloadUrl: string}|null}
 */
function applyUniqueTemplateToImage(sourceImageUrl, templateId, outputFileName, destinationFolderId = null) {
  let tempSlideFileId = null;
  try {
    Logger.log(`--- 🎨 Remastering image via template ID: ${templateId} ---`);

    // 1. Récupérer l'image
    const imageBlob = _fetchImageBlob(sourceImageUrl);
    if (!imageBlob) throw new Error("Impossible de récupérer l'image source.");

    // 2. Dupliquer le template
    const templateFile = DriveApp.getFileById(templateId);
    const tempFile = templateFile.makeCopy(`Remaster-Temp-${outputFileName}`);
    tempSlideFileId = tempFile.getId();

    // 3. Ouvrir et remplacer l'image (Description attendue : 'image principale')
    const presentation = SlidesApp.openById(tempSlideFileId);
    const slide = presentation.getSlides()[0];
    let found = false;

    slide.getPageElements().forEach(element => {
      const desc = (element.getDescription() || "").trim().toLowerCase();
      if (desc === 'image principale' && element.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
        element.asImage().replace(imageBlob, true);
        found = true;
      }
    });

    if (!found) {
      Logger.log("⚠️ Warning: Element with description 'image principale' not found. Replacing default first image element.");
      const firstImage = slide.getPageElements().find(e => e.getPageElementType() === SlidesApp.PageElementType.IMAGE);
      if (firstImage) firstImage.asImage().replace(imageBlob, true);
    }

    presentation.saveAndClose();

    // 4. Exportation
    const exportUrl = `https://docs.google.com/presentation/d/${tempSlideFileId}/export/png?pageid=${slide.getObjectId()}&dpi=150`;
    const response = UrlFetchApp.fetch(exportUrl, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });

    // 5. Sauvegarde persistante
    const finalImageBlob = response.getBlob().setName(`${outputFileName}.png`);
    const folderId = destinationFolderId;
    if (!folderId) throw new Error("Aucun dossier de destination configuré (destinationFolderId). Veuillez remplir 'Drive Export Folder ID' dans Config_Accounts.");

    const destinationFolder = DriveApp.getFolderById(folderId);
    const finalFile = destinationFolder.createFile(finalImageBlob);
    finalFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const result = {
      viewUrl: `https://drive.google.com/file/d/${finalFile.getId()}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${finalFile.getId()}`
    };

    Logger.log(`--- ✅ Remastered image created successfully: ${result.viewUrl} ---`);
    return result;

  } catch (e) {
    Logger.log(`❌ Error in applyUniqueTemplateToImage: ${e.message}`);
    return null;
  } finally {
    if (tempSlideFileId) DriveApp.getFileById(tempSlideFileId).setTrashed(true);
  }
}

/**
 * TEST UNITAIRE : Valide la création d'une image unique via un template spécifique.
 */
function test_uniqueImageTemplate() {
  const templateId = "1JIoiF4Fxi23olsnzqlvkz7NDK4fE08A7x_gDgDdbVdE";
  const sourceImage = "https://drive.google.com/file/d/1OwYGU-UbeBhjXx3MtcYJ8E2C-Vd_3uI5/view?usp=drivesdk";
  const targetFolder = "1i9py9_X8OjwxTqL7iiL3VjG8ZbrpOblN"; // Dossier fourni par l'utilisateur
  const outputName = "Test_Unique_Image_Remaster";

  Logger.log("--- 🧪 Starting Image Uniqueness Test ---");
  const result = applyUniqueTemplateToImage(sourceImage, templateId, outputName, targetFolder);

  if (result) {
    Logger.log("-----------------------------------------");
    Logger.log("TEST PASSED!");
    Logger.log(`Generated image: ${result.viewUrl}`);
    Logger.log("-----------------------------------------");
  } else {
    Logger.log("--- ❌ TEST FAILED (check errors above) ---");
  }
}