import { useState } from 'react';
import { Bomb } from 'lucide-react';

import { Toast } from './components';
import { GAME_STATE, LOBBY_STATUS } from './constants';
import { GameEngine, LandingPage, LobbyPage } from './pages';
import {
  addPlayerToLobby,
  createLobby,
  getLobbyId,
  startGameService,
  updateLobbyStatus,
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

    const [newLobbyId, newGameId] = await createLobby();
    const gameStateInfo = await addPlayerToLobby(newLobbyId, newPlayerName, pin, true);

    setLoading(false);
    setLobbyId(newLobbyId);
    setPlayerName(newPlayerName);
    setGameId(newGameId);
    setGameState(gameStateInfo);
  };

  const handleJoinGame = async (displayCode, newPlayerName, pin) => {
    setLoading(true);

    try {
      const existingLobbyId = await getLobbyId(displayCode);
      const gameStateInfo = await addPlayerToLobby(existingLobbyId, newPlayerName, pin);

      if (gameStateInfo === GAME_STATE.LANDING) {
        setToast({ message: 'Something went wrong, try again', type: 'error' });
        setGameState(gameStateInfo);
        return;
      }

      setLobbyId(existingLobbyId);
      setPlayerName(newPlayerName);
      setGameId(displayCode);
      setGameState(gameStateInfo);
    } catch (err) {
      console.error(err);
      setToast({ message: 'An unknown error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    const status = startGameService(lobbyId);
    if (status) {
      updateLobbyStatus(lobbyId, LOBBY_STATUS.IN_GAME);
      setGameState(GAME_STATE.GAME);
    } else {
      setToast({ message: 'Unable to start the game', type: 'error' });
      updateLobbyStatus(lobbyId, LOBBY_STATUS.WAITING);
      setGameState(GAME_STATE.LOBBY);
    }
  };

  const handleLeaveGame = () => {
    setGameState(GAME_STATE.LANDING);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4E1] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Bomb size={64} className="text-red-600 mx-auto animate-bounce" />
          <p className="text-2xl font-black italic uppercase text-red-600">
            Priming the Felines...
          </p>
        </div>
      </div>
    );
  }

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
          />
        )}
        {gameState === GAME_STATE.GAME && (
          <GameEngine lobbyId={lobbyId} gameId={gameId} playerName={playerName} />
        )}
      </main>
    </div>
  );
};

export default App;
