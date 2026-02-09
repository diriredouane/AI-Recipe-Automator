/**
 * @fileoverview Helper functions for creating documentation files during installation.
 * Creates Google Docs and exports them as PDFs.
 */

/**
 * Creates the Pabbly Setup Guide as a Google Doc with images, then exports as PDF.
 * @param {Folder} parentFolder The Drive folder where docs will be saved.
 * @param {Object} imageUrls Object containing URLs to the annotated images.
 * @returns {string} The ID of the created PDF file.
 */
function createPabblyGuideDocument(parentFolder) {
    // Create a new Google Doc
    const doc = DocumentApp.create('Pabbly Connect Setup Guide');
    const body = doc.getBody();

    // Style settings
    const headingStyle = {};
    headingStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    headingStyle[DocumentApp.Attribute.BOLD] = true;
    headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#1a73e8';

    const subheadingStyle = {};
    subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
    subheadingStyle[DocumentApp.Attribute.BOLD] = true;

    const normalStyle = {};
    normalStyle[DocumentApp.Attribute.FONT_SIZE] = 11;
    normalStyle[DocumentApp.Attribute.BOLD] = false;

    // Title
    body.appendParagraph('🔗 Pabbly Connect Setup Guide')
        .setHeading(DocumentApp.ParagraphHeading.HEADING1)
        .setAttributes(headingStyle);

    body.appendParagraph('This guide shows you how to configure Pabbly Connect to work with the Pinterest Automation script.')
        .setAttributes(normalStyle);

    body.appendHorizontalRule();

    // Pabbly Role Explanation
    body.appendParagraph('💡 Why Pabbly Connect?')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendParagraph('Pabbly Connect acts as the bridge between this Google Sheet, Pinterest, and your WordPress site. It handles the secure transfer of your images and data to ensure your Pins are published correctly and your articles are formatted perfectly.')
        .setAttributes(normalStyle);

    body.appendHorizontalRule();

    // Step 1: Import Workflows
    body.appendParagraph('Step 1: Import Pabbly Workflows')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('1. First, create an account on Pabbly Connect if you don\'t have one.')
        .setAttributes(normalStyle);
    body.appendParagraph('2. Then, you need to clone these 3 templates and fill them with your data.')
        .setAttributes(normalStyle);
    body.appendParagraph('Copy the links below and paste them into your browser:')
        .setAttributes(normalStyle);

    // Workflow Links Table
    const workflowTable = body.appendTable([
        ['Workflow Name', 'Workflow URL (Copy & Paste these links)'],
        ['1. List All Boards', 'https://connect.pabbly.com/v2/app/workflow/share/AUlUZlMECGsASgVvAGVQd19LAgZXDglqXURRQ1BfVCxRHAVAUxINZ1gUUXMDVFAxVx4AalYKBDlaTlFVUAYBclJLBQcAA1UvVRgBegVADT4BX1R8UzI#'],
        ['2. Read Board Detail', 'https://connect.pabbly.com/v2/app/workflow/share/CkJYalAHUjEHTQdtAWRQdwwYCw8IUVU2VUwDEQAPB38GS1QRBEVbMQtHUHJWAQVkUxoBa1UJVmsBFQEFB1EFdgMaADxXVFctUx5WLQZLATIKVFhwUDE#'],
        ['3. Post Pin', 'https://connect.pabbly.com/v2/app/workflow/share/XBRWZARTA2BVH1A6BGFUcw8bAAQBWAdkARgBE1ZZVCxQHQRBUxJaMA9DBCZTBAdmXxYDaQBcAz4LH1FVVQNWJQEYVmpXVFYsA04JcgVQX2xcAlZ-BGU#']
    ]);

    // Style table
    const headerRow = workflowTable.getRow(0);
    headerRow.getCell(0).setBackgroundColor('#1a73e8').editAsText().setForegroundColor('#ffffff').setBold(true);
    headerRow.getCell(1).setBackgroundColor('#1a73e8').editAsText().setForegroundColor('#ffffff').setBold(true);

    // Force remove links to ensure copy-paste
    const numRows = workflowTable.getNumRows();
    for (let i = 1; i < numRows; i++) {
        workflowTable.getRow(i).getCell(1).editAsText().setLinkUrl(null);
    }

    body.appendParagraph(''); // Spacer
    body.appendHorizontalRule();

    // Step 2: Connect Pinterest Account
    body.appendParagraph('Step 2: Connect Your Pinterest Account')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('⚠️ IMPORTANT: After importing, you must connect YOUR Pinterest account in each workflow!')
        .setAttributes(normalStyle)
        .setBackgroundColor('#fff3cd');

    const step1List = body.appendListItem('Open any step that uses Pinterest (e.g., "Create Pin").');
    step1List.setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Click the blue "Connected" button.').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('If not connected, click to authorize your Pinterest account.').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Once connected, click "Refresh Fields".').setGlyphType(DocumentApp.GlyphType.NUMBER);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.pabbly_connect);
    body.appendParagraph(''); // Spacer
    body.appendHorizontalRule();

    // Step 3: Get Webhook URL
    body.appendParagraph('Step 3: Get the Webhook URL from Pabbly')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('Each Pabbly workflow has a unique Webhook URL that you need to copy.')
        .setAttributes(normalStyle);

    body.appendListItem('Open your Pabbly workflow.').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Click on the Trigger step (first step).').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Find the "Webhook URL" field.').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Copy this URL (click the copy icon).').setGlyphType(DocumentApp.GlyphType.NUMBER);

    body.appendParagraph('Paste these URLs in your Google Sheet\'s Config_Accounts tab in the corresponding columns:')
        .setAttributes(normalStyle);
    body.appendListItem('"Pabbly Main Webhook" column (for the Post Pin workflow)').setGlyphType(DocumentApp.GlyphType.BULLET);
    body.appendListItem('"Pabbly List Webhook" column (for the List All Boards workflow)').setGlyphType(DocumentApp.GlyphType.BULLET);
    body.appendListItem('"Pabbly Board Info Webhook" column (for the Read Board Detail workflow)').setGlyphType(DocumentApp.GlyphType.BULLET);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.pabbly_webhook);
    body.appendParagraph(''); // Spacer
    body.appendHorizontalRule();

    // Step 4: Set Web App URL
    body.appendParagraph('Step 4: Set the Web App URL in Pabbly')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('Your Pabbly workflow needs to call back to your Google Apps Script Web App.')
        .setAttributes(normalStyle);

    body.appendListItem('In Pabbly, find the "API (Pabbly)" action step (usually at the end).').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Make sure Action Event is set to "Execute API Request".').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Find the "API Endpoint URL" field.').setGlyphType(DocumentApp.GlyphType.NUMBER);
    body.appendListItem('Paste your Web App URL here.').setGlyphType(DocumentApp.GlyphType.NUMBER);

    body.appendParagraph('⚠️ Your Web App URL looks like: https://script.google.com/macros/s/XXXXX/exec')
        .setAttributes(normalStyle)
        .setBackgroundColor('#fff3cd');

    body.appendParagraph('Get it from: Extensions > Apps Script > Deploy > Manage Deployments')
        .setAttributes(normalStyle);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.pabbly_webapp);
    body.appendParagraph(''); // Spacer
    body.appendHorizontalRule();

    // Summary Table
    body.appendParagraph('Summary')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    const table = body.appendTable([
        ['What to Copy', 'Where to Paste'],
        ['Pabbly Webhook URL', 'Google Sheet Config_Accounts'],
        ['Web App URL', 'Pabbly "API Endpoint URL" field']
    ]);

    // Style table header
    table.getRow(0).getCell(0).setBackgroundColor('#1a73e8').editAsText().setForegroundColor('#ffffff').setBold(true);
    table.getRow(0).getCell(1).setBackgroundColor('#1a73e8').editAsText().setForegroundColor('#ffffff').setBold(true);

    // Save and close the document
    body.appendHorizontalRule();

    // Support & Contact
    body.appendParagraph('🤝 Contact & Support')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('This project was created by Redouane Diri.')
        .setAttributes(normalStyle);

    body.appendListItem('Email: redouane.diri@gmail.com');
    body.appendListItem('For any questions or custom modification requests, feel free to reach out!');

    body.appendHorizontalRule();

    doc.saveAndClose();

    // Move the doc to the parent folder
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(parentFolder);

    // Export as PDF
    const pdfBlob = docFile.getAs('application/pdf');
    pdfBlob.setName('Pabbly Connect Setup Guide.pdf');
    const pdfFile = parentFolder.createFile(pdfBlob);

    // Delete the Google Doc (keep only PDF)
    docFile.setTrashed(true);

    const pdfUrl = pdfFile.getUrl();
    PropertiesService.getScriptProperties().setProperty('PDF_PABBLY_URL', pdfUrl);

    Logger.log(`✅ Created Pabbly Guide PDF (ID: ${pdfFile.getId()}). URL: ${pdfUrl}`);

    return {
        pdfId: pdfFile.getId()
    };
}

