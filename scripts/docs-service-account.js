#!/usr/bin/env node

const fs = require("node:fs");
const crypto = require("node:crypto");

const DOCS_READONLY_SCOPE = "https://www.googleapis.com/auth/documents.readonly";
const DOCS_SCOPE = "https://www.googleapis.com/auth/documents";

function usage() {
  console.log(`Usage:
  node docs-service-account.js verify --key-file <json> --document-id <id>
  node docs-service-account.js read-text --key-file <json> --document-id <id>
  node docs-service-account.js create --key-file <json> --title <title>
  node docs-service-account.js append-text --key-file <json> --document-id <id> --text <text>

Notes:
  - verify/read-text require Viewer access.
  - append-text requires Editor access.
  - create creates a new document owned by the service account.
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
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Google API failed: ${data.error?.message || response.status}`);
  }
  return data;
}

async function getDocument(token, documentId) {
  const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`;
  return googleJson(token, url);
}

function extractTextFromElement(element) {
  const textRun = element.textRun?.content || "";
  const tableText = (element.table?.tableRows || [])
    .flatMap((row) => row.tableCells || [])
    .flatMap((cell) => cell.content || [])
    .map(extractTextFromStructuralElement)
    .join("");
  return textRun + tableText;
}

function extractTextFromStructuralElement(element) {
  if (element.paragraph) {
    return (element.paragraph.elements || []).map(extractTextFromElement).join("");
  }
  if (element.table) {
    return (element.table.tableRows || [])
      .flatMap((row) => row.tableCells || [])
      .flatMap((cell) => cell.content || [])
      .map(extractTextFromStructuralElement)
      .join("");
  }
  return "";
}

function extractDocumentText(document) {
  return (document.body?.content || []).map(extractTextFromStructuralElement).join("");
}

async function createDocument(token, title) {
  return googleJson(token, "https://docs.googleapis.com/v1/documents", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

async function appendText(token, documentId, text) {
  const document = await getDocument(token, documentId);
  const endIndex = document.body?.content?.at(-1)?.endIndex || 1;
  const insertIndex = Math.max(1, endIndex - 1);
  return googleJson(token, `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: insertIndex },
            text: `${text}\n`,
          },
        },
      ],
    }),
  });
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "--help" || command === "help") {
    usage();
    return;
  }

  const keyFile = requireArg("key-file");

  if (command === "verify") {
    const documentId = requireArg("document-id");
    const token = await getAccessToken(keyFile, [DOCS_READONLY_SCOPE]);
    const document = await getDocument(token, documentId);
    console.log(JSON.stringify({
      documentId: document.documentId,
      title: document.title,
      bodyElements: document.body?.content?.length || 0,
    }, null, 2));
    return;
  }

  if (command === "read-text") {
    const documentId = requireArg("document-id");
    const token = await getAccessToken(keyFile, [DOCS_READONLY_SCOPE]);
    const document = await getDocument(token, documentId);
    console.log(extractDocumentText(document));
    return;
  }

  if (command === "create") {
    const title = requireArg("title");
    const token = await getAccessToken(keyFile, [DOCS_SCOPE]);
    const document = await createDocument(token, title);
    console.log(JSON.stringify({
      documentId: document.documentId,
      title: document.title,
    }, null, 2));
    return;
  }

  if (command === "append-text") {
    const documentId = requireArg("document-id");
    const text = requireArg("text");
    const token = await getAccessToken(keyFile, [DOCS_SCOPE]);
    const result = await appendText(token, documentId, text);
    console.log(JSON.stringify({
      replies: result.replies?.length || 0,
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
