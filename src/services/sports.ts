import { FEATURED_COMPETITIONS, competitionById } from "@/lib/competitions";
import type {
  Competition,
  InjuryRecord,
  MatchDetails,
  MatchEvent,
  MatchStat,
  MatchSummary,
  NewsItem,
  PlayerProfile,
  SearchResults,
  StandingRow,
  TeamProfile,
  TransferRecord,
} from "@/lib/types";
import {
  asArray,
  bool,
  compactYmd,
  formatFee,
  freshnessFromAge,
  isRecord,
  leagueLogo,
  makeMeta,
  mapFotmobStatus,
  num,
  numOrNull,
  playerPhoto,
  shekoRating,
  str,
  strOrNum,
  teamLogo,
  uniqueBy,
  ymd,
} from "@/lib/utils";
import { remember } from "./cache";
import { upsertEntity } from "./entity";
import {
  getLeague,
  getMatchDetails as fotmobMatch,
  getMatchesByDate,
  getPlayer as fotmobPlayer,
  getTeam as fotmobTeam,
  getTransfers as fotmobTransfers,
  searchSuggest,
} from "./fotmob";
import { getNews } from "./news";

const FOTMOB = "fotmob";

function teamFromUnknown(value: unknown, fallbackName = "TBD"): { id: string; name: string; shortName: string; logo: string; score: number | null; redCards?: number } {
  const rec = isRecord(value) ? value : {};
  const id = str(rec.id || rec.teamId);
  const name = str(rec.longName || rec.name || rec.teamName, fallbackName);
  return {
    id,
    name,
    shortName: str(rec.name || rec.shortName, name),
    logo: teamLogo(id),
    score: numOrNull(rec.score),
    redCards: num(rec.redCards, 0) || undefined,
  };
}

function parseMatch(raw: unknown, league: { id: string; name: string; logo: string; countryCode?: string }, fetchedAt: string): MatchSummary | null {
  if (!isRecord(raw)) return null;
  const home = teamFromUnknown(raw.home);
  const away = teamFromUnknown(raw.away);
  const statusRec = isRecord(raw.status) ? raw.status : {};
  const mapped = mapFotmobStatus(statusRec, num(raw.statusId, 0));
  const kickoff = str(statusRec.utcTime || raw.time || raw.timeTS);
  const iso = kickoff.includes("T") ? new Date(kickoff).toISOString() : new Date(num(raw.timeTS)).toISOString();
  const id = str(raw.id);
  if (!id || !home.id || !away.id) return null;
  const score =
    home.score === null && away.score === null
      ? null
      : `${home.score ?? 0} - ${away.score ?? 0}`;
  return {
    id,
    competitionId: str(raw.leagueId, league.id),
    competitionName: league.name,
    competitionLogo: league.logo,
    countryCode: league.countryCode,
    kickoff: Number.isNaN(Date.parse(iso)) ? new Date().toISOString() : iso,
    status: mapped.phase,
    statusLabel: mapped.label,
    minute: mapped.minute,
    home,
    away,
    score,
    winner: mapped.finished
      ? (home.score ?? 0) > (away.score ?? 0)
        ? "home"
        : (away.score ?? 0) > (home.score ?? 0)
          ? "away"
          : "draw"
      : null,
    live: mapped.live,
    finished: mapped.finished,
    cancelled: mapped.cancelled,
    postponed: mapped.postponed,
    meta: makeMeta({
      source: FOTMOB,
      lastUpdated: fetchedAt,
      status: freshnessFromAge(fetchedAt, mapped.live),
      confidence: "high",
    }),
  };
}

function parseDayMatches(payload: unknown, fetchedAt: string): { leagues: { id: string; name: string; ccode?: string; matches: MatchSummary[] }[]; matches: MatchSummary[] } {
  const root = isRecord(payload) ? payload : {};
  const leagues = asArray(root.leagues).map((leagueRaw) => {
    const league = isRecord(leagueRaw) ? leagueRaw : {};
    const id = str(league.id || league.primaryId);
    const name = str(league.name, "Competition");
    const logo = leagueLogo(id);
    const ccode = str(league.ccode);
    const matches = asArray(league.matches)
      .map((item) => parseMatch(item, { id, name, logo, countryCode: ccode }, fetchedAt))
      .filter((item): item is MatchSummary => Boolean(item));
    return { id, name, ccode, matches };
  });
  return { leagues, matches: leagues.flatMap((item) => item.matches) };
}

