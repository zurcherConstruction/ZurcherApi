import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchBudgets,
  fetchBudgetById,
  deleteBudget,
  updateBudget,
  downloadSignedBudget
} from '../../Redux/Actions/budgetActions';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  CalendarDaysIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import api from '../../utils/axios';
import '@react-pdf-viewer/core/lib/styles/index.css';

const GestionBudgets = () => {
  const dispatch = useDispatch();
  const {
    budgets,
    loading,
    error,
    currentBudget  // Agregar este selector
  } = useSelector(state => state.budget);


  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showSignedPdfModal, setShowSignedPdfModal] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [downloadingSignedPdf, setDownloadingSignedPdf] = useState(false);

  // Estados para el modal de edición
  const [editData, setEditData] = useState({
    date: '',
    expirationDate: '',
    status: '',
    discountAmount: '',
    discountDescription: '',
    generalNotes: '',
    initialPaymentPercentage: '',
    lineItems: []
  });
  // Estado para agregar items manuales
  const [manualItemData, setManualItemData] = useState({
    category: "",
    name: "",
    unitPrice: "",
    quantity: "1",
    notes: ""
  });

  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // Obtener años únicos de los budgets
  const availableYears = useMemo(() => {
    if (!budgets?.length) return [];
    const years = [...new Set(budgets.map(budget => new Date(budget.date).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [budgets]);

  // Filtrar budgets
  const filteredBudgets = useMemo(() => {
    if (!budgets) return [];

    return budgets.filter(budget => {
      // Filtro por dirección
      const matchesSearch = budget.propertyAddress
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        budget.applicantName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Filtro por estado
      const matchesStatus = statusFilter === 'all' || budget.status === statusFilter;

      // Filtro por mes
      const budgetDate = new Date(budget.date);
      const matchesMonth = monthFilter === 'all' ||
        budgetDate.getMonth() === parseInt(monthFilter);

      // Filtro por año
      const matchesYear = yearFilter === 'all' ||
        budgetDate.getFullYear() === parseInt(yearFilter);

      return matchesSearch && matchesStatus && matchesMonth && matchesYear;
    });
  }, [budgets, searchTerm, statusFilter, monthFilter, yearFilter]);

  // Estadísticas de budgets
  const budgetStats = useMemo(() => {
    if (!budgets) return {};

    return {
      total: budgets.length,
      pending: budgets.filter(b => b.status === 'pending').length,
      approved: budgets.filter(b => b.status === 'approved').length,
      rejected: budgets.filter(b => b.status === 'rejected').length,
      created: budgets.filter(b => b.status === 'created').length,
      send: budgets.filter(b => b.status === 'send').length, // ✅ Mantener "send" para emails enviados
      sentForSignature: budgets.filter(b => b.status === 'sent_for_signature').length, // ✅ NUEVO
      signed: budgets.filter(b => b.status === 'signed').length, // ✅ NUEVO
      notResponded: budgets.filter(b => b.status === 'notResponded').length, // ✅ NUEVO
    };
  }, [budgets]);

  const handleEdit = (budget) => {
    setSelectedBudget(budget);

    // Necesitamos cargar los datos completos del budget incluyendo lineItems
    dispatch(fetchBudgetById(budget.idBudget)).then(() => {
      // Los datos se cargarán en currentBudget y se procesarán en el useEffect
    });

    setShowEditModal(true);
  };
  // Nuevo useEffect para manejar los datos del currentBudget en el modal de edición
  useEffect(() => {
    if (currentBudget && selectedBudget && currentBudget.idBudget === selectedBudget.idBudget && showEditModal) {
      setEditData({
        date: currentBudget.date ? currentBudget.date.split('T')[0] : '',
        expirationDate: currentBudget.expirationDate ? currentBudget.expirationDate.split('T')[0] : '',
        status: currentBudget.status,
        discountAmount: currentBudget.discountAmount || '',
        discountDescription: currentBudget.discountDescription || '',
        generalNotes: currentBudget.generalNotes || '',
        initialPaymentPercentage: currentBudget.initialPaymentPercentage || 60,
        lineItems: (currentBudget.lineItems || []).map(item => ({
          id: item.id,
          budgetItemId: item.budgetItemId,
          quantity: parseInt(item.quantity) || 0,
          notes: item.notes || '',
          name: item.itemDetails?.name || item.name || 'N/A',
          category: item.itemDetails?.category || item.category || 'N/A',
          marca: item.itemDetails?.marca || item.marca || '',
          capacity: item.itemDetails?.capacity || item.capacity || '',
          unitPrice: parseFloat(item.priceAtTimeOfBudget || item.itemDetails?.unitPrice || item.unitPrice || 0),
        }))
      });
    }
  }, [currentBudget, selectedBudget, showEditModal]);

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    setEditData(prev => {
      const updatedLineItems = [...prev.lineItems];
      updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
      return { ...prev, lineItems: updatedLineItems };
    });
  };

  const handleRemoveLineItem = (indexToRemove) => {
    setEditData(prev => {
      const updatedLineItems = prev.lineItems.filter((_, index) => index !== indexToRemove);
      return { ...prev, lineItems: updatedLineItems };
    });
  };

  const handleManualItemChange = (e) => {
    const { name, value } = e.target;
    setManualItemData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualItem = () => {
    const unitPriceNum = parseFloat(manualItemData.unitPrice);
    const quantityNum = parseFloat(manualItemData.quantity);

    if (!manualItemData.category.trim() || !manualItemData.name.trim()) {
      alert("Por favor, completa la categoría y el nombre del item manual.");
      return;
    }
    if (isNaN(unitPriceNum) || unitPriceNum < 0) {
      alert("Por favor, ingresa un precio unitario válido.");
      return;
    }
    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert("Por favor, ingresa una cantidad válida.");
      return;
    }

    const newItem = {
      category: manualItemData.category.trim(),
      name: manualItemData.name.trim(),
      unitPrice: unitPriceNum,
      quantity: quantityNum,
      notes: manualItemData.notes.trim(),
      marca: '',
      capacity: '',
    };

    setEditData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));

    setManualItemData({ category: "", name: "", unitPrice: "", quantity: "1", notes: "" });
  };

  // Calcular totales
  const calculateTotals = () => {
    const subtotal = editData.lineItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * price);
    }, 0);

    const discount = parseFloat(editData.discountAmount) || 0;
    const total = subtotal - discount;

    let payment = 0;
    const percentage = parseFloat(editData.initialPaymentPercentage);
    if (!isNaN(percentage)) {
      payment = (total * percentage) / 100;
    }

    return { subtotal, total, payment };
  };

  const { subtotal, total, payment } = calculateTotals();

