import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById } from "../../Redux/Actions/workActions";
import { balanceActions } from "../../Redux/Actions/balanceActions";
import { fetchIncomesAndExpensesRequest, fetchIncomesAndExpensesSuccess, fetchIncomesAndExpensesFailure } from "../../Redux/Reducer/balanceReducer"; // Ajusta esta ruta si es necesario
import { useParams } from "react-router-dom";
import api from "../../utils/axios";

const WorkDetail = () => {
  const { idWork } = useParams();
  const dispatch = useDispatch();
console.log("ID de la obra:", idWork); // Para depuración
  const { selectedWork: work, loading, error } = useSelector((state) => state.work);
console.log("Datos de la obra:", work); // Para depuración
  const [selectedImage, setSelectedImage] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [openSections, setOpenSections] = useState({}); // Cambiado a un objeto para manejar múltiples secciones

  const {
    incomes,
    expenses,
    loading: balanceLoading, // Renombrado para evitar conflicto
    error: balanceError      // Renombrado para evitar conflicto
  } = useSelector((state) => state.balance);

  useEffect(() => {
    dispatch(fetchWorkById(idWork));

  }, [dispatch, idWork]);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        if (work?.budget?.paymentInvoice) {
          const response = await fetch(work.budget.paymentInvoice);
          if (!response.ok) {
            throw new Error("No se pudo descargar el archivo");
          }
          const blob = await response.blob();
          setFileBlob(URL.createObjectURL(blob));
        }
      } catch (error) {
        console.error("Error al descargar el archivo:", error);
      }
    };

    fetchFile();
  }, [work?.budget?.paymentInvoice]);

  useEffect(() => {
    const fetchBalanceData = async () => {
      if (!idWork) return; // Asegurarse de que idWork exista

      dispatch(fetchIncomesAndExpensesRequest()); // Inicia la carga
      try {
        // Pasar idWork a la acción
        const data = await balanceActions.getIncomesAndExpensesByWorkId(idWork);
        if (data.error) {
          console.error("Error fetching incomes/expenses:", data.message);
          dispatch(fetchIncomesAndExpensesFailure(data.message));
        } else {
          console.log("Incomes/Expenses data received:", data);
          // El payload debe ser { incomes: [...], expenses: [...] } según el reducer
          dispatch(fetchIncomesAndExpensesSuccess(data));
        }
      } catch (err) {
        console.error("Unexpected error fetching incomes/expenses:", err);
        dispatch(fetchIncomesAndExpensesFailure(err.message));
      }
    };

    fetchBalanceData();
    // Dependencia: dispatch y idWork
  }, [dispatch, idWork]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          {/* Spinner circular */}
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          {/* Texto opcional */}
          <p className="text-xl font-semibold mt-4">Cargando detalles de la obra...</p>
        </div>
      </div>
    );
  } // probando spiner
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold text-red-500">Error: {error}</p>
      </div>
    );
  }
  
  if (!work) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold">No se encontró la obra.</p>
      </div>
    );
  }

  const groupedImages = work.images.reduce((acc, image) => {
    if (!acc[image.stage]) acc[image.stage] = [];
    acc[image.stage].push(image);
    return acc;
  }, {});

  const pdfUrl = work.Permit?.pdfData  //optionalDocs
    ? URL.createObjectURL(new Blob([new Uint8Array(work.Permit.pdfData.data)], { type: "application/pdf" }))
    : null;

    const optionalDocs = work.Permit?.optionalDocs  //optionalDocs
    ? URL.createObjectURL(new Blob([new Uint8Array(work.Permit.optionalDocs.data)], { type: "application/pdf" }))
    : null;

  const validMaterialSet = work.MaterialSets?.find((set) => set.invoiceFile !== null);
  const invoiceUrl = validMaterialSet
    ? `${api.defaults.baseURL}uploads/${validMaterialSet.invoiceFile}`
    : null;

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {/* Título principal con dirección y estado */}
      <div className="bg-blue-500 text-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-semibold uppercase">{work.propertyAddress}</h1>
        <p className="text-xl text-slate-800 p-1 uppercase mt-2">
          <strong>Status:</strong> {work.status}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Tarjetas desplegables */}
        <div className="space-y-6">
          {/* Tarjeta: Información principal */}
          <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-blue-500">
            <h2
              className="text-xl font-semibold mb-4 cursor-pointer"
              onClick={() => toggleSection("info")}
            >
              Información Principal
            </h2>
            {openSections.info && (
              <>
                <p>
                  <strong>Aplicante:</strong> {work.Permit?.applicantName || "No disponible"}
                </p>
                <p>
                  <strong>Permit N°:</strong> {work.Permit?.idPermit || "No disponible"}
                </p>
                {pdfUrl && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold">Permit</h3>
                    <iframe
                      src={pdfUrl}
                      width="100%"
                      height="250px"
                      title="Vista previa del PDF"
                      className="rounded"
                    ></iframe>
                  </div>
                )}
                 {optionalDocs && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold">Optional Docs</h3>
                    <iframe
                      src={optionalDocs}
                      width="100%"
                      height="250px"
                      title="Vista previa del PDF"
                      className="rounded"
                    ></iframe>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tarjeta: Presupuesto */}
          {work.budget && (
            <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-blue-500">
              <h2
                className="text-xl font-semibold mb-4 cursor-pointer"
                onClick={() => toggleSection("budget")}
              >
                Presupuesto
              </h2>
              {openSections.budget && (
                <>
                  <p>
                    <strong>Precio Total:</strong> ${work.budget.price}
                  </p>
                  <p>
                    <strong>Pago Inicial:</strong> ${work.budget.initialPayment}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {work.budget.date}
                  </p>
                  <p>
                    <strong>Estado:</strong> {work.budget.status}
                  </p>
                </>
              )}
            </div>
          )}

          
{/* Tarjeta: Comprobantes */}
{work.Receipts && work.Receipts.length > 0 && (
  <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-yellow-500">
    <h2
      className="text-xl font-semibold mb-4 cursor-pointer"
      onClick={() => toggleSection("receipts")}
    >
      Comprobantes Adjuntados
    </h2>
    {openSections.receipts && (
      <ul className="space-y-4">
        {/* Mostrar los recibos existentes */}
        {work.Receipts.map((receipt) => (
          <li key={receipt.idReceipt} className="border p-4 rounded shadow">
            <p><strong>Tipo:</strong> {receipt.type}</p>
            <p><strong>Notas:</strong> {receipt.notes || "Sin notas"}</p>
            {receipt.pdfUrl ? (
              <iframe
                src={receipt.pdfUrl}
                width="100%"
                height="250px"
                title={`Vista previa de ${receipt.type}`}
                className="rounded"
              ></iframe>
            ) : (
              <p>No hay archivo adjunto.</p>
            )}
            {receipt.pdfUrl && (
              <a
                href={receipt.pdfUrl}
                download={`${receipt.type}.pdf`}
                className="text-blue-500 underline mt-2 block"
              >
                Descargar {receipt.type}
              </a>
            )}
          </li>
        ))}

        {/* Mostrar el paymentInvoice si existe */}
        {work.budget?.paymentInvoice && (
          <li className="border p-4 rounded shadow">
            <p><strong>Tipo:</strong> Comprobante de Pago</p>
            {work.budget.paymentInvoice.endsWith(".pdf") ? (
              <iframe
                src={work.budget.paymentInvoice}
                width="100%"
                height="250px"
                title="Vista previa del comprobante de pago"
                className="rounded"
              ></iframe>
            ) : (
              <img
                src={work.budget.paymentInvoice}
                alt="Comprobante de Pago"
                className="rounded w-full h-auto"
              />
            )}
            <a
              href={work.budget.paymentInvoice}
              download="Comprobante_de_Pago"
              className="text-blue-500 underline mt-2 block"
            >
              Descargar Comprobante de Pago
            </a>
          </li>
        )}
      </ul>
    )}
  </div>
)}

          {/* Tarjeta: Imágenes */}
          <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-yellow-500">
            <h2
              className="text-xl font-semibold mb-4 cursor-pointer"
              onClick={() => toggleSection("images")}
            >
              Imágenes de la Obra
            </h2>
            {openSections.images && (
              Object.entries(groupedImages).map(([stage, images]) => (
                <div key={stage} className="mb-6">
                  <h3 className="text-sm text-white bg-indigo-900 p-1 text-center uppercase font-semibold mb-2">{stage}</h3>
                  <div className="flex overflow-x-auto space-x-4">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className="flex-shrink-0 cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      >
                        <img
                          src={`data:image/jpeg;base64,${image.imageData}`}
                          alt={stage}
                          className="w-24 h-24 object-cover rounded-md shadow"
                        />
                        <p className="text-sm text-center mt-2">{image.dateTime}</p>
                        <p className="text-sm text-center mt-2">{image.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna derecha: Tarjetas de gastos e ingresos */}
        <div className="space-y-6">
          {/* Tarjeta: Gastos */}
          <div className="bg-red-100 shadow-md rounded-lg p-6 border-l-4 border-red-500">
            <h2
              className="text-xl font-bold mb-4 cursor-pointer flex justify-between items-center"
              onClick={() => toggleSection("expenses")}
            >
              Gastos
              <span className="text-red-700 font-semibold">
                {expenses && expenses.length > 0
                  ? `$${expenses.reduce((total, expense) => total + parseFloat(expense.amount || 0), 0).toFixed(2)}`
                  : "$0.00"}
              </span>
              <span>{openSections.expenses ? '▲' : '▼'}</span>
            </h2>
            {openSections.expenses && (
              <>
                {balanceLoading && <p>Cargando gastos...</p>}
                {balanceError && <p className="text-red-500">Error al cargar gastos: {balanceError}</p>}
                {!balanceLoading && !balanceError && (
                  // *** USAR 'expenses' del useSelector ***
                  expenses && expenses.length > 0 ? (
                    <ul className="space-y-3">
                      {expenses.map((expense) => (
                        <li key={expense.idExpense} className="border-b pb-3 last:border-b-0">
                          <p><strong>Tipo:</strong> {expense.typeExpense}</p>
                          <p><strong>Monto:</strong> ${parseFloat(expense.amount).toFixed(2)}</p>
                          <p><strong>Fecha:</strong> {new Date(expense.date).toLocaleDateString()}</p>
                          {expense.notes && <p><strong>Notas:</strong> {expense.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No hay gastos registrados para esta obra.</p>
                  )
                )}
              </>
            )}
          </div>

          {/* Tarjeta: Ingresos */}
          <div className="bg-green-100 shadow-md rounded-lg p-6 border-l-4 border-green-500">
            <h2
              className="text-xl font-bold mb-4 cursor-pointer flex justify-between items-center"
              onClick={() => toggleSection("incomes")}
            >
              Ingresos
              <span className="text-green-700 font-semibold">
                {incomes && incomes.length > 0
                  ? `$${incomes.reduce((total, income) => total + parseFloat(income.amount || 0), 0).toFixed(2)}`
                  : "$0.00"}
              </span>
              <span>{openSections.incomes ? '▲' : '▼'}</span>
            </h2>
            {openSections.incomes && (
              <>
                {balanceLoading && <p>Cargando ingresos...</p>}
                {balanceError && <p className="text-red-500">Error al cargar ingresos: {balanceError}</p>}
                {!balanceLoading && !balanceError && (
                  // *** USAR 'incomes' del useSelector ***
                  incomes && incomes.length > 0 ? (
                    <ul className="space-y-3">
                      {incomes.map((income) => (
                        <li key={income.idIncome} className="border-b pb-3 last:border-b-0">
                          <p><strong>Tipo:</strong> {income.typeIncome}</p>
                          <p><strong>Monto:</strong> ${parseFloat(income.amount).toFixed(2)}</p>
                          <p><strong>Fecha:</strong> {new Date(income.date).toLocaleDateString()}</p>
                          {income.notes && <p><strong>Notas:</strong> {income.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No hay ingresos registrados para esta obra.</p>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>


      {/* Modal para mostrar la imagen ampliada */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)} // Cerrar el modal al hacer clic fuera de la imagen
        >
          <div className="relative bg-white p-4 rounded shadow-lg">
            <img
              src={`data:image/jpeg;base64,${selectedImage.imageData}`}
              alt="Imagen ampliada"
              className="max-w-full max-h-screen rounded"
            />
            <p className="text-center mt-2">{selectedImage.dateTime}</p>
            <div className="flex justify-between mt-4">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={() => setSelectedImage(null)} // Cerrar el modal
              >
                Cerrar
              </button>
              <a
                href={`data:image/jpeg;base64,${selectedImage.imageData}`}
                download={`imagen_${selectedImage.id}.jpg`}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkDetail;