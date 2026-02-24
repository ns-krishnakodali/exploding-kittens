import './game-arena-page.css';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRightLeft,
  Bomb,
  Check,
  Hand,
  History,
  Inbox,
  ListChecks,
  LogOut,
  PartyPopper,
  PawPrint,
  RefreshCw,
  RotateCcw,
  Skull,
  Sparkles,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';

import { Loading, Toast } from '../../components';
import {
  ATTACK_PREFIX,
  CARD_TYPES,
  CAT_CARD_NAMES,
  CHOOSE_ANOTHER_PLAYER,
  DRAW_CARD,
  GENERIC_ERROR,
  EXPLOSION_PREFIX,
  FAVOR_REQUEST,
  PLAY_CARD,
  SELECT_PLAYER_PREFIX,
  THREE_CARDS_REQUEST,
  TWO_CARDS_REQUEST,
  WINNING_MESSAGE,
  NOPE_ERROR,
  PLAYER_TOOK_CARD,
  DREW_FROM_BOTTOM,
  STEAL_CARD,
  MIN_CARDS_LEFT,
} from '../../constants';
import {
  getAllCardsImages,
  getCatCardsCountService,
  getPlayerCardsService,
  getPlayerDetailsService,
  lobbyExistsStatus,
  processNopeActionService,
  removeNotifyRequestService,
  setGameWinnerService,
  setNotifyRequestService,
  shuffleDeckService,
  subscribeToGameLobby,
  transferPlayerCardsService,
  updateCardsDeckService,
  updateDrawCardService,
  updatePlayCardService,
} from '../../services';
import { getRandomInt } from '../../utils';

