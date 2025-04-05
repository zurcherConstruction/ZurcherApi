import  { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWorkById } from '../../Redux/Actions/workActions';
import { useParams } from 'react-router-dom';


const VerImagenes = ({ idWork: propIdWork }) => {
  const dispatch = useDispatch();
  const { selectedWork, loading, error } = useSelector((state) => state.work);
  const { idWork } = useParams();


  useEffect(() => {
    dispatch(fetchWorkById(idWork || propIdWork));
  }, [dispatch, idWork, propIdWork]);

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
      {Object.entries(groupedImages).map(([stage, images]) => (
        <div key={stage} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{stage}</h2>
          <div className="flex overflow-x-auto">
            {images.map((image) => (
              <div key={image.id} className="mr-4">
                <img
                  src={`data:image/jpeg;base64,${image.imageData}`}
                  alt={stage}
                  className="w-40 h-40 object-cover rounded-md"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

VerImagenes.propTypes = {
  idWork: PropTypes.string.isRequired,
};

export default VerImagenes;
