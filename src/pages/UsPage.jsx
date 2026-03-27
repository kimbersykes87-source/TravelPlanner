import { useState } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { useViewer } from '../contexts/ViewerContext';
import {
  calcUkTaxDays,
  calcUkWorkDays,
  calcUsEsta,
  calcSionaUsDays,
  calcSchengen,
  formatDdMmYy,
  formatBorn,
} from '../lib/visaCalculations';
import { Icon } from '../components/Icon';
import { LoadingState } from '../components/LoadingState';

function formatFrequentFlyer(ff) {
  if (ff == null) return '';
  const s = String(ff).trim();
  if (!s) return '';
  return s.replace(/\s*:\s*/g, ' - ');
}

function ProfileCard({ profile, relationshipLog }) {
  const [visaExpanded, setVisaExpanded] = useState(false);
  const isKimber = (profile.full_name || '').toLowerCase().includes('kimber');
  const profileKey = isKimber ? 'kimber' : 'siona';

  const ukTax = calcUkTaxDays(relationshipLog, profileKey);
  const ukWork = calcUkWorkDays(relationshipLog, profileKey);
  const esta = isKimber ? calcUsEsta(relationshipLog) : null;
  const sionaUs = !isKimber ? calcSionaUsDays(relationshipLog) : null;
  const schengen = calcSchengen(relationshipLog, profileKey);

  const passport1Label = isKimber ? 'British Passport' : 'Passport';
  const passport1 =
    profile.passport_number &&
    `${passport1Label}: ${profile.passport_number}${profile.passport_expiry ? ` (Expiry ${formatDdMmYy(profile.passport_expiry)})` : ''}`;

  const passport2 =
    profile.passport2_number &&
    `${profile.passport2_country || ''} Passport: ${profile.passport2_number}${profile.passport2_expiry ? ` (Expiry ${formatDdMmYy(profile.passport2_expiry)})` : ''}`.trim();

  const frequentFlyers = [
    profile.frequent_flyer_1 ?? profile.frequentFlyer1,
    profile.frequent_flyer_2 ?? profile.frequentFlyer2,
    profile.frequent_flyer_3 ?? profile.frequentFlyer3,
    profile.frequent_flyer_4 ?? profile.frequentFlyer4,
  ].filter((ff) => ff != null && String(ff).trim() !== '');

  const VisaTile = ({ name, value, sub, warning }) => (
    <div
      style={{
        padding: 12,
        background: 'var(--color-bg-tertiary)',
        borderRadius: 10,
        borderLeft: `4px solid ${warning ? 'var(--color-warning, #f59e0b)' : 'var(--color-primary)'}`,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{name}</span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: warning ? 'var(--color-warning)' : 'var(--color-primary)',
          }}
        >
          {value}
        </span>
      </div>
      {sub && (
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{sub}</p>
      )}
    </div>
  );

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

      {(passport1 || passport2 || frequentFlyers.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          {(passport1 || passport2) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: frequentFlyers.length > 0 ? 12 : 0 }}>
              {passport1 && (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>{passport1}</p>
              )}
              {passport2 && (
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>{passport2}</p>
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
          <VisaTile
            name="UK Tax Days"
            value={`${ukTax.remaining} days remaining`}
            sub={`Tax year ends ${formatDdMmYy(ukTax.taxYearEnd)} · ${ukTax.ukDays} days used`}
          />
          <VisaTile
            name="UK Work Days"
            value={`${ukWork.remaining} remaining`}
            sub={`${ukWork.workDays} days used` + (ukWork.warning ? ' · Work tie warning' : '')}
            warning={ukWork.warning}
          />
          {esta && (
            <VisaTile
              name="US ESTA"
              value={esta.inAdmission ? `${esta.admissionDays} days (${esta.remaining} remaining)` : 'Not in US'}
              sub={
                esta.inAdmission && esta.admissionStart
                  ? `Admission from ${formatDdMmYy(esta.admissionStart)}`
                  : null
              }
            />
          )}
          {sionaUs && (
            <VisaTile
              name="US B1/B2"
              value={`${sionaUs.usDays} days (${sionaUs.remaining} remaining)`}
              sub="Rolling 365 days"
            />
          )}
          <VisaTile
            name="Schengen"
            value={`${schengen.daysUsed} days used`}
            sub={
              schengen.fullRefreshDate
                ? `Full refresh ${formatDdMmYy(schengen.fullRefreshDate)}`
                : `${schengen.remaining} days remaining`
            }
          />
        </div>
        )}
      </div>
    </div>
  );
}

export function UsPage() {
  const { data, loading, error } = useTravelData();
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
            <ProfileCard key={p.profile_id} profile={p} relationshipLog={data.relationshipLog || []} />
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-tertiary)' }}>No profiles yet. Sync from Sheets to Supabase.</p>
      )}
      </div>
    </LoadingState>
  );
}
