import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../../Redux/Actions/workActions"; // Acción para obtener todas las obras
import { attachInvoiceToWork } from "../../Redux/Actions/workActions"; // Acción para adjuntar factura

const AttachInvoice = () => {
  const dispatch = useDispatch();

  // Obtener las obras desde el estado global
  const { works, loading, error } = useSelector((state) => state.work);

  // Estados locales
  const [selectedWork, setSelectedWork] = useState(""); // ID de la obra seleccionada
  const [invoiceFile, setInvoiceFile] = useState(null); // Archivo de la factura
  const [totalCost, setTotalCost] = useState(""); // Costo total

  // Cargar las obras al montar el componente
  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedWork || !invoiceFile || !totalCost) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    try {
      // Llamar a la acción para adjuntar la factura
      await dispatch(attachInvoiceToWork(selectedWork, invoiceFile, totalCost));
      alert("Factura y costo total adjuntados correctamente.");
      // Limpiar el formulario
      setSelectedWork("");
      setInvoiceFile(null);
      setTotalCost("");
    } catch (error) {
      console.error("Error al adjuntar la factura:", error);
      alert("Hubo un error al adjuntar la factura.");
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Adjuntar Factura y Costo Total</h2>

      {loading && <p>Cargando obras...</p>}
      {error && <p>Error al cargar obras: {error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seleccionar obra */}
        <div>
          <label htmlFor="work" className="block text-gray-700 text-sm font-bold mb-2">
            Seleccionar Obra:
          </label>
          <select
            id="work"
            value={selectedWork}
            onChange={(e) => setSelectedWork(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Seleccione una obra</option>
            {works.map((work) => (
              <option key={work.idWork} value={work.idWork}>
                {work.propertyAddress}
              </option>
            ))}
          </select>
        </div>

        {/* Adjuntar factura */}
        <div>
          <label htmlFor="invoiceFile" className="block text-gray-700 text-sm font-bold mb-2">
            Adjuntar Factura:
          </label>
          <input
            type="file"
            id="invoiceFile"
            accept="application/pdf" // Solo permitir archivos PDF
            onChange={(e) => setInvoiceFile(e.target.files[0])}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Ingresar costo total */}
        <div>
          <label htmlFor="totalCost" className="block text-gray-700 text-sm font-bold mb-2">
            Costo Total:
          </label>
          <input
            type="number"
            id="totalCost"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Adjuntar Factura
        </button>
      </form>
    </div>
  );
};

export default AttachInvoice;