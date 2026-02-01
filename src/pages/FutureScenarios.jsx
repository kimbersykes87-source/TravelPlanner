import { useState, useMemo, useEffect } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { upsertScenario, deleteScenario, newScenarioId, newStayId } from '../lib/supabaseWrites';
import { parseLocalDate, daysBetween, addDays } from '../lib/dates';
import { codeToIso2, ISO3_TO_ISO2 } from '../lib/countryFlags';
import { isSchengen, isUs } from '../lib/visaCalculations';
import { getVisaRemainingForCard } from '../lib/scenarioVisaValidation';
import { Icon } from '../components/Icon';
import { LoadingState } from '../components/LoadingState';
import { useViewer } from '../contexts/ViewerContext';

function getCountryIso2(country, countries = []) {
  if (!country) return '';
  const name = String(country).trim();
  const byName = countries.find((c) => (c.country_name || '').trim().toLowerCase() === name.toLowerCase());
  if (byName?.iso2) return (byName.iso2 || '').trim().toUpperCase();
  const iso3 = (byName?.iso3 || '').toUpperCase();
  if (iso3 && ISO3_TO_ISO2[iso3]) return ISO3_TO_ISO2[iso3];
  return codeToIso2(name, countries, name) || '';
}

const SCENARIO_ICONS = [
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

const SCENARIO_ICON_PATH = (value) => {
  const v = value || 'adventure';
  const legacyMap = { hiking: 'hikiing', future: 'adventure' };
  const file = legacyMap[v] || v;
  return `/assets/scenario-icons/${file}.svg`;
};

const PROFILE_SCOPE_OPTIONS = [
  { value: 'both', label: 'Together' },
  { value: 'Kimber', label: 'Kimber' },
  { value: 'Siona', label: 'Siona' },
];

const ACCOMMODATION_TYPES = [
  { value: '', label: 'Select accommodation' },
  { value: 'VanFrito', label: 'VanFrito' },
  { value: 'VanTutu', label: 'VanTutu' },
  { value: 'AirBNB', label: 'AirBNB' },
  { value: 'Private House', label: 'Private House' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Hostel', label: 'Hostel' },
  { value: 'Camping', label: 'Camping' },
];

const defaultStay = () => ({
  stay_id: newStayId(),
  profile_scope: 'both',
  country: '',
  city: '',
  start_date: '',
  end_date: '',
  notes: '',
  accommodation_type: '',
  route_notes: '',
  image_url: '',
});

const defaultScenario = {
  headline: '',
  created_by: 'Jenny',
  summary: '',
  icon: 'adventure',
  accommodation_type: '',
};

function formatDateLong(d) {
  const parsed = d ? parseLocalDate(d) : null;
  return parsed ? parsed.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

function formatDateShort(d) {
  const parsed = d ? parseLocalDate(d) : null;
  return parsed ? parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function formatDateShare(d) {
  const parsed = d ? parseLocalDate(d) : null;
  return parsed ? parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
}

function normalizeCreatedBy(v) {
  if (!v) return 'Jenny';
  if (String(v).toLowerCase() === 'kimber') return 'Jenny';
  return v;
}

export function FutureScenarios() {
  const { data, loading, error, refetch } = useTravelData();
  const { isViewer } = useViewer();
  const scenarios = data?.futureScenarios || [];
  const scenarioStays = data?.scenarioStays || [];
  const countries = data?.countries || [];
  const relationshipLog = data?.relationshipLog || [];
  const visaRules = data?.visaRules || [];

  const [visaByScenario, setVisaByScenario] = useState({});
  const [visaCalculating, setVisaCalculating] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [shareScenario, setShareScenario] = useState(null);
  const [detailScenario, setDetailScenario] = useState(null);
  const [scenarioIconOpen, setScenarioIconOpen] = useState(false);
  const [scenario, setScenario] = useState(defaultScenario);
  const [stays, setStays] = useState([]);
  const [validation, setValidation] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedScenarios = useMemo(() => {
    return [...scenarios].sort((a, b) => {
      const getEffectiveStart = (sc) => {
        const fromSc = (sc.start_date || '').toString().slice(0, 10);
        if (fromSc) return fromSc;
        const stays = scenarioStays.filter((s) => s.scenario_id === sc.scenario_id);
        const starts = stays.map((s) => (s.start_date || '').toString().slice(0, 10)).filter(Boolean);
        return starts.length ? starts.sort()[0] : '';
      };
      const sa = getEffectiveStart(a);
      const sb = getEffectiveStart(b);
      if (!sa) return 1;
      if (!sb) return -1;
      return sa.localeCompare(sb);
    });
  }, [scenarios, scenarioStays]);

  const getStaysForScenario = (scenarioId) =>
    scenarioStays.filter((s) => s.scenario_id === scenarioId).sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

  useEffect(() => {
    if (!scenarios?.length || !relationshipLog) {
      setVisaByScenario({});
      setVisaCalculating(false);
      return;
    }
    setVisaCalculating(true);
    const id = requestAnimationFrame(() => {
      const next = {};
      for (const sc of scenarios) {
        const stays = getStaysForScenario(sc.scenario_id);
        const { startDate, endDate } = deriveScenarioFromStays(stays);
        if (startDate && endDate && stays.length) {
          next[sc.scenario_id] = getVisaRemainingForCard(
            { start_date: startDate, end_date: endDate },
            stays,
            relationshipLog,
            visaRules
          );
        } else {
          next[sc.scenario_id] = { schengenRemaining: null, usaRemaining: null };
        }
      }
      setVisaByScenario(next);
      setVisaCalculating(false);
    });
    return () => cancelAnimationFrame(id);
  }, [scenarios, scenarioStays, relationshipLog, visaRules]);

  const deriveScenarioFromStays = (staysList) => {
    if (!staysList?.length) return { startDate: null, endDate: null, durationDays: 0, staysByDate: [], travellers: [] };
    const sorted = [...staysList].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    const starts = staysList.map((s) => s.start_date).filter(Boolean);
    const ends = staysList.map((s) => s.end_date).filter(Boolean);
    const startDate = starts.length ? starts.sort()[0] : null;
    const endDate = ends.length ? ends.sort().reverse()[0] : null;
    const rawDuration = startDate && endDate ? daysBetween(startDate, endDate) : 0;
    const durationDays = Math.max(1, rawDuration);
    const staysByDate = sorted.map((s) => {
      const rawDays = s.start_date && s.end_date ? daysBetween(s.start_date, s.end_date) : 0;
      return {
        country: (s.country || '').trim(),
        days: Math.max(1, rawDays),
        notes: (s.notes || '').trim() || null,
      };
    }).filter((s) => s.country);
    const travellerSet = new Set(staysList.map((s) => s.profile_scope || 'both'));
    return {
      startDate,
      endDate,
      durationDays,
      staysByDate,
      travellers: [...travellerSet],
    };
  };

  const openNew = () => {
    setEditingId(null);
    setScenario(defaultScenario);
    setStays([defaultStay()]);
    setValidation(null);
    setSaveError('');
    setScenarioIconOpen(false);
    setShowEditor(true);
  };

  const openEdit = (sc) => {
    setEditingId(sc.scenario_id);
    setScenarioIconOpen(false);
    setScenario({
      headline: sc.headline || '',
      created_by: normalizeCreatedBy(sc.created_by),
      summary: sc.summary || '',
      icon: sc.icon || 'adventure',
      accommodation_type: sc.accommodation_type || '',
    });
    const scStays = getStaysForScenario(sc.scenario_id);
    setStays(
      scStays.length
        ? scStays.map((s) => ({
            stay_id: s.stay_id,
            profile_scope: s.profile_scope || 'both',
            country: s.country || '',
            city: s.city || '',
            start_date: s.start_date ? String(s.start_date).slice(0, 10) : '',
            end_date: s.end_date ? String(s.end_date).slice(0, 10) : '',
            notes: s.notes || '',
            accommodation_type: s.accommodation_type || '',
            route_notes: s.route_notes || '',
            image_url: s.image_url || '',
          }))
        : [defaultStay()]
    );
    setValidation(null);
    setSaveError('');
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingId(null);
  };

  const openShareView = (sc) => setShareScenario(sc);
  const closeShareView = () => setShareScenario(null);
  const openDetailView = (sc) => setDetailScenario(sc);
  const closeDetailView = () => setDetailScenario(null);

  const addStay = () => {
    const last = stays[stays.length - 1];
    const nextStart = last?.end_date ? (() => {
      const d = parseLocalDate(last.end_date);
      if (!d) return '';
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })() : '';
    setStays([...stays, { ...defaultStay(), start_date: nextStart, end_date: nextStart }]);
  };

  const removeStay = (idx) => {
    if (stays.length <= 1) return;
    setStays(stays.filter((_, i) => i !== idx));
  };

  const updateStay = (idx, updates) => {
    setStays(stays.map((s, i) => (i === idx ? { ...s, ...updates } : s)));
  };

  const runValidation = () => {
    const errors = [];
    const warnings = [];
    if (!scenario.headline?.trim()) errors.push('Headline is required');
    const validStays = stays.filter((s) => (s.country || '').trim() && s.start_date && s.end_date);
    if (validStays.length === 0) {
      warnings.push('Scenario does not contain any stays with country and dates');
      errors.push('Add at least one stay with country and start/end dates to save.');
    }
    for (let idx = 0; idx < validStays.length; idx++) {
      const s = validStays[idx];
      const start = (s.start_date || '').toString().trim().slice(0, 10);
      const end = (s.end_date || '').toString().trim().slice(0, 10);
      if (end && start && end < start) {
        errors.push(`Stay ${idx + 1} in ${s.country} (${start} → ${end}): end date must be on or after start date`);
      }
    }
    const { startDate, endDate, durationDays } = deriveScenarioFromStays(validStays);
    if (durationDays > 366) errors.push('Scenario duration cannot exceed 366 days');
    const result = {
      errors,
      warnings,
      breakdown: [],
      checked: true,
      valid: errors.length === 0,
    };
    setValidation(result);
    return result;
  };

  const handleCheckScenario = () => {
    runValidation();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const result = runValidation();
    if (!result.valid) return;
    setSaving(true);
    setSaveError('');
    try {
      const validStays = stays.filter((s) => (s.country || '').trim() && s.start_date && s.end_date);
      const { startDate, endDate } = deriveScenarioFromStays(validStays);
      const scenarioId = editingId || newScenarioId();
      await upsertScenario(
        {
          scenario_id: scenarioId,
          headline: scenario.headline?.trim() || null,
          created_by: scenario.created_by || 'Jenny',
          rating: 0,
          start_date: startDate || null,
          end_date: endDate || null,
          summary: scenario.summary?.trim() || null,
          icon: scenario.icon || null,
          accommodation_type: scenario.accommodation_type || null,
        },
        validStays.map((s) => {
          const start = (s.start_date || '').toString().trim().slice(0, 10) || null;
          const end = (s.end_date || '').toString().trim().slice(0, 10) || null;
          return {
            stay_id: s.stay_id,
            profile_scope: (s.profile_scope || 'both').toLowerCase(),
            country: s.country?.trim() || null,
            city: s.city?.trim() || null,
            start_date: start,
            end_date: end,
            notes: s.notes?.trim() || null,
            accommodation_type: s.accommodation_type || null,
            route_notes: s.route_notes?.trim() || null,
            image_url: s.image_url?.trim() || null,
          };
        })
      );
      closeEditor();
      refetch?.();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scenarioId) => {
    if (!confirm('Delete this scenario?')) return;
    try {
      await deleteScenario(scenarioId);
      if (editingId === scenarioId) closeEditor();
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

  const ScenarioCard = ({ sc }) => {
    const scStays = getStaysForScenario(sc.scenario_id);
    const { durationDays, staysByDate, travellers } = deriveScenarioFromStays(scStays);
    const hasSchengen = staysByDate.some((s) => isSchengen(s.country));
    const hasUs = staysByDate.some((s) => isUs(s.country));
    const visaResult = visaByScenario[sc.scenario_id];
    const schengenRemaining = visaResult?.schengenRemaining ?? null;
    const usaRemaining = visaResult?.usaRemaining ?? null;
    const showVisaSpinner = (hasSchengen || hasUs) && visaCalculating && !visaResult;
    const travellerLabel = travellers.includes('both') && (travellers.includes('Kimber') || travellers.includes('Siona'))
      ? 'Kimber & Siona'
      : travellers.includes('both')
        ? 'Together'
        : travellers.join(', ');

    return (
      <div
        style={{
          padding: 16,
          background: 'var(--color-bg-tertiary)',
          borderRadius: 12,
          marginBottom: 16,
          border: '1px solid var(--color-bg-quaternary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={SCENARIO_ICON_PATH(sc.icon)}
              alt=""
              style={{ width: 24, height: 24, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              onError={(e) => { e.target.src = '/assets/scenario-icons/adventure.svg'; }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{(sc.headline || 'Untitled').toUpperCase()}</h3>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Created by {normalizeCreatedBy(sc.created_by)} • {sc.start_date && sc.end_date ? `${formatDateShort(sc.start_date)} → ${formatDateShort(sc.end_date)}` : 'Dates TBC'}
            </div>
          </div>
        </div>
        {!isViewer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => openEdit(sc)}
            aria-label="Edit scenario"
            style={{
              padding: 8,
              background: 'none',
              color: 'var(--color-text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="pencil" size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(sc.scenario_id)}
            aria-label="Delete scenario"
            style={{
              padding: 8,
              background: 'none',
              color: 'var(--color-error)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="delete" size={20} style={{ color: 'var(--color-error)' }} />
          </button>
        </div>
        )}
        {staysByDate.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {staysByDate.map((stay, i) => {
              const iso2 = getCountryIso2(stay.country, countries);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: stay.notes ? 8 : 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {iso2 && (
                      <img
                        src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
                        alt=""
                        style={{ width: 24, height: 18, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
                      />
                    )}
                    <span>{stay.country}{stay.days ? ` · ${stay.days} day${stay.days === 1 ? '' : 's'}` : ''}</span>
                  </div>
                  {stay.notes && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', paddingLeft: iso2 ? 32 : 0, fontStyle: 'italic' }}>
                      {stay.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {durationDays > 0 && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                background: 'var(--color-bg-quaternary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {durationDays} day{durationDays === 1 ? '' : 's'}
            </span>
          )}
          {staysByDate.length > 0 && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                background: 'var(--color-bg-quaternary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {staysByDate.length} stays
            </span>
          )}
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 12,
              background: 'var(--color-bg-quaternary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {travellerLabel}
          </span>
          {showVisaSpinner && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                background: 'var(--color-bg-quaternary)',
                color: 'var(--color-primary)',
              }}
              title="Calculating visa requirements"
            >
              <span className="plane-spin" style={{ display: 'flex', alignItems: 'center' }}>
                <Icon name="plane" size={16} style={{ color: 'var(--color-primary)' }} />
              </span>
              Calculating…
            </span>
          )}
          {!showVisaSpinner && schengenRemaining != null && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                background: 'var(--color-bg-quaternary)',
                color: 'var(--color-primary)',
              }}
            >
              Schengen: {schengenRemaining} days remaining
            </span>
          )}
          {!showVisaSpinner && usaRemaining != null && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                background: 'var(--color-bg-quaternary)',
                color: 'var(--color-primary)',
              }}
            >
              USA: {usaRemaining} days remaining
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => openShareView(sc)}
            style={{
              flex: 1,
              padding: 12,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Share
          </button>
          {!isViewer && (
          <button
            type="button"
            onClick={() => openDetailView(sc)}
            style={{
              flex: 1,
              padding: 12,
              background: 'var(--color-bg-quaternary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-bg-quaternary)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Details
          </button>
          )}
        </div>
      </div>
    );
  };

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={loading}>
      <div>
        <h1>SCENARIOS</h1>

      {!isViewer && (
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
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
          Create New Scenario
        </button>
      </div>
      )}

      {visaCalculating && sortedScenarios.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '8px 12px',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 8,
            border: '1px solid var(--color-bg-quaternary)',
            fontSize: 14,
            color: 'var(--color-text-secondary)',
          }}
        >
          <span className="plane-spin" style={{ display: 'flex', alignItems: 'center' }}>
            <Icon name="plane" size={20} style={{ color: 'var(--color-primary)' }} />
          </span>
          Calculating visa requirements…
        </div>
      )}
      {sortedScenarios.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)' }}>No scenarios yet. Start planning your next adventure!</p>
      ) : (
        sortedScenarios.map((sc) => <ScenarioCard key={sc.scenario_id} sc={sc} />)
      )}

      {showEditor && (
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
          onClick={(e) => e.target === e.currentTarget && closeEditor()}
        >
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 16,
              border: '1px solid var(--color-bg-tertiary)',
              padding: 24,
              maxWidth: 560,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{editingId ? 'Edit Scenario' : 'Create Scenario'}</h2>
              <button
                type="button"
                onClick={closeEditor}
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
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>HEADLINE</label>
                <input
                  type="text"
                  value={scenario.headline}
                  onChange={(e) => setScenario((s) => ({ ...s, headline: e.target.value }))}
                  placeholder="e.g. Tentative Agreed Plan"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>CREATED BY</label>
                <select
                  value={scenario.created_by || 'Jenny'}
                  onChange={(e) => setScenario((s) => ({ ...s, created_by: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="Jenny">Jenny</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>SCENARIO DATES</label>
                <input
                  type="text"
                  readOnly
                  value={
                    (() => {
                      const { startDate, endDate, durationDays } = deriveScenarioFromStays(stays);
                      if (!startDate || !endDate) return 'Dates TBC';
                      return `${formatDateShort(startDate)} → ${formatDateShort(endDate)} • ${durationDays} day${durationDays === 1 ? '' : 's'}`;
                    })()
                  }
                  style={{ ...inputStyle, background: 'var(--color-bg-quaternary)', cursor: 'default' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>SCENARIO ICON</label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setScenarioIconOpen((o) => !o)}
                    style={{
                      ...inputStyle,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <img
                      src={SCENARIO_ICON_PATH(scenario.icon)}
                      alt=""
                      style={{ width: 18, height: 18, objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
                      onError={(e) => { e.target.src = '/assets/scenario-icons/adventure.svg'; }}
                    />
                    {SCENARIO_ICONS.find((o) => o.value === scenario.icon)?.label || 'Adventure'}
                  </button>
                  {scenarioIconOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-bg-quaternary)',
                        borderRadius: 8,
                        maxHeight: 280,
                        overflowY: 'auto',
                        zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      }}
                    >
                      {SCENARIO_ICONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            setScenario((s) => ({ ...s, icon: o.value }));
                            setScenarioIconOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 12px',
                            background: scenario.icon === o.value ? 'var(--color-bg-quaternary)' : 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: 14,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <img
                            src={SCENARIO_ICON_PATH(o.value)}
                            alt=""
                            style={{ width: 18, height: 18, objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>OVERVIEW / NOTES</label>
                <textarea
                  value={scenario.summary}
                  onChange={(e) => setScenario((s) => ({ ...s, summary: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>ITINERARY BUILDER</label>
                <div
                  style={{
                    border: '2px dashed var(--color-bg-quaternary)',
                    borderRadius: 12,
                    padding: 20,
                    background: 'var(--color-bg-tertiary)',
                  }}
                >
                  {stays.map((stay, idx) => (
                    <div
                      key={stay.stay_id}
                      style={{
                        padding: 16,
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 10,
                        marginBottom: idx < stays.length - 1 ? 16 : 0,
                        border: '1px solid var(--color-bg-quaternary)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600 }}>STAY {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeStay(idx)}
                          disabled={stays.length <= 1}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-error)',
                            cursor: stays.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            opacity: stays.length <= 1 ? 0.5 : 1,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>TRAVELLERS</label>
                          <select
                            value={stay.profile_scope}
                            onChange={(e) => updateStay(idx, { profile_scope: e.target.value })}
                            style={inputStyle}
                          >
                            {PROFILE_SCOPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>COUNTRY</label>
                          <input
                            type="text"
                            value={stay.country}
                            onChange={(e) => updateStay(idx, { country: e.target.value })}
                            placeholder="Start typing a country"
                            list={`country-list-${idx}`}
                            style={inputStyle}
                          />
                          <datalist id={`country-list-${idx}`}>
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
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>START DATE</label>
                          <input
                            type="date"
                            value={stay.start_date}
                            onChange={(e) => updateStay(idx, { start_date: e.target.value })}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>END DATE</label>
                          <input
                            type="date"
                            value={stay.end_date}
                            onChange={(e) => updateStay(idx, { end_date: e.target.value })}
                            min={stay.start_date ? addDays(stay.start_date, 1) : undefined}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>ACCOMMODATION</label>
                          <select
                            value={stay.accommodation_type}
                            onChange={(e) => updateStay(idx, { accommodation_type: e.target.value })}
                            style={inputStyle}
                          >
                            {ACCOMMODATION_TYPES.map((o) => (
                              <option key={o.value || 'empty'} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>NOTES</label>
                          <textarea
                            value={stay.notes}
                            onChange={(e) => updateStay(idx, { notes: e.target.value })}
                            rows={2}
                            style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>ROUTE / KEY CITIES</label>
                          <textarea
                            value={stay.route_notes}
                            onChange={(e) => updateStay(idx, { route_notes: e.target.value })}
                            rows={2}
                            style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>IMAGE URL (OPTIONAL)</label>
                          <input
                            type="url"
                            value={stay.image_url}
                            onChange={(e) => updateStay(idx, { image_url: e.target.value })}
                            placeholder="https://..."
                            style={inputStyle}
                          />
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                            Horizontal images work better (16:9)
                          </p>
                        </div>
                        {stay.image_url && (
                          <div
                            style={{
                              width: '100%',
                              aspectRatio: '16/9',
                              borderRadius: 8,
                              overflow: 'hidden',
                              background: 'var(--color-bg-quaternary)',
                            }}
                          >
                            <img
                              src={stay.image_url}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center',
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addStay}
                    style={{
                      marginTop: 12,
                      padding: '10px 16px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>+</span> Add stay
                  </button>
                </div>
              </div>

              {validation?.checked && (
                <div
                  style={{
                    padding: 12,
                    background: validation.valid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    borderRadius: 10,
                    border: `1px solid ${validation.valid ? '#22c55e' : '#ef4444'}`,
                  }}
                >
                  {validation.errors?.length > 0 ? (
                    <>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>Validation Errors</div>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {validation.errors.map((err, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            {err}
                          </li>
                        ))}
                      </ul>
                      <p style={{ margin: '8px 0 0', fontSize: 13 }}>Please fix these errors before saving.</p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600 }}>All checks passed!</div>
                      {validation.warnings?.length > 0 && (
                        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13 }}>
                          {validation.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      )}
                      <p style={{ margin: '8px 0 0', fontSize: 13 }}>Ready to save.</p>
                    </>
                  )}
                </div>
              )}

              {!validation?.checked && (
                <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                  Click &apos;Check Scenario&apos; to validate visa requirements and other checks.
                </p>
              )}

              {saveError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{saveError}</p>}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={closeEditor}
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
                <button
                  type="button"
                  onClick={handleCheckScenario}
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
                  Check Scenario
                </button>
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
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving ? 0.8 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save Scenario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shareScenario && (() => {
        const sc = shareScenario;
        const scStays = getStaysForScenario(sc.scenario_id)
          .filter((s) => (s.country || '').trim() && s.start_date && s.end_date)
          .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
        const { startDate, endDate } = deriveScenarioFromStays(scStays);
        const shareStays = scStays.map((s) => {
          let a = s.start_date;
          let b = s.end_date;
          if (a && b && a > b) [a, b] = [b, a];
          const raw = a && b ? daysBetween(a, b) : 0;
          const days = Math.max(1, raw);
          return { ...s, start_date: a, end_date: b, days };
        });
        const shareStart = shareStays.length ? shareStays.map((s) => s.start_date).filter(Boolean).sort()[0] : null;
        const shareEnd = shareStays.length ? shareStays.map((s) => s.end_date).filter(Boolean).sort().reverse()[0] : null;
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share scenario"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'min(20px, 3vw)',
              background: 'var(--color-bg-primary)',
              overflow: 'hidden',
              height: '100dvh',
            }}
            onClick={(e) => e.target === e.currentTarget && closeShareView()}
          >
            <button
              type="button"
              onClick={closeShareView}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'var(--color-bg-tertiary)',
                border: 'none',
                width: 40,
                height: 40,
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="x-close" size={24} />
            </button>
            <div
              style={{
                width: '100%',
                maxWidth: 520,
                height: '100%',
                maxHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1,
                minHeight: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 'clamp(18px, 4vw, 24px)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                {(sc.headline || 'Untitled').toUpperCase()}
              </h2>
              <div
                style={{
                  fontSize: 'clamp(20px, 5vw, 28px)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                {shareStart && shareEnd
                  ? `${formatDateShort(shareStart)} → ${formatDateShort(shareEnd)}`
                  : 'Dates TBC'}
              </div>
              <div
                style={{
                  fontSize: 'clamp(16px, 3vw, 20px)',
                  fontFamily: 'var(--font-handwritten)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                Created by {normalizeCreatedBy(sc.created_by)}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {shareStays.map((stay, i) => {
                  const iso2 = getCountryIso2(stay.country, countries);
                  return (
                    <div
                      key={stay.stay_id || i}
                      style={{
                        position: 'relative',
                        borderRadius: 10,
                        overflow: 'hidden',
                        flex: 1,
                        minHeight: 0,
                        background: stay.image_url
                          ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(${stay.image_url}) center/cover`
                          : 'var(--color-bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 'clamp(11px, 2vw, 13px)',
                          color: 'rgba(255,255,255,0.95)',
                          fontWeight: 600,
                          flexShrink: 0,
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                        }}
                      >
                        {formatDateShare(stay.start_date)} – {formatDateShare(stay.end_date)}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {iso2 && (
                            <img
                              src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
                              alt=""
                              style={{
                                width: 28,
                                height: 21,
                                objectFit: 'cover',
                                borderRadius: 4,
                                flexShrink: 0,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: 'clamp(14px, 2.5vw, 16px)',
                              fontWeight: 600,
                              color: '#fff',
                              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                            }}
                          >
                            {stay.country}
                          </span>
                          <span
                            style={{
                              fontSize: 'clamp(12px, 2vw, 14px)',
                              color: 'rgba(255,255,255,0.9)',
                              marginLeft: 'auto',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            }}
                          >
                            {stay.days} day{stay.days === 1 ? '' : 's'}
                          </span>
                        </div>
                        {(stay.notes || '').trim() && (
                          <div
                            style={{
                              fontSize: 'clamp(11px, 2vw, 13px)',
                              color: 'rgba(255,255,255,0.9)',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              lineHeight: 1.3,
                            }}
                          >
                            {stay.notes.trim()}
                          </div>
                        )}
                        {(stay.route_notes || '').trim() && (
                          <div
                            style={{
                              fontSize: 'clamp(11px, 2vw, 13px)',
                              color: 'rgba(255,255,255,0.85)',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              lineHeight: 1.3,
                            }}
                          >
                            {stay.route_notes.trim()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {detailScenario && !isViewer && (() => {
        const sc = detailScenario;
        const scStays = getStaysForScenario(sc.scenario_id).sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
        const { durationDays, staysByDate, travellers } = deriveScenarioFromStays(scStays);
        const hasSchengen = staysByDate.some((s) => isSchengen(s.country));
        const hasUs = staysByDate.some((s) => isUs(s.country));
        const visaResult = visaByScenario[sc.scenario_id];
        const schengenRemaining = visaResult?.schengenRemaining ?? null;
        const usaRemaining = visaResult?.usaRemaining ?? null;
        const showVisaSpinner = (hasSchengen || hasUs) && visaCalculating && !visaResult;
        const travellerLabel = travellers.includes('both') && (travellers.includes('Kimber') || travellers.includes('Siona'))
          ? 'Kimber & Siona'
          : travellers.includes('both')
            ? 'Together'
            : travellers.join(', ');

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Scenario details"
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
            onClick={(e) => e.target === e.currentTarget && closeDetailView()}
          >
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: 16,
                border: '1px solid var(--color-bg-quaternary)',
                width: '100%',
                maxWidth: 560,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-bg-quaternary)',
                  flexShrink: 0,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18 }}>Visa Check</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!isViewer && (
                  <button
                    type="button"
                    onClick={() => {
                      closeDetailView();
                      openEdit(sc);
                    }}
                    style={{
                      padding: '8px 16px',
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
                  )}
                  <button
                    type="button"
                    onClick={closeDetailView}
                    aria-label="Close"
                    style={{
                      background: 'var(--color-bg-tertiary)',
                      border: 'none',
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="x-close" size={20} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  overflowY: 'auto',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{(sc.headline || 'Untitled').toUpperCase()}</h3>
                  <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Created by {normalizeCreatedBy(sc.created_by)} • {sc.start_date && sc.end_date ? `${formatDateShort(sc.start_date)} → ${formatDateShort(sc.end_date)}` : 'Dates TBC'}
                  </div>
                  {durationDays > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                      {durationDays} day{durationDays === 1 ? '' : 's'} • {staysByDate.length} stays • {travellerLabel}
                    </div>
                  )}
                </div>

                {sc.summary && (
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>OVERVIEW</h4>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{sc.summary}</p>
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>VISA</h4>
                  {showVisaSpinner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-primary)' }}>
                      <span className="plane-spin"><Icon name="plane" size={18} style={{ color: 'var(--color-primary)' }} /></span>
                      Calculating visa requirements…
                    </div>
                  )}
                  {!showVisaSpinner && schengenRemaining != null && (
                    <div style={{ padding: '10px 14px', background: 'var(--color-bg-tertiary)', borderRadius: 8, marginBottom: 8, fontSize: 14 }}>
                      <strong>Schengen:</strong> {schengenRemaining} days remaining
                    </div>
                  )}
                  {!showVisaSpinner && usaRemaining != null && (
                    <div style={{ padding: '10px 14px', background: 'var(--color-bg-tertiary)', borderRadius: 8, fontSize: 14 }}>
                      <strong>USA:</strong> {usaRemaining} days remaining
                    </div>
                  )}
                  {!showVisaSpinner && schengenRemaining == null && usaRemaining == null && (hasSchengen || hasUs) && (
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-tertiary)' }}>No visa limits for this scenario.</p>
                  )}
                  {!hasSchengen && !hasUs && (
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-tertiary)' }}>No Schengen or USA stays in this scenario.</p>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>ITINERARY</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {scStays.filter((s) => (s.country || '').trim()).map((stay, i) => {
                      const iso2 = getCountryIso2(stay.country, countries);
                      let a = stay.start_date;
                      let b = stay.end_date;
                      if (a && b && a > b) [a, b] = [b, a];
                      const raw = a && b ? daysBetween(a, b) : 0;
                      const days = Math.max(1, raw);
                      return (
                        <div
                          key={stay.stay_id || i}
                          style={{
                            padding: 14,
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 10,
                            border: '1px solid var(--color-bg-quaternary)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            {iso2 && (
                              <img
                                src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
                                alt=""
                                style={{ width: 28, height: 21, objectFit: 'cover', borderRadius: 4 }}
                              />
                            )}
                            <span style={{ fontWeight: 600, fontSize: 15 }}>{stay.country}</span>
                            {stay.city && <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>· {stay.city}</span>}
                            <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
                              {days} day{days === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                            {a && b ? `${formatDateShort(a)} → ${formatDateShort(b)}` : 'Dates TBC'}
                          </div>
                          {stay.image_url && (
                            <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', background: 'var(--color-bg-quaternary)' }}>
                              <img
                                src={stay.image_url}
                                alt=""
                                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', objectPosition: 'center' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}
                          {stay.accommodation_type && (
                            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                              <strong>Accommodation:</strong> {stay.accommodation_type}
                            </div>
                          )}
                          {stay.notes && (
                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                              {stay.notes}
                            </div>
                          )}
                          {stay.route_notes && (
                            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                              <strong>Route:</strong> {stay.route_notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </LoadingState>
  );
}
