import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadPdf } from '../Redux/Actions/pdfActions';

const PdfReceipt = () => {
  const [file, setFile] = useState(null);
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector(state => state.pdf);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) {
      dispatch(uploadPdf(file));
    }
  };

  return (
    <div>
      <h2>Subir PDF</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <button type="submit">Enviar PDF</button>
      </form>
      {loading && <p>Subiendo PDF...</p>}
      {data && (
        <div>
          <h3>Respuesta del Backend:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>Error: {error.message || 'Error al subir el PDF'}</p>}
    </div>
  );
};

export default PdfReceipt;