# 🚀 Pinterest & WordPress Automation Suite

Welcome to your automation suite! This project automatically transforms recipes (Text or Image) into fully optimized WordPress articles (SEO, WP Recipe Maker) and viral Pinterest Pins.

---

## 📋 Prerequisites

1.  A **Google Account** (for this Google Sheet).
2.  A **WordPress** site with the **WP Recipe Maker** plugin installed.
3.  A **Pabbly Connect** account (for Pinterest automation).
4.  A valid **Google Gemini API Key**.
    *   *This script uses the following models: **Gemini 2.5 Flash** (Image/Fast), **Gemini 2.5 Pro** (Writing), and **Gemini 3.0 Pro** (Advanced Outlines).*

---

## ⚙️ STEP 1: Sheet Installation (2 min)

1.  In the top menu, click **🏁 START HERE** > **Install Project (First Run)**.
    *   *Accept the requested permissions.*
2.  The script will automatically create:
    *   A `Setting` tab.
    *   A `Config_Accounts` tab.
    *   Folders in your **Google Drive** (for images and templates).
    *   A `wp-functions-snippet.php` file in that Drive folder.

---

## 🔑 STEP 2: Configuration (3 min)

1.  **Get the Template**: 
   Make a copy of the [AI Recipe Automator Template Sheet](https://docs.google.com/spreadsheets/d/1tdfu3spxUyTYMqHHitiC41_MOCts_rglVUNvLwcs7rQ/copy).
2.  **Tab `Config_Accounts`**:
    *   **Active**: Set the status to `Active`.
    *   **WP Base URL**: Enter your site URL (e.g., `https://my-recipe-site.com`).
    *   **WP User**: Your WordPress username.
    *   **WP App Password**: Create an Application Password in WP (Users > Profile > Application Passwords) and paste it here.
    *   **WP Author ID**: The numeric ID of the author (often `1` or `2`).

---

## 🔧 STEP 3: WordPress Configuration (Critical!)

To allow the script to create full recipe cards via API, you must add a small snippet of code to your site.

1.  Go to the **Google Drive Folder** created by the script (named after your Sheet).
2.  Open the file `wp-functions-snippet.php`.
3.  Copy all the content.
4.  On your WordPress site, paste this code into your child theme's `functions.php` file (or use a plugin like **WPCode** or **Code Snippets**).
5.  *That's it! Your WordPress is now ready to receive recipes.*

---

## ☁️ STEP 4: Web App Deployment (For Pabbly)

Pabbly needs a URL to communicate back with this script.

1.  In this Sheet, go to **Extensions** > **Apps Script**.
2.  Top right, click **Deploy** > **New deployment**.
3.  Click the gear icon (types) > **Web App**.
    *   **Description**: `Prod`
    *   **Execute as**: `Me` (your email).
    *   **Who has access**: `Anyone` (Essential for Pabbly to access it).
4.  Click **Deploy**.
5.  **COPY** the Web App URL (`Current Web App URL`). You will need it in the next step.

---

## 🔗 STEP 5: Pabbly Connect Setup

Import my pre-configured workflows by clicking these links.
**⚠️ IMPORTANT:** After importing, you MUST reconnect your OWN accounts (Gmail/Drive, Pinterest, WordPress) in each step.

### 1. Workflow: List All Boards (Fetcher)
*   [Click to copy Workflow](https://connect.pabbly.com/v2/app/workflow/share/XBRZawNUUzBWHARuD2pQd11JBQEFXARnARgAElJdAXlbFgBFAkNdN10RUnBSBVU0UhtXPVUJUG0NGQEFUAZTIFBJAAJVVlctUx4CeQFEXW5cAllxA2I#)
*   **Action:** Once configured, copy the **Webhook URL** for this workflow.
*   Paste it in `Config_Accounts` > Column **Pabbly List Webhook**.

### 2. Workflow: Read Board Detail (Detail Fetcher)
*   [Click to copy Workflow](https://connect.pabbly.com/v2/app/workflow/share/XBRWZAJVVzRUHgdtVjNWcQEVV1MDWlEyVUwIGlRbUytRHFMWB0YIYlwQBSdSBQhpB04JYwdbDDEOGgcDUwUBcgYfBDhdXgZ8AE0AewJPX2xcAlZ-AmM#)
*   **Action:** Copy the **Webhook URL**.
*   Paste it in `Config_Accounts` > Column **Pabbly Board Info Webhook**.

### 3. Workflow: Post Pin (Publisher)
*   [Click to copy Workflow](https://connect.pabbly.com/v2/app/workflow/share/DUVSYFIFUjFSGAFrBGEMKw8bVVEJUAdkUEkJG1xTBn4ATQdCVBVcNgtHUnBTBAhpB05SOFENUG0PGwsPAVdTIAMaBztXVFctWxZSKVMGDj0NU1J6UjM#)
*   **In this workflow**: There is an "HTTP Request" step (usually at the end) to tell the Sheet it's done.
    *   Paste your **Web App URL** (retrieved in Step 4) into the URL field of this step.
*   **Action:** Copy the main **Webhook URL** (Trigger).
*   Paste it in `Config_Accounts` > Column **Pabbly Main Webhook**.

---

## 🚀 STEP 6: Run Automation!

1.  In the menu, click **🚀 AUTOMATION** > **Update Site Tabs**.
2.  This will create a `Data-SiteName` tab (e.g., `Data-ExampleSite`).
3.  In this tab:
    *   **Recipe Title**: Paste the raw text of your recipe OR the title.
    *   **Photo URL**: Put the photo link.
    *   **Trigger (Col A)**: Select **OK**.
4.  Wait... ☕
    *   The script will write the article, create the recipe card, generate the Pinterest Pin, and send it to Pabbly.
    *   Follow progress in the **Trigger** column (1/13, 2/13...).

---

---

### 👤 Author & Support
Created by **Redouane Diri**  
📧 Email: [redouane.diri@gmail.com](mailto:redouane.diri@gmail.com)  
For any questions, support, or custom modification requests, feel free to reach out!

---
*Developed for the Google Gemini 2.0 Hackathon.*