function parseTransfer(raw: unknown, rumour = false): TransferRecord | null {
  if (!isRecord(raw)) return null;
  const playerId = str(raw.playerId || raw.id);
  const playerName = str(raw.name);
  if (!playerId || !playerName) return null;
  const feeObj = isRecord(raw.fee) ? raw.fee : {};
  const typeObj = isRecord(raw.transferType) ? raw.transferType : {};
  const typeText = str(typeObj.text || feeObj.feeText).toLowerCase();
  const status: TransferRecord["status"] = rumour
    ? "rumour"
    : typeText.includes("loan")
      ? "loan"
      : typeText.includes("free")
        ? "free"
        : typeText.includes("extension")
          ? "extension"
          : "official";
  const date = str(raw.transferDate || raw.fromDate || raw.date);
  return {
    id: `${playerId}-${str(raw.toClubId)}-${date}`,
    playerId,
    playerName,
    playerPhoto: playerPhoto(playerId),
    position: isRecord(raw.position) ? str(raw.position.label) : str(raw.position),
    fromClub: str(raw.fromClubFullName || raw.fromClub, "Unknown"),
    fromClubId: str(raw.fromClubId) || undefined,
    fromClubLogo: teamLogo(raw.fromClubId as string),
    toClub: str(raw.toClubFullName || raw.toClub, "Unknown"),
    toClubId: str(raw.toClubId) || undefined,
    toClubLogo: teamLogo(raw.toClubId as string),
    fee: formatFee(numOrNull(feeObj.value ?? raw.amountEuroEstimated), str(feeObj.feeText || typeObj.text) || null),
    feeValue: numOrNull(feeObj.value ?? raw.amountEuroEstimated),
    date,
    status,
    probability: str(raw.probability) || null,
    source: str(raw.sourceName, rumour ? "Rumour desk" : "FotMob / Enetpulse"),
    sourceUrl: str(raw.sourceUrl) || null,
    lastUpdated: date || new Date().toISOString(),
    marketValue: numOrNull(raw.marketValue),
  };
}

function standingFromRow(raw: unknown): StandingRow | null {
  if (!isRecord(raw)) return null;
  const teamId = str(raw.id || raw.teamId);
  const scores = str(raw.scoresStr, "0-0").split("-");
  return {
    position: num(raw.idx || raw.position, 0),
    teamId,
    teamName: str(raw.name || raw.teamName),
    teamLogo: teamLogo(teamId),
    played: num(raw.played),
    won: num(raw.wins),
    drawn: num(raw.draws),
    lost: num(raw.losses),
    gf: num(scores[0]),
    ga: num(scores[1]),
    gd: num(raw.goalConDiff),
    points: num(raw.pts),
    qualColor: str(raw.qualColor) || null,
    zone: str(raw.qualColor) ? "marked" : null,
  };
}

export async function getMatches(date?: string) {
  const day = date || compactYmd(new Date());
  const cached = await remember(`matches:${day}`, 40_000, FOTMOB, () => getMatchesByDate(day));
  return parseDayMatches(cached.data, cached.fetchedAt);
}

export async function getLiveMatches() {
  const { matches, leagues } = await getMatches();
  const featuredIds = new Set(FEATURED_COMPETITIONS.map((item) => item.id));
  const liveAll = matches.filter((match) => match.live);
  const live = [
    ...liveAll.filter((m) => featuredIds.has(m.competitionId)),
    ...liveAll.filter((m) => !featuredIds.has(m.competitionId)),
  ];
  const liveLeagues = leagues
    .map((league) => ({ ...league, matches: league.matches.filter((match) => match.live) }))
    .filter((league) => league.matches.length)
    .sort((a, b) => {
      const af = featuredIds.has(a.id) ? 0 : 1;
      const bf = featuredIds.has(b.id) ? 0 : 1;
      return af - bf;
    });
  return { live, leagues: liveLeagues };
}

export async function getFixtures(date?: string) {
  const { matches } = await getMatches(date);
  return matches.filter((match) => match.status === "scheduled");
}

export async function getResults(date?: string) {
  const { matches } = await getMatches(date);
  return matches.filter((match) => match.finished);
}

export async function getCompetitions(): Promise<Competition[]> {
  const { leagues } = await getMatches();
  const dynamic = leagues.map((league) => {
    const known = competitionById(league.id);
    return (
      known ?? {
        id: league.id,
        name: league.name,
        nameAr: league.name,
        shortName: league.name,
        country: league.ccode || "",
        countryCode: league.ccode || "",
        logo: leagueLogo(league.id),
        type: "league" as const,
      }
    );
  });
  return uniqueBy([...FEATURED_COMPETITIONS, ...dynamic], (item) => item.id);
}

