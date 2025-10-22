import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Menu as MenuType, MenuCategory, MenuItem, Restaurant } from '../lib/supabase';
import { uploadOptimizedMenuItemPhoto, deleteMenuItemPhoto } from '../lib/storage';
import DashboardLayout from '../components/DashboardLayout';
import ImageModal from '../components/ImageModal';
import { Plus, GripVertical, Trash2, ArrowLeft, Upload, Pencil, X, Sparkles, Settings } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function MenuDetail() {
  const { menuId } = useParams<{ menuId: string }>();
  const { t } = useLanguage();
  const { user, effectiveUserId } = useAuth();
  const navigate = useNavigate();

  const [menu, setMenu] = useState<MenuType | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);

  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({ name: '', description: '' });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>('fr');
  const [categoryTranslations, setCategoryTranslations] = useState<Record<string, any>>({});
  const [itemTranslations, setItemTranslations] = useState<Record<string, any>>({});

  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    description: '',
    price: '',
    photo: null as File | null,
    photoPreview: null as string | null,
    category_id: ''
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemPhoto, setEditingItemPhoto] = useState<{ [key: string]: { file: File | null, preview: string | null } }>({});

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const newItemFileInputRef = useRef<HTMLInputElement>(null);

  const formatPrice = (price: number) => {
    if (!restaurant) return `${price.toFixed(2)} €`;
    const formattedPrice = price.toFixed(2);
    return restaurant.currency_position === 'left'
      ? `${restaurant.currency_symbol}${formattedPrice}`
      : `${formattedPrice} ${restaurant.currency_symbol}`;
  };

  useEffect(() => {
    if (user && menuId) {
      loadMenuData();
    }
  }, [user, menuId]);

  const loadMenuData = async () => {
    if (!menuId) return;

    const { data: menuData } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .maybeSingle();

    if (menuData) {
      setMenu(menuData);

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', menuData.restaurant_id)
        .maybeSingle();

      if (restaurantData) {
        setRestaurant(restaurantData);
      }

      await loadCategories(menuId);

      const { data: menuTranslations } = await supabase
        .from('menu_translations')
        .select('language_code')
        .eq('menu_id', menuId);

      if (menuTranslations) {
        const languages = menuTranslations.map(t => t.language_code);
        setAvailableLanguages(languages);
      }
    }
    setLoading(false);
  };

  const loadTranslations = async (langCode: string) => {
    if (!menuId || langCode === 'fr') {
      setCategoryTranslations({});
      setItemTranslations({});
      return;
    }

    const { data: catTransData } = await supabase
      .from('category_translations')
      .select('*, category_id')
      .eq('language_code', langCode);

    if (catTransData) {
      const catTransMap: Record<string, any> = {};
      catTransData.forEach(t => {
        catTransMap[t.category_id] = t;
      });
      setCategoryTranslations(catTransMap);
    }

    const { data: itemTransData } = await supabase
      .from('item_translations')
      .select('*, item_id')
      .eq('language_code', langCode);

    if (itemTransData) {
      const itemTransMap: Record<string, any> = {};
      itemTransData.forEach(t => {
        itemTransMap[t.item_id] = t;
      });
      setItemTranslations(itemTransMap);
    }
  };

  useEffect(() => {
    loadTranslations(selectedLang);
  }, [selectedLang, menuId]);

  const loadCategories = async (mId: string) => {
    const { data } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('menu_id', mId)
      .order('display_order', { ascending: true });

    if (data) {
      setCategories(data);
      for (const category of data) {
        await loadItems(category.id);
      }
    }
  };

  const loadItems = async (categoryId: string) => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .order('display_order', { ascending: true });

    if (data) {
      setItems(prev => ({ ...prev, [categoryId]: data }));
    }
  };

  const handleCreateCategory = async () => {
    if (!menuId || !newCategoryData.name.trim()) return;
    setSaving(true);

    try {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) : -1;

      const { error } = await supabase
        .from('menu_categories')
        .insert({
          menu_id: menuId,
          name: newCategoryData.name.trim(),
          description: newCategoryData.description.trim() || null,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      await loadCategories(menuId);
      setShowNewCategoryForm(false);
      setNewCategoryData({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm(t.menu.confirmDeleteCategory)) return;

    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId);

    if (!error && menuId) {
      loadCategories(menuId);
    }
  };

  const handleNewItemPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemData({
          ...newItemData,
          photo: file,
          photoPreview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditItemPhotoChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItemPhoto({
          ...editingItemPhoto,
          [itemId]: {
            file,
            preview: reader.result as string
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemData.name.trim() || !newItemData.price || !newItemData.category_id) return;
    setSaving(true);
    setUploading(true);

    try {
      let photoUrl = null;
      let thumbnailUrl = null;

      if (newItemData.photo && effectiveUserId) {
        const uploadResult = await uploadOptimizedMenuItemPhoto(newItemData.photo, effectiveUserId);
        if (!uploadResult) {
          throw new Error('Failed to upload photo');
        }
        photoUrl = uploadResult.photoUrl;
        thumbnailUrl = uploadResult.thumbnailUrl;
      }

      const categoryItems = items[newItemData.category_id] || [];
      const maxOrder = categoryItems.length > 0 ? Math.max(...categoryItems.map(i => i.display_order)) : -1;

      const { error } = await supabase
        .from('menu_items')
        .insert({
          category_id: newItemData.category_id,
          name: newItemData.name.trim(),
          description: newItemData.description.trim() || null,
          price: parseFloat(newItemData.price),
          photo_url: photoUrl,
          thumbnail_url: thumbnailUrl,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      await loadItems(newItemData.category_id);
      setShowNewItemForm(false);
      setNewItemData({ name: '', description: '', price: '', photo: null, photoPreview: null, category_id: '' });
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Error creating item');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    categoryId: string,
    data: { name: string; description: string; price: string; category_id: string },
    oldPhotoUrl: string | null,
    oldThumbnailUrl: string | null
  ) => {
    setSaving(true);
    setUploading(true);

    try {
      let photoUrl = oldPhotoUrl;
      let thumbnailUrl = oldThumbnailUrl;

      const photoData = editingItemPhoto[itemId];
      if (photoData?.file && effectiveUserId) {
        if (oldPhotoUrl) {
          await deleteMenuItemPhoto(oldPhotoUrl, oldThumbnailUrl);
        }

        const uploadResult = await uploadOptimizedMenuItemPhoto(photoData.file, effectiveUserId);
        if (!uploadResult) {
          throw new Error('Failed to upload photo');
        }
        photoUrl = uploadResult.photoUrl;
        thumbnailUrl = uploadResult.thumbnailUrl;
      }

      const updateData: any = {
        name: data.name.trim(),
        description: data.description.trim() || null,
        price: parseFloat(data.price),
        photo_url: photoUrl,
        thumbnail_url: thumbnailUrl,
      };

      if (data.category_id && data.category_id !== categoryId) {
        updateData.category_id = data.category_id;
      }

      const { error } = await supabase
        .from('menu_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      await loadItems(categoryId);
      if (data.category_id && data.category_id !== categoryId) {
        await loadItems(data.category_id);
      }
      setEditingItemId(null);
      setEditingItemPhoto({});
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error updating item');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const toggleItemVisibility = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_visible: !item.is_visible })
      .eq('id', item.id);

    if (!error) {
      loadItems(item.category_id);
    }
  };

  const deleteItem = async (item: MenuItem) => {
    if (!confirm(t.menu.confirmDeleteItem)) return;

    try {
      if (item.photo_url) {
        await deleteMenuItemPhoto(item.photo_url, item.thumbnail_url);
      }

      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item.id);

      if (!error) {
        loadItems(item.category_id);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item');
    }
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

  if (!menu) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">{t.menu.noMenus}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage.url}
          altText={selectedImage.alt}
          onClose={() => setSelectedImage(null)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/dashboard/menu')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.menu.backToMenus}
        </button>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{menu.name}</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(`/dashboard/menu/${menuId}/settings`)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <button
              onClick={() => navigate(`/dashboard/menu/${menuId}/ai-import`)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Import AI
            </button>
            <button
              onClick={() => setShowNewCategoryForm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t.menu.addCategory}
            </button>
          </div>
        </div>

        {availableLanguages.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedLang('fr')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedLang === 'fr'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">🇫🇷</span>
                Français
              </button>
              {availableLanguages.map((langCode) => {
                const lang = LANGUAGES.find(l => l.code === langCode);
                if (!lang) return null;
                return (
                  <button
                    key={langCode}
                    onClick={() => setSelectedLang(langCode)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      selectedLang === langCode
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    {lang.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showNewCategoryForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.menu.addCategory}</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newCategoryData.name}
                onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                placeholder={t.menu.categoryNamePlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <input
                type="text"
                value={newCategoryData.description}
                onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                placeholder={t.menu.descriptionPlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCreateCategory}
                  disabled={saving || !newCategoryData.name.trim()}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {saving ? t.common.saving : t.common.create}
                </button>
                <button
                  onClick={() => {
                    setShowNewCategoryForm(false);
                    setNewCategoryData({ name: '', description: '' });
                  }}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.menu.noCategories}</h3>
            <p className="text-gray-600 mb-6">{t.menu.createFirstCategory}</p>
            <button
              onClick={() => setShowNewCategoryForm(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t.menu.addCategory}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  {editingCategoryId === category.id ? (
                    <div className="flex-1 flex items-center gap-3">
                      <input
                        type="text"
                        defaultValue={category.name}
                        id={`edit-category-name-${category.id}`}
                        placeholder="Category name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <input
                        type="text"
                        defaultValue={category.description || ''}
                        id={`edit-category-desc-${category.id}`}
                        placeholder="Description (optional)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={async () => {
                          const nameInput = document.getElementById(`edit-category-name-${category.id}`) as HTMLInputElement;
                          const descInput = document.getElementById(`edit-category-desc-${category.id}`) as HTMLInputElement;
                          if (!nameInput.value.trim()) return;

                          setSaving(true);
                          const { error } = await supabase
                            .from('menu_categories')
                            .update({
                              name: nameInput.value.trim(),
                              description: descInput.value.trim() || null
                            })
                            .eq('id', category.id);

                          if (!error && menuId) {
                            await loadCategories(menuId);
                          }
                          setEditingCategoryId(null);
                          setSaving(false);
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                      >
                        {saving ? t.common.saving : t.common.update}
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">
                            {categoryTranslations[category.id]?.name || category.name}
                          </h2>
                          {(categoryTranslations[category.id]?.description || category.description) && (
                            <p className="text-sm text-gray-600">
                              {categoryTranslations[category.id]?.description || category.description}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            {items[category.id]?.length || 0} items
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingCategoryId(category.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>


                <div className="p-6 space-y-4">
                  {items[category.id]?.map((item) => (
                    <div key={item.id}>
                      {editingItemId === item.id ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                              <div
                                className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center bg-white cursor-pointer hover:border-gray-400 transition-colors"
                                onClick={() => document.getElementById(`edit-photo-${item.id}`)?.click()}
                              >
                                {editingItemPhoto[item.id]?.preview ? (
                                  <img src={editingItemPhoto[item.id].preview!} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : item.photo_url ? (
                                  <img src={item.photo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <div className="text-center">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <span className="text-sm text-gray-500">Click to upload</span>
                                  </div>
                                )}
                              </div>
                              <input
                                type="file"
                                id={`edit-photo-${item.id}`}
                                accept="image/*"
                                onChange={(e) => handleEditItemPhotoChange(item.id, e)}
                                className="hidden"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                              <input
                                type="text"
                                defaultValue={item.name}
                                id={`edit-name-${item.id}`}
                                placeholder="Nom du plat"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                              <textarea
                                defaultValue={item.description || ''}
                                id={`edit-desc-${item.id}`}
                                placeholder="Description"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Prix</label>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={item.price}
                                id={`edit-price-${item.id}`}
                                placeholder="Prix"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <select
                                defaultValue={item.category_id}
                                id={`edit-category-${item.id}`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2"
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => {
                                const nameInput = document.getElementById(`edit-name-${item.id}`) as HTMLInputElement;
                                const priceInput = document.getElementById(`edit-price-${item.id}`) as HTMLInputElement;
                                const descInput = document.getElementById(`edit-desc-${item.id}`) as HTMLTextAreaElement;
                                const categoryInput = document.getElementById(`edit-category-${item.id}`) as HTMLSelectElement;
                                handleUpdateItem(item.id, item.category_id, {
                                  name: nameInput.value,
                                  price: priceInput.value,
                                  description: descInput.value,
                                  category_id: categoryInput.value,
                                }, item.photo_url, item.thumbnail_url);
                              }}
                              disabled={saving || uploading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                            >
                              {uploading ? 'Uploading...' : saving ? t.common.saving : t.common.update}
                            </button>
                            <button
                              onClick={() => {
                                setEditingItemId(null);
                                setEditingItemPhoto({});
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                              {t.common.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div
                              className="w-full sm:w-16 h-32 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.photo_url) {
                                  setSelectedImage({ url: item.photo_url, alt: item.name });
                                }
                              }}
                            >
                              {item.photo_url ? (
                                <img
                                  src={item.photo_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-lg pointer-events-none"
                                />
                              ) : (
                                <Upload className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex items-start gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {itemTranslations[item.id]?.name || item.name}
                                </h3>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {itemTranslations[item.id]?.description || item.description}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-orange-600">{formatPrice(item.price)}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                              <select
                                value={item.category_id}
                                onChange={(e) => handleUpdateItem(item.id, item.category_id, {
                                  name: item.name,
                                  description: item.description || '',
                                  price: item.price.toString(),
                                  category_id: e.target.value
                                }, item.photo_url, item.thumbnail_url)}
                                className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => setEditingItemId(item.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleItemVisibility(item)}
                                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                  item.is_visible ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                role="switch"
                                aria-checked={item.is_visible}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 flex items-center justify-center ${
                                    item.is_visible ? 'translate-x-7' : 'translate-x-1'
                                  }`}
                                >
                                  {item.is_visible && (
                                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </span>
                              </button>
                              <button
                                onClick={() => deleteItem(item)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {showNewItemForm && newItemData.category_id === category.id ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                          <div
                            className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center bg-white cursor-pointer hover:border-gray-400 transition-colors"
                            onClick={() => newItemFileInputRef.current?.click()}
                          >
                            {newItemData.photoPreview ? (
                              <div className="relative w-full h-full">
                                <img src={newItemData.photoPreview} alt="" className="w-full h-full object-cover rounded-lg" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewItemData({ ...newItemData, photo: null, photoPreview: null });
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <span className="text-sm text-gray-500">Click to upload</span>
                              </div>
                            )}
                          </div>
                          <input
                            ref={newItemFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleNewItemPhotoChange}
                            className="hidden"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                          <input
                            type="text"
                            value={newItemData.name}
                            onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                            placeholder="Nom du plat"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            autoFocus
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <textarea
                            value={newItemData.description}
                            onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                            placeholder="Description"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Prix (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newItemData.price}
                            onChange={(e) => setNewItemData({ ...newItemData, price: e.target.value })}
                            placeholder="Prix"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={handleCreateItem}
                            disabled={saving || uploading || !newItemData.name.trim() || !newItemData.price}
                            className="w-full mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Ajouter'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowNewItemForm(true);
                        setNewItemData({ name: '', description: '', price: '', photo: null, photoPreview: null, category_id: category.id });
                      }}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      {t.menu.addItem}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
