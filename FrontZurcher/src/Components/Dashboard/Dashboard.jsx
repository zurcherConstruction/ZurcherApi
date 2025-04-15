import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Dashboard = () => {
  const navigate = useNavigate();
  const { staff } = useSelector((state) => state.auth); // Obtener el rol del usuario autenticado

  // Definir las opciones del Dashboard con sus rutas y roles permitidos
  const dashboardOptions = [
    {
      path: '/progress-tracker',
      title: 'Progress Tracker',
      color: 'bg-gray-100',
      allowedRoles: ['owner'],
    },
    {
      path: '/works',
      title: 'Works',
      color: 'bg-gray-100',
      allowedRoles: ['owner'],
    },
    {
      path: '/work/:idWork',
      title: 'Work Details',
      color: 'bg-gray-100',
      allowedRoles: ['owner'],
    },
    {
      path: '/workCalendar',
      title: 'Calendar',
      color: 'bg-gray-100',
      allowedRoles: ['owner'],
    },
    {
      path: '/materiales',
      title: 'Materials',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'recept'],
    },
    {
      path: '/check',
      title: 'Check Work',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin', 'recept'],
    },
    {
      path: '/budgets',
      title: 'Budgets List',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/pdf',
      title: 'Upload Permits',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/editBudget/:budgetId',
      title: 'Budget Edit',
      
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/archive',
      title: 'Budgets End',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/send-notifications',
      title: 'Send Message',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin', 'recept', 'worker'],
    },
    {
      path: '/attachInvoice',
      title: 'Upload Vouchers',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin', 'recept'],
    },
    {
      path: '/balance',
      title: 'Balance',
      color: 'bg-gray-100',
      allowedRoles: ['owner'],
    },
    {
      path: '/register',
      title: 'Register Staff',
      color: 'bg-gray-100',
      allowedRoles: ['owner'],
    },
    {
      path: '/check',
      title: 'Check Work',
      color: 'bg-gray-100',
      allowedRoles: ['owner', 'admin', 'recept'],
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
    <div className="container mx-auto py-4 px-2 h-screen overflow-hidden">

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-6">
        {filteredOptions.map((option) => (
          <div
            key={option.path}
            className={`${option.color} w-36 h-36 flex flex-col justify-center items-center border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer`}
            onClick={() => navigateTo(option.path)}
          >
            <h2 className="text-lg  text-blue-950 text-center uppercase p-1">{option.title}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Dashboard;