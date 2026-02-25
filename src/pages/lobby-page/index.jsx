import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Crown,
  ExternalLink,
  HelpCircle,
  LogOut,
  Play,
  Sword,
  XCircle,
  Zap,
} from 'lucide-react';

import { INSTRUCTIONS_LINK, LOBBY_STATUS } from '../../constants';
import {
  lobbyExistsStatus,
  removePlayerFromLobbyService,
  subscribeToGameStatus,
  subscribeToLobbyPlayers,
} from '../../services';

export const LobbyPage = ({ lobbyId, gameId, playerName, onStart, startGame, leaveGame }) => {
  const [lobbyPlayers, setLobbyPlayers] = useState({});

  useEffect(() => {
    const checkGameStatus = async () => {
      const status = await lobbyExistsStatus(lobbyId);
      if (!status) {
        leaveGame();
        return;
      }
    };

    checkGameStatus();
  }, [lobbyId, leaveGame]);

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
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const handleLeaveLobby = async () => {
    const status = await removePlayerFromLobbyService(lobbyId, playerName);
    if (status) leaveGame();
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
      console.error('Copy Failed', err);
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
    <>
      <div className="px-3 py-8 md:px-6 max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-12 duration-500">
        <div className="flex flex-col md:flex-row gap-8 mt-2">
          <div className="grow space-y-6">
            <div className="bg-white border-4 border-black rounded-[3rem] p-6 md:p-8 shadow-[8px_8px_0_0_#000] relative">
              <div
                className="absolute -top-6 -left-6 bg-yellow-400 border-4 border-black px-4 py-2 rounded-xl font-black italic rotate-[-5deg]
              shadow-[4px_4px_0_0_#000]"
              >
                Felines Lobby
              </div>
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-6 pt-4 gap-4">
                <div>
                  <h1 className="text-2xl md:text-4xl text-center font-black uppercase italic tracking-tighter">
                    Waiting Room
                  </h1>
                  <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em] mt-2 md:mt-1">
                    Status: Collecting Felines
                  </p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm font-black uppercase text-zinc-400 mb-2 md:mb-1 mr-1">
                    Game Code
                  </p>
                  <button
                    className="bg-black text-white px-6 py-3 rounded-2xl font-black text-2xl md:text-3xl uppercase tracking-widest flex items-center
                  gap-3 min-w-[8ch]"
                    type="button"
                    onClick={copyCode}
                  >
                    {copied ? (
                      <>
                        Copied
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {orderedPlayers.map(({ name, host }) => (
                  <div
                    key={name}
                    className={`relative p-3 rounded-4xl border-4 border-black transition-all
                  ${host ? 'bg-red-50 text-black border-red-600' : 'bg-zinc-50'}`}
                  >
                    <div className="flex flex-col items-center text-center gap-1">
                      <div
                        className={`w-14 h-14 rounded-2xl border-4 border-black flex items-center justify-center text-2xl font-black shadow-[4px_4px_0_0_#000]
                      ${host ? 'bg-yellow-400' : 'bg-white'}`}
                      >
                        {name?.[0].toUpperCase()}
                      </div>
                      <span className="flex items-center justify-center gap-1 font-black italic uppercase text-sm w-full mt-1 min-w-0">
                        <span className="truncate">{name}</span>
                        {host && <Crown size={14} className="text-red-600 fill-red-600 shrink-0" />}
                      </span>
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
                <h3 className="text-yellow-400 font-black italic text-xl md:text-2xl uppercase">
                  Ready to Explode?
                </h3>
                <p className="text-zinc-400 text-xs font-bold leading-relaxed">
                  Matches require at least 2 players to start. As the host, you control the fuse.
                  While you wait check out
                  <span
                    className="font-bold leading-tight underline hover:text-red-400 ml-1"
                    onClick={() => setShowInstructionsModal(true)}
                  >
                    How to Play?
                  </span>
                </p>
              </div>
              <div className="space-y-4">
                {isHost ? (
                  <button
                    onClick={onStart}
                    disabled={Object.keys(lobbyPlayers).length < 2}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed
                  text-white font-black italic uppercase py-5 rounded-2xl border-2 border-white/20 flex items-center justify-center gap-3 transition-all"
                  >
                    <Play size={24} fill="currentColor" /> Start Match
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
                  className="w-full border-2 border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-black italic uppercase py-4 rounded-2xl transition-all
                flex items-center justify-center gap-2"
                >
                  <LogOut size={18} /> Leave Lobby
                </button>
              </div>
            </div>
            <div className="bg-yellow-400 border-4 border-black py-4 px-6 rounded-4xl shadow-[8px_8px_0_0_#000]">
              <h4 className="font-black italic uppercase text-lg mb-2 flex items-center justify-start gap-1">
                <Sword size={20} /> Pro Tip
              </h4>
              <p className="text-xs font-bold leading-tight mb-3">
                Hold onto your Defuse cards until you're at the bottom of the deck. That's when the
                kittens get cranky.
              </p>
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="bg-black text-white px-4 py-3 rounded-2xl font-black italic uppercase text-sm shadow-[4px_4px_0_0_#ef4444] transition-all
              hover:scale-105 flex items-center gap-1 mx-auto"
              >
                <HelpCircle size={18} /> Review Instructions
              </button>
            </div>
          </div>
        </div>
      </div>
      {showInstructionsModal && (
        <div className="fixed inset-0 z-800 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="max-w-3xl w-full bg-white border-10 border-black px-8 md:px-10 py-12 md:py-10 rounded-[4rem] shadow-[10px_10px_0_0_#000] animate-in zoom-in
            overflow-y-auto max-h-[90svh] md:max-h-[85vh] modal-scrollbar relative"
          >
            <button
              onClick={() => setShowInstructionsModal(false)}
              className="absolute top-4 md:top-8 right-4 md:right-8 group"
            >
              <XCircle size={36} className="transition-colors group-hover:text-red-500" />
            </button>
            <div className="space-y-8">
              <div className="text-center space-y-6 md:space-y-4">
                <div
                  className="bg-yellow-400 text-black px-4 md:px-6 py-2 rounded-full border-4 border-black inline-block font-black italic uppercase text-xl
                  shadow-[4px_4px_0_0_#000] transform -rotate-1"
                >
                  Operational Manual
                </div>
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                  How to Play
                </h2>
              </div>
              <div className="space-y-8 text-left">
                <div className="grid gap-6">
                  <div className="flex gap-6 items-start">
                    <div
                      className="bg-red-500 text-white w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border-4 border-black font-black text-xl
                      shadow-[2px_2px_0_0_#000]"
                    >
                      1
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black uppercase text-xl italic">The Kitten Count</h3>
                      <p className="font-bold text-zinc-500 uppercase text-sm leading-snug">
                        The deck is always rigged. There is exactly 1 fewer Exploding Kitten than
                        the number of active survivors ($Players - 1).
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6 items-start">
                    <div
                      className="bg-green-400 text-white w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border-4 border-black font-black
                      text-xl shadow-[2px_2px_0_0_#000]"
                    >
                      2
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black uppercase text-xl italic">Defuse Inventory</h3>
                      <p className="font-bold text-zinc-500 uppercase text-sm leading-snug">
                        Strategic safety is limited. Defuse cards are capped at either $Players + 1
                        or a maximum of 10 per session.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6 items-start">
                    <div
                      className="bg-indigo-600 text-white w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border-4 border-black font-black
                      text-xl shadow-[2px_2px_0_0_#000]"
                    >
                      3
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black uppercase text-xl italic">
                        Instant Digital Actions
                      </h3>
                      <p className="font-bold text-zinc-500 uppercase text-sm leading-snug">
                        Unlike the offline version,{' '}
                        <span className="text-red-700 underline">Nope</span> cannot be played on
                        instant actions cards like{' '}
                        <span className="text-amber-800 underline"> Draw from the Bottom</span>,
                        <span className="text-yellow-500 underline"> See the Future</span>, and
                        <span className="text-indigo-800 underline"> Alter the Future</span>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-100 border-4 border-black p-6 lg:p-8 rounded-4xl space-y-4">
                  <div className="flex items-center gap-3 font-black uppercase text-xl italic">
                    <BookOpen size={28} /> Full Instructions
                  </div>
                  <p className="font-bold text-zinc-500 uppercase text-xs leading-relaxed">
                    For all other interactions, card descriptions, and core gameplay mechanics,
                    please refer to the official digital handbook.{' '}
                    <span className="text-red-600">
                      Except as mentioned above, all other rules and instructions remain unchanged.
                    </span>
                  </p>
                  <a
                    href={INSTRUCTIONS_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-red-600 text-white px-6 py-3 md:py-4 border-4 border-black rounded-2xl font-black italic
                    uppercase hover:bg-red-700 transition-all shadow-[6px_6px_0_0_#000]"
                  >
                    <ExternalLink size={20} /> View PDF Manual
                  </a>
                </div>
              </div>

              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-full border-4 border-black py-3 md:py-5 rounded-2xl font-black italic uppercase text-2xl hover:bg-zinc-200 transition-colors
                shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Dismiss Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
