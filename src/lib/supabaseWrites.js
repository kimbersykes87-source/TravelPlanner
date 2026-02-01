/**
 * Supabase write helpers for Travel Planner.
 * Used by Present (To Book, Booked) and Future (Scenarios, Bucket List).
 */
import { supabase } from './supabase';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase client not configured');
}

/** Generate a unique task ID for to_book */
export function newTaskId() {
  return `tb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Generate a unique booking ID for booked_upcoming */
export function newBookingId() {
  return `bu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Insert or update a to_book task */
export async function upsertToBook(task) {
  requireSupabase();
  const { data, error } = await supabase
    .from('to_book')
    .upsert(task, { onConflict: 'task_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a to_book task */
export async function deleteToBook(taskId) {
  requireSupabase();
  const { error } = await supabase.from('to_book').delete().eq('task_id', taskId);
  if (error) throw error;
}

/** Insert or update a booked_upcoming booking */
export async function upsertBookedUpcoming(booking) {
  requireSupabase();
  const { data, error } = await supabase
    .from('booked_upcoming')
    .upsert(booking, { onConflict: 'booking_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a booked_upcoming booking */
export async function deleteBookedUpcoming(bookingId) {
  requireSupabase();
  const { error } = await supabase.from('booked_upcoming').delete().eq('booking_id', bookingId);
  if (error) throw error;
}

/** Move a to_book task to booked_upcoming (creates booking, deletes task). Override with extra booking fields if provided. */
export async function moveToBooked(task, bookingOverride = {}) {
  requireSupabase();
  const bookingId = newBookingId();
  const base = {
    booking_id: bookingId,
    type: task.booking_type || 'Flight',
    travellers: task.assignee || null,
    details: task.instruction || '',
    headline: `${task.booking_type || 'Booking'} – ${task.assignee || ''}`.trim(),
    start_date: task.start_date || null,
    end_date: task.end_date || null,
    notes: task.notes || null,
    created_from_task: task.task_id,
  };
  await supabase.from('booked_upcoming').insert({ ...base, ...bookingOverride });
  await supabase.from('to_book').delete().eq('task_id', task.task_id);
  return bookingId;
}

/** Move a booked_upcoming booking back to to_book (creates task, deletes booking). */
export async function moveToToBook(booking, taskOverride = {}) {
  requireSupabase();
  const taskId = newTaskId();
  const base = {
    task_id: taskId,
    assignee: booking.travellers || 'Kimber',
    booking_type: booking.type || 'Flight',
    start_date: booking.start_date || null,
    end_date: booking.end_date || null,
    instruction: booking.details || '',
    deadline: null,
    notes: booking.notes || null,
    status: 'pending',
  };
  await supabase.from('to_book').insert({ ...base, ...taskOverride });
  await supabase.from('booked_upcoming').delete().eq('booking_id', booking.booking_id);
  return taskId;
}

/** Generate scenario ID: SC- + 8 alphanumeric */
export function newScenarioId() {
  return `SC-${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 4)}`;
}

/** Generate stay ID: ST- + 8 alphanumeric */
export function newStayId() {
  return `ST-${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 4)}`;
}

/** Upsert scenario and replace all stays */
export async function upsertScenario(scenario, stays) {
  requireSupabase();
  const scenarioId = scenario.scenario_id || newScenarioId();
  await supabase.from('future_scenarios').upsert(
    {
      scenario_id: scenarioId,
      headline: scenario.headline || null,
      created_by: scenario.created_by || 'Jenny',
      rating: scenario.rating ?? 0,
      start_date: scenario.start_date || null,
      end_date: scenario.end_date || null,
      summary: scenario.summary || null,
      icon: scenario.icon || null,
      accommodation_type: scenario.accommodation_type || null,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'scenario_id' }
  );
  await supabase.from('scenario_stays').delete().eq('scenario_id', scenarioId);
  if (stays?.length) {
    const rows = stays.map((s) => ({
      scenario_id: scenarioId,
      stay_id: s.stay_id || newStayId(),
      profile_scope: s.profile_scope || null,
      country: s.country || null,
      city: s.city || null,
      start_date: s.start_date || null,
      end_date: s.end_date || null,
      notes: s.notes || null,
      accommodation_type: s.accommodation_type || null,
      route_notes: s.route_notes || null,
      image_url: s.image_url || null,
    }));
    await supabase.from('scenario_stays').insert(rows);
  }
  return scenarioId;
}

/** Delete scenario (cascade deletes stays) */
export async function deleteScenario(scenarioId) {
  requireSupabase();
  const { error } = await supabase.from('future_scenarios').delete().eq('scenario_id', scenarioId);
  if (error) throw error;
}

/** Update scenario rating only */
export async function updateScenarioRating(scenarioId, rating) {
  requireSupabase();
  const { error } = await supabase
    .from('future_scenarios')
    .update({ rating: Math.min(5, Math.max(0, rating)), last_updated: new Date().toISOString() })
    .eq('scenario_id', scenarioId);
  if (error) throw error;
}

/** Generate bucket list item ID */
export function newBucketListId() {
  return `BL-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Insert or update a bucket list item */
export async function upsertBucketListItem(item) {
  requireSupabase();
  const payload = {
    id: item.id || newBucketListId(),
    user: item.user || null,
    country: item.country || null,
    icon: item.icon || null,
    description: item.description || null,
    notes: item.notes || null,
    image_url: item.image_url || null,
    completed: item.completed ?? false,
    completed_date: item.completed_date || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('bucket_list')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a bucket list item */
export async function deleteBucketListItem(id) {
  requireSupabase();
  const { error } = await supabase.from('bucket_list').delete().eq('id', id);
  if (error) throw error;
}
