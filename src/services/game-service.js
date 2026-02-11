import { get, ref, runTransaction, update } from 'firebase/database';

import { CARD_TYPES } from '../constants';
import { db } from '../firebase';

export const startGameService = async (lobbyId, hostName) => {
  if (!lobbyId) {
    console.error('Invalid lobby ID');
    return false;
  }

  try {
    const cardsRef = ref(db, 'cards');
    const playersRef = ref(db, `lobby/${lobbyId}/players`);

    const cardsSnapshot = await get(cardsRef);
    const playersSnapshot = await get(playersRef);
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

    cardsDeck = shuffleDeck(cardsDeck);

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

export const getAllCardsImages = async () => {
  try {
    const cardImagesRef = ref(db, 'cardImages');
    const snapshot = await get(cardImagesRef);

    if (!snapshot.exists()) return {};

    return snapshot.val();
  } catch (error) {
    console.error('Error fetching card images:', error);
    return {};
  }
};

export const updatePostDrawState = async (
  lobbyId,
  playerName,
  nextPlayerName,
  playerCards,
  inGameStatus,
  cardsDeck,
  statusMessage = ''
) => {
  try {
    const updates = {};

    if (nextPlayerName !== undefined && nextPlayerName !== null)
      updates[`/lobby/${lobbyId}/currentPlayer`] = nextPlayerName;
    updates[`/lobby/${lobbyId}/players/${playerName}/deck`] = playerCards;
    updates[`/lobby/${lobbyId}/players/${playerName}/inGame`] = inGameStatus;
    updates[`/lobby/${lobbyId}/cardsDeck`] = cardsDeck;
    updates[`/lobby/${lobbyId}/statusMessage`] = statusMessage;

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

export const updatePostPlayState = async (
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

    if (nextPlayerName !== undefined && nextPlayerName !== null)
      updates[`/lobby/${lobbyId}/currentPlayer`] = nextPlayerName;
    updates[`/lobby/${lobbyId}/players/${playerName}/deck`] = playerCards;
    updates[`/lobby/${lobbyId}/usedCardsDetails`] = usedCardsDetails;
    updates[`/lobby/${lobbyId}/statusMessage`] = statusMessage;
    if (attackStack !== null && attackStack >= 0)
      updates[`/lobby/${lobbyId}/attackStack`] = attackStack;
    if (deckSnapshot !== null) {
      const { original: cardsDeck, backup: backupCardsDeck } = deckSnapshot;
      updates[`/lobby/${lobbyId}/cardsDeck`] = cardsDeck;
      updates[`/lobby/${lobbyId}/backupCardsDeck`] = backupCardsDeck;
    }

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error('Error updating post play state:', error);
    return false;
  }
};

// Updates cards deck and resets the status message.
export const updateCardsDeck = async (lobbyId, cardsDeck) => {
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

// Sets the game winner for the lobby
export const setGameWinner = async (lobbyId, winnerName) => {
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

export const shuffleDeck = (deck) => {
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
