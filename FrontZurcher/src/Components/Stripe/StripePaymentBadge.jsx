import React from 'react';
import { CreditCardIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

/**
 * 💳 Badge especial para mostrar información de pagos de Stripe
 * Muestra el invoice number y link al dashboard de Stripe
 */
const StripePaymentBadge = ({ 
  stripePaymentIntentId, 
  stripeSessionId, 
  invoiceNumber,
  compact = false 
}) => {
  if (!stripePaymentIntentId && !stripeSessionId) {
    return null;
  }

  const stripeDashboardUrl = stripePaymentIntentId 
    ? `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`
    : stripeSessionId 
    ? `https://dashboard.stripe.com/test/payments/${stripeSessionId}` 
    : null;

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
          <CreditCardIcon className="h-3 w-3 mr-1" />
          Stripe
        </span>
        {stripeDashboardUrl && (
          <a
            href={stripeDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 transition-colors"
            title="Ver en Stripe Dashboard"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-purple-500 rounded-full p-1.5">
            <CreditCardIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-purple-900">
            Pago via Stripe
          </span>
        </div>
        {stripeDashboardUrl && (
          <a
            href={stripeDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-md transition-colors space-x-1"
          >
            <span>Ver en Stripe</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        )}
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        {invoiceNumber && (
          <div className="flex items-center space-x-2">
            <span className="font-medium">Invoice:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-purple-200">
              {invoiceNumber}
            </span>
          </div>
        )}
        {stripePaymentIntentId && (
          <div className="flex items-center space-x-2">
            <span className="font-medium">Payment ID:</span>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-purple-200">
              {stripePaymentIntentId}
            </span>
          </div>
        )}
        {stripeSessionId && (
          <div className="flex items-center space-x-2">
            <span className="font-medium">Session ID:</span>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-purple-200 truncate max-w-[200px]">
              {stripeSessionId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripePaymentBadge;
