import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { FormInput } from './FormInput';
import { Button } from './Button';

export function SignupForm() {
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
          emailRedirectTo: undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName,
            phone: phone || null,
            source: 'website',
          }, {
            onConflict: 'id',
          });

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        }
      }

      navigate('/dashboard/abonnement?new_user=true');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={sessionId
        ? 'Complete your registration to access your subscription'
        : 'Create an account to start managing your menus'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          id="full-name"
          name="name"
          type="text"
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          icon={User}
          autoComplete="name"
        />

        <FormInput
          id="phone"
          name="phone"
          type="tel"
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={Phone}
          autoComplete="tel"
        />

        <FormInput
          id="email-address"
          name="email"
          type="email"
          label="Email address"
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
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          icon={Lock}
          autoComplete="new-password"
        />

        <FormInput
          id="confirm-password"
          name="confirmPassword"
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          icon={Lock}
          autoComplete="new-password"
        />

        {password.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Password strength:</span>
              <span className={`font-medium ${
                password.length < 6
                  ? 'text-red-600'
                  : password.length < 10
                  ? 'text-orange-600'
                  : 'text-green-600'
              }`}>
                {password.length < 6
                  ? 'Weak'
                  : password.length < 10
                  ? 'Medium'
                  : 'Strong'
                }
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  password.length < 6
                    ? 'w-1/3 bg-red-500'
                    : password.length < 10
                    ? 'w-2/3 bg-orange-500'
                    : 'w-full bg-green-500'
                }`}
              ></div>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-2 pt-2">
          <input
            id="terms"
            type="checkbox"
            required
            className="w-4 h-4 mt-1 rounded border-gray-300 text-[#092033] focus:ring-[#092033] focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
            I agree to the{' '}
            <a href="#" className="text-[#092033] hover:underline font-medium">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="#" className="text-[#092033] hover:underline font-medium">
              Privacy Policy
            </a>
          </label>
        </div>

        <Button type="submit" variant="primary" loading={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>

        {!sessionId && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Sign in to your account{' '}
                <Link
                  to="/login"
                  className="text-[#092033] hover:underline font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}