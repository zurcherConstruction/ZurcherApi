import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const BarraLateral = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado para controlar el menú móvil
  const navigate = useNavigate(); // Hook para manejar la navegación
  const location = useLocation(); // Hook para detectar cambios en la URL
  const { currentStaff: staff } = useSelector((state) => state.auth);

  const menuItems = [
    { name: "Upload Permits", path: "/pdf" },
    { name: "Budgets", path: "/budgets" },
    { name: "Works", path: "/works" },
    { name: "Tracking Work", path: "/check" },
    { name: "Materials", path: "/materiales" },
    { name: "Initial Pay", path: "/initialPay" },
    { name: "Progress", path: "/progress-tracker" },
    { name: "Send Message", path: "/send-notifications" },
    { name: "Staff", path: "/register" },
    { name: "Calendar", path: "/workCalendar" },
    { name: "BudgetsEnd", path: "/archive" },
    { name: "Upload Vouchers", path: "/attachInvoice" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Balance", path: "/balance" },
    { name: "Items Budgets", path: "/itemBudget" },
    { name: "Edit Budgets", path: "/editBudget" }, // Ruta para configuración


  ];

  const handleNavigation = (path) => {
    navigate(path); // Navega a la ruta seleccionada
    setIsMobileMenuOpen(false); // Cierra el menú móvil
  };
  if (staff?.role !== "owner") {
    return null; // No renderizar la barra lateral si no es "owner"
  }
  return (
    <div className="flex">
      {/* Menú para pantallas grandes */}
      <div className="hidden lg:flex flex-col bg-gray-800 text-white w-36 h-screen fixed">
        <ul className="flex flex-col mt-4"> {/* Ajuste para que el contenido comience más abajo */}
          {menuItems.map((item) => (
            <li key={item.name} className="w-full">
              <button
                onClick={() => navigate(item.path)}
                className={`block py-3 px-4 text-sm font-medium transition-all duration-300 w-full text-left hover:bg-gray-700 hover:text-blue-300 ${location.pathname === item.path ? "bg-gray-700 text-blue-300" : ""
                  }`}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Menú para pantallas pequeñas */}
      <div className="lg:hidden">
        {/* Botón hamburguesa */}
        <button
          className="fixed top-4 left-4 z-50  text-white p-2 rounded-md focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? "✖" : "☰"}
        </button>

        {/* Menú móvil desplegable */}
        {isMobileMenuOpen && (
          <div className="fixed top-0 left-0 w-3/4 h-screen bg-gray-800 text-white z-40 flex flex-col">
            <ul className="flex flex-col mt-16"> {/* Ajuste para que el contenido comience más abajo */}
              {menuItems.map((item) => (
                <li key={item.name} className="w-full">
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`block py-3 px-4 text-sm font-medium transition-all duration-300 w-full text-left hover:bg-gray-700 hover:text-blue-300 ${location.pathname === item.path ? "bg-gray-700 text-blue-300" : ""
                      }`}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fondo oscuro cuando el menú móvil está abierto */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileMenuOpen(false)} // Cierra el menú móvil al hacer clic fuera de él
          ></div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 lg:ml-36 "> {/* Ajuste para que el contenido principal no quede debajo de la barra lateral */}
        {/* Aquí va el contenido principal de la página */}

      </div>
    </div>
  );
};

export default BarraLateral;