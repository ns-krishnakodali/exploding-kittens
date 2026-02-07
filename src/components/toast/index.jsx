import { useEffect } from 'react';

import { Bomb, Zap } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = type === 'error' ? 'bg-red-600' : 'bg-zinc-900';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 ${colors} text-white px-8 py-4 rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.2)] z-50 flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-300 border-2 border-black`}
    >
      {type === 'error' ? <Bomb size={24} /> : <Zap size={24} className="text-yellow-400" />}
      <span className="font-black italic uppercase tracking-tight">{message}</span>
    </div>
  );
};
