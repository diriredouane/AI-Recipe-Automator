/**
 * @fileoverview Système d'Audit Global pour surveiller la santé des articles sur tous les sites.
 * Ce fichier est indépendant pour ne pas perturber les flux de publication existants.
 */

/**
 * Parcourt "Config_Accounts" et crée un onglet "AUDIT-{Site}" pour chaque site actif.
 */
function createAuditSheets() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName("Config_Accounts");
    if (!configSheet) {
        SpreadsheetApp.getUi().alert("Error: The 'Config_Accounts' sheet was not found.");
        return;
    }

    // Trouver l'index de la colonne "Site Name"
    const siteNameColIndex = getColumnIndexByHeader(configSheet, "Site Name");
    if (siteNameColIndex === -1) {
        SpreadsheetApp.getUi().alert("Error: 'Site Name' column not found in Config_Accounts.");
        return;
    }

    const data = configSheet.getRange(2, siteNameColIndex, configSheet.getLastRow() - 1, 1).getValues();
    let createdCount = 0;

    data.forEach(row => {
        const siteName = row[0]; // row[0] car on n'a extrait qu'une colonne
        if (!siteName) return;

        const auditSheetName = `AUDIT-${siteName}`;
        let auditSheet = spreadsheet.getSheetByName(auditSheetName);

        if (!auditSheet) {
            auditSheet = spreadsheet.insertSheet(auditSheetName);
            createdCount++;
        }
        // Mise à jour systémique des en-têtes (même si la feuille existait déjà)
        _setupAuditHeader(auditSheet);
    });

    SpreadsheetApp.getUi().alert(`Operation complete. ${createdCount} new audit tab(s) created.`);
}

/**
 * Configure les en-têtes de l'onglet d'Audit.
 */
function _setupAuditHeader(sheet) {
    const headers = [
        "ID WordPress",
        "Titre de l'Article",
        "URL Publique",
        "Lien d'Édition (Direct)",
        "Catégorie",
        "Statut",
        "Date Création",
        "Date Modif",
        "Word Count",  // Col I (9)
        "TRIGGER (CALC)", // Col J (10)
        "Images",      // Col K (11)
        "Recette?",    // Col L (12)
        "All Images URLs", // Col M (13)
        "URL Health",   // Col N (14)
        "Score Santé (Futur)", // Col O (15)
        "Schema Issues (GSC)", // Col P (16)
        "Correction History", // Col Q (17)
        "Cost ($)" // Col R (18) - SUPER_FIX Cost Tracking
    ];
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setBackground("#45818e").setFontColor("white").setFontWeight("bold");
    sheet.setFrozenRows(1);

    // Ajustement auto des colonnes
    sheet.setColumnWidth(1, 80); // ID
    sheet.setColumnWidth(2, 300); // Title
    sheet.setColumnWidth(3, 250); // Public URL
    sheet.setColumnWidth(4, 250); // Edit URL
    sheet.setColumnWidth(7, 130); // Date Création
    sheet.setColumnWidth(8, 130); // Date Modif
    sheet.setColumnWidth(9, 100); // Word Count
    sheet.setColumnWidth(10, 100); // Trigger
    sheet.setColumnWidth(13, 300); // All Images URLs
    sheet.setColumnWidth(14, 150); // URL Health
    sheet.setColumnWidth(16, 250); // Schema Issues
    sheet.setColumnWidth(17, 300); // Correction History
    sheet.setColumnWidth(18, 350); // Cost ($)
}

/**
 * Récupère les données de TOUS les sites configurés.
 */
function syncAllSitesAuditData() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName("Config_Accounts");
    // Trouver l'index de la colonne "Site Name"
    const siteNameColIndex = getColumnIndexByHeader(configSheet, "Site Name");
    if (siteNameColIndex === -1) {
        SpreadsheetApp.getUi().alert("Error: 'Site Name' column not found in Config_Accounts.");
        return;
    }

    const data = configSheet.getRange(2, siteNameColIndex, configSheet.getLastRow() - 1, 1).getValues();

    data.forEach(row => {
        const siteName = row[0];
        if (!siteName) return;

        // On récupère la config complète pour ce site
        // On réutilise la fonction globale définie dans Code.js / AccountHelper.js
        const targetSheetName = (siteName === "Mon Projet Actuel") ? "Recipes" : `Data-${siteName}`;
        const accountConfig = getAccountConfigForSheet(targetSheetName);

        if (accountConfig) {
            Logger.log(`Running audit for: ${siteName}`);
            updateAuditForSite(siteName, accountConfig);
        }
    });

    SpreadsheetApp.getUi().alert("Audit synchronization complete for all sites!");
}

/**
 * Récupère les articles d'un site spécifique via l'API WP (Paginé).
 */
function updateAuditForSite(siteName, config) {
    const auditSheetName = `AUDIT-${siteName}`;
    const auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(auditSheetName);
    if (!auditSheet) return;

    const baseUrl = config.wpBaseUrl.replace(/\/$/, "");
    // Endpoint pour les posts avec pagination
    const apiEndpoint = `${baseUrl}/wp-json/wp/v2/posts?per_page=100&_embed=1`;

    const username = config.wpUser;
    const password = config.wpAppPassword;
    const headers = {
        'Authorization': 'Basic ' + Utilities.base64Encode(username + ':' + password)
    };

    let allPosts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Sécurité : max 1000 articles par scan
        const url = `${apiEndpoint}&page=${page}`;
        const options = { 'headers': headers, 'muteHttpExceptions': true };

        try {
            const response = UrlFetchApp.fetch(url, options);
            if (response.getResponseCode() !== 200) {
                Logger.log(`API error page ${page} for ${siteName}: ${response.getContentText()}`);
                hasMore = false;
                break;
            }

            const posts = JSON.parse(response.getContentText());
            if (posts.length === 0) {
                hasMore = false;
            } else {
                allPosts = allPosts.concat(posts);
                page++;
            }
        } catch (e) {
            Logger.log(`Error fetching audit for ${siteName}: ${e.message}`);
            hasMore = false;
        }
    }

    if (allPosts.length > 0) {
        // TRI : Du plus ancien au plus récent (Le plus récent se retrouve en bas)
        allPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
        _writeAuditDataToSheet(auditSheet, allPosts, baseUrl);
    }
}

