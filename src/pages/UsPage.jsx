import { useMemo, useState } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { useViewer } from '../hooks/useViewer';
import { personVisaSummary, WARNING_THRESHOLD } from '../lib/visa/engine';
import { formatDdMmYy, formatBorn, passportLabel, days } from '../lib/format';
import { Icon } from '../components/Icon';
import { LoadingState } from '../components/LoadingState';
import { LastSynced } from '../components/LastSynced';
import { AccountPanel } from '../components/AccountPanel';

function formatFrequentFlyer(ff) {
  if (ff == null) return '';
  const s = String(ff).trim();
  if (!s) return '';
  return s.replace(/\s*:\s*/g, ' - ');
}

const TILE_COLOR = {
  ok: 'var(--color-primary)',
  warning: 'var(--color-warning, #f59e0b)',
  error: 'var(--color-error, #ef4444)',
};

/** A visa tile: name, headline figure, and up to three short detail lines. */
function VisaTile({ name, value, lines = [], status = 'ok' }) {
  const color = TILE_COLOR[status] || TILE_COLOR.ok;
  const shown = lines.filter(Boolean);
  return (
    <div
      style={{
        padding: 12,
        background: 'var(--color-bg-tertiary)',
        borderRadius: 10,
        borderLeft: `4px solid ${color}`,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{name}</span>
        <span style={{ fontSize: 16, fontWeight: 600, color, textAlign: 'right' }}>{value}</span>
      </div>
      {shown.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {shown.map((line) => (
            <p key={line} style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const statusFor = (remaining, ruleId, breached = false) =>
  breached || remaining <= 0 ? 'error' : remaining <= (WARNING_THRESHOLD[ruleId] ?? 0) ? 'warning' : 'ok';

function VisaTiles({ summary }) {
  const { uk, schengen, usEsta, usB1B2 } = summary;
  const ukAfterPlans = uk.days.planned > 0 ? `After planned days: ${days(uk.days.remainingAfterPlans)} left` : null;
  const workAfterPlans = uk.work.planned > 0 ? `After planned work days: ${uk.work.remainingAfterPlans} left` : null;

  return (
    <>
      <VisaTile
        name="UK Tax Days"
        value={`${days(uk.days.remaining)} left`}
        status={statusFor(uk.days.remaining, 'UK-TAX', uk.days.remainingAfterPlans < 0)}
        lines={[
          `${uk.days.used} of ${uk.days.limit} used this tax year`,
          ukAfterPlans,
          `Tax year ends ${formatDdMmYy(uk.taxYearEnd)}`,
        ]}
      />
      <VisaTile
        name="UK Work Days"
        value={uk.work.tieTriggered ? 'Work tie triggered' : `${days(uk.work.remaining)} left`}
        status={statusFor(uk.work.remaining, 'UK-WORK', uk.work.tieTriggered || uk.work.remainingAfterPlans < 0)}
        lines={[`${uk.work.used} of ${uk.work.limit} used (40 or more creates a work tie)`, workAfterPlans]}
      />
      {usEsta && <EstaTile esta={usEsta} />}
      {usB1B2 && (
        <VisaTile
          name="US B1/B2 (guide)"
          value={`${days(usB1B2.remaining)} left`}
          status={statusFor(usB1B2.remaining, 'US-ROLLING365', !!usB1B2.plannedBreachOn)}
          lines={[
            `${usB1B2.used} of ${usB1B2.limit} days in the US in the last ${usB1B2.windowDays} days`,
            usB1B2.plannedBreachOn ? `Planned trips go over on ${formatDdMmYy(usB1B2.plannedBreachOn)}` : null,
            'Each stay is limited by the I-94 date given at entry',
          ]}
        />
      )}
      <VisaTile
        name="Schengen"
        value={`${days(schengen.remaining)} left`}
        status={statusFor(schengen.remaining, 'SCHENGEN-ROLLING', !!schengen.plannedBreachOn)}
        lines={[
          `${schengen.used} of ${schengen.limit} used in the last ${schengen.windowDays} days`,
          schengen.plannedBreachOn ? `Planned trips go over on ${formatDdMmYy(schengen.plannedBreachOn)}` : null,
          schengen.fullyClearsOn ? `Back to 90 on ${formatDdMmYy(schengen.fullyClearsOn)} if you stay out` : null,
        ]}
      />
    </>
  );
}

function EstaTile({ esta }) {
  if (esta.inAdmission) {
    return (
      <VisaTile
        name="US ESTA"
        value={`${days(esta.remaining)} left`}
        status={statusFor(esta.remaining, 'US-ADMISSION', esta.plannedOverLimit)}
        lines={[
          `Day ${esta.daysUsed} of ${esta.limit}, entered ${formatDdMmYy(esta.admissionStart)}`,
          `Must leave by ${formatDdMmYy(esta.mustLeaveBy)}`,
          esta.plannedExit
            ? `Planned exit ${formatDdMmYy(esta.plannedExit)}${esta.plannedOverLimit ? ' (over the limit)' : ''}`
            : null,
        ]}
      />
    );
  }
  const next = esta.nextEntry;
  return (
    <VisaTile
      name="US ESTA"
      value="Not in the US"
      status={next?.overLimit ? 'error' : 'ok'}
      lines={[
        esta.lastAdmission
          ? `Last stay ${formatDdMmYy(esta.lastAdmission.start)} to ${formatDdMmYy(esta.lastAdmission.end)} (${days(esta.lastAdmission.days)})`
          : null,
        next
          ? `Next entry ${formatDdMmYy(next.start)}, planned ${days(next.days)}${next.overLimit ? ' (over the 90-day limit)' : ''}`
          : null,
      ]}
    />
  );
}

function ProfileCard({ profile, relationshipLog, visaRules }) {
  const [visaExpanded, setVisaExpanded] = useState(false);
  const person = String(profile.profile_id || profile.full_name || '').toLowerCase().includes('siona') ? 'siona' : 'kimber';
  const summary = useMemo(
    () => personVisaSummary(relationshipLog, person, { visaRules }),
    [relationshipLog, person, visaRules]
  );

  // Both hold British passports as their primary passport.
  const passport1 =
    profile.passport_number &&
    `${passportLabel('United Kingdom')}: ${profile.passport_number}${profile.passport_expiry ? ` (Expiry ${formatDdMmYy(profile.passport_expiry)})` : ''}`;

  const passport2 =
    profile.passport2_number &&
    `${passportLabel(profile.passport2_country)}: ${profile.passport2_number}${profile.passport2_expiry ? ` (Expiry ${formatDdMmYy(profile.passport2_expiry)})` : ''}`;

  const usVisa =
    profile.us_visa_number &&
    `US B1/B2 Visa: ${profile.us_visa_number}${profile.us_visa_expiry ? ` (Expiry ${formatDdMmYy(profile.us_visa_expiry)})` : ''}`;

  const frequentFlyers = [
    profile.frequent_flyer_1,
    profile.frequent_flyer_2,
    profile.frequent_flyer_3,
    profile.frequent_flyer_4,
  ].filter((ff) => ff != null && String(ff).trim() !== '');

  return (
    <div
      style={{
        background: 'var(--color-bg-secondary)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        border: '1px solid var(--color-bg-tertiary)',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        {profile.profile_picture_url && (
          <img
            src={profile.profile_picture_url}
            alt={profile.full_name || ''}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {profile.full_name || 'Unknown'}
          </h3>
          {profile.dob && (
            <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
              {formatBorn(profile.dob)}
            </p>
          )}
        </div>
      </div>

      {(passport1 || passport2 || usVisa || frequentFlyers.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          {(passport1 || passport2 || usVisa) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: frequentFlyers.length > 0 ? 12 : 0 }}>
              {passport1 && (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>{passport1}</p>
              )}
              {passport2 && (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>{passport2}</p>
              )}
              {usVisa && (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>{usVisa}</p>
              )}
            </div>
          )}
          {frequentFlyers.length > 0 && (
            <div>
              <h4
                style={{
                  margin: '0 0 6px 0',
                  fontSize: 14,
                  color: 'var(--color-text-tertiary)',
                  fontWeight: 600,
                }}
              >
                Frequent Flyer
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {frequentFlyers.map((ff, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    {formatFrequentFlyer(ff)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-bg-tertiary)' }}>
        <button
          type="button"
          onClick={() => setVisaExpanded((v) => !v)}
          aria-expanded={visaExpanded}
          aria-controls={`visa-tracking-${profile.profile_id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: 0,
            margin: '0 0 12px 0',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-tertiary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="passport" size={18} />
            Visa Tracking
          </span>
          <Icon name={visaExpanded ? 'chevron-up' : 'chevron-down'} size={20} />
        </button>
        {visaExpanded && (
        <div id={`visa-tracking-${profile.profile_id}`} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <VisaTiles summary={summary} />
        </div>
        )}
      </div>
    </div>
  );
}

export function UsPage() {
  const { data, loading, error, lastSync } = useTravelData();
  const { isViewer } = useViewer();

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={loading}>
      <div>
        <h1
        style={{
          margin: '0 0 20px 0',
          fontSize: '1.5rem',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.12em',
        }}
      >
        US
      </h1>
      {!isViewer && <LastSynced lastSync={lastSync} />}

      {isViewer ? (
        <div
          style={{
            padding: 24,
            background: 'var(--color-bg-tertiary)',
            borderRadius: 12,
            border: '1px solid var(--color-bg-quaternary)',
            color: 'var(--color-text-secondary)',
            fontSize: 15,
            textAlign: 'center',
          }}
        >
          Hidden for obvious reasons
        </div>
      ) : data.profiles.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.profiles.map((p) => (
            <ProfileCard key={p.profile_id} profile={p} relationshipLog={data.relationshipLog} visaRules={data.visaRules} />
          ))}
          <AccountPanel />
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-tertiary)' }}>No profiles yet. Run Travel Planner, Sync to Supabase in the Google Sheet.</p>
      )}
      </div>
    </LoadingState>
  );
}