export async function getCompetition(id: string) {
  const cached = await remember(`league:${id}`, 8 * 60_000, FOTMOB, () => getLeague(id));
  const payload = isRecord(cached.data) ? cached.data : {};
  const details = isRecord(payload.details) ? payload.details : {};
  const overview = isRecord(payload.overview) ? payload.overview : {};
  const fixtures = isRecord(payload.fixtures) ? payload.fixtures : {};
  const tableWrap = asArray(payload.table)[0];
  const tableData = isRecord(tableWrap) && isRecord(tableWrap.data) ? tableWrap.data : isRecord(payload.table) ? payload.table : {};
  const tableAll = isRecord(tableData.table) ? asArray(tableData.table.all) : asArray(isRecord(tableData) ? tableData.all : []);
  const standings = tableAll.map(standingFromRow).filter((row): row is StandingRow => Boolean(row));
  const formMap = new Map<string, string[]>();
  const formRows = isRecord(tableData.table) ? asArray(tableData.table.form) : [];
  for (const row of formRows) {
    if (!isRecord(row)) continue;
    const scores = str(row.scoresStr);
    formMap.set(str(row.id), scores ? [scores] : []);
  }
  const standingsWithForm = standings.map((row) => ({ ...row, form: formMap.get(row.teamId) }));
  const allMatches = asArray(fixtures.allMatches || overview.leagueOverviewMatches).map((item) => {
    const rec = isRecord(item) ? item : {};
    const status = isRecord(rec.status) ? rec.status : {};
    const home = isRecord(rec.home) ? rec.home : {};
    const away = isRecord(rec.away) ? rec.away : {};
    return parseMatch(
      {
        id: rec.id,
        home: { id: home.id, name: home.name, score: status.scoreStr ? Number(String(status.scoreStr).split("-")[0]) : home.score },
        away: { id: away.id, name: away.name, score: status.scoreStr ? Number(String(status.scoreStr).split("-")[1]) : away.score },
        status,
        statusId: rec.statusId,
        timeTS: rec.timeTS,
        leagueId: id,
      },
      { id, name: str(details.name, competitionById(id)?.name || "Competition"), logo: leagueLogo(id), countryCode: str(details.country) },
      cached.fetchedAt,
    );
  }).filter((item): item is MatchSummary => Boolean(item));

  const stats = isRecord(payload.stats) ? payload.stats : {};
  const players = asArray(stats.players);
  const topScorers = players
    .map((group) => (isRecord(group) ? group : null))
    .filter(Boolean)
    .flatMap((group) => {
      const rec = group as Record<string, unknown>;
      if (!/goal|scorer/i.test(str(rec.header || rec.name))) return [];
      return asArray(rec.topPlayers || rec.players || rec.statList);
    })
    .slice(0, 15);

  const transfersRaw = isRecord(payload.transfers) ? payload.transfers : {};
  const transfers = asArray(transfersRaw.data).map((item) => parseTransfer(item)).filter((item): item is TransferRecord => Boolean(item));

  const known = competitionById(id);
  return {
    competition: {
      id,
      name: str(details.name, known?.name || "Competition"),
      nameAr: known?.nameAr || str(details.name),
      shortName: str(details.shortName, known?.shortName || str(details.name)),
      country: str(details.country, known?.country || ""),
      countryCode: str(details.country, known?.countryCode || ""),
      logo: leagueLogo(id),
      type: known?.type || "league",
      season: str(details.selectedSeason || details.latestSeason),
      color: str(details.leagueColor, known?.color),
    } satisfies Competition,
    standings: standingsWithForm,
    matches: allMatches,
    fixtures: allMatches.filter((match) => match.status === "scheduled"),
    results: allMatches.filter((match) => match.finished),
    live: allMatches.filter((match) => match.live),
    transfers,
    topPlayers: topScorers,
    playoff: payload.playoff ?? null,
    tabs: asArray(payload.tabs),
    meta: makeMeta({ source: FOTMOB, lastUpdated: cached.fetchedAt, status: cached.stale ? "delayed" : "fresh" }),
    stale: cached.stale,
  };
}

export async function getStandings(id: string) {
  const competition = await getCompetition(id);
  return competition.standings;
}

export async function getTeam(id: string): Promise<TeamProfile> {
  const cached = await remember(`team:${id}`, 12 * 60_000, FOTMOB, () => fotmobTeam(id));
  const payload = isRecord(cached.data) ? cached.data : {};
  const details = isRecord(payload.details) ? payload.details : {};
  const overview = isRecord(payload.overview) ? payload.overview : {};
  const jsonld = isRecord(details.sportsTeamJSONLD) ? details.sportsTeamJSONLD : {};
  const location = isRecord(jsonld.location) ? jsonld.location : {};
  const squadWrap = isRecord(payload.squad) ? payload.squad : {};
  const groups = asArray(squadWrap.squad || overview.squad).map((groupRaw) => {
    const group = isRecord(groupRaw) ? groupRaw : {};
    return {
      group: str(group.title, "Squad"),
      players: asArray(group.members).map((memberRaw) => {
        const member = isRecord(memberRaw) ? memberRaw : {};
        const pid = str(member.id);
        void upsertEntity({ type: "player", name: str(member.name), source: FOTMOB, sourceId: pid, payload: member });
        return {
          id: pid,
          name: str(member.name),
          photo: playerPhoto(pid),
          position: isRecord(member.role) ? str(member.role.fallback || member.role.key) : str(member.role),
          nationality: str(member.cname),
          age: num(member.age) || undefined,
          injured: bool(member.injured),
          rating: numOrNull(member.rating),
          number: strOrNum(member.shirtNumber ?? member.shirt),
        };
      }),
    };
  });
  const lastLineup = isRecord(overview.lastLineupStats) ? overview.lastLineupStats : {};
  const injuries: InjuryRecord[] = asArray(lastLineup.unavailable).map((item) => {
    const rec = isRecord(item) ? item : {};
    const unav = isRecord(rec.unavailability) ? rec.unavailability : {};
    return {
      id: `${id}-${str(rec.id)}`,
      playerId: str(rec.id),
      playerName: str(rec.name),
      playerPhoto: playerPhoto(rec.id as string),
      teamId: id,
      teamName: str(details.name),
      teamLogo: teamLogo(id),
      kind: /suspend/i.test(str(unav.type)) ? "suspension" : "injury",
      detail: str(unav.type),
      expectedReturn: str(unav.expectedReturn),
      status: str(unav.expectedReturn, "current"),
      lastUpdated: cached.fetchedAt,
      source: FOTMOB,
    };
  });
  const transfersWrap = isRecord(payload.transfers) ? payload.transfers : isRecord(overview.transfers) ? overview.transfers : {};
  const allTransfers = asArray(transfersWrap.data || transfersWrap.allTransfers).map((item) => parseTransfer(item)).filter((item): item is TransferRecord => Boolean(item));
  const rumours = asArray(transfersWrap.allRumours).map((item) => parseTransfer(item, true)).filter((item): item is TransferRecord => Boolean(item));
  const newsItems: NewsItem[] = asArray(isRecord(overview.newsSummary) ? overview.newsSummary.items : []).map((item) => {
    const rec = isRecord(item) ? item : {};
    const source = isRecord(rec.source) ? rec.source : {};
    return {
      id: str(source.articleId || rec.summary),
      title: str(source.title || rec.summary),
      summary: str(rec.summary),
      image: null,
      source: str(source.sourceName, "FotMob"),
      url: str(source.uri),
      publishedAt: cached.fetchedAt,
      relatedTeam: str(details.name),
      lang: "en" as const,
    };
  });
  const coachObj = isRecord(lastLineup.coach) ? lastLineup.coach : {};
  const coachHistory = asArray(overview.coachHistory)[0];
  const coachName = str(coachObj.name || (isRecord(coachHistory) ? coachHistory.name : ""));
  const table = asArray(overview.table || payload.table);
  const standings: StandingRow[] = [];
  for (const block of table) {
    const rec = isRecord(block) ? block : {};
    const data = isRecord(rec.data) ? rec.data : rec;
    const inner = isRecord(data.table) ? asArray(data.table.all) : asArray(data.all || data.table);
    standings.push(...inner.map(standingFromRow).filter((row): row is StandingRow => Boolean(row)));
  }

  void upsertEntity({ type: "team", name: str(details.name), source: FOTMOB, sourceId: id, payload: details });

  return {
    id,
    name: str(details.name),
    logo: teamLogo(id),
    country: str(details.country),
    countryCode: str(details.country),
    leagueId: str(details.primaryLeagueId),
    leagueName: str(details.primaryLeagueName),
    stadium: str(location.name),
    coach: coachName,
    coachId: str(coachObj.id) || undefined,
    colors: isRecord(overview.teamColors)
      ? { primary: str((overview.teamColors as Record<string, unknown>).darkMode), secondary: str((overview.teamColors as Record<string, unknown>).lightMode) }
      : undefined,
    squad: groups,
    nextMatch: null,
    lastMatch: null,
    standings,
    transfersIn: allTransfers.filter((item) => item.toClubId === id),
    transfersOut: allTransfers.filter((item) => item.fromClubId === id),
    rumours,
    injuries,
    news: newsItems,
    meta: makeMeta({ source: FOTMOB, lastUpdated: cached.fetchedAt, status: cached.stale ? "delayed" : "fresh" }),
  };
}

