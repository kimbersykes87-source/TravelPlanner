/**
 * Extract normalized country identifiers from a GeoJSON feature.
 * Handles Natural Earth, datasets/geo-countries, and other property name variants.
 * Filters -99 sentinel values (unassigned/unknown).
 */
export function getCountryIds(feature) {
  const p = feature?.properties || {};
  const raw = (v) => (v == null ? '' : String(v).trim());
  const rejectSentinel = (v) => (raw(v) === '-99' || raw(v) === '' ? '' : raw(v).toUpperCase());
  const iso2 = rejectSentinel(
    p.ISO_A2 || p.ISO_A2_EH || p['ISO3166-1-Alpha-2'] || p['ISO3166-1-ALPHA-2'] || p.ISO3166_1_Alpha_2
  );
  const postal = rejectSentinel(p.POSTAL);
  const iso2Final = iso2 || (postal && postal.length === 2 ? postal : '');
  return {
    iso3: rejectSentinel(p.ISO_A3 || p.ISO_A3_EH || p.ADM0_A3 || p['ISO3166-1-Alpha-3'] || p['ISO3166-1-ALPHA-3'] || p.ISO3166_1_Alpha_3),
    iso2: iso2Final,
    name: raw(p.NAME || p.ADMIN || p.NAME_LONG || p.name),
  };
}
