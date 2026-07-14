#!/usr/bin/env node

import admin from "firebase-admin";

const OWNER_ROLE = "owner";

function readEmailArgument(argv) {
  const emailFlagIndex = argv.indexOf("--email");
  if (emailFlagIndex >= 0) return argv[emailFlagIndex + 1] || "";

  const inlineEmail = argv.find((arg) => arg.startsWith("--email="));
  if (inlineEmail) return inlineEmail.slice("--email=".length);

  return process.env.ADMIN_EMAIL || "";
}

function assertValidEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Bitte eine gueltige E-Mail-Adresse mit --email "name@example.com" angeben.');
  }
}

function appOptions() {
  const options = {
    credential: admin.credential.applicationDefault(),
  };

  if (process.env.FIREBASE_PROJECT_ID) {
    options.projectId = process.env.FIREBASE_PROJECT_ID;
  }

  return options;
}

async function main() {
  const email = readEmailArgument(process.argv.slice(2)).trim().toLowerCase();
  assertValidEmail(email);

  admin.initializeApp(appOptions());

  const user = await admin.auth().getUserByEmail(email);
  const existingClaims = user.customClaims || {};
  const nextClaims = {
    ...existingClaims,
    role: OWNER_ROLE,
  };

  await admin.auth().setCustomUserClaims(user.uid, nextClaims);

  console.log(`Custom Claim gesetzt: role=${OWNER_ROLE}`);
  console.log(`Benutzer: ${email}`);
  console.log("Hinweis: Der Benutzer muss sich abmelden und neu anmelden, damit der neue Token aktiv wird.");
}

main().catch((error) => {
  const code = error && error.code ? ` (${error.code})` : "";
  const message = error && error.message ? error.message : "Unbekannter Fehler";
  console.error(`Custom Claim konnte nicht gesetzt werden${code}: ${message}`);
  process.exitCode = 1;
});
