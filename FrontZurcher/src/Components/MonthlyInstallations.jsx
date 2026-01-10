import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import {
  fetchMonthlyInstallations,
  fetchYearlySummary,
  fetchAvailableYears
} from '../Redux/Actions/monthlyInstallationsActions';
import {
  setSelectedYear,
  setSelectedMonth
} from '../Redux/Reducer/monthlyInstallationsReducer';
import useAutoRefresh from '../utils/useAutoRefresh';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MonthlyInstallations = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    installations,
    summary,
    selectedYear,
    selectedMonth,
    yearlySummary,
    availableYears,
    loading,
    error
  } = useSelector((state) => state.monthlyInstallations);

  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'yearly'

  // ✅ Verificar si el usuario es worker (solo lectura)
  const isWorker = user?.role === 'worker';

  // Cargar datos iniciales
  useEffect(() => {
    dispatch(fetchAvailableYears()).then((years) => {
      // Si no hay años o el año actual no tiene datos, usar el año más reciente disponible
      if (years && years.length > 0 && !years.includes(selectedYear)) {
        const latestYear = Math.max(...years);
        dispatch(setSelectedYear(latestYear));
        dispatch(fetchMonthlyInstallations(latestYear, selectedMonth));
        dispatch(fetchYearlySummary(latestYear));
      } else {
        dispatch(fetchMonthlyInstallations(selectedYear, selectedMonth));
        dispatch(fetchYearlySummary(selectedYear));
      }
    });
  }, [dispatch]);

  // Auto-refresh cada 5 minutos
  useAutoRefresh(() => {
    return fetchMonthlyInstallations(selectedYear, selectedMonth);
  }, 300000, [selectedYear, selectedMonth]);

  // Handlers
  const handleYearChange = (year) => {
    dispatch(setSelectedYear(year));
    dispatch(fetchMonthlyInstallations(year, selectedMonth));
    dispatch(fetchYearlySummary(year));
  };

  const handleMonthChange = (month) => {
    dispatch(setSelectedMonth(month));
    dispatch(fetchMonthlyInstallations(selectedYear, month));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error al cargar las instalaciones: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Título */}
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Instalaciones Mensuales
                </h1>
                <p className="text-slate-600">
                  Trabajos que cambiaron a estado "Covered"
                </p>
              </div>
            </div>

            {/* Controles */}
            <div className="flex flex-col sm:flex-row gap-3">
              
              {/* Selector de Año */}
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableYears.length > 0 ? (
                  availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))
                ) : (
                  <option value={selectedYear}>{selectedYear}</option>
                )}
              </select>

              {/* Selector de Mes */}
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {MONTH_NAMES.map((monthName, index) => (
                  <option key={index + 1} value={index + 1}>
                    {monthName} {selectedYear}
                  </option>
                ))}
              </select>

              {/* Toggle View Mode */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'monthly' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setViewMode('yearly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'yearly' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Anual
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vista Mensual */}
        {viewMode === 'monthly' && (
          <>
            {/* Resumen del Mes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              
              {/* Total de Instalaciones */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {summary.totalWorks}
                    </p>
                    <p className="text-sm text-slate-500">
                      {summary.totalWorks === 1 ? 'instalación' : 'instalaciones'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumen por Staff */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <UserGroupIcon className="h-8 w-8 text-green-600" />
                    <h3 className="text-lg font-semibold text-slate-800">
                      Por Staff
                    </h3>
                  </div>
                </div>
                
                {summary.byStaff.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {summary.byStaff.map((staff, index) => (
                      <div key={staff.staffId} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">
                          {staff.staffName}
                        </span>
                        <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          {staff.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No hay datos disponibles</p>
                )}
              </div>
            </div>

            {/* Lista de Instalaciones */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-blue-600 text-white p-4">
                <h2 className="text-xl font-bold">
                  Instalaciones - {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </h2>
                <p className="text-sm opacity-90">
                  {installations.length} {installations.length === 1 ? 'trabajo' : 'trabajos'} instalados
                </p>
              </div>

              {installations.length > 0 ? (
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {installations.map((installation) => {
                    const WorkItem = isWorker ? 'div' : Link;
                    const itemProps = isWorker 
                      ? {
                          className: "p-4 hover:bg-gray-50 cursor-not-allowed opacity-75"
                        }
                      : {
                          to: `/work/${installation.workId}`,
                          className: "block p-4 hover:bg-blue-50 transition-colors group"
                        };

                    return (
                      <WorkItem key={installation.workId} {...itemProps}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          
                          {/* Dirección y Staff */}
                          <div className="flex-1">
                            <h3 className={`font-semibold ${
                              isWorker 
                                ? 'text-gray-600' 
                                : 'text-slate-800 group-hover:text-blue-700'
                            }`}>
                              {installation.propertyAddress}
                            </h3>
                            <p className="text-sm text-slate-600">
                              Staff: {installation.staff?.name || 'Sin asignar'}
                            </p>
                          </div>

                          {/* Fecha y Estado */}
                          <div className="flex flex-col sm:items-end gap-1">
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                              Instalado: {formatDate(installation.coveredDate)}
                            </span>
                            <span className="text-xs text-slate-500">
                              Estado actual: {installation.currentStatus}
                            </span>
                          </div>
                        </div>
                      </WorkItem>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <BuildingOfficeIcon className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg font-medium">
                    No hay instalaciones en {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    {availableYears.length > 0 && !availableYears.includes(selectedYear) 
                      ? `Prueba seleccionando uno de estos años con datos: ${availableYears.join(', ')}`
                      : 'Los trabajos aparecerán aquí cuando cambien a estado "Covered"'
                    }
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Vista Anual */}
        {viewMode === 'yearly' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Resumen Anual {selectedYear}
                </h2>
                <p className="text-slate-600">
                  Total del año: {yearlySummary.totalYear} instalaciones
                </p>
              </div>
            </div>

            {yearlySummary.monthlyData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {yearlySummary.monthlyData.map((monthData) => (
                  <div
                    key={monthData.month}
                    className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      monthData.month === selectedMonth 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      handleMonthChange(monthData.month);
                      setViewMode('monthly');
                    }}
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600">
                        {monthData.monthName}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {monthData.count}
                      </p>
                      <p className="text-xs text-slate-500">
                        {monthData.count === 1 ? 'instalación' : 'instalaciones'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 text-lg font-medium">
                  No hay datos para {selectedYear}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyInstallations;