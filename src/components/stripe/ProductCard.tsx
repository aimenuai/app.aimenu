import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StripeProduct } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import { Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

interface ProductCardProps {
  product: StripeProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) {
      setCheckingSubscription(false);
      return;
    }

    try {
      const { data: customerData } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customerData) {
        setHasActiveSubscription(false);
        setCheckingSubscription(false);
        return;
      }

      const { data: subscriptionData } = await supabase
        .from('stripe_subscriptions')
        .select('status')
        .eq('customer_id', customerData.customer_id)
        .maybeSingle();

      if (subscriptionData && (subscriptionData.status === 'active' || subscriptionData.status === 'trialing')) {
        setHasActiveSubscription(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate('/signup');
      return;
    }

    if (hasActiveSubscription) {
      alert(t.subscription.alreadyActiveAlert);
      return;
    }

    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/success`;
      const cancelUrl = `${window.location.origin}/dashboard/abonnement`;

      await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl,
        cancelUrl,
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to create checkout session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'eur' ? '€' : '$';
    return `${symbol}${price.toFixed(2)}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-[#092033] to-[#0d2d47] px-8 py-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-3">{product.name}</h3>
        <p className="text-gray-300 text-base">{product.description}</p>
      </div>

      <div className="px-8 py-8">
        {/* Price Section */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center">
            <span className="text-5xl font-bold text-[#092033]">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.mode === 'subscription' && (
              <span className="text-gray-500 ml-2 text-lg">{t.subscription.perMonth}</span>
            )}
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <span className="ml-3 text-base text-gray-700">{t.subscription.aiPoweredManagement}</span>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <span className="ml-3 text-base text-gray-700">{t.subscription.automaticTranslations}</span>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <span className="ml-3 text-base text-gray-700">{t.subscription.smartRecommendations}</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handlePurchase}
          disabled={loading || checkingSubscription || hasActiveSubscription}
          className="w-full bg-[#092033] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-[#0d2d47] active:bg-[#061620] focus:outline-none focus:ring-4 focus:ring-[#092033]/20 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {checkingSubscription
            ? t.subscription.checking
            : hasActiveSubscription
            ? t.subscription.alreadySubscribed
            : loading
            ? t.subscription.processing
            : t.subscription.subscribeNow}
        </button>

        {hasActiveSubscription && (
          <p className="mt-4 text-center text-sm text-gray-600">
            {t.subscription.alreadyHaveSubscription}
          </p>
        )}
      </div>
    </div>
  );
}