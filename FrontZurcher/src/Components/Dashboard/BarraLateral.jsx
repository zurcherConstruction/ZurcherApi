import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux"; // Asegúrate de importar useSelector


const BarraLateral = () => {
  const { staff } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false); // Estado para controlar si la barra lateral está abierta

  const menuItems = [
   
    { name: "Cargar Permits", path: "/pdf" },
    { name: "Presupuestos", path: "/budgets" },
    { name: "Works", path: "/works" },
    { name: "Seguimiento", path: "/inspecciones" },
    { name: "Materiales", path: "/materiales" },
    { name: "Staff", path: "/staff" },
    { name: "Estadísticas", path: "/estadisticas" },
    { name: "Clientes", path: "/clientes" },
    { name: "Progresos", path: "/progress-tracker" },
    { name: "Enviar mensaje", path: "/send-notifications" },
    { name: "Instalacion", path: "/installation" },
    
  ];

  return (
    <>
      {/* Botón hamburguesa para dispositivos pequeños */}
      <button
        className="lg:hidden fixed top-4 left-4  z-50 bg-gray-800 text-white p-2 rounded-md focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "✖" : "☰"} {/* Cambia el ícono según el estado */}
      </button>

      {/* Barra lateral */}
      <div
        className={`fixed top-0 left-0 h-screen bg-gray-800 text-white flex flex-col items-center pt-20  transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static w-60 md:w-48 lg:w-40`}
      >
        {/* Menú */}
        <ul className="flex flex-col w-full mt-4">
          {menuItems.map((item) => (
            <li key={item.name} className="w-full">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `block py-3 px-4 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-blue-950 text-white"
                      : "hover:bg-gray-700 hover:text-blue-300"
                  }`
                }
                onClick={() => setIsOpen(false)} // Cierra la barra lateral al hacer clic en un enlace
              >
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Fondo oscuro cuando la barra lateral está abierta en dispositivos pequeños */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)} // Cierra la barra lateral al hacer clic fuera de ella
        ></div>
      )}
    </>
  );
};

export default BarraLateral;