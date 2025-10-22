import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Restaurant } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import IPhonePreview from '../components/IPhonePreview';
import { Copy, Check, Upload, X, Palette } from 'lucide-react';
import { uploadFile } from '../lib/storage';
import { VISUAL_IDENTITY_PALETTES } from '../lib/visualIdentityPalettes';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  photo_url?: string;
}

export default function VisualIdentity() {
  const { t } = useLanguage();
  const { user, effectiveUserId } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    description_en: '',
    description_fr: '',
    currency_symbol: '$',
    currency_position: 'left' as 'left' | 'right',
    logo_url: '',
    hero_background_color: '#1a1a1a',
    footer_bg_color: '#1a1a1a',
    footer_text_primary: '#ffffff',
    footer_text_secondary: '#9ca3af',
  });

  useEffect(() => {
    if (effectiveUserId) {
      loadRestaurant();
    }
  }, [effectiveUserId]);

  const loadRestaurant = async () => {
    if (!effectiveUserId) return;

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (!error && data) {
      setRestaurant(data);
      setFormData({
        name: data.name,
        slug: data.slug,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        description_en: data.description_en || '',
        description_fr: data.description_fr || '',
        currency_symbol: data.currency_symbol || '$',
        footer_bg_color: data.footer_bg_color || '#1a1a1a',
        footer_text_primary: data.footer_text_primary || '#ffffff',
        footer_text_secondary: data.footer_text_secondary || '#9ca3af',
        currency_position: data.currency_position || 'left',
        logo_url: data.logo_url || '',
        hero_background_color: data.hero_background_color || '#1a1a1a',
      });

      loadMenuItems(data.id);
    }
    setLoading(false);
  };

  const loadMenuItems = async (restaurantId: string) => {
    const { data: menusData, error: menuError } = await supabase
      .from('menus')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .limit(1)
      .maybeSingle();

    if (menuError) {
      console.error('Error loading menu:', menuError);
      return;
    }

    if (menusData) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('menu_id', menusData.id)
        .limit(1)
        .maybeSingle();

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
        return;
      }

      if (categoriesData) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('id, name, description, price, photo_url')
          .eq('category_id', categoriesData.id)
          .order('display_order', { ascending: true })
          .limit(2);

        if (itemsError) {
          console.error('Error loading menu items:', itemsError);
          return;
        }

        if (itemsData && itemsData.length > 0) {
          setMenuItems(itemsData);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!effectiveUserId) return;
    setSaving(true);

    try {
      if (restaurant) {
        const { error } = await supabase
          .from('restaurants')
          .update(formData)
          .eq('id', restaurant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurants')
          .insert({
            ...formData,
            user_id: effectiveUserId,
          });

        if (error) throw error;
      }

      await loadRestaurant();
      alert(t.visualIdentity.saved);
    } catch (error) {
      alert(t.visualIdentity.error);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/${formData.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveUserId) return;

    setUploading(true);
    try {
      const url = await uploadFile(file, 'logos', effectiveUserId);
      setFormData({ ...formData, logo_url: url });
    } catch (error) {
      console.error('Error uploading logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload logo';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo_url: '' });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">{t.common.loading}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t.visualIdentity.title}</h1>

        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-600" />
                {t.visualIdentity.predefinedPalettes}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {t.visualIdentity.predefinedPalettesDescription}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {VISUAL_IDENTITY_PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        primary_color: palette.primary_color,
                        secondary_color: palette.secondary_color,
                        hero_background_color: palette.hero_background_color,
                        footer_bg_color: palette.footer_bg_color,
                        footer_text_primary: palette.footer_text_primary,
                        footer_text_secondary: palette.footer_text_secondary,
                      });
                    }}
                    className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-orange-500 transition-colors"
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: palette.hero_background_color }}
                      />
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: palette.primary_color }}
                      />
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: palette.secondary_color }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{palette.name}</span>
                  </button>
                ))}
              </div>
            </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.visualIdentity.restaurantName}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                setFormData({
                  ...formData,
                  name,
                  slug: restaurant?.slug_locked ? formData.slug : slug
                });
              }}
              disabled={restaurant?.slug_locked}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${restaurant?.slug_locked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder={t.visualIdentity.restaurantNamePlaceholder}
            />

            {formData.slug && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.visualIdentity.publicMenuUrl}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/${formData.slug}`}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyUrl}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? t.visualIdentity.urlCopied : t.visualIdentity.copyUrl}
                  </button>
                </div>
                {restaurant?.slug_locked ? (
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                    <span className="font-semibold">⚠️</span> {t.visualIdentity.slugLocked}
                  </p>
                ) : (
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                    <span className="font-semibold">⚠️</span> {t.visualIdentity.slugLocked}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.visualIdentity.logo}
            </label>
            {formData.logo_url ? (
              <div className="relative inline-block">
                <img
                  src={formData.logo_url}
                  alt="Restaurant Logo"
                  className="h-24 w-auto rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">{t.visualIdentity.uploadLogo}</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG (5MB max)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading || !user}
                  className="hidden"
                />
              </label>
            )}
            {uploading && <p className="text-sm text-blue-600 mt-2">{t.visualIdentity.saving}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.visualIdentity.heroBackground}
            </label>
            <input
              type="color"
              value={formData.hero_background_color}
              onChange={(e) => setFormData({ ...formData, hero_background_color: e.target.value })}
              className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.visualIdentity.primaryColor}
              </label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.visualIdentity.secondaryColor}
              </label>
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.visualIdentity.descriptionEn}
              </label>
              <textarea
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t.visualIdentity.descriptionPlaceholder}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.visualIdentity.descriptionFr}
              </label>
              <textarea
                value={formData.description_fr}
                onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t.visualIdentity.descriptionPlaceholder}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.visualIdentity.currencySettings}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.visualIdentity.currencySymbol}
                </label>
                <input
                  type="text"
                  value={formData.currency_symbol}
                  onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="$"
                  maxLength={3}
                />
                <p className="text-xs text-gray-500 mt-1">{t.visualIdentity.currencySymbolHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.visualIdentity.currencyPosition}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency_position: 'left' })}
                    className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                      formData.currency_position === 'left'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {formData.currency_symbol}10.00
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency_position: 'right' })}
                    className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                      formData.currency_position === 'right'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    10.00{formData.currency_symbol}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.visualIdentity.footerColors}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.visualIdentity.background}
                </label>
                <input
                  type="color"
                  value={formData.footer_bg_color}
                  onChange={(e) => setFormData({ ...formData, footer_bg_color: e.target.value })}
                  className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.visualIdentity.primaryText}
                </label>
                <input
                  type="color"
                  value={formData.footer_text_primary}
                  onChange={(e) => setFormData({ ...formData, footer_text_primary: e.target.value })}
                  className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.visualIdentity.secondaryText}
                </label>
                <input
                  type="color"
                  value={formData.footer_text_secondary}
                  onChange={(e) => setFormData({ ...formData, footer_text_secondary: e.target.value })}
                  className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg border border-gray-200" style={{ backgroundColor: formData.footer_bg_color }}>
              <div className="text-sm font-semibold mb-2" style={{ color: formData.footer_text_primary }}>
                {t.visualIdentity.footerPreview}
              </div>
              <div className="text-xs" style={{ color: formData.footer_text_secondary }}>
                {t.visualIdentity.footerPreviewSecondary}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.slug}
              className="px-6 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: saving || !formData.name || !formData.slug ? '#9ca3af' : '#ea580c' }}
              onMouseEnter={(e) => !saving && formData.name && formData.slug && (e.currentTarget.style.backgroundColor = '#c2410c')}
              onMouseLeave={(e) => !saving && formData.name && formData.slug && (e.currentTarget.style.backgroundColor = '#ea580c')}
            >
              {saving ? t.visualIdentity.saving : t.visualIdentity.save}
            </button>
          </div>
        </div>
          </div>

          <div className="hidden xl:block xl:w-[320px]">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">
                  {t.visualIdentity.livePreview}
                </h3>
                <IPhonePreview
                  restaurantName={formData.name}
                  logoUrl={formData.logo_url}
                  heroBackgroundColor={formData.hero_background_color}
                  primaryColor={formData.primary_color}
                  secondaryColor={formData.secondary_color}
                  footerBgColor={formData.footer_bg_color}
                  footerTextPrimary={formData.footer_text_primary}
                  footerTextSecondary={formData.footer_text_secondary}
                  currencySymbol={formData.currency_symbol}
                  currencyPosition={formData.currency_position}
                  menuItems={menuItems}
                />
                <p className="text-xs text-gray-500 text-center mt-4">
                  {t.visualIdentity.changesApplyRealTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
