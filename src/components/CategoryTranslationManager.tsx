import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';

interface Translation {
  id: string;
  language_code: string;
  name: string;
  description?: string;
}

interface CategoryTranslationManagerProps {
  categoryId: string;
  baseName: string;
  baseDescription?: string;
  availableLanguages: string[];
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export default function CategoryTranslationManager({
  categoryId,
  baseName,
  baseDescription,
  availableLanguages,
}: CategoryTranslationManagerProps) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadTranslations();
  }, [categoryId]);

  const loadTranslations = async () => {
    const { data } = await supabase
      .from('category_translations')
      .select('*')
      .eq('category_id', categoryId);

    if (data) {
      setTranslations(data);
    }
    setLoading(false);
  };

  const translateContent = async (targetLanguage: string) => {
    setTranslating(true);
    try {
      const nameResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            text: baseName,
            targetLanguage,
            context: 'a menu category name',
          }),
        }
      );

      if (!nameResponse.ok) throw new Error('Translation failed');
      const { translation: translatedName } = await nameResponse.json();

      let translatedDescription = null;
      if (baseDescription) {
        const descResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-menu`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              text: baseDescription,
              targetLanguage,
              context: 'a menu category description',
            }),
          }
        );

        if (descResponse.ok) {
          const { translation } = await descResponse.json();
          translatedDescription = translation;
        }
      }

      const { error } = await supabase
        .from('category_translations')
        .insert({
          category_id: categoryId,
          language_code: targetLanguage,
          name: translatedName,
          description: translatedDescription,
        });

      if (error) throw error;
      await loadTranslations();
    } catch (error) {
      console.error('Translation error:', error);
      alert('Failed to translate. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const deleteTranslation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation?')) return;

    const { error } = await supabase
      .from('category_translations')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadTranslations();
    }
  };

  const startEdit = (translation: Translation) => {
    setEditingId(translation.id);
    setEditName(translation.name);
    setEditDescription(translation.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from('category_translations')
      .update({
        name: editName,
        description: editDescription || null,
      })
      .eq('id', id);

    if (!error) {
      await loadTranslations();
      cancelEdit();
    }
  };

  const missingLanguages = availableLanguages.filter(
    lang => !translations.some(t => t.language_code === lang)
  );

  if (loading) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="space-y-2">
        {translations.map((translation) => {
          const lang = LANGUAGES.find(l => l.code === translation.language_code);
          const isEditing = editingId === translation.id;

          return (
            <div
              key={translation.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-xl mt-1">{lang?.flag}</span>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Name"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Description (optional)"
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-sm text-gray-900">{translation.name}</div>
                    {translation.description && (
                      <div className="text-xs text-gray-600 mt-1">{translation.description}</div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(translation.id)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(translation)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTranslation(translation.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {missingLanguages.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {missingLanguages.map((langCode) => {
              const lang = LANGUAGES.find(l => l.code === langCode);
              return (
                <button
                  key={langCode}
                  onClick={() => translateContent(langCode)}
                  disabled={translating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>{lang?.flag}</span>
                  <span>{lang?.name}</span>
                  {translating && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
