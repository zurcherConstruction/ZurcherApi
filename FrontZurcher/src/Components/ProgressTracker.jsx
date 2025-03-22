import React, { useState } from "react";

const etapas = [
  "Presupuesto", "Pago", "Instalación", "Inspección",
  "Tapado", "Inspec Final", "Terminado"
];

const edificaciones = [
  { id: 1, numeroCliente: "1234", etapaActual: "Instalación" },
  { id: 2, numeroCliente: "5678", etapaActual: "Tapado" },
  { id: 3, numeroCliente: "9101", etapaActual: "Pago" },
];

const ProgressTracker = () => {
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState(edificaciones);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setFilteredData(
      edificaciones.filter((item) => item.numeroCliente.includes(value))
    );
  };

  const getProgressIndex = (etapa) => etapas.indexOf(etapa);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <input
        type="text"
        placeholder="Buscar por N° de Cliente"
        value={search}
        onChange={handleSearch}
        className="border p-2 mb-4 w-full rounded-md"
      />
      {filteredData.map(({ id, numeroCliente, etapaActual }) => (
        <div key={id} className="mb-6 bg-white p-4 shadow-md rounded-lg">
          <h3 className="font-bold text-lg mb-2">Cliente: {numeroCliente}</h3>
          <div className="relative flex items-center overflow-x-auto">
            <div className="absolute w-full h-2 bg-gray-300 rounded-full"></div>
            <div
              className="absolute h-2 bg-green-500 rounded-full"
              style={{ width: `${(getProgressIndex(etapaActual) / (etapas.length - 1)) * 100}%` }}
            ></div>
            {etapas.map((etapa, index) => (
              <div key={etapa} className="relative flex flex-col items-center w-full min-w-max">
                <div
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-xs z-10 ${
                    getProgressIndex(etapaActual) >= index
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                >
                  {index + 1}
                </div>
                <p className="text-xs mt-2 text-center w-16 text-gray-700">{etapa}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-sm mt-4 text-center">
            Estado actual: <span className="font-semibold">{etapaActual}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

export default ProgressTracker;

