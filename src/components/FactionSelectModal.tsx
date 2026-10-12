import React from 'react';
import { FactionId } from '../types/game';
import { FACTIONS } from '../game/constants';
import { X, Check } from 'lucide-react';

interface FactionSelectModalProps {
  currentFaction: FactionId;
  isOpen: boolean;
  onClose: () => void;
  onSelectFaction: (id: FactionId) => void;
}

export const FactionSelectModal: React.FC<FactionSelectModalProps> = ({
  currentFaction,
  isOpen,
  onClose,
  onSelectFaction,
}) => {
  if (!isOpen) return null;

  const factionList = Object.values(FACTIONS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="relative w-full max-w-4xl rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl p-6 text-stone-100 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-amber-200">Выбор стороны конфликта</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              «Пользователь может играть лесными эльфами, охраной дворца и злодеем…»
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Faction Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {factionList.map((f) => {
            const isSelected = f.id === currentFaction;

            return (
              <div
                key={f.id}
                className={`relative flex flex-col justify-between rounded-xl p-5 border transition-all ${
                  isSelected
                    ? 'bg-stone-800/90 border-amber-500 shadow-lg ring-1 ring-amber-500/40'
                    : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40'
                }`}
              >
                {/* Badge if selected */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    <Check className="h-3 w-3" />
                    <span>Выбрано</span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-4 w-4 rounded-full ring-2 ring-white/20"
                      style={{ backgroundColor: f.color }}
                    />
                    <h3 className="font-bold text-base text-stone-100">{f.name}</h3>
                  </div>

                  <span className="text-xs font-semibold text-amber-400">{f.role}</span>
                  <p className="text-xs text-stone-300 leading-relaxed">{f.description}</p>

                  {/* Lore Quote */}
                  <blockquote className="rounded bg-stone-950/70 p-2.5 border-l-2 border-amber-500/70 text-[11px] italic text-stone-400">
                    {f.loreQuote}
                  </blockquote>

                  {/* Abilities preview */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-stone-800/60">
                    <span className="text-[11px] font-semibold text-stone-400">Способности:</span>
                    {f.abilities.map((ab) => (
                      <div key={ab.id} className="flex items-center justify-between text-xs text-stone-300">
                        <span className="flex items-center gap-1.5">
                          <span>{ab.icon}</span>
                          <span>{ab.name}</span>
                        </span>
                        <span className="font-mono text-[10px] text-stone-500 bg-stone-950 px-1 rounded">
                          [{ab.hotkey}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Choose Button */}
                <button
                  onClick={() => {
                    onSelectFaction(f.id);
                    onClose();
                  }}
                  className={`mt-5 w-full rounded-lg py-2 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-amber-600 text-stone-900 hover:bg-amber-500'
                      : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                  }`}
                >
                  {isSelected ? 'Продолжить игру' : 'Вступить в бой'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-stone-400 border-t border-stone-800 pt-3">
          <span>Смена фракции телепортирует героя на родную базу</span>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