/**
 * Creates a Documentation folder and generates all guide PDFs.
 * @param {Folder} parentFolder The main project folder.
 * @returns {Folder} The created Documentation folder.
 */
function createDocumentationFolder(parentFolder) {
    // Create Documentation subfolder
    const docFolder = parentFolder.createFolder('📚 Documentation');

    // Create Pabbly Guide
    createPabblyGuideDocument(docFolder);

    // Create WordPress Guide
    createWordPressGuideDocument(docFolder);

    // Create WordPress Snippet File
    createWordPressSnippetFile(docFolder);

    Logger.log(`✅ Documentation folder created with guides.`);
    return docFolder;
}

/**
 * Creates the WordPress PHP snippet file on Drive.
 * @param {Folder} parentFolder The Drive folder where the file will be saved.
 */
function createWordPressSnippetFile(parentFolder) {
    const fileName = 'wp-functions-snippet.php';
    const existingFiles = parentFolder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
    }

    const file = parentFolder.createFile(fileName, WP_FUNCTIONS_SNIPPET, 'text/plain');
    const fileUrl = file.getUrl();
    PropertiesService.getScriptProperties().setProperty('SNIPPET_PHP_URL', fileUrl);

    Logger.log(`✅ Created PHP Snippet file (ID: ${file.getId()}). URL: ${fileUrl}`);
    return fileUrl;
}