/**
 * Écrit les résultats du scan dans la feuille d'audit.
 */
function _writeAuditDataToSheet(sheet, posts, baseUrl) {
    // Préserver les en-têtes
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
    }

    const rows = posts.map(post => {
        // Extraire le nom de la catégorie (si disponible dans _embedded)
        let categoryName = "Uncategorized";
        if (post._embedded && post._embedded['wp:term'] && post._embedded['wp:term'][0]) {
            categoryName = post._embedded['wp:term'][0].map(c => c.name).join(", ");
        }

        // Construire l'URL d'édition directe
        const editUrl = `${baseUrl}/wp-admin/post.php?post=${post.id}&action=edit`;

        // Extraire l'URL de l'image mise en avant (via _embed)
        let featuredImageUrl = "";
        if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
            featuredImageUrl = post._embedded['wp:featuredmedia'][0].source_url || "";
        }

        return [
            post.id,
            post.title.rendered,
            post.link,
            editUrl,
            categoryName,
            post.status,
            post.date,      // Date Création
            post.modified,  // Date Modif
            "", // Word Count
            "", // Trigger
            "", // Images
            "", // Recette?
            featuredImageUrl, // Featured Image URL
            "", // URL Health
            "", // Score Santé
            "", // Schema Issues
            ""  // Correction History
        ];
    });

    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
}

/**
 * Calcule les métriques de santé pour une seule ligne.
 * Appelé manuellement vie le trigger "CALC" en colonne J.
 */
function calculateRowHealth(sheet, row) {
    const triggerCell = sheet.getRange(row, 10);
    const siteName = sheet.getName().split("-")[1];
    const postId = sheet.getRange(row, 1).getValue();

    if (!postId) {
        triggerCell.setValue("ID Manquant");
        return;
    }

    try {
        triggerCell.setValue("Scanning...");
        const accountConfig = getAccountConfigForSheet(`Data-${siteName}`); // Fallback vers Data-XXX

        // 1. Récupérer le post complet
        const baseUrl = accountConfig.wpBaseUrl.replace(/\/$/, "");
        const url = `${baseUrl}/wp-json/wp/v2/posts/${postId}?_embed=1`;
        const options = {
            'headers': { 'Authorization': 'Basic ' + Utilities.base64Encode(accountConfig.wpUser + ':' + accountConfig.wpAppPassword) },
            'muteHttpExceptions': true
        };

        const response = UrlFetchApp.fetch(url, options);
        if (response.getResponseCode() !== 200) throw new Error("WP API Error");

        const post = JSON.parse(response.getContentText());
        const content = post.content.rendered;
        const publicUrl = post.link;

        // Récupérer l'image déjà chargée (si possible via embed ou fallback)
        const featuredMediaUrl = (post._embedded && post._embedded['wp:featuredmedia']) ? post._embedded['wp:featuredmedia'][0].source_url : "";

        // 2. Extraire les métriques de base
        const metrics = _extractContentMetrics(content, featuredMediaUrl, baseUrl);

        // 3. Analyse SEO / Schema (Nécessite le HTML public complet)
        let schemaIssues = "Scanning Schema...";
        try {
            // Cache busting pour s'assurer de voir les modifs (LiteSpeed/CDN)
            const cacheBustingUrl = publicUrl + (publicUrl.includes("?") ? "&" : "?") + "audit_v=" + new Date().getTime();
            const publicHtml = UrlFetchApp.fetch(cacheBustingUrl, { 'muteHttpExceptions': true }).getContentText();
            schemaIssues = _analyzeRecipeSchema(publicHtml);
        } catch (e) {
            schemaIssues = "Fetch Error";
        }

        // 4. Écrire les résultats
        sheet.getRange(row, 9).setValue(metrics.wordCount);
        sheet.getRange(row, 11).setValue(metrics.imageCount);
        sheet.getRange(row, 12).setValue(metrics.hasRecipeCard ? "OUI ✅" : "NON ❌");
        sheet.getRange(row, 13).setValue(metrics.allImagesString); // Liste complète des images
        sheet.getRange(row, 14).setValue(metrics.urlHealth);
        sheet.getRange(row, 16).setValue(schemaIssues);

        triggerCell.setValue("OK");

    } catch (e) {
        Logger.log(`Health Audit Error Row ${row}: ${e.message}`);
        triggerCell.setValue("Error");
    }
}

/**
 * Répare les URLs d'un article pour forcer le format canonique du site.
 * Déclenché par "FIX" en colonne J.
 */
function fixArticleUrls(sheet, row) {
    const triggerCell = sheet.getRange(row, 10);
    const siteName = sheet.getName().split("-")[1];
    const postId = sheet.getRange(row, 1).getValue();

    try {
        triggerCell.setValue("Fixing...");
        const accountConfig = getAccountConfigForSheet(`Data-${siteName}`);
        const baseUrl = accountConfig.wpBaseUrl.replace(/\/$/, ""); // Format canonique (ex: https://site.com)

        // 1. Déterminer les patterns à remplacer
        const nakedDomain = baseUrl.split("://")[1]; // ex: site.com
        const wwwDomain = `www.${nakedDomain}`;

        // 2. Récupérer le post
        const wpHeaders = { 'Authorization': 'Basic ' + Utilities.base64Encode(accountConfig.wpUser + ':' + accountConfig.wpAppPassword) };
        const getUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;
        const response = UrlFetchApp.fetch(getUrl, { 'headers': wpHeaders });
        const post = JSON.parse(response.getContentText());
        let content = post.content.rendered;

        // 3. Remplacement chirurgical (Case Insensitive)
        // On remplace http://www.site.com, https://www.site.com, http://site.com par https://site.com
        const regexHttpWww = new RegExp(`http://${wwwDomain.replace(/\./g, '\\.')}`, 'gi');
        const regexHttpsWww = new RegExp(`https://${wwwDomain.replace(/\./g, '\\.')}`, 'gi');
        const regexHttpNaked = new RegExp(`http://${nakedDomain.replace(/\./g, '\\.')}`, 'gi');

        let fixedContent = content.replace(regexHttpWww, `https://${nakedDomain}`)
            .replace(regexHttpsWww, `https://${nakedDomain}`)
            .replace(regexHttpNaked, `https://${nakedDomain}`);

        if (content === fixedContent) {
            triggerCell.setValue("Already Clean");
            return;
        }

        // 4. Update WordPress
        const updateUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;
        const payload = { content: fixedContent };
        const updateOptions = {
            'method': 'post',
            'contentType': 'application/json',
            'headers': wpHeaders,
            'payload': JSON.stringify(payload),
            'muteHttpExceptions': true
        };

        UrlFetchApp.fetch(updateUrl, updateOptions);

        // 5. Relancer le Scan Santé pour confirmer
        calculateRowHealth(sheet, row);
        triggerCell.setValue("FIXED ✅");

    } catch (e) {
        Logger.log(`FIX Error Row ${row}: ${e.message}`);
        triggerCell.setValue("Fix Error");
    }
}

