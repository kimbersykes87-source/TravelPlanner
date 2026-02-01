import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TABLE_TO_TYPE: Record<string, string> = {
  future_scenarios: 'scenario',
  statistics: 'country',
  bucket_list: 'bucket_list',
  to_book: 'to_book',
  booked_upcoming: 'booked',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
  schema: string;
  old_record: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ ok: true, skipped: 'not INSERT' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const notificationType = TABLE_TO_TYPE[payload.table];
    if (!notificationType) {
      return new Response(JSON.stringify({ ok: true, skipped: 'unknown table' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const recordId =
      (payload.record?.scenario_id as string) ??
      (payload.record?.country as string) ??
      (payload.record?.id as string) ??
      (payload.record?.task_id as string) ??
      (payload.record?.booking_id as string) ??
      '';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('notification_queue').insert({
      type: notificationType,
      record_id: recordId,
    });

    if (error) {
      console.error('enqueue-notification error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, type: notificationType }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('enqueue-notification error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
