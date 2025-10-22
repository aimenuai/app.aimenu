import { Phone, Mail, MapPin, Instagram, Facebook, Linkedin, MapPinned } from 'lucide-react';
import { usePublicTranslation } from '../hooks/usePublicTranslation';

interface PublicFooterProps {
  restaurantName: string;
  primaryColor: string;
  secondaryColor: string;
  footerBgColor: string;
  footerTextPrimary: string;
  footerTextSecondary: string;
  phone?: string;
  email?: string;
  address?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  linkedinUrl?: string;
  googleMapsUrl?: string;
  language?: string;
}

const TikTokIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export default function PublicFooter({
  restaurantName,
  primaryColor,
  secondaryColor,
  footerBgColor,
  footerTextPrimary,
  footerTextSecondary,
  phone,
  email,
  address,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  linkedinUrl,
  googleMapsUrl,
  language = 'fr',
}: PublicFooterProps) {
  const { t } = usePublicTranslation(language);
  const hasContactInfo = phone || email || address;
  const socialLinks = [
    { url: instagramUrl, icon: Instagram, label: 'Instagram' },
    { url: facebookUrl, icon: Facebook, label: 'Facebook' },
    { url: tiktokUrl, icon: TikTokIcon, label: 'TikTok', isCustom: true },
    { url: linkedinUrl, icon: Linkedin, label: 'LinkedIn' },
    { url: googleMapsUrl, icon: MapPinned, label: 'Google Maps' },
  ].filter(link => link.url);

  const hasSocialLinks = socialLinks.length > 0;

  if (!hasContactInfo && !hasSocialLinks) {
    return (
      <footer className="mt-auto" style={{ backgroundColor: footerBgColor }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-sm" style={{ color: footerTextSecondary }}>
              © {new Date().getFullYear()} {restaurantName}. {t.footer.allRightsReserved}.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="mt-auto"
      style={{ backgroundColor: footerBgColor }}
    >
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {hasContactInfo && (
            <div>
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: footerTextPrimary }}
              >
                {t.footer.contactUs}
              </h3>
              <div className="space-y-3">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-3 transition-colors hover:opacity-80"
                    style={{ color: footerTextSecondary }}
                  >
                    <Phone className="w-5 h-5 flex-shrink-0" style={{ color: footerTextPrimary }} />
                    <span>{phone}</span>
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-3 transition-colors hover:opacity-80"
                    style={{ color: footerTextSecondary }}
                  >
                    <Mail className="w-5 h-5 flex-shrink-0" style={{ color: footerTextPrimary }} />
                    <span>{email}</span>
                  </a>
                )}
                {address && (
                  <div className="flex items-start gap-3" style={{ color: footerTextSecondary }}>
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: footerTextPrimary }} />
                    <span>{address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasSocialLinks && (
            <div>
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: footerTextPrimary }}
              >
                {t.footer.followUs}
              </h3>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-full transition-all hover:scale-110"
                      style={{
                        backgroundColor: `${footerTextPrimary}20`,
                        color: footerTextPrimary
                      }}
                      title={link.label}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = footerTextPrimary;
                        e.currentTarget.style.color = footerBgColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${footerTextPrimary}20`;
                        e.currentTarget.style.color = footerTextPrimary;
                      }}
                    >
                      {link.isCustom ? <Icon /> : <Icon className="w-5 h-5" />}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-8 border-t text-center" style={{ borderColor: `${footerTextPrimary}20` }}>
          <p className="text-sm" style={{ color: footerTextSecondary }}>
            © {new Date().getFullYear()} {restaurantName}. {t.footer.allRightsReserved}.
          </p>
        </div>
      </div>
    </footer>
  );
}
