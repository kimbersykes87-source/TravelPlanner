/**
 * Country code and flag utilities – ISO3/ISO2 conversion for flagcdn.com.
 * Comprehensive mapping from ISO 3166-1.
 */

const ISO3_TO_ISO2 = {
  AFG: 'AF', ALA: 'AX', ALB: 'AL', DZA: 'DZ', ASM: 'AS', AND: 'AD', AGO: 'AO', AIA: 'AI', ATA: 'AQ',
  ATG: 'AG', ARG: 'AR', ARM: 'AM', ABW: 'AW', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH',
  BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ', BMU: 'BM', BTN: 'BT', BOL: 'BO',
  BES: 'BQ', BIH: 'BA', BWA: 'BW', BVT: 'BV', BRA: 'BR', IOT: 'IO', BRN: 'BN', BGR: 'BG', BFA: 'BF',
  BDI: 'BI', CPV: 'CV', KHM: 'KH', CMR: 'CM', CAN: 'CA', CYM: 'KY', CAF: 'CF', TCD: 'TD', CHL: 'CL',
  CHN: 'CN', CXR: 'CX', CCK: 'CC', COL: 'CO', COM: 'KM', COG: 'CG', COD: 'CD', COK: 'CK', CRI: 'CR',
  CIV: 'CI', HRV: 'HR', CUB: 'CU', CUW: 'CW', CYP: 'CY', CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DMA: 'DM',
  DOM: 'DO', ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', SWZ: 'SZ', ETH: 'ET',
  FLK: 'FK', FRO: 'FO', FJI: 'FJ', FIN: 'FI', FRA: 'FR', GUF: 'GF', PYF: 'PF', ATF: 'TF', GAB: 'GA',
  GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH', GIB: 'GI', GRC: 'GR', GRL: 'GL', GRD: 'GD', GLP: 'GP',
  GUM: 'GU', GTM: 'GT', GGY: 'GG', GIN: 'GN', GNB: 'GW', GUY: 'GY', HTI: 'HT', HMD: 'HM', VAT: 'VA',
  HND: 'HN', HKG: 'HK', HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE',
  IMN: 'IM', ISR: 'IL', ITA: 'IT', JAM: 'JM', JPN: 'JP', JEY: 'JE', JOR: 'JO', KAZ: 'KZ', KEN: 'KE',
  KIR: 'KI', PRK: 'KP', KOR: 'KR', KWT: 'KW', KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB', LSO: 'LS',
  LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT', LUX: 'LU', MAC: 'MO', MDG: 'MG', MWI: 'MW', MYS: 'MY',
  MDV: 'MV', MLI: 'ML', MLT: 'MT', MHL: 'MH', MTQ: 'MQ', MRT: 'MR', MUS: 'MU', MYT: 'YT', MEX: 'MX',
  FSM: 'FM', MDA: 'MD', MCO: 'MC', MNG: 'MN', MNE: 'ME', MSR: 'MS', MAR: 'MA', MOZ: 'MZ', MMR: 'MM',
  NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL', NCL: 'NC', NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG',
  NIU: 'NU', NFK: 'NF', MKD: 'MK', MNP: 'MP', NOR: 'NO', OMN: 'OM', PAK: 'PK', PLW: 'PW', PSE: 'PS',
  PAN: 'PA', PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH', PCN: 'PN', POL: 'PL', PRT: 'PT', PRI: 'PR',
  QAT: 'QA', REU: 'RE', ROU: 'RO', RUS: 'RU', RWA: 'RW', BLM: 'BL', SHN: 'SH', KNA: 'KN', LCA: 'LC',
  MAF: 'MF', SPM: 'PM', VCT: 'VC', WSM: 'WS', SMR: 'SM', STP: 'ST', SAU: 'SA', SEN: 'SN', SRB: 'RS',
  SYC: 'SC', SLE: 'SL', SGP: 'SG', SXM: 'SX', SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO', ZAF: 'ZA',
  SGS: 'GS', SSD: 'SS', ESP: 'ES', LKA: 'LK', SDN: 'SD', SUR: 'SR', SJM: 'SJ', SWE: 'SE', CHE: 'CH',
  SYR: 'SY', TWN: 'TW', TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG', TKL: 'TK', TON: 'TO',
  TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM', TCA: 'TC', TUV: 'TV', UGA: 'UG', UKR: 'UA', ARE: 'AE',
  GBR: 'GB', USA: 'US', UMI: 'UM', URY: 'UY', UZB: 'UZ', VUT: 'VU', VEN: 'VE', VNM: 'VN', VGB: 'VG',
  VIR: 'VI', WLF: 'WF', ESH: 'EH', YEM: 'YE',   ZMB: 'ZM', ZWE: 'ZW',
};

export { ISO3_TO_ISO2 };

