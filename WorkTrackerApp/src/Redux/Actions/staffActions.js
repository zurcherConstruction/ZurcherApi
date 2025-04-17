import api from "../../utils/axios";
import { fetchStaffRequest, fetchStaffSuccess, fetchStaffFailure } from "../features/staffSlice";

export const fetchStaff = () => async (dispatch) => {
  dispatch(fetchStaffRequest());
  try {
    const response = await api.get("/admin/staff"); // Llama al endpoint del backend
    console.log("Respuesta del backend:", response.data); // Log para depuración

    // Accede a la propiedad `data` dentro de la respuesta
    const staffData = response.data.data;

    // Transforma los datos si es necesario
    const transformedData = Array.isArray(staffData)
      ? staffData.map((staff) => ({
          id: staff.id,
          name: staff.name || "No especificado",
          email: staff.email || "No especificado",
          phone: staff.phone || "No especificado",
          role: staff.role || "No especificado",
          isActive: staff.isActive,
          lastLogin: staff.lastLogin || "No registrado",
          lastLogout: staff.lastLogout || "No registrado",
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        }))
      : [];

    dispatch(fetchStaffSuccess(transformedData)); // Despacha los datos transformados
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al obtener el staff";
    console.error("Error al obtener el staff:", errorMessage); // Log para depuración
    dispatch(fetchStaffFailure(errorMessage)); // Maneja el error
  }
};