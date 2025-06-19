import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import InvoiceIcon from '../../assets/logos/invoice.png'; // Asegúrate de que la ruta sea correcta
import CalendarIcon from '../../assets/logos/calendario.png';
import MsmIcon from '../../assets/logos/msm.png';
import ArchivoIcon from '../../assets/logos/archivos.png';
import BudgetIcon from '../../assets/logos/budgets.png';
import CheckIcon from '../../assets/logos/check.png';
import StaffIcon from '../../assets/logos/trabajador.png';
import WorckIcon from '../../assets/logos/construction.png';
import PermitIcon from '../../assets/logos/permit.png';
import EstadIcon from '../../assets/logos/estad.png';
import ProgressIcon from '../../assets/logos/progress.png';
import MaterialIcon from '../../assets/logos/materiales.png';
import ChecksIcon from '../../assets/logos/checks.png';
import Precio from '../../assets/logos/precio.png'; 

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentStaff: staff  } = useSelector((state) => state.auth); // Obtener el rol del usuario autenticado

  // Definir las opciones del Dashboard con sus rutas y roles permitidos
  const dashboardOptions = [
    {
      path: '/progress-tracker',
      title: 'Progress Tracker',
      icon: <img src={ProgressIcon} alt="Progress Tracker" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-yellow-200',
      allowedRoles: ['owner'],
    },
    {
      path: '/works',
      title: 'Works',
      icon: <img src={WorckIcon} alt="Works" className="w-24 h-24" />,
      color: 'bg-gray-300',
      allowedRoles: ['owner'],
    },
    {
      path: '/workCalendar',
      title: 'Calendar',
      icon: <img src={CalendarIcon} alt="Calendar" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-yellow-200',
      allowedRoles: ['owner'],
    },
    {
      path: '/materiales',
      title: 'Materials',
      icon: <img src={MaterialIcon} alt="Materials" className="w-24 h-24" />,
      color: 'bg-gray-300',
      allowedRoles: ['owner', 'recept'],
    },
    {
      path: '/check',
      title: 'Check Work',
      icon: <img src={CheckIcon} alt="Check Work" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-yellow-200',
      allowedRoles: ['owner', 'admin', 'recept'],
    },
    {
      path: '/budgets',
      title: 'Budgets List',
      icon: <img src={BudgetIcon} alt="Budgets List" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-gray-300',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/pdf',
      title: 'Upload Permits',
      icon: <img src={PermitIcon} alt="Upload Permits" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-yellow-200',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/editBudget',
      title: 'Budget Edit',
      icon: <img src={ChecksIcon} alt="Budget Edit" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-gray-300',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/archive',
      title: 'Budgets End',
      icon: <img src={ArchivoIcon} alt="Budgets End" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-yellow-200',
      allowedRoles: ['owner', 'admin'],
    },
    {
      path: '/send-notifications',
      title: 'Send Message',
      icon: <img src={MsmIcon} alt="Send Message" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-gray-300',
      allowedRoles: ['owner', 'admin', 'recept', 'worker'],
    },
    {
      path: '/attachInvoice',
      title: 'Upload Vouchers',
      icon: <img src={InvoiceIcon} alt="Upload Vouchers" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-yellow-200',
      allowedRoles: ['owner', 'admin', 'recept'],
    },
    {
      path: '/balance',
      title: 'Balance',
      icon: <img src={EstadIcon} alt="Balance" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-gray-300',
      allowedRoles: ['owner'],
    },
    {
      path: '/itemBudget',
      title: 'Price Item Budget',
      icon: <img src={Precio} alt="Price" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-yellow-200',
      allowedRoles: ['owner'],
    },


    {
      path: '/register',
      title: 'Register Staff',
      icon: <img src={StaffIcon} alt="Register Staff" className="w-16 h-16 sm:w-20 sm:h-20" />,
      color: 'bg-gray-300',
      allowedRoles: ['owner'],
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
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
       
        
        {/* Grid responsive optimizado para iPad */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {filteredOptions.map((option) => (
            <div
              key={option.path}
              className={`${option.color} w-full aspect-square flex flex-col justify-center items-center border border-gray-300 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer p-3 md:p-4 hover:scale-105 transform`}
              onClick={() => navigateTo(option.path)}
            >
              {option.icon && (
                <div className="mb-2 md:mb-4 flex items-center justify-center">
                  {/* Clonamos el elemento icon para asegurar tamaños consistentes */}
                  {React.cloneElement(option.icon, {
                    className: "w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain"
                  })}
                </div>
              )}
              <h2 className="text-xs sm:text-sm md:text-base lg:text-lg text-blue-950 text-center font-varela font-semibold leading-tight">
                {option.title}
              </h2>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;