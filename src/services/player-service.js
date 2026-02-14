import { child, get, off, onValue, ref, remove, set, update } from 'firebase/database';

import { CARD_TYPES, GAME_STATE, LOBBY_STATUS, TRANSFER_ERROR } from '../constants';
import { db } from '../firebase';

export const subscribeToLobbyPlayers = (lobbyId, callback) => {
  const playersRef = ref(db, `lobby/${lobbyId}/players`);

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    callback(players);
  });

  return () => off(playersRef);
};

export const getPlayerCardsService = (lobbyDetails, playerName, allCardImages) => {
  try {
    const playerCardDetails = (lobbyDetails?.players?.[playerName]?.deck || [])
      .filter((cardName) => allCardImages[cardName])
      .map((cardName) => ({
        name: cardName,
        url: allCardImages[cardName]?.url || '',
      }));

    return playerCardDetails;
  } catch (error) {
    console.error('Error fetching card images:', error);
    return [];
  }
};

export const getPlayerDetailsService = (lobbyDetails) => {
  const playerDetails = Object.entries(lobbyDetails?.players || {})
    .map(([name, data]) => ({ name, ...data }))
    .sort((p1, p2) => {
      if (p1.host && !p2.host) return -1;
      if (!p1.host && p2.host) return 1;
      return p1.joinedAt - p2.joinedAt;
    })
    .map((player) => ({
      name: player.name,
      cardsCount: player.deck?.length || 0,
      inGame: player.inGame,
    }));

  return playerDetails || [];
};

export const addPlayerToLobbyService = async (lobbyId, playerName, pin, isHost = false) => {
  const lobbyRef = ref(db, `lobby/${lobbyId}`);
  const lobbySnapshot = await get(lobbyRef);

  if (!lobbySnapshot.exists()) return GAME_STATE.LANDING;

  const lobbyData = lobbySnapshot.val();
  const lobbyStatus = lobbyData.status;
  const gameState = lobbyStatusToGameState(lobbyStatus);

  if (lobbyStatus === LOBBY_STATUS.FINISHED) return GAME_STATE.LANDING;

  const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
  const playerSnapshot = await get(playerRef);

  if (playerSnapshot.exists()) {
    const existingPin = playerSnapshot.val().pin;
    if (existingPin !== pin) return GAME_STATE.LANDING;
    return gameState;
  }

  if (lobbyStatus === LOBBY_STATUS.WAITING) {
    await set(playerRef, {
      pin,
      host: isHost,
      inGame: true,
      joinedAt: Date.now(),
    });

    return gameState;
  }

  return GAME_STATE.LANDING;
};

// Transfers specified card from Player 1 to Player 2.
export const transferPlayerCardsService = async (
  lobbyId,
  playerName1,
  playerName2,
  cardName,
  statusMessage = ''
) => {
  try {
    const updates = {};
    if (cardName) {
      const [player1Snap, player2Snap] = await Promise.all([
        get(ref(db, `lobby/${lobbyId}/players/${playerName1}/deck`)),
        get(ref(db, `lobby/${lobbyId}/players/${playerName2}/deck`)),
      ]);

      const player1Deck = player1Snap.val() || [];
      const player2Deck = player2Snap.val() || [];

      const cardIdx = player1Deck.findIndex((pCardName) => pCardName === cardName);
      if (cardIdx === -1) {
        updates[`lobby/${lobbyId}/statusMessage`] = TRANSFER_ERROR;
        await update(ref(db), updates);
        return true;
      }

      const [removedCard] = player1Deck.splice(cardIdx, 1);
      removedCard.startsWith(CARD_TYPES.DEFUSE)
        ? player2Deck.unshift(removedCard)
        : player2Deck.push(removedCard);

      updates[`lobby/${lobbyId}/players/${playerName1}/deck`] = player1Deck;
      updates[`lobby/${lobbyId}/players/${playerName2}/deck`] = player2Deck;

      if (statusMessage) updates[`/lobby/${lobbyId}/statusMessage`] = statusMessage;
    } else {
      updates[`lobby/${lobbyId}/statusMessage`] = TRANSFER_ERROR;
    }

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error('Error updating player cards:', error);
    return false;
  }
};

// Removes a player from the lobby and marks the lobby as CANCELLED if no players remain
export const removePlayerFromLobbyService = async (lobbyId, playerName) => {
  try {
    const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
    const playerSnapshot = await get(playerRef);
    const wasHost = playerSnapshot.exists() && playerSnapshot.val().host;

    await remove(playerRef);

    const lobbyRef = ref(db, `lobby/${lobbyId}`);
    const playersSnapshot = await get(child(lobbyRef, 'players'));
    const players = playersSnapshot.exists() ? playersSnapshot.val() : null;

    if (!players || Object.keys(players).length === 0) {
      await update(lobbyRef, {
        status: LOBBY_STATUS.CANCELLED,
      });
      return true;
    }

    if (wasHost) {
      const playersArray = Object.entries(players).map(([name, data]) => ({
        name,
        ...data,
      }));

      playersArray.sort((a, b) => a.joinedAt - b.joinedAt);
      const newHost = playersArray[0];
      const newHostRef = ref(db, `lobby/${lobbyId}/players/${newHost.name}/host`);

      await set(newHostRef, true);
    }
    return true;
  } catch (err) {
    console.error('An error occurred when removing player', err);
    return false;
  }
};

export const makePlayerInactiveService = async (lobbyId, playerName) => {
  try {
    const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
    await set(playerRef, { inGame: false }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error handling player explosion:', error);
    return false;
  }
};

// Private Functions

const lobbyStatusToGameState = (status) => {
  switch (status) {
    case LOBBY_STATUS.WAITING:
      return GAME_STATE.LOBBY;
    case LOBBY_STATUS.IN_GAME:
      return GAME_STATE.GAME;
    case LOBBY_STATUS.FINISHED:
    case LOBBY_STATUS.CANCELLED:
    default:
      return GAME_STATE.LANDING;
  }
};
