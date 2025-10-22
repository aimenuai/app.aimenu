import { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface CashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCommissions: string[], payoutAmount: number) => Promise<void>;
  pendingCommissions: Array<{
    id: string;
    client_name: string;
    commission_amount: number;
    currency: string;
    period_start: string;
    period_end: string;
  }>;
  totalPending: number;
  currency: string;
}

export default function CashoutModal({
  isOpen,
  onClose,
  onConfirm,
  pendingCommissions,
  totalPending,
  currency
}: CashoutModalProps) {
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleCommission = (id: string) => {
    setSelectedCommissions(prev =>
      prev.includes(id)
        ? prev.filter(cid => cid !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCommissions.length === pendingCommissions.length) {
      setSelectedCommissions([]);
    } else {
      setSelectedCommissions(pendingCommissions.map(c => c.id));
    }
  };

  const selectedTotal = pendingCommissions
    .filter(c => selectedCommissions.includes(c.id))
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const handleConfirm = async () => {
    if (selectedCommissions.length === 0) {
      setError('Please select at least one commission to pay out');
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid payout amount');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await onConfirm(selectedCommissions, Math.round(amount * 100));
      onClose();
      setSelectedCommissions([]);
      setPayoutAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to process payout');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Select Commissions to Pay</h3>
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedCommissions.length === pendingCommissions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {pendingCommissions.map((commission) => (
                <label
                  key={commission.id}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCommissions.includes(commission.id)}
                    onChange={() => toggleCommission(commission.id)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{commission.client_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(commission.period_start).toLocaleDateString()} - {new Date(commission.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(commission.commission_amount)}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
              <span className="font-medium text-gray-700">Selected Total:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(selectedTotal)}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="payoutAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Payout Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">{currency.toUpperCase()}</span>
              </div>
              <input
                id="payoutAmount"
                type="number"
                step="0.01"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full pl-16 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This is the actual amount you will pay to the reseller. It may differ from the selected total due to fees or adjustments.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || selectedCommissions.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : `Confirm Payout`}
          </button>
        </div>
      </div>
    </div>
  );
}
