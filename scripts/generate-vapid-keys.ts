#!/usr/bin/env -S deno run --allow-env
/**
 * Generate VAPID keys for Web Push notifications.
 * Run: deno run scripts/generate-vapid-keys.ts
 *
 * Output:
 * 1. VAPID_KEYS_JSON - for Supabase Edge Function secret
 * 2. VITE_VAPID_PUBLIC_KEY - for frontend .env.local
 */
import {
  exportApplicationServerKey,
  exportVapidKeys,
  generateVapidKeys,
} from 'jsr:@negrel/webpush@0.5';

const keys = await generateVapidKeys({ extractable: true });
const vapidJwks = await exportVapidKeys(keys);
const appServerKey = await exportApplicationServerKey(keys);

console.log('\n=== Add to Supabase Edge Function secrets ===\n');
console.log("VAPID_KEYS_JSON='" + JSON.stringify(vapidJwks) + "'");
console.log('\n=== Add to .env.local (frontend) ===\n');
console.log('VITE_VAPID_PUBLIC_KEY=' + appServerKey);
console.log('\n');
