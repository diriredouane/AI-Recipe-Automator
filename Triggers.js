/**
 * @fileoverview Gère la configuration des déclencheurs (triggers) du projet.
 */

/**
 * Configure les déclencheurs automatiques selon la fréquence demandée :
 * - automatedPostTrigger : Chaque 30 minutes
 * - automatedSuperFixTrigger : Chaque 2 heures
 */
function setupAutomatedTriggers() {
  const triggersConfig = [
    { functionName: 'automatedPostTrigger', minutes: 30 },
    { functionName: 'automatedSuperFixTrigger', hours: 2 },
    { functionName: 'onEditTrigger', eventType: ScriptApp.EventType.ON_EDIT }
  ];

  Logger.log("--- ⚙️ Configuring Automation Triggers ---");

  let logMessage = "";

  triggersConfig.forEach(config => {
    const functionName = config.functionName;

    // 1. Nettoyer les anciens triggers pour cette fonction
    const existingTriggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    existingTriggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === functionName) {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });

    if (deletedCount > 0) Logger.log(`Removed ${deletedCount} old trigger(s) for ${functionName}.`);

    // 2. Créer le nouveau trigger
    if (config.minutes) {
      ScriptApp.newTrigger(functionName)
        .timeBased()
        .everyMinutes(config.minutes)
        .create();
      logMessage += `✅ ${functionName}: Every ${config.minutes} minutes\n`;
    } else if (config.hours) {
      ScriptApp.newTrigger(functionName)
        .timeBased()
        .everyHours(config.hours)
        .create();
      logMessage += `✅ ${functionName}: Every ${config.hours} hours\n`;
    } else if (config.eventType === ScriptApp.EventType.ON_EDIT) {
      ScriptApp.newTrigger(functionName)
        .forSpreadsheet(SpreadsheetApp.getActive())
        .onEdit()
        .create();
      logMessage += `✅ ${functionName}: On Edit (Spreadsheet)\n`;
    }
  });

  SpreadsheetApp.getUi().alert(`Automation Triggers Setup Complete!\n\n${logMessage}`);
}