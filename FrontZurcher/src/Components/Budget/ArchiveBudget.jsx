import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchArchivedBudgetsFromDB } from '../../Redux/Actions/budgetActions';
import {
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import BudgetNotesModal from './BudgetNotesModal';
import NotesAlertBadge from '../Common/NotesAlertBadge';

const ArchiveBudget = () => {
  const dispatch = useDispatch();
  
  // Estados locales
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estados para modal de notas
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [budgetForNotes, setBudgetForNotes] = useState(null);

  // Get user info
  const { user, currentStaff } = useSelector((state) => state.auth);
  const staff = currentStaff || user;

  // Formato de fecha: MM-DD-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return "Invalid Date";
    return `${month}-${day}-${year}`;
  };

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cargar presupuestos archivados
  const loadArchivedBudgets = async () => {
    setLoading(true);
    try {
      const result = await dispatch(fetchArchivedBudgetsFromDB({
        page,
        pageSize,
        search: debouncedSearchTerm
      }));

      if (result.payload) {
        setBudgets(result.payload.budgets || []);
        setTotal(result.payload.total || 0);
        setTotalPages(result.payload.totalPages || 1);
      }
    } catch (error) {
      console.error('Error al cargar budgets archivados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar cuando cambian filtros o página
  useEffect(() => {
    loadArchivedBudgets();
  }, [page, debouncedSearchTerm]);

  // Handler para abrir modal de notas
  const handleOpenNotes = (budget) => {
    setBudgetForNotes(budget);
    setShowNotesModal(true);
  };

  const handleCloseNotesModal = () => {
    setShowNotesModal(false);
    setBudgetForNotes(null);
    // No necesita recargar, son budgets archivados (inmutables)
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ArchiveBoxIcon className="h-8 w-8 text-orange-500" />
          Presupuestos Archivados
        </h1>
        <p className="text-gray-600 mt-2">
          Presupuestos que fueron archivados con todas sus notas de seguimiento
        </p>
      </div>

      {/* Contador */}
      <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200 mb-6">
        <p className="text-lg font-semibold text-orange-800">
          Total de Presupuestos Archivados: {total}
        </p>
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 mt-4">Cargando presupuestos archivados...</p>
        </div>
      )}

      {/* Lista de Presupuestos Archivados - Desktop */}
      {!loading && budgets.length > 0 && (
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archivado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgets.map((budget) => (
                  <tr key={budget.idBudget} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      #{budget.idBudget}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {budget.Permit?.applicantName || budget.applicantName || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {budget.Permit?.propertyAddress || budget.propertyAddress || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {budget.contactCompany || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(budget.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(budget.totalPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(budget.updatedAt?.split('T')[0])}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => handleOpenNotes(budget)}
                            className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                            title="Ver Notas de Seguimiento"
                          >
                            <ChatBubbleLeftRightIcon className="h-5 w-5" />
                          </button>
                          <NotesAlertBadge
                            budgetId={budget.idBudget}
                            onClick={() => handleOpenNotes(budget)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de Presupuestos Archivados - Mobile */}
      {!loading && budgets.length > 0 && (
        <div className="block md:hidden space-y-4">
          {budgets.map((budget) => (
            <div key={budget.idBudget} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm text-gray-500">Budget #{budget.idBudget}</p>
                  <h3 className="font-semibold text-gray-900">
                    {budget.Permit?.applicantName || budget.applicantName}
                  </h3>
                </div>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                  Archivado
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <p className="text-gray-600">
                  <span className="font-medium">Dirección:</span>{' '}
                  {budget.Permit?.propertyAddress || budget.propertyAddress || 'N/A'}
                </p>
                {budget.contactCompany && (
                  <p className="text-gray-600">
                    <span className="font-medium">Empresa:</span> {budget.contactCompany}
                  </p>
                )}
                <p className="text-gray-600">
                  <span className="font-medium">Fecha:</span> {formatDate(budget.date)}
                </p>
                <p className="text-gray-900 font-semibold">
                  <span className="font-medium">Total:</span> ${parseFloat(budget.totalPrice || 0).toFixed(2)}
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <div className="flex-1 relative">
                  <button
                    onClick={() => handleOpenNotes(budget)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    Ver Notas
                  </button>
                  <NotesAlertBadge
                    budgetId={budget.idBudget}
                    onClick={() => handleOpenNotes(budget)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sin resultados */}
      {!loading && budgets.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <ArchiveBoxIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay presupuestos archivados
          </h3>
          <p className="text-gray-600">
            Los presupuestos archivados aparecerán aquí con todas sus notas
          </p>
        </div>
      )}

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
          >
            Anterior
          </button>
          
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-orange-700 transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de Notas */}
      {showNotesModal && budgetForNotes && (
        <BudgetNotesModal
          budget={budgetForNotes}
          onClose={handleCloseNotesModal}
          onAlertsChange={() => {}} // No necesita recargar, budgets archivados son inmutables
        />
      )}
    </div>
  );
};

export default ArchiveBudget;