export async function getPlayer(id: string): Promise<PlayerProfile> {
  const cached = await remember(`player:${id}`, 15 * 60_000, FOTMOB, () => fotmobPlayer(id));
  const payload = isRecord(cached.data) ? cached.data : {};
  const primary = isRecord(payload.primaryTeam) ? payload.primaryTeam : {};
  const mainLeague = isRecord(payload.mainLeague) ? payload.mainLeague : {};
  const info = asArray(payload.playerInformation);
  const readInfo = (title: string) => {
    const found = info.find((item) => isRecord(item) && str(item.title).toLowerCase() === title.toLowerCase());
    if (!isRecord(found)) return "";
    const value = isRecord(found.value) ? found.value : {};
    return str(value.fallback || value.numberValue || value.key || value.dateValue);
  };
  const last = parseTransfer(payload.topCompletedTransfer);
  const career = isRecord(payload.careerHistory) ? payload.careerHistory : {};
  const items = isRecord(career.careerItems) ? career.careerItems : {};
  const senior = isRecord(items.senior) ? items.senior : {};
  const previousClubs = asArray(senior.teamEntries).map((entry) => {
    const rec = isRecord(entry) ? entry : {};
    return {
      name: str(rec.team),
      id: str(rec.teamId) || undefined,
      start: str(rec.startDate) || undefined,
      end: str(rec.endDate) || undefined,
    };
  });
  const recentMatches = asArray(payload.recentMatches).slice(0, 12).map((item) => {
    const rec = isRecord(item) ? item : {};
    return {
      id: str(rec.matchId || rec.id),
      date: str(rec.matchDate || rec.utcTime),
      opponent: str(rec.opponentName || rec.opponent),
      rating: numOrNull(rec.rating),
      goals: num(rec.goals),
      minutes: num(rec.minutesPlayed || rec.minutes),
    };
  });
  const stats = [
    { label: "League", value: str(mainLeague.leagueName) },
    { label: "Season", value: str(mainLeague.season) },
  ];
  const leagueStats = isRecord(mainLeague.stats) ? mainLeague.stats : {};
  for (const [key, value] of Object.entries(leagueStats).slice(0, 10)) {
    if (typeof value === "number" || typeof value === "string") stats.push({ label: key, value: String(value) });
  }

  void upsertEntity({ type: "player", name: str(payload.name), source: FOTMOB, sourceId: id, payload });

  return {
    id,
    name: str(payload.name),
    photo: playerPhoto(id),
    nationality: readInfo("Country"),
    countryCode: (() => {
      const found = info.find((item) => isRecord(item) && str(item.title) === "Country");
      return isRecord(found) ? str(found.countryCode) : undefined;
    })(),
    age: num(readInfo("Age")) || undefined,
    height: readInfo("Height") || undefined,
    position: isRecord(payload.positionDescription) && isRecord((payload.positionDescription as Record<string, unknown>).primaryPosition)
      ? str(((payload.positionDescription as Record<string, unknown>).primaryPosition as Record<string, unknown>).label)
      : undefined,
    shirtNumber: readInfo("Shirt") || null,
    currentClubId: str(primary.teamId) || undefined,
    currentClub: str(primary.teamName) || undefined,
    currentClubLogo: teamLogo(primary.teamId as string),
    currentLeague: str(mainLeague.leagueName) || undefined,
    currentLeagueId: str(mainLeague.leagueId) || undefined,
    contractUntil: readInfo("Contract end") || str(isRecord(payload.contractEnd) ? payload.contractEnd.utcTime : ""),
    marketValue: readInfo("Market value") || undefined,
    preferredFoot: readInfo("Preferred foot") || undefined,
    injured: Boolean(payload.injuryInformation),
    lastTransfer: last,
    previousClubs,
    recentMatches,
    stats: stats.filter((item) => item.value),
    meta: makeMeta({
      source: FOTMOB,
      lastUpdated: cached.fetchedAt,
      status: cached.stale ? "delayed" : "fresh",
      confidence: primary.teamName ? "high" : "medium",
    }),
  };
}

function extractEvents(details: Record<string, unknown>): MatchEvent[] {
  const header = isRecord(details.header) ? details.header : {};
  const content = isRecord(details.content) ? details.content : {};
  const facts = isRecord(content.matchFacts) ? content.matchFacts : {};
  const eventsWrap = isRecord(facts.events) ? facts.events : isRecord(header.events) ? header.events : {};
  const list = asArray(eventsWrap.events || eventsWrap.allEvents || eventsWrap);
  const events: MatchEvent[] = [];
  list.forEach((item, index) => {
    if (!isRecord(item)) return;
    const typeRaw = str(item.type || item.card || item.eventType).toLowerCase();
    const type: MatchEvent["type"] =
      typeRaw.includes("goal") || typeRaw === "1"
        ? "goal"
        : typeRaw.includes("yellow")
          ? "yellow"
          : typeRaw.includes("red")
            ? "red"
            : typeRaw.includes("sub")
              ? "sub"
              : typeRaw.includes("var")
                ? "var"
                : typeRaw.includes("pen")
                  ? "penalty"
                  : "other";
    events.push({
      id: str(item.id, String(index)),
      minute: str(item.time || item.minute || item.elapsed),
      type,
      team: str(item.isHome || item.home) === "true" || item.isHome === true ? "home" : "away",
      player: str(item.name || item.playerName || item.player),
      assist: str(item.assistName || item.assist),
      detail: str(item.stritext || item.description || item.overloadDescription),
    });
  });
  return events;
}

