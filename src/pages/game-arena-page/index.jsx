import './game-arena-page.css';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRightLeft,
  Bomb,
  History,
  Inbox,
  PawPrint,
  Skull,
  Zap,
} from 'lucide-react';

import { CARD_TYPES, ERROR_MESSAGE, EXPLOSION_PREFIX } from '../../constants';
import { Loading, Toast } from '../../components';
import {
  getAllCardsImages,
  getPlayerCards,
  getPlayerDetails,
  shuffleDeck,
  subscribeToGameLobby,
  updateCardsDeck,
  updatePostDrawState,
  updatePostPlayState,
} from '../../services';
import { getRandomInt } from '../../utils';

export const GameArenaPage = ({ lobbyId, gameId, playerName }) => {
  const [allCardImages, setAllCardImages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [currentPlayerName, setCurrentPlayerName] = useState(null);
  const [attackStack, setAttackStack] = useState(0);
  const [usedCardsDetails, setUsedCardsDetails] = useState([]);
  const [cardsDeck, setCardsDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [playerDetails, setPlayersDetails] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showExplodeModal, setShowExplodeModal] = useState(false);
  const [futureCard, setFutureCard] = useState(null);
  const [toast, setToast] = useState(null);

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
      setCurrentPlayerName(lobbyDetails?.currentPlayer);
      setAttackStack(lobbyDetails?.attackStack || 0);
      setCardsDeck(lobbyDetails?.cardsDeck);
      setUsedCardsDetails(lobbyDetails?.usedCardsDetails?.slice(0, 3) || []);

      const playerCardsInfo = getPlayerCards(lobbyDetails, playerName, allCardImages);
      setPlayerCards(playerCardsInfo);

      const playerDetailsInfo = getPlayerDetails(lobbyDetails);
      setPlayersDetails(playerDetailsInfo);

      if (lobbyDetails?.statusMessage) {
        const lobbyStatusMessage = lobbyDetails.statusMessage;
        setStatusMessage({
          type: lobbyStatusMessage.includes(EXPLOSION_PREFIX) ? 'error' : 'info',
          message: lobbyStatusMessage,
        });
      }
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

  const getNextPlayerIdx = (updatedPlayerDetails = []) => {
    const playerDetailsInfo =
      (updatedPlayerDetails?.length ? updatedPlayerDetails : playerDetails) || [];

    const currPlayerIdx = playerDetailsInfo.findIndex((player) => player?.name === playerName);
    let nextPlayerIdx = currPlayerIdx + 1;

    for (let idx = 1; idx < playerDetails.length; idx++) {
      const playerIdx = (currPlayerIdx + idx) % playerDetails.length;

      if (playerDetails[playerIdx]?.inGame) {
        nextPlayerIdx = playerIdx;
        break;
      }
    }

    return nextPlayerIdx;
  };

  // Handles drawing a card, optionally from the bottom of the deck.
  const handleDrawCard = async (updatedPlayerCards = [], drawFromBottom = false) => {
    if (!isUserTurn || !cardsDeck?.length) return;

    const cardIndex = drawFromBottom ? cardsDeck.length - 1 : 0;
    const drawnCardName = cardsDeck[cardIndex];
    if (drawnCardName?.startsWith(CARD_TYPES.EXPLODING_KITTEN)) {
      setShowExplodeModal(true);
      return;
    }

    const playerCardsInfo = (updatedPlayerCards?.length ? updatedPlayerCards : playerCards) || [];
    const updatedDeck = drawFromBottom ? cardsDeck.slice(0, -1) : cardsDeck.slice(1);

    const nextPlayerIdx = getNextPlayerIdx();
    const status = await updatePostDrawState(
      lobbyId,
      playerName,
      playerDetails[nextPlayerIdx]?.name,
      [...(playerCardsInfo?.map((card) => card?.name) || []), drawnCardName],
      true,
      updatedDeck
    );

    if (status) {
      const cardType = Object.values(CARD_TYPES).find((cardType) =>
        drawnCardName?.startsWith(cardType)
      );
      setStatusMessage({
        type: 'info',
        message: `You picked ${cardType?.replace('-', ' ') || 'CAT'} card`,
      });
    } else {
      setToast({ message: ERROR_MESSAGE, type: 'error' });
    }
  };

  // Handles playing a card and triggers the corresponding card's game logic.
  const handlePlayCard = async (cardName, cardIdx) => {
    const updatedPlayerCards =
      cardIdx >= 0 && cardIdx < playerCards.length
        ? [...playerCards.slice(0, cardIdx), ...playerCards.slice(cardIdx + 1)]
        : [];

    switch (Object.values(CARD_TYPES).find((cardType) => cardName?.startsWith(cardType))) {
      case CARD_TYPES.ALTER_THE_FUTURE: {
        const status = await updatePostPlayState(
          lobbyId,
          playerName,
          null,
          [...(updatedPlayerCards?.map((card) => card?.name) || [])],
          [{ playerName, cardName }, ...usedCardsDetails],
          `${playerName} Altered the Future!`
        );

        if (status) {
          setFutureCard(CARD_TYPES.ALTER_THE_FUTURE);
        } else {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: ERROR_MESSAGE, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.ATTACK: {
        const nextPlayerIdx = getNextPlayerIdx();
        const status = await updatePostPlayState(
          lobbyId,
          playerName,
          playerDetails[nextPlayerIdx]?.name,
          [...(updatedPlayerCards?.map((card) => card?.name) || [])],
          [{ playerName, cardName }, ...usedCardsDetails],
          `${playerName} slapped down an Attack, Good luck!`,
          attackStack + 2
        );

        if (!status) {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: ERROR_MESSAGE, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.CAT_CARD: {
        break;
      }
      case CARD_TYPES.DRAW_FROM_THE_BOTTOM: {
        const status = await updatePostPlayState(
          lobbyId,
          playerName,
          null,
          [...(updatedPlayerCards?.map((card) => card?.name) || [])],
          [{ playerName, cardName }, ...usedCardsDetails],
          `${playerName} Drew From The Bottom!`
        );

        if (!status) {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: ERROR_MESSAGE, type: 'error' });
        }

        await handleDrawCard(updatedPlayerCards, true);
        break;
      }
      case CARD_TYPES.FAVOR: {
        break;
      }
      case CARD_TYPES.NOPE: {
        break;
      }
      case CARD_TYPES.SKIP: {
        const nextPlayerIdx = getNextPlayerIdx();
        const status = await updatePostPlayState(
          lobbyId,
          playerName,
          playerDetails[nextPlayerIdx]?.name,
          [...(updatedPlayerCards?.map((card) => card?.name) || [])],
          [{ playerName, cardName }, ...usedCardsDetails],
          `${playerName} played Skip and dodged turn.`
        );

        if (!status) {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: ERROR_MESSAGE, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.SEE_THE_FUTURE: {
        const status = await updatePostPlayState(
          lobbyId,
          playerName,
          null,
          [...(updatedPlayerCards?.map((card) => card?.name) || [])],
          [{ playerName, cardName }, ...usedCardsDetails],
          `${playerName} Saw the Future!`
        );

        if (status) {
          setFutureCard(CARD_TYPES.SEE_THE_FUTURE);
        } else {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: ERROR_MESSAGE, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.SHUFFLE: {
        const shuffledCardsDeck = shuffleDeck(cardsDeck);

        const status = await updatePostPlayState(
          lobbyId,
          playerName,
          null,
          [...(updatedPlayerCards?.map((card) => card?.name) || [])],
          [{ playerName, cardName }, ...usedCardsDetails],
          `${playerName} Shuffled the deck.`,
          { original: shuffledCardsDeck, backup: cardsDeck }
        );

        if (!status) {
          console.error('An issue occurred when shuffling cards');
          setToast({ message: ERROR_MESSAGE, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.TARGETTED_ATTACK: {
        break;
      }
      default:
        console.error(`Invalid card type: ${cardName}`);
        setToast({ message: ERROR_MESSAGE, type: 'error' });
        break;
    }
  };

  // Handles the Alter the Future action by validating and reordering the top cards.
  const handleAlterFuture = async (event) => {
    event?.preventDefault();

    const formData = new FormData(event.target);
    const orderValues = [
      formData.get('order1'),
      formData.get('order2'),
      formData.get('order3'),
    ].map(Number);

    const isValid =
      new Set(orderValues).size === 3 && orderValues.every((v) => [1, 2, 3].includes(v));

    if (!isValid) {
      setToast({ message: 'Invalid ordering of cards', type: 'info' });
      return;
    }

    const updatedCardsDeck = [
      ...orderValues.map((idx) => cardsDeck[idx - 1]),
      ...cardsDeck.slice(3),
    ];

    const status = await updateCardsDeck(lobbyId, updatedCardsDeck);
    if (!status) {
      console.error('An issue occurred when altering cards');
      setToast({ message: ERROR_MESSAGE, type: 'error' });
      return;
    }
    setFutureCard(null);
  };

  // Handles the defuse action when a player draws an Exploding Kitten.
  const handleDefuseCardPlay = async (event) => {
    event?.preventDefault();

    const defuseIdx = playerCards.findIndex((card) => card?.name?.startsWith(CARD_TYPES.DEFUSE));
    if (defuseIdx === -1) {
      console.log('Cannot find defuse card');
      setToast({ message: ERROR_MESSAGE, type: 'error' });
      setShowExplodeModal(false);
      return;
    }

    const formData = new FormData(event.target);
    const positionInput = formData.get('position');

    const newCardsDeck = [...cardsDeck];
    const explosionCard = newCardsDeck.shift();

    const position = Number(positionInput);
    if (
      positionInput &&
      (!Number.isInteger(position) || position < 1 || position > newCardsDeck.length + 1)
    ) {
      setToast({ message: 'Invalid position', type: 'info' });
      return;
    }

    const insertIndex = positionInput ? position - 1 : getRandomInt(newCardsDeck.length + 1);
    newCardsDeck.splice(insertIndex, 0, explosionCard);

    const updatedPlayerCards = [
      ...playerCards.slice(0, defuseIdx),
      ...playerCards.slice(defuseIdx + 1),
    ];

    const cardName = playerCards[defuseIdx]?.name;

    const nextPlayerIdx = getNextPlayerIdx();
    const status = await updatePostPlayState(
      lobbyId,
      playerName,
      playerDetails[nextPlayerIdx]?.name,
      [...(updatedPlayerCards?.map((card) => card?.name) || [])],
      [{ playerName, cardName }, ...usedCardsDetails],
      `${playerName} Defused the Explosion`,
      null,
      { original: newCardsDeck, backup: cardsDeck }
    );

    if (!status) {
      console.error(`An issue occurred when ${cardName}`);
      setToast({ message: ERROR_MESSAGE, type: 'error' });
    }
    setShowExplodeModal(false);
  };

  // Handles player elimination from an explosion and processes winning logic.
  const handleExplodeCardPlay = async () => {
    const updatedPlayerDetails = playerDetails?.map((player) =>
      player.name === playerName ? { ...player, inGame: false } : player
    );
    setPlayersDetails(updatedPlayerDetails);

    const nextPlayerIdx = getNextPlayerIdx(updatedPlayerDetails);
    const status = await updatePostDrawState(
      lobbyId,
      playerName,
      updatedPlayerDetails[nextPlayerIdx]?.name,
      [...(playerCards?.map((card) => card?.name) || [])],
      false,
      cardsDeck.slice(1),
      `BOOM! ${playerName} just exploded, LOL!`
    );

    if (!status) setToast({ message: ERROR_MESSAGE, type: 'error' });
    setShowExplodeModal(false);
  };

  const onInputChange = (event) => {
    const inputs = Array.from(event.target.form.querySelectorAll('.order-input'));
    const index = inputs.indexOf(event.target);

    if (event.target.value.length === 1) inputs[index + 1]?.focus();
    if (event.target.value.length === 0) inputs[index - 1]?.focus();
  };

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
        {cardsDeck?.length && (
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 border-4 border-black px-4 py-1.5 rounded-xl shadow-[4px_4px_0_0_#000] hidden sm:block">
              <span className="font-black italic uppercase text-xs tracking-tighter text-black">
                Deck Size: {cardsDeck.length}
              </span>
            </div>
          </div>
        )}
      </header>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}
          <div className="flex flex-col grow overflow-x-hidden">
            <section className="p-6 md:p-8 flex flex-col items-center justify-center gap-10">
              <div className="flex flex-col md:flex-row gap-10 md:gap-40 pt-2 items-center relative">
                <div className="flex flex-col items-center gap-3">
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
                  <p className="font-black italic uppercase text-xs text-black/50 tracking-widest mt-1">
                    Draw Pile
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-60 h-72">
                    <div className="absolute inset-0 border-4 border-black border-dashed rounded-4xl opacity-20 flex items-center justify-center">
                      <ArrowDownCircle size={32} className="text-black/30" />
                    </div>
                    {usedCardsDetails?.length > 0 ? (
                      usedCardsDetails.map((cardDetails, idx) => (
                        <div
                          key={idx}
                          className={`absolute inset-0 border-4 border-black rounded-4xl p-1 flex flex-col justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]
                            animate-in slide-in-from-top-4`}
                          style={{
                            transform: `rotate(${idx * -6}deg) translate(${idx * -10}px, ${idx * -4}px)`,
                            zIndex: 10 - idx,
                          }}
                        >
                          <img
                            src={allCardImages?.[cardDetails?.cardName]?.url}
                            alt={cardDetails?.cardName}
                            className="w-60 h-68"
                            loading="eager"
                            fetchPriority="high"
                            style={{ visibility: 'hidden' }}
                            onLoad={(event) => (event.currentTarget.style.visibility = 'visible')}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Inbox className="text-black/10" size={48} />
                      </div>
                    )}
                  </div>
                  <p className="font-black italic uppercase text-xs text-black/50 tracking-widest mt-1">
                    Played Deck
                  </p>
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
                        : player.name === currentPlayerName
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
                  <div
                    className="bg-red-600 text-white px-4 py-2 rounded-xl border-4 border-black font-black italic shadow-[4px_4px_0_0_#000] 
                    animate-pulse flex items-center gap-2 text-sm"
                  >
                    <AlertTriangle size={16} /> STACKED_TURNS: {attackStack}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
                {playerCards.map(({ name: cardName, url }, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePlayCard(cardName, idx)}
                    disabled={
                      (!isUserTurn && !cardName.startsWith(CARD_TYPES.NOPE)) ||
                      cardName.includes(CARD_TYPES.DEFUSE) ||
                      !(playerDetails.find((p) => p?.name === playerName)?.inGame ?? false)
                    }
                    className="w-60 h-72 aspect-3/4 border-4 border-black rounded-3xl p-3 flex flex-col justify-between text-left transition-all group
                    shadow-[4px_4px_0_0_#000] hover:-translate-y-4 hover:shadow-[10px_10px_0_0_#000] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100"
                  >
                    <img
                      src={url}
                      alt={cardName}
                      className="w-54 h-64"
                      loading="eager"
                      fetchPriority="high"
                      referrerPolicy="no-referrer"
                      style={{ visibility: 'hidden' }}
                      onLoad={(event) => (event.currentTarget.style.visibility = 'visible')}
                    />
                  </button>
                ))}
              </div>
            </section>
          </div>
          {futureCard && (
            <div className="fixed inset-0 z-500 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
              <form onSubmit={handleAlterFuture}>
                <div
                  className="max-w-4xl w-full bg-white border-10 border-black p-8 md:px-12 md:py-8 rounded-[4rem] text-center space-y-6 shadow-[10px_10px_0_0_#fb7185]
                  animate-in zoom-in overflow-y-auto max-h-[90vh]"
                >
                  <div className="space-y-2 mb-6">
                    <div
                      className={`px-6 py-2 rounded-full border-4 border-black inline-block font-black italic uppercase text-lg transform -rotate-1
                      shadow-[4px_4px_0_0_#000] ${futureCard === CARD_TYPES.ALTER_THE_FUTURE ? 'bg-indigo-600 text-white' : 'bg-pink-400 text-black'}`}
                    >
                      {futureCard === 1 ? 'TACTICAL_OVERRIDE' : 'TEMPORAL_VISION'}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black italic uppercase text-black tracking-tighter leading-none mb-2">
                      {futureCard === CARD_TYPES.ALTER_THE_FUTURE
                        ? 'ALTER THE FUTURE'
                        : 'SEE THE FUTURE'}
                    </h2>
                    <p className="font-black text-zinc-400 uppercase tracking-widest text-xs max-w-xl mx-auto">
                      {futureCard === CARD_TYPES.ALTER_THE_FUTURE
                        ? 'Define the deck order. 1 is top of stack.'
                        : 'Gaze into the top 3 cards of the deck.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6">
                    {cardsDeck?.slice(0, 3)?.map((cardName, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-4">
                        <div className={`flex items-center justify-centertext-center`}>
                          <img
                            src={allCardImages[cardName]?.url}
                            alt={cardName}
                            className="w-48 h-54 shadow-[4px_4px_0_0_#000] rotate-0"
                            loading="eager"
                            fetchPriority="high"
                            referrerPolicy="no-referrer"
                            style={{ visibility: 'hidden' }}
                            onLoad={(event) => (event.currentTarget.style.visibility = 'visible')}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {futureCard === CARD_TYPES.ALTER_THE_FUTURE && (
                    <div className="flex flex-col items-center gap-3">
                      <h3 className="font-black italic text-lg uppercase text-zinc-400 tracking-tighter">
                        Sequence Order
                      </h3>
                      <div className="flex items-center gap-3 text-3xl font-black text-black">
                        <input
                          className="w-12 h-12 order-input bg-zinc-100 border-4 border-black rounded-2xl text-center outline-none focus:bg-indigo-50
                          shadow-[2px_2px_0_0_#000]"
                          name="order1"
                          placeholder="1"
                          maxLength={1}
                          onInput={onInputChange}
                        />
                        <span className="opacity-30">—</span>
                        <input
                          className="w-12 h-12 order-input bg-zinc-100 border-4 border-black rounded-2xl text-center outline-none focus:bg-indigo-50
                          shadow-[2px_2px_0_0_#000]"
                          name="order2"
                          placeholder="2"
                          maxLength={1}
                          onInput={onInputChange}
                        />
                        <span className="opacity-30">—</span>
                        <input
                          className="w-12 h-12 order-input bg-zinc-100 border-4 border-black rounded-2xl text-center outline-none focus:bg-indigo-50
                          shadow-[2px_2px_0_0_#000]"
                          name="order3"
                          placeholder="3"
                          maxLength={1}
                          onInput={onInputChange}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row justify-center gap-6 mt-3">
                    {futureCard === CARD_TYPES.ALTER_THE_FUTURE && (
                      <button
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl border-[6px] border-black shadow-[6px_6px_0_0_#000] font-black italic
                    uppercase text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
                        type="submit"
                      >
                        <ArrowRightLeft className="group-hover:rotate-180 transition-transform duration-500" />{' '}
                        Rewrite Reality
                      </button>
                    )}
                    <button
                      className="px-8 py-4 border-[6px] border-black rounded-2xl font-black italic uppercase text-xl hover:bg-zinc-100 shadow-[6px_6px_0_0_#000]"
                      type="button"
                      onClick={() => setFutureCard(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
          {showExplodeModal && (
            <div className="fixed inset-0 z-600 bg-black/90 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
              <div
                className="flex flex-col items-center max-w-md w-full bg-white border-10 border-black p-6 rounded-[3rem] text-center space-y-6
                shadow-[12px_12px_0_0_#ef4444] animate-in zoom-in"
              >
                <h1 className="text-5xl font-black italic uppercase text-red-600 tracking-tighter drop-shadow-[4px_4px_0_#000]">
                  Boom!
                </h1>
                {cardsDeck?.[0] && (
                  <img
                    src={allCardImages?.[cardsDeck[0]]?.url}
                    alt="Exploding Card"
                    className="w-60 h-72"
                    loading="eager"
                    fetchPriority="high"
                    style={{ visibility: 'hidden' }}
                    onLoad={(event) => (event.currentTarget.style.visibility = 'visible')}
                  />
                )}

                <div>
                  {playerCards.some((playerCard) =>
                    playerCard?.name?.startsWith(CARD_TYPES.DEFUSE)
                  ) ? (
                    <form onSubmit={handleDefuseCardPlay}>
                      <div className="flex flex-col items-center gap-2 mb-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="bg-red-600 text-white p-3 rounded-xl font-black italic uppercase text-xs tracking-widest">
                            Reinsert Card
                          </span>
                          <input
                            className="w-12 h-12 order-input bg-white border-4 border-black rounded-2xl text-center font-black text-2xl outline-none
                            focus:bg-yellow-100 shadow-[2px_2px_0_0_#000]"
                            name="position"
                            placeholder="#"
                            maxLength={2}
                          />
                        </div>
                        <p className="text-xs font-black uppercase text-black/60 tracking-widest">
                          Deck Size: {Math.max((cardsDeck?.length || 0) - 1, 0)}
                        </p>
                      </div>
                      <button
                        className="w-fit bg-green-500 text-white uppercase font-black italic text-3xl px-6 py-4 rounded-[2.5rem] border-8 border-black
                        shadow-[4px_4px_0_0_#000] hover:bg-green-600 transition-all"
                        type="submit"
                      >
                        Defuse
                      </button>
                    </form>
                  ) : (
                    <button
                      className="w-fit bg-red-600 text-white uppercase font-black italic text-3xl px-6 py-4 rounded-[2.5rem] border-8 border-black
                       shadow-[4px_4px_0_0_#000]"
                      type="button"
                      onClick={handleExplodeCardPlay}
                    >
                      Exploded
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
