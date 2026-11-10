import { useEffect, useMemo, useState } from 'react';
import { ISO_TO_CANONICAL_COUNTRY, getCanonicalCountryInfo } from '../components/CountryFlag';

// Authoritative APNIC RDAP + Verified GeoIP Engine
// Eliminates heuristic /8 guessing and hash-based city assignment across all UI panels.

export interface GeoLocation {
  country: string;
  countryName: string;
  flag: string;
  city?: string;
  isp?: string;
  asName?: string;
  asn?: string;
  cidr?: string;
  rir?: string;
  netName?: string;
  source?: string;
  region?: string;
  lat?: number;
  lon?: number;
}

export interface UnifiedIpGeo {
  ip: string;
  country: string;
  countryName: string;
  flag: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  isp: string;
  asName: string;
  asn: string;
  cidr: string;
  rir: string;
  netName: string;
  source: string;
}

// High-precision coordinates for verified cities & capitals worldwide
export const GLOBAL_CITY_COORDINATES: Record<
  string,
  { lat: number; lon: number; city: string; countryCode: string; countryName: string; flag: string }
> = {
  // Australia
  Sydney: { lat: -33.8688, lon: 151.2093, city: 'Sydney', countryCode: 'AU', countryName: 'Australia', flag: '🇦🇺' },
  Melbourne: { lat: -37.8136, lon: 144.9631, city: 'Melbourne', countryCode: 'AU', countryName: 'Australia', flag: '🇦🇺' },
  Brisbane: { lat: -27.4698, lon: 153.0251, city: 'Brisbane', countryCode: 'AU', countryName: 'Australia', flag: '🇦🇺' },
  Perth: { lat: -31.9505, lon: 115.8605, city: 'Perth', countryCode: 'AU', countryName: 'Australia', flag: '🇦🇺' },
  // South Korea
  Seoul: { lat: 37.5661, lon: 126.9784, city: 'Seoul', countryCode: 'KR', countryName: 'South Korea', flag: '🇰🇷' },
  Busan: { lat: 35.1796, lon: 129.0756, city: 'Busan', countryCode: 'KR', countryName: 'South Korea', flag: '🇰🇷' },
  Incheon: { lat: 37.4563, lon: 126.7052, city: 'Incheon', countryCode: 'KR', countryName: 'South Korea', flag: '🇰🇷' },
  // China
  Changchun: { lat: 43.8962, lon: 125.3268, city: 'Changchun', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  Zhengzhou: { lat: 34.7466, lon: 113.6253, city: 'Zhengzhou', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  Beijing: { lat: 39.9042, lon: 116.4074, city: 'Beijing', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  Shanghai: { lat: 31.2304, lon: 121.4737, city: 'Shanghai', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  Shenzhen: { lat: 22.5431, lon: 114.0579, city: 'Shenzhen', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  Guangzhou: { lat: 23.1291, lon: 113.2644, city: 'Guangzhou', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  Hangzhou: { lat: 30.2741, lon: 120.1551, city: 'Hangzhou', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  Chengdu: { lat: 30.5728, lon: 104.0668, city: 'Chengdu', countryCode: 'CN', countryName: 'China', flag: '🇨🇳' },
  // Belgium & Western Europe
  Brussels: { lat: 50.8534, lon: 4.3470, city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', flag: '🇧🇪' },
  Frankfurt: { lat: 50.1109, lon: 8.6821, city: 'Frankfurt', countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪' },
  'Frankfurt am Main': { lat: 50.1109, lon: 8.6821, city: 'Frankfurt', countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪' },
  'Brandenburg an der Havel': { lat: 52.4125, lon: 12.5316, city: 'Brandenburg an der Havel', countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪' },
  Berlin: { lat: 52.5200, lon: 13.4050, city: 'Berlin', countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪' },
  Nuremberg: { lat: 49.4521, lon: 11.0767, city: 'Nuremberg', countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪' },
  Falkenstein: { lat: 50.4779, lon: 12.3713, city: 'Falkenstein', countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪' },
  Amsterdam: { lat: 52.3676, lon: 4.9041, city: 'Amsterdam', countryCode: 'NL', countryName: 'Netherlands', flag: '🇳🇱' },
  Eemshaven: { lat: 53.4373, lon: 6.8333, city: 'Eemshaven', countryCode: 'NL', countryName: 'Netherlands', flag: '🇳🇱' },
  Dronten: { lat: 52.5250, lon: 5.7167, city: 'Dronten', countryCode: 'NL', countryName: 'Netherlands', flag: '🇳🇱' },
  Paris: { lat: 48.8566, lon: 2.3522, city: 'Paris', countryCode: 'FR', countryName: 'France', flag: '🇫🇷' },
  Roubaix: { lat: 50.6927, lon: 3.1794, city: 'Roubaix', countryCode: 'FR', countryName: 'France', flag: '🇫🇷' },
  Strasbourg: { lat: 48.5734, lon: 7.7521, city: 'Strasbourg', countryCode: 'FR', countryName: 'France', flag: '🇫🇷' },
  London: { lat: 51.5074, lon: -0.1278, city: 'London', countryCode: 'GB', countryName: 'United Kingdom', flag: '🇬🇧' },
  Slough: { lat: 51.5105, lon: -0.5950, city: 'Slough', countryCode: 'GB', countryName: 'United Kingdom', flag: '🇬🇧' },
  Manchester: { lat: 53.4808, lon: -2.2426, city: 'Manchester', countryCode: 'GB', countryName: 'United Kingdom', flag: '🇬🇧' },
  Zurich: { lat: 47.3769, lon: 8.5417, city: 'Zurich', countryCode: 'CH', countryName: 'Switzerland', flag: '🇨🇭' },
  Roost: { lat: 49.7931, lon: 6.0858, city: 'Roost', countryCode: 'LU', countryName: 'Luxembourg', flag: '🇱🇺' },
  Luxembourg: { lat: 49.6116, lon: 6.1319, city: 'Luxembourg', countryCode: 'LU', countryName: 'Luxembourg', flag: '🇱🇺' },
  // Eastern Europe / Eurasia
  'St. Petersburg': { lat: 59.9343, lon: 30.3351, city: 'St. Petersburg', countryCode: 'RU', countryName: 'Russia', flag: '🇷🇺' },
  'Saint Petersburg': { lat: 59.9343, lon: 30.3351, city: 'St. Petersburg', countryCode: 'RU', countryName: 'Russia', flag: '🇷🇺' },
  Moscow: { lat: 55.7558, lon: 37.6173, city: 'Moscow', countryCode: 'RU', countryName: 'Russia', flag: '🇷🇺' },
  Novosibirsk: { lat: 55.0084, lon: 82.9357, city: 'Novosibirsk', countryCode: 'RU', countryName: 'Russia', flag: '🇷🇺' },
  Kyiv: { lat: 50.4501, lon: 30.5234, city: 'Kyiv', countryCode: 'UA', countryName: 'Ukraine', flag: '🇺🇦' },
  Dnipro: { lat: 48.4647, lon: 35.0462, city: 'Dnipro', countryCode: 'UA', countryName: 'Ukraine', flag: '🇺🇦' },
  Warsaw: { lat: 52.2297, lon: 21.0122, city: 'Warsaw', countryCode: 'PL', countryName: 'Poland', flag: '🇵🇱' },
  Stockholm: { lat: 59.3293, lon: 18.0686, city: 'Stockholm', countryCode: 'SE', countryName: 'Sweden', flag: '🇸🇪' },
  Helsinki: { lat: 60.1699, lon: 24.9384, city: 'Helsinki', countryCode: 'FI', countryName: 'Finland', flag: '🇫🇮' },
  Vilnius: { lat: 54.6872, lon: 25.2797, city: 'Vilnius', countryCode: 'LT', countryName: 'Lithuania', flag: '🇱🇹' },
  Almaty: { lat: 43.2220, lon: 76.8512, city: 'Almaty', countryCode: 'KZ', countryName: 'Kazakhstan', flag: '🇰🇿' },
  Madrid: { lat: 40.4168, lon: -3.7038, city: 'Madrid', countryCode: 'ES', countryName: 'Spain', flag: '🇪🇸' },
  Milan: { lat: 45.4642, lon: 9.1900, city: 'Milan', countryCode: 'IT', countryName: 'Italy', flag: '🇮🇹' },
  Rome: { lat: 41.9028, lon: 12.4964, city: 'Rome', countryCode: 'IT', countryName: 'Italy', flag: '🇮🇹' },
  Vienna: { lat: 48.2082, lon: 16.3738, city: 'Vienna', countryCode: 'AT', countryName: 'Austria', flag: '🇦🇹' },
  Prague: { lat: 50.0755, lon: 14.4378, city: 'Prague', countryCode: 'CZ', countryName: 'Czech Republic', flag: '🇨🇿' },
  Bucharest: { lat: 44.4268, lon: 26.1025, city: 'Bucharest', countryCode: 'RO', countryName: 'Romania', flag: '🇷🇴' },
  Istanbul: { lat: 41.0082, lon: 28.9784, city: 'Istanbul', countryCode: 'TR', countryName: 'Turkey', flag: '🇹🇷' },
  Sofia: { lat: 42.6977, lon: 23.3219, city: 'Sofia', countryCode: 'BG', countryName: 'Bulgaria', flag: '🇧🇬' },
  // United States & Americas
  Ashburn: { lat: 39.0438, lon: -77.4874, city: 'Ashburn', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Buffalo: { lat: 42.8864, lon: -78.8784, city: 'Buffalo', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'New York': { lat: 40.7128, lon: -74.0060, city: 'New York', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Denver: { lat: 39.7392, lon: -104.9903, city: 'Denver', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Phoenix: { lat: 33.4484, lon: -112.0740, city: 'Phoenix', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'San Francisco': { lat: 37.7749, lon: -122.4194, city: 'San Francisco', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Washington: { lat: 38.9072, lon: -77.0369, city: 'Washington', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'Berry Hill': { lat: 36.1156, lon: -86.7689, city: 'Berry Hill', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'The Dalles': { lat: 45.5946, lon: -121.1787, city: 'The Dalles', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'Moncks Corner': { lat: 33.1960, lon: -79.9834, city: 'Moncks Corner', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'Council Bluffs': { lat: 41.2619, lon: -95.8608, city: 'Council Bluffs', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Chicago: { lat: 41.8781, lon: -87.6298, city: 'Chicago', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Dallas: { lat: 32.7767, lon: -96.7970, city: 'Dallas', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'Los Angeles': { lat: 34.0522, lon: -118.2437, city: 'Los Angeles', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  'San Jose': { lat: 37.3382, lon: -121.8863, city: 'San Jose', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Seattle: { lat: 47.6062, lon: -122.3321, city: 'Seattle', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Atlanta: { lat: 33.7490, lon: -84.3880, city: 'Atlanta', countryCode: 'US', countryName: 'United States', flag: '🇺🇸' },
  Toronto: { lat: 43.6532, lon: -79.3832, city: 'Toronto', countryCode: 'CA', countryName: 'Canada', flag: '🇨🇦' },
  Montreal: { lat: 45.5017, lon: -73.5673, city: 'Montreal', countryCode: 'CA', countryName: 'Canada', flag: '🇨🇦' },
  'São Paulo': { lat: -23.5505, lon: -46.6333, city: 'São Paulo', countryCode: 'BR', countryName: 'Brazil', flag: '🇧🇷' },
  'Rio de Janeiro': { lat: -22.9068, lon: -43.1729, city: 'Rio de Janeiro', countryCode: 'BR', countryName: 'Brazil', flag: '🇧🇷' },
  'Guatemala City': { lat: 14.6349, lon: -90.5069, city: 'Guatemala City', countryCode: 'GT', countryName: 'Guatemala', flag: '🇬🇹' },
  // Japan, Taiwan, HK, SEA, India
  Tokyo: { lat: 35.6762, lon: 139.6503, city: 'Tokyo', countryCode: 'JP', countryName: 'Japan', flag: '🇯🇵' },
  Osaka: { lat: 34.6937, lon: 135.5023, city: 'Osaka', countryCode: 'JP', countryName: 'Japan', flag: '🇯🇵' },
  Singapore: { lat: 1.3521, lon: 103.8198, city: 'Singapore', countryCode: 'SG', countryName: 'Singapore', flag: '🇸🇬' },
  'Hong Kong': { lat: 22.3193, lon: 114.1694, city: 'Hong Kong', countryCode: 'HK', countryName: 'Hong Kong', flag: '🇭🇰' },
  Taipei: { lat: 25.0330, lon: 121.5654, city: 'Taipei', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  'New Taipei City': { lat: 25.0169, lon: 121.4627, city: 'New Taipei City', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  'New Taipei': { lat: 25.0169, lon: 121.4627, city: 'New Taipei', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  Changhua: { lat: 24.0815, lon: 120.5385, city: 'Changhua', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  Kaohsiung: { lat: 22.6273, lon: 120.3014, city: 'Kaohsiung', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  Taichung: { lat: 24.1477, lon: 120.6736, city: 'Taichung', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  Tainan: { lat: 22.9997, lon: 120.2270, city: 'Tainan', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  Hsinchu: { lat: 24.8138, lon: 120.9675, city: 'Hsinchu', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  Taoyuan: { lat: 24.9936, lon: 121.3010, city: 'Taoyuan', countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼' },
  Hanoi: { lat: 21.0285, lon: 105.8542, city: 'Hanoi', countryCode: 'VN', countryName: 'Vietnam', flag: '🇻🇳' },
  'Ho Chi Minh City': { lat: 10.8231, lon: 106.6297, city: 'Ho Chi Minh City', countryCode: 'VN', countryName: 'Vietnam', flag: '🇻🇳' },
  Mumbai: { lat: 19.0760, lon: 72.8777, city: 'Mumbai', countryCode: 'IN', countryName: 'India', flag: '🇮🇳' },
  Pune: { lat: 18.5204, lon: 73.8567, city: 'Pune', countryCode: 'IN', countryName: 'India', flag: '🇮🇳' },
  Delhi: { lat: 28.6139, lon: 77.2090, city: 'Delhi', countryCode: 'IN', countryName: 'India', flag: '🇮🇳' },
  Bangalore: { lat: 12.9716, lon: 77.5946, city: 'Bangalore', countryCode: 'IN', countryName: 'India', flag: '🇮🇳' },
  'Kuala Lumpur': { lat: 3.1390, lon: 101.6869, city: 'Kuala Lumpur', countryCode: 'MY', countryName: 'Malaysia', flag: '🇲🇾' },
  Bangkok: { lat: 13.7563, lon: 100.5018, city: 'Bangkok', countryCode: 'TH', countryName: 'Thailand', flag: '🇹🇭' },
  Manila: { lat: 14.5995, lon: 120.9842, city: 'Manila', countryCode: 'PH', countryName: 'Philippines', flag: '🇵🇭' },
  Johannesburg: { lat: -26.2041, lon: 28.0473, city: 'Johannesburg', countryCode: 'ZA', countryName: 'South Africa', flag: '🇿🇦' },
  // Indonesia verified cities
  Jakarta: { lat: -6.2088, lon: 106.8456, city: 'Jakarta', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Bekasi: { lat: -6.2383, lon: 106.9756, city: 'Bekasi', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Bogor: { lat: -6.5971, lon: 106.8060, city: 'Bogor', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Cileungsir: { lat: -6.3941, lon: 106.9603, city: 'Cileungsir', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Teluknaga: { lat: -6.0989, lon: 106.6383, city: 'Teluknaga', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  'Kota Cilegon': { lat: -6.0023, lon: 106.0112, city: 'Kota Cilegon', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Bandung: { lat: -6.9175, lon: 107.6191, city: 'Bandung', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Surabaya: { lat: -7.2575, lon: 112.7521, city: 'Surabaya', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Sidoarjo: { lat: -7.4478, lon: 112.7183, city: 'Sidoarjo', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Malang: { lat: -7.9666, lon: 112.6326, city: 'Malang', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Medan: { lat: 3.5952, lon: 98.6722, city: 'Medan', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Makassar: { lat: -5.1477, lon: 119.4327, city: 'Makassar', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Pangkalpinang: { lat: -2.1291, lon: 106.1138, city: 'Pangkalpinang', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
  Merauke: { lat: -8.499, lon: 140.401, city: 'Merauke', countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩' },
};

// Country centroid coordinates with capital city fallback (never random hashes)
export const COUNTRY_COORDINATES: Record<
  string,
  { lat: number; lon: number; capital: string; name: string; continent: string; flag: string }
> = {
  US: { lat: 39.0438, lon: -77.4874, capital: 'Ashburn', name: 'United States', continent: 'North America', flag: '🇺🇸' },
  DE: { lat: 50.1109, lon: 8.6821, capital: 'Frankfurt', name: 'Germany', continent: 'Europe', flag: '🇩🇪' },
  NL: { lat: 52.3676, lon: 4.9041, capital: 'Amsterdam', name: 'Netherlands', continent: 'Europe', flag: '🇳🇱' },
  FR: { lat: 48.8566, lon: 2.3522, capital: 'Paris', name: 'France', continent: 'Europe', flag: '🇫🇷' },
  RU: { lat: 55.7558, lon: 37.6173, capital: 'Moscow', name: 'Russia', continent: 'Europe/Asia', flag: '🇷🇺' },
  CN: { lat: 39.9042, lon: 116.4074, capital: 'Beijing', name: 'China', continent: 'Asia', flag: '🇨🇳' },
  JP: { lat: 35.6762, lon: 139.6503, capital: 'Tokyo', name: 'Japan', continent: 'Asia', flag: '🇯🇵' },
  KR: { lat: 37.5661, lon: 126.9784, capital: 'Seoul', name: 'South Korea', continent: 'Asia', flag: '🇰🇷' },
  SG: { lat: 1.3521, lon: 103.8198, capital: 'Singapore', name: 'Singapore', continent: 'Asia', flag: '🇸🇬' },
  MY: { lat: 3.1390, lon: 101.6869, capital: 'Kuala Lumpur', name: 'Malaysia', continent: 'Asia', flag: '🇲🇾' },
  VN: { lat: 21.0285, lon: 105.8542, capital: 'Hanoi', name: 'Vietnam', continent: 'Asia', flag: '🇻🇳' },
  IN: { lat: 19.0760, lon: 72.8777, capital: 'Mumbai', name: 'India', continent: 'Asia', flag: '🇮🇳' },
  GB: { lat: 51.5074, lon: -0.1278, capital: 'London', name: 'United Kingdom', continent: 'Europe', flag: '🇬🇧' },
  BR: { lat: -23.5505, lon: -46.6333, capital: 'São Paulo', name: 'Brazil', continent: 'South America', flag: '🇧🇷' },
  ZA: { lat: -26.2041, lon: 28.0473, capital: 'Johannesburg', name: 'South Africa', continent: 'Africa', flag: '🇿🇦' },
  ID: { lat: -6.2088, lon: 106.8456, capital: 'Jakarta', name: 'Indonesia', continent: 'Asia', flag: '🇮🇩' },
  AU: { lat: -33.8688, lon: 151.2093, capital: 'Sydney', name: 'Australia', continent: 'Oceania', flag: '🇦🇺' },
  CA: { lat: 43.6532, lon: -79.3832, capital: 'Toronto', name: 'Canada', continent: 'North America', flag: '🇨🇦' },
  LT: { lat: 54.6872, lon: 25.2797, capital: 'Vilnius', name: 'Lithuania', continent: 'Europe', flag: '🇱🇹' },
  BE: { lat: 50.8534, lon: 4.3470, capital: 'Brussels', name: 'Belgium', continent: 'Europe', flag: '🇧🇪' },
  HK: { lat: 22.3193, lon: 114.1694, capital: 'Hong Kong', name: 'Hong Kong', continent: 'Asia', flag: '🇭🇰' },
  MO: { lat: 22.1987, lon: 113.5439, capital: 'Macau', name: 'Macau', continent: 'Asia', flag: '🇲🇴' },
  TW: { lat: 25.0330, lon: 121.5654, capital: 'Taipei', name: 'Taiwan', continent: 'Asia', flag: '🇹🇼' },
  TH: { lat: 13.7563, lon: 100.5018, capital: 'Bangkok', name: 'Thailand', continent: 'Asia', flag: '🇹🇭' },
  PH: { lat: 14.5995, lon: 120.9842, capital: 'Manila', name: 'Philippines', continent: 'Asia', flag: '🇵🇭' },
  IT: { lat: 45.4642, lon: 9.1900, capital: 'Milan', name: 'Italy', continent: 'Europe', flag: '🇮🇹' },
  ES: { lat: 40.4168, lon: -3.7038, capital: 'Madrid', name: 'Spain', continent: 'Europe', flag: '🇪🇸' },
  PT: { lat: 38.7223, lon: -9.1393, capital: 'Lisbon', name: 'Portugal', continent: 'Europe', flag: '🇵🇹' },
  TR: { lat: 41.0082, lon: 28.9784, capital: 'Istanbul', name: 'Turkey', continent: 'Europe/Asia', flag: '🇹🇷' },
  UA: { lat: 50.4501, lon: 30.5234, capital: 'Kyiv', name: 'Ukraine', continent: 'Europe', flag: '🇺🇦' },
  PL: { lat: 52.2297, lon: 21.0122, capital: 'Warsaw', name: 'Poland', continent: 'Europe', flag: '🇵🇱' },
  SE: { lat: 59.3293, lon: 18.0686, capital: 'Stockholm', name: 'Sweden', continent: 'Europe', flag: '🇸🇪' },
  NO: { lat: 59.9139, lon: 10.7522, capital: 'Oslo', name: 'Norway', continent: 'Europe', flag: '🇳🇴' },
  FI: { lat: 60.1699, lon: 24.9384, capital: 'Helsinki', name: 'Finland', continent: 'Europe', flag: '🇫🇮' },
  DK: { lat: 55.6761, lon: 12.5683, capital: 'Copenhagen', name: 'Denmark', continent: 'Europe', flag: '🇩🇰' },
  RO: { lat: 44.4268, lon: 26.1025, capital: 'Bucharest', name: 'Romania', continent: 'Europe', flag: '🇷🇴' },
  BG: { lat: 42.6977, lon: 23.3219, capital: 'Sofia', name: 'Bulgaria', continent: 'Europe', flag: '🇧🇬' },
  CZ: { lat: 50.0755, lon: 14.4378, capital: 'Prague', name: 'Czech Republic', continent: 'Europe', flag: '🇨🇿' },
  AT: { lat: 48.2082, lon: 16.3738, capital: 'Vienna', name: 'Austria', continent: 'Europe', flag: '🇦🇹' },
  CH: { lat: 47.3769, lon: 8.5417, capital: 'Zurich', name: 'Switzerland', continent: 'Europe', flag: '🇨🇭' },
  HU: { lat: 47.4979, lon: 19.0402, capital: 'Budapest', name: 'Hungary', continent: 'Europe', flag: '🇭🇺' },
  GR: { lat: 37.9838, lon: 23.7275, capital: 'Athens', name: 'Greece', continent: 'Europe', flag: '🇬🇷' },
  IE: { lat: 53.3498, lon: -6.2603, capital: 'Dublin', name: 'Ireland', continent: 'Europe', flag: '🇮🇪' },
  LU: { lat: 49.6116, lon: 6.1319, capital: 'Luxembourg', name: 'Luxembourg', continent: 'Europe', flag: '🇱🇺' },
  KZ: { lat: 43.2220, lon: 76.8512, capital: 'Almaty', name: 'Kazakhstan', continent: 'Asia', flag: '🇰🇿' },
  CY: { lat: 35.1856, lon: 33.3823, capital: 'Nicosia', name: 'Cyprus', continent: 'Europe', flag: '🇨🇾' },
  GT: { lat: 14.6349, lon: -90.5069, capital: 'Guatemala City', name: 'Guatemala', continent: 'North America', flag: '🇬🇹' },
  SC: { lat: -4.6191, lon: 55.4513, capital: 'Victoria', name: 'Seychelles', continent: 'Africa', flag: '🇸🇨' },
  LV: { lat: 56.9496, lon: 24.1052, capital: 'Riga', name: 'Latvia', continent: 'Europe', flag: '🇱🇻' },
  EE: { lat: 59.4370, lon: 24.7536, capital: 'Tallinn', name: 'Estonia', continent: 'Europe', flag: '🇪🇪' },
  BY: { lat: 53.9006, lon: 27.5590, capital: 'Minsk', name: 'Belarus', continent: 'Europe', flag: '🇧🇾' },
  IL: { lat: 32.0853, lon: 34.7818, capital: 'Tel Aviv', name: 'Israel', continent: 'Middle East', flag: '🇮🇱' },
  IR: { lat: 35.6892, lon: 51.3890, capital: 'Tehran', name: 'Iran', continent: 'Middle East', flag: '🇮🇷' },
  PK: { lat: 24.8607, lon: 67.0011, capital: 'Karachi', name: 'Pakistan', continent: 'Asia', flag: '🇵🇰' },
  BD: { lat: 23.8103, lon: 90.4125, capital: 'Dhaka', name: 'Bangladesh', continent: 'Asia', flag: '🇧🇩' },
  SA: { lat: 24.7136, lon: 46.6753, capital: 'Riyadh', name: 'Saudi Arabia', continent: 'Middle East', flag: '🇸🇦' },
  AE: { lat: 25.2048, lon: 55.2708, capital: 'Dubai', name: 'United Arab Emirates', continent: 'Middle East', flag: '🇦🇪' },
  EG: { lat: 30.0444, lon: 31.2357, capital: 'Cairo', name: 'Egypt', continent: 'Africa', flag: '🇪🇬' },
  NG: { lat: 6.5244, lon: 3.3792, capital: 'Lagos', name: 'Nigeria', continent: 'Africa', flag: '🇳🇬' },
  KE: { lat: -1.2921, lon: 36.8219, capital: 'Nairobi', name: 'Kenya', continent: 'Africa', flag: '🇰🇪' },
  AR: { lat: -34.6037, lon: -58.3816, capital: 'Buenos Aires', name: 'Argentina', continent: 'South America', flag: '🇦🇷' },
  CL: { lat: -33.4489, lon: -70.6693, capital: 'Santiago', name: 'Chile', continent: 'South America', flag: '🇨🇱' },
  MX: { lat: 19.4326, lon: -99.1332, capital: 'Mexico City', name: 'Mexico', continent: 'North America', flag: '🇲🇽' },
  CO: { lat: 4.7110, lon: -74.0721, capital: 'Bogota', name: 'Colombia', continent: 'South America', flag: '🇨🇴' },
  PE: { lat: -12.0464, lon: -77.0428, capital: 'Lima', name: 'Peru', continent: 'South America', flag: '🇵🇪' },
  NZ: { lat: -36.8485, lon: 174.7633, capital: 'Auckland', name: 'New Zealand', continent: 'Oceania', flag: '🇳🇿' },
};

export const CANONICAL_COUNTRY_MAP: Record<string, { name: string; flag: string }> = ISO_TO_CANONICAL_COUNTRY;

// Synchronous & hydrated caches
const geoCache: Record<string, GeoLocation> = {};
const hydratedGeoCache = new Map<string, UnifiedIpGeo>();
const inFlightIps = new Set<string>();
const subscribers = new Set<() => void>();
let cacheVersion = 0;

function notifySubscribers() {
  cacheVersion += 1;
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore subscriber cleanup race
    }
  });
}

export function cleanIpAddress(ip?: string): string {
  if (!ip) return '';
  let clean = String(ip).trim().replace(/^::ffff:/i, '');
  // Strip IPv4 :port if present
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(clean)) {
    clean = clean.split(':')[0];
  }
  return clean;
}

export function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((seg) => /^\d{1,3}$/.test(seg) && Number(seg) >= 0 && Number(seg) <= 255);
}

export function isValidIpv6(ip: string): boolean {
  if (!ip.includes(':')) return false;
  return /^[0-9a-fA-F:]+(%[0-9a-zA-Z]+)?$/.test(ip);
}

export function isPrivateOrLocalIp(cleanIp: string): boolean {
  if (!cleanIp) return false;
  const lower = cleanIp.toLowerCase();
  if (lower === 'localhost' || lower === '::1' || lower === '0.0.0.0' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  if (!isValidIpv4(cleanIp)) return false;
  const [p0, p1] = cleanIp.split('.').map(Number);
  return (
    p0 === 10 ||
    p0 === 127 ||
    (p0 === 192 && p1 === 168) ||
    (p0 === 172 && p1 >= 16 && p1 <= 31) ||
    (p0 === 169 && p1 === 254) ||
    (p0 === 100 && p1 >= 64 && p1 <= 127)
  );
}

export function getHydratedIpGeo(ip: string): UnifiedIpGeo | undefined {
  const clean = cleanIpAddress(ip);
  return clean ? hydratedGeoCache.get(clean) : undefined;
}

export function seedHydratedIpGeo(record: UnifiedIpGeo): void {
  if (!record || !record.ip) return;
  const clean = cleanIpAddress(record.ip);
  if (!clean || !record.country || record.country === 'XX') return;
  hydratedGeoCache.set(clean, { ...record, ip: clean });
  geoCache[clean] = {
    country: record.country,
    countryName: record.countryName,
    flag: record.flag,
    city: record.city,
    region: record.region,
    lat: record.lat,
    lon: record.lon,
    isp: record.isp,
    asName: record.asName,
    asn: record.asn,
    cidr: record.cidr,
    rir: record.rir,
    netName: record.netName,
    source: record.source,
  };
}

/**
 * Batch hydrates IPs via backend APNIC RDAP + GeoIP endpoint (/api/geoip/batch).
 */
export async function hydrateIpLocations(ips: string[]): Promise<Record<string, UnifiedIpGeo>> {
  const cleanList = Array.from(
    new Set(
      ips
        .map((ip) => cleanIpAddress(ip))
        .filter(
          (clean) =>
            clean &&
            (isValidIpv4(clean) || isValidIpv6(clean)) &&
            !isPrivateOrLocalIp(clean) &&
            !hydratedGeoCache.has(clean) &&
            !inFlightIps.has(clean)
        )
    )
  );

  if (cleanList.length === 0) return {};

  cleanList.forEach((ip) => inFlightIps.add(ip));
  const collected: Record<string, UnifiedIpGeo> = {};

  try {
    const chunkSize = 80;
    for (let i = 0; i < cleanList.length; i += chunkSize) {
      const chunk = cleanList.slice(i, i + chunkSize);
      const res = await fetch('/api/geoip/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: chunk }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const results = (data?.results || data || {}) as Record<string, UnifiedIpGeo>;
      for (const [ip, rec] of Object.entries(results)) {
        if (rec && rec.country && rec.country !== 'XX') {
          seedHydratedIpGeo({ ...rec, ip: cleanIpAddress(ip) });
          collected[cleanIpAddress(ip)] = hydratedGeoCache.get(cleanIpAddress(ip))!;
        }
      }
    }
    if (Object.keys(collected).length > 0) {
      notifySubscribers();
    }
  } catch {
    // Non-blocking fallback when backend temporarily unreachable
  } finally {
    cleanList.forEach((ip) => inFlightIps.delete(ip));
  }

  return collected;
}

/**
 * React hook that ensures any list of IPs rendered in a dashboard panel
 * is automatically resolved against the live APNIC RDAP + GeoIP backend
 * and causes synchronized re-renders upon arrival.
 */
export function useHydratedGeoIp(ips: string[]): number {
  const [version, setVersion] = useState(cacheVersion);

  useEffect(() => {
    const listener = () => setVersion(cacheVersion);
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  }, []);

  const normalizedKey = useMemo(() => {
    const unique = Array.from(new Set(ips.map((ip) => cleanIpAddress(ip)).filter(Boolean))).sort();
    return unique.join(',');
  }, [ips]);

  useEffect(() => {
    if (!normalizedKey) return;
    const list = normalizedKey.split(',').filter(Boolean);
    void hydrateIpLocations(list);
  }, [normalizedKey]);

  return version;
}

/**
 * Resolves coordinates for a given city and country without any hash/random guesswork.
 */
export function resolveCityCoordinates(
  city?: string,
  countryCode?: string,
  _ip?: string
): { lat: number; lon: number; city: string; countryCode: string; countryName: string; flag: string } {
  const canonical = countryCode && countryCode !== 'XX' && countryCode !== 'GLOBAL'
    ? getCanonicalCountryInfo(countryCode)
    : null;
  const targetCountry = canonical && canonical.code !== 'XX' ? canonical.code : undefined;

  if (targetCountry === 'LAN') {
    return {
      lat: -8.499,
      lon: 140.401,
      city: city || 'LAN (Private)',
      countryCode: 'LAN',
      countryName: 'Local Private Network',
      flag: '🏠',
    };
  }

  // 1. Exact match in GLOBAL_CITY_COORDINATES adhering to country consistency
  if (city && GLOBAL_CITY_COORDINATES[city]) {
    const c = GLOBAL_CITY_COORDINATES[city];
    if (!targetCountry || c.countryCode.toUpperCase() === targetCountry) {
      return {
        lat: c.lat,
        lon: c.lon,
        city: c.city,
        countryCode: c.countryCode,
        countryName: c.countryName,
        flag: c.flag,
      };
    }
  }

  // 2. Partial city name match (ensuring country consistency)
  if (city && city !== 'Unknown' && city !== 'Pending APNIC' && city !== 'N/A') {
    const cleanLower = city.trim().toLowerCase();
    for (const [key, val] of Object.entries(GLOBAL_CITY_COORDINATES)) {
      if (cleanLower === key.toLowerCase() || cleanLower.includes(key.toLowerCase()) || key.toLowerCase().includes(cleanLower)) {
        if (!targetCountry || val.countryCode.toUpperCase() === targetCountry) {
          return {
            lat: val.lat,
            lon: val.lon,
            city: city.trim(),
            countryCode: val.countryCode,
            countryName: val.countryName,
            flag: val.flag,
          };
        }
      }
    }
  }

  // 3. Deterministic country centroid / capital fallback (zero random hashing)
  if (targetCountry && COUNTRY_COORDINATES[targetCountry]) {
    const cc = COUNTRY_COORDINATES[targetCountry];
    const cleanCity =
      city && city !== 'Unknown' && city !== 'Pending APNIC' && city !== 'N/A' && !city.includes('Pending')
        ? city
        : cc.capital;
    return {
      lat: cc.lat,
      lon: cc.lon,
      city: cleanCity,
      countryCode: targetCountry,
      countryName: cc.name,
      flag: cc.flag,
    };
  }

  if (targetCountry) {
    const fallback = ISO_TO_CANONICAL_COUNTRY[targetCountry] || { name: targetCountry, flag: '🌐' };
    return {
      lat: 0,
      lon: 0,
      city: city && city !== 'Unknown' ? city : fallback.name,
      countryCode: targetCountry,
      countryName: fallback.name,
      flag: fallback.flag,
    };
  }

  return {
    lat: 0,
    lon: 0,
    city: city || 'Unknown',
    countryCode: 'XX',
    countryName: 'Global / Unknown',
    flag: '🌐',
  };
}

/**
 * Resolves the unified authoritative GeoIP profile for an IP across every dashboard panel.
 * Authoritative APNIC RDAP + GeoIP hydrated record ALWAYS overrides stale/local guesses.
 */
export function resolveUnifiedIpGeo(
  ip: string,
  existing?: {
    country?: string;
    countryName?: string;
    flag?: string;
    city?: string;
    region?: string;
    lat?: number;
    lon?: number;
    isp?: string;
    asName?: string;
    asn?: string;
    cidr?: string;
    rir?: string;
    netName?: string;
    source?: string;
  }
): UnifiedIpGeo {
  const clean = cleanIpAddress(ip);

  if (!clean) {
    return {
      ip: ip || '',
      country: 'XX',
      countryName: 'Unknown',
      flag: '🌐',
      city: 'Unknown',
      region: '',
      lat: 0,
      lon: 0,
      isp: '',
      asName: '',
      asn: '',
      cidr: '',
      rir: '',
      netName: '',
      source: 'empty',
    };
  }

  if (isPrivateOrLocalIp(clean)) {
    return {
      ip: clean,
      country: 'LAN',
      countryName: 'Local Private Network',
      flag: '🏠',
      city: 'LAN (Private)',
      region: 'Private RFC1918',
      lat: -8.499,
      lon: 140.401,
      isp: 'Internal Campus / Router LAN',
      asName: 'Private Network',
      asn: '',
      cidr: '',
      rir: 'RFC1918',
      netName: 'PRIVATE-LAN',
      source: 'rfc1918',
    };
  }

  if (!isValidIpv4(clean) && !isValidIpv6(clean)) {
    return {
      ip: clean,
      country: 'XX',
      countryName: 'Manual / Test Entry',
      flag: '🏷️',
      city: 'N/A',
      region: '',
      lat: 0,
      lon: 0,
      isp: existing?.isp || existing?.asName || 'Manual Address-List Entry',
      asName: existing?.asName || existing?.isp || 'Manual Entry',
      asn: existing?.asn || '',
      cidr: existing?.cidr || '',
      rir: existing?.rir || '',
      netName: existing?.netName || '',
      source: 'invalid_ip',
    };
  }

  // 1. Live APNIC RDAP hydrated cache (authoritative across all panels)
  const hydrated = hydratedGeoCache.get(clean);
  if (hydrated && hydrated.country && hydrated.country !== 'XX') {
    return hydrated;
  }

  // 2. If backend already stamped this record as apnic_rdap_v2, adopt and cache immediately
  if (
    existing?.source === 'apnic_rdap_v2' &&
    existing.country &&
    existing.country !== 'XX' &&
    existing.country !== 'GLOBAL'
  ) {
    const canonical = getCanonicalCountryInfo(existing.country, existing.flag, existing.countryName);
    const hasCoords =
      typeof existing.lat === 'number' &&
      typeof existing.lon === 'number' &&
      (existing.lat !== 0 || existing.lon !== 0);
    const coords = hasCoords
      ? { lat: existing.lat!, lon: existing.lon!, city: existing.city || 'Unknown' }
      : resolveCityCoordinates(existing.city, canonical.code, clean);

    const resolved: UnifiedIpGeo = {
      ip: clean,
      country: canonical.code,
      countryName: canonical.name,
      flag: canonical.flag,
      city: existing.city || coords.city || 'Unknown',
      region: existing.region || '',
      lat: coords.lat,
      lon: coords.lon,
      isp: existing.isp || existing.asName || 'Cloud / Hosting Network',
      asName: existing.asName || existing.isp || 'Cloud / Hosting Network',
      asn: existing.asn || '',
      cidr: existing.cidr || '',
      rir: existing.rir || '',
      netName: existing.netName || '',
      source: 'apnic_rdap_v2',
    };
    seedHydratedIpGeo(resolved);
    return resolved;
  }

  // 3. Backend-supplied geo fields (before background batch finishes or as immediate initial state)
  const rawCountry = existing?.country && existing.country !== 'GLOBAL' && existing.country !== 'XX' ? existing.country : undefined;
  const rawCountryName =
    existing?.countryName &&
    existing.countryName !== 'RouterOS Address-List' &&
    existing.countryName !== 'Resolving...' &&
    existing.countryName !== 'Unknown'
      ? existing.countryName
      : undefined;

  if (rawCountry || rawCountryName) {
    const canonical = getCanonicalCountryInfo(rawCountry, existing?.flag, rawCountryName);
    if (canonical.code !== 'XX') {
      const hasValidCoords =
        typeof existing?.lat === 'number' &&
        typeof existing?.lon === 'number' &&
        (existing.lat !== 0 || existing.lon !== 0);
      const cityFallback = resolveCityCoordinates(existing?.city, canonical.code, clean);
      return {
        ip: clean,
        country: canonical.code,
        countryName: canonical.name,
        flag: canonical.flag,
        city: existing?.city && existing.city !== 'Unknown' ? existing.city : cityFallback.city,
        region: existing?.region || '',
        lat: hasValidCoords ? existing!.lat! : cityFallback.lat,
        lon: hasValidCoords ? existing!.lon! : cityFallback.lon,
        isp: existing?.isp || existing?.asName || 'Resolving ISP...',
        asName: existing?.asName || existing?.isp || 'Resolving AS...',
        asn: existing?.asn || '',
        cidr: existing?.cidr || '',
        rir: existing?.rir || '',
        netName: existing?.netName || '',
        source: existing?.source || 'backend_initial',
      };
    }
  }

  // 4. Unresolved valid public IP (no fabricated /8 or %13 countries or random cities)
  return {
    ip: clean,
    country: 'XX',
    countryName: 'Resolving...',
    flag: '🌐',
    city: 'Pending APNIC',
    region: '',
    lat: 0,
    lon: 0,
    isp: existing?.isp || 'Resolving...',
    asName: existing?.asName || 'Resolving...',
    asn: '',
    cidr: '',
    rir: '',
    netName: '',
    source: 'pending_hydration',
  };
}

/**
 * Synchronous lookup backed exclusively by APNIC-hydrated cache, RFC1918 detection, and IP validation.
 * Zero fabricated /8 rules or hash-based country/city guesses.
 */
export function lookupIpLocation(ip: string): GeoLocation {
  const cleanIp = cleanIpAddress(ip);
  if (!cleanIp) {
    return { country: 'XX', countryName: 'Unknown', flag: '🌐', city: 'Unknown', lat: 0, lon: 0 };
  }

  const hydrated = hydratedGeoCache.get(cleanIp);
  if (hydrated) {
    return {
      country: hydrated.country,
      countryName: hydrated.countryName,
      flag: hydrated.flag,
      city: hydrated.city,
      isp: hydrated.isp,
      asName: hydrated.asName,
      asn: hydrated.asn,
      cidr: hydrated.cidr,
      rir: hydrated.rir,
      netName: hydrated.netName,
      source: hydrated.source,
      region: hydrated.region,
      lat: hydrated.lat,
      lon: hydrated.lon,
    };
  }

  if (geoCache[cleanIp]) {
    return geoCache[cleanIp];
  }

  const unified = resolveUnifiedIpGeo(cleanIp);
  return {
    country: unified.country,
    countryName: unified.countryName,
    flag: unified.flag,
    city: unified.city,
    isp: unified.isp,
    asName: unified.asName,
    asn: unified.asn,
    cidr: unified.cidr,
    rir: unified.rir,
    netName: unified.netName,
    source: unified.source,
    region: unified.region,
    lat: unified.lat,
    lon: unified.lon,
  };
}
