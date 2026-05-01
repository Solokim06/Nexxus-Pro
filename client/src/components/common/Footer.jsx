import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const footerSections = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '/features' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Merge Tool', href: '/merge' },
        { label: 'Upload', href: '/upload' },
        { label: 'API', href: '/api-docs' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Careers', href: '/careers' },
        { label: 'Press', href: '/press' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Documentation', href: '/docs' },
        { label: 'Security', href: '/security' },
        { label: 'Status', href: '/status' },
        { label: 'Support', href: '/support' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'GDPR', href: '/gdpr' },
        { label: 'Data Processing', href: '/data-processing' },
      ],
    },
  ];
  
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg"></div>
              <span className="text-xl font-bold text-white">Nexxus-Pro</span>
            </div>
            <p className="text-sm mb-4">
              Advanced file management and merging platform. Secure, fast, and reliable.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-primary-400 transition-colors">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                <i className="fab fa-github"></i>
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                <i className="fab fa-facebook"></i>
              </a>
            </div>
          </div>
          
          {/* Links Columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Payment Methods */}
        <div className="border-t border-gray-800 py-6 mb-6">
          <div className="flex flex-wrap justify-center items-center gap-6">
            <span className="text-sm text-gray-400">Accepted Payment Methods:</span>
            <img src="/assets/images/payments/mpesa.png" alt="M-Pesa" className="h-6" />
            <img src="/assets/images/payments/paypal.png" alt="PayPal" className="h-6" />
            <img src="/assets/images/payments/visa.png" alt="Visa" className="h-6" />
            <img src="/assets/images/payments/mastercard.png" alt="Mastercard" className="h-6" />
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>© {currentYear} Nexxus-Pro. All rights reserved.</p>
          <div className="flex space-x-4 mt-2 md:mt-0">
            <Link to="/sitemap" className="hover:text-primary-400">Sitemap</Link>
            <Link to="/accessibility" className="hover:text-primary-400">Accessibility</Link>
            <Link to="/privacy" className="hover:text-primary-400">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;