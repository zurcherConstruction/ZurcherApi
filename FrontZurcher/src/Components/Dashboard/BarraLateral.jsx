import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const BarraLateral = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado para controlar el menú móvil
  const navigate = useNavigate(); // Hook para manejar la navegación
  const location = useLocation(); // Hook para detectar cambios en la URL
  const { currentStaff: staff } = useSelector((state) => state.auth);

 
 
  // const menuItems = [
  //   { name: "Upload Permits", path: "/pdf" },
  //   { name: "Budgets", path: "/budgets" },
  //   { name: "Works", path: "/works" },
  //   { name: "Tracking Work", path: "/check" },
  //   { name: "Materials", path: "/materiales" },
  //   { name: "Initial Pay", path: "/initialPay" },
  //   { name: "Progress", path: "/progress-tracker" },
  //   { name: "Send Message", path: "/send-notifications" },
  //   { name: "Staff", path: "/register" },
  //   { name: "Calendar", path: "/workCalendar" },
  //   { name: "BudgetsEnd", path: "/archive" },
  //   { name: "Upload Vouchers", path: "/attachInvoice" },
  //   { name: "Dashboard", path: "/dashboard" },
  //   { name: "Balance", path: "/balance" },
  //   { name: "Items Budgets", path: "/itemBudget" },
  //   { name: "Edit Budgets", path: "/editBudget" }, // Ruta para configuración


  // ];
  // New state to manage open sections. Key is section name, value is boolean.
  const [openSections, setOpenSections] = useState({});

  const menuSections = [
    {
      name: "Work Management",
      items: [
        { name: "Works", path: "/works" },
        { name: "Tracking Work", path: "/check" },
        { name: "Progress", path: "/progress-tracker" },
        { name: "Calendar", path: "/workCalendar" },
      ],
    },
    {
      name: "Budgets & Permits",
      items: [
        { name: "Upload Permits", path: "/pdf" },
        { name: "Budgets", path: "/budgets" },
        { name: "Items Budgets", path: "/itemBudget" },
        { name: "Edit Budgets", path: "/editBudget" },
        {name : "Gestion Budgets", path: "/gestionBudgets"},
        { name: "BudgetsEnd", path: "/archive" },
      ],
    },
    {
      name: "Financial",
      items: [
        { name: "Initial Pay", path: "/initialPay" },
        { name: "Upload Vouchers", path: "/attachInvoice" },
        { name: "Balance", path: "/balance" },
        { name: "Income & Expenses", path: "/summary" },
      ],
    },
    {
      name: "Administration",
      items: [
        { name: "Materials", path: "/materiales" },
        { name: "Send Message", path: "/send-notifications" },
        { name: "Staff", path: "/register" },
        { name: "Dashboard", path: "/dashboard" },
      ],
    },
  ];


  const handleNavigation = (path) => {
    navigate(path); // Navega a la ruta seleccionada
    setIsMobileMenuOpen(false); // Cierra el menú móvil
  };
  const toggleSection = (sectionName) => {
    setOpenSections(prevOpenSections => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName],
    }));
  };
  
  const handleMobileNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  if (staff?.role !== "owner") {
    return null; // No renderizar la barra lateral si no es "owner"
  }
  const renderMenuItems = (isMobile) => (
    menuSections.map((section) => (
      <div key={section.name} className="w-full">
        <button
          onClick={() => toggleSection(section.name)}
          className="flex items-center justify-between w-full py-3 px-4 text-base font-normal transition-all duration-300 text-left hover:bg-gray-700 hover:text-blue-300 focus:outline-none"
        >
          {section.name}
          {/* Example Icon - replace with actual icons or text like +/- */}
          <span>{openSections[section.name] ? "−" : "+"}</span>
        </button>
        {openSections[section.name] && (
          <ul className="pl-4"> {/* Indent sub-items */}
            {section.items.map((item) => (
              <li key={item.name} className="w-full">
                <button
                  onClick={() => isMobile ? handleMobileNavigation(item.path) : handleNavigation(item.path)}
                  className={`block py-2 px-4 text-xs font-medium transition-all duration-300 w-full text-left hover:bg-gray-600 hover:text-blue-200 ${
                    location.pathname === item.path ? "bg-gray-600 text-blue-200" : ""
                  }`}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    ))
  );

  return (
    <div className="flex">
      {/* Menú para pantallas grandes */}
      <div className="hidden lg:flex flex-col bg-gray-800 text-white w-48 h-screen fixed"> {/* Increased width for section names */}
        <ul className="flex flex-col mt-4 flex-1 overflow-y-auto min-h-0">
          {renderMenuItems(false)}
        </ul>
      </div>

      {/* Menú para pantallas pequeñas */}
      <div className="lg:hidden">
        <button
          className="fixed top-4 left-4 z-50 text-white p-2 rounded-md focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? "✖" : "☰"}
        </button>

        {isMobileMenuOpen && (
          <div className="fixed top-0 left-0 w-3/4 h-screen bg-gray-800 text-white z-40 flex flex-col">
            <ul className="flex flex-col mt-16 flex-1 overflow-y-auto min-h-0">
              {renderMenuItems(true)}
            </ul>
          </div>
        )}

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
      </div>


      {/* Contenido principal */}
      <div className="flex-1 lg:ml-48 "> {/* Ajuste para que el contenido principal no quede debajo de la barra lateral */}
        {/* Aquí va el contenido principal de la página */}

      </div>
    </div>
  );
};

export default BarraLateral;