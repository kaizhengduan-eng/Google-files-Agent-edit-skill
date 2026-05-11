# Google Workspace Service Account

A Codex skill for securely setting up and operating Google Sheets, Google Docs, and Google Slides through Google Cloud service accounts.

This skill guides the full service-account workflow: enabling the relevant Google Workspace API, creating a Google Cloud service account, storing credentials safely, sharing files with the service account, configuring environment variables, and verifying read or write access.

## What It Does

- Guides Google Cloud setup for Sheets, Docs, and Slides APIs.
- Explains service accounts in practical language.
- Keeps service account JSON keys out of project repositories.
- Defines safe environment-variable patterns for Workspace file access.
- Provides document, spreadsheet, and presentation structure conventions for automation-friendly workflows.
- Includes dependency-free Node.js helper scripts for read/write verification.

## Supported APIs

- Google Sheets API
- Google Docs API
- Google Slides API

The skill keeps shared setup and security rules in one place while keeping product-specific API operations in separate scripts.

## Safety Principles

- Never paste, print, screenshot, or commit a service account JSON key.
- Store keys outside project repositories, preferably under a private local config directory.
- Use environment variables instead of hardcoding file IDs or credential paths.
- Share the target file with the service account email before trying to access it.
- Use Viewer access for read-only workflows and Editor access only when writes are required.
- Before mutating a live file, clearly state the exact file and operation that will be changed.

## Recommended Environment Variables

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\secrets\project-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_RANGE=sheet-name!A:J
GOOGLE_DOCS_DOCUMENT_ID=your-document-id
GOOGLE_SLIDES_PRESENTATION_ID=your-presentation-id
```

Project-specific names are also encouraged when they make the intent clearer:

```env
PROJECT_GOOGLE_SERVICE_ACCOUNT_KEY_FILE=C:\path\to\secrets\project-service-account.json
PROJECT_GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
PROJECT_GOOGLE_DOCS_DOCUMENT_ID=your-document-id
PROJECT_GOOGLE_SLIDES_PRESENTATION_ID=your-presentation-id
```

Real values should stay in private local config files. Public examples should use placeholders only.

## Helper Scripts

```text
scripts/sheets-service-account.js
scripts/docs-service-account.js
scripts/slides-service-account.js
```

These scripts sign service-account JWTs directly and do not require the `googleapis` package.

Sheets:

```powershell
node scripts\sheets-service-account.js verify --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js read --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js rename-first-sheet --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --title "pain-points"
node scripts\sheets-service-account.js write-tsv --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --range "pain-points!A1:J6" --tsv C:\path\to\rows.tsv
```

Docs:

```powershell
node scripts\docs-service-account.js verify --key-file C:\path\to\key.json --document-id <document-id>
node scripts\docs-service-account.js read-text --key-file C:\path\to\key.json --document-id <document-id>
node scripts\docs-service-account.js create --key-file C:\path\to\key.json --title "Draft doc"
node scripts\docs-service-account.js append-text --key-file C:\path\to\key.json --document-id <document-id> --text "New paragraph"
```

Slides:

```powershell
node scripts\slides-service-account.js verify --key-file C:\path\to\key.json --presentation-id <presentation-id>
node scripts\slides-service-account.js create --key-file C:\path\to\key.json --title "Draft deck"
node scripts\slides-service-account.js create-slide --key-file C:\path\to\key.json --presentation-id <presentation-id>
node scripts\slides-service-account.js replace-text --key-file C:\path\to\key.json --presentation-id <presentation-id> --match "{{title}}" --replace "Quarterly Review"
```

## Files

```text
SKILL.md
agents/openai.yaml
scripts/sheets-service-account.js
scripts/docs-service-account.js
scripts/slides-service-account.js
README.md
.gitignore
AGENTS.md
```

## License

Add a license file before publishing this skill publicly if you want others to reuse it under explicit terms.
