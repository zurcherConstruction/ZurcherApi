import React from "react";
import { NavLink } from "react-router-dom";


const BarraLateral = () => {
  const menuItems = [
    { name: "Works", path: "/works" },
    { name: "Cargar Permits", path: "/cargarPermits" },
    { name: "Presupuestos", path: "/presupuestos" },
    { name: "Inspecciones", path: "/inspecciones" },
    { name: "Materiales", path: "/materiales" },
    { name: "Staff", path: "/staff" },
    { name: "Estadísticas", path: "/estadisticas" },
    { name: "Clientes", path: "/clientes" },
    { name: "Progresos", path: "/progresos" },
  ];

  return (
    <div className="h-screen w-60 bg-gray-800 text-white flex flex-col items-center fixed top-0 left-0 pt-20">
      {/* Logo */}
     

      {/* Menú */}
      <ul className="flex flex-col w-full mt-4">
        {menuItems.map((item) => (
          <li key={item.name} className="w-full">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `block py-3 px-4 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-700 hover:text-blue-300"
                }`
              }
            >
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BarraLateral;