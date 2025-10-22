import { useState } from 'react';
import { X, Wallet, AlertCircle } from 'lucide-react';

interface SimpleCashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, note: string) => Promise<void>;
  totalEarnings: number;
  paidOut: number;
  pendingEarnings: number;
  currency: string;
}

export default function SimpleCashoutModal({
  isOpen,
  onClose,
  onConfirm,
  totalEarnings,
  paidOut,
  pendingEarnings,
  currency
}: SimpleCashoutModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const formatCurrency = (amountInEuros: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    }).format(amountInEuros);
  };

  const handleConfirm = async () => {
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amountInCents = Math.round(amountValue * 100);
    const pendingEarningsInCents = Math.round(pendingEarnings * 100);
    if (amountInCents > pendingEarningsInCents) {
      setError(`Amount cannot exceed pending earnings (${formatCurrency(pendingEarnings)})`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await onConfirm(amountInCents, note);
      setAmount('');
      setNote('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process cashout');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Process Cashout</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Earnings:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalEarnings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Already Paid Out:</span>
              <span className="font-semibold text-blue-600">{formatCurrency(paidOut)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-700 font-medium">Available to Pay:</span>
              <span className="font-bold text-green-600">{formatCurrency(pendingEarnings)}</span>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="cashoutAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Payout Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">{currency.toUpperCase()}</span>
              </div>
              <input
                id="cashoutAmount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full pl-16 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cashoutNote" className="block text-sm font-medium text-gray-700 mb-2">
              Note (Optional)
            </label>
            <textarea
              id="cashoutNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this payout..."
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Confirm Payout'}
          </button>
        </div>
      </div>
    </div>
  );
}
