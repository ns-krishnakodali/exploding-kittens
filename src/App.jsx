import { useState } from 'react';

import { Loading, Toast } from './components';
import { GENERIC_ERROR, GAME_STATE, LOBBY_STATUS, UNKOWN_ERROR } from './constants';
import { GameArenaPage, LandingPage, LobbyPage } from './pages';
import {
  addPlayerToLobbyService,
  createLobbyService,
  getLobbyIdService,
  startGameService,
  updateLobbyStatusService,
} from './services';

const App = () => {
  const [lobbyId, setLobbyId] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState(GAME_STATE.LANDING);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleCreateGame = async (newPlayerName, pin) => {
    setLoading(true);

    const [newLobbyId, newGameId] = await createLobbyService();
    const gameStateInfo = await addPlayerToLobbyService(newLobbyId, newPlayerName, pin, true);

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

      setLobbyId(existingLobbyId);
      setPlayerName(newPlayerName);
      setGameId(displayCode);
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
      updateLobbyStatusService(lobbyId, LOBBY_STATUS.IN_GAME);
      setGameState(GAME_STATE.GAME);
    } else {
      setToast({ message: 'Unable to start the game', type: 'error' });
      updateLobbyStatusService(lobbyId, LOBBY_STATUS.WAITING);
      setGameState(GAME_STATE.LOBBY);
    }
  };

  const handleLeaveGame = () => {
    setGameState(GAME_STATE.LANDING);
  };

  const startGame = () => {
    setGameState(GAME_STATE.GAME);
  };

  const endGame = () => {
    setGameState(GAME_STATE.LANDING);
  };

  if (loading) return <Loading />;

  return (
    <div className="text-black font-sans selection:bg-red-200">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <main className="mx-auto px-8 py-2">
        {gameState === GAME_STATE.LANDING && (
          <LandingPage onCreate={handleCreateGame} onJoin={handleJoinGame} />
        )}
        {gameState === GAME_STATE.LOBBY && (
          <LobbyPage
            lobbyId={lobbyId}
            gameId={gameId}
            playerName={playerName}
            onStart={handleStartGame}
            onLeave={handleLeaveGame}
            startGame={startGame}
          />
        )}
        {gameState === GAME_STATE.GAME && (
          <GameArenaPage
            lobbyId={lobbyId}
            gameId={gameId}
            playerName={playerName}
            endGame={endGame}
          />
        )}
      </main>
    </div>
  );
};

export default App;
