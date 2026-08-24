import type { Competition } from "./types";
import { leagueLogo } from "./utils";

export const FEATURED_COMPETITIONS: Competition[] = [
  { id: "47", name: "Premier League", nameAr: "الدوري الإنجليزي الممتاز", shortName: "EPL", country: "England", countryCode: "ENG", logo: leagueLogo(47), type: "league", color: "#3F1152" },
  { id: "87", name: "LaLiga", nameAr: "لا ليغا", shortName: "LAL", country: "Spain", countryCode: "ESP", logo: leagueLogo(87), type: "league", color: "#EE8707" },
  { id: "55", name: "Serie A", nameAr: "الدوري الإيطالي", shortName: "SEA", country: "Italy", countryCode: "ITA", logo: leagueLogo(55), type: "league", color: "#024494" },
  { id: "54", name: "Bundesliga", nameAr: "البوندسليغا", shortName: "BUN", country: "Germany", countryCode: "GER", logo: leagueLogo(54), type: "league", color: "#D20515" },
  { id: "53", name: "Ligue 1", nameAr: "الدوري الفرنسي", shortName: "FL1", country: "France", countryCode: "FRA", logo: leagueLogo(53), type: "league", color: "#091C3E" },
  { id: "42", name: "Champions League", nameAr: "دوري أبطال أوروبا", shortName: "UCL", country: "Europe", countryCode: "INT", logo: leagueLogo(42), type: "cup", color: "#0A1E5A" },
  { id: "73", name: "Europa League", nameAr: "الدوري الأوروبي", shortName: "UEL", country: "Europe", countryCode: "INT", logo: leagueLogo(73), type: "cup", color: "#F68E20" },
  { id: "10216", name: "Conference League", nameAr: "دوري المؤتمر الأوروبي", shortName: "UECL", country: "Europe", countryCode: "INT", logo: leagueLogo(10216), type: "cup", color: "#1DB954" },
  { id: "77", name: "World Cup", nameAr: "كأس العالم", shortName: "WC", country: "World", countryCode: "INT", logo: leagueLogo(77), type: "international", color: "#6B21A8" },
  { id: "289", name: "Africa Cup of Nations", nameAr: "كأس أمم أفريقيا", shortName: "AFCON", country: "Africa", countryCode: "INT", logo: leagueLogo(289), type: "international", color: "#15803D" },
  { id: "519", name: "Egyptian Premier League", nameAr: "الدوري المصري الممتاز", shortName: "EPL-EGY", country: "Egypt", countryCode: "EGY", logo: leagueLogo(519), type: "league", color: "#C8102E" },
  { id: "536", name: "Saudi Pro League", nameAr: "دوري روشن السعودي", shortName: "SPL", country: "Saudi Arabia", countryCode: "KSA", logo: leagueLogo(536), type: "league", color: "#199D00" },
  { id: "130", name: "MLS", nameAr: "الدوري الأمريكي", shortName: "MLS", country: "USA", countryCode: "USA", logo: leagueLogo(130), type: "league", color: "#C8102E" },
  { id: "71", name: "Super Lig", nameAr: "الدوري التركي", shortName: "TSL", country: "Turkey", countryCode: "TUR", logo: leagueLogo(71), type: "league", color: "#E30A17" },
  { id: "61", name: "Liga Portugal", nameAr: "الدوري البرتغالي", shortName: "LIGA", country: "Portugal", countryCode: "POR", logo: leagueLogo(61), type: "league", color: "#006400" },
  { id: "57", name: "Eredivisie", nameAr: "الدوري الهولندي", shortName: "ERE", country: "Netherlands", countryCode: "NED", logo: leagueLogo(57), type: "league", color: "#FF5F00" },
  { id: "40", name: "Championship", nameAr: "بطولة إنجلترا", shortName: "CHA", country: "England", countryCode: "ENG", logo: leagueLogo(40), type: "league", color: "#1D4ED8" },
  { id: "48", name: "Liga Profesional", nameAr: "الدوري الأرجنتيني", shortName: "ARG", country: "Argentina", countryCode: "ARG", logo: leagueLogo(48), type: "league", color: "#75AADB" },
];

export function competitionById(id: string): Competition | undefined {
  return FEATURED_COMPETITIONS.find((item) => item.id === String(id));
}

export function competitionLabel(id: string, locale: "ar" | "en", fallback?: string): string {
  const found = competitionById(id);
  if (!found) return fallback || id;
  return locale === "ar" ? found.nameAr : found.name;
}
