import { useState } from 'react';
import { Bomb } from 'lucide-react';

import { Toast } from './components';
import { GAME_STATES } from './constants';
import { LandingPage, LobbyPage } from './pages';
import { addPlayerToLobby, createLobby, getLobbyId } from './services';

const App = () => {
  const [lobbyId, setLobbyId] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState(GAME_STATES.LANDING);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleCreateGame = async (newPlayerName, pin) => {
    setLoading(true);

    const [newLobbyId, newGameId] = await createLobby();
    await addPlayerToLobby(newLobbyId, newPlayerName, pin, true);

    setLobbyId(newLobbyId);
    setPlayerName(newPlayerName);
    setGameId(newGameId);
    setGameState(GAME_STATES.LOBBY);
    setLoading(false);
  };

  const handleJoinGame = async (displayCode, newPlayerName, pin) => {
    setLoading(true);

    try {
      const existingLobbyId = await getLobbyId(displayCode);
      const status = await addPlayerToLobby(existingLobbyId, newPlayerName, pin);
      if (!status) {
        setToast({ message: 'Something went wrong, try again', type: 'error' });
        return;
      }

      setLobbyId(existingLobbyId);
      setPlayerName(newPlayerName);
      setGameId(displayCode);
      setGameState(GAME_STATES.LOBBY);
    } catch (err) {
      console.error(err);
      setToast({ message: 'An unknown error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    setGameState(GAME_STATES.GAME);
  };

  const handleLeaveGame = () => {
    setGameState(GAME_STATES.LANDING);
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
    <div className="min-h-screen bg-[#F8F4E1] text-black font-sans selection:bg-red-200">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <main className="max-w-6xl mx-auto px-4 py-2">
        {gameState === GAME_STATES.LANDING && (
          <LandingPage onCreate={handleCreateGame} onJoin={handleJoinGame} />
        )}
        {gameState === GAME_STATES.LOBBY && (
          <LobbyPage
            lobbyId={lobbyId}
            gameId={gameId}
            playerName={playerName}
            onStart={handleStartGame}
            onLeave={handleLeaveGame}
          />
        )}
        {gameState === GAME_STATES.GAME && <GamePlaceholder onLeave={handleLeaveGame} />}
      </main>
    </div>
  );
};

export default App;
