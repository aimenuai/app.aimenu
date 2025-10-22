import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { Upload, ArrowLeft, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface ParsedMenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
}

interface ProcessingResult {
  success: boolean;
  items?: ParsedMenuItem[];
  error?: string;
}

export default function AIImport() {
  const { menuId } = useParams<{ menuId: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageWithAI = async () => {
    if (!selectedFile || !imagePreview) return;

    setProcessing(true);
    setResult(null);

    try {
      const base64Image = imagePreview.split(',')[1];

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-menu-image`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to process image';
        console.error('API Error:', errorMessage, 'Status:', response.status);
        throw new Error(errorMessage);
      }

      if (data.items && Array.isArray(data.items)) {
        setResult({ success: true, items: data.items });
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process menu image. Please try again.';
      setResult({ success: false, error: errorMessage });
    } finally {
      setProcessing(false);
    }
  };

  const importToDatabase = async () => {
    if (!result?.items || !menuId) return;

    setImporting(true);

    try {
      const categoryMap = new Map<string, string>();
      let categoriesCreated = 0;
      let itemsCreated = 0;

      console.log('Starting import of', result.items.length, 'items');

      for (const item of result.items) {
        console.log('Processing item:', item.name, 'in category:', item.category);

        let categoryId = categoryMap.get(item.category);

        if (!categoryId) {
          console.log('Looking for existing category:', item.category);

          const { data: existingCategory, error: checkError } = await supabase
            .from('menu_categories')
            .select('id')
            .eq('menu_id', menuId)
            .eq('name', item.category)
            .maybeSingle();

          if (checkError) {
            console.error('Error checking category:', checkError);
            throw checkError;
          }

          if (existingCategory) {
            console.log('Found existing category:', existingCategory.id);
            categoryId = existingCategory.id;
          } else {
            console.log('Creating new category:', item.category);

            const { data: categories } = await supabase
              .from('menu_categories')
              .select('display_order')
              .eq('menu_id', menuId)
              .order('display_order', { ascending: false })
              .limit(1);

            const maxOrder = categories && categories.length > 0 ? categories[0].display_order : -1;
            console.log('Max order for categories:', maxOrder);

            const { data: newCategory, error: categoryError } = await supabase
              .from('menu_categories')
              .insert({
                menu_id: menuId,
                name: item.category,
                description: null,
                display_order: maxOrder + 1,
              })
              .select()
              .single();

            if (categoryError) {
              console.error('Error creating category:', categoryError);
              throw categoryError;
            }

            console.log('Created category:', newCategory);
            categoryId = newCategory.id;
            categoriesCreated++;
          }

          categoryMap.set(item.category, categoryId);
        }

        console.log('Creating item in category:', categoryId);

        const { data: categoryItems } = await supabase
          .from('menu_items')
          .select('display_order')
          .eq('category_id', categoryId)
          .order('display_order', { ascending: false })
          .limit(1);

        const maxOrder = categoryItems && categoryItems.length > 0 ? categoryItems[0].display_order : -1;
        console.log('Max order for items in category:', maxOrder);

        const { data: newItem, error: itemError } = await supabase
          .from('menu_items')
          .insert({
            category_id: categoryId,
            name: item.name,
            description: item.description || null,
            price: item.price,
            display_order: maxOrder + 1,
            is_visible: true,
            photo_url: null,
          })
          .select()
          .single();

        if (itemError) {
          console.error('Error creating item:', itemError);
          throw itemError;
        }

        console.log('Created item:', newItem);
        itemsCreated++;
      }

      console.log(`Import complete! Created ${categoriesCreated} categories and ${itemsCreated} items`);
      alert(`Successfully imported ${itemsCreated} items in ${categoriesCreated} new categories!`);
      navigate(`/dashboard/menu/${menuId}`);
    } catch (error) {
      console.error('Error importing items:', error);
      alert(`Error importing items to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`/dashboard/menu/${menuId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Menu Import</h1>
              <p className="text-gray-600">Upload a menu image and let AI extract the items</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Upload Menu Image</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Menu preview"
                      className="max-h-96 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setImagePreview(null);
                        setResult(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {selectedFile && !result && (
              <button
                onClick={processImageWithAI}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Process with AI
                  </>
                )}
              </button>
            )}

            {result && (
              <div className="space-y-4">
                {result.success && result.items ? (
                  <>
                    <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        Successfully parsed {result.items.length} items!
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Parsed Items Preview</h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {result.items.map((item, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              <span className="text-orange-600 font-bold">${item.price.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {item.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={importToDatabase}
                      disabled={importing}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Importing to Database...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Import to Database
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">{result.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