/**
 * RÉPARATION ULTIME V29 (PHP-FREE) + COST TRACKING
 * Déclenché par "SUPER_FIX" en colonne J.
 * Utilise les mêmes fonctions que DATA-XXX pour la création.
 */
function superFixArticle(sheet, row) {
    const triggerCell = sheet.getRange(row, 10);
    const postId = sheet.getRange(row, 1).getValue();
    const postTitle = sheet.getRange(row, 2).getValue();

    // COST TRACKING: Initialisation du suivi des coûts
    const costTracker = {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        details: []
    };

    try {
        triggerCell.setValue("🚀 V29 Starting...");
        _logCorrection(sheet, row, "V29 PHP-Free Audit Started");

        // 1. Récupérer la configuration du site
        const siteName = sheet.getName().split("-")[1];
        const accountConfig = getAccountConfigForSheet(`Data-${siteName}`);
        const baseUrl = accountConfig.wpBaseUrl.replace(/\/$/, "");
        const wpHeaders = { 'Authorization': 'Basic ' + Utilities.base64Encode(accountConfig.wpUser + ':' + accountConfig.wpAppPassword) };

        // 2. Récupérer le contenu actuel de l'article
        triggerCell.setValue("📖 Reading current post...");
        const getUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}?_embed=1`;
        const response = UrlFetchApp.fetch(getUrl, { 'headers': wpHeaders, 'muteHttpExceptions': true });
        const post = JSON.parse(response.getContentText());
        const currentContent = post.content.rendered;
        const featuredMediaId = post.featured_media;

        // 3. EXTRACTION DES IMAGES
        triggerCell.setValue("🖼️ Extracting images...");
        let heroImageUrl = "";
        let heroImageId = featuredMediaId;

        // 3a. Vérifier si Featured Image existe
        if (featuredMediaId > 0) {
            try {
                const mediaApiUrl = `${baseUrl}/wp-json/wp/v2/media/${featuredMediaId}`;
                const mediaResponse = UrlFetchApp.fetch(mediaApiUrl, { 'headers': wpHeaders });
                const mediaData = JSON.parse(mediaResponse.getContentText());
                // FORCE NAKED URL (No WWW)
                heroImageUrl = (mediaData.source_url || "").replace(/(\/\/)(www\.)/gi, '$1');
                _logCorrection(sheet, row, "Hero: Existing Featured Image found");
            } catch (e) {
                Logger.log("Error fetching Featured Image: " + e.message);
            }
        }

        // 3b. Extraire toutes les images du contenu
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        let bodyImages = [];
        let match;
        while ((match = imgRegex.exec(currentContent)) !== null) {
            // FORCE NAKED URL (No WWW)
            let rawUrl = match[1];
            let cleanUrl = rawUrl.replace(/(\/\/)(www\.)/gi, '$1');
            bodyImages.push(cleanUrl);
        }
        _logCorrection(sheet, row, `Body Images: ${bodyImages.length} found`);

        // 3c. Si pas de Featured, promouvoir la première image du contenu
        if (!heroImageUrl && bodyImages.length > 0) {
            heroImageUrl = bodyImages[0];
            bodyImages = bodyImages.slice(1);

            // IMPORTANT: Essayer d'extraire l'ID WordPress de l'image promue
            // Chercher dans le HTML original pour trouver l'attribut wp-image-XXXXX ou data-id
            const imgWithIdRegex = new RegExp(`<img[^>]*src=["']${heroImageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
            const imgTagMatch = currentContent.match(imgWithIdRegex);

            if (imgTagMatch) {
                const imgTag = imgTagMatch[0];
                const wpImageClassMatch = imgTag.match(/wp-image-(\d+)/);
                if (wpImageClassMatch) heroImageId = parseInt(wpImageClassMatch[1]);
            }

            // STRATÉGIE "RE-UPLOAD & USE" (V30)
            if (!heroImageId) {
                triggerCell.setValue("♻️ Re-uploading promoted img...");
                // Nettoyage simple du slug pour le nom de fichier
                const cleanSlug = postTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                const reUploadName = `${cleanSlug}-featured-reborn-${new Date().getTime()}.jpg`;

                try {
                    // On importe 'uploadImageToWordPress' par son nom global (Code.js)
                    const uploadRes = uploadImageToWordPress(heroImageUrl, reUploadName, postTitle, accountConfig);
                    if (uploadRes && uploadRes.id) {
                        heroImageId = uploadRes.id;
                        heroImageUrl = uploadRes.url; // Mettre à jour avec la nouvelle URL
                        _logCorrection(sheet, row, `Hero: Re-uploaded successfully (New ID: ${heroImageId})`);

                        // Set Featured Image immédiat sur le post
                        const updatePayload = { featured_media: heroImageId };
                        try {
                            UrlFetchApp.fetch(`${baseUrl}/wp-json/wp/v2/posts/${postId}`, {
                                'method': 'post',
                                'headers': wpHeaders,
                                'payload': JSON.stringify(updatePayload),
                                'muteHttpExceptions': true
                            });
                        } catch (ignore) { }

                    } else {
                        _logCorrection(sheet, row, "Hero: Re-upload failed");
                    }
                } catch (e) {
                    _logCorrection(sheet, row, "Hero: Re-upload error: " + e.message);
                }
            } else {
                _logCorrection(sheet, row, `Hero: Found existing ID ${heroImageId}`);
            }
        }

        // 4. GÉNÉRATION DU MOT-CLÉ (gemini-2.5-flash)
        triggerCell.setValue("🔑 Generating keyword...");
        const keywordResult = generateTargetKeyword(postTitle);
        const targetKeyword = keywordResult && keywordResult.data ? keywordResult.data : postTitle;
        _logCorrection(sheet, row, `Keyword: ${targetKeyword}`);
        _trackCost(costTracker, "generateTargetKeyword", "gemini-2.5-flash", keywordResult?.usage);

        // 5. GÉNÉRATION DU PLAN ET DU CONTENU
        triggerCell.setValue("📝 Generating outline...");
        const outlineResult = generateWordPressOutline(targetKeyword, currentContent);
        if (!outlineResult || !outlineResult.data) throw new Error("Outline generation failed");
        const brief = outlineResult.data;
        _trackCost(costTracker, "generateWordPressOutline", "gemini-3-pro-preview", outlineResult?.usage);

        triggerCell.setValue("✍️ Writing article...");
        const articleResult = generateWordPressArticle(brief.targetKeyword, brief.outline_markdown, brief.lsi_keywords);
        if (!articleResult || !articleResult.data) throw new Error("Article generation failed");
        let articleHtml = _cleanMarkdownFences(articleResult.data); // Nettoyer les artefacts markdown
        _trackCost(costTracker, "generateWordPressArticle", "gemini-2.5-flash", articleResult?.usage);

        // 6. MAILLAGE INTERNE (Aligné sur DATA-XXX)
        triggerCell.setValue("🔗 Internal linking...");
        const sitemapUrl = accountConfig.sitemapUrl;
        if (sitemapUrl) {
            let internalUrls = _getSitemapUrls(sitemapUrl); // Utilisation de la fonction standard
            _logCorrection(sheet, row, `Sitemap: ${internalUrls.length} URLs found`);

            const currentPostUrl = post.link;
            internalUrls = internalUrls.filter(url => _normalizeUrl(url) !== _normalizeUrl(currentPostUrl));

            if (internalUrls.length > 0) {
                // On utilise la même logique d'encapsulation que dans Code.js
                const costBreakdownForLinking = [];
                articleHtml = _applyInternalLinking(articleHtml, targetKeyword, internalUrls, costBreakdownForLinking);

                // On réintègre les coûts dans le costTracker de l'Audit
                costBreakdownForLinking.forEach(item => {
                    _trackCost(costTracker, item.name, item.model, item.usage);
                });

                _logCorrection(sheet, row, "Internal Linking: Processed via standard DATA flow");
            }
        }
        else {
            _logCorrection(sheet, row, "Internal Links: Skipped (no sitemap URL)");
        }

        // 7. INSERTION DES IMAGES DU CORPS
        triggerCell.setValue("🖼️ Splicing images...");
        if (bodyImages.length > 0) {
            const paragraphs = articleHtml.split('</p>');
            const step = Math.max(1, Math.floor(paragraphs.length / (bodyImages.length + 1)));
            let splicedContent = [];
            let imgIndex = 0;

            for (let i = 0; i < paragraphs.length; i++) {
                splicedContent.push(paragraphs[i] + '</p>');
                if ((i + 1) % step === 0 && imgIndex < bodyImages.length && i < paragraphs.length - 1) {
                    // FORCE NAKED URL HERE TOO (Security)
                    let cleanImgUrl = bodyImages[imgIndex].replace(/(\/\/)(www\.)/gi, '$1');
                    splicedContent.push(`\n<div class="spliced-image" style="margin: 40px 0; text-align: center;"><img src="${cleanImgUrl}" alt="${targetKeyword}" style="width:100%;max-width:700px;height:auto;border-radius:8px;"/></div>\n`);
                    imgIndex++;
                }
            }
            articleHtml = splicedContent.join("");
            _logCorrection(sheet, row, `Images: ${imgIndex} spliced into content`);
        }

        // 8. CRÉER LA FICHE RECETTE (via API PHP propre)
        triggerCell.setValue("🍳 Creating recipe card...");
        let recipeShortcode = "";
        try {
            const recipeData = brief.recipe_card;
            if (recipeData) {
                const recipeResult = createRecipeCard(
                    recipeData.title || targetKeyword,
                    recipeData.summary || "",
                    recipeData.ingredients || [],
                    recipeData.instructions || [],
                    recipeData.servings || 4,
                    recipeData.prep_time || 15,
                    recipeData.cook_time || 30,
                    accountConfig,
                    heroImageId // PASSAGE DE L'ID IMAGE (V30)
                );
                if (recipeResult && recipeResult.shortcode) {
                    recipeShortcode = recipeResult.shortcode;
                    _logCorrection(sheet, row, `Recipe Card: Created (ID ${recipeResult.id})`);
                }
            }
        } catch (e) {
            _logCorrection(sheet, row, "Recipe Card: Failed - " + e.message);
        }

        // 9. ASSEMBLAGE FINAL
        triggerCell.setValue("🔧 Assembling...");
        const heroHtml = heroImageUrl
            ? `<div class="hero-image" style="margin-bottom: 45px; text-align: center;"><img src="${heroImageUrl}" alt="${targetKeyword}" style="width:100%;max-width:800px;height:auto;border-radius:8px;"/></div>\n\n`
            : "";

        const facebookFooter = `\n<hr>\n<p style="text-align:center;font-size:1.1em;margin-top:30px;"><strong>For more daily recipes and tips, follow us on Facebook!</strong><br><a href="${accountConfig.facebookUrl || 'https://www.facebook.com/profile.php?id=61568538666337'}" target="_blank" rel="noopener noreferrer">Click here to join our community!</a></p>`;

        let finalHtml = heroHtml + articleHtml + "\n\n" + recipeShortcode + facebookFooter;

        // NETTOYAGE RADICAL FINAL (Supprime ```html et ``` partout)
        finalHtml = finalHtml.replace(/```(?:html)?|```/gi, '').trim();

        // 10. SAUVEGARDE VIA API STANDARD + SEO SYNC (V29.1)
        triggerCell.setValue("💾 Saving to WordPress...");

        // Préparation des métas Rank Math
        const rankMathMeta = {
            'rank_math_focus_keyword': targetKeyword, // Mot-clé cible IA
            'rank_math_title': brief.seoTitle || targetKeyword, // Titre SEO Optimisé
            'rank_math_description': brief.metaDescription || "" // Méta description IA
        };

        const updateSuccess = updateWordPressPostContent(
            postId,
            finalHtml,
            accountConfig,
            brief.seoTitle || targetKeyword, // Nouveau Titre du Post
            rankMathMeta // Métas Rank Math
        );

        if (updateSuccess) {
            _logCorrection(sheet, row, "V29.1 SUCCESS: Content & SEO synced");
            _logCorrection(sheet, row, `Word Count: ~${finalHtml.split(' ').length} words`);
            triggerCell.setValue("SUPER FIXED ✅");
        } else {
            _logCorrection(sheet, row, "V29 ERROR: Save failed");
            triggerCell.setValue("Save Error");
        }

        // 11. LOG DES COÛTS
        _logCostSummary(sheet, row, costTracker);

        // Refresh final des diagnostics
        calculateRowHealth(sheet, row);

    } catch (e) {
        Logger.log(`SUPER_FIX V29 Error Row ${row}: ${e.message}`);
        triggerCell.setValue("V29 Error");
        _logCorrection(sheet, row, "Fatal Error: " + e.message);
        // Log costs even on error
        _logCostSummary(sheet, row, costTracker);
    }
}