function extractStats(details: Record<string, unknown>): MatchStat[] {
  const content = isRecord(details.content) ? details.content : {};
  const stats = isRecord(content.stats) ? content.stats : {};
  const periods = asArray(stats.Periods || stats.periods || stats.stats);
  const rows: MatchStat[] = [];
  const consume = (node: unknown) => {
    if (!isRecord(node)) return;
    const groups = asArray(node.stats || node.groups || node.Stat);
    if (!groups.length && Array.isArray(node.stats)) return;
    for (const group of groups.length ? groups : [node]) {
      const rec = isRecord(group) ? group : {};
      const inner = asArray(rec.stats || rec.items || rec);
      for (const stat of inner) {
        if (!isRecord(stat)) continue;
        const key = str(stat.key || stat.type || stat.title || stat.name);
        const title = str(stat.title || stat.type || stat.key);
        const statsArr = asArray(stat.stats);
        const home = str(stat.home || statsArr[0] || stat.homeValue);
        const away = str(stat.away || statsArr[1] || stat.awayValue);
        if (title && (home || away)) rows.push({ key, label: title, home, away });
      }
    }
  };
  periods.forEach(consume);
  consume(stats);
  return uniqueBy(rows, (row) => row.key + row.label);
}

function extractLineupSide(side: unknown) {
  const rec = isRecord(side) ? side : {};
  const starters = asArray(rec.starters || rec.players).map((item) => {
    const player = isRecord(item) ? item : isRecord((item as { player?: unknown }).player) ? ((item as { player: Record<string, unknown> }).player) : {};
    const nested = isRecord(item) && isRecord(item.player) ? item.player : player;
    const id = str(nested.id || player.id);
    const ratingOfficial = numOrNull(nested.rating || player.rating || (isRecord(nested.ratingObj) ? nested.ratingObj.num : null));
    return {
      id,
      name: str(nested.name || player.name),
      number: strOrNum(nested.shirtNumber ?? player.shirt),
      position: str(nested.position || player.position),
      rating: ratingOfficial,
      ratingSource: ratingOfficial ? ("official" as const) : ("sheko" as const),
      photo: playerPhoto(id),
    };
  });
  const subs = asArray(rec.subs || rec.substitutes).map((item) => {
    const player = isRecord(item) ? item : {};
    const nested = isRecord(player.player) ? player.player : player;
    const id = str(nested.id);
    return {
      id,
      name: str(nested.name),
      number: strOrNum(nested.shirtNumber),
      rating: numOrNull(nested.rating),
      ratingSource: nested.rating ? ("official" as const) : ("sheko" as const),
      photo: playerPhoto(id),
    };
  });
  const coach = isRecord(rec.coach) ? str(rec.coach.name) : undefined;
  return { starters, subs, coach, formation: str(rec.formation) };
}

