import React, { useState, useEffect } from 'react';
import { FiCopy, FiEye, FiLink, FiUsers, FiSettings, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from 'axios';

// URL de la API desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Panel de administración para gestión de portales de cliente
 * Permite generar, gestionar y monitorear enlaces de seguimiento de clientes
 */
const ClientPortalAdmin = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Obtener presupuestos con sus estados de portal
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/client-portal/admin/budgets-with-portal-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBudgets(response.data);
    } catch (error) {
      console.error('Error obteniendo presupuestos:', error);
      toast.error('Error cargando datos de presupuestos');
    } finally {
      setLoading(false);
    }
  };

  // Generar token de portal para un cliente
  const generatePortalToken = async (budget) => {
    try {
      setGeneratingToken(budget.idBudget);
      
      // Verificar que el presupuesto tenga email
      if (!budget.applicantEmail) {
        toast.error('El presupuesto debe tener un email del cliente');
        setGeneratingToken(null);
        return;
      }
      
      const response = await axios.post(`${API_URL}/client-portal/generate-token`, {
        applicantEmail: budget.applicantEmail,
        contactCompany: budget.contactCompany || null
      });

      const { clientToken, portalUrl } = response.data.data;
      
      // Actualizar la lista local
      setBudgets(prev => prev.map(b => 
        b.idBudget === budget.idBudget 
          ? { ...b, clientPortalToken: clientToken, portalUrl }
          : b
      ));

      toast.success('Portal de cliente generado correctamente');
      
    } catch (error) {
      console.error('Error generando token:', error);
      toast.error(error.response?.data?.message || 'Error generando portal de cliente');
    } finally {
      setGeneratingToken(null);
    }
  };

  // Copiar enlace del portal al portapapeles
  const copyPortalLink = async (portalUrl) => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success('Enlace copiado al portapapeles');
    } catch (error) {
      console.error('Error copiando enlace:', error);
      toast.error('Error copiando enlace al portapapeles');
    }
  };

  // Filtrar presupuestos según búsqueda y estado
  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = !searchTerm || 
      budget.applicantEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.contactCompany?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.applicantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.idBudget.toString().includes(searchTerm);

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'with-portal' && budget.clientPortalToken) ||
      (filterStatus === 'without-portal' && !budget.clientPortalToken);

    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const getStatusBadge = (budget) => {
    if (budget.clientPortalToken) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FiLink className="mr-1 h-3 w-3" />
          Portal Activo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <FiSettings className="mr-1 h-3 w-3" />
        Sin Portal
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <FiUsers className="mr-3 text-blue-600" />
          Administración de Portales de Cliente
        </h1>
        <p className="mt-2 text-gray-600">
          Genere y gestione enlaces de seguimiento para que los clientes puedan ver el progreso de sus proyectos
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiUsers className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {budgets.length}
              </h3>
              <p className="text-sm text-gray-600">Total Presupuestos</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiLink className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {budgets.filter(b => b.clientPortalToken).length}
              </h3>
              <p className="text-sm text-gray-600">Portales Activos</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiSettings className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {budgets.filter(b => !b.clientPortalToken).length}
              </h3>
              <p className="text-sm text-gray-600">Sin Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por email, empresa o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="with-portal">Con portal</option>
            <option value="without-portal">Sin portal</option>
          </select>
          <button
            onClick={fetchBudgets}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Lista de presupuestos */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Presupuesto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado Portal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trabajos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBudgets.map((budget) => (
                <tr key={budget.idBudget} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {budget.applicantName || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {budget.applicantEmail || 'Sin email'}
                      </div>
                      {budget.contactCompany && (
                        <div className="text-xs text-gray-400">
                          {budget.contactCompany}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{budget.idBudget}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(budget)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {budget.worksCount || 0} trabajos
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {budget.clientPortalToken ? (
                      <>
                        <button
                          onClick={() => copyPortalLink(budget.portalUrl)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          title="Copiar enlace del portal"
                        >
                          <FiCopy className="mr-1 h-4 w-4" />
                          Copiar Enlace
                        </button>
                        <a
                          href={budget.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900 inline-flex items-center"
                          title="Ver portal"
                        >
                          <FiEye className="mr-1 h-4 w-4" />
                          Ver Portal
                        </a>
                      </>
                    ) : (
                      <button
                        onClick={() => generatePortalToken(budget)}
                        disabled={generatingToken === budget.idBudget}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50 inline-flex items-center"
                      >
                        <FiLink className="mr-1 h-3 w-3" />
                        {generatingToken === budget.idBudget ? 'Generando...' : 'Generar Portal'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredBudgets.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay presupuestos</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron presupuestos con los filtros aplicados.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientPortalAdmin;