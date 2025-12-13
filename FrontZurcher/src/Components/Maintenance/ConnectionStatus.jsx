/**
 * 🌐 Componente de Estado de Conexión y Sincronización
 * 
 * Muestra el estado de la conexión a internet y los formularios pendientes
 * de sincronización. Se posiciona en la parte superior de la pantalla.
 */

import React, { useState, useEffect } from 'react';
import {
  WifiIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { isOnline, onConnectionChange, syncAllPendingForms } from '../../utils/syncManager';
import { getPendingForms, getStorageStats } from '../../utils/offlineStorage';

const ConnectionStatus = ({ showSyncButton = true }) => {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [storageStats, setStorageStats] = useState({ formsCount: 0, filesCount: 0, totalSizeMB: 0 });
  const [lastSync, setLastSync] = useState(null);

  // Actualizar estado de conexión
  useEffect(() => {
    const unsubscribe = onConnectionChange((isOnline) => {
      setOnline(isOnline);
      if (isOnline) {
        // Recargar pendientes cuando vuelva la conexión
        loadPendingForms();
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar formularios pendientes
  const loadPendingForms = async () => {
    try {
      const pending = await getPendingForms();
      setPendingCount(pending.length);

      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Error cargando formularios pendientes:', error);
    }
  };

  // Cargar al montar
  useEffect(() => {
    loadPendingForms();
    
    // Recargar cada 30 segundos
    const interval = setInterval(loadPendingForms, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sincronizar manualmente
  const handleSync = async () => {
    if (!online) {
      alert('No hay conexión a internet');
      return;
    }

    if (pendingCount === 0) {
      alert('No hay formularios pendientes para sincronizar');
      return;
    }

    setSyncing(true);
    setSyncProgress({ current: 0, total: pendingCount });

    try {
      const result = await syncAllPendingForms((progress) => {
        setSyncProgress(progress);
      });

      if (result.success) {
        alert(`✅ ${result.synced} formularios sincronizados correctamente`);
        setLastSync(new Date());
      } else {
        alert(`⚠️ ${result.synced} sincronizados, ${result.failed} con errores`);
      }

      // Recargar pendientes
      await loadPendingForms();
    } catch (error) {
      console.error('Error en sincronización:', error);
      alert('Error al sincronizar formularios');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  // No mostrar nada si no hay pendientes y está online
  if (online && pendingCount === 0 && !syncing) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Estado de conexión */}
          <div className="flex items-center space-x-3">
            {/* Icono de conexión */}
            <div className={`flex items-center space-x-2 ${online ? 'text-green-600' : 'text-red-600'}`}>
              <WifiIcon className="h-5 w-5" />
              <span className="text-sm font-medium">
                {online ? 'Conectado' : 'Sin conexión'}
              </span>
            </div>

            {/* Formularios pendientes */}
            {pendingCount > 0 && (
              <div className="flex items-center space-x-2 text-orange-600">
                <CloudArrowUpIcon className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Estado de sincronización */}
            {syncing && syncProgress && (
              <div className="flex items-center space-x-2 text-blue-600">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">
                  Sincronizando {syncProgress.current}/{syncProgress.total}
                </span>
              </div>
            )}

            {/* Última sincronización */}
            {lastSync && !syncing && (
              <div className="flex items-center space-x-1 text-gray-500">
                <CheckCircleIcon className="h-4 w-4" />
                <span className="text-xs">
                  Última sync: {lastSync.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center space-x-2">
            {/* Info de almacenamiento */}
            {storageStats.filesCount > 0 && (
              <div className="text-xs text-gray-500">
                {storageStats.filesCount} archivo{storageStats.filesCount !== 1 ? 's' : ''} 
                ({storageStats.totalSizeMB}MB)
              </div>
            )}

            {/* Botón de sincronización */}
            {showSyncButton && pendingCount > 0 && online && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`
                  px-4 py-1.5 rounded-md text-sm font-medium
                  transition-colors duration-200
                  ${syncing 
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {syncing ? (
                  <span className="flex items-center space-x-1">
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Sincronizando...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1">
                    <CloudArrowUpIcon className="h-4 w-4" />
                    <span>Sincronizar ahora</span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        {syncing && syncProgress && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Mensaje de offline */}
        {!online && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-orange-700 bg-orange-50 rounded-md px-3 py-2">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            <p>
              Sin conexión a internet. Los datos se guardarán localmente y se sincronizarán automáticamente cuando vuelva la conexión.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