export async function getMatchDetails(id: string): Promise<MatchDetails> {
  const cached = await remember(`match:${id}`, 20_000, FOTMOB, () => fotmobMatch(id));
  const payload = isRecord(cached.data) ? cached.data : {};
  const general = isRecord(payload.general) ? payload.general : {};
  const header = isRecord(payload.header) ? payload.header : {};
  const teams = asArray(header.teams);
  const homeTeam = isRecord(general.homeTeam) ? general.homeTeam : isRecord(teams[0]) ? teams[0] : {};
  const awayTeam = isRecord(general.awayTeam) ? general.awayTeam : isRecord(teams[1]) ? teams[1] : {};
  const status = isRecord(header.status) ? header.status : {};
  const mapped = mapFotmobStatus(status);
  const homeScore = numOrNull(homeTeam.score ?? status.scoreStr?.toString().split("-")[0]);
  const awayScore = numOrNull(awayTeam.score ?? status.scoreStr?.toString().split("-")[1]);
  const summary: MatchSummary = {
    id,
    competitionId: str(general.leagueId),
    competitionName: str(general.leagueName),
    competitionLogo: leagueLogo(general.leagueId as string),
    countryCode: str(general.countryCode),
    kickoff: str(general.matchTimeUTCDate || general.matchTimeUTC || status.utcTime),
    status: mapped.phase,
    statusLabel: mapped.label,
    minute: mapped.minute,
    home: {
      id: str(homeTeam.id),
      name: str(homeTeam.name || homeTeam.longName),
      shortName: str(homeTeam.name),
      logo: teamLogo(homeTeam.id as string),
      score: homeScore,
    },
    away: {
      id: str(awayTeam.id),
      name: str(awayTeam.name || awayTeam.longName),
      shortName: str(awayTeam.name),
      logo: teamLogo(awayTeam.id as string),
      score: awayScore,
    },
    score: homeScore === null && awayScore === null ? null : `${homeScore ?? 0} - ${awayScore ?? 0}`,
    live: mapped.live,
    finished: mapped.finished,
    cancelled: mapped.cancelled,
    postponed: mapped.postponed,
    meta: makeMeta({ source: FOTMOB, lastUpdated: cached.fetchedAt, status: freshnessFromAge(cached.fetchedAt, mapped.live) }),
  };

  const content = isRecord(payload.content) ? payload.content : {};
  const lineup = isRecord(content.lineup) ? content.lineup : {};
  const homeLine = extractLineupSide(asArray(lineup.lineup)[0] || lineup.homeTeam || lineup.home);
  const awayLine = extractLineupSide(asArray(lineup.lineup)[1] || lineup.awayTeam || lineup.away);
  const events = extractEvents(payload);
  const stats = extractStats(payload);
  const facts = isRecord(content.matchFacts) ? content.matchFacts : {};
  const infoBox = isRecord(facts.infoBox) ? facts.infoBox : {};
  const h2hWrap = isRecord(content.h2h) ? content.h2h : {};
  const h2h = asArray(h2hWrap.matches || h2hWrap.summary).map((item) => {
    const rec = isRecord(item) ? item : {};
    const home = isRecord(rec.home) ? rec.home : {};
    const away = isRecord(rec.away) ? rec.away : {};
    return {
      id: str(rec.matchId || rec.id),
      date: str(rec.time || rec.utcTime),
      home: str(home.name || rec.homeName),
      away: str(away.name || rec.awayName),
      score: str(rec.status && isRecord(rec.status) ? rec.status.scoreStr : rec.score),
    };
  });
  const ticker = isRecord(content.liveticker) ? content.liveticker : {};
  const commentary = asArray(ticker.lines || ticker.events || facts.events && isRecord(facts.events) ? (facts.events as { events?: unknown }).events : []).map((item) => {
    const rec = isRecord(item) ? item : {};
    return { minute: str(rec.time || rec.minute), text: str(rec.text || rec.description || rec.title) };
  }).filter((item) => item.text);

  const playerRatings = [...homeLine.starters, ...awayLine.starters]
    .filter((player) => player.rating)
    .map((player) => ({
      id: player.id,
      name: player.name,
      team: homeLine.starters.some((item) => item.id === player.id) ? ("home" as const) : ("away" as const),
      rating: player.rating ?? 6,
      source: player.ratingSource,
    }));

  const xgRow = stats.find((row) => /xg|expected/i.test(row.label));

  return {
    summary,
    venue: str(infoBox.Stadium && isRecord(infoBox.Stadium) ? infoBox.Stadium.value || infoBox.Stadium.name : infoBox.venue),
    referee: str(infoBox.Referee && isRecord(infoBox.Referee) ? infoBox.Referee.value || infoBox.Referee.name : infoBox.referee),
    events,
    stats,
    lineups: {
      homeFormation: homeLine.formation || str(isRecord(lineup.homeTeam) ? lineup.homeTeam.formation : ""),
      awayFormation: awayLine.formation,
      home: homeLine.starters,
      away: awayLine.starters,
      homeSubs: homeLine.subs,
      awaySubs: awayLine.subs,
      homeCoach: homeLine.coach,
      awayCoach: awayLine.coach,
    },
    h2h,
    commentary,
    playerRatings,
    xg: xgRow ? { home: Number(xgRow.home) || undefined, away: Number(xgRow.away) || undefined } : undefined,
    meta: summary.meta,
  };
}

export async function getTransfers(filter?: { rumour?: boolean; teamId?: string; leagueId?: string; range?: string }) {
  const cached = await remember("transfers:latest", 8 * 60_000, FOTMOB, () => fotmobTransfers());
  const payload = isRecord(cached.data) ? cached.data : {};
  let items = asArray(payload.transfers).map((item) => parseTransfer(item)).filter((item): item is TransferRecord => Boolean(item));

  if (filter?.leagueId) {
    try {
      const league = await getCompetition(filter.leagueId);
      items = uniqueBy([...league.transfers, ...items], (item) => item.id);
    } catch {
      // keep global list
    }
  }
  if (filter?.teamId) {
    try {
      const team = await getTeam(filter.teamId);
      items = uniqueBy([...team.transfersIn, ...team.transfersOut, ...(filter.rumour ? team.rumours : []), ...items], (item) => item.id);
    } catch {
      // keep
    }
  }
  if (filter?.rumour) {
    items = items.filter((item) => item.status === "rumour");
  } else {
    items = items.filter((item) => item.status !== "rumour");
  }
  if (filter?.range) {
    const now = Date.now();
    const maxAge =
      filter.range === "today" ? 36 * 3600_000 :
      filter.range === "yesterday" ? 72 * 3600_000 :
      filter.range === "week" ? 8 * 86400_000 :
      filter.range === "month" ? 32 * 86400_000 :
      Infinity;
    items = items.filter((item) => {
      const ts = Date.parse(item.date);
      return Number.isFinite(ts) && now - ts <= maxAge;
    });
  }
  return {
    items,
    hits: num(payload.hits, items.length),
    meta: makeMeta({ source: FOTMOB, lastUpdated: cached.fetchedAt, status: cached.stale ? "delayed" : "fresh" }),
  };
}

