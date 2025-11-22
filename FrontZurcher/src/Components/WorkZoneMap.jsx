import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions";
import { Link } from "react-router-dom";
import { 
  MapPinIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  BuildingOfficeIcon 
} from '@heroicons/react/24/outline';
import useAutoRefresh from "../utils/useAutoRefresh";

// Definir las zonas y sus variantes de nombres
const ZONES = {
  'La Belle': {
    name: 'La Belle',
    color: 'orange',
    keywords: [
      'la belle', 'labelle', 'la bell', 'labell',
      'la. belle', 'l belle', ' belle '
    ]
  },
  'Lehigh': {
    name: 'Lehigh Acres',
    color: 'purple',
    keywords: [
      'lehigh', 'lehigh acres', 'lehigh acre', 'leigh', 
      'leheigh', 'leihgh', 'l acres'
    ]
  },
  'North Port': {
    name: 'North Port / Port Charlotte',
    color: 'green',
    keywords: [
      // North Port variantes
      'north port', 'northport', 'n port', 'n. port', 'nport',
      'north pt', 'n pt', 'norht port', 'noth port',
      // Port Charlotte variantes
      'port charlotte', 'pt charlotte', 'portcharlotte', 'pt. charlotte',
      'charlotte', 'port char', 'p charlotte', 'pcharlotte',
      'port charlot', 'charlote'
    ]
  },
  'Cape Coral': {
    name: 'Cape Coral',
    color: 'blue',
    keywords: [
      'cape coral', 'cape', 'cc', 'c coral', 'capecoral',
      'cap coral', 'c. coral', 'coral'
    ]
  },
  'Other': {
    name: 'Otras Zonas',
    color: 'gray',
    keywords: []
  }
};

// Estados activos (desde pending hasta payment received)
const ACTIVE_STATUSES = [
  'pending',            // Sin progreso
  'assigned',           // Purchase in Progress
  'inProgress',         // Installing
  'installed',          // Inspection Pending
  'firstInspectionPending',
  'approvedInspection',
  'rejectedInspection',
  'coverPending',       // Cover Pending
  'covered',            // Send Final Invoice
  'invoiceFinal',       // Payment Received
  'paymentReceived'
];

// Orden de progreso para sorting (menor número = menos progreso)
const STATUS_ORDER = {
  'pending': 0,
  'assigned': 1,
  'inProgress': 2,
  'installed': 3,
  'firstInspectionPending': 4,
  'rejectedInspection': 5,
  'approvedInspection': 6,
  'coverPending': 7,
  'covered': 8,
  'invoiceFinal': 9,
  'paymentReceived': 10
};

const STATUS_LABELS = {
  'pending': 'Pending',
  'assigned': 'Purchase in Progress',
  'inProgress': 'Installing',
  'installed': 'Inspection Pending',
  'firstInspectionPending': 'Inspection Pending',
  'approvedInspection': 'Approved Inspection',
  'rejectedInspection': 'Rejected Inspection',
  'coverPending': 'Cover Pending',
  'covered': 'Send Final Invoice',
  'invoiceFinal': 'Payment Received',
  'paymentReceived': 'Payment Received'
};

const STATUS_COLORS = {
  'pending': 'bg-gray-100 text-gray-800 border-gray-300',
  'assigned': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'inProgress': 'bg-blue-100 text-blue-800 border-blue-300',
  'installed': 'bg-purple-100 text-purple-800 border-purple-300',
  'firstInspectionPending': 'bg-purple-100 text-purple-800 border-purple-300',
  'approvedInspection': 'bg-green-100 text-green-800 border-green-300',
  'rejectedInspection': 'bg-red-100 text-red-800 border-red-300',
  'coverPending': 'bg-orange-100 text-orange-800 border-orange-300',
  'covered': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'invoiceFinal': 'bg-teal-100 text-teal-800 border-teal-300',
  'paymentReceived': 'bg-emerald-100 text-emerald-800 border-emerald-300'
};

