import { useState } from 'react';

import { PlusCircle, Bomb, Shield, Zap } from 'lucide-react';

export const LandingPage = ({ onCreate, onJoin }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-none text-black mt-4 drop-shadow-[6px_6px_0_#ef4444]">
          EXPLODING
          <span className="text-red-600 ml-4">KITTENS</span>
        </h1>
      </div>
      <div className="w-full max-w-xl bg-white border-4 border-black p-10 rounded-[3rem] shadow-[10px_10px_0_0_#000] relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 border-b-4 border-l-4 border-black rounded-bl-[3rem]
          flex items-center justify-center -mr-4 -mt-4 transform rotate-12"
        >
          <Bomb size={48} className="text-black" />
        </div>
        <div className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">
                Your Identity
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Survivor Name"
                className="w-full bg-zinc-100 border-2 border-black rounded-2xl px-5 py-4 font-bold text-lg focus:ring-4 ring-red-200
                outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">
                4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target?.value?.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-zinc-100 border-2 border-black rounded-2xl px-5 py-4 font-bold text-lg tracking-[0.5em] focus:ring-4 ring-red-200
                outline-none transition-all"
              />
            </div>
          </div>
          <button
            onClick={() => onCreate(name, pin)}
            disabled={!name || pin.length < 4}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic text-2xl py-6 rounded-3xl border-4 border-black
            shadow-[6px_6px_0_0_#000] active:translate-x-0.75 active:translate-y-0.75 active:shadow-none transition-all disabled:opacity-50
            disabled:cursor-not-allowed group flex items-center justify-center gap-4 cursor-pointer"
          >
            <PlusCircle className="group-hover:rotate-90 transition-transform" />
            HOST NEW GAME
          </button>
          <div className="relative flex items-center py-4">
            <div className="grow border-t-4 border-black border-dotted"></div>
            <span className="shrink mx-4 text-sm font-black italic uppercase text-zinc-400">
              OR JOIN EXISTING
            </span>
            <div className="grow border-t-4 border-black border-dotted"></div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GAME CODE"
              className="w-full bg-yellow-50 border-2 border-black rounded-2xl px-5 py-4 font-black tracking-widest text-xl outline-none
            focus:bg-yellow-100 transition-all uppercase"
            />
            <button
              onClick={() => onJoin(code, name, pin)}
              disabled={!name || pin.length < 4 || !code}
              className="w-full sm:w-auto px-10 py-3 bg-black text-white font-black italic text-xl rounded-2xl
            hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6 opacity-80">
        <div className="bg-green-400 border-4 border-black p-4 rounded-2xl rotate-3 shadow-[4px_4px_0_0_#000] flex flex-col items-center gap-2">
          <Shield size={28} />
          <span className="font-black text-[10px] uppercase">Defuse</span>
        </div>
        <div className="bg-red-500 border-4 border-black p-4 rounded-2xl -rotate-2 shadow-[4px_4px_0_0_#000] text-white flex flex-col items-center gap-2">
          <Bomb size={28} />
          <span className="font-black text-[10px] uppercase">Explode</span>
        </div>
        <div className="bg-yellow-400 border-4 border-black p-4 rounded-2xl rotate-1 shadow-[4px_4px_0_0_#000] flex flex-col items-center gap-2">
          <Zap size={28} />
          <span className="font-black text-[10px] uppercase">Attack</span>
        </div>
      </div>
    </div>
  );
};