/**
 * Finds existing documentation PDFs in the '📚 Documentation' folder 
 * and updates their URLs in Script Properties.
 * Useful if the user already has the folder but properties are missing.
 */
function refreshDocumentationLinks() {
    const parentFolderId = PropertiesService.getScriptProperties().getProperty('PARENT_FOLDER_ID');
    if (!parentFolderId) {
        throw new Error('Project not installed. Please run installation first.');
    }

    const parentFolder = DriveApp.getFolderById(parentFolderId);
    const docFolders = parentFolder.getFoldersByName('📚 Documentation');

    if (!docFolders.hasNext()) {
        throw new Error('Documentation folder not found.');
    }

    const docFolder = docFolders.next();
    updateDocumentationProperties(docFolder);

    Logger.log('✅ Documentation links refreshed.');
    return 'Documentation links refreshed successfully.';
}

/**
 * Creates the WordPress Setup Guide as a Google Doc, then exports as PDF.
 * @param {Folder} parentFolder The Drive folder where docs will be saved.
 */
function createWordPressGuideDocument(parentFolder) {
    const doc = DocumentApp.create('WordPress Setup Guide');
    const body = doc.getBody();

    // Style settings
    const headingStyle = {};
    headingStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    headingStyle[DocumentApp.Attribute.BOLD] = true;
    headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#1a73e8';

    const subheadingStyle = {};
    subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
    subheadingStyle[DocumentApp.Attribute.BOLD] = true;

    const normalStyle = {};
    normalStyle[DocumentApp.Attribute.FONT_SIZE] = 11;

    // Title
    body.appendParagraph('🔧 WordPress Setup Guide')
        .setHeading(DocumentApp.ParagraphHeading.HEADING1)
        .setAttributes(headingStyle);

    body.appendParagraph('Configure your site to receive data from the Pinterest Automation script.')
        .setAttributes(normalStyle);

    body.appendHorizontalRule();

    // Step 1: Plugins
    body.appendParagraph('Step 1: Install Required Plugins')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendListItem('Rank Math SEO').setAttributes(normalStyle);
    body.appendListItem('WP Recipe Maker').setAttributes(normalStyle);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.wp_recipe);
    body.appendParagraph(''); // Spacer

    // Step 2: Theme Editor
    body.appendParagraph('Step 2: Open Theme File Editor')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendParagraph('Go to Appearance > Theme file editor.').setAttributes(normalStyle);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.wp_editor);
    body.appendParagraph(''); // Spacer

    // Step 3: functions.php
    body.appendParagraph('Step 3: Select functions.php')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendParagraph('Select "Theme Functions (functions.php)" on the right sidebar.').setAttributes(normalStyle);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.wp_functions_file);
    body.appendParagraph(''); // Spacer

    // Step 4: Paste Code
    body.appendParagraph('Step 4: Paste Code')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendParagraph('Paste the contents of "wp-functions-snippet.php" at the bottom of the file.').setAttributes(normalStyle);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.wp_paste_location);
    body.appendParagraph(''); // Spacer

    // Step 5: Save
    body.appendParagraph('Step 5: Save Changes')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendParagraph('Click the blue "Update File" button.').setAttributes(normalStyle);

    body.appendParagraph(''); // Spacer
    appendBase64Image(body, IMAGE_ASSETS.wp_update_file);
    body.appendParagraph(''); // Spacer

    body.appendHorizontalRule();

    // Configuration in Sheet
    body.appendParagraph('⚙️ Configuration in Google Sheet')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('In your Config_Accounts tab, ensure the following columns are filled correctly:')
        .setAttributes(normalStyle);

    body.appendListItem('WP Base URL: Your website address (e.g., https://yoursite.com).');
    body.appendListItem('WP User: Your WordPress username.');
    body.appendListItem('WP App Password: An Application Password generated in WordPress (Users > Profile).');
    body.appendListItem('WP Author ID: The ID of the user who will be the author of the posts.');
    body.appendListItem('Facebook URL: Your Facebook page link. Used as an external reference to boost your SEO.');
    body.appendListItem('Sitemap URL: Your site sitemap (e.g., https://yoursite.com/sitemap_index.xml) for internal linking.');
    body.appendListItem('WP Recipe API: Internal toggle for the recipe plugin integration.');
    body.appendListItem('Max Posts / Day: The number of posts you want the script to generate per day.');
    body.appendListItem('Daily Counter: Keeps track of how many posts were sent today.');
    body.appendListItem('Last Reset Date: The date of the last daily counter reset (managed automatically).');

    body.appendHorizontalRule();

    body.appendHorizontalRule();

    // Support & Contact
    body.appendParagraph('🤝 Contact & Support')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('This project was created by Redouane Diri.')
        .setAttributes(normalStyle);

    body.appendListItem('Email: redouane.diri@gmail.com');
    body.appendListItem('For any questions or custom modification requests, feel free to reach out!');

    body.appendHorizontalRule();

    doc.saveAndClose();

    // Move and export
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(parentFolder);

    const pdfBlob = docFile.getAs('application/pdf');
    pdfBlob.setName('WordPress Setup Guide.pdf');
    const pdfFile = parentFolder.createFile(pdfBlob);

    // Delete doc
    docFile.setTrashed(true);

    const pdfUrl = pdfFile.getUrl();
    PropertiesService.getScriptProperties().setProperty('PDF_WORDPRESS_URL', pdfUrl);

    Logger.log(`✅ Created WordPress Guide PDF (ID: ${pdfFile.getId()}). URL: ${pdfUrl}`);
}

