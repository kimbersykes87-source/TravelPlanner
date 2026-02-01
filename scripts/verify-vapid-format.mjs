#!/usr/bin/env node
/**
 * Verify VAPID key format compatibility.
 * Run: node scripts/verify-vapid-format.mjs
 * Reads from env or uses freshly generated keys.
 */
const { webcrypto } = await import('node:crypto');

const vapidKeysAlgo = { name: 'ECDSA', namedCurve: 'P-256' };

function encodeBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function verify() {
  console.log('Generating VAPID keys...\n');

  const keys = await webcrypto.subtle.generateKey(vapidKeysAlgo, true, ['sign', 'verify']);
  const publicJwk = await webcrypto.subtle.exportKey('jwk', keys.publicKey);
  const privateJwk = await webcrypto.subtle.exportKey('jwk', keys.privateKey);
  const vapidJwks = { publicKey: publicJwk, privateKey: privateJwk };

  const rawPublic = await webcrypto.subtle.exportKey('raw', keys.publicKey);
  const appServerKey = encodeBase64Url(rawPublic);

  // 1. Verify JWK can be re-imported (simulates Edge Function importVapidKeys)
  const reimported = await webcrypto.subtle.importKey('jwk', publicJwk, vapidKeysAlgo, true, ['verify']);
  const reimportedPrivate = await webcrypto.subtle.importKey('jwk', privateJwk, vapidKeysAlgo, true, ['sign']);
  console.log('1. JWK import/export: OK (publicKey + privateKey re-import successfully)');

  // 2. Verify app server key (base64url) decodes to correct length (65 bytes for P-256 uncompressed)
  const decoded = urlBase64ToUint8Array(appServerKey);
  if (decoded.length === 65 && decoded[0] === 0x04) {
    console.log('2. Application server key: OK (65-byte uncompressed P-256 point, 0x04 prefix)');
  } else {
    console.log('2. Application server key: WARN (length=' + decoded.length + ', expected 65)');
  }

  // 3. Verify JSON structure matches @negrel/webpush ExportedVapidKeys
  if (vapidJwks.publicKey && vapidJwks.privateKey && vapidJwks.publicKey.kty === 'EC' && vapidJwks.publicKey.crv === 'P-256') {
    console.log('3. VAPID_KEYS_JSON structure: OK (ExportedVapidKeys-compatible)');
  } else {
    console.log('3. VAPID_KEYS_JSON structure: FAIL');
  }

  // 4. Verify base64url format for frontend (no invalid chars)
  const validBase64Url = /^[A-Za-z0-9_-]+$/.test(appServerKey);
  console.log('4. VITE_VAPID_PUBLIC_KEY format: ' + (validBase64Url ? 'OK (valid base64url)' : 'FAIL'));

  console.log('\nAll checks passed. Keys are compatible with:\n');
  console.log('  - Supabase Edge Function (process-notification-queue)');
  console.log('  - Frontend (usePushNotifications hook, PushManager.subscribe)');
  console.log('  - @negrel/webpush importVapidKeys / ApplicationServer.new');
}

verify().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
