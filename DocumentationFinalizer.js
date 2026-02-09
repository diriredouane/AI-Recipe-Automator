/**
 * @fileoverview ONE-TIME USE ONLY.
 * Run the function runOneTimeGeneration() to create the final PDFs 
 * and get the URLs to put in Config.js.
 */

function runOneTimeGeneration() {
    const folderId = '1QMIHEkkNkAOYSIRcgU2ipKPfENLkolRx';
    const finalDocFolder = DriveApp.getFolderById(folderId);

    Logger.log('--- STARTING GENERATION ---');

    // 1. Generate Pabbly PDF
    const pabblyResult = createPabblyGuideDocument(finalDocFolder);
    const pabblyFile = DriveApp.getFileById(pabblyResult.pdfId);
    pabblyFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    Logger.log('PABBLY PDF URL: ' + pabblyFile.getUrl());

    // 2. Generate WordPress PDF
    // Note: We need to temporarily define createWordPressGuideDocument if it's already deleted
    // but for now it's still in DocumentationHelper.js
    createWordPressGuideDocument(finalDocFolder);
    const wpFiles = finalDocFolder.getFilesByName('WordPress Setup Guide.pdf');
    if (wpFiles.hasNext()) {
        const wpFile = wpFiles.next();
        wpFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        Logger.log('WORDPRESS PDF URL: ' + wpFile.getUrl());
    }

    // 3. Generate WordPress Snippet File
    const snippetUrl = createWordPressSnippetFile(finalDocFolder);
    const snippetFiles = finalDocFolder.getFilesByName('wp-functions-snippet.php');
    if (snippetFiles.hasNext()) {
        const snippetFile = snippetFiles.next();
        snippetFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        Logger.log('SNIPPET PHP URL: ' + snippetUrl);
    }

    // 4. Generate Getting Started Guide
    createGettingStartedGuide(finalDocFolder);
    const gsFiles = finalDocFolder.getFilesByName('Getting Started Guide.pdf');
    if (gsFiles.hasNext()) {
        const gsFile = gsFiles.next();
        gsFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        Logger.log('GETTING STARTED GUIDE PDF URL: ' + gsFile.getUrl());
    }

    // 5. Generate Slides Template Guide
    createSlidesGuideDocument(finalDocFolder);
    const slidesFiles = finalDocFolder.getFilesByName('Google Slides Templates Guide.pdf');
    if (slidesFiles.hasNext()) {
        const slidesFile = slidesFiles.next();
        slidesFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        Logger.log('GOOGLE SLIDES GUIDE PDF URL: ' + slidesFile.getUrl());
    }

    Logger.log('--- GENERATION COMPLETE ---');
    Logger.log('Please copy the URLs from the log and send them to the assistant.');
    Logger.log('The folder "Final Documentation (Reference)" has been created in your Drive.');
}
