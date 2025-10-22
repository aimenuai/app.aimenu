import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#092033] overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#092033] via-[#0d2d47] to-[#092033] opacity-90"></div>

        {/* Decorative geometric patterns */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo and branding */}
          <div className="space-y-8">
            <img
              src="https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/Aimenu/Aimenu.svg"
              alt="Aimenu"
              className="h-12 w-auto brightness-0 invert"
            />

            <div className="space-y-4 max-w-md">
              <h1 className="text-4xl font-bold text-white leading-tight">
                Modern Menu Management for Restaurants
              </h1>
              <p className="text-lg text-gray-300 leading-relaxed">
                Create beautiful digital menus, manage your offerings, and delight your customers with AI-powered menu solutions.
              </p>
            </div>
          </div>

          {/* Features list */}
          <div className="space-y-4 max-w-md">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Multi-language Support</p>
                <p className="text-sm text-gray-400">Reach customers in their preferred language</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">QR Code Integration</p>
                <p className="text-sm text-gray-400">Seamless contactless menu access</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Real-time Updates</p>
                <p className="text-sm text-gray-400">Update your menu instantly, anytime</p>
              </div>
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="text-gray-400 text-sm">
            Trusted by restaurants worldwide
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-[#F5F7FA] overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <img
              src="https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/Aimenu/Aimenu.svg"
              alt="Aimenu"
              className="h-10 mx-auto mb-4"
            />
          </div>

          {/* Form header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#092033] mb-2">{title}</h2>
            <p className="text-sm sm:text-base text-gray-600">{subtitle}</p>
          </div>

          {/* Form content */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
