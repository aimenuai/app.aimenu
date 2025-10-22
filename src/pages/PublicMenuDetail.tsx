import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getInitialLanguage, setStoredLanguage } from '../lib/languageUtils';
import { ArrowLeft, Menu as MenuIcon, Globe, Moon, Sun } from 'lucide-react';
import PublicFooter from '../components/PublicFooter';
import ImageModal from '../components/ImageModal';
import { DarkModeProvider, useDarkMode } from '../contexts/DarkModeContext';

interface Restaurant {
  id: string;
  name: string;
  logo_url?: string;
  hero_background_color: string;
  primary_color: string;
  secondary_color: string;
  currency_symbol: string;
  currency_position: 'left' | 'right';
  phone?: string;
  email?: string;
  address?: string;
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
}

interface Category {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  photo_url?: string;
  thumbnail_url?: string;
  is_visible: boolean;
}

interface Translation {
  language_code: string;
  name: string;
  description?: string;
}

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

function PublicMenuDetailContent() {
  const { slug, menuId } = useParams<{ slug: string; menuId: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => getInitialLanguage());
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [menuTranslations, setMenuTranslations] = useState<Record<string, string>>({});
  const [categoryTranslations, setCategoryTranslations] = useState<Record<string, Translation>>({});
  const [itemTranslations, setItemTranslations] = useState<Record<string, Translation>>({});
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);
  const categoryNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug && menuId) {
      loadData();
    }
  }, [slug, menuId]);

  useEffect(() => {
    document.documentElement.lang = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    if (categories.length > 0) {
      const firstCategory = categories[0];
      const firstCategoryItems = items[firstCategory.id];
      if (firstCategoryItems && firstCategoryItems.length > 0) {
        const firstItem = firstCategoryItems[0];
        if (firstItem.photo_url) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = firstItem.photo_url;
          document.head.appendChild(link);
        }
      }
    }
  }, [categories, items]);

  useEffect(() => {
    const handleScroll = () => {
      const categoryElements = categories.map(cat => ({
        id: cat.id,
        element: document.getElementById(`category-${cat.id}`)
      }));

      const scrollPosition = window.scrollY + 200;

      for (let i = categoryElements.length - 1; i >= 0; i--) {
        const { id, element } = categoryElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveCategory(id);

          // Auto-scroll the horizontal category menu to show active category
          const activeButton = document.querySelector(`button[data-category-id="${id}"]`);
          if (activeButton && categoryNavRef.current) {
            const container = categoryNavRef.current;
            const buttonRect = activeButton.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Check if button is outside the visible area
            if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
              activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
          }
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const loadData = async () => {
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (restaurantError || !restaurantData) {
        setLoading(false);
        setItemsLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      const [allMenusResult, menuResult] = await Promise.all([
        supabase
          .from('menus')
          .select('id, name')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_visible', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('menus')
          .select('id, name, photo_url')
          .eq('id', menuId)
          .eq('restaurant_id', restaurantData.id)
          .eq('is_visible', true)
          .maybeSingle()
      ]);

      if (allMenusResult.data) {
        setAllMenus(allMenusResult.data);
      }

      if (!menuResult.data) {
        setLoading(false);
        setItemsLoading(false);
        return;
      }

      setMenu(menuResult.data);
      setLoading(false);

      const [categoriesResult, menuTransResult] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .eq('menu_id', menuResult.data.id)
          .order('display_order', { ascending: true }),
        supabase
          .from('menu_translations')
          .select('language_code, name')
          .eq('menu_id', menuResult.data.id)
      ]);

      if (categoriesResult.data && categoriesResult.data.length > 0) {
        setCategories(categoriesResult.data);

        const categoryIds = categoriesResult.data.map(c => c.id);
        const { data: itemsData } = await supabase
          .from('menu_items')
          .select('*')
          .in('category_id', categoryIds)
          .eq('is_visible', true)
          .order('display_order', { ascending: true });

        if (itemsData) {
          const itemsMap: Record<string, MenuItem[]> = {};
          itemsData.forEach(item => {
            if (!itemsMap[item.category_id]) {
              itemsMap[item.category_id] = [];
            }
            itemsMap[item.category_id].push(item);
          });
          setItems(itemsMap);
        }
      }

      if (menuTransResult.data) {
        const langs = menuTransResult.data.map(t => t.language_code);
        setAvailableLanguages(langs);
        const transMap: Record<string, string> = {};
        menuTransResult.data.forEach(t => {
          transMap[t.language_code] = t.name;
        });
        setMenuTranslations(transMap);

        const initialLang = getInitialLanguage(langs);
        setSelectedLanguage(initialLang);
      }

      setItemsLoading(false);
    } catch (error) {
      console.error('Error loading menu:', error);
      setLoading(false);
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLanguage !== 'fr' && categories.length > 0) {
      loadTranslations();
    } else {
      setCategoryTranslations({});
      setItemTranslations({});
    }
  }, [selectedLanguage, categories]);

  const loadTranslations = async () => {
    const catIds = categories.map(c => c.id);
    const { data: catTransData } = await supabase
      .from('category_translations')
      .select('category_id, language_code, name, description')
      .eq('language_code', selectedLanguage)
      .in('category_id', catIds);

    if (catTransData) {
      const catTransMap: Record<string, Translation> = {};
      catTransData.forEach(t => {
        catTransMap[t.category_id] = {
          language_code: t.language_code,
          name: t.name,
          description: t.description,
        };
      });
      setCategoryTranslations(catTransMap);
    }

    const allItems = Object.values(items).flat();
    const itemIds = allItems.map(i => i.id);

    if (itemIds.length > 0) {
      const { data: itemTransData } = await supabase
        .from('item_translations')
        .select('item_id, language_code, name, description')
        .eq('language_code', selectedLanguage)
        .in('item_id', itemIds);

      if (itemTransData) {
        const itemTransMap: Record<string, Translation> = {};
        itemTransData.forEach(t => {
          itemTransMap[t.item_id] = {
            language_code: t.language_code,
            name: t.name,
            description: t.description,
          };
        });
        setItemTranslations(itemTransMap);
      }
    }
  };

  const getMenuName = () => {
    if (selectedLanguage === 'fr' || !menuTranslations[selectedLanguage]) {
      return menu?.name || '';
    }
    return menuTranslations[selectedLanguage];
  };

  const getCategoryName = (category: Category) => {
    if (selectedLanguage === 'fr' || !categoryTranslations[category.id]) {
      return category.name;
    }
    return categoryTranslations[category.id].name;
  };

  const getCategoryDescription = (category: Category) => {
    if (selectedLanguage === 'fr' || !categoryTranslations[category.id]) {
      return category.description;
    }
    return categoryTranslations[category.id].description;
  };

  const getItemName = (item: MenuItem) => {
    if (selectedLanguage === 'fr' || !itemTranslations[item.id]) {
      return item.name;
    }
    return itemTranslations[item.id].name;
  };

  const getItemDescription = (item: MenuItem) => {
    if (selectedLanguage === 'fr' || !itemTranslations[item.id]) {
      return item.description;
    }
    return itemTranslations[item.id].description;
  };

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(2);
    if (restaurant?.currency_position === 'right') {
      return `${formatted}${restaurant.currency_symbol}`;
    }
    return `${restaurant?.currency_symbol}${formatted}`;
  };

  if (!loading && (!restaurant || !menu)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Menu not found</h1>
          <p className="text-gray-600">The menu you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  if (!restaurant) {
    return null;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`} lang={selectedLanguage}>
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage.url}
          altText={selectedImage.alt}
          onClose={() => setSelectedImage(null)}
        />
      )}
      <nav className={`shadow-sm sticky top-0 z-40 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/${slug}`)}
                className={`flex items-center transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                aria-label="Back to restaurant page"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{getMenuName()}</h1>
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
                    <option value="fr">🇫🇷 FR</option>
                    {availableLanguages.map(langCode => {
                      const lang = LANGUAGES.find(l => l.code === langCode);
                      return (
                        <option key={langCode} value={langCode}>
                          {lang?.flag} {lang?.code.toUpperCase()}
                        </option>
                      );
                    })}
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
              {allMenus.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    navigate(`/${slug}/menu/${m.id}`);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 sm:px-6 lg:px-8 py-4 transition-colors border-b last:border-b-0 ${
                    m.id === menuId
                      ? isDarkMode ? 'bg-gray-700 text-white font-semibold' : 'bg-gray-100 text-gray-900 font-semibold'
                      : isDarkMode ? 'text-gray-300 hover:bg-gray-700 border-gray-700' : 'text-gray-700 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="text-lg">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {menu?.photo_url && (
        <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
          <img
            src={menu.photo_url}
            alt={getMenuName()}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {categories.length > 0 && (
        <div className={`sticky top-16 z-30 shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div ref={categoryNavRef} className="flex gap-6 overflow-x-auto py-4 scrollbar-hide">
              {categories.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    data-category-id={category.id}
                    onClick={() => {
                      const element = document.getElementById(`category-${category.id}`);
                      if (element) {
                        const yOffset = -140;
                        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }}
                    className={`whitespace-nowrap text-base font-medium transition-all pb-1 border-b-2 ${
                      isActive
                        ? 'border-current'
                        : 'border-transparent'
                    } ${
                      isDarkMode ? 'hover:opacity-80' : 'hover:opacity-80'
                    }`}
                    style={{
                      color: isActive ? restaurant.primary_color : (isDarkMode ? '#9ca3af' : '#6b7280')
                    }}
                  >
                    {categoryTranslations[category.id]?.name || category.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ minHeight: '600px' }}>
        {categories.length === 0 && !itemsLoading ? (
          <div className="text-center py-12">
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No menu items available yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category.id} id={`category-${category.id}`}>
                <div className="mb-6">
                  <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{category.description}</p>
                  )}
                </div>

                <div className="space-y-4">
                  {itemsLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl shadow-sm overflow-hidden animate-pulse flex gap-4 p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                      >
                        <div className={`w-32 h-32 rounded-lg flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className={`h-6 rounded w-3/4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                            <div className={`h-4 rounded w-full mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                            <div className={`h-4 rounded w-2/3 mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                          </div>
                          <div className={`h-6 w-20 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                        </div>
                      </div>
                    ))
                  ) : items[category.id] && items[category.id].length > 0 ? (
                    items[category.id].map((item, itemIndex) => (
                    <div
                      key={item.id}
                      className={`rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden flex gap-4 p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                    >
                      {item.photo_url && (
                        <img
                          src={item.photo_url}
                          alt={`${getItemName(item)} photo`}
                          className="w-32 h-32 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          width="128"
                          height="128"
                          loading={category.display_order === 0 && itemIndex === 0 ? undefined : "lazy"}
                          fetchPriority={category.display_order === 0 && itemIndex === 0 ? "high" : undefined}
                          onClick={() => {
                            setSelectedImage({ url: item.photo_url, alt: getItemName(item) });
                          }}
                        />
                      )}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {getItemName(item)}
                          </h3>
                          {getItemDescription(item) && (
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {getItemDescription(item)}
                            </p>
                          )}
                        </div>
                        <div className="mt-3">
                          <span
                            className="text-lg font-bold"
                            style={{ color: restaurant.primary_color }}
                          >
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                  ) : (
                    <p className={`text-center py-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      No items in this category yet.
                    </p>
                  )}
                </div>
              </div>
            ))}
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

export default function PublicMenuDetail() {
  return (
    <DarkModeProvider>
      <PublicMenuDetailContent />
    </DarkModeProvider>
  );
}
