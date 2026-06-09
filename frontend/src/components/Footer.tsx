import { useSettings } from '../hooks/useSettings';
import { Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 px-6 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">{settings.companyName}</h3>
            <p className="text-sm text-slate-600">Smart shipping and tracking dashboard</p>
          </div>


          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-500 mt-1" />
                <a
                  href={`mailto:${settings.companyEmail}`}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  {settings.companyEmail}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-500 mt-1" />
                <a
                  href={`tel:${settings.companyPhone}`}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  {settings.companyPhone}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-500 mt-1" />
                <p className="text-sm text-slate-600">{settings.companyAddress}</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-sm text-slate-600 hover:text-slate-900">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/orders" className="text-sm text-slate-600 hover:text-slate-900">
                  Orders
                </a>
              </li>
              <li>
                <a href="/products" className="text-sm text-slate-600 hover:text-slate-900">
                  Products
                </a>
              </li>
            </ul>
          </div>

    
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="/contact" className="text-sm text-slate-600 hover:text-slate-900">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/help" className="text-sm text-slate-600 hover:text-slate-900">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-sm text-slate-600 hover:text-slate-900">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-200 pt-6">
          <p className="text-center text-sm text-slate-600">
            © {new Date().getFullYear()} {settings.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
