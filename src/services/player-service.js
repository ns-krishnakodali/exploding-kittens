import { get, off, onValue, ref, remove, set } from 'firebase/database';

import { db } from '../firebase';
import { GAME_STATE, LOBBY_STATUS } from '../constants';

export const subscribeToLobbyPlayers = (lobbyId, callback) => {
  const playersRef = ref(db, `lobby/${lobbyId}/players`);

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    callback(players);
  });

  return () => off(playersRef);
};

export const getPlayerCards = (lobbyDetails, playerName, allCardImages) => {
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

export const getPlayerDetails = (lobbyDetails) => {
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

export const addPlayerToLobby = async (lobbyId, playerName, pin, isHost = false) => {
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

  if (lobbyStatus === LOBBY_STATUS.WAITING || lobbyStatus === LOBBY_STATUS.IN_GAME) {
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

export const updatePlayerCards = async (lobbyId, playerName, updatedCards) => {
  try {
    const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}/deck`);
    await set(playerRef, updatedCards);
    return true;
  } catch (error) {
    console.error('Error updating player cards:', error);
    return false;
  }
};

export const removePlayerFromLobby = async (lobbyId, playerName) => {
  try {
    const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
    await remove(playerRef);
    return true;
  } catch (err) {
    console.log('An error occurred when removing player', err);
    return false;
  }
};

export const makePlayerInactive = async (lobbyId, playerName) => {
  try {
    const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
    await set(playerRef, { inGame: false }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error handling player explosion:', error);
    return false;
  }
};

const lobbyStatusToGameState = (status) => {
  switch (status) {
    case LOBBY_STATUS.WAITING:
      return GAME_STATE.LOBBY;
    case LOBBY_STATUS.IN_GAME:
      return GAME_STATE.GAME;
    case LOBBY_STATUS.FINISHED:
    default:
      return GAME_STATE.LANDING;
  }
};