const WorkZoneMap = () => {
  const dispatch = useDispatch();
  const { works, loading, error } = useSelector((state) => state.work);
  const [expandedZones, setExpandedZones] = useState({});
  const [zoneData, setZoneData] = useState({});

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  // Auto-refresh cada 5 minutos
  useAutoRefresh(fetchWorks, 300000, []);

  // Función para detectar la zona de una dirección
  const detectZone = (address) => {
    if (!address) return 'Other';
    
    // Convertir a minúsculas y eliminar espacios extras
    const lowerAddress = address.toLowerCase().trim().replace(/\s+/g, ' ');
    
    for (const [zoneName, zoneInfo] of Object.entries(ZONES)) {
      if (zoneName === 'Other') continue; // Skip 'Other' en la búsqueda
      
      for (const keyword of zoneInfo.keywords) {
        // Convertir keyword a minúsculas y comparar
        const lowerKeyword = keyword.toLowerCase();
        if (lowerAddress.includes(lowerKeyword)) {
          return zoneName;
        }
      }
    }
    
    return 'Other';
  };

  // Agrupar obras por zona
  useEffect(() => {
    if (!works) return;

    // Filtrar solo obras activas
    const activeWorks = works.filter(work => 
      ACTIVE_STATUSES.includes(work.status)
    );

    // Agrupar por zona
    const grouped = {};
    
    Object.keys(ZONES).forEach(zoneName => {
      grouped[zoneName] = [];
    });

    activeWorks.forEach(work => {
      const zone = detectZone(work.propertyAddress);
      grouped[zone].push(work);
      
      // Log para debugging - ver qué obras van a "Other"
      if (zone === 'Other') {
        console.log('🗺️ Obra clasificada como "Otras Zonas":', {
          id: work.idWork,
          address: work.propertyAddress
        });
      }
    });

    // Ordenar obras dentro de cada zona por progreso (menos progreso primero)
    Object.keys(grouped).forEach(zone => {
      grouped[zone].sort((a, b) => {
        const orderA = STATUS_ORDER[a.status] ?? 999;
        const orderB = STATUS_ORDER[b.status] ?? 999;
        return orderA - orderB;
      });
    });

    setZoneData(grouped);
  }, [works]);

  const toggleZone = (zoneName) => {
    setExpandedZones(prev => ({
      ...prev,
      [zoneName]: !prev[zoneName]
    }));
  };

  const getZoneColorClasses = (colorName) => {
    const colors = {
      blue: 'bg-slate-50 border-slate-200 hover:bg-blue-50',
      green: 'bg-slate-50 border-slate-200 hover:bg-green-50',
      purple: 'bg-slate-50 border-slate-200 hover:bg-purple-50',
      orange: 'bg-slate-50 border-slate-200 hover:bg-orange-50',
      gray: 'bg-slate-50 border-slate-200 hover:bg-slate-100'
    };
    return colors[colorName] || colors.gray;
  };

  const getZoneHeaderColorClasses = (colorName) => {
    const colors = {
      blue: 'bg-gradient-to-r from-slate-700 to-blue-600 text-white',
      green: 'bg-gradient-to-r from-slate-700 to-green-600 text-white',
      purple: 'bg-gradient-to-r from-slate-700 to-purple-600 text-white',
      orange: 'bg-gradient-to-r from-slate-700 to-orange-600 text-white',
      gray: 'bg-gradient-to-r from-slate-700 to-slate-600 text-white'
    };
    return colors[colorName] || colors.gray;
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
        Error al cargar las obras: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-3 flex items-center gap-3">
            <MapPinIcon className="h-10 w-10 text-blue-600" />
            Obras por Zona
          </h1>
          <p className="text-slate-600 text-lg">
            Obras activas agrupadas por ubicación
          </p>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {Object.entries(ZONES).map(([zoneName, zoneInfo]) => {
            const count = zoneData[zoneName]?.length || 0;
            if (count === 0 && zoneName === 'Other') return null;
            
            return (
              <div 
                key={zoneName}
                className={`${getZoneColorClasses(zoneInfo.color)} border-2 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                onClick={() => toggleZone(zoneName)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">
                      {zoneInfo.name}
                    </p>
                    <p className="text-4xl font-bold text-slate-800">
                      {count}
                    </p>
                  </div>
                  <MapPinIcon className={`h-10 w-10 text-${zoneInfo.color}-500`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tarjetas de Zonas con Obras */}
        <div className="space-y-6">
          {Object.entries(ZONES).map(([zoneName, zoneInfo]) => {
            const worksInZone = zoneData[zoneName] || [];
            if (worksInZone.length === 0) return null;

            const isExpanded = expandedZones[zoneName];

            return (
              <div 
                key={zoneName}
                className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Header de la Zona */}
                <div
                  onClick={() => toggleZone(zoneName)}
                  className={`${getZoneHeaderColorClasses(zoneInfo.color)} p-6 cursor-pointer flex items-center justify-between hover:opacity-90 transition-all duration-300`}
                >
                  <div className="flex items-center gap-4">
                    <BuildingOfficeIcon className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">
                        {zoneInfo.name}
                      </h2>
                      <p className="text-sm opacity-90 mt-1">
                        {worksInZone.length} {worksInZone.length === 1 ? 'obra activa' : 'obras activas'}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className="h-8 w-8" />
                  ) : (
                    <ChevronDownIcon className="h-8 w-8" />
                  )}
                </div>

                {/* Lista de Obras (Expandible) */}
                {isExpanded && (
                  <div className="p-6 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {worksInZone.map(work => (
                        <Link
                          key={work.idWork}
                          to={`/work/${work.idWork}`}
                          className="bg-white rounded-lg p-5 border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                          {/* Dirección */}
                          <div className="mb-3">
                            <p className="text-base font-bold text-slate-800 line-clamp-2 leading-relaxed">
                              {work.propertyAddress}
                            </p>
                          </div>

                          {/* ID y Status */}
                          <div className="flex items-center justify-between mb-3">
                          
                            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${STATUS_COLORS[work.status] || 'bg-slate-100 text-slate-800'}`}>
                              {STATUS_LABELS[work.status] || work.status}
                            </span>
                          </div>

                          {/* Información Adicional */}
                          <div className="space-y-2 text-xs text-slate-600">
                            {work.Permit?.systemType && (
                              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                                <span className="font-semibold text-slate-700">Sistema:</span>
                                <span className="text-slate-600">{work.Permit.systemType}</span>
                              </div>
                            )}
                            {work.customerName && (
                              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                                <span className="font-semibold text-slate-700">Cliente:</span>
                                <span className="truncate text-slate-600">{work.customerName}</span>
                              </div>
                            )}
                          </div>

                          {/* Ver Detalles */}
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <span className="text-sm text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1">
                              Ver detalles
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mensaje si no hay obras */}
        {Object.values(zoneData).every(arr => arr.length === 0) && (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-slate-200">
            <BuildingOfficeIcon className="h-20 w-20 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-xl font-medium">
              No hay obras activas en este momento
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkZoneMap;
