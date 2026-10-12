import React from 'react';
import { KIRILL_LETTER_ORIGINAL, MEME_FACTS } from '../game/constants';
import { PlayerStats } from '../types/game';
import { X, Award, Scroll, Compass } from 'lucide-react';

interface LoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

export const LoreModal: React.FC<LoreModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans">
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl p-6 text-stone-100 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            <Scroll className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-amber-200">Суть Такова: Письмо Кирилла</h2>
              <span className="text-xs text-stone-400">Канонический первоисточник русского геймдева</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* The Famous Letter in parchment card */}
        <div className="rounded-xl bg-amber-950/20 border border-amber-600/30 p-5 shadow-inner">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400/90 block mb-2">
            Оригинальный текст документа (2000-е годы)
          </span>
          <pre className="font-serif text-sm sm:text-base leading-relaxed text-amber-100 whitespace-pre-wrap select-text">
            {KIRILL_LETTER_ORIGINAL}
          </pre>
          <div className="mt-4 pt-3 border-t border-amber-800/40 flex items-center justify-between text-xs text-amber-300/80">
            <span>Статус: ✅ Воплощено в полном 3D!</span>
            <span>Джва года: Выполнено</span>
          </div>
        </div>

        {/* Stats in Current Session */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-400" />
            <span>Статистика ваших подвигов</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-stone-950/60 p-3 border border-stone-800">
              <span className="text-xs text-stone-400">Ограблено корованов</span>
              <div className="text-xl font-bold text-amber-400 mt-1">{stats.caravansRobbed}</div>
            </div>
            <div className="rounded-lg bg-stone-950/60 p-3 border border-stone-800">
              <span className="text-xs text-stone-400">Сохранено домиков</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">{stats.hutsDefended}</div>
            </div>
            <div className="rounded-lg bg-stone-950/60 p-3 border border-stone-800">
              <span className="text-xs text-stone-400">Повержено врагов</span>
              <div className="text-xl font-bold text-red-400 mt-1">{stats.enemiesDefeated}</div>
            </div>
            <div className="rounded-lg bg-stone-950/60 p-3 border border-stone-800">
              <span className="text-xs text-stone-400">Накоплено золота</span>
              <div className="text-xl font-bold text-amber-300 mt-1">{stats.gold}</div>
            </div>
          </div>
        </div>

        {/* Meme Glossary */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-amber-400" />
            <span>Энциклопедия канонических мемов</span>
          </h3>
          <div className="flex flex-col gap-2 text-xs text-stone-300">
            {MEME_FACTS.map((fact, idx) => (
              <div key={idx} className="rounded-lg bg-stone-950/40 p-2.5 border border-stone-800/80">
                {fact}
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-stone-800">
          <button
            onClick={onClose}
            className="rounded-lg px-5 py-2 bg-amber-600 text-stone-950 font-bold hover:bg-amber-500 transition-colors text-xs"
          >
            Вернуться в 3D-экшон
          </button>
        </div>
      </div>
    </div>
  );
};
