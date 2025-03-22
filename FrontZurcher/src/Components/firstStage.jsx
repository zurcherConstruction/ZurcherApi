import React, { useState } from 'react';
import PdfReceipt from './PdfReceipt'; // Import the PdfReceipt component
 // Import the SendQuote component

function FirstStage() {
  const [clientData, setClientData] = useState({
    fullName: '',
    email: '',
    phone: '',
    obraAddress: '',
  });

  const handleChange = (e) => {
    setClientData({
      ...clientData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 lg:p-12">
      <h2 className="text-2xl font-semibold mb-4">Datos del Cliente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-gray-700 text-sm font-bold mb-2">
            Nombre Completo:
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={clientData.fullName}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese el nombre completo"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
            Email:
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={clientData.email}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese el email"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">
            Teléfono:
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={clientData.phone}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese el teléfono"
          />
        </div>

        {/* Obra Address */}
        <div>
          <label htmlFor="obraAddress" className="block text-gray-700 text-sm font-bold mb-2">
            Dirección de Obra:
          </label>
          <input
            type="text"
            id="obraAddress"
            name="obraAddress"
            value={clientData.obraAddress}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese la dirección de obra"
          />
        </div>

        {/* PDF Receipt Button */}
        <div className="md:col-span-2">
          <PdfReceipt /> {/* Render the PdfReceipt component */}
        </div>

      

        {/* Submit Button (Optional) */}
        <div className="md:col-span-2">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full md:w-auto"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default FirstStage;