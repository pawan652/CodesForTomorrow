import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

function readStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function readServiceAccountFile(filePath: string): admin.ServiceAccount {
  const fullPath = path.resolve(process.cwd(), filePath);
  let fileText: string;

  try {
    fileText = fs.readFileSync(fullPath, 'utf8');
  } catch {
    throw new Error(`Could not read the Firebase service account file at ${fullPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new Error('The Firebase service account file is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('The Firebase service account file must be a JSON object');
  }

  const record = parsed as Record<string, unknown>;
  const projectId = readStringField(record, 'projectId') || readStringField(record, 'project_id');
  const clientEmail = readStringField(record, 'clientEmail') || readStringField(record, 'client_email');
  const privateKey = readStringField(record, 'privateKey') || readStringField(record, 'private_key');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('The Firebase service account file is missing project id, client email, or private key.');
  }

  return { projectId, clientEmail, privateKey };
}

function loadServiceAccount(): admin.ServiceAccount {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (serviceAccountPath) {
    return readServiceAccountFile(serviceAccountPath);
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '',
  };
}

const serviceAccount = loadServiceAccount();

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = admin.firestore();
export { admin };

console.log(`Firebase ready for project ${serviceAccount.projectId ?? 'unknown'}`);
