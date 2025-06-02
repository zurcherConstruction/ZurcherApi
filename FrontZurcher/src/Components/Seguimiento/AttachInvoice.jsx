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
  "Materiales Iniciales"

];

const AttachReceipt = () => {
  const dispatch = useDispatch();

  // Obtener las obras desde el estado global
  const { works, loading, error: worksError } = useSelector((state) => state.work);
  const staff = useSelector((state) => state.auth.currentStaff);
  // Estados locales
  const [selectedWork, setSelectedWork] = useState(""); // ID de la obra seleccionada
  const [type, setType] = useState(""); // Tipo de comprobante (Income o Expense)
  const [file, setFile] = useState(null); // Archivo del comprobante
  const [notes, setNotes] = useState(""); // Notas opcionales
  const [generalAmount, setGeneralAmount] = useState("");
  const [amount, setAmount] = useState(""); // Monto del ingreso o gasto
  const [finalPaymentAmount, setFinalPaymentAmount] = useState(''); // Monto específico para el pago de Factura Final
  const [amountPaid, setAmountPaid] = useState(''); // Nuevo estado para el monto pagado
  const [finalInvoiceDetails, setFinalInvoiceDetails] = useState(null);



  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  useEffect(() => {
    if (type === "Factura Pago Final Budget" && selectedWork && works) {
      const workDetails = works.find(w => w.idWork === selectedWork);
      if (workDetails && workDetails.finalInvoice) {
        setFinalInvoiceDetails(workDetails.finalInvoice);
        // Limpiar el monto de pago final si se cambia la obra o el tipo
        setFinalPaymentAmount('');
      } else {
        setFinalInvoiceDetails(null);
      }
    } else {
      setFinalInvoiceDetails(null);
    }
  }, [selectedWork, type, works]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!selectedWork || !type) {
      toast.error("Por favor, completa la obra y el tipo.");
      return;
    }

    // Validación de archivo
    if (!file) {
      toast.error("Por favor, adjunta un archivo de comprobante.");
      return;
    }

    const formData = new FormData();
    if (file) { // Solo adjuntar si hay archivo (aunque ahora es siempre obligatorio)
      formData.append("file", file);
    }
    formData.append("notes", notes);
    formData.append("type", type); // El backend usa este 'type' para la lógica especial

    try {
      if (type === "Factura Pago Final Budget") {
        if (!finalInvoiceDetails || !finalInvoiceDetails.id) {
          toast.error("No se encontraron detalles de la factura final para la obra seleccionada o la factura no tiene ID.");
          return;
        }

        // ACTUALIZAR ESTA VALIDACIÓN - Permitir también 'paymentReceived'
        if (finalInvoiceDetails.status === 'paid') {
          toast.warn("La Factura Final para esta obra ya está marcada como pagada.");
          return;
        }

        // Permitir carga de comprobante incluso si el trabajo ya está en 'paymentReceived'
        const workDetails = works.find(w => w.idWork === selectedWork);
        if (workDetails?.status === 'paymentReceived' && finalInvoiceDetails.status !== 'paid') {
          // Caso especial: El trabajo está en paymentReceived pero la factura no está marcada como paid
          toast.info("El trabajo está marcado como pago recibido. Procesando comprobante para completar el registro.");
        } else if (!['pending', 'partially_paid', 'send'].includes(finalInvoiceDetails.status)) {
          toast.error(`La Factura Final no está en un estado válido para registrar el pago (Estado actual: ${finalInvoiceDetails.status}).`);
          return;
        }

        if (!finalPaymentAmount || isNaN(parseFloat(finalPaymentAmount)) || parseFloat(finalPaymentAmount) <= 0) {
          toast.error("Por favor, ingrese un monto pagado válido para la factura final.");
          return;
        }

        const numericAmountPaid = parseFloat(finalPaymentAmount);
        const numericFinalAmountDue = parseFloat(finalInvoiceDetails.finalAmountDue);
        const numericTotalAmountPaidPreviously = parseFloat(finalInvoiceDetails.totalAmountPaid || 0);
        const currentRemainingBalance = numericFinalAmountDue - numericTotalAmountPaidPreviously;

        if (numericAmountPaid > currentRemainingBalance + 0.001) {
          toast.error(`El monto pagado ($${numericAmountPaid.toFixed(2)}) no puede exceder el saldo pendiente ($${currentRemainingBalance.toFixed(2)}).`);
          return;
        }

        formData.append("relatedModel", "FinalInvoice");
        formData.append("relatedId", finalInvoiceDetails.id.toString());
        formData.append("amountPaid", numericAmountPaid.toString());
        formData.append("workId", selectedWork);

        console.log('Enviando FormData para Receipt (Pago Final Factura):', Object.fromEntries(formData));
        await dispatch(createReceipt(formData));

        // Mensaje específico según el contexto
        if (workDetails?.status === 'paymentReceived') {
          toast.success("Comprobante de Pago Final registrado. El trabajo ya estaba marcado como pago recibido.");
        } else {
          toast.success("Comprobante de Pago Final adjuntado y procesado correctamente.");
        }

      } else {
        // Lógica existente para otros tipos...
        if (!generalAmount || isNaN(parseFloat(generalAmount)) || parseFloat(generalAmount) <= 0) {
          toast.error("Por favor, ingrese un monto válido para el ingreso/gasto.");
          return;
        }

        let createdRecordId = null;
        let createdRecord;
        const isIncome = incomeTypes.includes(type);
        const incomeExpenseData = {
          date: new Date().toISOString().split("T")[0],
          amount: parseFloat(generalAmount),
          notes,
          workId: selectedWork,
          staffId: staff?.id,
          ...(isIncome ? { typeIncome: type } : { typeExpense: type }),
        };

        console.log('Datos a enviar (Income/Expense):', incomeExpenseData);

        if (isIncome) {
          createdRecord = await incomeActions.create(incomeExpenseData);
          if (!createdRecord || !createdRecord.idIncome) {
            throw new Error("No se pudo obtener el ID del ingreso creado.");
          }
          createdRecordId = createdRecord.idIncome;
          toast.success("Ingreso registrado correctamente.");
        } else {
          createdRecord = await expenseActions.create(incomeExpenseData);
          if (!createdRecord || !createdRecord.idExpense) {
            throw new Error("No se pudo obtener el ID del gasto creado.");
          }
          createdRecordId = createdRecord.idExpense;
          toast.success("Gasto registrado correctamente.");
        }

        if (createdRecordId) { // Solo adjuntar recibo si el ingreso/gasto se creó
          formData.append("relatedModel", isIncome ? "Income" : "Expense");
          formData.append("relatedId", createdRecordId.toString());

          console.log('Enviando FormData para Receipt (General):', Object.fromEntries(formData));
          await dispatch(createReceipt(formData));
          toast.success("Comprobante adjuntado correctamente.");
        }
      }

      // Limpiar el formulario
      setSelectedWork("");
      setType("");
      setFile(null);
      if (e.target.elements.file) {
        e.target.elements.file.value = null;
      }
      setNotes("");
      setGeneralAmount("");
      setFinalPaymentAmount("");
      setFinalInvoiceDetails(null);

    } catch (err) { // Cambiado 'error' a 'err' para evitar colisión con 'worksError'
      console.error("Error al procesar la solicitud:", err);
      const errorMsg = err?.payload?.message || err?.message || "Hubo un error al procesar la solicitud.";
      toast.error(errorMsg);
    }
  };

  const currentWorkDetails = works && selectedWork ? works.find(w => w.idWork === selectedWork) : null;
  const calculatedRemainingBalance = finalInvoiceDetails
    ? (parseFloat(finalInvoiceDetails.finalAmountDue || 0) - parseFloat(finalInvoiceDetails.totalAmountPaid || 0)).toFixed(2)
    : "0.00";


  return (
    <div className="p-4 bg-white shadow-md rounded-lg max-w-lg mx-auto"> {/* Aumentado max-w-lg */}
      <h2 className="text-xl font-bold mb-6 text-center">Adjuntar Comprobante</h2>

      {loading && <p className="text-center text-blue-500">Cargando obras...</p>}
      {worksError && <p className="text-center text-red-500">Error al cargar obras: {typeof worksError === 'object' ? JSON.stringify(worksError) : worksError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            {works && works.map((work) => {
              // Mostrar obras que pueden necesitar comprobantes de pago
              const canAttachPayment = ['invoiceFinal', 'paymentReceived'].includes(work.status);
              const hasUnpaidInvoice = work.finalInvoice && work.finalInvoice.status !== 'paid';

              // Mostrar todas las obras, pero destacar las relevantes para pagos
              return (
                <option key={work.idWork} value={work.idWork}>
                  {work.propertyAddress}
                  {canAttachPayment && hasUnpaidInvoice ? ' 💰' : ''}
                  {work.status === 'paymentReceived' ? ' (Pago Recibido)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {selectedWork && currentWorkDetails && (
  <div className="my-4 p-3 border border-gray-300 rounded bg-gray-50">
    <h5 className="text-sm font-semibold text-gray-700 mb-2">📊 Estado de la Obra</h5>
    <p className="text-xs"><strong>Obra:</strong> {currentWorkDetails.propertyAddress}</p>
    <p className="text-xs"><strong>Estado:</strong> 
      <span className={`ml-1 px-2 py-1 rounded text-xs ${
        currentWorkDetails.status === 'paymentReceived' ? 'bg-green-100 text-green-800' :
        currentWorkDetails.status === 'invoiceFinal' ? 'bg-blue-100 text-blue-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {currentWorkDetails.status}
      </span>
    </p>
    
    {/* ALERTA PARA FACTURA FINAL FALTANTE */}
    {type === "Factura Pago Final Budget" && !currentWorkDetails.finalInvoice && (
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ Factura Final no encontrada
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Para poder registrar el pago final, primero debes <strong>generar la Factura Final</strong> de esta obra.
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              📋 <strong>Pasos a seguir:</strong>
            </p>
            <ol className="text-xs text-yellow-600 mt-1 ml-4 list-decimal">
              <li>Ve al detalle de la obra</li>
              <li>Busca la sección "Factura Final"</li>
              <li>Haz clic en "Generar Factura Final"</li>
              <li>Luego podrás registrar el comprobante de pago aquí</li>
            </ol>
          </div>
        </div>
      </div>
    )}

    {/* ALERTA PARA ESTADO INCORRECTO */}
    {type === "Factura Pago Final Budget" && currentWorkDetails.finalInvoice && 
     !['invoiceFinal', 'paymentReceived'].includes(currentWorkDetails.status) && (
      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-orange-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-orange-800">
              ℹ️ Estado no óptimo para pago
            </p>
            <p className="text-xs text-orange-700 mt-1">
              La obra debería estar en estado <strong>"Factura Final"</strong> o <strong>"Pago Recibido"</strong> para procesar pagos.
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Estado actual: <strong>{currentWorkDetails.status}</strong>
            </p>
          </div>
        </div>
      </div>
    )}

    {/* ALERTA DE FACTURA YA PAGADA */}
    {type === "Factura Pago Final Budget" && currentWorkDetails.finalInvoice?.status === 'paid' && (
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">
              ✅ Factura completamente pagada
            </p>
            <p className="text-xs text-green-700 mt-1">
              La Factura Final de esta obra ya está marcada como pagada completamente.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
)}

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

        {/* Mostrar detalles de Factura Final y campo de monto específico */}
        {type === "Factura Pago Final Budget" && finalInvoiceDetails && currentWorkDetails && (
          <div className="my-4 p-3 border border-blue-300 rounded bg-blue-50">
            <h5 className="text-md font-semibold text-blue-700 mb-2">
              Detalles de Factura Final para: {currentWorkDetails.propertyAddress}
            </h5>
            <p className="text-sm">Monto Total Original: ${parseFloat(finalInvoiceDetails.originalBudgetTotal || 0).toFixed(2)}</p>
            {parseFloat(finalInvoiceDetails.subtotalExtras || 0) > 0 &&
              <p className="text-sm">Subtotal Extras: ${parseFloat(finalInvoiceDetails.subtotalExtras).toFixed(2)}</p>
            }
            <p className="text-sm">Monto Total Adeudado (Incl. Extras): ${parseFloat(finalInvoiceDetails.finalAmountDue || 0).toFixed(2)}</p>
            <p className="text-sm">Total Pagado Hasta Ahora: ${parseFloat(finalInvoiceDetails.totalAmountPaid || 0).toFixed(2)}</p>
            <p className="text-sm font-bold text-blue-600">
              Saldo Pendiente Actual: ${calculatedRemainingBalance}
            </p>

            <div className="form-group mt-3">
              <label htmlFor="finalPaymentAmount" className="block text-gray-700 text-sm font-bold mb-2">Monto Pagado con este Comprobante:</label>
              <input
                type="number"
                step="0.01"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="finalPaymentAmount"
                value={finalPaymentAmount}
                onChange={(e) => setFinalPaymentAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>
        )}

        {/* Monto general (para otros tipos de ingresos/gastos) */}
        {type && type !== "Factura Pago Final Budget" && (
          <div>
            <label htmlFor="generalAmount" className="block text-gray-700 text-sm font-bold mb-2">
              Monto del {incomeTypes.includes(type) ? "Ingreso" : "Gasto"}:
            </label>
            <input
              type="number"
              step="0.01"
              id="generalAmount"
              value={generalAmount}
              onChange={(e) => setGeneralAmount(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="0.00"
              required
            />
          </div>
        )}

        <div>
          <label htmlFor="file" className="block text-gray-700 text-sm font-bold mb-2">
            Adjuntar Comprobante (PDF o Imagen):
          </label>
          <input
            type="file"
            id="file"
            name="file" // Añadir name para que e.target.elements.file funcione
            accept="application/pdf, image/jpeg, image/png, image/gif"
            onChange={(e) => setFile(e.target.files[0])}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          {file && <p className="text-sm text-gray-600 mt-1">Archivo seleccionado: {file.name}</p>}
        </div>

        <div>
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">
            Notas (Opcional):
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            rows="3"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={loading} // Deshabilitar botón mientras carga
        >
          {loading ? "Procesando..." : "Adjuntar Comprobante"}
        </button>
      </form>
    </div>
  );
};
export default AttachReceipt;