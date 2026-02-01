import { useState } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { upsertToBook, deleteToBook, newTaskId, moveToBooked } from '../lib/supabaseWrites';
import { parseLocalDate, todayIso, daysBetween, addDays } from '../lib/dates';
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

const defaultBookingFromTask = (task) => ({
  type: task.booking_type || 'Flight',
  travellers: task.assignee === 'Kimber' || task.assignee === 'Siona' ? task.assignee : 'Both',
  headline: '',
  start_date: task.start_date || '',
  end_date: task.end_date || '',
  details: task.instruction || '',
  confirmation_data: '',
  notes: task.notes || '',
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

const defaultTask = {
  assignee: 'Kimber',
  booking_type: 'Flight',
  start_date: '',
  end_date: '',
  deadline: '',
  instruction: '',
  notes: '',
};

export function PresentToBook() {
  const { data, loading, error, refetch } = useTravelData();
  const { isViewer } = useViewer();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultTask);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [moveToBookedTask, setMoveToBookedTask] = useState(null);
  const [moveToBookedForm, setMoveToBookedForm] = useState(null);

  const tasks = data?.toBookTasks || [];
  const today = todayIso();

  const sortByDeadline = (list) =>
    [...list].sort((a, b) => {
      const da = a.deadline ? String(a.deadline).slice(0, 10) : null;
      const db = b.deadline ? String(b.deadline).slice(0, 10) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    });

  const kimberTasks = sortByDeadline(tasks.filter((t) => (t.assignee || '').toLowerCase() === 'kimber'));
  const sionaTasks = sortByDeadline(tasks.filter((t) => (t.assignee || '').toLowerCase() === 'siona'));

  const openNew = () => {
    setEditingId(null);
    setForm(defaultTask);
    setSaveError('');
    setShowForm(true);
  };

  const openEdit = (task) => {
    setEditingId(task.task_id);
    setForm({
      assignee: task.assignee || 'Kimber',
      booking_type: task.booking_type || 'Flight',
      start_date: task.start_date || '',
      end_date: task.end_date || '',
      deadline: task.deadline || '',
      instruction: task.instruction || '',
      notes: task.notes || '',
    });
    setSaveError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultTask);
    setSaveError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const taskId = editingId || newTaskId();
      await upsertToBook({
        task_id: taskId,
        assignee: form.assignee,
        booking_type: form.booking_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        deadline: form.deadline || null,
        instruction: form.instruction || null,
        notes: form.notes || null,
        status: 'pending',
      });
      closeForm();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteToBook(taskId);
      if (editingId === taskId) closeForm();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to delete');
    }
  };

  const openMoveToBooked = (task) => {
    setMoveToBookedTask(task);
    setMoveToBookedForm(defaultBookingFromTask(task));
    setSaveError('');
  };

  const closeMoveToBooked = () => {
    setMoveToBookedTask(null);
    setMoveToBookedForm(null);
  };

  const handleMoveToBookedSubmit = async (e) => {
    e.preventDefault();
    if (!moveToBookedTask || !moveToBookedForm) return;
    setSaving(true);
    setSaveError('');
    try {
      await moveToBooked(moveToBookedTask, {
        type: moveToBookedForm.type,
        travellers: moveToBookedForm.travellers,
        headline: moveToBookedForm.headline || null,
        start_date: moveToBookedForm.start_date || null,
        end_date: moveToBookedForm.end_date || null,
        details: moveToBookedForm.details || null,
        confirmation_data: moveToBookedForm.confirmation_data || null,
        notes: moveToBookedForm.notes || null,
      });
      if (editingId === moveToBookedTask.task_id) closeForm();
      closeMoveToBooked();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to move to booked');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    const parsed = d ? parseLocalDate(d) : null;
    return parsed ? parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  };

  const getDeadlineStatus = (deadlineStr) => {
    if (!deadlineStr) return { label: null, isOverdue: false };
    const dl = String(deadlineStr).slice(0, 10);
    if (!dl) return { label: null, isOverdue: false };
    if (dl < today) {
      const overdueDays = daysBetween(dl, today);
      return { label: `Overdue ${overdueDays}d`, isOverdue: true };
    }
    if (dl === today) return { label: 'Due today', isOverdue: false };
    const daysLeft = daysBetween(today, dl);
    return { label: `Due in ${daysLeft}d`, isOverdue: false };
  };

  const TaskCard = ({ task }) => {
    const typeIcon = BOOKING_TYPE_ICON[task.booking_type] || 'plane';
    const { label: deadlineLabel, isOverdue } = getDeadlineStatus(task.deadline);
    const borderColor = isOverdue ? 'var(--color-error, #ef4444)' : 'var(--color-primary, #3b82f6)';
    return (
      <div
        style={{
          padding: 0,
          background: isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-bg-tertiary, #2a2a2a)',
          borderRadius: 10,
          marginBottom: 12,
          borderLeft: `4px solid ${borderColor}`,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
            background: isOverdue ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-bg-quaternary, #3a3a3a)',
            borderBottom: '1px solid var(--color-bg-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name={typeIcon} size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 15 }}>
              {task.booking_type}
            </span>
            {deadlineLabel && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isOverdue ? '#ef4444' : 'var(--color-text-tertiary)',
                  background: isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-bg-tertiary)',
                  padding: '3px 8px',
                  borderRadius: 12,
                }}
              >
                {deadlineLabel}
              </span>
            )}
          </div>
          {!isViewer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => openMoveToBooked(task)}
              style={{ ...iconBtnStyle, color: 'var(--color-primary)' }}
              aria-label="Move to booked"
            >
              <Icon name="arrow-right-left" size={18} />
            </button>
            <button
              type="button"
              onClick={() => openEdit(task)}
              style={iconBtnStyle}
              aria-label="Edit"
            >
              <span style={{ fontSize: 16 }}>✎</span>
            </button>
            <button
              type="button"
              onClick={() => handleDelete(task.task_id)}
              style={{ ...iconBtnStyle, color: 'var(--color-error)' }}
              aria-label="Delete"
            >
              <Icon name="x-close" size={16} />
            </button>
          </div>
          )}
        </div>
        <div style={{ padding: '12px 14px' }}>
          {(task.start_date || task.deadline) && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {task.start_date && formatDate(task.start_date)}
              {task.deadline && ` · Due ${formatDate(task.deadline)}`}
            </div>
          )}
          {task.instruction && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {task.instruction.slice(0, 120)}
              {task.instruction.length > 120 ? '…' : ''}
            </div>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ assignee, tasks: colTasks }) => (
    <div style={{ width: '100%', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{assignee}</h3>
        <span
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            background: 'var(--color-bg-quaternary)',
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          {colTasks.length}
        </span>
      </div>
      <div>
        {colTasks.map((t) => (
          <TaskCard key={t.task_id} task={t} />
        ))}
        {colTasks.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>No tasks</div>
        )}
      </div>
    </div>
  );

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={loading}>
      <div>
        <h1>TO BOOK</h1>
      <p>Tasks to book</p>

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
          Add To Book
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
          <h3 style={{ margin: '0 0 16px 0' }}>{editingId ? 'Edit Task' : 'New Booking Request'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="assignee" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  Assign To
                </label>
                <select
                  id="assignee"
                  value={form.assignee}
                  onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-bg-quaternary)',
                    borderRadius: 8,
                    color: 'inherit',
                    fontSize: 16,
                  }}
                >
                  <option value="Kimber">Kimber</option>
                  <option value="Siona">Siona</option>
                </select>
              </div>
              <div>
                <label htmlFor="type" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  Booking Type
                </label>
                <select
                  id="type"
                  value={form.booking_type}
                  onChange={(e) => setForm((f) => ({ ...f, booking_type: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-bg-quaternary)',
                    borderRadius: 8,
                    color: 'inherit',
                    fontSize: 16,
                  }}
                >
                  {BOOKING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label htmlFor="start" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  Start Date
                </label>
                <input
                  id="start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-bg-quaternary)',
                    borderRadius: 8,
                    color: 'inherit',
                    fontSize: 16,
                  }}
                />
              </div>
              <div>
                <label htmlFor="deadline" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  Deadline
                </label>
                <input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-bg-quaternary)',
                    borderRadius: 8,
                    color: 'inherit',
                    fontSize: 16,
                  }}
                />
              </div>
              <div>
                <label htmlFor="end" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                  End Date
                </label>
                <input
                  id="end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  min={form.start_date ? addDays(form.start_date, 1) : undefined}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-bg-quaternary)',
                    borderRadius: 8,
                    color: 'inherit',
                    fontSize: 16,
                  }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="instruction" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                Instruction
              </label>
              <textarea
                id="instruction"
                value={form.instruction}
                onChange={(e) => setForm((f) => ({ ...f, instruction: e.target.value }))}
                placeholder="What needs to be booked? Include routes, room types, budget, etc."
                rows={3}
                style={{
                  width: '100%',
                  padding: 10,
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-bg-quaternary)',
                  borderRadius: 8,
                  color: 'inherit',
                  fontSize: 16,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label htmlFor="notes" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Reference links, price caps, loyalty programs"
                rows={2}
                style={{
                  width: '100%',
                  padding: 10,
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-bg-quaternary)',
                  borderRadius: 8,
                  color: 'inherit',
                  fontSize: 16,
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
                {saving ? 'Saving…' : 'Save Request'}
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

      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Section assignee="Kimber" tasks={kimberTasks} />
        <Section assignee="Siona" tasks={sionaTasks} />
      </div>

      {moveToBookedTask && moveToBookedForm && (
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
          onClick={(e) => e.target === e.currentTarget && closeMoveToBooked()}
        >
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 16,
              border: '1px solid var(--color-bg-tertiary)',
              padding: 24,
              maxWidth: 400,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0' }}>Move to Booked</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Add the additional information required for a full booking.
            </p>
            <form onSubmit={handleMoveToBookedSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Booking Type</label>
                  <select
                    value={moveToBookedForm.type}
                    onChange={(e) => setMoveToBookedForm((f) => ({ ...f, type: e.target.value }))}
                    style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16 }}
                  >
                    {BOOKING_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Travellers</label>
                  <select
                    value={moveToBookedForm.travellers}
                    onChange={(e) => setMoveToBookedForm((f) => ({ ...f, travellers: e.target.value }))}
                    style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16 }}
                  >
                    {TRAVELLERS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Headline</label>
                <input
                  type="text"
                  value={moveToBookedForm.headline}
                  onChange={(e) => setMoveToBookedForm((f) => ({ ...f, headline: e.target.value }))}
                  placeholder="e.g. Townhouse in Fernie"
                  style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Start Date</label>
                  <input
                    type="date"
                    value={moveToBookedForm.start_date}
                    onChange={(e) => setMoveToBookedForm((f) => ({ ...f, start_date: e.target.value }))}
                    style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>End Date</label>
                  <input
                    type="date"
                    value={moveToBookedForm.end_date}
                    onChange={(e) => setMoveToBookedForm((f) => ({ ...f, end_date: e.target.value }))}
                    min={moveToBookedForm.start_date ? addDays(moveToBookedForm.start_date, 1) : undefined}
                    style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Details</label>
                <textarea
                  value={moveToBookedForm.details}
                  onChange={(e) => setMoveToBookedForm((f) => ({ ...f, details: e.target.value }))}
                  placeholder="Flight number, hotel name, etc."
                  rows={3}
                  style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Confirmation</label>
                <textarea
                  value={moveToBookedForm.confirmation_data}
                  onChange={(e) => setMoveToBookedForm((f) => ({ ...f, confirmation_data: e.target.value }))}
                  placeholder="Reference codes, check-in info"
                  rows={2}
                  style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Notes</label>
                <textarea
                  value={moveToBookedForm.notes}
                  onChange={(e) => setMoveToBookedForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: 10, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-bg-quaternary)', borderRadius: 8, color: 'inherit', fontSize: 16, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              {saveError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{saveError}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={saving} style={{ padding: '12px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Moving…' : 'Move to Booked'}
                </button>
                <button type="button" onClick={closeMoveToBooked} style={{ padding: '12px 20px', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer' }}>
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
