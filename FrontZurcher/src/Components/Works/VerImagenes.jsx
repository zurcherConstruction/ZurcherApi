import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWorkById } from '../../Redux/Actions/workActions';
import { useParams } from 'react-router-dom';

const VerImagenes = () => {
  const dispatch = useDispatch();
  const { selectedWork, loading, error } = useSelector((state) => state.work);
  const { idWork } = useParams();
  const canvasRef = useRef(null);
  const [imagesWithDataURLs, setImagesWithDataURLs] = useState({});

  useEffect(() => {
    dispatch(fetchWorkById(idWork));
  }, [dispatch, idWork]);

  useEffect(() => {
    if (selectedWork && selectedWork.images) {
      const processImages = async () => {
        const dataURLs = {};
        for (const image of selectedWork.images) {
          try {
            const dataURL = await addDateTimeToImage(image.imageData, image.dateTime, selectedWork.propertyAddress);
            dataURLs[image.id] = dataURL;
          } catch (error) {
            console.error("Error processing image:", image.id, error);
            dataURLs[image.id] = `data:image/jpeg;base64,${image.imageData}`; // Fallback
          }
        }
        setImagesWithDataURLs(dataURLs);
        console.log("imagesWithDataURLs:", dataURLs);
      };
      processImages();
    }
  }, [selectedWork]);

  // filepath: c:\Users\merce\Desktop\desarrollo\ZurcherApi\FrontZurcher\src\Components\Works\VerImagenes.jsx
const addDateTimeToImage = (imageData, dateTime, propertyAddress) => {
  return new Promise((resolve, reject) => {
    console.log("addDateTimeToImage called with:", imageData, dateTime, propertyAddress);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Configuración del texto
      const fontSize = 20; // Tamaño de la letra
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center'; // Centrar horizontalmente

      // Calcular la posición del texto
      const textX = canvas.width / 2; // Centro horizontal
      const textY = canvas.height - 40; // Ajustar la posición vertical
      const addressY = textY + fontSize + 5; // Posición de la dirección

      // Dibujar el texto
      ctx.fillText(dateTime, textX, textY);
      ctx.fillText(propertyAddress, textX, addressY);

      const dataURL = canvas.toDataURL('image/jpeg');
      console.log("dataURL:", dataURL);
      resolve(dataURL);
    };

    img.onerror = (error) => {
      console.error("Error loading image:", error);
      reject(error);
    };

    img.src = `data:image/jpeg;base64,${imageData}`;
  });
};

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3">Cargando imágenes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-red-500">Error al cargar la obra: {error}</p>
      </div>
    );
  }

  if (!selectedWork || !selectedWork.images) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-gray-500">No hay imágenes disponibles para esta obra.</p>
      </div>
    );
  }

  const groupedImages = selectedWork.images.reduce((acc, image) => {
    if (!acc[image.stage]) {
      acc[image.stage] = [];
    }
    acc[image.stage].push(image);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Imágenes de la Obra</h1>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {Object.entries(groupedImages).map(([stage, images]) => (
        <div key={stage} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{stage}</h2>
          <div className="flex overflow-x-auto">
            {images.map(image => (
              <div key={image.id} className="mr-4">
                {imagesWithDataURLs[image.id] ? (
                  <img
                    src={imagesWithDataURLs[image.id]}
                    alt={stage}
                    className="w-40 h-40 object-cover rounded-md"
                  />
                ) : (
                  <p>Cargando imagen...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

VerImagenes.propTypes = {
  idWork: PropTypes.string, // idWork es opcional porque viene de los params
};

export default VerImagenes;