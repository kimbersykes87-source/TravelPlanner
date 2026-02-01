#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push (Node.js alternative - same format as Deno script).
 * Run: node scripts/generate-vapid-keys.mjs
 *
 * Output matches scripts/generate-vapid-keys.ts for compatibility with:
 * - Supabase Edge Function (VAPID_KEYS_JSON)
 * - Frontend (.env.local VITE_VAPID_PUBLIC_KEY)
 */
const { webcrypto } = await import('node:crypto');

const vapidKeysAlgo = { name: 'ECDSA', namedCurve: 'P-256' };

function encodeBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
  const keys = await webcrypto.subtle.generateKey(vapidKeysAlgo, true, ['sign', 'verify']);
  const publicJwk = await webcrypto.subtle.exportKey('jwk', keys.publicKey);
  const privateJwk = await webcrypto.subtle.exportKey('jwk', keys.privateKey);
  const vapidJwks = { publicKey: publicJwk, privateKey: privateJwk };

  const rawPublic = await webcrypto.subtle.exportKey('raw', keys.publicKey);
  const appServerKey = encodeBase64Url(rawPublic);

  console.log('\n=== Add to Supabase Edge Function secrets ===\n');
  console.log("VAPID_KEYS_JSON='" + JSON.stringify(vapidJwks) + "'");
  console.log('\n=== Add to .env.local (frontend) ===\n');
  console.log('VITE_VAPID_PUBLIC_KEY=' + appServerKey);
  console.log('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
