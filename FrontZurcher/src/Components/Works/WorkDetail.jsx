import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById } from "../../Redux/Actions/workActions";
import { useParams } from "react-router-dom";
import api from "../../utils/axios";

const WorkDetail = () => {
  const { idWork } = useParams();
  const dispatch = useDispatch();

  // Obtener el estado de la obra desde Redux
  const { selectedWork: work, loading, error } = useSelector((state) => state.work);


  // Estado para manejar el modal de la imagen
  const [selectedImage, setSelectedImage] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  // Cargar los detalles de la obra al montar el componente
  useEffect(() => {
    console.log("Cargando obra con ID:", idWork); // Verificar el ID de la obra
    dispatch(fetchWorkById(idWork));
  }, [dispatch, idWork]);

  // Descargar el archivo como blob
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

  if (loading) {
    return <p>Cargando detalles de la obra...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!work) {
    return <p>No se encontró la obra.</p>;
  }

  // Convertir el PDF del Permit a una URL para mostrarlo
  const pdfUrl = work.Permit?.pdfData
    ? URL.createObjectURL(new Blob([new Uint8Array(work.Permit.pdfData.data)], { type: "application/pdf" }))
    : null;

  // Obtener la URL de la factura de materiales
  const validMaterialSet = work.MaterialSets?.find((set) => set.invoiceFile !== null);

  // Construir la URL de la factura si existe
  const invoiceUrl = validMaterialSet
    ? `${api.defaults.baseURL}uploads/${validMaterialSet.invoiceFile}`
    : null;


    return (
      <div className="p-4 bg-white shadow-md rounded-lg flex flex-col lg:flex-row gap-8">
        {/* Columna izquierda: Detalles principales */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">Detalles de la Obra</h2>
          <p><strong>Address:</strong> {work.propertyAddress}</p>
          <p><strong>State:</strong> {work.status}</p>
          <p><strong>Aplicante:</strong> {work.Permit?.applicantName || "No disponible"}</p>
          <p><strong>Permit N°:</strong> {work.Permit?.idPermit || "No disponible"}</p>
    
          {pdfUrl && (
            <div>
              <h3 className="text-lg font-bold mt-4">Vista previa del Permit</h3>
              <iframe
                src={pdfUrl}
                width="100%"
                height="250px"
                title="Vista previa del PDF"
                className="rounded"
              ></iframe>
            </div>
          )}
    
          {/* Enlace para ver la factura de materiales */}
          {invoiceUrl && (
            <div className="mt-4">
              <h3 className="text-lg font-bold">Factura de Materiales</h3>
              {invoiceUrl.endsWith(".pdf") ? (
                <iframe
                  src={invoiceUrl}
                  width="100%"
                  height="250px"
                  title="Vista previa de la factura"
                  className="rounded"
                ></iframe>
              ) : (
                <img
                  src={invoiceUrl}
                  alt="Vista previa de la factura"
                  className="w-full h-auto rounded shadow"
                />
              )}
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline mt-2 block"
              >
                Descargar factura de materiales
              </a>
            </div>
          )}
        </div>
    
        {/* Factura y datos del presupuesto */}
        {work.budget && (
          <div className="mt-6 p-4 border rounded shadow bg-gray-50 flex-1">
            <h3 className="text-xl font-bold mb-4">Información del Presupuesto</h3>
            <p><strong>Precio Total:</strong> ${work.budget.price}</p>
            <p><strong>Pago Inicial:</strong> ${work.budget.initialPayment}</p>
            <p><strong>Fecha del Presupuesto:</strong> {work.budget.date}</p>
            <p><strong>Estado:</strong> {work.budget.status}</p>
           
           
    
            {/* Vista previa de la factura del presupuesto */}
            {work.budget.paymentInvoice && (
          <div>
          <h3 className="text-lg font-bold">Factura del Presupuesto</h3>
          {work.budget.paymentInvoice.includes(".pdf") ? (
            <iframe
              src={work.budget.paymentInvoice}
              width="100%"
              height="250px"
              title="Vista previa de la factura del presupuesto"
              className="rounded"
              onError={() => console.error("No se pudo cargar el archivo PDF.")}
            ></iframe>
          ) : (
            <p>No se puede mostrar la vista previa. Descarga el archivo para verlo.</p>
          )}
          <a
            href={work.budget.paymentInvoice}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline mt-2 block"
          >
            Descargar factura del presupuesto
          </a>
        </div>
            )}
          </div>
        )}
    
        {/* Columna derecha: Detalles de instalación */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">Detalles de Instalación</h2>
          {work.installationDetails && work.installationDetails.length > 0 ? (
            <ul className="space-y-4">
              {work.installationDetails.map((detail) => (
                <li
                  key={detail.idInstallationDetail}
                  className="border p-4 rounded shadow"
                >
                  <p><strong>Fecha:</strong> {detail.date}</p>
                  <p><strong>Detalles Extras:</strong> {detail.extraDetails || "No disponible"}</p>
                  <p><strong>Materiales Extras:</strong> {detail.extraMaterials || "No disponible"}</p>
                  {detail.images && detail.images.length > 0 && (
                    <div>
                      <p><strong>Imágenes:</strong></p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {detail.images.map((img, index) => (
                          <img
                            key={index}
                            src={img}
                            alt={`Imagen ${index + 1}`}
                            className="w-full h-24 object-cover rounded cursor-pointer"
                            onClick={() => setSelectedImage(img)} // Abrir el modal con la imagen seleccionada
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay detalles de instalación disponibles.</p>
          )}
        </div>
    
        {/* Modal para mostrar la imagen ampliada */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)} // Cerrar el modal al hacer clic fuera de la imagen
          >
            <div className="relative">
              <img
                src={selectedImage}
                alt="Imagen ampliada"
                className="max-w-full max-h-screen rounded"
              />
              <button
                className="absolute top-2 right-2 bg-white text-black p-2 rounded-full"
                onClick={() => setSelectedImage(null)} // Cerrar el modal al hacer clic en el botón
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
};

export default WorkDetail;