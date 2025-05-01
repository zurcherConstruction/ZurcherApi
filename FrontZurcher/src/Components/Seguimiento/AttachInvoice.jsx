import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../../Redux/Actions/workActions"; // Acción para obtener todas las obras
import { createReceipt } from "../../Redux/Actions/receiptActions"; // Acción para crear comprobantes
import { incomeActions, expenseActions } from "../../Redux/Actions/balanceActions"; // Acciones para Income y Expense
import { toast } from "react-toastify";

const incomeTypes = [
  "Factura Pago Final Budget",
  "DiseñoDif",
  "Comprobante Ingreso",
];

const expenseTypes = [
  "Materiales",
  "Diseño",
  "Workers",
  "Imprevistos",
  "Comprobante Gasto",
  
];

const AttachReceipt = () => {
  const dispatch = useDispatch();

  // Obtener las obras desde el estado global
  const { works, loading, error } = useSelector((state) => state.work);

  // Estados locales
  const [selectedWork, setSelectedWork] = useState(""); // ID de la obra seleccionada
  const [type, setType] = useState(""); // Tipo de comprobante (Income o Expense)
  const [file, setFile] = useState(null); // Archivo del comprobante
  const [notes, setNotes] = useState(""); // Notas opcionales
  const [amount, setAmount] = useState(""); // Monto del ingreso o gasto

  // Cargar las obras al montar el componente
  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedWork || !type || !amount) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }
    if (!file) { // Validar archivo por separado si es obligatorio
      toast.error("Por favor, adjunta un archivo de comprobante.");
      return;
  }


  let createdRecordId = null; // Variable para guardar el ID del Income/Expense
  let createdRecord; 

  try {
    // --- 1. Crear Income o Expense y CAPTURAR el resultado ---
    const isIncome = incomeTypes.includes(type);
    const data = {
      date: new Date().toISOString().split("T")[0],
      amount: parseFloat(amount),
      notes,
      workId: selectedWork,
      ...(isIncome ? { typeIncome: type } : { typeExpense: type }),
    };

    console.log('Datos a enviar (Income/Expense):', data);

    if (isIncome) {
      // Asumiendo que la acción devuelve el objeto creado
      createdRecord = await incomeActions.create(data);
      console.log("Resultado de incomeActions.create:", createdRecord); // <--- ESTE LOG
      if (!createdRecord || !createdRecord.idIncome) { // Ajusta 'idIncome' si el nombre es diferente
          throw new Error("No se pudo obtener el ID del ingreso creado.");
      }
      createdRecordId = createdRecord.idIncome; // Guardar el ID del Ingreso
      toast.success("Ingreso registrado correctamente.");
    } else {
      // Asumiendo que la acción devuelve el objeto creado
      createdRecord = await expenseActions.create(data);
       if (!createdRecord || !createdRecord.idExpense) { // Ajusta 'idExpense' si el nombre es diferente
          throw new Error("No se pudo obtener el ID del gasto creado.");
      }
      createdRecordId = createdRecord.idExpense; // Guardar el ID del Gasto
      toast.success("Gasto registrado correctamente.");
    }

    // --- 2. Crear FormData para el Recibo USANDO el ID obtenido ---
    if (file && createdRecordId) { // Asegurarse de que tenemos archivo y ID
        const formData = new FormData();
        formData.append("relatedModel", isIncome ? "Income" : "Expense"); // Modelo correcto
        formData.append("relatedId", createdRecordId); // <-- ID del Gasto/Ingreso recién creado
        formData.append("type", type); // Tipo (puede ser el mismo o uno genérico)
        formData.append("file", file); // Archivo
        formData.append("notes", notes); // Notas

        console.log('Enviando FormData para Receipt:', Object.fromEntries(formData));

        // --- 3. Llamar a la acción para crear el comprobante ---
        await dispatch(createReceipt(formData));
        toast.success("Comprobante adjuntado correctamente.");
    } else if (file && !createdRecordId) {
        // Esto no debería ocurrir si la lógica anterior es correcta
        console.error("Se intentó adjuntar archivo pero no se obtuvo ID del registro asociado.");
        toast.warn("Se creó el registro, pero hubo un problema al obtener su ID para adjuntar el comprobante.");
    }


    // Limpiar el formulario
    setSelectedWork("");
    setType("");
    setFile(null);
    if (e.target.elements.file) {
       e.target.elements.file.value = null;
    }
    setNotes("");
    setAmount("");

  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    const errorMsg = error?.response?.data?.message || error?.message || "Hubo un error al procesar la solicitud.";
    toast.error(errorMsg);
  }
};


  return (
    <div className="p-4 bg-white shadow-md rounded-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Adjuntar Comprobante</h2>

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

        {/* Seleccionar tipo de comprobante */}
        <div>
          <label htmlFor="type" className="block text-gray-700 text-sm font-bold mb-2">
            Tipo de Comprobante:
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Seleccione un tipo</option>
            <optgroup label="Ingresos">
              {incomeTypes.map((incomeType) => (
                <option key={incomeType} value={incomeType}>
                  {incomeType}
                </option>
              ))}
            </optgroup>
            <optgroup label="Gastos">
              {expenseTypes.map((expenseType) => (
                <option key={expenseType} value={expenseType}>
                  {expenseType}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Monto */}
        <div>
          <label htmlFor="amount" className="block text-gray-700 text-sm font-bold mb-2">
            Monto:
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Adjuntar archivo */}
        <div>
          <label htmlFor="file" className="block text-gray-700 text-sm font-bold mb-2">
          Adjuntar Comprobante (PDF o Imagen):
          </label>
          <input
            type="file"
            id="file"
            accept="application/pdf, image/jpeg, image/png, image/gif" // Solo permitir archivos PDF
            onChange={(e) => setFile(e.target.files[0])}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
            {file && <p className="text-sm text-gray-600 mt-1">Archivo seleccionado: {file.name}</p>}
        </div>

        {/* Notas opcionales */}
        <div>
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">
            Notas (Opcional):
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Adjuntar Comprobante
        </button>
      </form>
    </div>
  );
};

export default AttachReceipt;