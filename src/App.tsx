/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/gameEngine';
import { CaravanState, FactionId, GameEventMessage, PlayerStats, WoodenHut } from './types/game';
import { GameHUD } from './components/GameHUD';
import { FactionSelectModal } from './components/FactionSelectModal';
import { LoreModal } from './components/LoreModal';
import { soundManager } from './audio/soundManager';
import { RotateCcw } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [faction, setFaction] = useState<FactionId>('elf');
  const [stats, setStats] = useState<PlayerStats>({
    health: 220,
    maxHealth: 220,
    stamina: 100,
    maxStamina: 100,
    gold: 50,
    level: 1,
    exp: 0,
    caravansRobbed: 0,
    caravansProtected: 0,
    hutsDefended: 0,
    hutsRaided: 0,
    enemiesDefeated: 0,
    raidsSurvived: 0,
  });

  const [caravan, setCaravan] = useState<CaravanState>({
    id: 'caravan-1',
    active: true,
    position: { x: -80, y: 0, z: -40 },
    hp: 400,
    maxHp: 400,
    progress: 0,
    totalGold: 850,
    robbed: false,
    guardsRemaining: 3,
  });

  const [huts, setHuts] = useState<WoodenHut[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<GameEventMessage[]>([]);
  const [raidCountdown, setRaidCountdown] = useState<number>(30);
  const [shieldTimer, setShieldTimer] = useState<number>(4.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals
  const [isFactionModalOpen, setIsFactionModalOpen] = useState(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, faction);
    engineRef.current = engine;

    engine.onStatsUpdate = (newStats) => setStats({ ...newStats });
    engine.onCaravanUpdate = (newCaravan) => setCaravan({ ...newCaravan });
    engine.onHutsUpdate = (newHuts) => setHuts([...newHuts]);
    engine.onAbilityCooldownsUpdate = (newCds) => setCooldowns(newCds);
    engine.onEventMessage = (msg) => {
      setEvents((prev) => [...prev, msg]);
    };

    // Update timers tick
    const timer = setInterval(() => {
      if (engineRef.current) {
        setRaidCountdown(engineRef.current.raidCountdown);
        setShieldTimer(engineRef.current.respawnShieldTimer);
      }
    }, 200);

    return () => {
      clearInterval(timer);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectFaction = (newFaction: FactionId) => {
    setFaction(newFaction);
    if (engineRef.current) {
      engineRef.current.setFaction(newFaction);
    }
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleTriggerRaid = () => {
    if (engineRef.current) {
      engineRef.current.triggerRaid();
    }
  };

  const handleSpawnCaravan = () => {
    if (engineRef.current) {
      engineRef.current.spawnNewCaravan();
    }
  };

  const handleRespawn = () => {
    if (engineRef.current) {
      engineRef.current.respawnPlayer();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans select-none">
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="absolute inset-0 cursor-crosshair" />

      {/* Main Action HUD */}
      <GameHUD
        faction={faction}
        stats={stats}
        caravan={caravan}
        huts={huts}
        cooldowns={cooldowns}
        events={events}
        raidCountdown={raidCountdown}
        shieldTimer={shieldTimer}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenFactionModal={() => setIsFactionModalOpen(true)}
        onOpenLoreModal={() => setIsLoreModalOpen(true)}
        onTriggerRaid={handleTriggerRaid}
        onSpawnCaravan={handleSpawnCaravan}
      />

      {/* Defeat / Respawn Overlay if Health = 0 */}
      {stats.health <= 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-stone-900 border border-red-900/60 p-8 text-center max-w-md shadow-2xl">
            <span className="text-4xl">☠️</span>
            <h2 className="text-2xl font-bold text-red-500">Вы пали в бою!</h2>
            <p className="text-xs text-stone-300">
              «Но джва года ожидания не прошли даром — герой возрождается в родном поселении!»
            </p>
            <button
              onClick={handleRespawn}
              className="mt-2 flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 font-bold text-stone-950 hover:bg-amber-500 transition-colors shadow-lg"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Возродиться</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <FactionSelectModal
        currentFaction={faction}
        isOpen={isFactionModalOpen}
        onClose={() => setIsFactionModalOpen(false)}
        onSelectFaction={handleSelectFaction}
      />

      <LoreModal
        isOpen={isLoreModalOpen}
        onClose={() => setIsLoreModalOpen(false)}
        stats={stats}
      />
    </div>
  );
}
