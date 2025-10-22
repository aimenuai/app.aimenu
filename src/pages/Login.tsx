import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { AuthLayout } from '../components/auth/AuthLayout';
import { FormInput } from '../components/auth/FormInput';
import { Button } from '../components/auth/Button';
import { Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (role?.role === 'admin') {
          navigate('/admin');
        } else if (role?.role === 'reseller') {
          navigate('/reseller');
        } else {
          // Check if client has active subscription
          const { data: subscription } = await supabase
            .from('stripe_subscriptions')
            .select('status')
            .eq('user_id', user.id)
            .maybeSingle();

          const hasActiveSubscription = subscription &&
            (subscription.status === 'active' || subscription.status === 'trialing');

          if (hasActiveSubscription) {
            navigate('/dashboard');
          } else {
            navigate('/dashboard/abonnement?new_user=true');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t.auth.login}
      subtitle="Welcome back! Please enter your credentials"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <FormInput
          id="email"
          name="email"
          type="email"
          label={t.auth.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon={Mail}
          autoComplete="email"
        />

        <FormInput
          id="password"
          name="password"
          type="password"
          label={t.auth.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          icon={Lock}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center space-x-2 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-[#092033] focus:ring-[#092033] focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-gray-600 group-hover:text-[#092033] transition-colors">Remember me</span>
          </label>
          <a href="#" className="text-[#092033] hover:underline font-medium">
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary" loading={loading}>
          {loading ? t.auth.loggingIn : t.auth.login}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">New to Aimenu?</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {t.auth.noAccount}{' '}
            <Link
              to="/register"
              className="text-[#092033] hover:underline font-semibold transition-colors"
            >
              {t.auth.register}
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
