/**
 * @fileoverview Contains all functions related to project management
 * via the custom menu in Google Sheets.
 */

const PROJECT_PLAN_SHEET_NAME = "Development Roadmap";
const STATUS_COLUMN_INDEX = 6; // Column F
const STATUS_DATE_COLUMN_INDEX = 7; // Column G

/**
 * Main function called by the "Update" menu to redraw the project plan.

/**
 * Main function called by the "Update" menu to redraw the project plan.
 */
function updateProjectPlan() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(PROJECT_PLAN_SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('The "Development Roadmap" sheet does not exist. Please create it first.');
    return;
  }

  // Call the main drawing function
  _drawProjectPlan(sheet);
  SpreadsheetApp.getUi().alert('The project tracking sheet has been successfully updated!');
}

/**
 * Internal function containing all the project plan drawing logic.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to draw on.
 */
function _drawProjectPlan(sheet) {
  sheet.clear();
  // --- Project metrics calculation ---
  const dataForMetrics = [
    ['1.', 'Phase 1: Configuration & Setup', 'Set up technical foundations and project configuration.', 'Mixed', '', '', '1 day', 'Completed', '', 'Verified: All sub-tasks completed.'],
    ['1.1', 'Development Environment', '1. Open terminal.\n2. Run `npm install -g @google/clasp`.\n3. Run `clasp login` and authenticate.\n4. Clone the project with the provided command.', 'Manual', 'npm, clasp (CLI)', 'Free', '2 hours', 'Completed', '', 'Verified: Project cloned successfully.'],
    ['1.2', 'Secrets Management', '1. In GAS editor > "Project Settings" > "Script Properties", add: `WORDPRESS_USER` and `WORDPRESS_APP_PASSWORD`.\\n2. **IMPORTANT**: The `GEMINI_API_KEY` must be placed in cell **B2** of the **"Setting"** tab.', 'Manual', 'GAS Properties / Sheet Settings', 'Free', '1 hour', 'Completed', '', 'Verified: Validated by response "task 1.2 done"'],
    ['1.3', 'Authorization Validation', 'On first run, a popup will appear.\n1. Click "Review permissions".\n2. Choose your account.\n3. Click "Advanced settings" > "Go to [project name]".\n4. Click "Authorize".', 'Manual', 'Google Apps Script UI', 'Free', '5 minutes', 'Completed', '', 'Verified: Validated by response "1.3 done"'],
    ['1.4', 'Slides Template Creation', '1. Create a Google Slides (1000x1500px).\n2. Add an image and a text box.\n3. Right-click each element > "Format options" > "Alt text".\n4. For the image, in "Title", write `image principale`. For the text, write `Titre`.', 'Manual', 'Google Slides', 'Free', '1 hour', 'Completed', '', 'Verified: Validated by your method explanation.'],
    ['1.5', 'Pabbly Connect Configuration', '1. In Pabbly, create a "Workflow".\n2. For the Trigger, choose the "Webhook" app.\n3. Choose the `Catch Webhook (Preferred)` option.\n4. Pabbly will generate a unique webhook URL. Copy it to add later to the `Config.js` file.', 'Manual', 'Pabbly Connect', 'Paid (Subscription)', '30 minutes', 'Completed', '', 'Verified: Webhook URL provided.'],
    ['1.6', 'Data Sheet Creation', '1. Create a new tab in the Google Sheet.\n2. Name it exactly `Recipes`.\n3. Create the columns defined in `Config.js` (trigger, status, recipe_title, etc.).', 'Auto', 'Google Sheets', 'Free', '15 minutes', 'Completed', '', 'Verified: Sheet update result provided.'],
    ['2.', 'Phase 2: Modular Development', 'Code and test each functional component of the project in isolation.', 'Auto', '', '', '3-4 days', 'Completed', '', 'Verified: All sub-tasks completed.'],
    ['2.1', '`GeminiHelper.js`', '1. Refactor to create `generatePinterestContent`.\n2. Update the test function `test_generatePinterestContent` that logs title and description.', 'Auto', 'UrlFetchApp, Gemini API', 'Paid (per use)', '2 hours', 'Completed', '', 'Verified: Validated by response "2.1 done"'],
    ['2.2', '`ReplicateHelper.js`', '1. Write the `generateImageFromImage` function.\n2. Write the test function `test_generateImageFromImage` to validate the case.', 'Auto', 'UrlFetchApp, Replicate API', 'Paid (per use)', '2 hours', 'Completed', '', 'Verified: Validated by response "2.2 done"'],
    ['2.3', '`GoogleSlideHelper.js`', '1. Write the `createImageFromTemplate` function.\n2. Write a test function `test_createImageFromTemplate` that calls the main function with a sample image URL and title.', 'Auto', 'DriveApp, SlidesApp, UrlFetchApp', 'Free', '2 hours', 'Completed', '', 'Verified: Validated by response "2.3 done"'],
    ['2.4', '`WordPressHelper.js`', '1. Write `generateWordPressOutline` and `generateWordPressArticle`.\n2. Write `uploadImageToWordPress` to send the source image to WP media library.\n3. Write `createWordPressPost` that creates a post in "draft" status, associates the image (featured image), and sends the `targetKeyword` for Rank Math.\n4. Create test functions.', 'Auto', 'UrlFetchApp, WordPress REST API', 'Paid (per use)', '3 hours', 'Completed', '', 'Verified: Validated by response "mark this step done"'],
    ['2.5', '`PabblyHelper.js`', '1. Write the `triggerPinCreation` function.\n2. The `sendSampleDataToPabbly` function already serves as a test function.', 'Auto', 'UrlFetchApp', 'Free', '1 hour', 'Completed', '', 'Verified: Test function sent data successfully.'],
    ['3.', 'Phase 3: Integration & Orchestration', 'Assemble all helpers in the main script and manage data flow.', 'Auto', '', '', '1-2 days', 'Completed', '', 'Verified: All sub-tasks completed.'],
    ['3.1', '`Code.js` - Main Logic', '1. Read row data (keyword, image URL).\n2. Generate outline and SEO metadata (`generateWordPressOutline`).\n3. Generate HTML article content (`generateWordPressArticle`).\n4. Enrich article with internal linking (`addInternalLinks`).\n5. Create collage image (`createCollageImageFromTemplate`).\n6. Upload collage image and main image to WordPress.\n7. Choose article category (`getBestCategoryId`).\n8. Add Facebook link to content.\n9. Create WordPress post with all information (`createWordPressPost`).\n10. Update Google Sheet with post URL.\n11. Integrate Pinterest Pin creation logic using the created post URL.', 'Auto', 'JavaScript', 'Free', '3 hours', 'Completed', '', 'Verified: Code present in `processRecipeRow`.'],
    ['3.2', '`Code.js` - Error Handling', '1. Wrap all `processRecipeRow` logic in a `try...catch` block.\n2. In the `catch` block, use `Logger.log()` to record the error.\n3. Update status cell to "error" and write `error.message` to the error column.', 'Auto', 'JavaScript', 'Free', '2 hours', 'Completed', '', 'Verified: try/catch block in place with logging.'],
    ['3.3', '`Code.js` - `onEdit` Trigger', '1. Verify that the `onEdit` function is in place.\n2. Ensure it checks sheet name, column, and trigger text before calling `processRecipeRow`.', 'Auto', 'Google Apps Script (Triggers)', 'Free', '1 hour', 'Completed', '', 'Verified: Base code is in place.'],
    ['3.4', 'Web App Deployment & Pabbly Callback', '1. Push code with `clasp push`.\n2. In GAS UI, click "Deploy" > "Manage deployments" to create a **new version**.\n3. Configure an "API" action in Pabbly to call back the Web App URL.\n4. Map `row_number`, `pin_id`, and `board_id` in Pabbly.', 'Manual', 'Google Apps Script UI, Pabbly', 'Free', '20 minutes', 'Completed', '', 'Verified: Callback test updated sheet successfully.'],
    ['4.', 'Phase 4: Source Data Import', 'Automate data retrieval and filtering from external Google Sheets.', 'Auto', '', '', '2-3 days', 'Completed', '', 'Verified: All sub-tasks completed.'],
    ['4.1', '`SourceHelper.js` - Initialization', '1. Create a new file `SourceHelper.js`.\n2. Place external data copy and filtering logic there.', 'Auto', 'JavaScript, SpreadsheetApp', 'Free', '2 hours', 'Completed', '', 'Verified: Validated by successful import.'],
    ['4.2', '`Code.js` - Import Trigger', '1. Modify `onEdit` function to detect "ok" trigger in H1 cell of "Source" sheets.\n2. Call main `SourceHelper.js` function passing active sheet.', 'Auto', 'JavaScript, Triggers', 'Free', '1 hour', 'Completed', '', 'Verified: Validated by successful import.'],
    ['4.3', '`SourceHelper.js` - Unit Test', '1. Create test function `test_importFromExternalSheet`.\n2. This function will simulate `onEdit` triggering and validate the copy process.', 'Auto', 'JavaScript', 'Free', '1 hour', 'Completed', '', 'Verified: Validated by successful import.'],
    ['4.4', 'Global Automation (Future)', 'Create a function that iterates through all "Source" sheets and launches import for each. This function can be linked to a menu or time trigger.', 'Auto', 'JavaScript', 'Free', '2 hours', 'Completed', '', 'Verified: Validated by successful import.'],
    ['5.', 'Phase 5: Testing & Deployment', 'Test the complete system under real conditions and deploy.', 'Manual', '', '', '1 day', 'Completed', '', 'Verified: System in production.'],
    ['5.1', 'Integration Tests', '1. Fill 2-3 rows in "Recipes" tab with test data.\n2. Write "PROCESS" in trigger column for each row.\n3. Verify status changes to "published" and URLs are generated.', 'Manual', 'Google Sheets', 'Free', '2 hours', 'Completed', '', 'Verified: Full flow validated.'],
    ['5.2', 'Final Deployment', '1. Once all tests pass, push final code version with `clasp push`.\n2. Create a "README" tab in Sheet to explain how to use the tool.', 'Manual', 'clasp', 'Free', '1 hour', 'Completed', '', 'Verified: Web App deployed.'],
    ['6.', 'Phase 6: Advanced Architecture & Robustness', 'Major improvements for scalability, reliability and SEO.', 'Auto', '', '', '4-5 days', 'In Progress', '', ''],
    ['6.1', 'Multi-Account Management', 'Creation of `AccountHelper` to support multiple Pinterest/WordPress configurations dynamically.', 'Auto', 'JavaScript, Config', 'Free', '3 hours', 'Completed', '', 'Verified: AccountHelper in place.'],
    ['6.2', 'WP Recipe Maker Integration', 'Creation of `WpRecipeMakerHelper` to generate structured recipes (JSON) compatible with WP Recipe Maker plugin.', 'Auto', 'WP REST API', 'Free', '3 hours', 'Completed', '', 'Verified: Recipes published with WPRM.'],
    ['6.3', 'Google Drive URL Handling', 'Native support for Google Drive links for Replicate and WordPress (auto-conversion to download links).', 'Auto', 'Regex, UrlFetchApp', 'Free', '1 hour', 'Completed', '', 'Verified: Drive images accepted.'],
    ['6.4', 'ID Reliability (BigInt)', 'Critical fix for JSON parsing of Pabbly/Pinterest IDs > 15 digits (force string).', 'Auto', 'JavaScript (Regex)', 'Free', '1 hour', 'Completed', '', 'Verified: Pinterest IDs correct.'],
    ['6.5', 'Audit System', 'Creation of `AuditHelper` to track costs per row and log errors persistently.', 'Auto', 'Google Sheets', 'Free', '2 hours', 'Completed', '', 'Verified: Audit tab functional.'],
    ['6.6', 'Gemini 3 Upgrade', 'Migration to `gemini-3-pro-preview` and `flash` for better image analysis and text generation.', 'Auto', 'Gemini API', 'Paid', '1 hour', 'Completed', '', 'Verified: Models active in Config.js.']
  ];

  let totalDurationHours = 0;
  let completedDurationHours = 0;
  let completedSubTasks = 0;
  let totalSubTasks = 0;
  const statusCounts = {};

  // --- Step 1: Calculate durations based ONLY on sub-tasks ---
  const phaseDurations = {};
  dataForMetrics.forEach(row => {
    const taskNumber = row[0] ? row[0].toString() : "";
    const durationStr = row[6];
    const status = row[7];

    // Calculate for sub-tasks only
    if (taskNumber && /^\d+\.\d+/.test(taskNumber)) { // Regex to target only sub-tasks (e.g., "1.1")
      let subTaskDuration = 0;
      const hoursMatch = durationStr.match(/(\d+(\.\d+)?)\s*hour/);
      const minutesMatch = durationStr.match(/(\d+(\.\d+)?)\s*minute/);
      const daysMatch = durationStr.match(/(\d+(\.\d+)?)\s*day/);

      if (daysMatch) {
        subTaskDuration += parseFloat(daysMatch[1]) * 8;
      }
      if (hoursMatch) {
        subTaskDuration += parseFloat(hoursMatch[1]);
      }
      if (minutesMatch) {
        subTaskDuration += parseFloat(minutesMatch[1]) / 60;
      }
      totalDurationHours += subTaskDuration;

      // Add duration to parent phase
      const phaseNum = taskNumber.split('.')[0] + '.';
      phaseDurations[phaseNum] = (phaseDurations[phaseNum] || 0) + subTaskDuration;

      totalSubTasks++;
      if (status === 'Completed') {
        completedSubTasks++;
        completedDurationHours += subTaskDuration;
      }
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
  });

  // --- Step 2: Update phase durations in data ---
  dataForMetrics.forEach(row => {
    const taskNumber = row[0] ? row[0].toString() : "";
    if (taskNumber && /^\d+\.$/.test(taskNumber)) { // Regex to target only phases (e.g., "1.")
      const calculatedDuration = phaseDurations[taskNumber] || 0;
      if (calculatedDuration > 0) {
        const days = Math.floor(calculatedDuration / 8);
        const hours = calculatedDuration % 8;
        row[6] = days > 0 ? `${days} day(s)` : `${hours.toFixed(1)} hour(s)`;
      }
    }
  });

  const completionPercentage = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) : 0;

  // --- Step 3: Prepare display strings ---
  const totalDays = Math.floor(totalDurationHours / 8);
  const remainingHours = totalDurationHours % 8;
  const durationStringInDays = `${totalDays} day(s) and ${remainingHours.toFixed(1)} hour(s)`;

  const completedDays = Math.floor(completedDurationHours / 8);
  const completedRemainingHours = completedDurationHours % 8;
  const completedDurationString = `${completedDays} day(s) and ${completedRemainingHours.toFixed(1)} hour(s)`;

  const remainingProjectDurationHours = totalDurationHours - completedDurationHours;
  const remainingDays = Math.floor(remainingProjectDurationHours / 8);
  const remainingProjectHours = remainingProjectDurationHours % 8;
  const remainingDurationString = `${remainingDays} day(s) and ${remainingProjectHours.toFixed(1)} hour(s)`;

  // --- Dashboard display ---
  sheet.getRange('A1').setValue('📈 Development Roadmap: Pinterest Automation with GAS & Gemini').setFontSize(18).setFontWeight('bold');
  sheet.getRange(1, 1, 1, 10).merge(); // Merge cells for title

  sheet.getRange('A3').setValue('Project Progress').setFontWeight('bold');
  sheet.getRange('B3').setValue(completionPercentage).setNumberFormat('0.00%').setFontSize(14).setFontWeight('bold');

  sheet.getRange('D3').setValue('Total Duration (Days)').setFontWeight('bold');
  sheet.getRange('E3').setValue(durationStringInDays).setFontSize(12);
  sheet.getRange('D4').setValue('Completed Duration (Days)').setFontWeight('bold').setFontColor('#666666');
  sheet.getRange('E4').setValue(completedDurationString).setFontSize(12).setFontColor('#666666');
  sheet.getRange('D5').setValue('Remaining Duration (Days)').setFontWeight('bold').setFontColor('#b45f06');
  sheet.getRange('E5').setValue(remainingDurationString).setFontSize(12).setFontColor('#b45f06');

  sheet.getRange('H3').setValue('Total Duration (Hours)').setFontWeight('bold');
  sheet.getRange('I3').setValue(`${totalDurationHours.toFixed(1)}h`).setFontSize(12);
  sheet.getRange('H4').setValue('Completed Duration (Hours)').setFontWeight('bold').setFontColor('#666666');
  sheet.getRange('I4').setValue(`${completedDurationHours.toFixed(1)}h`).setFontSize(12).setFontColor('#666666');
  sheet.getRange('H5').setValue('Remaining Duration (Hours)').setFontWeight('bold').setFontColor('#b45f06');
  sheet.getRange('I5').setValue(`${remainingProjectDurationHours.toFixed(1)}h`).setFontSize(12).setFontColor('#b45f06');

  // --- Chart creation ---
  const chartData = [['Status', 'Number of Tasks']];
  for (const status in statusCounts) {
    chartData.push([status, statusCounts[status]]);
  }

  // Write chart data to a temporary range for the chart builder to read.
  const chartDataRange = sheet.getRange(1, 11, chartData.length, chartData[0].length); // Column K
  chartDataRange.setValues(chartData);

  const charts = sheet.getCharts();
  const chartTitle = 'Task Distribution by Status';
  let projectChart = charts.find(c => c.getOptions().get('title') === chartTitle);

  if (projectChart) {
    // If chart exists, modify it to update its data
    const newChart = projectChart.modify()
      .clearRanges() // Remove old data source
      .addRange(chartDataRange) // Add new one
      .build();
    sheet.updateChart(newChart);
  } else {
    // If chart doesn't exist, create it
    const newChart = sheet.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(chartDataRange)
      .setOption('title', chartTitle)
      .setOption('pieHole', 0.4)
      .setPosition(5, 1, 0, 0)
      .build();
    sheet.insertChart(newChart);
  }

  // Hide columns containing chart source data instead of deleting them.
  sheet.hideColumns(chartDataRange.getColumn(), chartDataRange.getNumColumns());

  // --- Task table display ---
  const tableStartRow = 20; // Start table lower
  const headers = ['#', 'Task / Sub-task', 'Action Required', 'Type', 'Technologies / Services', 'Cost', 'Estimated Duration', 'Status', 'Status Date', 'Verified?'];
  sheet.getRange(tableStartRow, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(tableStartRow + 1, 1, dataForMetrics.length, dataForMetrics[0].length).setValues(dataForMetrics);

  // Column formatting
  sheet.setColumnWidths(1, 1, 40); // #
  sheet.setColumnWidths(2, 1, 250); // Task
  sheet.setColumnWidths(3, 1, 350); // Action
  sheet.setColumnWidths(4, 1, 70); // Type
  sheet.setColumnWidths(5, 1, 200); // Technologies
  sheet.autoResizeColumns(6, 5); // Cost, Duration, Status, Date, Verified
  sheet.getRange(`${tableStartRow}:${sheet.getLastRow()}`).setVerticalAlignment("top");
  sheet.getRange(tableStartRow, 1, 1, headers.length).setBackground("#e0e0e0").setFontWeight('bold');

  const rules = sheet.getConditionalFormatRules();
  sheet.setConditionalFormatRules(rules.filter(rule => rule.getRanges()[0].getColumn() !== 8)); // Clean old status rules

  const fullRange = sheet.getRange(`${tableStartRow + 1}:` + sheet.getLastRow());
  const statusRange = sheet.getRange(tableStartRow + 1, 8, sheet.getLastRow() - tableStartRow, 1);
  const newRules = [
    // Rule for main tasks (end with '.')
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=REGEXMATCH($A${tableStartRow + 1}, "^\\d+\\.$")`).setBackground("#f3f3f3").setRanges([fullRange]).build(),
    // Status rules
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Completed').setBackground('#d9ead3').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('In Progress').setBackground('#cfe2f3').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Blocked').setBackground('#f4cccc').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('In Review').setBackground('#fff2cc').setRanges([statusRange]).build()
  ];
  sheet.setConditionalFormatRules(rules.concat(newRules));

  // Apply bold style directly for reliability
  for (let i = tableStartRow + 1; i <= sheet.getLastRow(); i++) {
    const taskNumber = sheet.getRange(i, 1).getValue() ? sheet.getRange(i, 1).getValue().toString() : "";
    if (taskNumber.match(/^\d+\.$/)) {
      sheet.getRange(i, 1, 1, headers.length).setFontWeight('bold');
    }
  }
}
