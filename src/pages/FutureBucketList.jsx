import { useState } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { upsertBucketListItem, deleteBucketListItem, newBucketListId } from '../lib/supabaseWrites';
import { codeToIso2, ISO3_TO_ISO2 } from '../lib/countryFlags';
import { Icon } from '../components/Icon';
import { LoadingState } from '../components/LoadingState';
import { useViewer } from '../contexts/ViewerContext';

const BUCKET_ICONS = [
  { value: 'adventure', label: 'Adventure' },
  { value: 'beach', label: 'Beach' },
  { value: 'camping', label: 'Camping' },
  { value: 'dining', label: 'Dining' },
  { value: 'hikiing', label: 'Hiking' },
  { value: 'mountains', label: 'Mountains' },
  { value: 'nature', label: 'Nature' },
  { value: 'resort', label: 'Resort' },
  { value: 'roadTrip', label: 'Road Trip' },
  { value: 'SilverSprings', label: 'Silver Springs' },
  { value: 'snowboarding', label: 'Snowboarding' },
  { value: 'sunny', label: 'Sunny' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'vineyard', label: 'Vineyard' },
];

const USER_OPTIONS = [
  { value: 'Kimber', label: 'Kimber' },
  { value: 'Siona', label: 'Siona' },
];

function getCountryIso2(country, countries = []) {
  if (!country) return '';
  const name = String(country).trim();
  const byName = countries.find((c) => (c.country_name || '').trim().toLowerCase() === name.toLowerCase());
  if (byName?.iso2) return (byName.iso2 || '').trim().toUpperCase();
  const iso3 = (byName?.iso3 || '').toUpperCase();
  if (iso3 && ISO3_TO_ISO2[iso3]) return ISO3_TO_ISO2[iso3];
  return codeToIso2(name, countries, name) || '';
}

const defaultForm = () => ({
  user: 'Kimber',
  country: '',
  icon: 'adventure',
  description: '',
  notes: '',
  image_url: '',
  completed: false,
});

export function FutureBucketList() {
  const { data, loading, error, refetch } = useTravelData();
  const { isViewer } = useViewer();
  const bucketList = data?.bucketList || [];
  const countries = data?.countries || [];

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm());
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      user: item.user || 'Kimber',
      country: item.country || '',
      icon: item.icon || 'adventure',
      description: item.description || '',
      notes: item.notes || '',
      image_url: item.image_url || '',
      completed: !!item.completed,
    });
    setSaveError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await upsertBucketListItem({
        id: editingId || newBucketListId(),
        user: form.user,
        country: form.country?.trim() || null,
        icon: form.icon || null,
        description: form.description?.trim() || null,
        notes: form.notes?.trim() || null,
        image_url: form.image_url?.trim() || null,
        completed: form.completed,
      });
      closeModal();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bucket list item?')) return;
    try {
      await deleteBucketListItem(id);
      if (editingId === id) closeModal();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to delete');
    }
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

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={loading}>
      <div>
        <h1>BUCKET LIST</h1>

      {!isViewer && (
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={openNew}
          style={{
            padding: '12px 20px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add bucket list item
        </button>
      </div>
      )}

      {bucketList.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)' }}>No bucket list items yet. Add your first one!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {bucketList.map((item) => (
            <BucketTile
              key={item.id}
              item={item}
              countries={countries}
              getCountryIso2={getCountryIso2}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
              isViewer={isViewer}
            />
          ))}
        </div>
      )}

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? 'Edit bucket list item' : 'New bucket list item'}
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
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 16,
              border: '1px solid var(--color-bg-quaternary)',
              padding: 24,
              maxWidth: 480,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {editingId ? 'Edit bucket list item' : 'New bucket list item'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                <Icon name="x-close" size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>USER</label>
                <select
                  value={form.user}
                  onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                  style={inputStyle}
                >
                  {USER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>SCENARIO ICON</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 8,
                    padding: 12,
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 10,
                    border: '1px solid var(--color-bg-quaternary)',
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {BUCKET_ICONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon: opt.value }))}
                      title={opt.label}
                      style={{
                        aspectRatio: 1,
                        padding: 8,
                        background: form.icon === opt.value ? 'var(--color-primary)' : 'var(--color-bg-quaternary)',
                        border: `2px solid ${form.icon === opt.value ? 'var(--color-primary)' : 'transparent'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={`/assets/scenario-icons/${opt.value}.svg`}
                        alt={opt.label}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          filter: form.icon === opt.value ? 'brightness(0) invert(1)' : 'none',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>DESCRIPTION</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Visit the Northern Lights"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>COUNTRY</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="e.g. Norway"
                  list="bucket-country-list"
                  style={inputStyle}
                />
                <datalist id="bucket-country-list">
                  {(countries || [])
                    .map((c) => c.country_name || c.country || '')
                    .filter(Boolean)
                    .slice(0, 200)
                    .map((name) => (
                      <option key={name} value={name} />
                    ))}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>IMAGE URL (OPTIONAL)</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  style={inputStyle}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Square images work best (1:1)
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>NOTES</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional notes"
                  style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="completed"
                  checked={form.completed}
                  onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
                />
                <label htmlFor="completed" style={{ fontSize: 14 }}>Completed</label>
              </div>

              {saveError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{saveError}</p>}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={closeModal}
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
                {editingId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingId)}
                    style={{
                      padding: '12px 20px',
                      background: 'none',
                      color: 'var(--color-error)',
                      border: 'none',
                      fontSize: 15,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Delete
                  </button>
                )}
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
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
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

function BucketTile({ item, countries, getCountryIso2, onEdit, onDelete, isViewer }) {
  const iso2 = getCountryIso2(item.country, countries);
  const hasImage = !!(item.image_url || '').trim();

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        background: hasImage
          ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${item.image_url}) center/cover`
          : 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-bg-quaternary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 16,
      }}
    >
      {!isViewer && (
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="paint-bucket" size={16} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="x-close" size={16} />
        </button>
      </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {iso2 && (
          <img
            src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
            alt=""
            style={{
              width: 24,
              height: 18,
              objectFit: 'cover',
              borderRadius: 2,
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          />
        )}
        <span
          style={{
            fontSize: 14,
            color: hasImage ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)',
            textShadow: hasImage ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {item.country || '—'}
        </span>
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: hasImage ? '#fff' : 'var(--color-text-primary)',
          textShadow: hasImage ? '0 1px 2px rgba(0,0,0,0.6)' : 'none',
          lineHeight: 1.3,
        }}
      >
        {item.description || 'Untitled'}
      </div>

      {item.completed && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--color-text-tertiary)',
            textShadow: hasImage ? '0 1px 1px rgba(0,0,0,0.4)' : 'none',
          }}
        >
          ✓ Completed
        </div>
      )}
    </div>
  );
}
