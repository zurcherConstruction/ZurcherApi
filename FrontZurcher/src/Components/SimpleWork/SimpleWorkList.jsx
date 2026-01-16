import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSimpleWorks,
  deleteSimpleWork,
  generateSimpleWorkPdf,
  viewSimpleWorkPdf,
  sendSimpleWorkToClient,
  markSimpleWorkAsCompleted,
  clearSimpleWorkError,
  clearSimpleWorkSuccessMessage,
} from '../../Redux/Actions/simpleWorkActions';
import CreateSimpleWorkModal from './CreateSimpleWorkModal';
import AdvancedCreateSimpleWorkModal from './AdvancedCreateSimpleWorkModal';
import SimpleWorkPdfModal from './SimpleWorkPdfModal';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaEdit, FaTrash, FaFilePdf, FaEye, FaSearch, FaTimes, FaEnvelope, FaCheck 
} from 'react-icons/fa';

const SimpleWorkList = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const {
    simpleWorks,
    loading,
    error,
    successMessage
  } = useSelector(state => state.simpleWork);
  
  const { staff } = useSelector(state => state.auth);

  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    workType: '',
    search: '',
  });
  
  // PDF modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfUrlForModal, setPdfUrlForModal] = useState('');
  const [pdfTitleForModal, setPdfTitleForModal] = useState('');
  
  // Loading states
  const [viewingPdfId, setViewingPdfId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [completingWorkId, setCompletingWorkId] = useState(null);

  // Load simple works on component mount
  useEffect(() => {
    dispatch(fetchSimpleWorks());
    
    // Cleanup function to revoke object URLs
    return () => {
      if (pdfUrlForModal) {
        URL.revokeObjectURL(pdfUrlForModal);
      }
    };
  }, [dispatch]);

  // Handle success/error messages
  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(clearSimpleWorkSuccessMessage());
    }
  }, [successMessage, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearSimpleWorkError());
    }
  }, [error, dispatch]);

  // Filter simple works
  const filteredWorks = (simpleWorks || []).filter(work => {
    const matchesStatus = !filters.status || work.status === filters.status;
    const matchesType = !filters.workType || work.workType === filters.workType;
    const matchesSearch = !filters.search || 
      work.workType.toLowerCase().includes(filters.search.toLowerCase()) ||
      work.propertyAddress?.toLowerCase().includes(filters.search.toLowerCase()) ||
      (work.clientData?.name || '').toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    dispatch(fetchSimpleWorks(newFilters));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({ status: '', workType: '', search: '' });
    dispatch(fetchSimpleWorks());
  };

  // Handle edit work
  const handleEditWork = (work) => {
    setEditingWork(work);
    setShowCreateModal(true);
  };

  // Handle delete work
  const handleDeleteWork = async (workId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este trabajo?')) {
      try {
        await dispatch(deleteSimpleWork(workId));
      } catch (error) {
        // Error handled by Redux action
      }
    }
  };

  // Handle generate PDF (download)
  const handleGeneratePdf = (workId) => {
    dispatch(generateSimpleWorkPdf(workId));
  };

  // Handle view PDF (modal)
  const handleViewPdf = async (workId) => {
    setViewingPdfId(workId);
    
    // Clear previous PDF URL
    if (pdfUrlForModal) {
      URL.revokeObjectURL(pdfUrlForModal);
      setPdfUrlForModal('');
    }

    try {
      const pdfUrl = await dispatch(viewSimpleWorkPdf(workId));
      setPdfUrlForModal(pdfUrl);
      setPdfTitleForModal(`Trabajo Simple #${workId}`);
      setIsPdfModalOpen(true);
    } catch (error) {
      toast.error('Error al cargar PDF');
      console.error('Error loading PDF:', error);
    } finally {
      setViewingPdfId(null);
    }
  };

  // Handle send email to client
  const handleSendEmail = async (work) => {
    const clientEmail = work.clientData?.email || work.email;
    
    if (!clientEmail) {
      toast.error('No hay email de cliente configurado para este trabajo');
      return;
    }

    if (!window.confirm(
      `¿Enviar trabajo simple #${work.workNumber} al cliente?\n\n` +
      `📧 Destinatario: ${clientEmail}\n` +
      `📋 Se enviará el presupuesto del trabajo para revisión.\n\n` +
      `El cliente recibirá:\n` +
      `- PDF del trabajo con detalles y costos\n` +
      `- Información de contacto para aprobación`
    )) {
      return;
    }

    setSendingEmailId(work.id);
    
    try {
      await dispatch(sendSimpleWorkToClient(work.id));
      toast.success(`✅ Trabajo enviado exitosamente a ${clientEmail}`);
      
      // Forzar una actualización adicional después de un momento
      setTimeout(() => {
        console.log('🔄 Forzando refresh adicional después de envío de email...');
        dispatch(fetchSimpleWorks());
      }, 1000);
      
    } catch (error) {
      toast.error(`❌ Error al enviar trabajo: ${error.message}`);
      console.error('Error sending email:', error);
    } finally {
      setSendingEmailId(null);
    }
  };

  // Handle complete work
  const handleMarkAsCompleted = async (work) => {
    const totalCost = parseFloat(work.totalCost || work.finalAmount || work.estimatedAmount || 0);
    const totalPaid = parseFloat(work.totalPaid || 0);
    const isFullyPaid = totalPaid >= totalCost && totalCost > 0;
    
    const paymentStatus = isFullyPaid ? 
      '💰 Estado de pago: PAGADO COMPLETO' : 
      `💰 Estado de pago: PENDIENTE ($${(totalCost - totalPaid).toLocaleString('en-US', { minimumFractionDigits: 2 })} restante)`;
    
    if (!window.confirm(
      `¿Marcar trabajo #${work.workNumber} como TERMINADO?\\n\\n` +
      `📋 Cliente: ${work.clientData?.firstName || ''} ${work.clientData?.lastName || ''}\\n` +
      `🏠 Dirección: ${work.propertyAddress}\\n` +
      `${paymentStatus}\\n\\n` +
      `⚠️ Esta acción marcará el TRABAJO FÍSICO como finalizado.\\n` +
      `(El estado de pago es independiente del trabajo terminado)`
    )) {
      return;
    }

    setCompletingWorkId(work.id);
    
    try {
      await dispatch(markSimpleWorkAsCompleted(work.id));
      toast.success(`✅ Trabajo #${work.workNumber} marcado como terminado`);
      
      // Refrescar la lista para mostrar el estado actualizado
      dispatch(fetchSimpleWorks());
    } catch (error) {
      toast.error(`❌ Error al marcar como terminado: ${error.message}`);
      console.error('Error marking as completed:', error);
    } finally {
      setCompletingWorkId(null);
    }
  };

  // Close PDF modal
  const handleClosePdfModal = () => {
    if (pdfUrlForModal) {
      URL.revokeObjectURL(pdfUrlForModal);
      setPdfUrlForModal('');
    }
    setIsPdfModalOpen(false);
    setPdfTitleForModal('');
  };

  // Close modal and clear editing work
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingWork(null);
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      'quoted': 'bg-gray-100 text-gray-800',
      'sent': 'bg-blue-100 text-blue-800', 
      'invoiced': 'bg-orange-100 text-orange-800',
      'paid': 'bg-yellow-100 text-yellow-800', // Pagado pero trabajo pendiente
      'completed': 'bg-green-100 text-green-800', // Trabajo terminado
      'cancelled': 'bg-red-100 text-red-800',
      // Legacy statuses (maintain for backwards compatibility)
      'quote_sent': 'bg-blue-100 text-blue-800',
      'approved': 'bg-cyan-100 text-cyan-800',
      'in_progress': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Status text mapping
  const getStatusText = (status) => {
    const texts = {
      'quoted': 'Cotizado',
      'sent': 'Enviado al Cliente',
      'invoiced': 'Facturado',
      'paid': 'Pagado (Trabajo Pendiente)',
      'completed': '✓ Trabajo Terminado',
      'cancelled': 'Cancelado',
      // Legacy statuses (maintain for backwards compatibility)
      'quote_sent': 'Cotización Enviada',
      'approved': 'Aprobado para Iniciar',
      'in_progress': 'Trabajo en Progreso',
    };
    return texts[status] || status;
  };

  // Calculate financial summary
  const financialSummary = filteredWorks.reduce((acc, work) => {
    acc.totalQuoted += parseFloat(work.totalCost || 0);
    acc.totalPaid += parseFloat(work.totalPaid || 0);
    acc.totalExpenses += parseFloat(work.totalExpenses || 0);
    acc.totalProfit += (parseFloat(work.totalPaid || 0) - parseFloat(work.totalExpenses || 0));
    return acc;
  }, { totalQuoted: 0, totalPaid: 0, totalExpenses: 0, totalProfit: 0 });

  if (loading && simpleWorks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Trabajos Simples
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => dispatch(fetchSimpleWorks())}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              title="Actualizar lista"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FaPlus />
              <span>Nueva Cotización</span>
            </button>
          </div>
        </div>

      

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="quote_sent">Cotización Enviada</option>
                <option value="approved">Aprobado</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Trabajo</label>
              <select
                value={filters.workType}
                onChange={(e) => handleFilterChange('workType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="culvert">Culvert</option>
                <option value="drainfield">Drainfield</option>
                <option value="repair">Reparación</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Buscar por cliente, dirección, tipo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
              >
                <FaTimes />
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Works List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredWorks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No se encontraron trabajos simples</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Trabajo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado de Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorks.map((work) => (
                  <tr key={work.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {(() => {
                            // Try different ways to get client name
                            if (work.clientData?.firstName) {
                              return `${work.clientData.firstName} ${work.clientData.lastName || ''}`.trim();
                            } else if (work.clientData?.name) {
                              return work.clientData.name;
                            } else if (work.firstName) {
                              return `${work.firstName} ${work.lastName || ''}`.trim();
                            } else {
                              return 'Sin nombre';
                            }
                          })()} 
                        </div>
                        <div className="text-sm text-gray-500">
                          {work.clientData?.email || work.email || 'Sin email'}
                        </div>
                        {(work.clientData?.phone || work.phone) && (
                          <div className="text-xs text-gray-400">
                            {work.clientData?.phone || work.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {work.workType.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {work.propertyAddress || work.address || 'Sin dirección'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {/* Estado del trabajo */}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(work.status)}`}>
                          {getStatusText(work.status)}
                        </span>
                        
                        {/* Estado de pago adicional */}
                        {(() => {
                          const totalCost = parseFloat(work.totalCost || work.finalAmount || work.estimatedAmount || 0);
                          const totalPaid = parseFloat(work.totalPaid || 0);
                          
                          if (totalPaid >= totalCost && totalCost > 0) {
                            return (
                              <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                💰 Pagado Completo
                              </div>
                            );
                          } else if (totalPaid > 0) {
                            return (
                              <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                💰 Pago Parcial
                              </div>
                            );
                          } else if (work.status !== 'quoted' && work.status !== 'sent') {
                            return (
                              <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                💰 Sin Pagar
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">
                          Total: ${parseFloat(work.totalCost || work.finalAmount || work.estimatedAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Mostrar desglose de pago igual que BudgetList */}
                        {work.initialPaymentPercentage && work.initialPaymentPercentage < 100 && (
                          <div className="text-xs text-gray-600 mt-1 font-semibold">
                            Pay {work.initialPaymentPercentage}%: ${parseFloat(work.initialPayment || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-green-600">
                          Pagado: ${parseFloat(work.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        {(() => {
                          const totalCost = parseFloat(work.totalCost || work.finalAmount || work.estimatedAmount || 0);
                          const totalPaid = parseFloat(work.totalPaid || 0);
                          const remaining = totalCost - totalPaid;
                          
                          if (remaining > 0) {
                            return (
                              <div className="text-xs text-orange-600 mt-1">
                                Falta: ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            );
                          } else if (remaining === 0 && totalPaid > 0) {
                            return (
                              <div className="text-xs text-green-600 mt-1 font-semibold">
                                ✓ Completamente pagado
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(work.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {/* View PDF Button */}
                        <button
                          onClick={() => handleViewPdf(work.id)}
                          disabled={viewingPdfId === work.id}
                          className="text-green-600 hover:text-green-900 p-1 disabled:opacity-50"
                          title="Ver Presupuesto"
                        >
                          {viewingPdfId === work.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <FaEye />
                          )}
                        </button>
                        
                        {/* Send Email Button */}
                        <button
                          onClick={() => handleSendEmail(work)}
                          disabled={sendingEmailId === work.id}
                          className="text-blue-600 hover:text-blue-900 p-1 disabled:opacity-50"
                          title="Enviar por Email"
                        >
                          {sendingEmailId === work.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <FaEnvelope />
                          )}
                        </button>
                        
                        {/* Download PDF Button */}
                        <button
                          onClick={() => handleGeneratePdf(work.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Descargar PDF"
                        >
                          <FaFilePdf />
                        </button>
                        
                        {/* Complete Work Button - Para trabajos que no están completados */}
                        {work.status !== 'completed' && work.status !== 'cancelled' && (
                          <button
                            onClick={() => handleMarkAsCompleted(work)}
                            disabled={completingWorkId === work.id}
                            className="text-green-600 hover:text-green-900 p-1 disabled:opacity-50"
                            title="Marcar Trabajo como Terminado"
                          >
                            {completingWorkId === work.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <FaCheck />
                            )}
                          </button>
                        )}
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditWork(work)}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        
                        {/* Delete Button */}
                        {(staff?.role === 'admin' || staff?.role === 'manager') && (
                          <button
                            onClick={() => handleDeleteWork(work.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advanced Create/Edit Modal */}
      {showCreateModal && (
        <AdvancedCreateSimpleWorkModal
          isOpen={showCreateModal}
          onClose={handleCloseModal}
          editingWork={editingWork}
          onWorkCreated={() => {
            dispatch(fetchSimpleWorks(filters));
          }}
        />
      )}

      {/* PDF Modal */}
      <SimpleWorkPdfModal
        isOpen={isPdfModalOpen}
        onClose={handleClosePdfModal}
        pdfUrl={pdfUrlForModal}
        title={pdfTitleForModal}
      />
    </div>
  );
};

export default SimpleWorkList;