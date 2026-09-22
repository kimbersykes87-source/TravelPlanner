import { useState, useRef } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import {
  upsertBucketListItem,
  deleteBucketListItem,
  newBucketListId,
  uploadBucketListPhoto,
} from '../lib/supabaseWrites';
import { countryToIso2 } from '../lib/countryFlags';
import { Icon } from '../components/Icon';
import { LoadingState } from '../components/LoadingState';
import { useViewer } from '../hooks/useViewer';
import { SCENARIO_ICONS as BUCKET_ICONS, scenarioIconPath } from '../lib/scenarioIcons';
// BUCKET_ICONS is the same shared list used by Future > Scenarios, so the
// two icon pickers can't drift out of sync (see ../lib/scenarioIcons).

const USER_OPTIONS = [
  { value: 'Kimber', label: 'Kimber' },
  { value: 'Siona', label: 'Siona' },
];

/** ISO2 for a stay/bucket-list country name (for the flag). */
const getCountryIso2 = (country) => countryToIso2(country);

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
  const bucketList = data.bucketList;
  const countries = data.countries;

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [photoBroken, setPhotoBroken] = useState(false);
  const [formId, setFormId] = useState(null);
  const fileInputRef = useRef(null);

  const openNew = () => {
    setEditingId(null);
    setFormId(newBucketListId());
    setForm(defaultForm());
    setSaveError('');
    setUploadError('');
    setPhotoBroken(false);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormId(item.id);
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
    setUploadError('');
    setPhotoBroken(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  /**
   * Upload a photo straight from the phone/computer to Supabase Storage,
   * instead of relying on finding a direct image link. A pasted link from a
   * Photos app share sheet is usually a web PAGE, not a raw image file, so
   * it silently fails to render as a background image - this is the fix.
   */
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const url = await uploadBucketListPhoto(formId || newBucketListId(), file);
      setForm((f) => ({ ...f, image_url: url }));
      setPhotoBroken(false);
    } catch (err) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await upsertBucketListItem({
        id: formId || editingId || newBucketListId(),
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
                        src={scenarioIconPath(opt.value)}
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
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>PHOTO (OPTIONAL)</label>

                {form.image_url?.trim() && !photoBroken && (
                  <img
                    src={form.image_url.trim()}
                    alt=""
                    onError={() => setPhotoBroken(true)}
                    style={{
                      width: 96,
                      height: 96,
                      objectFit: 'cover',
                      borderRadius: 10,
                      marginBottom: 8,
                      border: '1px solid var(--color-bg-quaternary)',
                    }}
                  />
                )}
                {form.image_url?.trim() && photoBroken && (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-error)' }}>
                    That link didn't load as an image. Try "Upload photo" instead, or paste a direct
                    image link (one that ends in .jpg/.png, not a share-page link).
                  </p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '10px 16px',
                      background: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-bg-quaternary)',
                      borderRadius: 8,
                      color: 'inherit',
                      fontSize: 14,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading ? 0.7 : 1,
                    }}
                  >
                    {uploading ? 'Uploading…' : 'Upload photo'}
                  </button>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, image_url: '' }));
                        setPhotoBroken(false);
                      }}
                      style={{
                        padding: '10px 16px',
                        background: 'none',
                        border: '1px solid var(--color-bg-quaternary)',
                        borderRadius: 8,
                        color: 'var(--color-text-secondary)',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {uploadError && (
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-error)' }}>{uploadError}</p>
                )}

                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, image_url: e.target.value }));
                    setPhotoBroken(false);
                  }}
                  placeholder="…or paste a direct image link (https://...)"
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
  const [imgFailed, setImgFailed] = useState(false);
  const trimmedUrl = (item.image_url || '').trim();
  // Treated as "no image" whenever the URL is blank OR it failed to load
  // (e.g. a pasted link that points at a share page instead of a raw
  // image), so the tile always falls back to something sensible instead
  // of showing a blank tile.
  const hasImage = !!trimmedUrl && !imgFailed;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        background: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-bg-quaternary)',
      }}
    >
      {trimmedUrl && (
        <img
          src={trimmedUrl}
          alt=""
          onError={() => setImgFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: imgFailed ? 'none' : 'block',
          }}
        />
      )}
      {hasImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55))',
          }}
        />
      )}
      <img
        src={scenarioIconPath(item.icon)}
        alt=""
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '42%',
          height: '42%',
          objectFit: 'contain',
          opacity: hasImage ? 0.5 : 0.18,
          filter: hasImage ? 'brightness(0) invert(1)' : 'none',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
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
    </div>
  );
}