export async function searchAll(query: string): Promise<SearchResults> {
  const term = query.trim();
  if (term.length < 2) {
    return { players: [], teams: [], competitions: [], matches: [], news: [], transfers: [] };
  }
  const cached = await remember(`search:${term.toLowerCase()}`, 120_000, "fotmob-search", () => searchSuggest(term));
  const payload = isRecord(cached.data) ? cached.data : {};
  const collect = (key: string) => {
    const block = asArray(payload[key]);
    return block.flatMap((entry) => asArray(isRecord(entry) ? entry.options : []));
  };
  const players = collect("squadMemberSuggest").map((item) => {
    const rec = isRecord(item) ? item : {};
    const payloadRec = isRecord(rec.payload) ? rec.payload : {};
    const text = str(rec.text);
    const [name, id] = text.split("|");
    return { id: str(payloadRec.id, id), name: name || str(payloadRec.name), team: str(payloadRec.teamName), photo: playerPhoto(payloadRec.id as string) };
  });
  const teams = collect("teamSuggest").map((item) => {
    const rec = isRecord(item) ? item : {};
    const payloadRec = isRecord(rec.payload) ? rec.payload : {};
    const text = str(rec.text);
    const [name, id] = text.split("|");
    return { id: str(payloadRec.id, id), name, league: str(payloadRec.leagueName), logo: teamLogo(payloadRec.id as string) };
  });
  const competitions = collect("leagueSuggest").map((item) => {
    const rec = isRecord(item) ? item : {};
    const payloadRec = isRecord(rec.payload) ? rec.payload : {};
    const text = str(rec.text);
    const [name, id] = text.split("|");
    return { id: str(payloadRec.id, id), name, country: str(payloadRec.countryCode), logo: leagueLogo(payloadRec.id as string) };
  });
  const matches = collect("matchSuggest").map((item) => {
    const rec = isRecord(item) ? item : {};
    const payloadRec = isRecord(rec.payload) ? rec.payload : {};
    return {
      id: str(payloadRec.id),
      name: str(rec.text),
      date: str(payloadRec.matchDate),
      competition: str(payloadRec.leagueName),
    };
  });
  const [news, transfers] = await Promise.all([
    getNews(30),
    getTransfers().catch(() => ({ items: [] as TransferRecord[] })),
  ]);
  const q = term.toLowerCase();
  return {
    players,
    teams,
    competitions,
    matches,
    news: news.filter((item) => item.title.toLowerCase().includes(q)).slice(0, 8),
    transfers: transfers.items.filter((item) => item.playerName.toLowerCase().includes(q) || item.toClub.toLowerCase().includes(q) || item.fromClub.toLowerCase().includes(q)).slice(0, 8),
  };
}

export async function getInjuries(teamIds?: string[]): Promise<InjuryRecord[]> {
  const ids = teamIds?.length ? teamIds : ["8650", "8455", "8456", "9825", "8633", "8634"];
  const packs = await Promise.allSettled(ids.slice(0, 8).map((id) => getTeam(id)));
  return packs.flatMap((result) => (result.status === "fulfilled" ? result.value.injuries : []));
}

export async function getHome(favoriteTeamIds: string[] = []) {
  // Parallel fetch — home stays fast even if news/transfers lag
  const results = await Promise.allSettled([
    getMatches(),
    getNews(12),
    getTransfers({ range: "week" }),
  ]);

  if (results[0].status !== "fulfilled") {
    throw results[0].status === "rejected" ? results[0].reason : new Error("matches failed");
  }
  const today = results[0].value;
  const news = results[1].status === "fulfilled" ? results[1].value : [];
  const transfers =
    results[2].status === "fulfilled" ? results[2].value : { items: [] as TransferRecord[] };

  const featuredIds = new Set(FEATURED_COMPETITIONS.slice(0, 10).map((item) => item.id));
  const liveAll = today.matches.filter((match) => match.live);
  const live = [
    ...liveAll.filter((m) => featuredIds.has(m.competitionId)),
    ...liveAll.filter((m) => !featuredIds.has(m.competitionId)),
  ].slice(0, 30);
  const upcoming = today.matches
    .filter((match) => match.status === "scheduled" && featuredIds.has(match.competitionId))
    .slice(0, 16);
  const finished = today.matches
    .filter((match) => match.finished && featuredIds.has(match.competitionId))
    .slice(0, 16);
  const featured = today.leagues
    .filter((league) => featuredIds.has(league.id) || league.matches.some((match) => match.live))
    .slice(0, 10);
  const favoriteMatches = today.matches.filter(
    (match) => favoriteTeamIds.includes(match.home.id) || favoriteTeamIds.includes(match.away.id),
  );
  return {
    live,
    upcoming,
    finished,
    featured,
    news,
    transfers: transfers.items.slice(0, 10),
    favoriteMatches,
    competitions: FEATURED_COMPETITIONS,
    date: ymd(new Date()),
    meta: makeMeta({ source: FOTMOB, lastUpdated: new Date().toISOString(), sources: [FOTMOB, "rss-network"] }),
  };
}

export { shekoRating };
