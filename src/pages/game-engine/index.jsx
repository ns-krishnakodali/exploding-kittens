import './game-engine.css';

import { useState, useEffect } from 'react';

import {
  Bomb,
  Zap,
  Skull,
  AlertTriangle,
  History,
  ArrowDownCircle,
  PawPrint,
  Inbox,
} from 'lucide-react';
import {
  getAllCardsImages,
  getPlayerCards,
  getPlayerDetails,
  subscribeToGameLobby,
  updateGamePostDraw,
} from '../../services';
import { CARD_TYPES } from '../../constants';
import { Loading } from '../../components';

export const GameEngine = ({ lobbyId, gameId, playerName }) => {
  const [allCardImages, setAllCardImages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [attackStack, setAttackStack] = useState(0);
  const [cardsDeck, setCardsDeck] = useState([]);
  const [usedCardsDeck, setUsedCardsDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [playerDetails, setPlayersDetails] = useState([]);
  const [deckSize, setDeckSize] = useState(null);
  const [showExplodeModal, setShowExplodeModal] = useState(false);

  useEffect(() => {
    const fetchAllCardImages = async () => {
      const allCardImages = await getAllCardsImages();
      setAllCardImages(allCardImages);
      setIsLoading(false);
    };

    fetchAllCardImages();
  }, []);

  useEffect(() => {
    if (!lobbyId) return;

    const unsubscribe = subscribeToGameLobby(lobbyId, (lobbyDetails) => {
      setIsUserTurn((lobbyDetails?.currentPlayer || '') === playerName);
      if (lobbyDetails?.statusMessage) setStatusMessage(lobbyDetails.statusMessage);
      setAttackStack(lobbyDetails?.attackStack || 0);
      setDeckSize(lobbyDetails?.cardsDeck?.length || null);
      setCardsDeck(lobbyDetails?.cardsDeck);
      setUsedCardsDeck(lobbyDetails?.usedCardsDeck?.slice(0, 3) || []);

      const playerCardsInfo = getPlayerCards(lobbyDetails, playerName, allCardImages);
      setPlayerCards(playerCardsInfo);

      const playerDetailsInfo = getPlayerDetails(lobbyDetails);
      setPlayersDetails(playerDetailsInfo);
    });

    return unsubscribe;
  }, [lobbyId, playerName, allCardImages]);

  useEffect(() => {
    if (!statusMessage) return;

    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [statusMessage]);

  const handleDrawCard = () => {
    if (!isUserTurn) return;

    const topCardName = cardsDeck[0];
    if (topCardName?.startsWith(CARD_TYPES.EXPLODING_KITTEN)) {
      setShowExplodeModal(true);
      return;
    }
    const currPlayerIdx = playerDetails.findIndex((player) => player?.name === playerName);
    let nextPlayerIdx = currPlayerIdx + 1;
    for (let idx = 1; idx < playerDetails.length; idx++) {
      const playerIdx = (currPlayerIdx + idx) % playerDetails.length;

      if (playerDetails[playerIdx]?.inGame) {
        nextPlayerIdx = playerIdx;
        break;
      }
    }

    updateGamePostDraw(
      lobbyId,
      cardsDeck.slice(1),
      [...(playerCards?.map((card) => card?.name) || []), topCardName],
      playerName,
      playerDetails[nextPlayerIdx]?.name
    );

    const cardType =
      Object.values(CARD_TYPES).find((cardType) => topCardName?.startsWith(cardType)) || 'CAT';
    setStatusMessage({ type: 'info', message: `You picked ${cardType} card` });
  };

  const handleDefusePlayer = async () => {};

  const handleExplodePlayer = async () => {};

  return (
    <>
      <header className="w-full border-b-4 border-black p-4 md:px-6 md:pt-4 md:pb-6 flex justify-between items-center shadow-[0_4px_0_0_#000]">
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
        {deckSize && (
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 border-4 border-black px-4 py-1.5 rounded-xl shadow-[4px_4px_0_0_#000] hidden sm:block">
              <span className="font-black italic uppercase text-xs tracking-tighter text-black">
                Deck Size: {deckSize}
              </span>
            </div>
          </div>
        )}
      </header>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="flex flex-col grow overflow-x-hidden">
            <section className="p-6 md:p-8 flex flex-col items-center justify-center gap-10">
              <div className="flex flex-col md:flex-row gap-10 md:gap-20 items-center relative">
                <div className="flex flex-col items-center gap-3">
                  <p className="font-black italic uppercase text-xs text-black/50 tracking-widest">
                    Draw Pile
                  </p>
                  <div className="relative group">
                    <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black rounded-4xl" />
                    <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-zinc-200 border-4 border-black rounded-4xl" />
                    <button
                      onClick={handleDrawCard}
                      disabled={!isUserTurn}
                      className={`w-60 h-72 border-4 border-black rounded-4xl transition-all relative flex flex-col items-center justify-center gap-4 overflow-hidden ${
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
                          The Deck
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
                  <div className="relative w-60 h-72">
                    <div className="absolute inset-0 border-4 border-black border-dashed rounded-4xl opacity-20 flex items-center justify-center">
                      <ArrowDownCircle size={32} className="text-black/30" />
                    </div>
                    {usedCardsDeck?.length > 0 ? (
                      usedCardsDeck.map((card, idx) => (
                        <div
                          key={idx}
                          style={{
                            transform: `rotate(${idx * -6}deg) translate(${idx * -10}px, ${idx * -4}px)`,
                            zIndex: 10 - idx,
                          }}
                          className={`absolute inset-0 border-4 border-black rounded-4xl p-5 flex flex-col justify-between shadow-[4px_4px_0_0_rgba(0,0,0,1)]
                        ${card.color} ${card.theme} animate-in slide-in-from-top-4`}
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
            <section className="border-t-8 border-black p-6">
              <div className="max-w-8xl mx-auto px-4 mb-4 flex items-center gap-3 border-b-2 border-zinc-800 pb-4">
                <History className="text-yellow-400" size={18} />
                <h3 className="text-zinc-900 font-black italic uppercase text-lg tracking-tight">
                  Feline Surveillance List
                </h3>
              </div>
              <div className="w-full flex justify-center py-4 px-6 relative z-10">
                <div
                  className={`min-h-16 max-w-6xl w-full flex items-center justify-center gap-4 px-8 py-3 rounded-2xl border-4 border-black transition-all
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
              <div className="max-w-7xl mx-auto my-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-12 gap-y-6 px-4">
                {playerDetails.map((player, idx) => (
                  <div
                    key={idx}
                    onClick={() => {}}
                    className={`p-3 border-4 border-black rounded-2xl transition-all flex items-center gap-3 ${
                      !player.inGame
                        ? 'bg-zinc-800 border-zinc-700 grayscale opacity-40 text-zinc-600 shadow-none'
                        : isUserTurn && player.name === playerName
                          ? 'bg-yellow-300 shadow-[4px_4px_0_0_#ef4444] scale-105 z-10 text-black'
                          : 'bg-white shadow-[4px_4px_0_0_#000] hover:bg-zinc-200 cursor-pointer'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-lg font-black
                    ${!player.inGame ? 'bg-zinc-900' : 'bg-black text-white'}`}
                    >
                      {!player.inGame ? <Skull size={20} /> : player.name[0]}
                    </div>
                    <div className="grow min-w-0">
                      <h3 className="font-black italic uppercase text-xs truncate tracking-tight">
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="bg-black text-white inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                          {player.cardsCount} Cards
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="border-t-8 border-black  md:p-10 relative shadow-[inset_0_4px_0_0_rgba(0,0,0,0.05)]">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 max-w-8xl mx-auto gap-4">
                <div className="flex items-center gap-5">
                  <div
                    className={`w-14 h-14 border-4 border-black rounded-xl flex items-center justify-center text-2xl font-black shadow-[4px_4px_0_0_#000]
                  ${isUserTurn ? 'bg-yellow-400' : 'bg-zinc-100'}`}
                  >
                    Y
                  </div>
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                      Your Arsenal
                    </h2>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                      Phase: {isUserTurn ? 'Your Turn' : 'Surveillance Only'}
                    </p>
                  </div>
                </div>
                {isUserTurn && attackStack > 0 && (
                  <div className="bg-red-600 text-white px-4 py-2 rounded-xl border-4 border-black font-black italic shadow-[4px_4px_0_0_#000] animate-pulse flex items-center gap-2 text-sm">
                    <AlertTriangle size={16} /> STACKED_TURNS: {attackStack + 1}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
                {playerCards.map(({ name: cardName, url }, idx) => (
                  <button
                    key={idx}
                    onClick={() => {}}
                    disabled={!isUserTurn || cardName.includes(CARD_TYPES.DEFUSE)}
                    className={`w-64 h-80 aspect-3/4 border-4 border-black rounded-3xl p-3 flex flex-col justify-between text-left transition-all group
                  ${isUserTurn && 'hover:-translate-y-4 hover:shadow-[10px_10px_0_0_#000] shadow-[4px_4px_0_0_#000] active:scale-95'}`}
                  >
                    <img
                      src={url}
                      alt={cardName}
                      className="w-60 h-72"
                      loading="eager"
                      fetchPriority="high"
                    />
                  </button>
                ))}
              </div>
            </section>
          </div>
          {showExplodeModal && (
            <div className="fixed inset-0 z-600 bg-black/90 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
              <div
                className="flex flex-col items-center max-w-md w-full bg-white border-10 border-black p-10 rounded-[3rem] text-center space-y-6 shadow-[20px_20px_0_0_#ef4444]
            animate-in zoom-in"
              >
                <h1 className="text-5xl font-black italic uppercase text-red-600 tracking-tighter drop-shadow-[4px_4px_0_#000]">
                  BOOM!
                </h1>
                {cardsDeck?.[0] && (
                  <img
                    src={allCardImages?.[cardsDeck[0]]?.url}
                    alt="Exploding Card"
                    className="w-52 h-64"
                  />
                )}
                <div className="space-y-4 pt-2">
                  {playerCards.some((playerCard) =>
                    playerCard?.name?.startsWith(CARD_TYPES.DEFUSE)
                  ) ? (
                    <button
                      onClick={handleDefusePlayer}
                      className="w-fit bg-green-500 text-white font-black italic text-3xl px-8 py-6 rounded-[2.5rem] border-8 border-black shadow-[10px_10px_0_0_#000] hover:bg-green-600 transition-all"
                    >
                      DEFUSE
                    </button>
                  ) : (
                    <button
                      onClick={handleExplodePlayer}
                      className="w-fit bg-red-600 text-white font-black italic text-3xl px-8 py-6 rounded-[2.5rem] border-8 border-black shadow-[10px_10px_0_0_#000]"
                    >
                      TERMINATE
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