/**
 * Track cost for a single AI call.
 * Pricing (per 1M tokens):
 * - gemini-3-pro-preview: $2.00 input, $12.00 output (with grounding)
 * - gemini-2.5-flash: $0.30 input, $2.50 output
 */
function _trackCost(tracker, stepName, model, usage) {
    if (!usage) return;

    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;

    let inputPricePerM, outputPricePerM;
    if (model === "gemini-3-pro-preview") {
        inputPricePerM = 2.00;
        outputPricePerM = 12.00;
    } else { // gemini-2.5-flash
        inputPricePerM = 0.30;
        outputPricePerM = 2.50;
    }

    const inputCost = (inputTokens / 1000000) * inputPricePerM;
    const outputCost = (outputTokens / 1000000) * outputPricePerM;
    const stepCost = inputCost + outputCost;

    tracker.totalInputTokens += inputTokens;
    tracker.totalOutputTokens += outputTokens;
    tracker.totalCost += stepCost;
    tracker.details.push({
        step: stepName,
        model: model,
        input: inputTokens,
        output: outputTokens,
        cost: stepCost
    });
}

/**
 * Log final cost summary to Column R and correction history.
 */
function _logCostSummary(sheet, row, tracker) {
    const totalTokens = tracker.totalInputTokens + tracker.totalOutputTokens;
    const costSummary = `Input: ${tracker.totalInputTokens.toLocaleString()} | Output: ${tracker.totalOutputTokens.toLocaleString()} | Total: ${totalTokens.toLocaleString()} | Cost: $${tracker.totalCost.toFixed(4)}`;

    // Log to Column R (18)
    sheet.getRange(row, 18).setValue(costSummary);

    // Log details to correction history
    _logCorrection(sheet, row, `💰 COST SUMMARY: ${costSummary}`);

    // Log breakdown per step
    let breakdown = "Cost Breakdown:\n";
    tracker.details.forEach(d => {
        breakdown += `  - ${d.step} (${d.model}): ${d.input}+${d.output} tokens = $${d.cost.toFixed(4)}\n`;
    });
    _logCorrection(sheet, row, breakdown);
}

