import { useState } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { upsertBookedUpcoming, deleteBookedUpcoming, newBookingId, moveToToBook } from '../lib/supabaseWrites';
import { parseLocalDate, todayIso, addDays } from '../lib/dates';
import { Icon } from '../components/Icon';
import { LoadingState } from '../components/LoadingState';
import { useViewer } from '../contexts/ViewerContext';

const BOOKING_TYPES = ['Flight', 'Accommodation', 'Hire Car', 'Ferry', 'Train'];

const BOOKING_TYPE_ICON = {
  Flight: 'plane',
  Accommodation: 'bed',
  'Hire Car': 'car-front',
  Ferry: 'ship',
  Train: 'train-front',
};

const TRAVELLERS = ['Both', 'Kimber', 'Siona'];

const defaultBooking = {
  type: 'Accommodation',
  travellers: 'Both',
  headline: '',
  start_date: '',
  end_date: '',
  details: '',
  confirmation_data: '',
  notes: '',
};

const defaultTaskFromBooking = (booking) => ({
  assignee: (booking.travellers || 'Both') === 'Both' ? 'Kimber' : booking.travellers || 'Kimber',
  booking_type: booking.type || 'Flight',
  start_date: booking.start_date ? String(booking.start_date).slice(0, 10) : '',
  end_date: booking.end_date ? String(booking.end_date).slice(0, 10) : '',
  deadline: '',
  instruction: booking.details || '',
  notes: booking.notes || '',
});

const iconBtnStyle = {
  padding: 6,
  background: 'transparent',
  border: 'none',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
};

