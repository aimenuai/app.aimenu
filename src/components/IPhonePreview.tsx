import { Smartphone, ImageIcon } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  photo_url?: string;
}

interface IPhonePreviewProps {
  restaurantName: string;
  logoUrl?: string;
  heroBackgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  footerBgColor: string;
  footerTextPrimary: string;
  footerTextSecondary: string;
  currencySymbol: string;
  currencyPosition: 'left' | 'right';
  menuItems?: MenuItem[];
}

export default function IPhonePreview({
  restaurantName,
  logoUrl,
  heroBackgroundColor,
  primaryColor,
  secondaryColor,
  footerBgColor,
  footerTextPrimary,
  footerTextSecondary,
  currencySymbol,
  currencyPosition,
  menuItems = [],
}: IPhonePreviewProps) {
  const formatPrice = (price: number) => {
    const formatted = price.toFixed(2);
    if (currencyPosition === 'right') {
      return `${formatted}${currencySymbol}`;
    }
    return `${currencySymbol}${formatted}`;
  };

  return (
    <div className="relative w-[280px] h-[570px] mx-auto">
      <div className="absolute inset-0 bg-gray-900 rounded-[50px] shadow-2xl p-3">
        <div className="w-full h-full bg-white rounded-[42px] overflow-hidden relative">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-3xl z-50"></div>

          <div className="h-full overflow-hidden flex flex-col">
            <div className="bg-white px-3 py-2 flex items-center justify-between border-b border-gray-200">
              <h1 className="text-xs font-bold text-gray-900 truncate">
                {restaurantName || 'Restaurant'}
              </h1>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gray-200"></div>
                <div className="w-4 h-4 rounded bg-gray-200"></div>
              </div>
            </div>

            <div
              className="h-32 flex items-center justify-center transition-colors duration-300"
              style={{ backgroundColor: heroBackgroundColor }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={restaurantName}
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <h1
                  className="text-base font-bold px-4 text-center"
                  style={{
                    color: heroBackgroundColor === '#ffffff' || heroBackgroundColor === '#fff' ? '#000000' : '#ffffff'
                  }}
                >
                  {restaurantName || 'Restaurant'}
                </h1>
              )}
            </div>

            <div className="flex-1 bg-gray-50 px-3 py-4 overflow-y-auto">
              <div className="space-y-3">
                {menuItems.length > 0 ? (
                  menuItems.slice(0, 2).map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow-sm p-3 flex gap-2">
                      <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                              }
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                        <p className="text-[9px] text-gray-600 mb-1.5 line-clamp-2">
                          {item.description || 'Delicious menu item'}
                        </p>
                        <span
                          className="text-xs font-bold transition-colors duration-300"
                          style={{ color: primaryColor }}
                        >
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="bg-white rounded-lg shadow-sm p-3 flex gap-2">
                      <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-gray-900 mb-1">Menu Item</h3>
                        <p className="text-[9px] text-gray-600 mb-1.5 line-clamp-2">
                          Sample description for this delicious menu item
                        </p>
                        <span
                          className="text-xs font-bold transition-colors duration-300"
                          style={{ color: primaryColor }}
                        >
                          {formatPrice(12.99)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-3 flex gap-2">
                      <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-gray-900 mb-1">Special Dish</h3>
                        <p className="text-[9px] text-gray-600 mb-1.5 line-clamp-2">
                          Another tasty option with amazing flavors
                        </p>
                        <span
                          className="text-xs font-bold transition-colors duration-300"
                          style={{ color: primaryColor }}
                        >
                          {formatPrice(15.50)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    className="flex-1 py-2 rounded-lg text-[10px] font-medium text-white transition-colors duration-300"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg text-[10px] font-medium text-white transition-colors duration-300"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </div>

            <div
              className="px-3 py-3 transition-colors duration-300"
              style={{ backgroundColor: footerBgColor }}
            >
              <div
                className="text-[9px] font-semibold mb-1 transition-colors duration-300"
                style={{ color: footerTextPrimary }}
              >
                {restaurantName || 'Restaurant Name'}
              </div>
              <div
                className="text-[8px] transition-colors duration-300"
                style={{ color: footerTextSecondary }}
              >
                Contact info and details
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-800 rounded-full"></div>
    </div>
  );
}
