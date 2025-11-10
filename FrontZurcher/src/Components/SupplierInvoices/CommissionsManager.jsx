import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  FaUserTie,
  FaHandHoldingUsd,
} from 'react-icons/fa';
import { PAYMENT_METHODS_GROUPED } from '../../utils/paymentConstants';

const CommissionsManager = () => {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [commissionFilter, setCommissionFilter] = useState('all'); // all, paid, pending
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [commissionsData, setCommissionsData] = useState({
    summary: {},
    bySalesRep: [],
    byExternalReferral: [],
    allBudgets: []
  });

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/accounts-receivable/pending-commissions`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setCommissionsData(response.data);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCommissionPaid = (budgetId, currentStatus, workId) => {
    if (!workId && !currentStatus) {
      alert('⚠️ No se puede pagar la comisión: Este presupuesto no se ha convertido en Work confirmado.');
      return;
    }

    const budget = commissionsData.allBudgets.find(b => b.budgetId === budgetId);
    setSelectedCommission({
      budgetId,
      currentStatus,
      workId,
      ...budget
    });
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedCommission(null);
    setPaymentFile(null);
    setPaymentNotes('');
    setPaymentMethod('');
    setPaymentDetails('');
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedCommission.currentStatus && (!paymentFile || !paymentMethod)) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setUploadingPayment(true);

      const newStatus = !selectedCommission.currentStatus;

      const formData = new FormData();
      formData.append('paid', newStatus);
      
      // Usar fecha local sin conversión UTC (evita restar un día)
      const today = new Date();
      const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      formData.append('paidDate', localDate);

      if (newStatus) {
        // Solo para marcar como pagada
        formData.append('paymentMethod', paymentMethod);
        if (paymentDetails) formData.append('paymentDetails', paymentDetails);
        if (paymentNotes) formData.append('notes', paymentNotes);
        if (paymentFile) formData.append('file', paymentFile);
      }

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/accounts-receivable/${selectedCommission.budgetId}/commission-paid`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const message = !selectedCommission.currentStatus
          ? `✅ Comisión pagada correctamente!\n\n` +
            `💰 Expense creado: $${response.data.expense?.amount || 0}\n` +
            `📄 Método: ${response.data.expense?.paymentMethod || 'N/A'}\n` +
            `${response.data.receipt ? '📎 Comprobante adjuntado\n' : ''}` +
            `🏢 Proveedor: ${response.data.expense?.vendor || 'N/A'}`
          : '✅ Comisión marcada como pendiente';
        
        alert(message);
      } else {
        alert(
          selectedCommission.currentStatus
            ? '✅ Comisión marcada como pendiente exitosamente'
            : '✅ Comisión marcada como pagada exitosamente'
        );
      }

      handleClosePaymentModal();
      await fetchCommissions();
    } catch (error) {
      console.error('Error updating commission:', error);
      alert('❌ Error al actualizar el estado de la comisión');
    } finally {
      setUploadingPayment(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Comisiones */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">Filtrar:</span>
          <button
            onClick={() => setCommissionFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              commissionFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({commissionsData.allBudgets?.length || 0})
          </button>
          <button
            onClick={() => setCommissionFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              commissionFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes ({commissionsData.allBudgets?.filter(b => !b.commissionPaid).length || 0})
          </button>
          <button
            onClick={() => setCommissionFilter('paid')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              commissionFilter === 'paid'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pagadas ({commissionsData.allBudgets?.filter(b => b.commissionPaid).length || 0})
          </button>
        </div>
      </div>

      {/* Commissions by Sales Rep */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FaUserTie className="text-purple-500" />
          Comisiones por Vendedor (Staff Interno)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {commissionsData.bySalesRep.map((salesRep) => (
            <div key={salesRep.staffId} className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500 text-white rounded-full w-12 h-12 flex items-center justify-center">
                  <FaUserTie className="text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{salesRep.staffName}</h3>
                  <p className="text-sm text-gray-600">{salesRep.staffEmail}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Comisiones:</span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatCurrency(salesRep.totalCommissions)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pagadas:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(salesRep.totalPaid || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pendientes:</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {formatCurrency(salesRep.totalPending || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Budgets:</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {salesRep.budgetsCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Commissions by External Referral - SUMMARY CARD ONLY */}
        {commissionsData.byExternalReferral && commissionsData.byExternalReferral.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8 flex items-center gap-2">
              <FaHandHoldingUsd className="text-green-500" />
              Comisiones por Referido Externo
            </h2>
            
            {/* Una sola tarjeta de resumen para todos los external referrals */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-500 text-white rounded-full w-14 h-14 flex items-center justify-center">
                  <FaHandHoldingUsd className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Referidos Externos</h3>
                  <p className="text-sm text-gray-600">
                    {commissionsData.byExternalReferral.length} referido(s) con comisiones
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 uppercase mb-1">Total Comisiones</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      commissionsData.byExternalReferral.reduce((sum, ref) => sum + ref.totalCommissions, 0)
                    )}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 uppercase mb-1">Pagadas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      commissionsData.byExternalReferral.reduce((sum, ref) => sum + (ref.totalPaid || 0), 0)
                    )}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 uppercase mb-1">Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(
                      commissionsData.byExternalReferral.reduce((sum, ref) => sum + (ref.totalPending || 0), 0)
                    )}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 uppercase mb-1">Total Budgets</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {commissionsData.byExternalReferral.reduce((sum, ref) => sum + ref.budgetsCount, 0)}
                  </p>
                </div>
              </div>
              
              {/* Lista compacta de referidos */}
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Desglose por Referido:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {commissionsData.byExternalReferral.map((referral, index) => (
                    <div key={`external-${index}`} className="bg-white rounded p-3 border border-green-100 text-sm">
                      <p className="font-semibold text-gray-800 truncate" title={referral.referralName}>
                        {referral.referralName}
                      </p>
                      {referral.referralCompany && (
                        <p className="text-xs text-gray-500 truncate">{referral.referralCompany}</p>
                      )}
                      <div className="flex justify-between mt-2 text-xs">
                        <span className="text-gray-600">{referral.budgetsCount} budget(s)</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(referral.totalCommissions)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* All Budgets with Commissions */}
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Detalle de Comisiones</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Budget ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Propiedad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendedor/Referido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado Work
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissionsData.allBudgets
                .filter(budget => {
                  if (commissionFilter === 'all') return true;
                  if (commissionFilter === 'paid') return budget.commissionPaid;
                  if (commissionFilter === 'pending') return !budget.commissionPaid;
                  return true;
                })
                .map((budget) => (
                <tr key={budget.budgetId} className={`hover:bg-gray-50 ${
                  budget.commissionPaid ? 'bg-green-50' : ''
                }`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    #{budget.budgetId}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {budget.propertyAddress}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {budget.leadSource === 'sales_rep' ? (
                      <div>
                        <p className="font-semibold text-purple-600">{budget.salesRepName}</p>
                        <p className="text-xs text-gray-500">Vendedor Interno</p>
                      </div>
                    ) : budget.leadSource === 'external_referral' ? (
                      <div>
                        <p className="font-semibold text-green-600">{budget.externalReferralName}</p>
                        <p className="text-xs text-gray-500">
                          {budget.externalReferralCompany || 'Referido Externo'}
                        </p>
                        {budget.externalReferralEmail && (
                          <p className="text-xs text-gray-400">{budget.externalReferralEmail}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      budget.leadSource === 'sales_rep'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {budget.leadSource === 'sales_rep' ? 'Staff' : 'Externo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {budget.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(budget.commissionAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      budget.commissionPaid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {budget.commissionPaid ? 'Pagada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {budget.commissionPaid ? formatDate(budget.commissionPaidDate) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {budget.budgetStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {budget.workStatus === 'no_work' ? (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                          {budget.workStatus}
                        </span>
                        {!budget.commissionPaid && (
                          <span className="text-orange-500" title="No se puede pagar sin Work confirmado">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {budget.workStatus}
                        </span>
                        {!budget.commissionPaid && (
                          <span className="text-green-500" title="Work confirmado - Comisión puede pagarse">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(budget.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {budget.commissionPaid ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                          ✓ Pagada
                        </span>
                        {budget.commissionPaidDate && (
                          <span className="text-xs text-gray-500">
                            {formatDate(budget.commissionPaidDate)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleCommissionPaid(budget.budgetId, budget.commissionPaid, budget.workId)}
                        disabled={!budget.workId}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          !budget.workId
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-500 text-white hover:bg-purple-600'
                        }`}
                        title={!budget.workId ? 'No se puede pagar: presupuesto sin Work confirmado' : 'Marcar comisión como pagada'}
                      >
                        💰 Marcar Pagada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCommission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">
                  {selectedCommission.currentStatus ? '❌ Marcar Comisión como Pendiente' : '💰 Marcar Comisión como Pagada'}
                </h3>
                <button
                  onClick={handleClosePaymentModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-6">
              {/* Commission Details */}
              <div className={`rounded-lg p-4 border ${
                selectedCommission.leadSource === 'sales_rep' 
                  ? 'bg-purple-50 border-purple-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <h4 className={`font-semibold mb-3 ${
                  selectedCommission.leadSource === 'sales_rep' 
                    ? 'text-purple-800' 
                    : 'text-green-800'
                }`}>
                  Detalles de la Comisión
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">Budget ID:</span> #{selectedCommission.budgetId}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Propiedad:</span> {selectedCommission.propertyAddress}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Tipo:</span>{' '}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedCommission.leadSource === 'sales_rep'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedCommission.leadSource === 'sales_rep' ? 'Vendedor Interno (Staff)' : 'Referido Externo'}
                    </span>
                  </p>
                  {selectedCommission.leadSource === 'sales_rep' ? (
                    <p className="text-gray-700">
                      <span className="font-medium">Vendedor:</span> {selectedCommission.salesRepName}
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-700">
                        <span className="font-medium">Referido:</span> {selectedCommission.externalReferralName}
                      </p>
                      {selectedCommission.externalReferralCompany && (
                        <p className="text-gray-700">
                          <span className="font-medium">Empresa:</span> {selectedCommission.externalReferralCompany}
                        </p>
                      )}
                      {selectedCommission.externalReferralEmail && (
                        <p className="text-gray-700">
                          <span className="font-medium">Email:</span> {selectedCommission.externalReferralEmail}
                        </p>
                      )}
                      {selectedCommission.externalReferralPhone && (
                        <p className="text-gray-700">
                          <span className="font-medium">Teléfono:</span> {selectedCommission.externalReferralPhone}
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-gray-700">
                    <span className="font-medium">Cliente:</span> {selectedCommission.clientName}
                  </p>
                  {selectedCommission.workId && (
                    <p className="text-gray-700">
                      <span className="font-medium">Work ID:</span> 
                      <span className="text-blue-600 font-semibold ml-2">{selectedCommission.workId}</span>
                      <span className="text-xs text-green-600 ml-2 font-medium">
                        ✓ Presupuesto confirmado como trabajo
                      </span>
                    </p>
                  )}
                  {!selectedCommission.workId && (
                    <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                      <p className="text-orange-700 text-sm font-medium flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                          ⚠️ Este presupuesto NO se ha convertido en Work confirmado. 
                          Solo se pueden pagar comisiones de presupuestos aprobados que se convirtieron en trabajos activos.
                        </span>
                      </p>
                    </div>
                  )}
                  <p className="text-gray-700">
                    <span className="font-medium">Monto de Comisión:</span> 
                    <span className="text-lg font-bold text-purple-600 ml-2">
                      {formatCurrency(selectedCommission.commissionAmount)}
                    </span>
                  </p>
                </div>
              </div>

              {/* File Upload - Only required when marking as paid */}
              {!selectedCommission.currentStatus && (
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Comprobante de Pago <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf, image/jpeg, image/png, image/gif"
                    onChange={(e) => setPaymentFile(e.target.files[0])}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    required={!selectedCommission.currentStatus}
                  />
                  {paymentFile && (
                    <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600 bg-green-50 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Archivo seleccionado: <span className="font-medium">{paymentFile.name}</span></span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    📎 Adjunta el comprobante de transferencia, cheque o recibo de pago de la comisión
                  </p>
                </div>
              )}

              {/* Payment Method - Only required when marking as paid */}
              {!selectedCommission.currentStatus && (
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Método de Pago <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    required={!selectedCommission.currentStatus}
                  >
                    <option value="">Seleccione método de pago...</option>
                    {Object.entries(PAYMENT_METHODS_GROUPED).map(([category, methods]) => (
                      <optgroup key={category} label={category.toUpperCase()}>
                        {methods.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment Details - Optional */}
              {!selectedCommission.currentStatus && (
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Detalles de Pago (Opcional)
                  </label>
                  <input
                    type="text"
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Cheque #12345, Últimos 4 dígitos: 9876, Ref: TRF001234..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💳 Información adicional como número de cheque, referencia de transferencia o últimos 4 dígitos de tarjeta
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notas (Opcional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Método de pago, número de cheque, referencia de transferencia, etc..."
                />
              </div>

              {/* Warning for unpaid */}
              {selectedCommission.currentStatus && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-medium text-yellow-800 text-sm">⚠️ Advertencia</p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Estás a punto de marcar esta comisión como NO pagada. Esta acción revertirá el estado de pago.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={uploadingPayment}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingPayment || (!selectedCommission.currentStatus && (!paymentFile || !paymentMethod))}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedCommission.currentStatus
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {uploadingPayment ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    <span>
                      {selectedCommission.currentStatus ? 'Marcar como Pendiente' : 'Confirmar Pago'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsManager;
