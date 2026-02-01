#!/usr/bin/env node
/**
 * Output SQL to schedule the notification queue processor (run every 2 min).
 * Run: node scripts/setup-push-cron.mjs
 *
 * Copy the output and run it in Supabase Dashboard → SQL Editor.
 * First enable pg_cron and pg_net: Database → Extensions.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let serviceRoleKey = '';

try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (key === 'SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
    }
  }
} catch {
  console.error('Could not read .env.local');
  process.exit(1);
}

const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef || !serviceRoleKey) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const functionUrl = `https://${projectRef}.supabase.co/functions/v1/process-notification-queue`;

console.log(`
-- Run this in Supabase Dashboard → SQL Editor
-- First enable extensions: Database → Extensions → pg_cron, pg_net

SELECT cron.schedule(
  'process-notification-queue',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := '${functionUrl}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${serviceRoleKey}"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
`);