/**
 * TRIGGER: FIX_RECIPE_IMAGE
 * Répare rétroactivement l'image de la fiche recette.
 */
function fixRecipeImage(sheet, row) {
    const triggerCell = sheet.getRange(row, 10);
    const postId = sheet.getRange(row, 1).getValue();

    try {
        triggerCell.setValue("🖼️ Fixing Recipe Image...");

        // 1. Config et Auth
        const siteName = sheet.getName().split("-")[1];
        const accountConfig = getAccountConfigForSheet(`Data-${siteName}`);
        const baseUrl = accountConfig.wpBaseUrl.replace(/\/$/, "");
        const wpHeaders = { 'Authorization': 'Basic ' + Utilities.base64Encode(accountConfig.wpUser + ':' + accountConfig.wpAppPassword) };

        // 2. Fetch Article pour avoir l'Image ID et le Shortcode (CONTENU BRUT)
        const getUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}?context=edit`;
        const response = UrlFetchApp.fetch(getUrl, { 'headers': wpHeaders, 'muteHttpExceptions': true });
        const post = JSON.parse(response.getContentText());

        const featuredMediaId = post.featured_media;

        // IMPORTANT: Avec context=edit, on obtient content.raw (shortcodes non exécutés)
        const contentRaw = post.content && post.content.raw ? post.content.raw : "";

        if (!featuredMediaId) {
            triggerCell.setValue("No Featured Img");
            return;
        }

        // 3. Trouver l'ID de la Recette dans le contenu BRUT
        // WPRM peut rendre le shortcode, donc on cherche aussi dans les commentaires HTML et attributs
        let recipeMatch = contentRaw.match(/\[wprm-recipe\s+id\s*=\s*['"]\s*(\d+)\s*['"]\s*\]/i);

        // Si pas de shortcode, chercher dans les commentaires HTML: <!--WPRM Recipe 5357-->
        if (!recipeMatch) {
            recipeMatch = contentRaw.match(/<!--\s*WPRM\s+Recipe\s+(\d+)\s*-->/i);
        }

        // Si toujours rien, chercher data-recipe-id dans le HTML
        if (!recipeMatch) {
            recipeMatch = contentRaw.match(/data-recipe-id\s*=\s*['"]\s*(\d+)\s*['"]/i);
        }

        // Dernier recours: chercher wprm-recipe-container-XXXXX
        if (!recipeMatch) {
            recipeMatch = contentRaw.match(/wprm-recipe-container[_-](\d+)/i);
        }

        if (!recipeMatch) {
            triggerCell.setValue("No Recipe Found");
            _logCorrection(sheet, row, "Recipe Image Fix: No shortcode found in raw content");
            _logCorrection(sheet, row, `Raw content length: ${contentRaw.length} chars`);
            _logCorrection(sheet, row, `Sample (raw): ${contentRaw.substring(contentRaw.length - 500)}...`); // Fin du contenu
            return;
        }
        const recipeId = recipeMatch[1];
        _logCorrection(sheet, row, `Target Recipe ID: ${recipeId}`);

        // 4. Update de la Recette (Post Type 'wprm_recipe')
        const recipeUpdateUrl = `${baseUrl}/wp-json/wp/v2/wprm_recipe/${recipeId}`;
        const payload = {
            featured_media: featuredMediaId
        };

        const options = {
            'method': 'post',
            'headers': {
                'Authorization': wpHeaders.Authorization,
                'Content-Type': 'application/json'
            },
            'payload': JSON.stringify(payload),
            'muteHttpExceptions': true
        };

        const updateRes = UrlFetchApp.fetch(recipeUpdateUrl, options);

        if (updateRes.getResponseCode() === 200) {
            triggerCell.setValue("IMAGE FIXED ✅");
            _logCorrection(sheet, row, `Recipe Image Sync: Success (ID ${featuredMediaId} attached to Recipe ${recipeId})`);
        } else {
            triggerCell.setValue("Update Failed");
            _logCorrection(sheet, row, `Recipe Image Sync: Failed (${updateRes.getResponseCode()}) - ${updateRes.getContentText()}`);
        }

    } catch (e) {
        Logger.log(`Error fixRecipeImage Row ${row}: ${e.message}`);
        triggerCell.setValue("Error Fix Img");
        _logCorrection(sheet, row, "Error: " + e.message);
    }
}

/**
 * Nettoie les artefacts markdown (```html, ```) que Gemini ajoute parfois.
 */
function _cleanMarkdownFences(text) {
    if (!text) return "";
    return text
        .replace(/^[\s\n]*```(?:html|HTML)?[\s\n]*/i, '') // Supprime ```html au début
        .replace(/[\s\n]*```[\s\n]*$/i, '')               // Supprime ``` à la fin
        .trim();
}

