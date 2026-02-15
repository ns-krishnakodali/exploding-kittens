import { get, ref, remove, runTransaction, update } from 'firebase/database';

import { CARD_TYPES, CAT_CARD_NAMES, DRAW_CARD, PLAY_CARD, WILD_CAT_CARD } from '../constants';
import { db } from '../firebase';

export const startGameService = async (lobbyId, hostName) => {
  if (!lobbyId) {
    console.error('Invalid lobby ID');
    return false;
  }

  try {
    const cardsSnapshot = await get(ref(db, 'cards'));
    const playersSnapshot = await get(ref(db, `lobby/${lobbyId}/players`));
    if (!cardsSnapshot.exists() || !playersSnapshot.exists()) return false;

    const cardsInfo = cardsSnapshot.val();
    const playersInfo = playersSnapshot.val();

    const playersCount = Object.entries(playersInfo).length;
    if (playersCount < 2) {
      console.error('Not enough players to start the game');
      return false;
    }

    let cardsDeck = [];
    let defuseCards = [];
    const explodingCards = [];

    Object.values(cardsInfo).forEach((group) => {
      group.forEach(({ name, count }) => {
        for (let idx = 0; idx < count; idx++) {
          if (name.startsWith(CARD_TYPES.DEFUSE)) defuseCards.push(name);
          else if (name.startsWith(CARD_TYPES.EXPLODING_KITTEN)) explodingCards.push(name);
          else cardsDeck.push(name);
        }
      });
    });

    Object.values(playersInfo).forEach((player) => {
      const defuseCard = getDefuseCard(defuseCards);
      const randomCards = getRandomCards(cardsDeck);
      player.deck = [defuseCard, ...randomCards];
      cardsDeck = removeCardsFromDeck(cardsDeck, randomCards);
    });

    cardsDeck.push(...explodingCards.slice(0, playersCount - 1));
    if (playersCount < 10 && defuseCards.length >= 1) {
      cardsDeck.push(defuseCards[0]);
    }

    cardsDeck = shuffleDeckService(cardsDeck);

    await update(ref(db, `lobby/${lobbyId}`), {
      players: playersInfo,
      cardsDeck: cardsDeck,
      statusMessage: '',
      attackStack: 0,
      currentPlayer: hostName,
    });

    return true;
  } catch (error) {
    console.error('Error fetching card details:', error);
    return false;
  }
};

export const processNopeActionService = async (
  lobbyId,
  playerName,
  playerCards,
  cardName,
  usedCardsDetails,
  nonNopeIdx
) => {
  const nonNopeCardDetails = usedCardsDetails[nonNopeIdx];
  const nullifyNope = nonNopeIdx % 2 === 1;

  const lobbyRef = ref(db, `lobby/${lobbyId}`);
  await runTransaction(lobbyRef, (lobby) => {
    lobby.players[playerName].deck = playerCards;
    lobby.usedCardsDetails = [{ playerName, cardName, action: PLAY_CARD }, ...usedCardsDetails];

    if (nonNopeCardDetails?.selectedPlayerName)
      lobby.currentPlayer = nullifyNope
        ? nonNopeCardDetails.selectedPlayerName
        : nonNopeCardDetails.playerName;

    const nonNopeCardName = nonNopeCardDetails?.cardName;
    if (
      nonNopeCardName.startsWith(CARD_TYPES.ATTACK) ||
      nonNopeCardName.startsWith(CARD_TYPES.TARGETTED_ATTACK)
    ) {
      lobby.attackStack = Math.max(lobby.attackStack + (nullifyNope ? 2 : -2), 0);
    } else if (nonNopeCardName.startsWith(CARD_TYPES.SKIP) && lobby.attackStack > 0) {
      lobby.attackStack = lobby.attackStack + (nullifyNope ? -1 : 1);
    } else if (
      nonNopeCardName.startsWith(CARD_TYPES.SHUFFLE) &&
      (lobby?.cardsDeckBackup ?? []).length !== 0
    ) {
      const cardsDeckBackup = lobby.cardsDeckBackup;
      lobby.cardsDeckBackup = lobby.cardsDeck;
      lobby.cardsDeck = cardsDeckBackup;
    } else if (
      nonNopeCardName.startsWith(CARD_TYPES.FAVOR) ||
      CAT_CARD_NAMES.some((cardName) => nonNopeCardName === cardName)
    ) {
      const notifyRequest = lobby?.notifyRequest ?? {};
      if (Object.keys(notifyRequest).length > 0) lobby.notifyRequestBackup = notifyRequest;
      lobby.notifyRequest =
        nullifyNope && Object.keys(lobby?.notifyRequestBackup ?? {}).length > 0
          ? lobby.notifyRequestBackup
          : null;
    }
    lobby.statusMessage = `${playerName} played a Nope`;

    return lobby;
  });
};

export const lobbyExistsStatus = async (lobbyId) => {
  if (!lobbyId) return false;

  try {
    const snapshot = await get(ref(db, `lobby/${lobbyId}`));
    return snapshot.exists();
  } catch (error) {
    console.error(`Error checking lobby ${lobbyId}:`, error);
    return false;
  }
};

export const getAllCardsImages = async () => {
  try {
    const snapshot = await get(ref(db, 'cardImages'));
    if (!snapshot.exists()) return {};

    return snapshot.val();
  } catch (error) {
    console.error('Error fetching card images:', error);
    return {};
  }
};

