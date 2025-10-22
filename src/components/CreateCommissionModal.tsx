import { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface CreateCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subscriptionId: string, paymentAmount: number) => Promise<void>;
  clientSubscriptions: Array<{
    subscription_id: string;
    client_name: string;
    promo_code: string;
    status: string;
  }>;
}

export default function CreateCommissionModal({
  isOpen,
  onClose,
  onConfirm,
  clientSubscriptions
}: CreateCommissionModalProps) {
  const [selectedSubscription, setSelectedSubscription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedSubscription) {
      setError('Please select a subscription');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await onConfirm(selectedSubscription, Math.round(amount * 100));
      onClose();
      setSelectedSubscription('');
      setPaymentAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to create commission');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create Commission</h2>
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

          <div className="mb-4">
            <label htmlFor="subscription" className="block text-sm font-medium text-gray-700 mb-2">
              Select Client Subscription
            </label>
            <select
              id="subscription"
              value={selectedSubscription}
              onChange={(e) => setSelectedSubscription(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a subscription...</option>
              {clientSubscriptions.map((sub) => (
                <option key={sub.subscription_id} value={sub.subscription_id}>
                  {sub.client_name} - {sub.promo_code} ({sub.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount (EUR)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">EUR</span>
              </div>
              <input
                id="paymentAmount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="199.50"
                className="block w-full pl-14 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter the total amount the client paid for their subscription. The commission will be calculated automatically based on the promo code's commission rate.
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
            disabled={processing || !selectedSubscription}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Creating...' : 'Create Commission'}
          </button>
        </div>
      </div>
    </div>
  );
}
