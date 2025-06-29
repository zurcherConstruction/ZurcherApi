import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../../Redux/Actions/workActions"; // Acción para obtener todas las obras
import { createReceipt } from "../../Redux/Actions/receiptActions"; // Acción para crear comprobantes
import { incomeActions, expenseActions } from "../../Redux/Actions/balanceActions"; // Acciones para Income y Expense
import { toast } from "react-toastify";
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PaperClipIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";

const incomeTypes = [
  "Factura Pago Final Budget",
  "DiseñoDif",
  "Comprobante Ingreso",
];

const expenseTypes = [
  "Materiales",
  "Materiales Iniciales",
  "Inspección Inicial",
  "Inspección Final",
  "Diseño",
  "Workers",
  "Imprevistos",
  "Comprobante Gasto",
  "Gastos Generales"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <PaperClipIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Adjuntar Comprobante</h2>
          </div>
          <p className="text-gray-600">Registra ingresos, gastos y pagos de facturas finales</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="text-blue-600 font-medium">Cargando obras...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {worksError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <p className="text-red-700 font-medium">Error al cargar obras</p>
            </div>
            <p className="text-red-600 text-sm mt-1">
              {typeof worksError === 'object' ? JSON.stringify(worksError) : worksError}
            </p>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Work Selection */}
            <div>
              <label htmlFor="work" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <BuildingOffice2Icon className="h-5 w-5 mr-2 text-blue-500" />
                Seleccionar Obra
              </label>
              <select
                id="work"
                value={selectedWork}
                onChange={(e) => setSelectedWork(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
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

            {/* Work Status Card */}
            {selectedWork && currentWorkDetails && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3 mb-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                  <h5 className="font-semibold text-gray-800">Estado de la Obra</h5>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Obra:</span> {currentWorkDetails.propertyAddress}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Estado:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentWorkDetails.status === 'paymentReceived' 
                        ? 'bg-green-100 text-green-800 border border-green-200' :
                      currentWorkDetails.status === 'invoiceFinal' 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {currentWorkDetails.status}
                    </span>
                  </div>
                </div>
                
                {/* Alert for Missing Final Invoice */}
                {type === "Factura Pago Final Budget" && !currentWorkDetails.finalInvoice && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-800 text-sm">
                          ⚠️ Factura Final no encontrada
                        </p>
                        <p className="text-yellow-700 text-xs mt-1">
                          Para poder registrar el pago final, primero debes <strong>generar la Factura Final</strong> de esta obra.
                        </p>
                        <div className="mt-3">
                          <p className="text-yellow-700 text-xs font-medium">📋 Pasos a seguir:</p>
                          <ol className="text-yellow-600 text-xs mt-1 ml-4 list-decimal space-y-0.5">
                            <li>Ve al detalle de la obra</li>
                            <li>Busca la sección "Factura Final"</li>
                            <li>Haz clic en "Generar Factura Final"</li>
                            <li>Luego podrás registrar el comprobante de pago aquí</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert for Incorrect Status */}
                {type === "Factura Pago Final Budget" && currentWorkDetails.finalInvoice && 
                 !['invoiceFinal', 'paymentReceived'].includes(currentWorkDetails.status) && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <InformationCircleIcon className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-orange-800 text-sm">
                          ℹ️ Estado no óptimo para pago
                        </p>
                        <p className="text-orange-700 text-xs mt-1">
                          La obra debería estar en estado <strong>"Factura Final"</strong> o <strong>"Pago Recibido"</strong> para procesar pagos.
                        </p>
                        <p className="text-orange-600 text-xs mt-1">
                          Estado actual: <strong>{currentWorkDetails.status}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert for Already Paid Invoice */}
                {type === "Factura Pago Final Budget" && currentWorkDetails.finalInvoice?.status === 'paid' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800 text-sm">
                          ✅ Factura completamente pagada
                        </p>
                        <p className="text-green-700 text-xs mt-1">
                          La Factura Final de esta obra ya está marcada como pagada completamente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Receipt Type Selection */}
            <div>
              <label htmlFor="type" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                Tipo de Comprobante
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="">Seleccione un tipo</option>
                <optgroup label="💰 Ingresos">
                  {incomeTypes.map((incomeType) => (
                    <option key={incomeType} value={incomeType}>
                      {incomeType}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="💳 Gastos">
                  {expenseTypes.map((expenseType) => (
                    <option key={expenseType} value={expenseType}>
                      {expenseType}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Final Invoice Details Card */}
            {type === "Factura Pago Final Budget" && finalInvoiceDetails && currentWorkDetails && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                  <h5 className="font-semibold text-blue-800">
                    Detalles de Factura Final
                  </h5>
                </div>
                
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-800">
                    Obra: {currentWorkDetails.propertyAddress}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        <span className="font-medium">Monto Total Original:</span>
                        <span className="font-bold text-gray-800 ml-2">
                          ${parseFloat(finalInvoiceDetails.originalBudgetTotal || 0).toFixed(2)}
                        </span>
                      </p>
                      
                      {parseFloat(finalInvoiceDetails.subtotalExtras || 0) > 0 && (
                        <p className="text-gray-600">
                          <span className="font-medium">Subtotal Extras:</span>
                          <span className="font-bold text-gray-800 ml-2">
                            ${parseFloat(finalInvoiceDetails.subtotalExtras).toFixed(2)}
                          </span>
                        </p>
                      )}
                      
                      <p className="text-gray-600">
                        <span className="font-medium">Monto Total Adeudado:</span>
                        <span className="font-bold text-gray-800 ml-2">
                          ${parseFloat(finalInvoiceDetails.finalAmountDue || 0).toFixed(2)}
                        </span>
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        <span className="font-medium">Total Pagado:</span>
                        <span className="font-bold text-green-600 ml-2">
                          ${parseFloat(finalInvoiceDetails.totalAmountPaid || 0).toFixed(2)}
                        </span>
                      </p>
                      
                      <p className="text-gray-600">
                        <span className="font-medium">Saldo Pendiente:</span>
                        <span className="font-bold text-red-600 ml-2">
                          ${calculatedRemainingBalance}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="finalPaymentAmount" className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2 text-green-500" />
                    Monto Pagado con este Comprobante
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    id="finalPaymentAmount"
                    value={finalPaymentAmount}
                    onChange={(e) => setFinalPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            )}

            {/* General Amount Input */}
            {type && type !== "Factura Pago Final Budget" && (
              <div>
                <label htmlFor="generalAmount" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-500" />
                  Monto del {incomeTypes.includes(type) ? "Ingreso" : "Gasto"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="generalAmount"
                  value={generalAmount}
                  onChange={(e) => setGeneralAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="0.00"
                  required
                />
              </div>
            )}

            {/* File Upload */}
            <div>
              <label htmlFor="file" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <ArrowUpTrayIcon className="h-5 w-5 mr-2 text-blue-500" />
                Adjuntar Comprobante (PDF o Imagen)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="file"
                  name="file"
                  accept="application/pdf, image/jpeg, image/png, image/gif"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {file && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600 bg-green-50 p-2 rounded-lg">
                  <PaperClipIcon className="h-4 w-4 text-green-500" />
                  <span>Archivo seleccionado: <span className="font-medium">{file.name}</span></span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                Notas (Opcional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                rows="3"
                placeholder="Agregar notas adicionales..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Procesando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <PaperClipIcon className="h-5 w-5" />
                  <span>Adjuntar Comprobante</span>
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default AttachReceipt;