import React from 'react';
import { CaravanState, FactionId, GameEventMessage, PlayerStats, WoodenHut } from '../types/game';
import { FACTIONS } from '../game/constants';
import { Shield, Sparkles, Volume2, VolumeX, BookOpen, Swords, MapPin, Compass } from 'lucide-react';

interface GameHUDProps {
  faction: FactionId;
  stats: PlayerStats;
  caravan: CaravanState;
  huts: WoodenHut[];
  cooldowns: Record<string, number>;
  events: GameEventMessage[];
  raidCountdown: number;
  shieldTimer: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenFactionModal: () => void;
  onOpenLoreModal: () => void;
  onTriggerRaid: () => void;
  onSpawnCaravan: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  faction,
  stats,
  caravan,
  huts,
  cooldowns,
  events,
  raidCountdown,
  shieldTimer,
  isMuted,
  onToggleMute,
  onOpenFactionModal,
  onOpenLoreModal,
  onTriggerRaid,
  onSpawnCaravan,
}) => {
  const cfg = FACTIONS[faction];
  const hpPct = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const standingHuts = huts.filter((h) => !h.ruined).length;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 font-sans select-none text-slate-100">
      {/* Top Bar: Faction Title, Lore Link, Sounds, Controls */}
      <header className="flex items-start justify-between">
        {/* Left: Player Profile & Faction */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenFactionModal}
              className="pointer-events-auto flex items-center gap-2 rounded-lg bg-stone-900/85 px-3 py-1.5 backdrop-blur-md border border-stone-700/60 hover:border-amber-500/80 transition-colors shadow-lg group"
              title="Сменить фракцию"
            >
              <div
                className="h-3.5 w-3.5 rounded-full ring-2 ring-white/20"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-sm font-semibold tracking-wide text-amber-200 group-hover:text-amber-100">
                {cfg.name}
              </span>
              <span className="text-xs text-stone-400">· Сменить</span>
            </button>

            <button
              onClick={onOpenLoreModal}
              className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-stone-900/80 px-3 py-1.5 backdrop-blur-md border border-stone-700/50 hover:bg-stone-800 transition-colors text-xs text-stone-300 shadow-md"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>Суть такова (Лор Кирилла)</span>
            </button>

            <button
              onClick={onToggleMute}
              className="pointer-events-auto rounded-lg bg-stone-900/80 p-2 backdrop-blur-md border border-stone-700/50 hover:bg-stone-800 transition-colors text-stone-300 shadow-md"
              title={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>
          </div>

          {/* Health & Stats Bar */}
          <div className="w-72 rounded-lg bg-stone-950/85 p-3 backdrop-blur-md border border-stone-800/80 shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-stone-300">Здоровье ({cfg.weaponName})</span>
              <span className={hpPct < 30 ? 'text-red-400 font-bold' : 'text-stone-200'}>
                {Math.round(stats.health)} / {stats.maxHealth}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded bg-stone-800">
              <div
                className="h-full transition-all duration-200 ease-out"
                style={{
                  width: `${hpPct}%`,
                  backgroundColor: hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444',
                }}
              />
            </div>

            {/* Active Shield Badge if present */}
            {shieldTimer > 0 && (
              <div className="flex items-center justify-center gap-1.5 rounded bg-amber-500/25 border border-amber-400/60 py-1 text-xs font-semibold text-amber-300 animate-pulse">
                <Shield className="h-3.5 w-3.5" />
                <span>Защитный Щит ({shieldTimer.toFixed(1)}с)</span>
              </div>
            )}

            {/* Sub-bar: Gold & Enemies Defeated */}
            <div className="flex items-center justify-between pt-1 border-t border-stone-800/60 text-xs text-stone-400">
              <div className="flex items-center gap-1 text-amber-300 font-semibold">
                <span>💰 {stats.gold} Золота</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Побеждено: {stats.enemiesDefeated}</span>
                <span>·</span>
                <span>Ограблено: {stats.caravansRobbed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: The Iconic Caravan Banner & Status */}
        <div className="flex flex-col items-center gap-2 max-w-md text-center">
          {caravan.active && !caravan.robbed ? (
            <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-950/90 to-stone-950/90 px-4 py-2.5 backdrop-blur-md border border-amber-500/50 shadow-2xl animate-pulse">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-300">
                <span>🐪 КОРОВАН ОБНАРУЖЕН! МОЖНО ГРАБИТЬ КОРОВАН!</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-300 w-full">
                <span>Прочность повозки:</span>
                <div className="h-2 flex-1 rounded bg-stone-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${(caravan.hp / caravan.maxHp) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-amber-300">{Math.round((caravan.hp / caravan.maxHp) * 100)}%</span>
              </div>
              <div className="text-[11px] text-amber-200/90">
                {faction === 'elf' || faction === 'villain'
                  ? 'Атакуй телегу чтобы выбить горы золота!'
                  : 'Защити королевскую повозку до Дворца!'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-stone-900/80 px-3 py-1.5 backdrop-blur-md border border-stone-700/40 text-xs text-stone-400">
              <span>Корован ожидает отправки</span>
              <button
                onClick={onSpawnCaravan}
                className="pointer-events-auto rounded bg-amber-600/80 px-2 py-0.5 text-stone-100 hover:bg-amber-500 transition-colors"
              >
                Отправить корован!
              </button>
            </div>
          )}

          {/* Wooden Huts Status */}
          <div className="flex items-center gap-3 rounded-lg bg-stone-900/85 px-3 py-1 backdrop-blur-md border border-stone-800/80 text-xs text-stone-300">
            <span className="text-amber-400 font-medium">Домики деревяные:</span>
            <span>
              {standingHuts} / {huts.length} целы
            </span>
            <span className="text-stone-500">|</span>
            <span className="text-stone-400">Набег через: {Math.max(0, Math.ceil(raidCountdown))}с</span>
            <button
              onClick={onTriggerRaid}
              className="pointer-events-auto ml-1 rounded bg-red-800/80 px-2 py-0.5 text-[11px] font-medium text-stone-200 hover:bg-red-700 transition-colors"
              title="Начать набег немедленно"
            >
              Набежать!
            </button>
          </div>
        </div>

        {/* Right: Event Log & Killfeed */}
        <div className="flex flex-col items-end gap-1.5 w-72">
          <div className="flex flex-col gap-1 w-full max-h-48 overflow-hidden">
            {events.slice(-5).map((ev) => (
              <div
                key={ev.id}
                className={`rounded-md px-2.5 py-1 text-xs backdrop-blur-md shadow transition-opacity ${
                  ev.type === 'caravan'
                    ? 'bg-amber-900/85 border border-amber-500/50 text-amber-200 font-semibold'
                    : ev.type === 'raid'
                    ? 'bg-red-950/85 border border-red-600/50 text-red-200 font-bold'
                    : ev.type === 'kill'
                    ? 'bg-emerald-950/80 border border-emerald-700/40 text-emerald-300'
                    : 'bg-stone-900/80 border border-stone-800 text-stone-300'
                }`}
              >
                {ev.text}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Crosshair in the Center */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border border-white/30 flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-white/70" />
        </div>
      </div>

      {/* Bottom Center: Ability Bar & Controls */}
      <footer className="flex flex-col items-center gap-3">
        {/* World Locations Guide */}
        <div className="flex items-center gap-4 text-[11px] text-stone-300 bg-stone-950/80 px-3.5 py-1.5 rounded-full border border-stone-800/80 backdrop-blur-md">
          <span className="flex items-center gap-1">
            <span className="text-emerald-400">🌲</span> Густой лес и домики: (Центр)
          </span>
          <span className="text-stone-600">·</span>
          <span className="flex items-center gap-1">
            <span className="text-blue-400">🏰</span> Дворец: (Северо-Восток)
          </span>
          <span className="text-stone-600">·</span>
          <span className="flex items-center gap-1">
            <span className="text-purple-400">🌋</span> Логово Злодея: (Юго-Запад)
          </span>
        </div>

        {/* Ability Hotkey Slots */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-stone-950/90 p-2.5 backdrop-blur-md border border-stone-800 shadow-2xl">
          {/* Left click: Basic Attack */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-lg bg-stone-800/80 border border-stone-700 shadow-inner">
              <span className="text-xl">⚔️</span>
              <span className="absolute bottom-1 right-1 font-mono text-[10px] font-bold text-amber-400 bg-stone-900/90 px-1 rounded">
                ЛКМ
              </span>
            </div>
            <span className="mt-1 text-[11px] text-stone-400">Атака</span>
          </div>

          {/* Abilities Q, E, R */}
          {cfg.abilities.map((ability) => {
            const cd = cooldowns[ability.hotkey] || 0;
            const isReady = cd <= 0;

            return (
              <div key={ability.id} className="flex flex-col items-center">
                <div
                  className={`relative flex h-14 w-14 items-center justify-center rounded-lg border shadow-inner transition-all ${
                    isReady
                      ? 'bg-stone-800 border-amber-500/70 text-white'
                      : 'bg-stone-900 border-stone-800 text-stone-600'
                  }`}
                  title={`${ability.name}: ${ability.description}`}
                >
                  <span className="text-2xl">{ability.icon}</span>

                  {/* Cooldown Overlay */}
                  {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 font-mono text-sm font-bold text-amber-400">
                      {cd.toFixed(1)}
                    </div>
                  )}

                  <span className="absolute bottom-1 right-1 font-mono text-[10px] font-bold text-amber-400 bg-stone-900/90 px-1 rounded">
                    {ability.hotkey}
                  </span>
                </div>
                <span className="mt-1 text-[11px] text-stone-300 max-w-[70px] truncate text-center">
                  {ability.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Quick controls reminder */}
        <div className="flex items-center gap-3 text-xs text-stone-400 font-mono">
          <span>WASD: движение</span>
          <span>·</span>
          <span>ЛКМ/Пробел: атака</span>
          <span>·</span>
          <span>ПКМ + мышь: вращение камеры</span>
          <span>·</span>
          <span>Колёсико: зум</span>
        </div>
      </footer>
    </div>
  );
};
