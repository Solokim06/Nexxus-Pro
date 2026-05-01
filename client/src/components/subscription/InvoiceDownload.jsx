import React, { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';

const InvoiceDownload = ({
  invoice,
  isOpen,
  onClose,
  onDownload,
  className = '',
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [format, setFormat] = useState('pdf'); // pdf, csv

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload?.(invoice, format);
      onClose();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Details"
      size="md"
      showFooter={false}
      className={className}
    >
      <div className="space-y-6">
        {/* Invoice Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Nexxus-Pro
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              123 Business Ave, Suite 100
              <br />
              Nairobi, Kenya
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Invoice #{invoice.number}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Date: {formatDate(invoice.date)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Due Date: {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        {/* Bill To */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Bill To:
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {invoice.customerName}
            <br />
            {invoice.customerEmail}
            <br />
            {invoice.customerAddress}
          </p>
        </div>

        {/* Invoice Items */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Description
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Quantity
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Unit Price
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {item.description}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white text-right">
                    {formatCurrency(item.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <td colSpan="3" className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                  Subtotal:
                </td>
                <td className="px-4 py-2 text-right text-sm text-gray-900 dark:text-white">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </td>
              </tr>
              {invoice.tax > 0 && (
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                    Tax ({invoice.taxRate}%):
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(invoice.tax, invoice.currency)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan="3" className="px-4 py-2 text-right text-lg font-bold text-gray-900 dark:text-white">
                  Total:
                </td>
                <td className="px-4 py-2 text-right text-lg font-bold text-primary-600">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Status */}
        <div className={`p-3 rounded-lg ${
          invoice.status === 'paid'
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-yellow-50 dark:bg-yellow-900/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Status:
            </span>
            <span className={`text-sm font-semibold ${
              invoice.status === 'paid'
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {invoice.status.toUpperCase()}
            </span>
          </div>
          {invoice.paymentMethod && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Payment Method:
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                {invoice.paymentMethod}
              </span>
            </div>
          )}
        </div>

        {/* Download Options */}
        <div className="space-y-3">
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="pdf"
                checked={format === 'pdf'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                PDF Document
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                CSV Spreadsheet
              </span>
            </label>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              fullWidth
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleDownload}
              isLoading={isDownloading}
              fullWidth
            >
              Download {format.toUpperCase()}
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Thank you for your business! For any questions, contact support@nexxus-pro.com
        </p>
      </div>
    </Modal>
  );
};

export default InvoiceDownload;