const handleSaveEdit = async () => {
  if (!selectedBudget) return;
  
  try {
    const dataToSend = {
      date: editData.date,
      expirationDate: editData.expirationDate || null,
      status: editData.status,
      discountDescription: editData.discountDescription,
      discountAmount: parseFloat(editData.discountAmount) || 0,
      generalNotes: editData.generalNotes,
      initialPaymentPercentage: parseFloat(editData.initialPaymentPercentage) || 60,
      lineItems: editData.lineItems.map(item => ({
        id: item.id,
        budgetItemId: item.budgetItemId,
        category: item.category,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: parseFloat(item.quantity) || 0,
        notes: item.notes,
        marca: item.marca,
        capacity: item.capacity,
      }))
    };

    // ✅ LÓGICA MEJORADA para presupuestos en SignNow
    if (selectedBudget.status === 'sent_for_signature') {
      // Verificar si hubo cambios significativos
      const hasSignificantChanges = 
        editData.status !== 'sent_for_signature' || // Cambio de estado
        JSON.stringify(dataToSend.lineItems) !== JSON.stringify(selectedBudget.lineItems) || // Cambio en items
        dataToSend.discountAmount !== selectedBudget.discountAmount || // Cambio en descuento
        dataToSend.generalNotes !== selectedBudget.generalNotes; // Cambio en notas
      
      if (hasSignificantChanges) {
        const userChoice = window.confirm(
          '⚠️ ADVERTENCIA: Este presupuesto ya fue enviado a SignNow para firma.\n\n' +
          'Se detectaron cambios significativos. ¿Qué deseas hacer?\n\n' +
          '✅ OK = Reenviar automáticamente con los cambios\n' +
          '❌ Cancelar = Solo guardar sin reenviar\n\n' +
          'Si eliges reenviar:\n' +
          '• Se cancelará el documento actual en SignNow\n' +
          '• Se generará un nuevo PDF\n' +
          '• Se enviará automáticamente por email y SignNow\n' +
          '• El cliente recibirá nuevas notificaciones'
        );
        
        if (userChoice) {
          // ✅ Usuario eligió reenviar automáticamente
          dataToSend.status = 'send'; // Cambiar a 'send' para que se procese automáticamente
          console.log('🔄 Reenviando presupuesto automáticamente...');
        }
        // Si no eligió reenviar, mantener el estado actual y solo guardar cambios
      }
    }

    await dispatch(updateBudget(selectedBudget.idBudget, dataToSend));
    setShowEditModal(false);
    setSelectedBudget(null);
    dispatch(fetchBudgets());
    
    // ✅ Mensajes de éxito más específicos
    if (dataToSend.status === 'send') {
      if (selectedBudget.status === 'sent_for_signature') {
        alert('✅ Presupuesto actualizado y reenviado automáticamente al cliente por email y SignNow.');
      } else {
        alert('✅ Presupuesto actualizado y enviado al cliente por email.');
      }
    } else {
      alert('✅ Presupuesto actualizado exitosamente.');
    }
    
  } catch (error) {
    console.error('Error al actualizar budget:', error);
    alert('Error al actualizar el presupuesto: ' + (error.message || 'Error desconocido'));
  }
};

  const handleDelete = async (budgetId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      try {
        await dispatch(deleteBudget(budgetId));
        dispatch(fetchBudgets()); // Refrescar la lista
      } catch (error) {
        console.error('Error al eliminar budget:', error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'created': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Creado' },
      'send': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Enviado' },
      'sent_for_signature': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Para Firma' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      'signed': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Firmado' },
      'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprobado' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rechazado' },
      'notResponded': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Sin Respuesta' }
    };

    const config = statusConfig[status] || statusConfig['created'];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const canEdit = (budget) => {
    return !['approved', 'signed'].includes(budget.status);
  };
  // Nueva función para verificar si se puede eliminar
  const canDelete = (budget) => {
    return !['approved', 'signed'].includes(budget.status);
  };

  // Nueva función para mostrar detalles
  const handleViewDetails = (budget) => {
    setSelectedBudget(budget);
    setShowDetailModal(true);
  };


  // Handler para ver PDF firmado (usando Vite env)
  const handleViewSignedPdf = async (budget) => {
    // Usar el mismo cliente axios para obtener la URL blob
    try {
      const response = await api.get(`/budget/${budget.idBudget}/download-signed`, {
        responseType: 'blob',
        withCredentials: true,
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      setSignedPdfUrl(url);
      setShowSignedPdfModal(true);
    } catch (error) {
      alert('No se pudo cargar el PDF firmado.');
    }
  };

  // Handler para descargar el PDF firmado
  const handleDownloadSignedPdf = async () => {
    if (!selectedBudget) return;
    setDownloadingSignedPdf(true);
    try {
      await dispatch(downloadSignedBudget(selectedBudget.idBudget));
    } catch (e) {
      alert('No se pudo descargar el PDF firmado.');
    }
    setDownloadingSignedPdf(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Presupuestos</h1>
        <p className="text-gray-600">Administra todos los presupuestos del sistema</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{budgetStats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-600">{budgetStats.created}</div>
          <div className="text-sm text-gray-600">Creados</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{budgetStats.send}</div>
          <div className="text-sm text-gray-600">Enviados</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{budgetStats.sentForSignature}</div>
          <div className="text-sm text-gray-600">Para Firma</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-indigo-600">{budgetStats.signed}</div>
          <div className="text-sm text-gray-600">Firmados</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{budgetStats.approved}</div>
          <div className="text-sm text-gray-600">Aprobados</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{budgetStats.rejected}</div>
          <div className="text-sm text-gray-600">Rechazados</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{budgetStats.notResponded}</div>
          <div className="text-sm text-gray-600">Sin Respuesta</div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="relative lg:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por dirección o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="created">Creado</option>
            <option value="send">Enviado</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
            <option value="notResponded">Sin Respuesta</option>
            <option value="sent_for_signature">Para Firma</option>
            <option value="signed">Firmado</option>
          </select>

          {/* Filtro por Mes */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los meses</option>
            <option value="0">Enero</option>
            <option value="1">Febrero</option>
            <option value="2">Marzo</option>
            <option value="3">Abril</option>
            <option value="4">Mayo</option>
            <option value="5">Junio</option>
            <option value="6">Julio</option>
            <option value="7">Agosto</option>
            <option value="8">Septiembre</option>
            <option value="9">Octubre</option>
            <option value="10">Noviembre</option>
            <option value="11">Diciembre</option>
          </select>

          {/* Filtro por Año */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los años</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Budgets */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dirección
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBudgets.map((budget) => (
                <tr key={budget.idBudget} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{budget.idBudget}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.applicantName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {budget.propertyAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(budget.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${Number(budget.totalPrice || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(budget.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(budget)}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="Ver Detalles"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {canEdit(budget) && (
                        <button
                          onClick={() => handleEdit(budget)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete(budget) && (
                        <button
                          onClick={() => handleDelete(budget.idBudget)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                      {!canDelete(budget) && (
                        <button
                          disabled
                          className="text-gray-400 p-1 rounded cursor-not-allowed"
                          title="No se puede eliminar (Aprobado/Firmado)"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                      {budget.status === 'signed' && (
                        <button
                          onClick={() => handleViewSignedPdf(budget)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="Ver PDF Firmado"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBudgets.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay presupuestos</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron presupuestos con los filtros aplicados.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalles */}
      {showDetailModal && selectedBudget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Detalles del Presupuesto #{selectedBudget.idBudget}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información del Cliente */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Información del Cliente</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Nombre:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.applicantName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <p className="text-sm text-gray-900">
                        {selectedBudget.Permit?.applicantEmail || selectedBudget.applicantEmail || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Teléfono:</span>
                      <p className="text-sm text-gray-900">
                        {selectedBudget.Permit?.applicantPhone || selectedBudget.applicantPhone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Dirección:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.propertyAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Información del Presupuesto */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Información del Presupuesto</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Estado:</span>
                      <div className="mt-1">{getStatusBadge(selectedBudget.status)}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de Creación:</span>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedBudget.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de Expiración:</span>
                      <p className="text-sm text-gray-900">
                        {selectedBudget.expirationDate
                          ? new Date(selectedBudget.expirationDate).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                      <p className="text-sm text-gray-900">
                        ${Number(selectedBudget.subtotalPrice || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Descuento:</span>
                      <p className="text-sm text-gray-900">
                        ${Number(selectedBudget.discountAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Total:</span>
                      <p className="text-lg font-bold text-gray-900">
                        ${Number(selectedBudget.totalPrice || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Pago Inicial:</span>
                      <p className="text-sm text-gray-900">
                        ${Number(selectedBudget.initialPayment || 0).toLocaleString()}
                        ({selectedBudget.initialPaymentPercentage || 60}%)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información del Permit */}
                {selectedBudget.Permit && (
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Información del Permit</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Lote:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.lot || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Bloque:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.block || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Tipo de Sistema:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.systemType || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Capacidad GPD:</span>
                        <p className="text-sm text-gray-900">{selectedBudget.Permit.gpdCapacity || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {(selectedBudget.generalNotes || selectedBudget.discountDescription) && (
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Notas</h4>
                    {selectedBudget.discountDescription && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-600">Descripción del Descuento:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedBudget.discountDescription}</p>
                      </div>
                    )}
                    {selectedBudget.generalNotes && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Notas Generales:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedBudget.generalNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición Ampliado */}
      {showEditModal && selectedBudget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-5 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Editar Presupuesto #{selectedBudget.idBudget}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Información del Permit (Solo lectura) */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Información del Permiso</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Permit #:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.Permit?.permitNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Dirección:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.propertyAddress}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Cliente:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.applicantName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Lot / Block:</span>
                      <p className="text-sm text-gray-900">{selectedBudget.Permit?.lot || 'N/A'} / {selectedBudget.Permit?.block || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Detalles del Presupuesto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <input
                      type="date"
                      name="date"
                      value={editData.date}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Expiración</label>
                    <input
                      type="date"
                      name="expirationDate"
                      value={editData.expirationDate}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select
                      name="status"
                      value={editData.status}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="created">Creado</option>
                      <option value="send">Enviar por Email</option>
                      <option value="sent_for_signature">Enviado para Firma</option>
                      <option value="pending">Pendiente</option>
                      <option value="signed">Firmado</option>
                      <option value="approved">Aprobado</option>
                      <option value="rejected">Rechazado</option>
                      <option value="notResponded">Sin Respuesta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pago Inicial (%)</label>
                    <input
                      type="number"
                      name="initialPaymentPercentage"
                      value={editData.initialPaymentPercentage}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>

                {/* Items del Presupuesto */}
                <div className="border border-gray-200 p-4 rounded-md">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Items del Presupuesto</h4>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {editData.lineItems.map((item, index) => (
                      <div key={item.id || index} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <p className="font-medium text-gray-800">{item.name} ({item.category})</p>
                        <p className="text-sm text-gray-600">
                          Marca: {item.marca || 'N/A'} | Capacidad: {item.capacity || 'N/A'} |
                          Precio Unitario: ${parseFloat(item.unitPrice || 0).toFixed(2)}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Cantidad</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                              className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700">Notas del Item</label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => handleLineItemChange(index, 'notes', e.target.value)}
                              className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(index)}
                          className="text-red-500 text-xs mt-1 hover:text-red-700"
                        >
                          Eliminar Item
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Añadir Item Manual */}
                <div className="border border-gray-200 p-4 rounded-md">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Añadir Item Manualmente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Categoría</label>
                      <input
                        type="text"
                        name="category"
                        value={manualItemData.category}
                        onChange={handleManualItemChange}
                        className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: SYSTEM TYPE"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">Nombre del Item</label>
                      <input
                        type="text"
                        name="name"
                        value={manualItemData.name}
                        onChange={handleManualItemChange}
                        className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: NEW SYSTEM INSTALLATION"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Precio Unitario ($)</label>
                      <input
                        type="number"
                        name="unitPrice"
                        value={manualItemData.unitPrice}
                        onChange={handleManualItemChange}
                        className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: 150.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Cantidad</label>
                      <input
                        type="number"
                        name="quantity"
                        value={manualItemData.quantity}
                        onChange={handleManualItemChange}
                        className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: 1"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700">Notas (Opcional)</label>
                      <input
                        type="text"
                        name="notes"
                        value={manualItemData.notes}
                        onChange={handleManualItemChange}
                        className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Detalles adicionales..."
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-right">
                    <button
                      type="button"
                      onClick={handleAddManualItem}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Añadir Item
                    </button>
                  </div>
                </div>

                {/* Descuentos y Notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Descripción del Descuento</label>
                    <input
                      type="text"
                      name="discountDescription"
                      value={editData.discountDescription}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto de Descuento ($)</label>
                    <input
                      type="number"
                      name="discountAmount"
                      value={editData.discountAmount}
                      onChange={handleEditInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notas Generales</label>
                  <textarea
                    name="generalNotes"
                    value={editData.generalNotes}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Resumen Financiero */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Resumen Financiero</h4>
                  <div className="space-y-2 text-right">
                    <p className="text-sm text-gray-600">
                      Subtotal: <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Descuento: <span className="font-medium text-red-600">-${(parseFloat(editData.discountAmount) || 0).toFixed(2)}</span>
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      Total: ${total.toFixed(2)}
                    </p>
                    <p className="text-md font-medium text-blue-700">
                      Pago Inicial Requerido: ${payment.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal visor PDF firmado */}
      {showSignedPdfModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-4 relative">
            <button
              onClick={() => setShowSignedPdfModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-center">PDF Firmado</h2>
            <div className="flex justify-end mb-2">
              <button
                onClick={handleDownloadSignedPdf}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                disabled={downloadingSignedPdf}
              >
                {downloadingSignedPdf ? 'Descargando...' : 'Descargar PDF'}
              </button>
            </div>
            <div className="h-[70vh] overflow-y-auto border rounded shadow-inner bg-gray-50">
              {signedPdfUrl && (
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                  <Viewer fileUrl={signedPdfUrl} />
                </Worker>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestionBudgets;