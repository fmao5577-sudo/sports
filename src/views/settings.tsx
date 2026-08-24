"use client";

import { usePrefs } from "@/components/providers";

const ZONES = ["", "Africa/Cairo", "Asia/Riyadh", "Europe/London", "Europe/Paris", "Europe/Berlin", "America/New_York", "Asia/Dubai"];

export default function SettingsPage() {
  const { dict, locale, setLocale, theme, setTheme, timezone, setTimezone, notify, setNotify } = usePrefs();
  return (
    <div className="grid max-w-2xl gap-5">
      <h1 className="text-2xl font-semibold">{dict.settings}</h1>
      <section className="sheko-card grid gap-3 p-5">
        <h2 className="font-medium">{dict.language}</h2>
        <div className="flex gap-2">
          <button className={`sheko-chip ${locale === "ar" ? "bg-[var(--pitch)] text-black" : ""}`} onClick={() => setLocale("ar")}>{dict.arabic}</button>
          <button className={`sheko-chip ${locale === "en" ? "bg-[var(--pitch)] text-black" : ""}`} onClick={() => setLocale("en")}>{dict.english}</button>
        </div>
      </section>
      <section className="sheko-card grid gap-3 p-5">
        <h2 className="font-medium">{theme === "dark" ? dict.dark : dict.light}</h2>
        <div className="flex gap-2">
          <button className={`sheko-chip ${theme === "dark" ? "bg-[var(--pitch)] text-black" : ""}`} onClick={() => setTheme("dark")}>{dict.dark}</button>
          <button className={`sheko-chip ${theme === "light" ? "bg-[var(--pitch)] text-black" : ""}`} onClick={() => setTheme("light")}>{dict.light}</button>
        </div>
      </section>
      <section className="sheko-card grid gap-3 p-5">
        <h2 className="font-medium">{dict.timezone}</h2>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="rounded-2xl border border-[var(--line)] bg-transparent px-3 py-3">
          {ZONES.map((zone) => <option key={zone || "auto"} value={zone}>{zone || dict.autoTimezone}</option>)}
        </select>
      </section>
      <section className="sheko-card grid gap-3 p-5">
        <h2 className="font-medium">{dict.notifications}</h2>
        {Object.entries({
          goals: dict.notifyGoals,
          kickoff: dict.notifyKickoff,
          fulltime: dict.notifyFulltime,
          cards: dict.notifyCards,
          transfers: dict.notifyTransfers,
          news: dict.notifyNews,
          lineups: dict.notifyLineups,
          injuries: dict.notifyInjuries,
        }).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-sm">
            <span>{label}</span>
            <input type="checkbox" checked={Boolean(notify[key])} onChange={(e) => setNotify(key, e.target.checked)} />
          </label>
        ))}
        <p className="text-xs text-[var(--muted)]">{dict.dataNote}</p>
      </section>
    </div>
  );
}
