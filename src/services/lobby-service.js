import { get, push, ref, set, update } from 'firebase/database';

import { db } from '../firebase';
import { generateUniqueCode } from '../utils';
import { LOBBY_STATUS } from '../constants';

export const createLobby = async () => {
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

export const getLobbyId = async (displayCode) => {
  const codeRef = ref(db, `lobbyCodes/${displayCode}`);
  const snapshot = await get(codeRef);

  if (!snapshot.exists()) {
    throw new Error('Invalid room code');
  }

  const lobbyId = snapshot.val();
  return lobbyId;
};

export const updateLobbyStatus = async (lobbyId, status) => {
  const lobbyRef = ref(db, `lobby/${lobbyId}`);
  await update(lobbyRef, { status });
};
