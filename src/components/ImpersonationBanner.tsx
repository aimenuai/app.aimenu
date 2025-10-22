import { AlertCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ImpersonationBanner() {
  const { isImpersonating, stopImpersonating } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white py-3 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">
            You are currently viewing as another user
          </span>
        </div>
        <button
          onClick={stopImpersonating}
          className="flex items-center gap-2 px-4 py-1.5 bg-white text-yellow-600 rounded-md hover:bg-gray-100 transition-colors font-medium"
        >
          <X className="w-4 h-4" />
          Exit View Mode
        </button>
      </div>
    </div>
  );
}
