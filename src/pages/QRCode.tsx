import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Restaurant } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { Copy, Check, Download, Upload, X, Eye, Facebook, Instagram, Linkedin, MapPin as GoogleBusiness } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';

export default function QRCode() {
  const { t } = useLanguage();
  const { effectiveUserId } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [qrColor, setQrColor] = useState('#000000');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  const QR_COLOR_PRESETS = [
    { nameKey: 'classicBlack', color: '#000000', bg: '#ffffff' },
    { nameKey: 'navyBlue', color: '#1e3a8a', bg: '#eff6ff' },
    { nameKey: 'darkGreen', color: '#14532d', bg: '#f0fdf4' },
    { nameKey: 'burgundy', color: '#7f1d1d', bg: '#fef2f2' },
    { nameKey: 'purple', color: '#581c87', bg: '#faf5ff' },
    { nameKey: 'orange', color: '#9a3412', bg: '#fff7ed' },
  ];

  useEffect(() => {
    if (effectiveUserId) {
      loadRestaurant();
    }
  }, [effectiveUserId]);

  useEffect(() => {
    if (restaurant?.slug) {
      generateQRCode();
    }
  }, [restaurant, qrColor, qrBgColor, logoFile]);

  const loadRestaurant = async () => {
    if (!effectiveUserId) return;

    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (data) {
      setRestaurant(data);
      if (data.logo_url) {
        setLogoFile(data.logo_url);
      }
    }
    setLoading(false);
  };

  const generateQRCode = () => {
    if (!restaurant?.slug || !qrRef.current) return;

    const url = `${window.location.origin}/${restaurant.slug}?ref=QR`;

    if (qrCodeRef.current) {
      qrCodeRef.current.update({
        data: url,
        dotsOptions: {
          color: qrColor,
        },
        backgroundOptions: {
          color: qrBgColor,
        },
        image: logoFile || undefined,
      });
    } else {
      qrCodeRef.current = new QRCodeStyling({
        width: 300,
        height: 300,
        data: url,
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H',
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 5,
        },
        dotsOptions: {
          color: qrColor,
          type: 'rounded',
        },
        backgroundOptions: {
          color: qrBgColor,
        },
        image: logoFile || undefined,
        cornersSquareOptions: {
          color: qrColor,
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: qrColor,
          type: 'dot',
        },
      });

      qrRef.current.innerHTML = '';
      qrCodeRef.current.append(qrRef.current);
    }
  };

  const copyUrl = (ref: string) => {
    if (!restaurant?.slug) return;
    const url = `${window.location.origin}/${restaurant.slug}?ref=${ref}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(ref);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const downloadQRCode = () => {
    if (!restaurant?.slug) return;

    const url = `${window.location.origin}/${restaurant.slug}?ref=QR`;

    // Create a high-resolution QR code for download
    const highResQR = new QRCodeStyling({
      width: 1024,
      height: 1024,
      data: url,
      margin: 40,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'H',
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 20,
      },
      dotsOptions: {
        color: qrColor,
        type: 'rounded',
      },
      backgroundOptions: {
        color: qrBgColor,
      },
      image: logoFile || undefined,
      cornersSquareOptions: {
        color: qrColor,
        type: 'extra-rounded',
      },
      cornersDotOptions: {
        color: qrColor,
        type: 'dot',
      },
    });

    highResQR.download({
      name: `qr-code-${restaurant.slug}`,
      extension: 'png',
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoFile(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
  };

  const applyPreset = (preset: { color: string; bg: string }) => {
    setQrColor(preset.color);
    setQrBgColor(preset.bg);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">{t.common.loading}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant?.slug) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
            <Eye className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.qrCode.notConfigured}</h2>
            <p className="text-gray-600 mb-6">
              {t.qrCode.notConfiguredMessage}
            </p>
            <a
              href="/visual-identity"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              {t.qrCode.goToVisualIdentity}
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const restaurantUrl = `${window.location.origin}/${restaurant.slug}?ref=QR`;
  const facebookUrl = `${window.location.origin}/${restaurant.slug}?ref=FB`;
  const instagramUrl = `${window.location.origin}/${restaurant.slug}?ref=IG`;
  const tiktokUrl = `${window.location.origin}/${restaurant.slug}?ref=TT`;
  const linkedinUrl = `${window.location.origin}/${restaurant.slug}?ref=LI`;
  const gmbUrl = `${window.location.origin}/${restaurant.slug}?ref=GMB`;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.qrCode.title}</h1>
          <p className="text-gray-600">
            {t.qrCode.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.qrCode.qrCodeUrl}</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={restaurantUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyUrl('QR')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 shrink-0"
                >
                  {copiedUrl === 'QR' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copiedUrl === 'QR' ? t.qrCode.copied : t.qrCode.copy}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.qrCode.customization}</h2>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">{t.qrCode.predefinedColors}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {QR_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.nameKey}
                      onClick={() => applyPreset(preset)}
                      className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-orange-500 transition-colors"
                    >
                      <div className="flex gap-1">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: preset.bg }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{t.qrCode[preset.nameKey]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.qrCode.qrColor}
                  </label>
                  <input
                    type="color"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="#000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.qrCode.backgroundColor}
                  </label>
                  <input
                    type="color"
                    value={qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                    className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.qrCode.logoCenter}
                </label>
                {logoFile ? (
                  <div className="relative inline-block">
                    <img
                      src={logoFile}
                      alt="Logo"
                      className="h-20 w-20 rounded-lg border-2 border-gray-200 object-cover"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                      <p className="text-sm text-gray-600">{t.qrCode.addLogo}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.qrCode.logoFormat}</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.qrCode.socialMediaTitle}</h2>
              <p className="text-sm text-gray-600 mb-4">{t.qrCode.socialMediaDescription}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.qrCode.facebook}</p>
                    <p className="text-xs text-gray-600 truncate">{facebookUrl}</p>
                  </div>
                  <button
                    onClick={() => copyUrl('FB')}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 border border-gray-200"
                  >
                    {copiedUrl === 'FB' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-xs font-medium">{copiedUrl === 'FB' ? t.qrCode.copied : t.qrCode.copy}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <Instagram className="w-5 h-5 text-pink-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.qrCode.instagram}</p>
                    <p className="text-xs text-gray-600 truncate">{instagramUrl}</p>
                  </div>
                  <button
                    onClick={() => copyUrl('IG')}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 border border-gray-200"
                  >
                    {copiedUrl === 'IG' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-xs font-medium">{copiedUrl === 'IG' ? t.qrCode.copied : t.qrCode.copy}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
                  <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                    <span className="text-xs font-bold">TT</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{t.qrCode.tiktok}</p>
                    <p className="text-xs text-gray-300 truncate">{tiktokUrl}</p>
                  </div>
                  <button
                    onClick={() => copyUrl('TT')}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {copiedUrl === 'TT' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-xs font-medium">{copiedUrl === 'TT' ? t.qrCode.copied : t.qrCode.copy}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                  <Linkedin className="w-5 h-5 text-blue-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.qrCode.linkedin}</p>
                    <p className="text-xs text-gray-600 truncate">{linkedinUrl}</p>
                  </div>
                  <button
                    onClick={() => copyUrl('LI')}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 border border-gray-200"
                  >
                    {copiedUrl === 'LI' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-xs font-medium">{copiedUrl === 'LI' ? t.qrCode.copied : t.qrCode.copy}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <GoogleBusiness className="w-5 h-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.qrCode.googleMyBusiness}</p>
                    <p className="text-xs text-gray-600 truncate">{gmbUrl}</p>
                  </div>
                  <button
                    onClick={() => copyUrl('GMB')}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 border border-gray-200"
                  >
                    {copiedUrl === 'GMB' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-xs font-medium">{copiedUrl === 'GMB' ? t.qrCode.copied : t.qrCode.copy}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.qrCode.preview}</h2>
              <div className="flex flex-col items-center">
                <div className="bg-gray-50 rounded-xl p-8 mb-4">
                  <div ref={qrRef} className="flex items-center justify-center" />
                </div>
                <p className="text-sm text-gray-600 text-center mb-4">{t.qrCode.qrCodeMenu}</p>
                <button
                  onClick={downloadQRCode}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors w-full justify-center"
                >
                  <Download className="w-5 h-5" />
                  {t.qrCode.download}
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                💡 {t.qrCode.howToUse}
              </h3>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <p className="text-gray-700">
                    {t.qrCode.step1}
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <p className="text-gray-700">
                    {t.qrCode.step2}
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <p className="text-gray-700">
                    {t.qrCode.step3}
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <p className="text-gray-700">
                    {t.qrCode.step4}
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
