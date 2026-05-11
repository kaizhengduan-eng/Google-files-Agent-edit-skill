#!/usr/bin/env node

const fs = require("node:fs");
const crypto = require("node:crypto");

const SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function usage() {
  console.log(`Usage:
  node sheets-service-account.js verify --key-file <json> --spreadsheet-id <id> --range <range>
  node sheets-service-account.js read --key-file <json> --spreadsheet-id <id> --range <range>
  node sheets-service-account.js rename-first-sheet --key-file <json> --spreadsheet-id <id> --title <name>
  node sheets-service-account.js write-tsv --key-file <json> --spreadsheet-id <id> --range <range> --tsv <file>

Notes:
  - verify/read require Viewer access.
  - rename-first-sheet/write-tsv require Editor access.
  - The key file is read but never printed.`);
}

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function requireArg(name) {
  const value = getArg(name);
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJwt(serviceAccount, scopes) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: scopes.join(" "),
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64Url(signer.sign(serviceAccount.private_key))}`;
}

async function getAccessToken(keyFile, scopes) {
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Service account JSON is missing client_email or private_key.");
  }
  const tokenUrl = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createJwt(serviceAccount, scopes),
    }),
  });
  const data = await response.json().catch(async () => ({ error_description: await response.text() }));
  if (!response.ok || !data.access_token) {
    throw new Error(`Google auth failed: ${data.error_description || data.error || response.status}`);
  }
  return data.access_token;
}

async function googleJson(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(async () => ({ raw: await response.text() }));
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function readValues(token, spreadsheetId, range) {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
      range
    )}`
  );
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  return googleJson(token, url);
}

function parseTsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"));
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "--help" || command === "-h") {
    usage();
    return;
  }

  const keyFile = requireArg("key-file");
  const spreadsheetId = requireArg("spreadsheet-id");

  if (command === "verify" || command === "read") {
    const range = requireArg("range");
    const token = await getAccessToken(keyFile, [SHEETS_READONLY_SCOPE]);
    const data = await readValues(token, spreadsheetId, range);
    const values = Array.isArray(data.values) ? data.values : [];
    const result = { range: data.range || range, rows: values.length, firstRow: values[0] || [] };
    console.log(JSON.stringify(command === "read" ? { ...result, values } : result, null, 2));
    return;
  }

  if (command === "rename-first-sheet") {
    const title = requireArg("title");
    const token = await getAccessToken(keyFile, [SHEETS_SCOPE]);
    const metadata = await googleJson(
      token,
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}?fields=sheets(properties(sheetId,title))`
    );
    const firstSheet = metadata.sheets?.[0]?.properties;
    if (!firstSheet) throw new Error("No sheet found.");
    if (firstSheet.title !== title) {
      await googleJson(
        token,
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            requests: [
              {
                updateSheetProperties: {
                  properties: { sheetId: firstSheet.sheetId, title },
                  fields: "title",
                },
              },
            ],
          }),
        }
      );
    }
    console.log(JSON.stringify({ oldTitle: firstSheet.title, title }, null, 2));
    return;
  }

  if (command === "write-tsv") {
    const range = requireArg("range");
    const tsv = requireArg("tsv");
    const values = parseTsv(tsv);
    const token = await getAccessToken(keyFile, [SHEETS_SCOPE]);
    const url = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
        range
      )}`
    );
    url.searchParams.set("valueInputOption", "USER_ENTERED");
    const data = await googleJson(token, url, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
    console.log(
      JSON.stringify(
        {
          updatedRange: data.updatedRange,
          updatedRows: data.updatedRows,
          updatedColumns: data.updatedColumns,
          updatedCells: data.updatedCells,
        },
        null,
        2
      )
    );
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
