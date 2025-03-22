import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const Seguimiento = () => {
  const [etapas, setEtapas] = useState({
    presupuesto: 'pendiente',
    pago: 'pendiente',
    materiales: 'pendiente',
    instalacion: 'pendiente',
    primeraInspeccion: 'pendiente',
    finalDeObra: 'pendiente',
    inspeccionFinal: 'pendiente',
  });

  const handleEtapaChange = (etapa, value) => {
    setEtapas({ ...etapas, [etapa]: value });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Seguimiento de Obra</h1>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-2">Etapas</h2>
          <div className="flex flex-col">
            {Object.entries(etapas).map(([etapa, estado]) => (
              <div key={etapa} className="mb-2 p-4 border rounded shadow-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">{etapa}</span>
                  <span
                    className={`text-sm font-bold ${
                      estado === 'pendiente' ? 'text-yellow-500' : 'text-green-500'
                    }`}
                  >
                    {estado}
                  </span>
                </div>
                <div className="mt-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() =>
                      handleEtapaChange(
                        etapa,
                        estado === 'pendiente' ? (
                          etapa === 'presupuesto' ? 'enviado' :
                          etapa === 'pago' ? 'abonado' :
                          etapa === 'materiales' ? 'comprados' :
                          'realizada'
                        ) : 'pendiente'
                      )
                    }
                  >
                    Cambiar a {estado === 'pendiente' ? (
                          etapa === 'presupuesto' ? 'Enviado' :
                          etapa === 'pago' ? 'Abonado' :
                          etapa === 'materiales' ? 'Comprados' :
                          'Realizada'
                        ) : 'Pendiente'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-2">Estado Final</h2>
          <div className="p-4 border rounded shadow-md">
            <div className="flex items-center">
              <span className="font-medium">Trabajo Terminado:</span>
              <span
                className={`ml-2 text-lg font-bold ${
                  Object.values(etapas).every(
                    (etapa) =>
                      etapa === 'realizada' ||
                      etapa === 'comprados' ||
                      etapa === 'abonado' ||
                      etapa === 'enviado'
                  )
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}
              >
                {Object.values(etapas).every(
                  (etapa) =>
                    etapa === 'realizada' ||
                    etapa === 'comprados' ||
                    etapa === 'abonado' ||
                    etapa === 'enviado'
                )
                  ? 'COMPLETADO'
                  : 'INCOMPLETO'}
                {Object.values(etapas).every(
                  (etapa) =>
                    etapa === 'realizada' ||
                    etapa === 'comprados' ||
                    etapa === 'abonado' ||
                    etapa === 'enviado'
                ) ? (
                  <CheckCircleIcon className="h-6 w-6 inline-block ml-2 text-green-500" aria-hidden="true" />
                ) : (
                  <ExclamationTriangleIcon className="h-6 w-6 inline-block ml-2 text-red-500" aria-hidden="true" />
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Seguimiento;