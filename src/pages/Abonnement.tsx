import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { stripeProducts } from '../stripe-config';
import { ProductCard } from '../components/stripe/ProductCard';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';

export function Abonnement() {
  const { user, effectiveUserId } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNewUser = searchParams.get('new_user') === 'true';
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, [user, effectiveUserId]);

  const checkSubscription = async () => {
    if (!user) {
      setCheckingSubscription(false);
      return;
    }

    try {
      // Always check subscription for the effective user ID (impersonated or actual)
      const userIdToCheck = effectiveUserId || user.id;

      const { data: subscriptionData } = await supabase
        .from('stripe_subscriptions')
        .select('status')
        .eq('user_id', userIdToCheck)
        .maybeSingle();

      const isActive = subscriptionData && (subscriptionData.status === 'active' || subscriptionData.status === 'trialing');
      setHasActiveSubscription(isActive || false);

      if (isActive && isNewUser) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const shouldHideSidebar = isNewUser && !hasActiveSubscription && !checkingSubscription;

  return (
    <DashboardLayout hideSidebar={shouldHideSidebar}>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8">
        <div className="w-full max-w-6xl mx-auto">
          {isNewUser && user && (
            <div className="mb-10 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-6 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-green-900">
                    {t.subscription.accountCreated}
                  </h3>
                  <p className="mt-2 text-base text-green-700 leading-relaxed">
                    {t.subscription.welcomeMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-[#092033] mb-4">
              {isNewUser && user ? t.subscription.completeSetup : t.subscription.subscriptionPlans}
            </h2>
            <p className="mt-4 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              {isNewUser && user
                ? t.subscription.subscribeUnlock
                : t.subscription.selectPlan
              }
            </p>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-lg">
              {stripeProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Abonnement;
