import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className="p-4 border rounded shadow-md cursor-pointer hover:bg-gray-100"
          onClick={() => navigateTo('/firststage')}
        >
          <h2 className="text-xl font-semibold">Generar Presupuesto</h2>
          <p className="text-gray-600">Enviar un nuevo presupuesto a un cliente.</p>
        </div>
        <div
          className="p-4 border rounded shadow-md cursor-pointer hover:bg-gray-100"
          onClick={() => navigateTo('/carga-materiales')}
        >
          <h2 className="text-xl font-semibold">Carga de Materiales</h2>
          <p className="text-gray-600">Registrar los materiales comprados.</p>
        </div>
        <div
          className="p-4 border rounded shadow-md cursor-pointer hover:bg-gray-100"
          onClick={() => navigateTo('/seguimiento-trabajos')}
        >
          <h2 className="text-xl font-semibold">Seguimiento de Trabajos</h2>
          <p className="text-gray-600">Ver el estado de los trabajos en curso.</p>
        </div>
        <div
          className="p-4 border rounded shadow-md cursor-pointer hover:bg-gray-100"
          onClick={() => navigateTo('/pedido-primera-inspeccion')}
        >
          <h2 className="text-xl font-semibold">Pedido de Primera Inspección</h2>
          <p className="text-gray-600">Solicitar la primera inspección de obra.</p>
        </div>
        <div
          className="p-4 border rounded shadow-md cursor-pointer hover:bg-gray-100"
          onClick={() => navigateTo('/pedido-inspeccion-final')}
        >
          <h2 className="text-xl font-semibold">Pedido de Inspección Final</h2>
          <p className="text-gray-600">Solicitar la inspección final de obra.</p>
        </div>
        <div
          className="p-4 border rounded shadow-md cursor-pointer hover:bg-gray-100"
          onClick={() => navigateTo('/registrar-pagos')}
        >
          <h2 className="text-xl font-semibold">Registrar Pagos</h2>
          <p className="text-gray-600">Registrar los pagos realizados por los clientes.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;