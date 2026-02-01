#!/usr/bin/env node
/**
 * Enable pg_cron, pg_net, and schedule the notification queue processor.
 * Reads credentials from .env.local. Run: node scripts/run-push-cron-setup.mjs
 */
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
let dbPassword = '';
let serviceRoleKey = '';

try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (key === 'SUPABASE_DB_PASSWORD') dbPassword = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
    }
  }
} catch (e) {
  console.error('Could not read .env.local:', e.message);
  process.exit(1);
}

if (!dbPassword || !serviceRoleKey) {
  console.error('Need SUPABASE_DB_PASSWORD and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const connStr = `postgresql://postgres.xaxbbtzsyrtchtjrjvqy:${encodeURIComponent(dbPassword)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`;

async function main() {
  const client = new pg.Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('Enabling pg_cron...');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;');
    console.log('Enabling pg_net...');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;');

    console.log('Removing existing job if any...');
    await client.query("SELECT cron.unschedule('process-notification-queue')").catch(() => {});

    console.log('Scheduling process-notification-queue (every 2 min)...');
    await client.query(`
      SELECT cron.schedule(
        'process-notification-queue',
        '*/2 * * * *',
        $$
        SELECT net.http_post(
          url := 'https://xaxbbtzsyrtchtjrjvqy.supabase.co/functions/v1/process-notification-queue',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${serviceRoleKey.replace(/'/g, "''")}"}'::jsonb,
          body := '{}'::jsonb
        );
        $$
      );
    `);

    console.log('Done. Notification queue processor is scheduled to run every 2 minutes.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