/**
 * Ajoute un log d'historique avec date.
 */
function _logCorrection(sheet, row, message) {
    const historyCell = sheet.getRange(row, 17); // Col Q
    const currentVal = historyCell.getValue();
    const date = Utilities.formatDate(new Date(), "GMT+1", "dd/MM HH:mm");
    const newLine = `[${date}] ${message}`;

    const newVal = currentVal ? `${currentVal}\n${newLine}` : newLine;
    historyCell.setValue(newVal).setVerticalAlignment("top");
}

/**
 * Logique de comptage JS (Gratuit)
 */
function _extractContentMetrics(html, featuredMediaUrl = "", baseUrl = "") {
    // 1. Déterminer le format cible du site (Le standard actuel)
    const isSiteWww = baseUrl.includes("://www.");
    const isSiteHttps = baseUrl.includes("https://");

    // 2. Compter les images et extraire les URLs (Inclut Lazy Loading)
    // On cherche src, data-src, data-lazy-src, etc.
    const imgRegex = /<(?:img|source)[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi;
    let match;
    let urlSet = new Set();

    // Ajouter l'image mise en avant au set (si elle existe)
    if (featuredMediaUrl) urlSet.add(featuredMediaUrl);

    while ((match = imgRegex.exec(html)) !== null) {
        urlSet.add(match[1]);
    }

    // URLs uniques pour le diagnostic technique
    const allUrls = Array.from(urlSet);

    // 3. Vérification avancée de la santé des URLs
    let healthIssues = [];
    allUrls.forEach(url => {
        // Check Sécurité (SSL)
        if (isSiteHttps && url.startsWith("http://")) {
            healthIssues.push("ERR: INSECURE (HTTP)");
        }

        // Check Cohérence WWW
        const isWww = url.includes("://www.");
        if (isSiteWww && !isWww && url.includes(baseUrl.split("://")[1])) {
            healthIssues.push("ERR: MISSING WWW");
        } else if (!isSiteWww && isWww) {
            healthIssues.push("ERR: WWW-MISMATCH");
        }
    });

    // Check unique pour le formatage
    const uniqueIssues = [...new Set(healthIssues)];
    const urlHealth = uniqueIssues.length > 0 ? "🛑 " + uniqueIssues.join(", ") : "✓ Clean";

    // Compter les mots (strip HTML tags)
    const text = html.replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const wordCount = text ? text.split(' ').length : 0;

    // Détecter fiche recette
    const hasRecipeCard = html.includes("wprm-recipe") || html.includes("[wprm-recipe");

    return {
        wordCount: wordCount,
        imageCount: urlSet.size, // On retourne le nombre Total de photos UNIQUES (Featured + Body)
        hasRecipeCard: hasRecipeCard,
        featuredImageUrl: featuredMediaUrl,
        allImagesString: allUrls.join("\n"), // Nouveau champ pour l'affichage multi-ligne
        urlHealth: urlHealth
    };
}

/**
 * Version spécialisée de l'IA pour l'AUDIT. 
 * Récupère les champs manquants demandés par Google Search Console.
 */
function _extractFullAIPostData(htmlContent) {
    const GEMINI_API_KEY = getGeminiApiKey(); // Réutilise la clé du projet

    const prompt = `
    You are an SEO expert specializing in food blogs. Analyze the HTML content of this blog post.
    Your goal is to extract ALL data needed for a perfect Recipe JSON-LD schema.
    
    Article HTML: "${htmlContent}"

    CRITICAL REQUIREMENTS:
    1. Extract Ingredients (as objects with amount, unit, name, notes).
    2. Extract Instructions (array of strings).
    3. Extract/Estimate Prep & Cook Times (integers in minutes).
    4. Categorize the Cuisine (e.g., American, Italian, Breakfast).
    5. Generate 5-8 relevant keywords for the recipe.
    6. Write a short, keyword-rich summary (2 sentences).
    
    Return a VALID JSON object:
    {
      "title": "Title found in text",
      "summary": "Full appetizing description",
      "ingredients": [{"amount": "1", "unit": "cup", "name": "flour", "notes": ""}, ...],
      "instructions": ["Step 1...", "Step 2...", ...],
      "servings": 4,
      "prep_time": 15,
      "cook_time": 30,
      "cuisine": "Main cuisine category",
      "keywords": "comma, separated, keywords"
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

    try {
        const url = `${CONFIG.GEMINI_FLASH_API_ENDPOINT}?key=${GEMINI_API_KEY}`;
        const response = UrlFetchApp.fetch(url, options);
        const json = JSON.parse(response.getContentText());
        return JSON.parse(json.candidates[0].content.parts[0].text);
    } catch (e) {
        Logger.log("Error _extractFullAIPostData: " + e.message);
        return null;
    }
}

/**
 * Analyse le HTML public pour extraire le schéma JSON-LD et identifier les manques.
 */
function _analyzeRecipeSchema(html) {
    const ldJsonRegex = /<script\b[^>]*?type=["']application\/ld\+json["'][^>]*?>([\s\S]*?)<\/script>/gi;
    let match;
    let bestIssues = null;
    let foundRecipe = false;

    // On scan TOUS les blocs JSON-LD du HTML (car RankMath et WPRM peuvent en avoir plusieurs)
    while ((match = ldJsonRegex.exec(html)) !== null) {
        try {
            const rawJson = (match[1] || "").trim();
            if (!rawJson) continue;
            const json = JSON.parse(rawJson);
            const items = json["@graph"] ? json["@graph"] : (Array.isArray(json) ? json : [json]);

            items.forEach(item => {
                const type = item["@type"];
                const isRecipe = (Array.isArray(type) ? type.includes("Recipe") : type === "Recipe");

                if (isRecipe) {
                    foundRecipe = true;
                    let localIssues = [];

                    // Vérification flexible de l'image (String, Object ou Array)
                    if (!item.image || (Array.isArray(item.image) && item.image.length === 0)) {
                        localIssues.push("MISSING: image");
                    }

                    if (!item.author) localIssues.push("no-author");
                    if (!item.recipeCuisine) localIssues.push("no-cuisine");
                    if (!item.keywords) localIssues.push("no-keywords");
                    if (!item.description) localIssues.push("no-desc");
                    if (!item.nutrition) localIssues.push("no-nutrition");

                    // Si on trouve une recette, on regarde si elle est "mieux" que la précédente
                    if (bestIssues === null || localIssues.length < bestIssues.length) {
                        bestIssues = localIssues;
                    }
                }
            });
        } catch (e) { continue; }
    }

    if (!foundRecipe) return "❌ No Recipe Schema Detected";
    return (bestIssues && bestIssues.length > 0) ? "⚠️ " + bestIssues.join(", ") : "✓ Full Schema";
}

/**
 * Affiche une petite aide.
 */
function showAuditHelp() {
    const html = `
    <div style="font-family: sans-serif;">
      <h3>📊 Guide du Système d'Audit</h3>
      <p>Ce système vous permet de surveiller la santé de vos sites WordPress.</p>
      <ul>
        <li><b>URL Publique :</b> Cliquez pour voir le rendu final.</li>
        <li><b>Lien d'Édition :</b> Vous emmène directement dans WordPress pour corriger l'article.</li>
        <li><b>Performance :</b> Le scan récupère 100 articles à la fois pour rester rapide.</li>
      </ul>
      <p><i>Note : Les colonnes Score Santé et Word Count arriveront dans la prochaine version.</i></p>
    </div>
  `;
    const ui = HtmlService.createHtmlOutput(html).setWidth(400).setHeight(300);
    SpreadsheetApp.getUi().showModalDialog(ui, "Audit Help");
}

/**
 * FONCTION DE TEST : Valide la lecture du Sitemap (V27).
 */
function testSitemapReading(sheet, row) {
    const triggerCell = sheet.getRange(row, 10);
    const siteName = sheet.getName().split("-")[1];

    try {
        triggerCell.setValue("🔍 Reading V27...");
        const accountConfig = getAccountConfigForSheet(`Data-${siteName}`);
        const sitemapUrl = accountConfig.sitemapUrl;

        _logCorrection(sheet, row, `V27 TEST - Source Col H: ${sitemapUrl || 'NOT FOUND'}`);

        if (!sitemapUrl) {
            triggerCell.setValue("Missing URL");
            return;
        }

        const urls = _getSitemapUrlsV27(sitemapUrl);

        if (urls.length > 0) {
            const first4 = urls.slice(0, 4);
            _logCorrection(sheet, row, `V27 SUCCESS: ${urls.length} URLs detected`);
            _logCorrection(sheet, row, "First 4 URLs:\n- " + first4.join("\n- "));
            triggerCell.setValue("SUCCESS ✅");
        } else {
            _logCorrection(sheet, row, "V27 ERROR: Sitemap is empty or parsing failed. Check Col H URL.");
            triggerCell.setValue("Empty Result");
        }

    } catch (e) {
        _logCorrection(sheet, row, "V27 FATAL ERROR: " + e.message);
        triggerCell.setValue("Error");
    }
}

/**
 * Récupère les URLs via XmlService (BASÉ SUR VOTRE CODE PROJET).
 * Version 27 avec support Index + Protection collision.
 */
function _getSitemapUrlsV27(sitemapUrl, depth = 0) {
    if (depth > 2) return [];
    try {
        const xml = UrlFetchApp.fetch(sitemapUrl).getContentText();
        const document = XmlService.parse(xml);
        const root = document.getRootElement();
        const namespace = XmlService.getNamespace('http://www.sitemaps.org/schemas/sitemap/0.9');

        // Support Sitemap Index (RankMath/Yoast)
        if (root.getName() === 'sitemapindex') {
            let childUrls = root.getChildren('sitemap', namespace).map(s => s.getChild('loc', namespace).getText());
            let targets = childUrls.filter(u => u.includes('post'));
            if (targets.length === 0) targets = childUrls;

            let all = [];
            targets.forEach(t => { all = all.concat(_getSitemapUrlsV27(t, depth + 1)); });
            return [...new Set(all)];
        }

        // Support Standard Sitemap (Votre code original ici)
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
 * Nettoie une URL pour comparaison (enlève query params, fragments et slash final).
 * Utilisé pour éviter l'auto-maillage SEO.
 */
function _normalizeUrl(url) {
    if (!url) return "";
    try {
        // Enlève query strings (?) et fragments (#)
        let clean = url.split('?')[0].split('#')[0];
        // Enlève slash de fin et passe en minuscule
        return clean.replace(/\/+$/, "").toLowerCase();
    } catch (e) {
        return url.toLowerCase();
    }
}

/**
 * Corrige la catégorie d'un article existant.
 * Déclenché par "CORRECT_CATEGORY" en colonne J.
 */
function correctCategoryForPost(sheet, row) {
    const triggerCell = sheet.getRange(row, 10);
    const postId = sheet.getRange(row, 1).getValue();
    const postTitle = sheet.getRange(row, 2).getValue();
    const siteName = sheet.getName().split("-")[1];

    if (!postId || !postTitle) {
        triggerCell.setValue("ID/Titre Manquant");
        return;
    }

    try {
        triggerCell.setValue("AI Processing...");
        const accountConfig = getAccountConfigForSheet(`Data-${siteName}`);

        // Appel de la fonction encapsulée
        const result = _updatePostCategoryWithAI(postId, postTitle, accountConfig);

        if (result.success) {
            sheet.getRange(row, 5).setValue(result.categoryName); // Mise à jour Col E
            _logCorrection(sheet, row, `Category Fixed: ${result.categoryName} (ID: ${result.categoryId})`);
            triggerCell.setValue("CAT FIXED ✅");
        } else {
            throw new Error(result.error);
        }

    } catch (e) {
        Logger.log(`CORRECT_CATEGORY Error Row ${row}: ${e.message}`);
        triggerCell.setValue("Error Cat");
        _logCorrection(sheet, row, "Cat Fix Error: " + e.message);
    }
}

/**
 * Fonction interne pour mettre à jour la catégorie d'un article via l'IA.
 * Encapsulée dans AuditHelper pour ne pas polluer l'espace global.
 * 
 * @param {string|number} postId L'ID de l'article WordPress.
 * @param {string} postTitle Le titre de l'article.
 * @param {object} siteConfig La configuration du site.
 * @returns {object} { success: boolean, categoryName: string, categoryId: number, error: string }
 */
function _updatePostCategoryWithAI(postId, postTitle, siteConfig) {
    try {
        // 1. Récupérer les catégories du site
        const username = siteConfig.wpUser;
        const password = siteConfig.wpAppPassword;
        const basicAuth = 'Basic ' + Utilities.base64Encode(username + ':' + password);
        let categories = _getWordPressCategories(basicAuth, siteConfig);

        if (!categories || categories.length === 0) {
            return { success: false, error: "Impossible de récupérer les catégories du site." };
        }

        // 2. Filtrer pour ignorer "Recipes" (insensible à la casse)
        const filteredCategories = categories.filter(cat => cat.name.toLowerCase() !== "recipes");

        if (filteredCategories.length === 0) {
            return { success: false, error: "Aucune catégorie disponible après filtrage de 'Recipes'." };
        }

        // 3. Choisir la meilleure catégorie via l'IA (Gemini Flash)
        // Note: getBestCategoryId est globale (WordPressHelper.js), on peut l'appeler.
        const categoryResult = getBestCategoryId(postTitle, filteredCategories);

        if (!categoryResult || !categoryResult.data) {
            return { success: false, error: "L'IA n'a pas pu choisir une catégorie." };
        }

        const chosenCategoryId = categoryResult.data;
        const chosenCategoryName = filteredCategories.find(c => c.id === chosenCategoryId)?.name || "Unknown";

        // 4. Mettre à jour WordPress
        const baseUrl = siteConfig.wpBaseUrl.replace(/\/$/, "");
        const updateUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;

        const payload = {
            categories: [chosenCategoryId] // On force une seule catégorie
        };

        const options = {
            'method': 'post',
            'headers': {
                'Authorization': basicAuth,
                'Content-Type': 'application/json'
            },
            'payload': JSON.stringify(payload),
            'muteHttpExceptions': true
        };

        const response = UrlFetchApp.fetch(updateUrl, options);
        if (response.getResponseCode() !== 200) {
            return { success: false, error: `Erreur WP: ${response.getContentText()}` };
        }

        return {
            success: true,
            categoryName: chosenCategoryName,
            categoryId: chosenCategoryId
        };

    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Fonction automatisée déclenchée par le temps (ex: toutes les 2h).
 * Parcourt les onglets AUDIT- et lance le SUPER_FIX sur les lignes marquées "RUN THIS ONE".
 */
function automatedSuperFixTrigger() {
    Logger.log("--- 🤖 Starting Automated Super Fix ---");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    for (const sheet of sheets) {
        const sheetName = sheet.getName();

        // On ne traite que les onglets d'Audit
        if (!sheetName.startsWith("AUDIT-")) continue;

        Logger.log(`Examining sheet: ${sheetName}`);

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) continue;

        // Lire la colonne J (Trigger) - Index 10
        const triggerData = sheet.getRange(2, 10, lastRow - 1, 1).getValues();

        for (let i = 0; i < triggerData.length; i++) {
            const rowValue = triggerData[i][0];
            const rowNumber = i + 2;

            if (rowValue === "RUN THIS ONE") {
                Logger.log(`🚀 Row ${rowNumber} marked "RUN THIS ONE" in ${sheetName}. Starting SUPER_FIX...`);

                // On lance la fonction existante
                try {
                    superFixArticle(sheet, rowNumber);
                    Logger.log(`✅ SUPER_FIX completed for row ${rowNumber} of ${sheetName}.`);
                } catch (e) {
                    Logger.log(`❌ Error during auto SUPER_FIX (row ${rowNumber}): ${e.message}`);
                }

                // TRES IMPORTANT: On s'arrête ici pour ne traiter qu'UNE ligne par cycle
                // Cela évite les Timeouts (6 min) de Google Apps Script.
                Logger.log("Mission accomplished. Stopping cycle to preserve GAS quota.");
                return;
            }
        }
    }

    Logger.log("Nothing to process for this cycle (no 'RUN THIS ONE' row found).");
}
