import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getColorPalette } from '../lib/colorPalettes';
import { getInitialLanguage, setStoredLanguage } from '../lib/languageUtils';
import { ChevronRight, Menu as MenuIcon, Image as ImageIcon, Moon, Sun, Globe } from 'lucide-react';
import PublicFooter from '../components/PublicFooter';
import { DarkModeProvider, useDarkMode } from '../contexts/DarkModeContext';

interface Restaurant {
  id: string;
  name: string;
  logo_url?: string;
  hero_background_color: string;
  primary_color: string;
  secondary_color: string;
  description_en?: string;
  description_fr?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency_symbol: string;
  currency_position: 'left' | 'right';
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  linkedin_url?: string;
  google_maps_url?: string;
  footer_bg_color: string;
  footer_text_primary: string;
  footer_text_secondary: string;
}

interface Menu {
  id: string;
  name: string;
  photo_url?: string;
  color_palette?: string;
}

function PublicLandingContent() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => getInitialLanguage());

  const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
  ];

  useEffect(() => {
    if (slug) {
      loadRestaurantData();
    }
  }, [slug]);

  useEffect(() => {
    document.documentElement.lang = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    if (menus.length > 0 && menus[0].photo_url) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = menus[0].photo_url;
      document.head.appendChild(link);
    }
  }, [menus]);

  const loadRestaurantData = async () => {
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (restaurantError || !restaurantData) {
      setLoading(false);
      return;
    }

    setRestaurant(restaurantData);

    // Track visit with ref parameter
    const urlParams = new URLSearchParams(window.location.search);
    const refSource = urlParams.get('ref') || 'direct';

    try {
      const trackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`;
      await fetch(trackUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantData.id,
          ref_source: refSource,
        }),
      });
    } catch (trackError) {
      console.error('Error tracking visit:', trackError);
    }

    const { data: menusData } = await supabase
      .from('menus')
      .select('id, name, photo_url, color_palette')
      .eq('restaurant_id', restaurantData.id)
      .eq('is_visible', true)
      .order('display_order', { ascending: true });

    if (menusData) {
      setMenus(menusData);
    }

    setLoading(false);
  };

  if (!restaurant && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h1>
          <p className="text-gray-600">The page you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`} lang={selectedLanguage}>
      <nav className={`shadow-sm sticky top-0 z-40 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{restaurant?.name || ''}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setSelectedLanguage(newLang);
                    setStoredLanguage(newLang);
                  }}
                  className={`appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  aria-label="Select language"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                <MenuIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0" onClick={() => setMenuOpen(false)} aria-hidden="true"></div>
          <div className={`absolute top-16 left-0 right-0 shadow-lg border-b transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="max-w-7xl mx-auto">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => {
                    navigate(`/${slug}/menu/${menu.id}`);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 sm:px-6 lg:px-8 py-4 transition-colors border-b last:border-b-0 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700 border-gray-700' : 'text-gray-700 hover:bg-gray-50 border-gray-200'}`}
                >
                  <span className="text-lg">{menu.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {restaurant && (
        <div
          className="relative overflow-hidden"
          style={{ backgroundColor: restaurant.hero_background_color }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
            <div className="text-center">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={`${restaurant.name} logo`}
                  className="h-32 w-auto mx-auto drop-shadow-2xl"
                />
              )}
              {restaurant.description_en && (
                <p className="text-xl text-white/90 max-w-2xl mx-auto mt-8">
                  {restaurant.description_en}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className={`rounded-xl shadow-sm overflow-hidden animate-pulse p-4 sm:p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-lg flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  <div className="flex-1">
                    <div className={`h-8 rounded w-2/3 mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    <div className={`h-4 rounded w-1/2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : menus.length === 0 ? (
          <div className="text-center py-12">
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No menus available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {menus.map((menu, index) => {
              const palette = getColorPalette(menu.color_palette);
              return (
                <button
                  key={menu.id}
                  onClick={() => navigate(`/${slug}/menu/${menu.id}`)}
                  className="w-full rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  style={{ backgroundColor: palette.colors.background }}
                  aria-label={`View ${menu.name} menu`}
                >
                  <div className="flex items-center gap-4 p-4 sm:p-6">
                    {menu.photo_url ? (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={menu.photo_url}
                          alt={`${menu.name} preview`}
                          className="w-full h-full object-cover"
                          width="128"
                          height="128"
                          loading={index === 0 ? undefined : "lazy"}
                          fetchPriority={index === 0 ? "high" : undefined}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: palette.colors.secondary + '20' }}
                        role="img"
                        aria-label="Menu placeholder image"
                      >
                        <ImageIcon className="w-12 h-12" style={{ color: palette.colors.secondary }} />
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <h2
                        className="text-xl sm:text-2xl lg:text-3xl font-bold group-hover:opacity-80 transition-opacity"
                        style={{ color: palette.colors.text }}
                      >
                        {menu.name}
                      </h2>
                    </div>
                    <ChevronRight
                      className="w-8 h-8 group-hover:translate-x-1 transition-all flex-shrink-0"
                      style={{ color: palette.colors.primary }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {restaurant && (
        <PublicFooter
          restaurantName={restaurant.name}
          primaryColor={restaurant.primary_color}
          secondaryColor={restaurant.secondary_color}
          footerBgColor={restaurant.footer_bg_color}
          footerTextPrimary={restaurant.footer_text_primary}
          footerTextSecondary={restaurant.footer_text_secondary}
          phone={restaurant.phone}
          email={restaurant.email}
          address={restaurant.address}
          instagramUrl={restaurant.instagram_url}
          facebookUrl={restaurant.facebook_url}
          tiktokUrl={restaurant.tiktok_url}
          linkedinUrl={restaurant.linkedin_url}
          googleMapsUrl={restaurant.google_maps_url}
          language={selectedLanguage}
        />
      )}
    </div>
  );
}

export default function PublicLanding() {
  return (
    <DarkModeProvider>
      <PublicLandingContent />
    </DarkModeProvider>
  );
}
