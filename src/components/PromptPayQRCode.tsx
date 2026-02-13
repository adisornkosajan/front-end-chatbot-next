'use client';

import { useState, useEffect } from 'react';

interface PromptPayQRCodeProps {
  phoneNumber: string;
  amount?: number;
  onClose?: () => void;
}

export default function PromptPayQRCode({ phoneNumber, amount, onClose }: PromptPayQRCodeProps) {
  const [qrCodeImage, setQRCodeImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    generateQRCode();
  }, [phoneNumber, amount]);

  const generateQRCode = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ phoneNumber });
      if (amount && amount > 0) {
        params.append('amount', amount.toString());
      }

      const response = await fetch(
        `http://localhost:3001/api/plugins/qrcode/generate?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      setQRCodeImage(data.qrCodeImage);
    } catch (err) {
      setError('Unable to generate QR Code');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">PromptPay QR Code</h3>
                <p className="text-blue-100 text-sm">Scan to pay</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="p-8">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-gray-600">Generating QR Code...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <span className="text-red-600 text-2xl">⚠️</span>
              <p className="text-red-800 mt-2">{error}</p>
              <button
                onClick={generateQRCode}
                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && qrCodeImage && (
            <div className="flex flex-col items-center gap-4">
              {/* QR Code Image */}
              <div className="bg-white p-4 rounded-2xl shadow-lg border-4 border-gray-100">
                <img
                  src={qrCodeImage}
                  alt="PromptPay QR Code"
                  className="w-64 h-64"
                />
              </div>

              {/* Payment Info */}
              <div className="w-full bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Phone number</span>
                  <span className="font-semibold text-gray-900">{phoneNumber}</span>
                </div>
                {amount && amount > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-600 text-sm">Amount</span>
                    <span className="font-bold text-xl text-blue-600">
                      ฿{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800 text-center">
                  📱 Open your banking app → Scan QR Code → Confirm payment
                </p>
              </div>

              {/* Download Button */}
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCodeImage;
                  link.download = `promptpay-${phoneNumber}.png`;
                  link.click();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save QR Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
