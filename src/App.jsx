import { useState } from 'react';
import { Bomb } from 'lucide-react';

import { LandingPage, LobbyPage } from './pages';

// --- Constants ---
const APP_STATES = {
  LANDING: 'LANDING',
  LOBBY: 'LOBBY',
  GAME: 'GAME',
};

const App = () => {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(APP_STATES.LANDING);
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Mock Handlers (Local State Only) ---
  const handleCreateGame = (playerName, pin) => {
    setLoading(true);
    // Simulate minor delay for feel
    setTimeout(() => {
      const mockUid = 'user-' + Math.random().toString(36).substr(2, 9);
      const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();

      const newPlayer = { uid: mockUid, name: playerName, pin: pin, isHost: true };
      const newGame = {
        id: gameId,
        hostId: mockUid,
        status: 'lobby',
        players: [newPlayer],
        createdAt: Date.now(),
      };

      setUser(newPlayer);
      setCurrentGame(newGame);
      setGameState(APP_STATES.LOBBY);
      setLoading(false);
    }, 800);
  };

  const handleJoinGame = (gameId, playerName, pin) => {
    setLoading(true);
    setTimeout(() => {
      const mockUid = 'user-' + Math.random().toString(36).substr(2, 9);
      const newPlayer = { uid: mockUid, name: playerName, pin: pin, isHost: false };

      // Since there is no backend, we simulate joining a game
      // by creating a mock lobby state populated with some dummy players
      const mockGame = {
        id: gameId.toUpperCase(),
        hostId: 'host-123',
        status: 'lobby',
        players: [
          { uid: 'host-123', name: 'GameMaster', pin: '0000', isHost: true },
          { uid: 'player-2', name: 'Sir-Purrs-A-Lot', pin: '1111', isHost: false },
          newPlayer,
        ],
        createdAt: Date.now(),
      };

      setUser(newPlayer);
      setCurrentGame(mockGame);
      setGameState(APP_STATES.LOBBY);
      setLoading(false);
    }, 800);
  };

  const handleStartGame = () => {
    if (!currentGame) return;
    setGameState(APP_STATES.GAME);
    setCurrentGame({ ...currentGame, status: 'active' });
  };

  const handleLeaveGame = () => {
    setGameState(APP_STATES.LANDING);
    setCurrentGame(null);
    setUser(null);
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
      <main className="max-w-6xl mx-auto px-4 py-2">
        {gameState === APP_STATES.LANDING && (
          <LandingPage onCreate={handleCreateGame} onJoin={handleJoinGame} />
        )}
        {gameState === APP_STATES.LOBBY && (
          <LobbyPage
            game={currentGame}
            userId={user?.uid}
            onStart={handleStartGame}
            onLeave={handleLeaveGame}
          />
        )}
        {gameState === APP_STATES.GAME && <GamePlaceholder onLeave={handleLeaveGame} />}
      </main>
    </div>
  );
};

export default App;