/**
 * Copies the Master Documentation Folder to the user's project folder.
 * @param {Folder} parentFolder The folder where the documentation should be copied.
 * @returns {Folder} The new copied documentation folder.
 */
function copyDocumentationFolder(parentFolder) {
    const masterFolderId = CONFIG.MASTER_DOC_FOLDER_ID;

    if (!masterFolderId) {
        Logger.log('⚠️ Master Documentation Folder ID not found in CONFIG.');
        return null;
    }

    try {
        const masterFolder = DriveApp.getFolderById(masterFolderId);
        const folderName = '📚 Documentation';

        // Remove existing folder if any
        const existing = parentFolder.getFoldersByName(folderName);
        if (existing.hasNext()) {
            existing.next().setTrashed(true);
        }

        const newDocFolder = parentFolder.createFolder(folderName);

        // Copy all files
        const files = masterFolder.getFiles();
        while (files.hasNext()) {
            const file = files.next();
            file.makeCopy(file.getName(), newDocFolder);
        }

        Logger.log(`✅ Documentation folder copied from master.`);

        // Update Script Properties with the NEW file URLs
        updateDocumentationProperties(newDocFolder);

        return newDocFolder;
    } catch (e) {
        Logger.log(`❌ Error copying documentation: ${e.message}`);
        return null;
    }
}

/**
 * Updates Script Properties with the URLs of the documentation files in the given folder.
 * @param {Folder} docFolder The folder containing the documentation files.
 */
function updateDocumentationProperties(docFolder) {
    const props = PropertiesService.getScriptProperties();

    // Pabbly Guide
    const pabblyFiles = docFolder.getFilesByName('Pabbly Connect Setup Guide.pdf');
    if (pabblyFiles.hasNext()) {
        const file = pabblyFiles.next();
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const url = file.getUrl();
        props.setProperty('PDF_PABBLY_URL', url);
        Logger.log('🔗 Pabbly PDF URL updated: ' + url);
    }

    // WordPress Guide
    const wpFiles = docFolder.getFilesByName('WordPress Setup Guide.pdf');
    if (wpFiles.hasNext()) {
        const file = wpFiles.next();
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const url = file.getUrl();
        props.setProperty('PDF_WORDPRESS_URL', url);
        Logger.log('🔗 WordPress PDF URL updated: ' + url);
    }

    // Getting Started Guide
    const gsFiles = docFolder.getFilesByName('Getting Started Guide.pdf');
    if (gsFiles.hasNext()) {
        const file = gsFiles.next();
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const url = file.getUrl();
        props.setProperty('PDF_GETTING_STARTED_URL', url);
        Logger.log('🔗 Getting Started PDF URL updated: ' + url);
    }

    // Slides Guide
    const slidesFiles = docFolder.getFilesByName('Google Slides Templates Guide.pdf');
    if (slidesFiles.hasNext()) {
        const file = slidesFiles.next();
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const url = file.getUrl();
        props.setProperty('PDF_SLIDES_GUIDE_URL', url);
        Logger.log('🔗 Slides Guide PDF URL updated: ' + url);
    }

    // PHP Snippet
    const snippetFiles = docFolder.getFilesByName('wp-functions-snippet.php');
    if (snippetFiles.hasNext()) {
        const file = snippetFiles.next();
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const url = file.getUrl();
        props.setProperty('SNIPPET_PHP_URL', url);
        Logger.log('🔗 PHP Snippet URL updated: ' + url);
    }
}

/**
 * Helper to append a base64 image to a document body.
 * @param {Body} body The body of the document.
 * @param {string} base64Data The base64 encoded image string.
 */
function appendBase64Image(body, base64Data) {
    if (!base64Data) return;
    try {
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png');
        const img = body.appendImage(blob);

        // Scale image if it's too wide (A4 is ~595 pts, margins ~72 pts each)
        // Max width around 450 pts
        const maxWidth = 450;
        const width = img.getWidth();
        const height = img.getHeight();

        if (width > maxWidth) {
            const ratio = maxWidth / width;
            img.setWidth(maxWidth);
            img.setHeight(height * ratio);
        }
    } catch (e) {
        Logger.log(`❌ Error appending image: ${e.message}`);
    }
}

/**
 * Helper to append an image from Google Drive to a document body.
 * @param {Body} body The body of the document.
 * @param {string} fileId The Drive file ID of the image.
 */
