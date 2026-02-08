import { get, off, onValue, ref, remove, set } from 'firebase/database';
import { db } from '../firebase';
import { LOBBY_STATUS } from '../constants';

export const subscribeToLobbyPlayers = (lobbyId, callback) => {
  const playersRef = ref(db, `lobby/${lobbyId}/players`);

  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    callback(players);
  });

  return () => off(playersRef);
};

export const addPlayerToLobby = async (lobbyId, playerName, pin, isHost = false) => {
  const lobbyRef = ref(db, `lobby/${lobbyId}`);
  const lobbySnapshot = await get(lobbyRef);

  if (!lobbySnapshot.exists()) return false;

  const lobbyStatus = lobbySnapshot.val().status;
  if (lobbyStatus === LOBBY_STATUS.WAITING || lobbyStatus === LOBBY_STATUS.IN_GAME) {
    const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
    const playerSnapshot = await get(playerRef);
    if (playerSnapshot.exists()) {
      const playerPin = playerSnapshot.val().pin;
      return playerPin === pin;
    }
  } else if (lobbyStatus === LOBBY_STATUS.FINISHED) {
    return false;
  }

  const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
  await set(playerRef, {
    pin,
    host: isHost,
    joinedAt: Date.now(),
  });

  return true;
};

export const removePlayerFromLobby = async (lobbyId, playerName) => {
  const playerRef = ref(db, `lobby/${lobbyId}/players/${playerName}`);
  await remove(playerRef);
};