export function PresentBooked() {
  const { data, loading, error, refetch } = useTravelData();
  const { isViewer } = useViewer();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultBooking);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [moveToToBookBooking, setMoveToToBookBooking] = useState(null);
  const [moveToToBookForm, setMoveToToBookForm] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);

  const today = todayIso();
  const bookings = (data?.bookedUpcoming || [])
    .filter((b) => {
      const end = (b.end_date || '').slice(0, 10);
      if (!end) return true;
      return end >= today;
    })
    .slice()
    .sort((a, b) => {
      const sa = (a.start_date || '').slice(0, 10);
      const sb = (b.start_date || '').slice(0, 10);
      if (!sa) return 1;
      if (!sb) return -1;
      return sa.localeCompare(sb);
    });

  const openNew = () => {
    setEditingId(null);
    setForm(defaultBooking);
    setSaveError('');
    setShowForm(true);
  };

  const openEdit = (booking) => {
    setEditingId(booking.booking_id);
    setForm({
      type: booking.type || 'Accommodation',
      travellers: booking.travellers || 'Both',
      headline: booking.headline || '',
      start_date: booking.start_date ? String(booking.start_date).slice(0, 10) : '',
      end_date: booking.end_date ? String(booking.end_date).slice(0, 10) : '',
      details: booking.details || '',
      confirmation_data: booking.confirmation_data || '',
      notes: booking.notes || '',
    });
    setSaveError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultBooking);
    setSaveError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const bookingId = editingId || newBookingId();
      await upsertBookedUpcoming({
        booking_id: bookingId,
        type: form.type || null,
        travellers: form.travellers || null,
        headline: form.headline || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        details: form.details || null,
        confirmation_data: form.confirmation_data || null,
        notes: form.notes || null,
      });
      closeForm();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await deleteBookedUpcoming(bookingId);
      if (editingId === bookingId) closeForm();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to delete');
    }
  };

  const openMoveToToBook = (booking) => {
    setMoveToToBookBooking(booking);
    setMoveToToBookForm(defaultTaskFromBooking(booking));
    setSaveError('');
  };

  const closeMoveToToBook = () => {
    setMoveToToBookBooking(null);
    setMoveToToBookForm(null);
  };

  const handleMoveToToBookSubmit = async (e) => {
    e.preventDefault();
    if (!moveToToBookBooking || !moveToToBookForm) return;
    setSaving(true);
    setSaveError('');
    try {
      await moveToToBook(moveToToBookBooking, {
        assignee: moveToToBookForm.assignee,
        booking_type: moveToToBookForm.booking_type,
        start_date: moveToToBookForm.start_date || null,
        end_date: moveToToBookForm.end_date || null,
        deadline: moveToToBookForm.deadline || null,
        instruction: moveToToBookForm.instruction || null,
        notes: moveToToBookForm.notes || null,
      });
      closeMoveToToBook();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to move to To Book');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    const parsed = d ? parseLocalDate(d) : null;
    return parsed ? parsed.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  };

  const DetailRow = ({ label, value, multiline }) => {
    if (value == null || String(value).trim() === '') return null;
    return (
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{ color: 'var(--color-text-primary)', whiteSpace: multiline ? 'pre-wrap' : 'normal', wordBreak: 'break-word' }}>
          {String(value).trim()}
        </div>
      </div>
    );
  };

  const inputStyle = {
    width: '100%',
    padding: 10,
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-bg-quaternary)',
    borderRadius: 8,
    color: 'inherit',
    fontSize: 16,
  };

  const cardBaseStyle = {
    padding: 0,
    background: 'var(--color-bg-tertiary, #2a2a2a)',
    borderRadius: 10,
    marginBottom: 12,
    borderLeft: '4px solid var(--color-primary, #3b82f6)',
    overflow: 'hidden',
    width: '100%',
    cursor: 'pointer',
  };

  const cardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    background: 'var(--color-bg-quaternary, #3a3a3a)',
    borderBottom: '1px solid var(--color-bg-tertiary)',
  };

  const cardBodyStyle = { padding: '12px 14px' };

  const BookingCard = ({ booking }) => {
    const typeIcon = BOOKING_TYPE_ICON[booking.type] || 'bed';
    const displayHeadline = booking.headline || booking.type || 'Booking';
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailBooking(booking)}
        onKeyDown={(e) => e.key === 'Enter' && setDetailBooking(booking)}
        style={cardBaseStyle}
      >
        <div style={cardHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name={typeIcon} size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 15 }}>
              {booking.type || 'Booking'}
            </span>
            {booking.travellers && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  background: 'var(--color-bg-tertiary)',
                  padding: '3px 8px',
                  borderRadius: 12,
                }}
              >
                {booking.travellers}
              </span>
            )}
          </div>
          {!isViewer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openMoveToToBook(booking)}
              style={{ ...iconBtnStyle, color: 'var(--color-primary)' }}
              aria-label="Move to To Book"
            >
              <Icon name="arrow-right-left" size={18} />
            </button>
            <button
              type="button"
              onClick={() => openEdit(booking)}
              style={iconBtnStyle}
              aria-label="Edit"
            >
              <span style={{ fontSize: 16 }}>✎</span>
            </button>
            <button
              type="button"
              onClick={() => handleDelete(booking.booking_id)}
              style={{ ...iconBtnStyle, color: 'var(--color-error)' }}
              aria-label="Delete"
            >
              <Icon name="x-close" size={16} />
            </button>
          </div>
          )}
        </div>
        <div style={cardBodyStyle}>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {displayHeadline}
          </div>
          {(booking.start_date || booking.end_date) && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {booking.start_date && formatDate(booking.start_date)}
              {booking.start_date && booking.end_date && ' → '}
              {booking.end_date && formatDate(booking.end_date)}
            </div>
          )}
          {booking.details && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {booking.details.slice(0, 120)}
              {booking.details.length > 120 ? '…' : ''}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={loading}>
      <div>
        <h1>BOOKED</h1>

      {!isViewer && (
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={openNew}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'var(--color-primary, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>+</span>
          Add Booking
        </button>
      </div>
      )}

      {showForm && (
        <div
          style={{
            padding: 20,
            background: 'var(--color-bg-secondary)',
            borderRadius: 15,
            marginBottom: 20,
            border: '1px solid var(--color-bg-tertiary)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>{editingId ? 'Edit Booking' : 'Add Booking'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="type" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  Booking Type
                </label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  style={inputStyle}
                >
                  {BOOKING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="travellers" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  Travellers
                </label>
                <select
                  id="travellers"
                  value={form.travellers}
                  onChange={(e) => setForm((f) => ({ ...f, travellers: e.target.value }))}
                  style={inputStyle}
                >
                  {TRAVELLERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="headline" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                Headline
              </label>
              <input
                id="headline"
                type="text"
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder="e.g. Townhouse in Fernie"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="start_date" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  Start Date
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="end_date" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  End Date
                </label>
                <input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  min={form.start_date ? addDays(form.start_date, 1) : undefined}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label htmlFor="details" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                Details
              </label>
              <textarea
                id="details"
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="Flight number, hotel name, etc."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label htmlFor="confirmation" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                Confirmation
              </label>
              <textarea
                id="confirmation"
                value={form.confirmation_data}
                onChange={(e) => setForm((f) => ({ ...f, confirmation_data: e.target.value }))}
                placeholder="Reference codes, check-in info"
                rows={2}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label htmlFor="notes" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                Notes
              </label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Extra notes or reminders"
                rows={2}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {saveError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '12px 20px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Booking'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  padding: '12px 20px',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ width: '100%' }}>
        {bookings.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>No confirmed bookings yet</div>
        ) : (
          bookings.map((b) => <BookingCard key={b.booking_id} booking={b} />)
        )}
      </div>

      {detailBooking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-detail-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={() => setDetailBooking(null)}
        >
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 16,
              border: '1px solid var(--color-bg-tertiary)',
              padding: 24,
              maxWidth: 420,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 id="booking-detail-title" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {detailBooking.headline || detailBooking.type || 'Booking'}
              </h2>
              <button
                type="button"
                onClick={() => setDetailBooking(null)}
                aria-label="Close"
                style={{ ...iconBtnStyle, marginTop: -4 }}
              >
                <Icon name="x-close" size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <DetailRow label="Type" value={detailBooking.type} />
              <DetailRow label="Travellers" value={detailBooking.travellers} />
              {(detailBooking.start_date || detailBooking.end_date) && (
                <DetailRow
                  label="Dates"
                  value={`${detailBooking.start_date ? formatDate(detailBooking.start_date) : '—'} → ${detailBooking.end_date ? formatDate(detailBooking.end_date) : '—'}`}
                />
              )}
              <DetailRow label="Details" value={detailBooking.details} multiline />
              <DetailRow label="Confirmation" value={detailBooking.confirmation_data} multiline />
              <DetailRow label="Notes" value={detailBooking.notes} multiline />
            </div>
            {!isViewer && (
              <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { openEdit(detailBooking); setDetailBooking(null); }}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { openMoveToToBook(detailBooking); setDetailBooking(null); }}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-bg-quaternary)',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Move to To Book
                </button>
                <button
                  type="button"
                  onClick={() => { handleDelete(detailBooking.booking_id); setDetailBooking(null); }}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    color: 'var(--color-error)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {moveToToBookBooking && moveToToBookForm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={(e) => e.target === e.currentTarget && closeMoveToToBook()}
        >
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 16,
              border: '1px solid var(--color-bg-tertiary)',
              padding: 24,
              maxWidth: 400,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0' }}>Move to To Book</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Add details for the To Book task.
            </p>
            <form onSubmit={handleMoveToToBookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Assign To</label>
                <select
                  value={moveToToBookForm.assignee}
                  onChange={(e) => setMoveToToBookForm((f) => ({ ...f, assignee: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="Kimber">Kimber</option>
                  <option value="Siona">Siona</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Booking Type</label>
                <select
                  value={moveToToBookForm.booking_type}
                  onChange={(e) => setMoveToToBookForm((f) => ({ ...f, booking_type: e.target.value }))}
                  style={inputStyle}
                >
                  {BOOKING_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Start Date</label>
                  <input
                    type="date"
                    value={moveToToBookForm.start_date}
                    onChange={(e) => setMoveToToBookForm((f) => ({ ...f, start_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>End Date</label>
                  <input
                    type="date"
                    value={moveToToBookForm.end_date}
                    onChange={(e) => setMoveToToBookForm((f) => ({ ...f, end_date: e.target.value }))}
                    min={moveToToBookForm.start_date ? addDays(moveToToBookForm.start_date, 1) : undefined}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Deadline</label>
                <input
                  type="date"
                  value={moveToToBookForm.deadline}
                  onChange={(e) => setMoveToToBookForm((f) => ({ ...f, deadline: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Instruction</label>
                <textarea
                  value={moveToToBookForm.instruction}
                  onChange={(e) => setMoveToToBookForm((f) => ({ ...f, instruction: e.target.value }))}
                  placeholder="What needs to be booked?"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Notes</label>
                <textarea
                  value={moveToToBookForm.notes}
                  onChange={(e) => setMoveToToBookForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              {saveError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{saveError}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={saving} style={{ padding: '12px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Moving…' : 'Move to To Book'}
                </button>
                <button type="button" onClick={closeMoveToToBook} style={{ padding: '12px 20px', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </LoadingState>
  );
}