function appendDriveImage(body, fileId) {
    if (!fileId) return;
    try {
        const blob = DriveApp.getFileById(fileId).getBlob();
        const img = body.appendImage(blob);

        // Scale image if it's too wide
        const maxWidth = 450;
        const width = img.getWidth();
        const height = img.getHeight();

        if (width > maxWidth) {
            const ratio = maxWidth / width;
            img.setWidth(maxWidth);
            img.setHeight(height * ratio);
        }
    } catch (e) {
        Logger.log(`❌ Error appending Drive image (${fileId}): ${e.message}`);
    }
}

/**
 * Creates the Getting Started Guide as a Google Doc, then exports as PDF.
 * @param {Folder} parentFolder The Drive folder where docs will be saved.
 */
function createGettingStartedGuide(parentFolder) {
    const doc = DocumentApp.create('Getting Started Guide');
    const body = doc.getBody();

    // Style settings
    const headingStyle = {};
    headingStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    headingStyle[DocumentApp.Attribute.BOLD] = true;
    headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#e60023'; // Pinterest Red

    const subheadingStyle = {};
    subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
    subheadingStyle[DocumentApp.Attribute.BOLD] = true;

    const normalStyle = {};
    normalStyle[DocumentApp.Attribute.FONT_SIZE] = 11;

    // Title
    body.appendParagraph('🚀 Pinterest Automation - Getting Started Guide')
        .setHeading(DocumentApp.ParagraphHeading.HEADING1)
        .setAttributes(headingStyle);

    body.appendParagraph('Welcome to your new Pinterest Automation tool! Follow these simple steps to get everything up and running in minutes.')
        .setAttributes(normalStyle);

    // Global Project Overview
    body.appendParagraph('🌐 Project Overview: From Input to Automation')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('This suite automates the entire journey from a single recipe photo to a published article and Pinterest Pin:')
        .setAttributes(normalStyle);

    body.appendListItem('Input (Google Sheets): You provide a Recipe Title and a Photo URL.');
    body.appendListItem('AI Brain (Gemini): The script uses AI to analyze your photo and write a professional, SEO-optimized article.');
    body.appendListItem('Design Engine (Google Slides): Custom branded Pins are generated automatically using your Slides templates.');
    body.appendListItem('Bridge (Pabbly Connect): Securely routes your data and images to your website and Pinterest.');
    body.appendListItem('Output (WordPress & Pinterest): A fully published post and a branded Pin, linked for SEO impact.');

    body.appendParagraph('By following this guide, you will set up each block to work in perfect harmony.')
        .setAttributes(normalStyle);

    body.appendHorizontalRule();

    // Step 1
    body.appendParagraph('Step 1: Install the Project')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendListItem('Open your Google Sheet.');
    body.appendListItem('In the menu bar, click on 🏁 START HERE.');
    body.appendListItem('Select Install / Reset Project.');
    body.appendListItem('Wait for the script to finish (creates sheets and folders).');
    body.appendParagraph('[Image: Install Menu]').setAttributes(normalStyle).setItalic(true);

    // Step 2: Web App Deployment
    body.appendParagraph('Step 2: Deploy as Web App (Webhook Setup)')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendListItem('Open the Extensions menu and select Apps Script.');
    appendBase64Image(body, IMAGE_ASSETS.webapp_ext_menu);

    body.appendListItem('Click the "Deploy" button and choose "New deployment".');
    appendBase64Image(body, IMAGE_ASSETS.webapp_deploy_btn);

    body.appendListItem('Select "Web App" as the type, set access to "Anyone", and click "Deploy".');
    appendBase64Image(body, IMAGE_ASSETS.webapp_config);

    body.appendListItem('Copy the generated Web App URL.');
    appendBase64Image(body, IMAGE_ASSETS.webapp_url_copy);

    body.appendListItem('In Pabbly Connect, paste this URL into the Webhook URL field of your Pabbly main trigger.');
    appendBase64Image(body, IMAGE_ASSETS.webapp_pabbly_config);

    body.appendListItem('Click "Send Test Request" in Pabbly to verify the connection.');
    appendBase64Image(body, IMAGE_ASSETS.webapp_test);

    body.appendListItem('You can now see the "⚡ ACTIONS" menu in your Google Sheet.');
    appendBase64Image(body, IMAGE_ASSETS.webapp_actions_menu);

    body.appendHorizontalRule();

    // Step 3
    body.appendParagraph('Step 3: Add Your Gemini API Key')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendListItem('Go to the new Setting tab.');
    body.appendListItem('In cell B2, paste your Gemini API Key.');
    body.appendParagraph('[Image: Setting Tab]').setAttributes(normalStyle).setItalic(true);

    body.appendHorizontalRule();

    // Step 4
    body.appendParagraph('Step 4: Configure Your Site')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendListItem('Go to the Config_Accounts tab.');
    body.appendListItem('Fill in Site Name, Active status, WP User, App Password.');
    body.appendParagraph('[Image: Config_Accounts Tab]').setAttributes(normalStyle).setItalic(true);

    body.appendHorizontalRule();

    // Boards Management Section
    body.appendParagraph('📋 Pinterest Boards Management')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('The "Boards" sheet acts as your database of all available Pinterest boards. To fill or update it:')
        .setAttributes(normalStyle);

    body.appendListItem('Go to the ⚡ ACTIONS menu.');
    body.appendListItem('Select "2. Get/Sync All Pinterest Boards". This sends a request to fetch all boards for every site configured in Config_Accounts.');
    body.appendListItem('Wait a few minutes: The boards will appear progressively in the "Boards" tab.');
    body.appendListItem('Update regularly: Run this again if you create new boards on Pinterest or want to refresh your follower/pin counts.');

    body.appendHorizontalRule();

    // Step 5 - Pabbly (Updated with Links)
    body.appendParagraph('Step 5: Pabbly Connect Setup (One-Time)')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('1. First, create an account on Pabbly Connect if you don\'t have one.')
        .setAttributes(normalStyle);
    body.appendParagraph('2. Then, you need to clone these 3 templates and fill them with your data.')
        .setAttributes(normalStyle);
    body.appendParagraph('Copy the links below and paste them into your browser:')
        .setAttributes(normalStyle);

    // Pabbly Links Table
    const table = body.appendTable([
        ['Workflow Name', 'Workflow URL (Copy & Paste these links)'],
        ['1. List All Boards', 'https://connect.pabbly.com/v2/app/workflow/share/AUlUZlMECGsASgVvAGVQd19LAgZXDglqXURRQ1BfVCxRHAVAUxINZ1gUUXMDVFAxVx4AalYKBDlaTlFVUAYBclJLBQcAA1UvVRgBegVADT4BX1R8UzI#'],
        ['2. Read Board Detail', 'https://connect.pabbly.com/v2/app/workflow/share/CkJYalAHUjEHTQdtAWRQdwwYCw8IUVU2VUwDEQAPB38GS1QRBEVbMQtHUHJWAQVkUxoBa1UJVmsBFQEFB1EFdgMaADxXVFctUx5WLQZLATIKVFhwUDE#'],
        ['3. Post Pin', 'https://connect.pabbly.com/v2/app/workflow/share/XBRWZARTA2BVH1A6BGFUcw8bAAQBWAdkARgBE1ZZVCxQHQRBUxJaMA9DBCZTBAdmXxYDaQBcAz4LH1FVVQNWJQEYVmpXVFYsA04JcgVQX2xcAlZ-BGU#']
    ]);

    // Style table
    const headerRow = table.getRow(0);
    headerRow.getCell(0).setBackgroundColor('#e60023').editAsText().setForegroundColor('#ffffff').setBold(true);
    headerRow.getCell(1).setBackgroundColor('#e60023').editAsText().setForegroundColor('#ffffff').setBold(true);

    // Force remove links to ensure copy-paste
    const numRows = table.getNumRows();
    for (let i = 1; i < numRows; i++) {
        table.getRow(i).getCell(1).editAsText().setLinkUrl(null);
    }

    body.appendParagraph('⚠️ Important:').setAttributes(normalStyle).setBold(true);
    body.appendListItem('Import each workflow.');
    body.appendListItem('Reconnect your Pinterest & Google accounts inside Pabbly.');
    body.appendListItem('Copy the Webhook URL from the first step (Trigger).');
    body.appendListItem('Paste them into the Config_Accounts sheet in the columns: "Pabbly Main Webhook", "Pabbly List Webhook", and "Pabbly Board Info Webhook".');

    body.appendParagraph('[Image: Pabbly Setup]').setAttributes(normalStyle).setItalic(true);

    body.appendHorizontalRule();

    // Google Slides Templates
    body.appendParagraph('🎨 Google Slides Templates')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('The script uses 3 Google Slides templates to generate your images automatically:')
        .setAttributes(normalStyle);

    body.appendListItem('Pin Slide Template: Used to create the main Pinterest Pin (Standard format).');
    body.appendListItem('Collage Slide Template: Used to create a collage image that is placed INSIDE your WordPress article.');
    body.appendListItem('WP Featured Image Template: Conditional usage. If empty, the script uses your original photo. If used, it applies your design/frame to the featured image.');

    body.appendHorizontalRule();

    // Step 6
    body.appendParagraph('Step 6: Create Data Sheets')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendListItem('Click on ⚡ ACTIONS > 1. Create Site Sheets.');
    body.appendParagraph('[Image: Create Sheets Menu]').setAttributes(normalStyle).setItalic(true);

    body.appendHorizontalRule();

    // Step 7
    body.appendParagraph('Step 7: Start Automating!')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);
    body.appendListItem('Go to your new Data tab.');
    body.appendListItem('Enter Recipe Title (Col C) and Photo URL (Col D).');
    body.appendListItem('⚠️ IMPORTANT: The photo must be in 1:1 (Square) format for best results.').setBold(true);
    body.appendListItem('Select OK in the Trigger column.');
    body.appendParagraph('[Image: Data Tab]').setAttributes(normalStyle).setItalic(true);

    body.appendHorizontalRule();

    // Results & Trigger Options
    body.appendParagraph('🎯 Understanding Triggers & Results')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('You can control exactly what the script does by typing these keywords in the **Trigger** column:')
        .setAttributes(normalStyle);

    body.appendListItem('✅ OK: The "All-in-One" option. It generates the SEO article, publishes it to WordPress, creates a custom Pinterest Pin, and publishes it automatically.');
    body.appendListItem('📝 DRAFT: Same as OK, but the article stays as a "Draft" in WordPress so you can review it before it goes live.');
    body.appendListItem('📌 PIN: Only creates and publishes the Pinterest Pin using your Slide templates. No WordPress article is created.');
    body.appendListItem('🔗 PIN_LINK: Creates a Pin and links it to an article that is already published on your site.');
    body.appendListItem('🛠️ ADD_CARD: Extracts recipe data from your text and adds a professional WP Recipe Maker card to an existing post.');

    body.appendHorizontalRule();

    // Automation Limits Section
    body.appendParagraph('🛡️ Automation Limits')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('Manage your daily volume directly in the Config_Accounts tab:')
        .setAttributes(normalStyle);

    body.appendListItem('Max Posts / Day: Set your desired number of posts per 24 hours.');
    body.appendListItem('Daily Counter: Shows current progress. Resets to 0 every day.');
    body.appendListItem('Last Reset Date: Internally tracked to ensure the counter resets at the right time.');

    body.appendHorizontalRule();

    // Results & Data Columns
    body.appendParagraph('📊 Understanding the Results (Output Columns)')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('After the automation runs, the script fills these columns with useful data:')
        .setAttributes(normalStyle);

    body.appendListItem('wordpress_edit_url & wordpress_public_url: Quick links to edit your post or view it on your site.');
    body.appendListItem('pin_image_url: The direct link to your newly generated branded Pin image.');
    body.appendListItem('pin_id & pin_url: The unique Pinterest ID and the public link to your Pin.');
    body.appendListItem('board_id: The ID of the Pinterest board used for this Pin.');
    body.appendListItem('error_message: If a step fails, you will find the explanation here.');
    body.appendListItem('image_to_text_result: The detailed AI description of your photo (used for your article SEO).');
    body.appendListItem('title_char_count: Automatically calculates the length of your title (helpful for Pinterest limits).');
    body.appendListItem('publication_date: The exact date the automation was completed.');

    body.appendHorizontalRule();

    // Support & Contact
    body.appendParagraph('🤝 Contact & Support')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('This project was created by Redouane Diri.')
        .setAttributes(normalStyle);

    body.appendListItem('Email: redouane.diri@gmail.com');
    body.appendListItem('For any questions or custom modification requests, feel free to reach out!');

    body.appendHorizontalRule();

    doc.saveAndClose();

    // Move to folder and export PDF
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(parentFolder);

    const pdfBlob = docFile.getAs('application/pdf');
    pdfBlob.setName('Getting Started Guide.pdf');
    const pdfFile = parentFolder.createFile(pdfBlob);

    // Trash original doc
    docFile.setTrashed(true);

    const pdfUrl = pdfFile.getUrl();
    PropertiesService.getScriptProperties().setProperty('PDF_GETTING_STARTED_URL', pdfUrl);

    Logger.log(`✅ Created Getting Started Guide PDF (ID: ${pdfFile.getId()}). URL: ${pdfUrl}`);
}

