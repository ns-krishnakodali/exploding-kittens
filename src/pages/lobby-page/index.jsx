import { useEffect, useState } from 'react';
import { Check, Copy, Crown, LogOut, Play, Sword, Zap } from 'lucide-react';

import {
  removePlayerFromLobby,
  subscribeToGameStatus,
  subscribeToLobbyPlayers,
} from '../../services';
import { LOBBY_STATUS } from '../../constants';

export const LobbyPage = ({ lobbyId, gameId, playerName, onStart, onLeave, startGame }) => {
  const [lobbyPlayers, setLobbyPlayers] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToLobbyPlayers(lobbyId, (players) => {
      setLobbyPlayers(players);
    });

    return unsubscribe;
  }, [lobbyId]);

  useEffect(() => {
    const unsubscribe = subscribeToGameStatus(lobbyId, (status) => {
      if (status === LOBBY_STATUS.IN_GAME) startGame();
    });

    return unsubscribe;
  }, [lobbyId, startGame]);

  const [copied, setCopied] = useState(false);

  const handleLeaveLobby = async () => {
    const status = await removePlayerFromLobby(lobbyId, playerName);
    if (status) onLeave();
  };

  const copyCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(gameId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = gameId;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }
    } catch (err) {
      console.log('Copy Failed', err);
    }
  };

  const isHost =
    !!playerName && !!lobbyPlayers[playerName] && lobbyPlayers[playerName].host === true;

  const orderedPlayers = Object.entries(lobbyPlayers)
    .map(([name, data]) => ({ name, ...data }))
    .sort((p1, p2) => {
      if (p1.host && !p2.host) return -1;
      if (!p1.host && p2.host) return 1;
      return p1.joinedAt - p2.joinedAt;
    });

  return (
    <div className="px-2 py-8 md:px-0 max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom-12 duration-500">
      <div className="flex flex-col md:flex-row gap-8 mt-2">
        <div className="grow space-y-6">
          <div className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[8px_8px_0_0_#000] relative">
            <div
              className="absolute -top-6 -left-6 bg-yellow-400 border-4 border-black px-4 py-2 rounded-xl font-black italic rotate-[-5deg]
              shadow-[4px_4px_0_0_#000]"
            >
              FELINES LOBBY
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 pt-4 gap-4">
              <div>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                  WAITING ROOM
                </h1>
                <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em] mt-1">
                  Status: Collecting Felines
                </p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm font-black uppercase text-zinc-400 mb-1 mr-1">Game Code</p>
                <button
                  className="bg-black text-white px-6 py-3 rounded-2xl font-black text-3xl tracking-widest flex items-center gap-3 min-w-[8ch]"
                  type="button"
                  onClick={copyCode}
                >
                  {copied ? (
                    <>
                      COPIED
                      <Check size={20} className="text-green-400 transition-colors" />
                    </>
                  ) : (
                    <>
                      {gameId}
                      <Copy
                        size={20}
                        className="text-zinc-400 cursor-pointer hover:text-white transition-colors"
                      />
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {orderedPlayers.map(({ name, host }) => (
                <div
                  key={name}
                  className={`relative p-3 rounded-4xl border-4 border-black transition-all
                  ${host ? 'bg-red-50 text-black border-red-600' : 'bg-zinc-50'}`}
                >
                  <div className="flex flex-col items-center text-center gap-1">
                    <div
                      className={`w-16 h-16 rounded-2xl border-4 border-black flex items-center justify-center text-2xl font-black shadow-[4px_4px_0_0_#000]
                      ${host ? 'bg-yellow-400' : 'bg-white'}`}
                    >
                      {name?.[0].toUpperCase()}
                    </div>

                    <span className="font-black italic uppercase text-sm truncate w-full mt-1">
                      {name}
                    </span>

                    {host && <Crown size={14} className="text-red-600 fill-red-600" />}
                  </div>
                </div>
              ))}
              {Array.from({ length: 10 - Object.keys(lobbyPlayers).length }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-4xl border-4 border-black border-dotted opacity-20 flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-16 h-16 rounded-2xl border-4 border-black border-dotted"></div>
                  <span className="font-black text-[10px] uppercase">Empty</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-black text-white p-8 rounded-[3rem] shadow-[8px_8px_0_0_#ef4444] flex flex-col gap-6">
            <div className="space-y-2">
              <h3 className="text-yellow-400 font-black italic text-2xl uppercase">
                Ready to Explode?
              </h3>
              <p className="text-zinc-400 text-xs font-bold leading-relaxed">
                Matches require at least 2 players to start. As the host, you control the fuse.
              </p>
            </div>

            <div className="space-y-4">
              {isHost ? (
                <button
                  onClick={onStart}
                  disabled={Object.keys(lobbyPlayers).length < 2}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-black italic py-5 rounded-2xl border-2 border-white/20 flex items-center justify-center gap-3 transition-all"
                >
                  <Play size={24} fill="currentColor" /> START MATCH
                </button>
              ) : (
                <div className="w-full bg-zinc-900 border-2 border-zinc-800 p-6 rounded-2xl text-center">
                  <div className="animate-pulse flex flex-col items-center gap-2">
                    <Zap size={32} className="text-yellow-400" />
                    <p className="font-black italic uppercase text-sm">Waiting for Host...</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleLeaveLobby}
                className="w-full border-2 border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-black italic py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> LEAVE LOBBY
              </button>
            </div>
          </div>
          <div className="bg-yellow-400 border-4 border-black p-6 rounded-4xl shadow-[8px_8px_0_0_#000]">
            <h4 className="font-black italic uppercase text-lg mb-2 flex items-center gap-2">
              <Sword size={20} /> Pro Tip
            </h4>
            <p className="text-xs font-bold leading-tight">
              Hold onto your Defuse cards until you're at the bottom of the deck. That's when the
              kittens get cranky.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
