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


import api from "../../utils/axios";
import Swal from "sweetalert2";
import { PAYMENT_METHODS_GROUPED, INCOME_TYPES, EXPENSE_TYPES } from "../../utils/paymentConstants";

// 🚫 EXCLUIR solo "Factura Pago Inicial Budget" - se maneja en UploadInitialPay.jsx
// ✅ "Factura Pago Final Budget" SÍ se maneja aquí (tiene lógica de pagos parciales)
const incomeTypes = INCOME_TYPES.filter(type => 
  type !== 'Factura Pago Inicial Budget'
);
const expenseTypes = EXPENSE_TYPES;

// Tipos que NO requieren Work (son gastos/ingresos generales)
const generalExpenseTypes = [
  // "Workers", // ❌ Removido del sistema
  "Gastos Generales",
  // "Comisión Vendedor", // ❌ Removido - Las comisiones se pagan desde CommissionsManager.jsx
  "Gasto Fijo", // 🆕 Los gastos fijos son siempre generales
  // "Comprobante Gasto" // ❌ Removido del sistema
];

const generalIncomeTypes = [
  "Comprobante Ingreso" // Puede ser general o específico
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
  const [isGeneralTransaction, setIsGeneralTransaction] = useState(false); // Nuevo estado para marcar si es transacción general
  const [paymentMethod, setPaymentMethod] = useState(''); // 🆕 Método de pago
  const [paymentDetails, setPaymentDetails] = useState(''); // 🆕 Detalles adicionales del pago
  const [fixedExpenses, setFixedExpenses] = useState([]); // 🆕 Lista de gastos fijos
  const [selectedFixedExpense, setSelectedFixedExpense] = useState(''); // 🆕 Gasto fijo seleccionado
  const [loadingFixedExpenses, setLoadingFixedExpenses] = useState(false); // 🆕 Loading para gastos fijos
  const [fixedExpensePaymentAmount, setFixedExpensePaymentAmount] = useState(''); // 🆕 Monto del pago parcial para gasto fijo



  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  // 🆕 Cargar gastos fijos cuando se selecciona "Gasto Fijo"
  useEffect(() => {
    const loadFixedExpenses = async () => {
      if (type === 'Gasto Fijo') {
        setLoadingFixedExpenses(true);
        try {
          const response = await api.get('/fixed-expenses');
          console.log('📋 Respuesta de gastos fijos:', response.data);
          
          // El endpoint devuelve { fixedExpenses: [...], stats: {...} }
          const allExpenses = response.data.fixedExpenses || response.data || [];
          
          // Filtrar solo gastos activos y no pagados completamente
          const activeExpenses = Array.isArray(allExpenses) 
            ? allExpenses.filter(expense => 
                expense.isActive && 
                expense.paymentStatus !== 'paid' && 
                expense.paymentStatus !== 'paid_via_invoice'
              )
            : [];
          
          console.log('✅ Gastos fijos activos y pendientes:', activeExpenses.length);
          setFixedExpenses(activeExpenses);
        } catch (error) {
          console.error('❌ Error cargando gastos fijos:', error);
          toast.error('Error al cargar gastos fijos');
          setFixedExpenses([]);
        } finally {
          setLoadingFixedExpenses(false);
        }
      } else {
        setFixedExpenses([]);
        setSelectedFixedExpense('');
      }
    };

    loadFixedExpenses();
  }, [type]);

  // 🆕 Auto-marcar como transacción general cuando se selecciona "Gasto Fijo"
  useEffect(() => {
    if (type === 'Gasto Fijo') {
      setIsGeneralTransaction(true);
      setSelectedWork(""); // Limpiar selección de obra
    }
  }, [type]);

  // 🆕 Limpiar selección de obra cuando cambie el tipo de comprobante
  useEffect(() => {
    if (type === "Factura Pago Final Budget") {
      // Si la obra actual no está en la lista filtrada, limpiar la selección
      const filtered = works?.filter(work => {
        if (!work.finalInvoice || !work.finalInvoice.id) return false;
        const validStatuses = ['pending', 'partially_paid', 'send', 'sent'];
        if (!validStatuses.includes(work.finalInvoice.status)) return false;
        const totalDue = parseFloat(work.finalInvoice.finalAmountDue || 0);
        const totalPaid = parseFloat(work.finalInvoice.totalAmountPaid || 0);
        return (totalDue - totalPaid) > 0;
      }) || [];

      const isSelectedWorkValid = filtered.some(w => w.idWork === selectedWork);
      if (!isSelectedWorkValid) {
        setSelectedWork("");
      }
    }
  }, [type, works, selectedWork]);

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

    // Determinar si el tipo seleccionado permite transacciones generales
    const canBeGeneral = generalExpenseTypes.includes(type) || generalIncomeTypes.includes(type);

    // Validaciones básicas
    if (!canBeGeneral && !isGeneralTransaction && !selectedWork) {
      toast.error("Por favor, selecciona una obra o marca como transacción general.");
      return;
    }

    if (!type) {
      toast.error("Por favor, selecciona el tipo de comprobante.");
      return;
    }

    // 🆕 Validación de método de pago - OBLIGATORIO
    if (!paymentMethod) {
      toast.error("⚠️ Por favor, selecciona un método de pago. Este campo es obligatorio para el control financiero.");
      return;
    }

    // Validación de archivo
    console.log('🔍 Verificando archivo adjunto:', { hasFile: !!file, fileName: file?.name, fileSize: file?.size });
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
          toast.error("❌ La Factura Final para esta obra ya está completamente pagada. No se pueden agregar más pagos.");
          return;
        }

        // ✅ VALIDAR SI EL FINAL INVOICE ESTÁ CANCELADO
        if (finalInvoiceDetails.status === 'cancelled') {
          toast.error("❌ Esta Factura Final está cancelada. No se pueden registrar pagos.");
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

        // ✅ Permitir umbral de $0.05 para evitar validaciones estrictas con centavos
        if (numericAmountPaid > currentRemainingBalance + 0.05) {
          toast.error(`El monto pagado ($${numericAmountPaid.toFixed(2)}) no puede exceder el saldo pendiente ($${currentRemainingBalance.toFixed(2)}).`);
          return;
        }

        formData.append("relatedModel", "FinalInvoice");
        formData.append("relatedId", finalInvoiceDetails.id.toString());
        formData.append("amountPaid", numericAmountPaid.toString());
        formData.append("workId", selectedWork);
        if (paymentMethod) {
          formData.append("paymentMethod", paymentMethod); // ✅ Agregar método de pago
        }
        if (paymentDetails) {
          formData.append("paymentDetails", paymentDetails); // 🆕 Agregar detalles del pago
        }

        console.log('Enviando FormData para Receipt (Pago Final Factura):', Object.fromEntries(formData));
        await dispatch(createReceipt(formData));

        // Mensaje específico según el contexto
        if (workDetails?.status === 'paymentReceived') {
          toast.success("Comprobante de Pago Final registrado. El trabajo ya estaba marcado como pago recibido.");
        } else {
          toast.success("Comprobante de Pago Final adjuntado y procesado correctamente.");
        }

      } else {
        // Lógica para otros tipos (Income/Expense + Receipt)
        
        // 🆕 MANEJO ESPECIAL PARA GASTO FIJO
        if (type === 'Gasto Fijo') {
          if (!selectedFixedExpense) {
            toast.error("Por favor, selecciona un gasto fijo para pagar.");
            return;
          }

          if (!fixedExpensePaymentAmount || parseFloat(fixedExpensePaymentAmount) <= 0) {
            toast.error("Por favor, ingresa un monto válido a pagar.");
            return;
          }

          // Obtener detalles del gasto fijo seleccionado
          const fixedExpense = fixedExpenses.find(fe => fe.idFixedExpense === selectedFixedExpense);
          if (!fixedExpense) {
            toast.error("Gasto fijo no encontrado.");
            return;
          }

          // 🆕 Definir fecha actual
          const now = new Date();

          // 🆕 Calcular monto restante (lo que realmente se debe) con redondeo a 2 decimales
          const totalAmount = Math.round(parseFloat(fixedExpense.totalAmount || 0) * 100) / 100;
          const paidAmount = Math.round(parseFloat(fixedExpense.paidAmount || 0) * 100) / 100;
          const remainingAmount = Math.round((totalAmount - paidAmount) * 100) / 100;
          const paymentAmount = Math.round(parseFloat(fixedExpensePaymentAmount) * 100) / 100;

          // 🆕 Validaciones
          if (remainingAmount <= 0) {
            toast.error("Este gasto fijo ya está completamente pagado.");
            return;
          }

          if (paymentAmount > remainingAmount + 0.01) {
            toast.error(`El monto a pagar ($${paymentAmount.toFixed(2)}) no puede exceder el saldo restante ($${remainingAmount.toFixed(2)})`);
            return;
          }

          // Determinar si es pago total o parcial (con tolerancia de 1 centavo)
          const isFullPayment = Math.abs(paymentAmount - remainingAmount) <= 0.01;
          const newPaidAmount = Math.round((paidAmount + paymentAmount) * 100) / 100;
          const newStatus = isFullPayment ? 'paid' : 'partial';

          // Crear el expense vinculado al gasto fijo
          const expenseData = {
            date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
            amount: paymentAmount, // 🔄 Usar el monto ingresado por el usuario
            notes: `${isFullPayment ? 'Pago final' : 'Pago parcial'} de gasto fijo: ${fixedExpense.description || fixedExpense.name} (${fixedExpense.category})${notes ? ` - ${notes}` : ''} - Total: $${totalAmount.toFixed(2)}, Ya pagado: $${paidAmount.toFixed(2)}, Este pago: $${paymentAmount.toFixed(2)}${isFullPayment ? '' : `, Restante: $${(remainingAmount - paymentAmount).toFixed(2)}`}`,
            staffId: staff?.id,
            typeExpense: 'Gasto Fijo',
            fixedExpenseId: fixedExpense.idFixedExpense, // 🔗 Vincular con el gasto fijo (campo correcto)
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(paymentDetails ? { paymentDetails } : {}),
          };

          console.log('📋 Creando expense para Gasto Fijo:', expenseData);
          console.log(`💰 Tipo de pago: ${isFullPayment ? 'COMPLETO' : 'PARCIAL'} - Nuevo estado: ${newStatus}`);

          try {
            const createdExpense = await expenseActions.create(expenseData);
            if (!createdExpense || !createdExpense.idExpense) {
              throw new Error("No se pudo crear el gasto.");
            }

            console.log('✅ Expense creado con ID:', createdExpense.idExpense);

            // Adjuntar comprobante
            formData.append("relatedModel", "Expense");
            formData.append("relatedId", createdExpense.idExpense.toString());
            
            console.log('📎 Adjuntando comprobante al gasto fijo. FormData tiene file?', file ? 'SI' : 'NO');
            const receiptResponse = await dispatch(createReceipt(formData));
            
            console.log('📄 Receipt response:', receiptResponse);
            
            // Verificar que el receipt se creó correctamente
            // Redux puede retornar undefined si la acción no está configurada para retornar payload
            if (receiptResponse?.error) {
              console.error('❌ Error en la respuesta del receipt:', receiptResponse.error);
              throw new Error("Error al adjuntar el comprobante: " + receiptResponse.error.message);
            }

            console.log('✅ Comprobante adjuntado correctamente');

            // 🆕 ACTUALIZAR EL GASTO FIJO PRIMERO (crítico)
            console.log(`✅ Actualizando gasto fijo - Estado: ${newStatus}, Nuevo monto pagado: $${newPaidAmount.toFixed(2)}`);
            
            const updateData = {
              paymentStatus: newStatus,
              paidAmount: newPaidAmount
            };

            // Si es pago completo, agregar fecha de pago
            if (isFullPayment) {
              updateData.paidDate = new Date().toISOString().split('T')[0];
            }

            await api.patch(`/fixed-expenses/${fixedExpense.idFixedExpense}`, updateData);
            console.log('✅ Gasto fijo actualizado correctamente');

            // 🆕 CREAR REGISTRO EN HISTORIAL DE PAGOS (FixedExpensePayment) - opcional
            console.log('📝 Creando registro en historial de pagos...');
            try {
              const paymentRecord = {
                fixedExpenseId: fixedExpense.idFixedExpense,
                amount: paymentAmount,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: paymentMethod || null,
                notes: notes || `${isFullPayment ? 'Pago final' : 'Pago parcial'} - ${fixedExpense.description || fixedExpense.name}`,
                expenseId: createdExpense.idExpense, // 🔑 Enviar el ID del expense ya creado
                createdByStaffId: staff?.id,
                skipExpenseCreation: true, // 🆕 Flag para que el backend NO cree otro Expense
                // Nota: No enviamos receiptUrl porque ya está vinculado al Expense en la BD
                // El backend puede buscar el receipt por expenseId si lo necesita
              };

              console.log('💾 Datos del registro de pago:', paymentRecord);
              await api.post(`/fixed-expenses/${fixedExpense.idFixedExpense}/payments`, paymentRecord);
              console.log('✅ Registro de pago creado en historial');
            } catch (paymentError) {
              console.error('⚠️ Error creando registro de pago (no crítico):', paymentError);
              // No fallar toda la operación si solo falla el historial
              toast.warning('El pago se registró pero hubo un problema con el historial. El gasto fijo fue actualizado correctamente.');
            }

            // Mensajes de éxito
            if (isFullPayment) {
              toast.success(`✅ Gasto fijo pagado completamente: ${fixedExpense.description || fixedExpense.name} - $${paymentAmount.toFixed(2)}`);
            } else {
              toast.success(`📝 Pago parcial registrado: $${paymentAmount.toFixed(2)}. Saldo restante: $${(remainingAmount - paymentAmount).toFixed(2)}`);
            }
          } catch (error) {
            console.error('❌ Error procesando gasto fijo:', error);
            throw error; // Re-lanzar para que se capture en el catch principal
          }

        } else {
          // Lógica original para otros tipos de gastos/ingresos
          if (!generalAmount || isNaN(parseFloat(generalAmount)) || parseFloat(generalAmount) <= 0) {
            toast.error("Por favor, ingrese un monto válido para el ingreso/gasto.");
            return;
          }

          let createdRecordId = null;
          let createdRecord;
          const isIncome = incomeTypes.includes(type);
          
          // Generar fecha local en formato YYYY-MM-DD
          const now = new Date();
          const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          const incomeExpenseData = {
            date: localDate,
            amount: parseFloat(generalAmount),
            notes,
            // Solo incluir workId si no es transacción general
            ...(isGeneralTransaction ? {} : { workId: selectedWork }),
            staffId: staff?.id,
            ...(isIncome ? { typeIncome: type } : { typeExpense: type }),
            // 🆕 Agregar método de pago si se especificó
            ...(paymentMethod ? { paymentMethod } : {}),
            // 🆕 Agregar detalles del pago si se especificó
            ...(paymentDetails ? { paymentDetails } : {}),
          };

          console.log('💰 Datos a enviar (Income/Expense):', incomeExpenseData);

          try {
            if (isIncome) {
              createdRecord = await incomeActions.create(incomeExpenseData);
              if (!createdRecord || !createdRecord.idIncome) {
                throw new Error("No se pudo obtener el ID del ingreso creado.");
              }
              createdRecordId = createdRecord.idIncome;
              console.log('✅ Ingreso creado con ID:', createdRecordId);
              toast.success("Ingreso registrado correctamente.");
            } else {
              createdRecord = await expenseActions.create(incomeExpenseData);
              if (!createdRecord || !createdRecord.idExpense) {
                throw new Error("No se pudo obtener el ID del gasto creado.");
              }
              createdRecordId = createdRecord.idExpense;
              console.log('✅ Gasto creado con ID:', createdRecordId);
              toast.success("Gasto registrado correctamente.");
            }

            if (createdRecordId) {
              formData.append("relatedModel", isIncome ? "Income" : "Expense");
              formData.append("relatedId", createdRecordId.toString());

              console.log('📎 Adjuntando comprobante...');
              await dispatch(createReceipt(formData));
              toast.success("Comprobante adjuntado correctamente.");
            }
          } catch (error) {
            console.error('❌ Error en Income/Expense:', error);
            throw error; // Re-lanzar para manejo unificado
          }
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
      setIsGeneralTransaction(false);
      setPaymentMethod(""); // 🆕 Limpiar método de pago
      setPaymentDetails(""); // 🆕 Limpiar detalles del pago
      setSelectedFixedExpense(""); // 🆕 Limpiar gasto fijo seleccionado
      setFixedExpensePaymentAmount(""); // 🆕 Limpiar monto de pago de gasto fijo

    } catch (err) {
      console.error("❌❌❌ Error completo en handleSubmit:", err);
      
      // Mensaje de error más específico según el tipo de error
      let errorMessage = "Error al procesar la transacción.";
      
      if (err.response) {
        // Error de respuesta del servidor
        const status = err.response.status;
        const data = err.response.data;
        
        console.error('❌ Error del servidor:', {
          status,
          data,
          url: err.config?.url,
          method: err.config?.method
        });

        if (status === 400) {
          errorMessage = data.message || "Datos inválidos. Verifica todos los campos.";
        } else if (status === 401) {
          errorMessage = "Sesión expirada. Por favor, inicia sesión nuevamente.";
        } else if (status === 403) {
          errorMessage = "No tienes permisos para realizar esta operación.";
        } else if (status === 404) {
          errorMessage = data.message || "Recurso no encontrado.";
        } else if (status === 500) {
          errorMessage = "Error del servidor. Por favor, contacta al administrador.";
        } else {
          errorMessage = data.message || `Error del servidor (${status})`;
        }
      } else if (err.request) {
        // La solicitud se hizo pero no hubo respuesta
        console.error('❌ No hay respuesta del servidor:', err.request);
        errorMessage = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
      } else if (err.message) {
        // Error durante la configuración de la solicitud
        errorMessage = err.message;
      } else if (err.payload?.message) {
        // Error de Redux action
        errorMessage = err.payload.message;
      }

      toast.error(`❌ ${errorMessage}`);
      
      // Log adicional para debugging
      if (err.stack) {
        console.error('Stack trace:', err.stack);
      }
    }
  };

  const currentWorkDetails = works && selectedWork ? works.find(w => w.idWork === selectedWork) : null;
  const calculatedRemainingBalance = finalInvoiceDetails
    ? (parseFloat(finalInvoiceDetails.finalAmountDue || 0) - parseFloat(finalInvoiceDetails.totalAmountPaid || 0)).toFixed(2)
    : "0.00";
  
  // Determinar si el tipo actual permite ser general
  const canBeGeneral = generalExpenseTypes.includes(type) || generalIncomeTypes.includes(type);
  const requiresWork = type === "Factura Pago Final Budget"; // Los pagos de factura final SIEMPRE requieren work

  // 🆕 FILTRAR OBRAS SEGÚN EL TIPO DE COMPROBANTE SELECCIONADO
  const filteredWorksForDropdown = () => {
    if (!works || works.length === 0) return [];

    // Si seleccionó "Factura Pago Final Budget", mostrar SOLO obras con Final Invoice válido
    if (type === "Factura Pago Final Budget") {
      return works.filter(work => {
        // Debe tener finalInvoice
        if (!work.finalInvoice || !work.finalInvoice.id) return false;
        
        // El invoice NO debe estar cancelado ni completamente pagado
        const validStatuses = ['pending', 'partially_paid', 'send', 'sent'];
        if (!validStatuses.includes(work.finalInvoice.status)) return false;
        
        // Verificar que aún tenga saldo pendiente
        const totalDue = parseFloat(work.finalInvoice.finalAmountDue || 0);
        const totalPaid = parseFloat(work.finalInvoice.totalAmountPaid || 0);
        const remainingBalance = totalDue - totalPaid;
        
        return remainingBalance > 0;
      });
    }

    // Para otros tipos de comprobantes, mostrar todas las obras
    return works;
  };

  const availableWorks = filteredWorksForDropdown();


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
            
            {/* Receipt Type Selection - Moved to top */}
            <div>
              <label htmlFor="type" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                Tipo de Comprobante
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  // Reset general transaction when type changes
                  setIsGeneralTransaction(false);
                }}
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

            {/* General Transaction Toggle - Only show for applicable types (excepto Gasto Fijo que es siempre general) */}
            {type && canBeGeneral && !requiresWork && type !== 'Gasto Fijo' && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGeneralTransaction}
                    onChange={(e) => {
                      setIsGeneralTransaction(e.target.checked);
                      if (e.target.checked) {
                        setSelectedWork(""); // Clear work selection if marking as general
                      }
                    }}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    💼 Este es un gasto/ingreso general (no asociado a una obra específica)
                  </span>
                </label>
                <p className="ml-8 mt-1 text-xs text-gray-500">
                  Marca esta opción para gastos como pagos de workers generales, comisiones, o gastos administrativos que no corresponden a una obra en particular.
                </p>
              </div>
            )}

            {/* 🆕 SELECTOR DE GASTO FIJO */}
            {type === 'Gasto Fijo' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                  <h5 className="font-semibold text-orange-800">
                    📋 Seleccionar Gasto Fijo a Pagar
                  </h5>
                </div>

                {loadingFixedExpenses && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    <span className="ml-3 text-sm text-gray-600">Cargando gastos fijos...</span>
                  </div>
                )}

                {!loadingFixedExpenses && fixedExpenses.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <InformationCircleIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          No hay gastos fijos pendientes
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Todos los gastos fijos están pagados o no hay gastos configurados.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!loadingFixedExpenses && fixedExpenses.length > 0 && (
                  <>
                    <label htmlFor="fixedExpense" className="block text-sm font-medium text-gray-700 mb-2">
                      Selecciona el gasto fijo que deseas pagar: <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="fixedExpense"
                      value={selectedFixedExpense}
                      onChange={(e) => setSelectedFixedExpense(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white"
                      required
                    >
                      <option value="">Seleccionar gasto fijo...</option>
                      {fixedExpenses.map((fe) => {
                        const dueDate = new Date(fe.nextDueDate);
                        const isOverdue = dueDate < new Date();
                        const formattedDate = dueDate.toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        });
                        
                        // 🆕 Calcular monto restante (lo que realmente se debe) con redondeo
                        const totalAmount = Math.round(parseFloat(fe.totalAmount || 0) * 100) / 100;
                        const paidAmount = Math.round(parseFloat(fe.paidAmount || 0) * 100) / 100;
                        const remainingAmount = Math.round((totalAmount - paidAmount) * 100) / 100;

                        return (
                          <option key={fe.idFixedExpense} value={fe.idFixedExpense}>
                            {fe.description || fe.name} - ${remainingAmount.toFixed(2)} 
                            {paidAmount > 0 ? ` (Pagado: $${paidAmount.toFixed(2)} de $${totalAmount.toFixed(2)})` : ''} - 
                            {fe.category} - Vence: {formattedDate} 
                            {isOverdue ? ' ⚠️ VENCIDO' : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Detalles del gasto fijo seleccionado */}
                    {selectedFixedExpense && fixedExpenses.find(fe => fe.idFixedExpense === selectedFixedExpense) && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200">
                        {(() => {
                          const selected = fixedExpenses.find(fe => fe.idFixedExpense === selectedFixedExpense);
                          const dueDate = new Date(selected.nextDueDate);
                          const isOverdue = dueDate < new Date();
                          
                          // 🆕 Calcular montos con redondeo
                          const totalAmount = Math.round(parseFloat(selected.totalAmount || 0) * 100) / 100;
                          const paidAmount = Math.round(parseFloat(selected.paidAmount || 0) * 100) / 100;
                          const remainingAmount = Math.round((totalAmount - paidAmount) * 100) / 100;
                          const hasPartialPayment = paidAmount > 0;
                          
                          return (
                            <>
                              <h6 className="font-semibold text-gray-800 mb-3">Detalles del Gasto:</h6>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600 font-medium">Descripción:</p>
                                  <p className="text-gray-800">{selected.description || selected.name}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Categoría:</p>
                                  <p className="text-gray-800">{selected.category}</p>
                                </div>
                                
                                {/* 🆕 Mostrar monto total y pagos parciales */}
                                <div className="col-span-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                      <p className="text-xs text-gray-600 font-medium mb-1">Monto Total</p>
                                      <p className="text-gray-800 font-semibold">${totalAmount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-600 font-medium mb-1">Ya Pagado</p>
                                      <p className={`font-semibold ${hasPartialPayment ? 'text-green-600' : 'text-gray-400'}`}>
                                        ${paidAmount.toFixed(2)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-600 font-medium mb-1">🎯 Restante</p>
                                      <p className="text-orange-600 font-bold text-lg">${remainingAmount.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  
                                  {hasPartialPayment && (
                                    <div className="mt-2 pt-2 border-t border-blue-300">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">Progreso de pago:</span>
                                        <span className="font-semibold text-blue-700">
                                          {((paidAmount / totalAmount) * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-blue-500 h-2 rounded-full transition-all"
                                          style={{ width: `${(paidAmount / totalAmount) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <p className="text-gray-600 font-medium">Fecha de Vencimiento:</p>
                                  <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                                    {dueDate.toLocaleDateString('es-ES', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                    {isOverdue && ' ⚠️ VENCIDO'}
                                  </p>
                                </div>
                                {selected.vendor && (
                                  <div>
                                    <p className="text-gray-600 font-medium">Proveedor:</p>
                                    <p className="text-gray-800">{selected.vendor}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-gray-600 font-medium">Frecuencia:</p>
                                  <p className="text-gray-800 capitalize">{selected.frequency || 'Mensual'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Método de Pago:</p>
                                  <p className="text-gray-800">{selected.paymentMethod}</p>
                                </div>
                              </div>
                              
                              {selected.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-gray-600 font-medium text-xs mb-1">Notas:</p>
                                  <p className="text-gray-700 text-sm italic">{selected.notes}</p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* 🆕 Campo de monto para pago parcial/total */}
                    {selectedFixedExpense && (
                      <div className="mt-4">
                        <label htmlFor="fixedExpensePaymentAmount" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                          <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-500" />
                          Monto a Pagar <span className="ml-1 text-red-500">*</span>
                        </label>
                        {(() => {
                          const selected = fixedExpenses.find(fe => fe.idFixedExpense === selectedFixedExpense);
                          if (!selected) return null;
                          
                          const totalAmount = Math.round(parseFloat(selected.totalAmount || 0) * 100) / 100;
                          const paidAmount = Math.round(parseFloat(selected.paidAmount || 0) * 100) / 100;
                          const remainingAmount = Math.round((totalAmount - paidAmount) * 100) / 100;
                          
                          return (
                            <>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  id="fixedExpensePaymentAmount"
                                  value={fixedExpensePaymentAmount}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setFixedExpensePaymentAmount(value);
                                    
                                    // Validación en tiempo real con tolerancia de 1 centavo
                                    if (value && parseFloat(value) > remainingAmount + 0.01) {
                                      e.target.setCustomValidity(`El monto no puede exceder el saldo restante ($${remainingAmount.toFixed(2)})`);
                                    } else if (value && parseFloat(value) <= 0) {
                                      e.target.setCustomValidity('El monto debe ser mayor a cero');
                                    } else {
                                      e.target.setCustomValidity('');
                                    }
                                  }}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                  placeholder={`Ingrese monto (máx: $${remainingAmount.toFixed(2)})`}
                                  min="0.01"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setFixedExpensePaymentAmount(remainingAmount.toFixed(2))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition-colors"
                                >
                                  Pagar Todo
                                </button>
                              </div>
                              
                              {/* Indicador visual del monto */}
                              {fixedExpensePaymentAmount && parseFloat(fixedExpensePaymentAmount) > 0 && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">
                                      {Math.abs(parseFloat(fixedExpensePaymentAmount) - remainingAmount) <= 0.01
                                        ? '✅ Pago Total - Se marcará como pagado completamente'
                                        : '📝 Pago Parcial - Quedará pendiente de pago'}
                                    </span>
                                    <span className="font-bold text-orange-600">
                                      ${parseFloat(fixedExpensePaymentAmount).toFixed(2)}
                                    </span>
                                  </div>
                                  
                                  {Math.abs(parseFloat(fixedExpensePaymentAmount) - remainingAmount) > 0.01 && (
                                    <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-gray-600">
                                      Saldo restante después de este pago: 
                                      <span className="font-semibold text-orange-600 ml-1">
                                        ${(remainingAmount - parseFloat(fixedExpensePaymentAmount)).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Work Selection - Only show if not general transaction and type is selected */}
            {type && !isGeneralTransaction && (
              <div>
                <label htmlFor="work" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <BuildingOffice2Icon className="h-5 w-5 mr-2 text-blue-500" />
                  Seleccionar Obra {requiresWork && <span className="ml-1 text-red-500">*</span>}
                </label>

                {/* 🆕 Mensaje informativo para Factura Final */}
                {type === "Factura Pago Final Budget" && availableWorks.length === 0 && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <InformationCircleIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          No hay obras disponibles para pago final
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Solo se muestran obras con Factura Final generada y saldo pendiente de pago.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🆕 Mensaje informativo general */}
                {type === "Factura Pago Final Budget" && availableWorks.length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        <strong>📋 {availableWorks.length}</strong> obra(s) con Factura Final pendiente de pago
                      </p>
                    </div>
                  </div>
                )}

                <select
                  id="work"
                  value={selectedWork}
                  onChange={(e) => setSelectedWork(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  required={requiresWork}
                  disabled={type === "Factura Pago Final Budget" && availableWorks.length === 0}
                >
                  <option value="">
                    {type === "Factura Pago Final Budget" 
                      ? "Seleccione una obra con factura final pendiente"
                      : "Seleccione una obra"}
                  </option>
                  {availableWorks && availableWorks.map((work) => {
                    // Para Factura Final, mostrar info del saldo pendiente
                    if (type === "Factura Pago Final Budget" && work.finalInvoice) {
                      const totalDue = parseFloat(work.finalInvoice.finalAmountDue || 0);
                      const totalPaid = parseFloat(work.finalInvoice.totalAmountPaid || 0);
                      const remainingBalance = (totalDue - totalPaid).toFixed(2);
                      
                      return (
                        <option key={work.idWork} value={work.idWork}>
                          {work.propertyAddress} - Pendiente: ${remainingBalance}
                        </option>
                      );
                    }

                    // Para otros tipos, mostrar normalmente
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
            )}

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

                {/* Alert for Cancelled Final Invoice */}
                {type === "Factura Pago Final Budget" && currentWorkDetails.finalInvoice?.status === 'cancelled' && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <InformationCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-red-800 text-sm">
                          ❌ Factura Final Cancelada
                        </p>
                        <p className="text-red-700 text-xs mt-1">
                          Esta Factura Final está cancelada y no puede recibir pagos.
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

            {/* General Amount Input - Ocultar para Gasto Fijo ya que el monto viene del gasto seleccionado */}
            {type && type !== "Factura Pago Final Budget" && type !== "Gasto Fijo" && (
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

            {/* Payment Method - OBLIGATORIO */}
            {type && (
              <div>
                <label htmlFor="paymentMethod" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-500" />
                  Método de Pago <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Seleccionar método de pago...</option>
                  <optgroup label="🏦 Cuentas Bancarias">
                    {PAYMENT_METHODS_GROUPED.bank.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="💳 Tarjetas">
                    {PAYMENT_METHODS_GROUPED.card.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="💰 Otros Métodos">
                    {PAYMENT_METHODS_GROUPED.other.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Especifica la cuenta o método con el que se recibió/pagó el dinero
                </p>
              </div>
            )}

            {/* Payment Details - Campo adicional para detalles */}
            {paymentMethod && (
              <div>
                <label htmlFor="paymentDetails" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Detalles del Pago (Opcional)
                </label>
                <input
                  id="paymentDetails"
                  type="text"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={
                    paymentMethod === 'Cheque' ? 'Ej: Check #1234' :
                    paymentMethod.includes('Card') || paymentMethod.includes('Débito') ? 'Ej: Últimos 4 dígitos: 5678' :
                    paymentMethod === 'Transferencia Bancaria' ? 'Ej: Ref #ABC123' :
                    'Detalles adicionales...'
                  }
                />
              </div>
            )}

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
              disabled={loading || (type === "Factura Pago Final Budget" && ['paid', 'cancelled'].includes(finalInvoiceDetails?.status))}
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
                  <span>
                    {type === "Factura Pago Final Budget" && finalInvoiceDetails?.status === 'paid' 
                      ? 'Factura completamente pagada' 
                      : type === "Factura Pago Final Budget" && finalInvoiceDetails?.status === 'cancelled'
                      ? 'Factura cancelada - No se permiten pagos'
                      : 'Adjuntar Comprobante'
                    }
                  </span>
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