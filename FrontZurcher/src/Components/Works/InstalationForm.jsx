import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addInstallationDetail, fetchWorks } from "../../Redux/Actions/workActions";

const InstallationForm = () => {
  const dispatch = useDispatch();

  // Obtener la lista de obras desde Redux
  const { works, loading, error } = useSelector((state) => state.work);

  const [selectedWork, setSelectedWork] = useState(null); // Obra seleccionada
  const [formData, setFormData] = useState({
    date: "",
    extraDetails: "",
    extraMaterials: "",
    images: [],
    status: "installed", // Estado predeterminado
  });

  // Filtrar las obras con estado "inProgress"
  const filteredWorks = works.filter((work) => work.status === "inProgress");

  // Buscar obras al cargar el componente
  React.useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = () => {
    window.cloudinary.openUploadWidget(
      { cloudName: "your-cloud-name", uploadPreset: "your-upload-preset" },
      (error, result) => {
        if (!error && result.event === "success") {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, result.info.secure_url],
          }));
        }
      }
    );
  };

  const validateForm = () => {
    if (!formData.date) {
      alert("La fecha es obligatoria.");
      return false;
    }
    if (!formData.extraDetails && !formData.extraMaterials) {
      alert("Debes proporcionar detalles o materiales extras.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await dispatch(addInstallationDetail(selectedWork.idWork, formData));
      alert("Detalle de instalación agregado correctamente.");
      setSelectedWork(null);
      setFormData({
        date: "",
        extraDetails: "",
        extraMaterials: "",
        images: [],
        status: "installed",
      });
    } catch (error) {
      alert("Error al agregar el detalle de instalación.");
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4">Seleccionar Obra</h2>

      {loading && <p>Cargando obras...</p>}
      {error && <p className="text-red-500">Error al cargar las obras: {error}</p>}

      {!selectedWork && (
        <div>
          <h3 className="text-lg font-bold mb-2">Obras en Progreso</h3>
          {filteredWorks.length === 0 ? (
            <p>No hay obras con estado "inProgress".</p>
          ) : (
            <ul className="space-y-2">
              {filteredWorks.map((work) => (
                <li
                  key={work.idWork}
                  className="border p-2 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedWork(work)}
                >
                  <p><strong>Dirección:</strong> {work.propertyAddress}</p>
                  <p><strong>Estado:</strong> {work.status}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedWork && (
        <div>
          <h3 className="text-lg font-bold mt-4">Detalles de la Obra</h3>
          <p><strong>Dirección:</strong> {selectedWork.propertyAddress}</p>
          <p><strong>Estado:</strong> {selectedWork.status}</p>
          <p><strong>Notas:</strong> {selectedWork.notes}</p>

          <h3 className="text-lg font-bold mt-4">Agregar Detalle de Instalación</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-bold">Fecha:</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
                required
              />
            </div>
            <div>
              <label className="block font-bold">Detalles Extras:</label>
              <textarea
                name="extraDetails"
                value={formData.extraDetails}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block font-bold">Materiales Extras:</label>
              <textarea
                name="extraMaterials"
                value={formData.extraMaterials}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block font-bold">Imágenes:</label>
              <button
                type="button"
                onClick={handleImageUpload}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Cargar Imágenes
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.images.map((url, index) => (
                  <img key={index} src={url} alt="Uploaded" className="w-20 h-20 object-cover rounded" />
                ))}
              </div>
            </div>
            <div>
              <label className="block font-bold">Estado:</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              >
                <option value="installed">Installed</option>
                <option value="inProgress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
              Agregar Detalle
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default InstallationForm;