export const GameArenaPage = ({ lobbyId, gameId, playerName, leaveGame }) => {
  const [allCardImages, setAllCardImages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [currentPlayerName, setCurrentPlayerName] = useState(null);
  const [attackStack, setAttackStack] = useState(0);
  const [usedCardsDetails, setUsedCardsDetails] = useState([]); // [{playerName, selectedPlayerName, cardName, action}]
  const [cardsDeck, setCardsDeck] = useState([]); // [cardName]
  const [playerCards, setPlayerCards] = useState([]); // [{name, url}]
  const [playersDetails, setPlayersDetails] = useState([]); // [{name, cardsCount, inGame}]
  const [playerAction, setPlayerAction] = useState(null); // {cardName, cardIdx}
  const [notifyRequest, setNotifyRequest] = useState(null); // {from, to, cardType, requestType, shuffledCardNames}
  const [futureCard, setFutureCard] = useState(null);
  const [selectFavorCard, setSelectFavorCard] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [explosionCardIdx, setExplosionCardIdx] = useState(null);
  const [winnerName, setWinnerName] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null); // {message, type}
  const [toast, setToast] = useState(null); // {message, type}
  const [countdown, setCountdown] = useState(null);

  const playersContainerRef = useRef(null);
  const playerCardsRef = useRef(null);

  const renderSelectCard =
    notifyRequest &&
    notifyRequest.from === playerName &&
    notifyRequest.cardType === '' &&
    notifyRequest.requestType === THREE_CARDS_REQUEST;

  const resolveNotifyRequest = useCallback(async () => {
    if (notifyRequest?.to !== playerName) return;

    switch (notifyRequest?.requestType) {
      case FAVOR_REQUEST: {
        setSelectFavorCard(true);
        break;
      }
      case THREE_CARDS_REQUEST: {
        if (!notifyRequest?.cardType) {
          console.error('Card type is missing');
          setToast({ message: GENERIC_ERROR, type: 'error' });
          return;
        }

        const cardIdx = playerCards.findIndex((card) =>
          card?.name?.startsWith(notifyRequest.cardType)
        );
        const cardName = cardIdx !== -1 ? playerCards[cardIdx]?.name : '';

        const status = await transferPlayerCardsService(
          lobbyId,
          notifyRequest?.to,
          notifyRequest?.from,
          cardName,
          [
            {
              playerName: notifyRequest?.to,
              selectedPlayerName: notifyRequest?.from,
              cardName,
              action: STEAL_CARD,
            },
            ...usedCardsDetails,
          ],
          `${notifyRequest?.from} stealed ${notifyRequest.cardType} Card from ${notifyRequest?.to}`
        );

        if (!status) {
          console.error('An issue occurred when resolving three cards request');
          setToast({ message: GENERIC_ERROR, type: 'error' });
        }

        await removeNotifyRequestService(lobbyId);
        break;
      }
      case TWO_CARDS_REQUEST: {
        const status = await setNotifyRequestService(
          lobbyId,
          {
            ...notifyRequest,
            shuffledCardNames: shuffleDeckService(playerCards?.map((card) => card.name) || []),
          },
          `${playerName} braces for a random steal`
        );

        if (!status)
          console.error('An issue occurred when notifying responding for two cards request');
        setNotifyRequest(null);
        break;
      }
      default: {
        console.error('Invalid request type:', notifyRequest?.requestType);
        break;
      }
    }
  }, [lobbyId, playerName, playerCards, notifyRequest, usedCardsDetails]);

  useEffect(() => {
    const initAndLoadImages = async () => {
      const status = await lobbyExistsStatus(lobbyId);
      if (!status) {
        leaveGame();
        return;
      }

      const cardImages = await getAllCardsImages();
      setAllCardImages(cardImages);

      await Promise.all(
        Object.values(cardImages).map(({ url }) => {
          const img = new Image();
          img.src = url;
          return img.decode().catch(() => {});
        })
      );

      setIsLoading(false);
    };

    initAndLoadImages();
  }, [lobbyId, leaveGame]);

  useEffect(() => {
    if (playerAction && playersContainerRef.current) {
      playersContainerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [playerAction]);

  useEffect(() => {
    if (selectFavorCard && playerCardsRef.current) {
      playerCardsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectFavorCard]);

  useEffect(() => {
    if (!lobbyId) return;

    const unsubscribe = subscribeToGameLobby(lobbyId, (lobbyDetails) => {
      setIsUserTurn((lobbyDetails?.currentPlayer || '') === playerName);
      setCurrentPlayerName(lobbyDetails?.currentPlayer);
      setAttackStack(lobbyDetails?.attackStack || 0);
      setCardsDeck(lobbyDetails?.cardsDeck);
      setUsedCardsDetails(lobbyDetails?.usedCardsDetails || []);
      setPlayerAction(null);

      const playerCardsInfo = getPlayerCardsService(lobbyDetails, playerName, allCardImages);
      setPlayerCards(playerCardsInfo);

      const playerDetailsInfo = getPlayerDetailsService(lobbyDetails);
      setPlayersDetails(playerDetailsInfo);

      const lobbyStatusMessage = lobbyDetails?.statusMessage || '';
      if (
        (lobbyStatusMessage.includes(PLAYER_TOOK_CARD) ||
          lobbyStatusMessage.includes(DREW_FROM_BOTTOM)) &&
        lobbyStatusMessage.includes(playerName)
      )
        setStatusMessage(null);
      else
        setStatusMessage(
          lobbyStatusMessage
            ? {
                type:
                  lobbyStatusMessage.includes(EXPLOSION_PREFIX) ||
                  lobbyStatusMessage.includes(ATTACK_PREFIX)
                    ? 'error'
                    : 'info',
                message: lobbyStatusMessage,
              }
            : null
        );

      const notifyRequestInfo = lobbyDetails?.notifyRequest ?? null;
      setNotifyRequest(
        notifyRequestInfo?.from === playerName || notifyRequestInfo?.to === playerName
          ? notifyRequestInfo
          : null
      );
      setShowCardModal(
        notifyRequestInfo?.requestType === TWO_CARDS_REQUEST &&
          notifyRequestInfo?.shuffledCardNames?.length > 0 &&
          notifyRequestInfo.from === playerName
      );

      if (lobbyDetails?.winnerName) setWinnerName(lobbyDetails.winnerName);
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

  useEffect(() => {
    if (
      !notifyRequest ||
      (notifyRequest.from === playerName &&
        notifyRequest.cardType === '' &&
        notifyRequest.requestType === THREE_CARDS_REQUEST)
    )
      return;

    let seconds = 20;
    const interval = setInterval(() => {
      seconds -= 1;
      setCountdown(seconds);
      if (seconds <= 0) {
        setCountdown(null);
        clearInterval(interval);
        if (notifyRequest?.to === playerName) resolveNotifyRequest();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerName, notifyRequest, resolveNotifyRequest]);

  const getNextPlayerIdx = (updatedPlayerDetails = []) => {
    const playersDetailsInfo =
      (updatedPlayerDetails?.length ? updatedPlayerDetails : playersDetails) || [];

    const currPlayerIdx = playersDetailsInfo.findIndex((player) => player?.name === playerName);
    let nextPlayerIdx = currPlayerIdx + 1;

    for (let idx = 1; idx < playersDetails.length; idx++) {
      const playerIdx = (currPlayerIdx + idx) % playersDetails.length;
      if (playersDetails[playerIdx]?.inGame) {
        nextPlayerIdx = playerIdx;
        break;
      }
    }

    return nextPlayerIdx;
  };

  // Handles drawing a card, optionally from the bottom of the deck.
  const handleDrawCard = async (
    updatedPlayerCards = [],
    updatedUsedCardsDetails = [],
    drawFromBottom = false
  ) => {
    if (!isUserTurn || !cardsDeck?.length) return;

    const cardIndex = drawFromBottom ? cardsDeck.length - 1 : 0;
    const drawnCardName = cardsDeck[cardIndex];
    if (drawnCardName?.startsWith(CARD_TYPES.EXPLODING_KITTEN)) {
      setExplosionCardIdx(cardIndex);
      return;
    }

    const playerCardsInfo = (updatedPlayerCards?.length ? updatedPlayerCards : playerCards) || [];
    const updatedDeck = drawFromBottom ? cardsDeck.slice(0, -1) : cardsDeck.slice(1);

    const existingCardNames = playerCardsInfo?.map((card) => card?.name) ?? [];

    const nextPlayerIdx = getNextPlayerIdx();
    const status = await updateDrawCardService(
      lobbyId,
      playerName,
      attackStack > 1 ? playerName : playersDetails[nextPlayerIdx]?.name,
      drawnCardName?.includes(CARD_TYPES.DEFUSE)
        ? [drawnCardName, ...existingCardNames]
        : [...existingCardNames, drawnCardName],
      true,
      updatedDeck,
      updatedUsedCardsDetails.length > 0
        ? updatedUsedCardsDetails
        : [{ playerName, cardName: '', action: DRAW_CARD }, ...usedCardsDetails],
      !drawFromBottom && `${playerName} took a Card from the Deck!`
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
      setToast({ message: GENERIC_ERROR, type: 'error' });
    }
  };

  // Handles playing a card and triggers the corresponding card's game logic.
  const handlePlayCard = async (cardName, cardIdx, selectedPlayerName = '') => {
    const updatedPlayerCards =
      cardIdx >= 0 && cardIdx < playerCards.length
        ? [...playerCards.slice(0, cardIdx), ...playerCards.slice(cardIdx + 1)]
        : [];

    switch (
      Object.values(CARD_TYPES).find((cardType) => cardName?.startsWith(cardType)) ||
      CARD_TYPES.CAT_CARD
    ) {
      case CARD_TYPES.ALTER_THE_FUTURE: {
        const status = await updatePlayCardService(
          lobbyId,
          playerName,
          null,
          updatedPlayerCards?.map((card) => card?.name) || [],
          [{ playerName, cardName, action: PLAY_CARD }, ...usedCardsDetails],
          `${playerName} Altered the Future!`
        );

        if (status) {
          setFutureCard(CARD_TYPES.ALTER_THE_FUTURE);
        } else {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: GENERIC_ERROR, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.ATTACK: {
        const nextPlayerIdx = getNextPlayerIdx();
        const status = await updatePlayCardService(
          lobbyId,
          playerName,
          playersDetails[nextPlayerIdx]?.name,
          updatedPlayerCards?.map((card) => card?.name) || [],
          [
            {
              playerName,
              selectedPlayerName: playersDetails[nextPlayerIdx]?.name,
              cardName,
              action: PLAY_CARD,
            },
            ...usedCardsDetails,
          ],
          `${playerName} slapped down an Attack, Good Luck!`,
          attackStack + 2
        );

        if (!status) {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: GENERIC_ERROR, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.CAT_CARD: {
        if (!CAT_CARD_NAMES.includes(cardName)) {
          console.error(`Invalid card name: ${cardName}`);
          setToast({ message: GENERIC_ERROR, type: 'error' });
          return;
        }

        const updatedUsedCardsDetails = selectedPlayerName
          ? usedCardsDetails
          : [{ playerName, cardName, action: PLAY_CARD }, ...usedCardsDetails];

        const cardsCount = getCatCardsCountService(updatedUsedCardsDetails, playerName, cardName);

        if (cardsCount >= 2 && !selectedPlayerName) {
          setPlayerCards(updatedPlayerCards);
          setUsedCardsDetails(updatedUsedCardsDetails);
          setStatusMessage({
            type: 'info',
            message: `${SELECT_PLAYER_PREFIX} demand ${cardsCount >= 3 ? 'Specific' : 'Random'} Card`,
          });
          setPlayerAction({ cardName, cardIdx });
        }

        if (cardsCount === 1 || selectedPlayerName) {
          const status = await updatePlayCardService(
            lobbyId,
            playerName,
            null,
            (selectedPlayerName ? playerCards : updatedPlayerCards)?.map((card) => card?.name) ||
              [],
            updatedUsedCardsDetails,
            cardsCount === 2
              ? `${playerName} played 2 matching Cat Cards targetting ${selectedPlayerName}.`
              : ''
          );

          if (!status) {
            console.error(`An issue occurred when playing ${cardName}`);
            setToast({ message: GENERIC_ERROR, type: 'error' });
            return;
          }

          const cardsNotifyRequest = {
            from: playerName,
            to: selectedPlayerName,
            cardType: '',
          };
          if (cardsCount === 2) {
            const status = await setNotifyRequestService(lobbyId, {
              ...cardsNotifyRequest,
              requestType: TWO_CARDS_REQUEST,
            });
            if (!status) console.error(`An issue occurred when notifying ${cardsNotifyRequest}`);
          } else if (cardsCount >= 3) {
            setNotifyRequest({
              ...cardsNotifyRequest,
              requestType: THREE_CARDS_REQUEST,
            });
          }
        }
        if (selectedPlayerName) setPlayerAction(null);
        break;
      }
      case CARD_TYPES.DRAW_FROM_THE_BOTTOM: {
        const updatedUsedCardsDetails = [
          { playerName, cardName, action: PLAY_CARD },
          ...usedCardsDetails,
        ];
        const status = await updatePlayCardService(
          lobbyId,
          playerName,
          null,
          updatedPlayerCards?.map((card) => card?.name) || [],
          updatedUsedCardsDetails,
          `${playerName} Drew from the Bottom!`
        );

        if (!status) {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: GENERIC_ERROR, type: 'error' });
          return;
        }
        await handleDrawCard(updatedPlayerCards, updatedUsedCardsDetails, true);
        break;
      }
      case CARD_TYPES.FAVOR: {
        if (playerAction && selectedPlayerName) {
          const status = await updatePlayCardService(
            lobbyId,
            playerName,
            null,
            [
              ...((updatedPlayerCards?.length ? updatedPlayerCards : playerCards)?.map(
                (card) => card?.name
              ) || []),
            ],
            [{ playerName, selectedPlayerName, cardName, action: PLAY_CARD }, ...usedCardsDetails],
            `${playerName} demanded a Favor from ${selectedPlayerName}!`
          );

          if (!status) {
            console.error(`An issue occurred when ${cardName}`);
            setToast({ message: GENERIC_ERROR, type: 'error' });
          }
          setPlayerAction(null);

          const notifyStatus = await setNotifyRequestService(lobbyId, {
            from: playerName,
            to: selectedPlayerName,
            cardType: '',
            requestType: FAVOR_REQUEST,
          });
          if (!notifyStatus) console.error('An issue occurred when notifying for favor');
        } else {
          setStatusMessage({ type: 'info', message: `${SELECT_PLAYER_PREFIX} ask Favor` });
          setPlayerAction({ cardName, cardIdx });
        }
        break;
      }
      case CARD_TYPES.NOPE: {
        const recentUsedCardDetials = usedCardsDetails[0];
        if (
          (usedCardsDetails?.length ?? 0) === 0 ||
          (recentUsedCardDetials?.action === PLAY_CARD &&
            [
              CARD_TYPES.ALTER_THE_FUTURE,
              CARD_TYPES.DRAW_FROM_THE_BOTTOM,
              CARD_TYPES.SEE_THE_FUTURE,
            ].some((type) => recentUsedCardDetials?.cardName?.includes(type))) ||
          (!recentUsedCardDetials.cardName?.startsWith(CARD_TYPES.NOPE) &&
            recentUsedCardDetials?.playerName === playerName)
        ) {
          setToast({ message: NOPE_ERROR, type: 'error' });
          return;
        }

        const nonNopeIdx = usedCardsDetails.findIndex(
          (cardDetails) => !cardDetails?.cardName.startsWith(CARD_TYPES.NOPE)
        );
        if (usedCardsDetails[0]?.action !== PLAY_CARD || nonNopeIdx === -1) {
          const status = await updatePlayCardService(
            lobbyId,
            playerName,
            null,
            updatedPlayerCards?.map((card) => card?.name) || [],
            [{ playerName, cardName, action: PLAY_CARD }, ...usedCardsDetails],
            `${playerName} played Nope for no reason.`
          );

          if (!status) {
            console.error('An issue occurred when playing nope');
            setToast({ message: GENERIC_ERROR, type: 'error' });
          }
          return;
        }

        await processNopeActionService(
          lobbyId,
          playerName,
          updatedPlayerCards?.map((card) => card?.name) || [],
          cardName,
          usedCardsDetails,
          nonNopeIdx
        );
        break;
      }
      case CARD_TYPES.SEE_THE_FUTURE: {
        const status = await updatePlayCardService(
          lobbyId,
          playerName,
          null,
          updatedPlayerCards?.map((card) => card?.name) || [],
          [{ playerName, cardName, action: PLAY_CARD }, ...usedCardsDetails],
          `${playerName} Saw the Future!`
        );

        if (status) {
          setFutureCard(CARD_TYPES.SEE_THE_FUTURE);
        } else {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: GENERIC_ERROR, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.SHUFFLE: {
        const shuffledCardsDeck = shuffleDeckService(cardsDeck);

        const status = await updatePlayCardService(
          lobbyId,
          playerName,
          null,
          updatedPlayerCards?.map((card) => card?.name) || [],
          [{ playerName, cardName, action: PLAY_CARD }, ...usedCardsDetails],
          `${playerName} Shuffled the deck.`,
          null,
          { original: shuffledCardsDeck, backup: cardsDeck }
        );

        if (!status) {
          console.error('An issue occurred when shuffling cards');
          setToast({ message: GENERIC_ERROR, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.SKIP: {
        const nextPlayerIdx = getNextPlayerIdx();
        const nextPlayerName = attackStack > 1 ? playerName : playersDetails[nextPlayerIdx]?.name;
        const status = await updatePlayCardService(
          lobbyId,
          playerName,
          nextPlayerName,
          updatedPlayerCards?.map((card) => card?.name) || [],
          [
            { playerName, selectedPlayerName: nextPlayerName, cardName, action: PLAY_CARD },
            ...usedCardsDetails,
          ],
          `${playerName} played Skip and dodged turn.`,
          attackStack - 1
        );

        if (!status) {
          console.error(`An issue occurred when ${cardName}`);
          setToast({ message: GENERIC_ERROR, type: 'error' });
        }
        break;
      }
      case CARD_TYPES.TARGETTED_ATTACK: {
        if (playerAction && selectedPlayerName) {
          const status = await updatePlayCardService(
            lobbyId,
            playerName,
            selectedPlayerName,
            [
              ...((updatedPlayerCards?.length ? updatedPlayerCards : playerCards)?.map(
                (card) => card?.name
              ) || []),
            ],
            [{ playerName, selectedPlayerName, cardName, action: PLAY_CARD }, ...usedCardsDetails],
            `${playerName} launched a Targetted Attack at ${selectedPlayerName}, Good Luck!`,
            attackStack + 2
          );

          if (!status) {
            console.error(`An issue occurred when ${cardName}`);
            setToast({ message: GENERIC_ERROR, type: 'error' });
          }
          setPlayerAction(null);
        } else {
          setStatusMessage({ type: 'info', message: `${SELECT_PLAYER_PREFIX} Target` });
          setPlayerAction({ cardName, cardIdx });
        }
        break;
      }
    }
  };

  // Handles card selection by resolving a Favor or playing the card normally.
  const handleSelectedCard = async (cardName, cardIdx) => {
    if (selectFavorCard) {
      setSelectFavorCard(false);
      const status = await transferPlayerCardsService(
        lobbyId,
        notifyRequest?.to,
        notifyRequest?.from,
        cardName,
        [
          {
            playerName: notifyRequest?.to,
            selectedPlayerName: notifyRequest?.from,
            cardName,
            action: STEAL_CARD,
          },
          ...usedCardsDetails,
        ],
        `${notifyRequest?.to} paid the Favor tax to ${notifyRequest?.from}`
      );

      if (!status) {
        console.error('An issue occurred when resolving three cards request');
        setToast({ message: GENERIC_ERROR, type: 'error' });
      }

      await removeNotifyRequestService(lobbyId);
      return;
    }

    handlePlayCard(cardName, cardIdx);
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

    const status = await updateCardsDeckService(lobbyId, updatedCardsDeck);
    if (!status) {
      console.error('An issue occurred when altering cards');
      setToast({ message: GENERIC_ERROR, type: 'error' });
      return;
    }
    setFutureCard(null);
  };

  // Handles player selection when an interactive card is active
  const handlePlayerClick = (selectedPlayerName, cardsCount, inGame) => {
    if (!playerAction) return;

    const { cardName, cardIdx } = playerAction;
    if (playerName === selectedPlayerName || (cardsCount ?? 0) === 0 || !inGame) {
      setToast({ message: CHOOSE_ANOTHER_PLAYER, type: 'info' });
      return;
    }
    handlePlayCard(cardName, cardIdx, selectedPlayerName);
  };

  // Handles card type selection after playing 3 matching Cat Cards.
  const handleCardTypeSelection = async (event) => {
    const cardType = event.target.value;
    if (!cardType) {
      console.error('Nope card missing or invalid notify request');
      setToast({ message: GENERIC_ERROR, type: 'error' });
      return;
    }

    const status = await setNotifyRequestService(
      lobbyId,
      { ...notifyRequest, cardType },
      `${notifyRequest?.from} demanded ${cardType} Card from ${notifyRequest?.to}`
    );
    if (!status)
      console.error(`An issue occurred when notifying ${notifyRequest} for type ${cardType}`);
  };

  // Handles playing a Nope card to notify request
  const handleNopeRequest = async () => {
    const nopeCardIdx = playerCards.findIndex((card) => card?.name?.startsWith(CARD_TYPES.NOPE));
    if (nopeCardIdx === -1 || notifyRequest === null) {
      console.error('Nope card missing or invalid notify request');
      setToast({ message: GENERIC_ERROR, type: 'error' });
      return;
    }
    handlePlayCard(playerCards[nopeCardIdx]?.name, nopeCardIdx);
  };

  // Handles random card selection from shuffled deck
  const handleRandomCardSelection = async (cardIdx) => {
    if (notifyRequest && notifyRequest.requestType !== TWO_CARDS_REQUEST) return;

    const cardName = notifyRequest.shuffledCardNames?.[cardIdx];
    const status = await transferPlayerCardsService(
      lobbyId,
      notifyRequest?.to,
      notifyRequest?.from,
      cardName,
      [
        {
          playerName: notifyRequest?.to,
          selectedPlayerName: notifyRequest?.from,
          cardName,
          action: STEAL_CARD,
        },
        ...usedCardsDetails,
      ],
      `${notifyRequest?.from} stealed Random Card from ${notifyRequest?.to}`
    );

    if (!status) {
      console.error('An issue occurred when processing two cards request');
      setToast({ message: GENERIC_ERROR, type: 'error' });
    }

    handleCardsModalClosure();
  };

  // Handles modal close conditions
  const handleCardsModalClosure = async () => {
    setShowCardModal(false);
    await removeNotifyRequestService(lobbyId);
  };

  // Handles the defuse action when a player draws an Exploding Kitten.
  const handleDefuseCardPlay = async (event) => {
    event?.preventDefault();

    const defuseCardIdx = playerCards.findIndex((card) =>
      card?.name?.startsWith(CARD_TYPES.DEFUSE)
    );
    if (defuseCardIdx === -1 || explosionCardIdx === null) {
      console.error('Defuse card missing or invalid explosion card index');
      setToast({ message: GENERIC_ERROR, type: 'error' });
      setExplosionCardIdx(null);
      return;
    }

    const formData = new FormData(event.target);
    const positionInput = formData.get('position');

    const newCardsDeck = [...cardsDeck];
    const [explosionCard] = newCardsDeck.splice(explosionCardIdx, 1);

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
      ...playerCards.slice(0, defuseCardIdx),
      ...playerCards.slice(defuseCardIdx + 1),
    ];

    const cardName = playerCards[defuseCardIdx]?.name;

    const nextPlayerIdx = getNextPlayerIdx();
    const status = await updatePlayCardService(
      lobbyId,
      playerName,
      attackStack === 0 && playersDetails[nextPlayerIdx]?.name,
      updatedPlayerCards?.map((card) => card?.name) || [],
      [{ playerName, cardName, action: PLAY_CARD }, ...usedCardsDetails],
      `${playerName} Defused the Explosion`,
      attackStack > 0 && attackStack - 1,
      { original: newCardsDeck, backup: cardsDeck }
    );

    if (!status) {
      console.error(`An issue occurred when ${cardName}`);
      setToast({ message: GENERIC_ERROR, type: 'error' });
    }
    setExplosionCardIdx(null);
  };

  // Handles player elimination from an explosion and processes winning logic.
  const handleExplodeCardPlay = async () => {
    const updatedPlayersDetails = playersDetails?.map((player) =>
      player.name === playerName ? { ...player, inGame: false } : player
    );
    setPlayersDetails(updatedPlayersDetails);

    const nextPlayerIdx = getNextPlayerIdx(updatedPlayersDetails);
    const status = await updateDrawCardService(
      lobbyId,
      playerName,
      updatedPlayersDetails[nextPlayerIdx]?.name,
      [...(playerCards?.map((card) => card?.name) || [])],
      false,
      [...cardsDeck.slice(0, explosionCardIdx), ...cardsDeck.slice(explosionCardIdx + 1)],
      [
        { playerName, cardName: cardsDeck[explosionCardIdx], action: DRAW_CARD },
        ...usedCardsDetails,
      ],
      `BOOM! ${playerName} just exploded, LOL!`
    );

    setExplosionCardIdx(null);

    if (!status) {
      setToast({ message: GENERIC_ERROR, type: 'error' });
    } else {
      const inGameNames =
        updatedPlayersDetails.filter((player) => player?.inGame)?.map((player) => player?.name) ||
        [];
      if (inGameNames?.length === 1) setGameWinnerService(lobbyId, inGameNames[0]);
    }
  };

  const onInputChange = (event) => {
    const inputs = Array.from(event.target.form.querySelectorAll('.order-input'));
    const index = inputs.indexOf(event.target);

    if (event.target.value.length === 1) inputs[index + 1]?.focus();
    if (event.target.value.length === 0) inputs[index - 1]?.focus();
  };

  return (
    <>
      <header
        className="w-full border-b-4 border-black px-1 md:px-4 py-6 md:pt-4 md:pb-6 flex flex-col md:flex-row justify-between items-center
        shadow-[0_4px_0_0_#000]"
      >
        <div className="flex items-center justify-between md:justify-start md:gap-8 w-full md:w-auto">
          <div
            className="bg-red-600 text-white px-2 md:px-6 py-2 border-4 border-black shadow-[4px_4px_0_0_#000] font-black italic uppercase text-xl md:text-3xl
            tracking-tighter"
          >
            Exploding Kittens
          </div>
          <div className="flex items-center border-l-4 border-black/10 pl-6">
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
        <div className="hidden md:flex items-end">
          <button
            className="bg-white border-4 border-black px-3 py-2 rounded-xl shadow-[2px_2px_0_0_#000] font-black italic uppercase text-xs hover:bg-zinc-200
              transition-colors flex items-center gap-2 text-black tracking-wide"
            onClick={leaveGame}
          >
            <LogOut size={14} />
            Leave Match
          </button>
        </div>
      </header>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}
          <div className="flex flex-col grow overflow-x-hidden">
            <section className="p-6 flex flex-col items-center justify-center gap-6 md:gap-3">
              <div
                className={`flex items-center justify-center gap-3 bg-yellow-400 border-4 border-black px-6 py-2 md:py-3 rounded-xl shadow-[2px_2px_0_0_#000]
                  transition-all duration-300 ${cardsDeck.length <= MIN_CARDS_LEFT ? 'animate-pulse scale-105' : 'scale-100'}`}
              >
                <span className="font-black italic uppercase text-xs tracking-widest text-black">
                  Cards Left
                </span>
                <span
                  className={`font-black leading-none text-2xl ${cardsDeck.length <= MIN_CARDS_LEFT ? 'text-red-600' : 'text-black'}`}
                >
                  {cardsDeck.length}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center w-full gap-15 md:gap-40 pt-2 relative">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black rounded-4xl" />
                    <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-zinc-200 border-4 border-black rounded-4xl" />
                    <button
                      onClick={() => handleDrawCard()}
                      disabled={!isUserTurn}
                      className={`w-40 h-52 md:w-64 md:h-76 border-4 border-black rounded-4xl transition-all relative flex flex-col items-center justify-center gap-4
                      overflow-hidden ${
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
                  <div className="w-40 h-52 md:w-64 md:h-76 relative">
                    <div className="absolute inset-0 border-4 border-black border-dashed rounded-4xl opacity-20 flex items-center justify-center">
                      <ArrowDownCircle size={32} className="text-black/40" />
                    </div>
                    {usedCardsDetails?.length > 0 ? (
                      usedCardsDetails
                        .filter((cardDetails) => cardDetails?.action === PLAY_CARD)
                        .slice(0, 3)
                        .map((cardDetails, idx) => (
                          <div
                            key={idx}
                            className={`absolute inset-0 border-4 border-black rounded-4xl p-2 md:p-1 flex flex-col justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]
                            animate-in slide-in-from-top-4`}
                            style={{
                              transform: `rotate(${idx * -6}deg) translate(${idx * -10}px, ${idx * -4}px)`,
                              zIndex: 10 - idx,
                            }}
                          >
                            <img
                              src={allCardImages?.[cardDetails?.cardName]?.url}
                              alt={cardDetails?.cardName}
                              className="w-60 h-70 rounded-xl"
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
              <div className="max-w-8xl mx-auto px-4 mb-4 flex items-center gap-2 border-b-2 border-zinc-800 pb-4">
                <History className="text-yellow-400" size={18} />
                <h3 className="text-zinc-900 font-black italic uppercase text-lg tracking-tight">
                  Feline Surveillance List
                </h3>
              </div>
              <div className="w-full flex justify-center px-2 md:px-6 py-4 relative z-10">
                <div
                  className={`min-h-24 md:min-h-16 md:max-w-6xl w-full flex flex-wrap md:flex-nowrap items-center justify-center gap-2 md:gap-4 px-6 py-3 rounded-2xl
                  border-4 border-black transition-colors duration-300 transform shadow-[4px_4px_0_0_#000] ${
                    statusMessage
                      ? statusMessage.type === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-black'
                      : 'bg-black/5 border-dashed border-black/10 opacity-50'
                  }`}
                >
                  {statusMessage ? (
                    <>
                      {statusMessage.type === 'error' ? (
                        <Bomb size={28} className="shrink-0" />
                      ) : (
                        <Zap size={28} className="text-yellow-400 shrink-0" />
                      )}
                      <span className="font-black italic uppercase tracking-tight text-sm md:text-xl text-center wrap-break-word max-w-full">
                        {statusMessage.message}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-black italic uppercase text-sm mx-auto tracking-widest">
                      {currentPlayerName !== playerName
                        ? `Waiting on ${currentPlayerName}`
                        : `Your move, ${currentPlayerName}`}
                      <span className="ml-0.5 dots" />
                    </span>
                  )}
                </div>
              </div>
              <div
                ref={playersContainerRef}
                tabIndex={-1}
                className="max-w-7xl mx-auto my-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 md:gap-x-12 gap-y-6 px-4"
              >
                {playersDetails.map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePlayerClick(player.name, player.cardsCount, player.inGame)}
                    disabled={!playerAction}
                    className={`p-3 border-4 border-black rounded-2xl transition-all flex items-center justify-center gap-3 ${
                      !player.inGame
                        ? 'bg-zinc-800 border-zinc-700 grayscale opacity-40 text-zinc-600 shadow-none'
                        : player.name === currentPlayerName
                          ? 'bg-yellow-300 shadow-[4px_4px_0_0_#ef4444] scale-105 z-10 text-black'
                          : 'bg-white shadow-[4px_4px_0_0_#000] hover:bg-zinc-200 cursor-pointer disabled:hover:bg-white disabled:cursor-not-allowed' +
                            'disabled:opacity-60 disabled:shadow-none'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-lg font-black
                    ${!player.inGame ? 'bg-zinc-900' : 'bg-black text-white'}`}
                    >
                      {!player.inGame ? <Skull size={20} /> : player.name[0]}
                    </div>
                    <div className="grow min-w-0">
                      <h3 className="font-black italic uppercase text-xs text-start truncate tracking-tight">
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="bg-black text-white inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                          {player.name === playerName ? playerCards?.length : player.cardsCount}{' '}
                          Cards
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            <section className="border-t-8 border-black py-4 md:p-8 relative shadow-[inset_0_4px_0_0_rgba(0,0,0,0.05)]">
              <div
                ref={playerCardsRef}
                tabIndex={-1}
                className="flex flex-col sm:flex-row items-center justify-between relative mb-8 max-w-8xl mx-auto gap-4"
              >
                <div className="flex items-center justify-center gap-5">
                  <div
                    className={`w-14 h-14 border-4 border-black rounded-xl flex items-center justify-center text-2xl font-black shadow-[4px_4px_0_0_#000]
                  ${isUserTurn ? 'bg-yellow-400' : 'bg-zinc-100'}`}
                  >
                    {playerName?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-none">
                      Your Arsenal
                    </h2>
                    <p
                      className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isUserTurn ? 'text-yellow-500' : 'text-zinc-400'}`}
                    >
                      Phase: {isUserTurn ? 'Your Turn' : 'Surveillance Only'}
                    </p>
                  </div>
                </div>
                {selectFavorCard && (
                  <p className="md:absolute md:left-1/2 md:-translate-x-1/2 font-black uppercase text-lg tracking-widest text-red-600">
                    Choose a card to give as Favor
                  </p>
                )}
                {attackStack > 0 && (
                  <div
                    className="bg-red-600 text-white px-4 py-2 rounded-xl border-4 border-black font-black italic shadow-[4px_4px_0_0_#000]
                    uppercase animate-pulse flex items-center gap-2 text-sm"
                  >
                    <AlertTriangle size={16} /> Stacked_Turns: {attackStack}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6 md:gap-x-6 md:gap-y-6 max-w-7xl mx-auto px-4 justify-center">
                {playerCards.map(({ name: cardName, url }, idx) => (
                  <button
                    key={cardName + idx}
                    className="w-42 h-54 lg:w-60 md:h-72 aspect-3/4 border-4 border-black rounded-3xl p-1.5 md:p-1 flex flex-col items-center justify-center text-left
                    transition-all group shadow-[4px_4px_0_0_#000] hover:-translate-y-4 hover:shadow-[10px_10px_0_0_#000] active:scale-95 disabled:opacity-50
                    disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 card-enter"
                    disabled={
                      !selectFavorCard &&
                      ((!isUserTurn && !cardName.startsWith(CARD_TYPES.NOPE)) ||
                        cardName.includes(CARD_TYPES.DEFUSE) ||
                        !(
                          playersDetails.find((player) => player?.name === playerName)?.inGame ??
                          false
                        ))
                    }
                    onClick={() => handleSelectedCard(cardName, idx)}
                  >
                    <img
                      src={url}
                      alt={cardName}
                      className="w-58 h-68 rounded-2xl"
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
          {/* Future Cards Modal */}
          {futureCard && (
            <div className="fixed inset-0 z-500 bg-black/60 flex items-center justify-center p-6 animate-in fade-in duration-300">
              <form onSubmit={handleAlterFuture}>
                <div
                  className="max-w-4xl max-h-[calc(100svh-2rem)] md:max-h-[90vh] w-full bg-white border-10 border-black p-8 md:px-12 md:py-8 rounded-[4rem]
                  text-center space-y-6 shadow-[10px_10px_0_0_#000] animate-in zoom-in overflow-y-auto"
                >
                  <div className="space-y-2 mb-6">
                    <div
                      className={`px-6 py-2 rounded-full border-4 border-black inline-block font-black italic uppercase text-lg transform -rotate-1
                      shadow-[4px_4px_0_0_#000] ${futureCard === CARD_TYPES.ALTER_THE_FUTURE ? 'bg-purple-800 text-white' : 'bg-pink-400 text-black'}`}
                    >
                      Temporal Vision
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black italic uppercase text-black tracking-tighter leading-none my-2">
                      {futureCard === CARD_TYPES.ALTER_THE_FUTURE
                        ? 'Alter the Future'
                        : 'See the Future'}
                    </h2>
                    <p className="font-black text-zinc-400 uppercase tracking-widest text-xs max-w-xl mx-auto">
                      {futureCard === CARD_TYPES.ALTER_THE_FUTURE
                        ? 'Define the deck order (1 is top of the deck).'
                        : 'Gaze into the top 3 cards of the deck.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 md:gap-8">
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
                      className="px-8 py-4 border-[6px] border-black rounded-2xl font-black italic uppercase text-xl hover:bg-zinc-300 shadow-[6px_6px_0_0_#000]"
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
          {/* Notify Action Request Modal */}
          {notifyRequest !== null && !selectFavorCard && !showCardModal && (
            <div className="fixed inset-0 z-650 bg-black/80 flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div
                className="max-w-xl w-full bg-white border-8 border-black p-8 md:p-12 rounded-[4rem] text-center space-y-8 shadow-[10px_10px_0_0_#000]
                animate-in zoom-in-95"
              >
                {countdown && !renderSelectCard && (
                  <div
                    className="absolute top-6 right-8 bg-black text-white px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#ef4444] rounded-xl
                  flex items-center gap-2 transform rotate-2"
                  >
                    <Timer size={18} className="animate-pulse text-red-400" />
                    <span className="font-black text-sm tracking-tighter">{countdown}</span>
                  </div>
                )}
                <div
                  className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto border-4 border-black shadow-[4px_4px_0_0_#000] 
                    ${notifyRequest.from === playerName ? 'bg-yellow-400' : 'bg-red-600 text-white'}`}
                >
                  {notifyRequest.from === playerName ? (
                    renderSelectCard ? (
                      <ListChecks size={54} className="animate-pulse" />
                    ) : (
                      <RefreshCw size={54} className="animate-spin duration-3000" />
                    )
                  ) : (
                    <Hand size={54} className="animate-pulse" />
                  )}
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">
                    {notifyRequest.from === playerName &&
                      (renderSelectCard ? 'Select a Card to Take' : 'Waiting For Player...')}
                    {notifyRequest.to === playerName && 'Card Requested!'}
                  </h2>
                  {renderSelectCard ? (
                    <div className="flex flex-col items-center gap-2 w-full mt-6">
                      <label className="font-black italic uppercase text-xs tracking-widest text-zinc-500">
                        Card Type
                      </label>
                      <div className="relative inline-block">
                        <select
                          defaultValue=""
                          onChange={handleCardTypeSelection}
                          className="appearance-none cursor-pointer px-6 py-3 pr-6 bg-yellow-400 text-black border-4 border-black rounded-2xl font-black italic
                          uppercase text-sm tracking-wider shadow-[4px_4px_0_0_#000] hover:bg-yellow-300 focus:outline-none focus:shadow-[4px_4px_0_0_#000]
                          active:shadow-[2px_2px_0_0_#000] transition-all"
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          {[
                            ...Object.values(CARD_TYPES).filter(
                              (card) =>
                                card !== CARD_TYPES.EXPLODING_KITTEN && card !== CARD_TYPES.CAT_CARD
                            ),
                            ...CAT_CARD_NAMES,
                          ].map((cardType) => (
                            <option key={cardType} value={cardType}>
                              {cardType.replace(/-/g, ' ')}
                            </option>
                          ))}
                        </select>
                        <ArrowDownCircle
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="font-bold text-zinc-500 uppercase text-xs tracking-widest leading-relaxed">
                      {notifyRequest.from === playerName
                        ? `Negotiating with ${notifyRequest.to} for the requested card`
                        : `${notifyRequest.from} ${
                            notifyRequest.requestType === FAVOR_REQUEST
                              ? 'is requesting a favor'
                              : notifyRequest.requestType === TWO_CARDS_REQUEST
                                ? 'will take a random blind'
                                : `is demanding ${notifyRequest.cardType?.replaceAll('-', ' ')}`
                          } card from you`}
                    </p>
                  )}
                </div>
                {notifyRequest.to === playerName && (
                  <div className="flex flex-col items-center gap-4">
                    {playerCards.some((playerCard) =>
                      playerCard.name?.includes(CARD_TYPES.NOPE)
                    ) && (
                      <button
                        onClick={handleNopeRequest}
                        className="w-fit bg-red-500 text-white font-black italic text-2xl px-4 py-4 rounded-2xl border-4 border-black shadow-[4px_4px_0_0_#000]
                        hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                      >
                        <XCircle size={28} /> USE NOPE!
                      </button>
                    )}
                    <button
                      onClick={resolveNotifyRequest}
                      className="w-fit bg-green-500 text-white font-black italic text-2xl px-6 py-4 rounded-2xl border-4 border-black shadow-[4px_4px_0_0_#000]
                      hover:bg-green-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                    >
                      <Check size={28} /> OBLIGE REQUEST
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Select Player Cards Modal */}
          {showCardModal && (
            <div className="fixed inset-0 z-550 bg-black/90 flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div
                className="max-w-6xl max-h-[calc(100svh-2rem)] md:max-h-[90vh] w-full bg-white border-10 border-black p-8 md:py-6 md:px-12 rounded-[4rem]
                text-center space-y-8 shadow-[10px_10px_0_0_#000] animate-in zoom-in overflow-y-auto modal-scrollbar relative"
              >
                <div className="space-y-3">
                  <div
                    className="bg-yellow-400 text-white px-8 py-2 rounded-full border-4 border-black inline-block font-black italic uppercase text-lg
                    shadow-[4px_4px_0_0_#000]"
                  >
                    Infiltrating {notifyRequest.to}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black italic uppercase text-black tracking-tighter leading-none">
                    BLIND ACQUISITION
                  </h2>
                  <p className="font-black text-zinc-400 uppercase tracking-widest text-sm">
                    You can only see the blinds. Trust your instincts.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {Array.from(
                    { length: notifyRequest?.shuffledCardNames?.length ?? 0 },
                    (_, aIdx) => aIdx
                  ).map((idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRandomCardSelection(idx)}
                      className="w-full aspect-2/3 border-4 border-black rounded-4xl p-5 flex flex-col justify-between text-left transition-all
                      shadow-[4px_4px_0_0_#000] hover:-translate-y-2 active:scale-95 group bg-zinc-100 hover:bg-yellow-400"
                    >
                      <div className="grow flex flex-col items-center justify-center gap-4">
                        <PawPrint
                          size={64}
                          className="text-zinc-300 group-hover:text-black group-hover:animate-bounce"
                        />
                        <span className="font-black italic text-xs text-zinc-400 group-hover:text-black">
                          ???
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCardsModalClosure}
                  className="px-12 py-4 border-4 border-black rounded-2xl font-black italic uppercase hover:bg-zinc-200 shadow-[4px_4px_0_0_#000]"
                >
                  Cancel Action
                </button>
              </div>
            </div>
          )}
          {/* Explosion Modal */}
          {explosionCardIdx !== null && (
            <div className="fixed inset-0 z-600 bg-black/90 flex items-center justify-center p-6 animate-in fade-in">
              <div
                className="flex flex-col items-center max-w-md w-full bg-white border-10 border-black p-6 rounded-[3rem] text-center space-y-6
                shadow-[10px_10px_0_0_#ef4444] animate-in zoom-in"
              >
                <h1 className="text-5xl font-black italic uppercase text-red-600 tracking-tighter drop-shadow-[4px_4px_0_#000]">
                  Boom!
                </h1>
                {cardsDeck?.[explosionCardIdx] && (
                  <img
                    src={allCardImages?.[cardsDeck[explosionCardIdx]]?.url}
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
                          Deck Size: {cardsDeck?.length || 0}
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
          {/* Winner Announcement Modal */}
          {winnerName && (
            <div className="fixed inset-0 z-700 bg-black/95 flex items-center justify-center p-6 animate-in fade-in duration-500">
              <div
                className="flex flex-col items-center max-w-2xl w-full bg-white border-12 border-black px-12 md:px-16 py-8 md:py-6 rounded-[5rem] text-center space-y-6
                shadow-[10px_10px_0_0_#fbbf24] animate-in duration-700 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-400 -ml-16 -mt-16 rotate-45 border-8 border-black" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-600 -mr-16 -mb-16 rotate-45 border-8 border-black" />
                <div className="relative z-10 space-y-6">
                  <div
                    className="bg-yellow-400 border-8 border-black rounded-full w-36 h-36 flex items-center justify-center mx-auto shadow-[10px_10px_0_0_#000]
                    transform -rotate-3"
                  >
                    <Trophy size={72} className="text-black" />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase text-black tracking-tighter leading-none">
                      Victory!
                    </h1>
                    <div
                      className="bg-black text-white px-8 py-3 rounded-2xl border-4 border-yellow-400 inline-block font-black text-2xl md:text-4xl italic
                      uppercase transform rotate-2 shadow-[6px_6px_0_0_#fbbf24]"
                    >
                      {winnerName}
                    </div>
                  </div>
                  <p className="text-md md:text-xl font-black text-zinc-500 uppercase tracking-widest pt-3">
                    {winnerName === playerName
                      ? WINNING_MESSAGE
                      : `${winnerName} wins. The rest? Cat-astrophic.`}
                  </p>
                </div>
                <button
                  onClick={leaveGame}
                  className="w-fit relative z-10 bg-red-600 text-white font-black italic text-md md:text-2xl p-4 md:p-5 rounded-[3rem] border-8 border-black
                  shadow-[4px_4px_0_0_#000] hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={32} /> RESTART BATTLE
                </button>
                <div className="flex justify-center gap-4 relative z-10">
                  <PartyPopper className="text-yellow-500 animate-bounce" size={32} />
                  <Sparkles className="text-red-600 animate-pulse" size={32} />
                  <PartyPopper className="text-blue-500 animate-bounce delay-200" size={32} />
                </div>
              </div>
            </div>
          )}
          <div className="md:hidden w-full flex justify-center mt-8 mb-6">
            <button
              className="bg-white border-4 border-black px-4 py-3 rounded-xl shadow-[2px_2px_0_0_#000] font-black italic uppercase text-xs hover:bg-zinc-200
              transition-colors flex items-center gap-2 text-red-600 tracking-wide"
              onClick={leaveGame}
            >
              <LogOut size={14} />
              Leave Match
            </button>
          </div>
        </>
      )}
    </>
  );
};
