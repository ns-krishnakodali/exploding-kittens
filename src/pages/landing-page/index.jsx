import { useState } from 'react';
import { PlusCircle, Bomb, Shield, Zap } from 'lucide-react';

export const LandingPage = ({ onCreate, onJoin }) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="flex flex-col items-center gap-6 px-1 md:px-0 animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-7xl font-black uppercase italic tracking-wide md:tracking-tighter leading-none text-black mt-4">
          <span className="[text-shadow:3px_3px_0_#ef4444] md:[text-shadow:5px_5px_0_#ef4444]">
            EXPLODING
          </span>
          <span className="text-red-600 ml-2 md:ml-4 [text-shadow:3px_3px_0_#000000] md:[text-shadow:5px_5px_0_#000000]">
            KITTENS
          </span>
        </h1>
      </div>
      <div className="w-full max-w-xl bg-white border-4 border-black px-8 py-6 md:p-10 rounded-[3rem] shadow-[10px_10px_0_0_#000] relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-28 md:w-32 h-28 md:h-32 bg-yellow-400 border-b-4 border-l-4 border-black rounded-bl-[3rem]
          flex items-center justify-center -mr-4 md:-mr-6 -mt-5 transform -rotate-6"
        >
          <Bomb size={48} className="text-black" />
        </div>
        <div className="space-y-6 md:space-y-8 relative z-10 px-4 md:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">
                Your Identity
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target?.value)}
                placeholder="Survivor Name"
                className="w-full bg-zinc-100 border-2 border-black rounded-2xl px-5 py-4 font-bold text-md md:text-lg focus:ring-4 ring-red-200
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
                className="w-full bg-zinc-100 border-2 border-black rounded-2xl px-5 py-4 font-bold text-md md:text-lg tracking-[0.5em] focus:ring-4 ring-red-200
                outline-none transition-all"
              />
            </div>
          </div>
          <button
            onClick={() => onCreate(name?.toUpperCase(), pin)}
            disabled={!name || pin.length < 4}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic text-lg md:text-xl py-4 px-2 md:py-6 rounded-3xl border-4 border-black
            shadow-[6px_6px_0_0_#000] active:translate-x-0.75 active:translate-y-0.75 active:shadow-none transition-all disabled:opacity-50
            disabled:cursor-not-allowed group flex items-center justify-center gap-2 md:gap-4 cursor-pointer"
          >
            <PlusCircle className="group-hover:rotate-90 transition-transform" />
            HOST NEW GAME
          </button>
          <div className="relative flex items-center py-1 md:py-4">
            <div className="grow border-t-4 border-black border-dotted"></div>
            <span className="shrink mx-4 text-sm font-black italic uppercase text-zinc-400">
              OR JOIN EXISTING
            </span>
            <div className="grow border-t-4 border-black border-dotted"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GAME CODE"
              className="w-full bg-yellow-50 border-2 border-black rounded-2xl px-5 py-4 font-black tracking-widest text-lg md:text-xl outline-none
            focus:bg-yellow-100 transition-all uppercase"
            />
            <button
              onClick={() => onJoin(code, name?.toUpperCase(), pin)}
              disabled={!name || pin.length < 4 || !code}
              className="w-full sm:w-auto px-10 py-3 bg-black text-white font-black italic text-lg md:text-xl rounded-2xl hover:bg-zinc-800 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
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