/**
 * Creates the Google Slides Templates Customization Guide as a Google Doc, then exports as PDF.
 * @param {Folder} parentFolder The Drive folder where docs will be saved.
 */
function createSlidesGuideDocument(parentFolder) {
    const doc = DocumentApp.create('Google Slides Templates Guide');
    const body = doc.getBody();

    // Style settings
    const headingStyle = {};
    headingStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    headingStyle[DocumentApp.Attribute.BOLD] = true;
    headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = '#ff9900'; // Google Slides Orange

    const subheadingStyle = {};
    subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
    subheadingStyle[DocumentApp.Attribute.BOLD] = true;

    const normalStyle = {};
    normalStyle[DocumentApp.Attribute.FONT_SIZE] = 11;

    const alertStyle = {};
    alertStyle[DocumentApp.Attribute.BACKGROUND_COLOR] = '#fff2cc';
    alertStyle[DocumentApp.Attribute.ITALIC] = true;

    // Title
    body.appendParagraph('🎨 Google Slides Templates Customization Guide')
        .setHeading(DocumentApp.ParagraphHeading.HEADING1)
        .setAttributes(headingStyle);

    body.appendParagraph('This guide explains how to safely customize the visual design of your Google Slides templates while ensuring the automation script continues to function correctly.')
        .setAttributes(normalStyle);

    body.appendHorizontalRule();

    // The Three Templates
    body.appendParagraph('📱 The Three Essential Templates')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('The project uses three distinct templates to generate images. Each serves a specific purpose:')
        .setAttributes(normalStyle);

    body.appendListItem('Pin Slide Template: Generates the standard vertical Pin image for Pinterest.').setAttributes(normalStyle);
    body.appendListItem('Collage Slide Template: Generates a collage image that is placed INSIDE your WordPress article.').setAttributes(normalStyle);
    body.appendListItem('WP Featured Image Template: Conditional usage. If the template is empty, the script uses the original photo. If used, it applies your custom design/frame to the featured image.').setAttributes(normalStyle);

    body.appendHorizontalRule();

    // Configuration in Sheet
    body.appendParagraph('⚙️ Configuration in Google Sheet')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('Once you have designed your templates, copy their IDs from the URL and paste them into your Config_Accounts tab in the following columns:')
        .setAttributes(normalStyle);

    body.appendListItem('"Pin Slide Template ID"');
    body.appendListItem('"Collage Slide Template ID"');
    body.appendListItem('"WP Featured Image Template ID"');

    body.appendParagraph(''); // Spacer
    body.appendParagraph('💡 Where to find the ID: The ID is the long string of characters in the URL of your Google Slides presentation: \n docs.google.com/presentation/d/ [THIS_IS_YOUR_ID] /edit')
        .setAttributes(alertStyle);

    body.appendHorizontalRule();

    // WHAT YOU CAN CHANGE
    body.appendParagraph('✅ What You CAN Change')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('You are free to modify the aesthetics to match your brand:')
        .setAttributes(normalStyle);

    body.appendListItem('Fonts & Typography: Change the font family, color, and weight of any text.').setAttributes(normalStyle);
    body.appendListItem('Colors & Branding: Change background colors, shape colors, and add your logo.').setAttributes(normalStyle);
    body.appendListItem('Layout & Positioning: Move elements around (as long as they remain on the slide).').setAttributes(normalStyle);

    body.appendHorizontalRule();

    // THE GOLDEN RULE (WHAT NOT TO CHANGE)
    body.appendParagraph('❌ WHAT NOT TO CHANGE (The Golden Rule)')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle)
        .setForegroundColor('#cc0000');

    body.appendParagraph('To keep the automation working, you MUST NOT modify the "Description" (Alt Text) of the elements. The script uses these descriptions to find where to put the image and title.')
        .setAttributes(normalStyle);

    body.appendParagraph('⚠️ DO NOT RENAME THE DESCRIPTION OF THESE ELEMENTS:').setBold(true).setAttributes(normalStyle);

    const tagTable = body.appendTable([
        ['Element Type', 'Required Description (Alt Text)', 'What the script does'],
        ['Image', 'image principale', 'Replaces this with your main recipe photo.'],
        ['Text Box / Shape', 'Titre', 'Replaces the text with your generated title.'],
        ['Image (Collage only)', 'image principale 2', 'Replaces this with the second collage photo.']
    ]);

    // Style table
    tagTable.getRow(0).getCell(0).setBackgroundColor('#ff9900').editAsText().setForegroundColor('#ffffff').setBold(true);
    tagTable.getRow(0).getCell(1).setBackgroundColor('#ff9900').editAsText().setForegroundColor('#ffffff').setBold(true);
    tagTable.getRow(0).getCell(2).setBackgroundColor('#ff9900').editAsText().setForegroundColor('#ffffff').setBold(true);

    body.appendParagraph(''); // Spacer
    body.appendParagraph('💡 How to set the description: \nRight-click an element in Google Slides > Alt Text (or Format Options > Alt Text) > Type the name exactly in the "Description" field (not Title).')
        .setAttributes(alertStyle);

    body.appendHorizontalRule();

    // Final Warning
    body.appendParagraph('Step 1: Open your template in Google Slides.')
        .setAttributes(normalStyle);
    body.appendParagraph('Step 2: Edit your colors, fonts, and graphics.')
        .setAttributes(normalStyle);
    body.appendParagraph('Step 3: Ensure the elements have the correct "Description" as listed above.')
        .setAttributes(normalStyle);
    body.appendParagraph('Step 4: Save and let the script do the rest!')
        .setAttributes(normalStyle);

    body.appendParagraph('[Image: Slider Customization Placeholder]').setAttributes(normalStyle).setItalic(true);

    body.appendHorizontalRule();

    // Support & Contact
    body.appendParagraph('🤝 Contact & Support')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2)
        .setAttributes(subheadingStyle);

    body.appendParagraph('This project was created by Redouane Diri.')
        .setAttributes(normalStyle);

    body.appendListItem('Email: redouane.diri@gmail.com');
    body.appendListItem('For any questions or custom modification requests, feel free to reach out!');

    body.appendHorizontalRule();

    doc.saveAndClose();

    // Move to folder and export PDF
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(parentFolder);

    const pdfBlob = docFile.getAs('application/pdf');
    pdfBlob.setName('Google Slides Templates Guide.pdf');
    const pdfFile = parentFolder.createFile(pdfBlob);

    // Trash original doc
    docFile.setTrashed(true);

    const pdfUrl = pdfFile.getUrl();
    PropertiesService.getScriptProperties().setProperty('PDF_SLIDES_GUIDE_URL', pdfUrl);

    Logger.log(`✅ Created Google Slides Templates Guide PDF. URL: ${pdfUrl}`);
}
