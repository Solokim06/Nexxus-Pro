import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const Home = () => {
  const features = [
    {
      icon: '📤',
      title: 'Easy File Upload',
      description: 'Drag and drop files or folders with our intuitive upload interface. Support for all file types.',
    },
    {
      icon: '🔄',
      title: 'Powerful File Merging',
      description: 'Combine multiple files into one document. Support for PDF, images, documents, and more.',
    },
    {
      icon: '🔒',
      title: 'Secure Storage',
      description: 'End-to-end encryption ensures your files are safe and private. Bank-level security.',
    },
    {
      icon: '📱',
      title: 'M-Pesa Integration',
      description: 'Seamless payments with M-Pesa. Subscribe and upgrade instantly.',
    },
    {
      icon: '☁️',
      title: 'Cloud Access',
      description: 'Access your files from anywhere, on any device. Sync across all platforms.',
    },
    {
      icon: '🤝',
      title: 'Easy Sharing',
      description: 'Share files and folders with anyone. Set permissions and expiration dates.',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Active Users' },
    { value: '1M+', label: 'Files Merged' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' },
  ];

  const testimonials = [
    {
      name: 'John Kamau',
      role: 'Business Owner',
      content: 'Nexxus-Pro has transformed how I manage documents. The merge feature is a game-changer!',
      avatar: 'https://via.placeholder.com/100',
    },
    {
      name: 'Sarah Wanjiku',
      role: 'Freelancer',
      content: 'The M-Pesa integration makes payments so easy. Best file management platform in Kenya!',
      avatar: 'https://via.placeholder.com/100',
    },
    {
      name: 'Michael Otieno',
      role: 'IT Manager',
      content: 'Secure, fast, and reliable. The best investment for our company this year.',
      avatar: 'https://via.placeholder.com/100',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-secondary-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative container-custom mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fadeIn">
              The Ultimate File Management & Merging Platform
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Upload, merge, and manage your files with ease. Secure cloud storage with M-Pesa and PayPal integration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" variant="white" className="shadow-lg">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-600">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-16 text-white" preserveAspectRatio="none" viewBox="0 0 1440 54">
            <path fill="currentColor" d="M0 22L120 16.7C240 11 480 0 720 0.7C960 1.3 1200 11 1320 16.7L1440 22V54H0V22Z" />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container-custom mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container-custom mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Everyone
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage and merge your files effectively
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container-custom mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Account</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Sign up for free and choose your plan
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Files</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Drag and drop files or folders to upload
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Merge & Manage</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Combine files and manage them from anywhere
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container-custom mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Trusted by thousands of happy customers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 italic">
                  "{testimonial.content}"
                </p>
                <div className="mt-4 flex text-yellow-400">
                  {'★'.repeat(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="container-custom mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white opacity-90 mb-8">
            Join thousands of users who trust Nexxus-Pro for their file management needs
          </p>
          <Link to="/register">
            <Button size="lg" variant="white" className="shadow-lg">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;