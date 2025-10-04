import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircleIcon, XCircleIcon, DocumentTextIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const BudgetReviewPage = () => {
  const { budgetId, reviewToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    console.log('🔍 BudgetReviewPage mounted with:', { budgetId, reviewToken, API_URL });
    fetchBudgetDetails();
  }, [budgetId, reviewToken]);

  // ✅ Manejar action DESPUÉS de cargar el presupuesto
  useEffect(() => {
    if (!budget || loading) return; // Esperar a que se cargue el presupuesto

    const action = searchParams.get('action');
    console.log('🎬 Action detected:', action);
    
    if (action === 'approve') {
      handleApprove();
    } else if (action === 'reject') {
      setShowRejectForm(true);
    }
  }, [budget, loading]); // Ejecutar cuando budget esté listo

  const fetchBudgetDetails = async () => {
    try {
      setLoading(true);
      console.log(`🌐 Fetching budget: ${API_URL}/budgets/${budgetId}/review/${reviewToken}`);
      
      const response = await axios.get(
        `${API_URL}/budgets/${budgetId}/review/${reviewToken}`
      );
      
      console.log('✅ Budget loaded:', response.data);
      setBudget(response.data);
    } catch (err) {
      console.error('❌ Error fetching budget:', err);
      console.error('Response:', err.response?.data);
      setError('Unable to load the budget proposal. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (processing) return;
    
    console.log('✅ Starting approval process...');
    
    if (!window.confirm('Are you sure you want to approve this budget proposal?')) {
      return;
    }

    try {
      setProcessing(true);
      console.log(`🌐 Approving: ${API_URL}/budgets/${budgetId}/approve-review/${reviewToken}`);
      
      const response = await axios.post(
        `${API_URL}/budgets/${budgetId}/approve-review/${reviewToken}`
      );

      console.log('✅ Approval response:', response.data);

      if (response.data.success) {
        setSuccess('Budget proposal approved successfully! We will contact you soon.');
      }
    } catch (err) {
      console.error('❌ Error approving budget:', err);
      console.error('Response:', err.response?.data);
      alert(err.response?.data?.error || 'Error approving the budget proposal');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (processing) return;
    
    // ✅ Permitir rechazo sin razón, pero advertir
    const confirmMessage = rejectReason.trim() 
      ? 'Are you sure you want to reject this budget proposal?' 
      : 'Are you sure you want to reject this proposal without providing a reason? We recommend adding feedback to help us improve.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await axios.post(
        `${API_URL}/budgets/${budgetId}/reject-review/${reviewToken}`,
        { reason: rejectReason.trim() || 'No reason provided' }
      );

      if (response.data.success) {
        setSuccess('We have received your feedback. We will contact you to discuss alternatives.');
      }
    } catch (err) {
      console.error('Error rejecting budget:', err);
      alert(err.response?.data?.error || 'Error rejecting the budget proposal');
    } finally {
      setProcessing(false);
    }
  };

  const viewPDF = () => {
    // Usar la ruta pública que incluye el reviewToken
    window.open(`${API_URL}/budgets/${budgetId}/view-pdf/${reviewToken}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading budget proposal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Thank You!
              </h1>
              <p className="text-blue-100 text-lg">
                Your response has been received
              </p>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12">
              <div className="text-center mb-8">
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  {success.includes('aprobado') || success.includes('approved') 
                    ? "We appreciate your approval! Our team will contact you shortly to proceed with the next steps and schedule your project."
                    : "We have received your feedback. Our team will review your comments and contact you soon to discuss alternatives."}
                </p>
                
                <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6">
                  <p className="text-blue-900 font-semibold mb-2">What happens next?</p>
                  <ul className="text-left text-blue-800 space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>You will receive a confirmation email within 24 hours</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Our team will reach out to discuss the project timeline</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>We'll guide you through every step of the process</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Company Info */}
              <div className="border-t border-gray-200 pt-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-blue-900 mb-2">Zurcher Septic</h3>
                  <p className="text-gray-600 text-sm font-semibold mb-1">SEPTIC TANK DIVISION</p>
                  <p className="text-gray-500 text-xs mb-4">License CFC1433240</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center justify-center md:justify-end">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href="mailto:admin@zurcherseptic.com" className="hover:text-blue-600 transition-colors">
                      admin@zurcherseptic.com
                    </a>
                  </div>
                  <div className="flex items-center justify-center md:justify-start">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href="tel:+14074194495" className="hover:text-blue-600 transition-colors">
                      +1 (407) 419-4495
                    </a>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="text-center">
                  <a
                    href="https://www.zurcherseptic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Visit Our Website
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                  <p className="text-xs text-gray-500 mt-3">
                    Professional Septic Installation & Maintenance
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-white text-sm">
            <p className="opacity-75">
              © {new Date().getFullYear()} Zurcher Septic. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!budget) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Budget Proposal Review
            </h1>
            <p className="text-gray-600">
              Zurcher Septic 
            </p>
          </div>
        </div>

        {/* Budget Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Budget Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Budget ID</p>
              <p className="text-lg font-semibold">#{budget.idBudget}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Project Address</p>
              <p className="text-lg font-semibold">{budget.propertyAddress}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Client</p>
              <p className="text-lg font-semibold">{budget.applicantName}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="text-lg font-semibold">
                {new Date(budget.date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">${parseFloat(budget.subtotalPrice).toFixed(2)}</span>
            </div>
            
            {budget.discountAmount > 0 && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount:</span>
                <span className="font-semibold">-${parseFloat(budget.discountAmount).toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between mb-4 text-xl font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-blue-600">${parseFloat(budget.totalPrice).toFixed(2)}</span>
            </div>
            
            <div className="bg-blue-50 rounded p-4">
              <div className="flex justify-between">
                <span className="text-gray-700">Initial Payment ({budget.initialPaymentPercentage}%):</span>
                <span className="font-bold text-blue-700">
                  ${parseFloat(budget.initialPayment).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {budget.generalNotes && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p className="text-sm font-semibold text-gray-700 mb-2">Notes:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{budget.generalNotes}</p>
            </div>
          )}
        </div>

       

        {/* Action Buttons */}
        {budget.status === 'pending_review' && !showRejectForm && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
              Do you want to approve this budget proposal?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircleIcon className="h-6 w-6" />
                {processing ? 'Processing...' : 'Approve Budget'}
              </button>
              
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircleIcon className="h-6 w-6" />
                Reject
              </button>
            </div>
            
            <p className="text-sm text-gray-500 text-center mt-4">
              This is a preliminary budget proposal. If you approve it, we will proceed to send you the official document for digital signature.
            </p>
          </div>
        )}

        {/* Reject Form */}
        {showRejectForm && budget.status === 'pending_review' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Reason for Rejection
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please help us understand why you're rejecting this proposal. Your feedback is valuable to improve our services. (Optional)
            </p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Example: The price is higher than expected, I need different specifications, I want to compare with other quotes, etc."
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={processing}
            />
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircleIcon className="h-5 w-5" />
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
              
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Already Reviewed */}
        {budget.status !== 'pending_review' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-600">
              This budget proposal has already been {budget.status === 'client_approved' ? 'approved' : 'processed'}.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              If you have any questions, please contact us directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetReviewPage;
