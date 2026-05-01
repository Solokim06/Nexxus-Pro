import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import InvoiceDownload from './InvoiceDownload';

const PaymentHistory = ({
  userId,
  className = '',
}) => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [userId, filter]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/payments/history/${userId}?status=${filter}`);
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const config = {
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200', label: 'Completed' },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200', label: 'Pending' },
      failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200', label: 'Failed' },
      refunded: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200', label: 'Refunded' },
    };
    return config[status] || config.pending;
  };

  const getPaymentIcon = (method) => {
    const icons = {
      mpesa: '📱',
      paypal: '💰',
      bank_transfer: '🏦',
      card: '💳',
    };
    return icons[method] || '💵';
  };

  const handleDownloadInvoice = async (payment) => {
    setSelectedInvoice(payment);
    setShowInvoice(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment History
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View all your transactions
            </p>
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            {['all', 'completed', 'pending', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No payment history found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const statusBadge = getStatusBadge(payment.status);
              return (
                <div
                  key={payment.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {getPaymentIcon(payment.method)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {payment.description}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(payment.date)} • {payment.method.toUpperCase()}
                        </p>
                        {payment.reference && (
                          <p className="text-xs text-gray-400 font-mono mt-1">
                            Ref: {payment.reference}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3">
                    {payment.status === 'completed' && payment.invoiceUrl && (
                      <button
                        onClick={() => handleDownloadInvoice(payment)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Download Invoice
                      </button>
                    )}
                    {payment.status === 'failed' && (
                      <button
                        onClick={() => window.location.href = '/pricing'}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Retry Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoice && selectedInvoice && (
        <InvoiceDownload
          invoice={selectedInvoice}
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
          onDownload={async (invoice, format) => {
            // Handle invoice download
            console.log('Download invoice:', invoice, format);
          }}
        />
      )}
    </div>
  );
};

export default PaymentHistory;