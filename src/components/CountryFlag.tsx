import React, { useState } from 'react';

interface CountryFlagProps {
  countryCode?: string;
  flagEmoji?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

// Canonical ISO-2 to Name & Emoji mapping
export const ISO_TO_CANONICAL_COUNTRY: Record<string, { name: string; flag: string }> = {
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  US: { name: 'United States', flag: '🇺🇸' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  FR: { name: 'France', flag: '🇫🇷' },
  RU: { name: 'Russia', flag: '🇷🇺' },
  CN: { name: 'China', flag: '🇨🇳' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  KR: { name: 'South Korea', flag: '🇰🇷' },
  IN: { name: 'India', flag: '🇮🇳' },
  VN: { name: 'Vietnam', flag: '🇻🇳' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  LT: { name: 'Lithuania', flag: '🇱🇹' },
  SC: { name: 'Seychelles', flag: '🇸🇨' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  BG: { name: 'Bulgaria', flag: '🇧🇬' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
  MY: { name: 'Malaysia', flag: '🇲🇾' },
  TH: { name: 'Thailand', flag: '🇹🇭' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  TW: { name: 'Taiwan', flag: '🇹🇼' },
  HK: { name: 'Hong Kong', flag: '🇭🇰' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  FI: { name: 'Finland', flag: '🇫🇮' },
  DK: { name: 'Denmark', flag: '🇩🇰' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  UA: { name: 'Ukraine', flag: '🇺🇦' },
  TR: { name: 'Turkey', flag: '🇹🇷' },
  RO: { name: 'Romania', flag: '🇷🇴' },
  CZ: { name: 'Czech Republic', flag: '🇨🇿' },
  HU: { name: 'Hungary', flag: '🇭🇺' },
  GR: { name: 'Greece', flag: '🇬🇷' },
  IE: { name: 'Ireland', flag: '🇮🇪' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  EG: { name: 'Egypt', flag: '🇪🇬' },
  NG: { name: 'Nigeria', flag: '🇳🇬' },
  KE: { name: 'Kenya', flag: '🇰🇪' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  AE: { name: 'United Arab Emirates', flag: '🇦🇪' },
  IR: { name: 'Iran', flag: '🇮🇷' },
  PK: { name: 'Pakistan', flag: '🇵🇰' },
  BD: { name: 'Bangladesh', flag: '🇧🇩' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  LAN: { name: 'Local Network (LAN)', flag: '🏠' },
  XX: { name: 'Global / Unknown', flag: '🌐' }
};

// Comprehensive mapping from country name / sub-string to ISO 3166-1 alpha-2 code
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  indonesia: 'id',
  netherlands: 'nl',
  holland: 'nl',
  'united states': 'us',
  usa: 'us',
  germany: 'de',
  deutschland: 'de',
  france: 'fr',
  russia: 'ru',
  'russian federation': 'ru',
  china: 'cn',
  singapore: 'sg',
  japan: 'jp',
  'south korea': 'kr',
  korea: 'kr',
  india: 'in',
  vietnam: 'vn',
  'united kingdom': 'gb',
  uk: 'gb',
  'great britain': 'gb',
  australia: 'au',
  brazil: 'br',
  canada: 'ca',
  lithuania: 'lt',
  seychelles: 'sc',
  poland: 'pl',
  bulgaria: 'bg',
  'south africa': 'za',
  malaysia: 'my',
  thailand: 'th',
  philippines: 'ph',
  taiwan: 'tw',
  hongkong: 'hk',
  'hong kong': 'hk',
  belgium: 'be',
  switzerland: 'ch',
  austria: 'at',
  sweden: 'se',
  norway: 'no',
  finland: 'fi',
  denmark: 'dk',
  italy: 'it',
  spain: 'es',
  portugal: 'pt',
  ukraine: 'ua',
  turkey: 'tr',
  romania: 'ro',
  czechia: 'cz',
  'czech republic': 'cz',
  hungary: 'hu',
  greece: 'gr',
  ireland: 'ie',
  mexico: 'mx',
  argentina: 'ar',
  colombia: 'co',
  chile: 'cl',
  egypt: 'eg',
  nigeria: 'ng',
  kenya: 'ke',
  saudi: 'sa',
  'saudi arabia': 'sa',
  uae: 'ae',
  'united arab emirates': 'ae',
  iran: 'ir',
  pakistan: 'pk',
  bangladesh: 'bd',
  newzealand: 'nz',
  'new zealand': 'nz',
};

/**
 * Deterministically decode Unicode Flag Emoji to ISO 2-letter country code
 * e.g., '🇮🇩' -> 'id', '🇳🇱' -> 'nl', '🇺🇸' -> 'us'
 */
function decodeEmojiToIso(emoji?: string): string | null {
  if (!emoji) return null;
  const chars = Array.from(emoji.trim());
  if (chars.length === 2) {
    const cp0 = chars[0].codePointAt(0);
    const cp1 = chars[1].codePointAt(0);
    if (
      cp0 && cp1 &&
      cp0 >= 0x1f1e6 && cp0 <= 0x1f1ff &&
      cp1 >= 0x1f1e6 && cp1 <= 0x1f1ff
    ) {
      return String.fromCharCode(cp0 - 0x1f1e6 + 65, cp1 - 0x1f1e6 + 65).toLowerCase();
    }
  }
  return null;
}

/**
 * Resolves any input (ISO-2 code, full country name, or flag emoji) to a valid 2-letter ISO code
 */
export function resolveCountryIsoCode(countryInput?: string, flagEmoji?: string): string | null {
  // 1. Try decoding from flag emoji if present
  const fromEmoji = decodeEmojiToIso(flagEmoji) || decodeEmojiToIso(countryInput);
  if (fromEmoji) return fromEmoji;

  if (!countryInput) return null;
  const raw = countryInput.trim().toLowerCase();

  // Special virtual/private network handles
  if (raw === 'lan' || raw === 'local' || raw === 'localhost' || raw === 'loopback') {
    return 'lan';
  }
  if (raw === 'xx' || raw === 'global' || raw === 'unknown') {
    return null;
  }

  // 2. Direct 2-letter ISO code
  if (raw.length === 2 && /^[a-z]{2}$/.test(raw)) {
    return raw;
  }

  // 3. Try finding matches in known country names (handles "Indonesia (Jakarta)", "Germany (Frankfurt)")
  for (const [key, code] of Object.entries(COUNTRY_NAME_TO_ISO)) {
    if (raw === key || raw.startsWith(key) || raw.includes(key)) {
      return code;
    }
  }

  return null;
}

/**
 * Returns canonical, standardized country info (Code, Clean Name, Flag)
 * Eliminates duplicate country splits caused by mixed casing or city sub-strings.
 */
export function getCanonicalCountryInfo(
  countryInput?: string,
  flagEmoji?: string,
  rawCountryName?: string
): { code: string; name: string; flag: string } {
  const iso = resolveCountryIsoCode(countryInput, flagEmoji) || resolveCountryIsoCode(rawCountryName);
  
  if (!iso) {
    return {
      code: 'XX',
      name: rawCountryName && rawCountryName !== 'XX' ? rawCountryName : 'Global / Unknown',
      flag: flagEmoji && flagEmoji !== '🌐' ? flagEmoji : '🌐'
    };
  }

  if (iso === 'lan') {
    return {
      code: 'LAN',
      name: 'Local Network (LAN)',
      flag: '🏠'
    };
  }

  const upperIso = iso.toUpperCase();
  const canonical = ISO_TO_CANONICAL_COUNTRY[upperIso];

  return {
    code: upperIso,
    name: canonical?.name || rawCountryName || upperIso,
    flag: canonical?.flag || flagEmoji || '🌐'
  };
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode = 'XX',
  flagEmoji = '🌐',
  className = '',
  size = 'md',
  title,
}) => {
  const [imgError, setImgError] = useState(false);

  const isoCode = resolveCountryIsoCode(countryCode, flagEmoji);

  // Local / Private Network indicator
  if (isoCode === 'lan') {
    return (
      <span className={`inline-flex items-center justify-center select-none ${className}`} title={title || 'Local / LAN'}>
        🏠
      </span>
    );
  }

  // Unknown / Global indicator
  if (!isoCode || imgError) {
    return (
      <span className={`inline-flex items-center justify-center select-none text-xs ${className}`} title={title || countryCode || 'Global'}>
        {flagEmoji && flagEmoji !== '🌐' ? flagEmoji : '🌐'}
      </span>
    );
  }

  // Exact dimension styles with crisp aspect ratio (4:3 for standard flags)
  const dimStyles = {
    xs: 'w-3.5 h-2.5',
    sm: 'w-4 h-3',
    md: 'w-5 h-3.5',
    lg: 'w-6 h-4.5',
    xl: 'w-7 h-5',
  }[size];

  const tooltip = title || countryCode.toUpperCase();

  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={`https://flagcdn.com/w40/${isoCode}.png`}
        srcSet={`https://flagcdn.com/w80/${isoCode}.png 2x`}
        alt={tooltip}
        title={tooltip}
        loading="lazy"
        onError={() => setImgError(true)}
        className={`inline-block object-cover rounded-[2px] border border-slate-700/60 shadow-sm shrink-0 ${dimStyles}`}
      />
    </span>
  );
};
