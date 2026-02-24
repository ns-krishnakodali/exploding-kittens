import { useEffect, useState } from 'react';

import { Loading, Toast } from './components';
import { GENERIC_ERROR, GAME_STATE, LOBBY_STATUS, UNKOWN_ERROR, LOBBY_DETAILS } from './constants';
import { GameArenaPage, LandingPage, LobbyPage } from './pages';
import {
  addPlayerToLobbyService,
  createLobbyService,
  getLobbyIdService,
  startGameService,
  updateLobbyStatusService,
} from './services';
import { deleteStorageValue, getStorageValue, setStorageValue } from './utils';

const App = () => {
  const [lobbyId, setLobbyId] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState(GAME_STATE.LANDING);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const lobbyDetails = getStorageValue(LOBBY_DETAILS, {});
    if (Object.keys(lobbyDetails).length === 0) {
      setGameState(GAME_STATE.LANDING);
      return;
    }

    setLobbyId(lobbyDetails?.lobbyId);
    setGameId(lobbyDetails?.gameId);
    setPlayerName(lobbyDetails?.playerName);
    setGameState(lobbyDetails?.gameState);
  }, []);

  const handleCreateGame = async (newPlayerName, pin) => {
    setLoading(true);

    const [newLobbyId, newGameId] = await createLobbyService();
    const gameStateInfo = await addPlayerToLobbyService(newLobbyId, newPlayerName, pin, true);

    setStorageValue(LOBBY_DETAILS, {
      lobbyId: newLobbyId,
      gameId: newGameId,
      playerName: newPlayerName,
      gameState: gameStateInfo,
    });

    setLoading(false);
    setLobbyId(newLobbyId);
    setPlayerName(newPlayerName);
    setGameId(newGameId);
    setGameState(gameStateInfo);
  };

  const handleJoinGame = async (displayCode, newPlayerName, pin) => {
    setLoading(true);

    try {
      const existingLobbyId = await getLobbyIdService(displayCode);
      const gameStateInfo = await addPlayerToLobbyService(existingLobbyId, newPlayerName, pin);

      if (gameStateInfo === GAME_STATE.LANDING) {
        setToast({ message: GENERIC_ERROR, type: 'error' });
        setGameState(gameStateInfo);
        return;
      }

      setStorageValue(LOBBY_DETAILS, {
        lobbyId: existingLobbyId,
        gameId: displayCode,
        playerName: newPlayerName,
        gameState: gameStateInfo,
      });

      setLobbyId(existingLobbyId);
      setGameId(displayCode);
      setPlayerName(newPlayerName);
      setGameState(gameStateInfo);
    } catch (err) {
      console.error(err);
      setToast({ message: UNKOWN_ERROR, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    const status = startGameService(lobbyId, playerName);
    if (status) {
      setStorageValue(LOBBY_DETAILS, { lobbyId, gameId, playerName, gameState: GAME_STATE.GAME });
      updateLobbyStatusService(lobbyId, LOBBY_STATUS.IN_GAME);
      setGameState(GAME_STATE.GAME);
    } else {
      setToast({ message: 'Unable to start the game', type: 'error' });
      updateLobbyStatusService(lobbyId, LOBBY_STATUS.WAITING);
      setGameState(GAME_STATE.LOBBY);
    }
  };

  const startGame = () => {
    setGameState(GAME_STATE.GAME);
  };

  const leaveGame = () => {
    deleteStorageValue(LOBBY_DETAILS);
    setGameState(GAME_STATE.LANDING);
  };

  if (loading) return <Loading />;

  return (
    <div className="text-black font-sans selection:bg-red-200">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <main className="mx-auto px-3 md:px-8 py-2">
        {gameState === GAME_STATE.LANDING && (
          <LandingPage onCreate={handleCreateGame} onJoin={handleJoinGame} />
        )}
        {gameState === GAME_STATE.LOBBY && (
          <LobbyPage
            lobbyId={lobbyId}
            gameId={gameId}
            playerName={playerName}
            onStart={handleStartGame}
            startGame={startGame}
            leaveGame={leaveGame}
          />
        )}
        {gameState === GAME_STATE.GAME && (
          <GameArenaPage
            lobbyId={lobbyId}
            gameId={gameId}
            playerName={playerName}
            leaveGame={leaveGame}
          />
        )}
      </main>
    </div>
  );
};

export default App;