export const getCatCardsCountService = (usedCardsDetails, playerName, cardName) => {
  let cardsCount = 0;
  for (const usedCardDetail of usedCardsDetails) {
    if (usedCardDetail?.playerName !== playerName || usedCardDetail?.action === DRAW_CARD) break;
    if (!CAT_CARD_NAMES.includes(usedCardDetail?.cardName)) break;
    if (
      usedCardDetail?.cardName !== cardName &&
      usedCardDetail?.cardName !== WILD_CAT_CARD &&
      cardName !== WILD_CAT_CARD
    )
      break;
    cardsCount++;
  }

  return cardsCount;
};

export const updateDrawCardService = async (
  lobbyId,
  playerName,
  nextPlayerName,
  playerCards,
  inGameStatus,
  cardsDeck,
  usedCardsDetails,
  statusMessage = ''
) => {
  try {
    const updates = {};

    if (nextPlayerName !== undefined && nextPlayerName !== null)
      updates[`/lobby/${lobbyId}/currentPlayer`] = nextPlayerName;
    updates[`/lobby/${lobbyId}/players/${playerName}/deck`] = playerCards;
    updates[`/lobby/${lobbyId}/players/${playerName}/inGame`] = inGameStatus;
    updates[`/lobby/${lobbyId}/cardsDeck`] = cardsDeck;
    updates[`/lobby/${lobbyId}/usedCardsDetails`] = usedCardsDetails;
    updates[`/lobby/${lobbyId}/notifyRequestBackup`] = null;
    if (statusMessage) updates[`/lobby/${lobbyId}/statusMessage`] = statusMessage;

    await runTransaction(ref(db, `/lobby/${lobbyId}/attackStack`), (currentAttackStack) => {
      if (!currentAttackStack || currentAttackStack <= 0) return currentAttackStack;
      return currentAttackStack - 1;
    });

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error('Error updating post draw state:', error);
    return false;
  }
};

export const updatePlayCardService = async (
  lobbyId,
  playerName,
  nextPlayerName,
  playerCards,
  usedCardsDetails,
  statusMessage,
  attackStack = null,
  deckSnapshot = null
) => {
  try {
    const updates = {};

    if (nextPlayerName) updates[`/lobby/${lobbyId}/currentPlayer`] = nextPlayerName;
    updates[`/lobby/${lobbyId}/players/${playerName}/deck`] = playerCards;
    updates[`/lobby/${lobbyId}/usedCardsDetails`] = usedCardsDetails;
    updates[`/lobby/${lobbyId}/statusMessage`] = statusMessage;
    if (attackStack !== null && attackStack >= 0)
      updates[`/lobby/${lobbyId}/attackStack`] = attackStack;
    if (deckSnapshot !== null) {
      const { original: cardsDeck, backup: cardsDeckBackup } = deckSnapshot;
      updates[`/lobby/${lobbyId}/cardsDeck`] = cardsDeck;
      updates[`/lobby/${lobbyId}/cardsDeckBackup`] = cardsDeckBackup;
    }

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error('Error updating post play state:', error);
    return false;
  }
};

// Updates cards deck and resets the status message.
export const updateCardsDeckService = async (lobbyId, cardsDeck) => {
  try {
    await update(ref(db, `lobby/${lobbyId}`), {
      cardsDeck,
      statusMessage: '',
    });
    return true;
  } catch (error) {
    console.error('Error updating cards deck:', error);
    return false;
  }
};

// Sets the current defined notify request for the lobby.
export const setNotifyRequestService = async (lobbyId, notifyRequest, statusMessage = '') => {
  try {
    const updates = {
      [`lobby/${lobbyId}/notifyRequest`]: notifyRequest,
    };
    if (statusMessage) updates[`lobby/${lobbyId}/statusMessage`] = statusMessage;

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error(`Error setting notify request for lobby ${lobbyId}:`, error);
    return false;
  }
};

// Sets the game winner for the lobby
export const setGameWinnerService = async (lobbyId, winnerName) => {
  try {
    await update(ref(db, `lobby/${lobbyId}`), {
      winnerName,
    });
    return true;
  } catch (error) {
    console.error('Error setting game winner:', error);
    return false;
  }
};

// Removes a notify request from the lobby
export const removeNotifyRequestService = async (lobbyId) => {
  try {
    await remove(ref(db, `lobby/${lobbyId}/notifyRequest`));
  } catch (error) {
    console.error(`Error removing notify request for lobby ${lobbyId}:`, error);
  }
};

// Shuffles the deck randomly and returns it.
export const shuffleDeckService = (deck) => {
  const shuffled = [...deck];
  for (let idx = shuffled.length - 1; idx > 0; idx--) {
    const sIdx = Math.floor(Math.random() * (idx + 1));
    [shuffled[idx], shuffled[sIdx]] = [shuffled[sIdx], shuffled[idx]];
  }
  return shuffled;
};

// Private functions

const getRandomCards = (deck, count = 6) => {
  const shuffled = [...deck].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const getDefuseCard = (defuseCardsArray) => {
  if (defuseCardsArray.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * defuseCardsArray.length);
  const defuseCard = defuseCardsArray[randomIndex];
  defuseCardsArray.splice(randomIndex, 1);
  return defuseCard;
};

const removeCardsFromDeck = (deck, cardsToRemove) => {
  const cardDeckCopy = [...deck];
  cardsToRemove.forEach((card) => {
    const index = cardDeckCopy.indexOf(card);
    if (index > -1) {
      cardDeckCopy.splice(index, 1);
    }
  });
  return cardDeckCopy;
};
