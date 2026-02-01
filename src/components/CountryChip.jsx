/**
 * Country chip with flag. Uses flagcdn.com (requires 2-letter ISO code).
 * @param {string} country - Country name
 * @param {string} iso2 - ISO 3166-1 alpha-2 code (e.g. GB, US) for flag
 * @param {string} variant - 'together' | 'kimber' | 'siona' for styling
 */
export function CountryChip({ country, iso2, variant = 'together' }) {
  const code = (iso2 || '').trim();
  const flagSrc =
    code.length === 2
      ? `https://flagcdn.com/w40/${code.toLowerCase()}.png`
      : null;

  const bgColor =
    variant === 'kimber'
      ? 'var(--color-bg-quaternary)'
      : variant === 'siona'
        ? 'rgba(236, 72, 153, 0.25)'
        : 'rgba(168, 85, 247, 0.3)';

  const borderColor =
    variant === 'kimber'
      ? 'var(--color-primary)'
      : variant === 'siona'
        ? 'var(--color-siona, #ec4899)'
        : 'var(--color-together, #a855f7)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {flagSrc && (
        <img
          src={flagSrc}
          alt=""
          style={{ width: 24, height: 18, objectFit: 'cover', borderRadius: 2 }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <span>{country || 'Unknown'}</span>
    </span>
  );
}
