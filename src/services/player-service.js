import { get, off, onValue, ref, remove, set } from 'firebase/database';

import { db } from '../firebase';
import { GAME_STATE, LOBBY_STATUS } from '../constants';

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

export const subscribeToLobbyPlayers = (lobbyId, callback) => {
  const playersRef = ref(db, `lobby/${lobbyId}/players`);

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    callback(players);
  });

  return () => off(playersRef);
};

export const getPlayerCards = async (lobbyId, playerName) => {
  const playersRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);

  const playerSnapshot = await get(playersRef);
  if (!playerSnapshot.exists()) return [];

  return playerSnapshot.val()?.deck ?? [];
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

export const removePlayerFromLobby = async (lobbyId, playerName) => {
  const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
  await remove(playerRef);
};
