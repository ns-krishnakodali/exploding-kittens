import { Bomb } from 'lucide-react';

import { LOADING_MESSAGES } from '../../constants';

const loadingMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

export const Loading = () => (
  <div className="min-h-screen bg-[#F8F4E1] flex items-center justify-center">
    <div className="text-center space-y-4">
      <Bomb size={64} className="text-red-600 mx-auto animate-bounce" />
      <p className="text-2xl font-black italic uppercase text-red-600">{loadingMessage}</p>
    </div>
  </div>
);