/** Country name (lowercase) -> ISO2 for flag lookup when GeoJSON/Statistics lack codes. */
const NAME_TO_ISO2 = {
  france: 'FR', norway: 'NO', germany: 'DE', italy: 'IT', spain: 'ES', portugal: 'PT',
  netherlands: 'NL', belgium: 'BE', switzerland: 'CH', austria: 'AT', sweden: 'SE',
  denmark: 'DK', finland: 'FI', ireland: 'IE', poland: 'PL', greece: 'GR', turkey: 'TR',
  'united kingdom': 'GB', 'united states': 'US', australia: 'AU', canada: 'CA',
  japan: 'JP', china: 'CN', india: 'IN', brazil: 'BR', mexico: 'MX', argentina: 'AR',
  'south africa': 'ZA', egypt: 'EG', morocco: 'MA', kenya: 'KE', nigeria: 'NG',
  thailand: 'TH', vietnam: 'VN', 'south korea': 'KR', 'north korea': 'KP',
  indonesia: 'ID', malaysia: 'MY', singapore: 'SG', 'new zealand': 'NZ',
  colombia: 'CO', peru: 'PE', chile: 'CL', iceland: 'IS', luxembourg: 'LU',
  'czech republic': 'CZ', czechia: 'CZ', romania: 'RO', hungary: 'HU',
  croatia: 'HR', serbia: 'RS', bulgaria: 'BG', ukraine: 'UA', russia: 'RU',
  'united arab emirates': 'AE', israel: 'IL', 'saudi arabia': 'SA',
  fiji: 'FJ', 'papua new guinea': 'PG', philippines: 'PH',
  andorra: 'AD',
};

/** Natural Earth / UN long names -> common short names for Statistics lookup. */
const NAME_ALIASES = {
  'united kingdom of great britain and northern ireland': 'United Kingdom',
  'united states of america': 'United States',
  'united states': 'United States',
  'russian federation': 'Russia',
  "democratic people's republic of korea": 'North Korea',
  "korea, democratic people's republic of": 'North Korea',
  "korea, republic of": 'South Korea',
  'republic of korea': 'South Korea',
  "côte d'ivoire": "Côte d'Ivoire",
  'bolivia (plurinational state of)': 'Bolivia',
  'venezuela (bolivarian republic of)': 'Venezuela',
  'iran (islamic republic of)': 'Iran',
  "lao people's democratic republic": 'Laos',
  'tanzania, united republic of': 'Tanzania',
  'moldova, republic of': 'Moldova',
  'micronesia (federated states of)': 'Micronesia',
  'syrian arab republic': 'Syria',
  'taiwan, province of china': 'Taiwan',
  'viet nam': 'Vietnam',
  'brunei darussalam': 'Brunei',
  'cabo verde': 'Cape Verde',
  'eswatini': 'Swaziland',
  'north macedonia': 'Macedonia',
  'republic of north macedonia': 'Macedonia',
  'palestine, state of': 'Palestine',
  'sao tome and principe': 'Sao Tome and Principe',
};

function normalizeNameForLookup(name) {
  if (!name) return '';
  const lower = String(name).trim().toLowerCase();
  return NAME_ALIASES[lower] || name.trim();
}

/** Resolve country_code (ISO2 or ISO3) or country name to 2-letter code for flagcdn.com. */
export function codeToIso2(code, countries = [], countryName = '') {
  const raw = (code || '').trim();
  const upper = raw.toUpperCase();
  if (raw.length === 2) return upper;
  if (raw.length === 3) {
    const byIso3 = countries.find((c) => (c.iso3 || '').toUpperCase() === upper);
    if (byIso3?.iso2) return (byIso3.iso2 || '').trim().toUpperCase();
    if (ISO3_TO_ISO2[upper]) return ISO3_TO_ISO2[upper];
  }
  if (countryName && countries.length) {
    const nameLower = String(countryName).trim().toLowerCase();
    const alias = normalizeNameForLookup(countryName);
    const byName = countries.find(
      (c) =>
        (c.country_name || '').trim().toLowerCase() === nameLower ||
        (c.country_name || '').trim().toLowerCase() === alias.toLowerCase() ||
        (c.country || '').trim().toLowerCase() === nameLower ||
        (c.country || '').trim().toLowerCase() === alias.toLowerCase()
    );
    if (byName?.iso2) return (byName.iso2 || '').trim().toUpperCase();
  }
  if (countryName) {
    const nameLower = String(countryName).trim().toLowerCase();
    if (NAME_TO_ISO2[nameLower]) return NAME_TO_ISO2[nameLower];
    const alias = normalizeNameForLookup(countryName).toLowerCase();
    if (NAME_TO_ISO2[alias]) return NAME_TO_ISO2[alias];
  }
  return '';
}
