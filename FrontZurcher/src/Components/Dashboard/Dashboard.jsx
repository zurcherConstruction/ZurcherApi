import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Dashboard = () => {
  const navigate = useNavigate();
  const { staff } = useSelector((state) => state.auth); // Obtener el rol del usuario autenticado

  // Definir las opciones del Dashboard con sus rutas y roles permitidos
  const dashboardOptions = [
    {
      path: '/firststage',
      title: 'Generar Presupuesto',
      description: 'Enviar un nuevo presupuesto a un cliente.',
      allowedRoles: ['admin', 'recept'],
    },
    {
      path: '/carga-materiales',
      title: 'Carga de Materiales',
      description: 'Registrar los materiales comprados.',
      allowedRoles: ['admin', 'recept'],
    },
    {
      path: '/seguimiento-trabajos',
      title: 'Seguimiento de Trabajos',
      description: 'Ver el estado de los trabajos en curso.',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/pedido-primera-inspeccion',
      title: 'Pedido de Primera Inspección',
      description: 'Solicitar la primera inspección de obra.',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/pedido-inspeccion-final',
      title: 'Pedido de Inspección Final',
      description: 'Solicitar la inspección final de obra.',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/registrar-pagos',
      title: 'Registrar Pagos',
      description: 'Registrar los pagos realizados por los clientes.',
      allowedRoles: ['owner', 'admin'],
    },
  ];

  // Filtrar las opciones según el rol del usuario
  const filteredOptions = dashboardOptions.filter((option) =>
    option.allowedRoles.includes(staff?.role)
  );

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOptions.map((option) => (
          <div
            key={option.path}
            className="p-4 border rounded shadow-md cursor-pointer hover:bg-gray-100"
            onClick={() => navigateTo(option.path)}
          >
            <h2 className="text-xl font-semibold">{option.title}</h2>
            <p className="text-gray-600">{option.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;