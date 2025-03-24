import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadPdf } from '../Redux/Actions/pdfActions';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const PdfReceipt = () => {
  const dispatch = useDispatch();
  const { data: extractedData, loading, error } = useSelector((state) => state.pdf);
  const [formData, setFormData] = useState({
    permitNumber: '',
    applicationNumber: '',
    constructionPermitFor: '',
    applicant: '',
    propertyAddress: '',
    systemType: '',
    lot: '',
    block: '',
    gpdCapacity: '',
    exavationRequired: '',
    dateIssued: '',
    expirationDate: '',
    pump: '',
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
  });

  const [pdfPreview, setPdfPreview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setPdfPreview(fileUrl);
      dispatch(uploadPdf(file)).then((action) => {
        if (action.payload) {
          setFormData({
            ...formData,
            ...action.payload.data,
          });
          setIsModalOpen(true);
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Datos enviados:', formData);
    alert('Datos guardados correctamente');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Cargar y Editar PDF</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Subir PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {loading && <p className="text-blue-500">Cargando PDF...</p>}
      {error && <p className="text-red-500">{error.message}</p>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(formData).map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium capitalize text-gray-700">{key}</label>
            <input
              type="text"
              name={key}
              value={formData[key] || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        ))}
        <button
          type="submit"
          className="col-span-1 md:col-span-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
        >
          Guardar
        </button>
      </form>

      {/* Modal PDF Viewer */}
      {isModalOpen && pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white rounded-xl overflow-hidden w-full max-w-5xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-red-600 text-xl"
            >
              ✕
            </button>
            <div className="h-[80vh] p-4">
              <h2 className="text-xl font-bold mb-2">Vista previa del PDF</h2>
              <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}>
                <Viewer
                  fileUrl={pdfPreview}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfReceipt;
