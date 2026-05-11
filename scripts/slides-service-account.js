#!/usr/bin/env node

const fs = require("node:fs");
const crypto = require("node:crypto");

const SLIDES_READONLY_SCOPE = "https://www.googleapis.com/auth/presentations.readonly";
const SLIDES_SCOPE = "https://www.googleapis.com/auth/presentations";

function usage() {
  console.log(`Usage:
  node slides-service-account.js verify --key-file <json> --presentation-id <id>
  node slides-service-account.js create --key-file <json> --title <title>
  node slides-service-account.js create-slide --key-file <json> --presentation-id <id>
  node slides-service-account.js replace-text --key-file <json> --presentation-id <id> --match <text> --replace <text>

Notes:
  - verify requires Viewer access.
  - create-slide/replace-text require Editor access.
  - create creates a new presentation owned by the service account.
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

async function getPresentation(token, presentationId) {
  const url = `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}`;
  return googleJson(token, url);
}

async function createPresentation(token, title) {
  return googleJson(token, "https://slides.googleapis.com/v1/presentations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

async function batchUpdate(token, presentationId, requests) {
  const url = `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}:batchUpdate`;
  return googleJson(token, url, {
    method: "POST",
    body: JSON.stringify({ requests }),
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
    const presentationId = requireArg("presentation-id");
    const token = await getAccessToken(keyFile, [SLIDES_READONLY_SCOPE]);
    const presentation = await getPresentation(token, presentationId);
    console.log(JSON.stringify({
      presentationId: presentation.presentationId,
      title: presentation.title,
      slideCount: presentation.slides?.length || 0,
    }, null, 2));
    return;
  }

  if (command === "create") {
    const title = requireArg("title");
    const token = await getAccessToken(keyFile, [SLIDES_SCOPE]);
    const presentation = await createPresentation(token, title);
    console.log(JSON.stringify({
      presentationId: presentation.presentationId,
      title: presentation.title,
    }, null, 2));
    return;
  }

  if (command === "create-slide") {
    const presentationId = requireArg("presentation-id");
    const token = await getAccessToken(keyFile, [SLIDES_SCOPE]);
    const result = await batchUpdate(token, presentationId, [
      {
        createSlide: {
          slideLayoutReference: {
            predefinedLayout: "TITLE_AND_BODY",
          },
        },
      },
    ]);
    console.log(JSON.stringify({
      replies: result.replies?.length || 0,
      presentationId: result.presentationId,
    }, null, 2));
    return;
  }

  if (command === "replace-text") {
    const presentationId = requireArg("presentation-id");
    const match = requireArg("match");
    const replace = requireArg("replace");
    const token = await getAccessToken(keyFile, [SLIDES_SCOPE]);
    const result = await batchUpdate(token, presentationId, [
      {
        replaceAllText: {
          containsText: {
            text: match,
            matchCase: true,
          },
          replaceText: replace,
        },
      },
    ]);
    console.log(JSON.stringify({
      replies: result.replies?.length || 0,
      presentationId: result.presentationId,
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
