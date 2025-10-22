import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Menu as MenuType } from '../lib/supabase';
import { uploadMenuItemPhoto, deleteMenuItemPhoto } from '../lib/storage';
import DashboardLayout from '../components/DashboardLayout';
import TranslationManager from '../components/TranslationManager';
import { ArrowLeft, Upload, X, Save } from 'lucide-react';

export default function MenuSettings() {
  const { menuId } = useParams<{ menuId: string }>();
  const { t } = useLanguage();
  const { user, effectiveUserId } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menu, setMenu] = useState<MenuType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [menuName, setMenuName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
      setMenuName(menuData.name);
      setPhotoPreview(menuData.photo_url);
    }
    setLoading(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoFile(file);
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSave = async () => {
    if (!menuId || !menuName.trim()) return;

    setSaving(true);
    setUploading(true);

    try {
      let photoUrl = menu?.photo_url || null;

      if (photoFile && effectiveUserId) {
        if (menu?.photo_url) {
          await deleteMenuItemPhoto(menu.photo_url);
        }

        photoUrl = await uploadMenuItemPhoto(photoFile, effectiveUserId);
        if (!photoUrl) {
          throw new Error('Failed to upload photo');
        }
      } else if (photoPreview === null && menu?.photo_url) {
        await deleteMenuItemPhoto(menu.photo_url);
        photoUrl = null;
      }

      const { error } = await supabase
        .from('menus')
        .update({
          name: menuName.trim(),
          photo_url: photoUrl
        })
        .eq('id', menuId);

      if (error) throw error;

      await loadMenuData();
      navigate(`/dashboard/menu/${menuId}`);
    } catch (error) {
      console.error('Error updating menu:', error);
      alert('Error updating menu settings');
    } finally {
      setSaving(false);
      setUploading(false);
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
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`/dashboard/menu/${menuId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.menu.backToMenus}
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.menu.menuSettings}</h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.menu.menuName}
              </label>
              <input
                type="text"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder={t.menu.menuNamePlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.menu.menuImage}
              </label>
              <div className="flex items-start gap-4">
                <div
                  className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <div className="relative w-full h-full">
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto();
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">{t.menu.uploadImage}</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    {t.menu.menuImageHelper}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {t.menu.menuImageSize}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving || uploading || !menuName.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {uploading ? t.menu.uploading : saving ? t.common.saving : t.menu.saveChanges}
              </button>
              <button
                onClick={() => navigate(`/dashboard/menu/${menuId}`)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>

          {menuId && menuName && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <TranslationManager
                menuId={menuId}
                baseLanguage="fr"
                baseName={menuName}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
