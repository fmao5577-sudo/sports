"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientLocation } from "@/lib/client-router";
import HomePage from "@/views/home";
import LivePage from "@/views/live";
import MatchesPage from "@/views/matches";
import TransfersPage from "@/views/transfers";
import CompetitionsPage from "@/views/competitions";
import CompetitionPage from "@/views/competition";
import NewsPage from "@/views/news";
import NewsItemPage from "@/views/news-item";
import InjuriesPage from "@/views/injuries";
import FavoritesPage from "@/views/favorites";
import SearchPage from "@/views/search";
import SettingsPage from "@/views/settings";
import MatchPage from "@/views/match";
import PlayerPage from "@/views/player";
import TeamPage from "@/views/team";

function useRouteReady() {
  const location = useClientLocation();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? location : { pathname: "/", search: "" };
}

export default function AppRouter() {
  const { pathname, search } = useRouteReady();
  const key = useMemo(() => `${pathname}${search}`, [pathname, search]);

  let view = <HomePage />;
  if (pathname === "/live") view = <LivePage />;
  else if (pathname === "/matches") view = <MatchesPage />;
  else if (pathname === "/transfers") view = <TransfersPage />;
  else if (pathname === "/competitions") view = <CompetitionsPage />;
  else if (pathname.startsWith("/competitions/")) view = <CompetitionPage />;
  else if (pathname === "/news") view = <NewsPage />;
  else if (pathname.startsWith("/news/")) view = <NewsItemPage />;
  else if (pathname === "/injuries") view = <InjuriesPage />;
  else if (pathname === "/favorites") view = <FavoritesPage />;
  else if (pathname === "/search") view = <SearchPage />;
  else if (pathname === "/settings") view = <SettingsPage />;
  else if (pathname.startsWith("/match/")) view = <MatchPage />;
  else if (pathname.startsWith("/players/")) view = <PlayerPage />;
  else if (pathname.startsWith("/teams/")) view = <TeamPage />;

  return <div key={key}>{view}</div>;
}
