import { get, off, onValue, ref, set } from 'firebase/database';

import { CARD_TYPES } from '../constants';
import { db } from '../firebase';

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

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let idx = shuffled.length - 1; idx > 0; idx--) {
    const sIdx = Math.floor(Math.random() * (idx + 1));
    [shuffled[idx], shuffled[sIdx]] = [shuffled[sIdx], shuffled[idx]];
  }
  return shuffled;
};

export const subscribeToGameLobby = (lobbyId, callback) => {
  const lobbyRef = ref(db, `lobby/${lobbyId}`);

  const listener = (snapshot) => {
    callback(snapshot.val() ?? {});
  };

  onValue(lobbyRef, listener);
  return () => off(lobbyRef, 'value', listener);
};

export const startGameService = async (lobbyId) => {
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

    await set(ref(db, `lobby/${lobbyId}/players`), playersInfo);
    await set(ref(db, `lobby/${lobbyId}/cardsDeck`), cardsDeck);
    await set(ref(db, `lobby/${lobbyId}/statusMessage`), '');
  } catch (error) {
    console.error('Error fetching card details:', error);
    return false;
  }

  return true;
};

export const getCardDetails = async (cards) => {
  if (!Array.isArray(cards) || cards.length === 0) return {};

  try {
    const cardImagesRef = ref(db, 'cardImages');
    const snapshot = await get(cardImagesRef);

    if (!snapshot.exists()) {
      return {};
    }

    const allCardImages = snapshot.val();
    const cardImages = {};

    cards.forEach((cardName) => {
      if (allCardImages[cardName]) {
        cardImages[cardName] = allCardImages[cardName]?.url || '';
      }
    });

    return cardImages;
  } catch (error) {
    console.error('Error fetching card images:', error);
    return {};
  }
};
