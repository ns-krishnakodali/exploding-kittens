import { get, off, onValue, push, ref, set, update } from 'firebase/database';

import { LOBBY_STATUS } from '../constants';
import { db } from '../firebase';
import { generateUniqueCode } from '../utils';

export const subscribeToGameStatus = (lobbyId, callback) => {
  const lobbyStatusRef = ref(db, `lobby/${lobbyId}/status`);

  onValue(lobbyStatusRef, (snapshot) => {
    const status = snapshot.val() || LOBBY_STATUS.WAITING;
    callback(status);
  });

  return () => off(lobbyStatusRef);
};

export const subscribeToGameLobby = (lobbyId, callback) => {
  const lobbyRef = ref(db, `lobby/${lobbyId}`);

  const listener = (snapshot) => {
    callback(snapshot.val() ?? {});
  };

  onValue(lobbyRef, listener);
  return () => off(lobbyRef, 'value', listener);
};

export const createLobbyService = async () => {
  const lobbiesRef = ref(db, 'lobby');
  const newLobbyRef = push(lobbiesRef);

  const lobbyId = newLobbyRef.key;
  const displayCode = generateUniqueCode(6);

  await set(newLobbyRef, {
    status: LOBBY_STATUS.WAITING,
    createdAt: Date.now(),
  });

  await set(ref(db, `lobbyCodes/${displayCode}`), lobbyId);

  return [lobbyId, displayCode];
};

export const getLobbyIdService = async (displayCode) => {
  const codeRef = ref(db, `lobbyCodes/${displayCode.trim()}`);
  const snapshot = await get(codeRef);

  if (!snapshot.exists()) {
    throw new Error('Invalid room code');
  }

  const lobbyId = snapshot.val();
  return lobbyId;
};

export const updateLobbyStatusService = async (lobbyId, status) => {
  const lobbyRef = ref(db, `lobby/${lobbyId}`);
  await update(lobbyRef, { status });
};
