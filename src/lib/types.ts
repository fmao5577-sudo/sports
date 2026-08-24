export type Locale = "ar" | "en";
export type ThemeMode = "dark" | "light";
export type FreshnessTone = "fresh" | "updating" | "delayed" | "offline";
export type MatchPhase =
  | "scheduled"
  | "live"
  | "ht"
  | "ft"
  | "aet"
  | "pen"
  | "postponed"
  | "cancelled"
  | "abandoned"
  | "awarded";

export type DataMeta = {
  source: string;
  sources: string[];
  lastUpdated: string;
  timestamp: string;
  confidence: "high" | "medium" | "low" | "conflict";
  status: FreshnessTone;
  verified: boolean;
  note?: string;
};

export type Competition = {
  id: string;
  name: string;
  nameAr: string;
  shortName: string;
  country: string;
  countryCode: string;
  logo: string;
  type: "league" | "cup" | "international";
  season?: string;
  color?: string;
};

export type TeamSummary = {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  country?: string;
  score?: number | null;
  redCards?: number;
};

export type MatchSummary = {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionLogo: string;
  countryCode?: string;
  kickoff: string;
  status: MatchPhase;
  statusLabel: string;
  minute?: string | null;
  home: TeamSummary;
  away: TeamSummary;
  score: string | null;
  winner?: "home" | "away" | "draw" | null;
  live: boolean;
  finished: boolean;
  cancelled: boolean;
  postponed: boolean;
  meta: DataMeta;
};

export type StandingRow = {
  position: number;
  teamId: string;
  teamName: string;
  teamLogo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form?: string[];
  qualColor?: string | null;
  zone?: string | null;
};

export type TransferRecord = {
  id: string;
  playerId: string;
  playerName: string;
  playerPhoto: string;
  position?: string;
  fromClub: string;
  fromClubId?: string;
  fromClubLogo?: string;
  toClub: string;
  toClubId?: string;
  toClubLogo?: string;
  fee?: string | null;
  feeValue?: number | null;
  date: string;
  status: "official" | "rumour" | "loan" | "free" | "extension";
  probability?: string | null;
  source: string;
  sourceUrl?: string | null;
  lastUpdated: string;
  marketValue?: number | null;
};

export type NewsItem = {
  id: string;
  title: string;
  summary?: string;
  image?: string | null;
  source: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  relatedTeam?: string;
  relatedPlayer?: string;
  relatedCompetition?: string;
  lang: Locale;
};

export type InjuryRecord = {
  id: string;
  playerId: string;
  playerName: string;
  playerPhoto: string;
  teamId: string;
  teamName: string;
  teamLogo: string;
  kind: "injury" | "suspension";
  detail?: string;
  expectedReturn?: string;
  status: string;
  lastUpdated: string;
  source: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  photo: string;
  nationality?: string;
  countryCode?: string;
  age?: number;
  height?: string;
  position?: string;
  shirtNumber?: string | number | null;
  currentClubId?: string;
  currentClub?: string;
  currentClubLogo?: string;
  currentLeague?: string;
  currentLeagueId?: string;
  contractUntil?: string;
  marketValue?: string;
  preferredFoot?: string;
  injured?: boolean;
  lastTransfer?: TransferRecord | null;
  previousClubs: { name: string; id?: string; start?: string; end?: string }[];
  recentMatches: {
    id: string;
    date?: string;
    opponent?: string;
    rating?: number | null;
    goals?: number;
    minutes?: number;
  }[];
  stats: { label: string; value: string }[];
  meta: DataMeta;
};

export type TeamProfile = {
  id: string;
  name: string;
  logo: string;
  country?: string;
  countryCode?: string;
  leagueId?: string;
  leagueName?: string;
  stadium?: string;
  coach?: string;
  coachId?: string;
  colors?: { primary?: string; secondary?: string };
  squad: {
    group: string;
    players: {
      id: string;
      name: string;
      photo: string;
      position?: string;
      nationality?: string;
      age?: number;
      injured?: boolean;
      rating?: number | null;
      number?: string | number | null;
    }[];
  }[];
  form?: string[];
  nextMatch?: MatchSummary | null;
  lastMatch?: MatchSummary | null;
  standings?: StandingRow[];
  transfersIn: TransferRecord[];
  transfersOut: TransferRecord[];
  rumours: TransferRecord[];
  injuries: InjuryRecord[];
  news: NewsItem[];
  meta: DataMeta;
};

export type MatchEvent = {
  id: string;
  minute: string;
  type: "goal" | "assist" | "yellow" | "red" | "sub" | "var" | "penalty" | "injury" | "other";
  team: "home" | "away";
  player?: string;
  assist?: string;
  detail?: string;
};

export type MatchStat = { key: string; label: string; home: string; away: string };

export type LineupPlayer = {
  id: string;
  name: string;
  number?: string | number | null;
  position?: string;
  rating?: number | null;
  ratingSource: "official" | "sheko";
  photo: string;
  events?: string[];
};

export type MatchDetails = {
  summary: MatchSummary;
  venue?: string;
  referee?: string;
  attendance?: string;
  events: MatchEvent[];
  stats: MatchStat[];
  lineups: {
    homeFormation?: string;
    awayFormation?: string;
    home: LineupPlayer[];
    away: LineupPlayer[];
    homeSubs: LineupPlayer[];
    awaySubs: LineupPlayer[];
    homeCoach?: string;
    awayCoach?: string;
  };
  h2h: { id: string; date?: string; home: string; away: string; score?: string }[];
  commentary: { minute?: string; text: string }[];
  playerRatings: {
    id: string;
    name: string;
    team: "home" | "away";
    rating: number;
    source: "official" | "sheko";
  }[];
  xg?: { home?: number; away?: number };
  meta: DataMeta;
};

export type SearchResults = {
  players: { id: string; name: string; team?: string; photo: string }[];
  teams: { id: string; name: string; league?: string; logo: string }[];
  competitions: { id: string; name: string; country?: string; logo: string }[];
  matches: { id: string; name: string; date?: string; competition?: string }[];
  news: NewsItem[];
  transfers: TransferRecord[];
};

export type ConnectionState = {
  online: boolean;
  polling: boolean;
  lastUpdated?: string;
  status: FreshnessTone;
};
