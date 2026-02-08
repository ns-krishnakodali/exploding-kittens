import { useState } from 'react';
import './game-engine.css';

import {
  Bomb,
  Shield,
  Gamepad2,
  Trophy,
  Flame,
  Zap,
  Sword,
  Target,
  Eye,
  RefreshCw,
  HandHelping,
  Skull,
  AlertTriangle,
  History,
  Layers,
  ArrowDownCircle,
  PawPrint,
  Inbox,
  Info,
} from 'lucide-react';

export const GameEngine = ({ lobbyId, gameId, playerName }) => {
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [explosionContext, setExplosionContext] = useState(null);
  const [discardPile, setDiscardPile] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleDrawEndTurn = () => {};

  return (
    <>
      <header className="w-full border-b-8 border-black p-4 md:p-6 flex justify-between items-center shadow-[0_4px_0_0_#000]">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="bg-red-600 text-white px-6 py-2 border-4 border-black shadow-[6px_6px_0_0_#000] font-black italic uppercase text-xl md:text-3xl tracking-tighter">
            Exploding Kittens
          </div>
          <div className="hidden sm:flex items-center gap-6 border-l-4 border-black/10 pl-6">
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase text-zinc-400 leading-none mb-1 tracking-widest">
                Room Code
              </span>
              <p className="group flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:text-red-600 transition-colors">
                {gameId}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-yellow-400 border-4 border-black px-4 py-1.5 rounded-xl shadow-[4px_4px_0_0_#000] hidden sm:block">
            <span className="font-black italic uppercase text-xs tracking-tighter text-black">
              DECK_SIZE: 17
            </span>
          </div>
        </div>
      </header>
      <div className="flex flex-col grow overflow-x-hidden">
        <div className="w-full flex justify-center py-4 px-6 relative z-10">
          <div
            className={`min-h-16 max-w-5xl w-full flex items-center justify-center gap-4 px-8 py-3 rounded-2xl border-4 border-black transition-all
                duration-300 transform shadow-[6px_6px_0_0_#000] ${
                  statusMessage
                    ? statusMessage.type === 'error'
                      ? 'bg-red-600 text-white scale-105'
                      : 'bg-white text-black scale-100'
                    : 'bg-black/5 border-dashed border-black/10 scale-95 opacity-50'
                }`}
          >
            {statusMessage ? (
              <>
                {statusMessage.type === 'error' ? (
                  <Bomb size={28} />
                ) : (
                  <Zap size={28} className="text-yellow-400" />
                )}
                <span className="font-black italic uppercase tracking-tight text-sm md:text-xl">
                  {statusMessage.message}
                </span>
              </>
            ) : (
              <span className="loading-dots font-bold text-black italic uppercase text-sm mx-auto tracking-widest">
                Awaiting Player Data
                <span className="ml-0.5 dots" />
              </span>
            )}
          </div>
        </div>
        <section className="p-6 md:p-12 flex flex-col items-center justify-center gap-10">
          <div className="flex flex-col md:flex-row gap-10 md:gap-20 items-center relative">
            <div className="flex flex-col items-center gap-3">
              <p className="font-black italic uppercase text-xs text-black/50 tracking-widest">
                Draw Pile
              </p>
              <div className="relative group">
                <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black rounded-4xl" />
                <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-zinc-200 border-4 border-black rounded-4xl" />

                <button
                  onClick={handleDrawEndTurn}
                  disabled={!isUserTurn || explosionContext}
                  className={`w-40 h-56 border-4 border-black rounded-4xl transition-all relative flex flex-col items-center justify-center gap-4 overflow-hidden ${
                    isUserTurn
                      ? 'bg-white hover:-translate-y-1 active:translate-y-1 shadow-[4px_4px_0_0_#000]'
                      : 'bg-zinc-300 opacity-60'
                  }`}
                >
                  <div className="p-4 bg-yellow-400 rounded-full border-4 border-black shadow-[2px_2px_0_0_#000]">
                    <PawPrint
                      size={40}
                      className={isUserTurn ? 'text-black animate-pulse' : 'text-zinc-600'}
                    />
                  </div>
                  <div className="text-center z-10 px-4">
                    <p className="font-black italic text-xl uppercase leading-none tracking-tighter">
                      THE DECK
                    </p>
                    <p className="font-bold text-[9px] uppercase mt-2 border-t-2 border-black/10 pt-2 tracking-widest">
                      Draw to End Turn
                    </p>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="font-black italic uppercase text-xs text-black/50 tracking-widest">
                Played Deck
              </p>
              <div className="relative w-40 h-56">
                <div className="absolute inset-0 border-4 border-black border-dashed rounded-4xl opacity-20 flex items-center justify-center">
                  <ArrowDownCircle size={32} className="text-black/30" />
                </div>
                {discardPile.length > 0 ? (
                  discardPile.slice(0, 3).map((card, idx) => (
                    <div
                      key={card.id + idx}
                      style={{
                        transform: `rotate(${idx * -6}deg) translate(${idx * -10}px, ${idx * -4}px)`,
                        zIndex: 10 - idx,
                      }}
                      className={`absolute inset-0 border-4 border-black rounded-4xl p-5 flex flex-col justify-between shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${card.color} ${card.theme} animate-in slide-in-from-top-4`}
                    >
                      <p className="font-black italic uppercase text-[8px] leading-none">
                        {card.label}
                      </p>
                      <card.icon size={40} className="mx-auto" />
                      <p className="font-bold text-[7px] leading-tight uppercase opacity-80">
                        {card.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Inbox className="text-black/10" size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
