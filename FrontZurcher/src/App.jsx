import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from './Redux/Actions/authActions';
import PrivateRoute from './Components/PrivateRoute';
import FirstStage from './Components/firstStage';
import Header from './Components/Header';

// Importa tus componentes
import Login from './Components/Auth/Login';
import Register from './Components/Auth/Register';
import Dashboard from './Components/Dashboard/Dashboard';
import Seguimiento from './Components/Seguimiento/Seguimiento';
import NotFound from './Components/NotFound';
import Unauthorized from './Components/Auth/Unauthorized';
import Landing from './Components/Landing';
import PdfReceipt from './Components/PdfReceipt';

function App() {
  const dispatch = useDispatch();
  const [activeSection, setActiveSection] = useState("Overview");

  useEffect(() => {
    // Verificar si hay un token guardado al iniciar la app
    const token = localStorage.getItem('token');
    if (token) {
      // Si hay token, intentar restaurar la sesión
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        dispatch(loginSuccess({ token, user }));
      }
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="container mx-auto p-4">
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/pdf" element={<PdfReceipt />} />
          <Route path="/seguimiento" element={<Seguimiento />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/firststage" element={<FirstStage />} />

          {/* Rutas protegidas */}
          {/* <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={['Owner']}>
                <Dashboard />
              </PrivateRoute>
            }
          /> */}

          {/* Ruta por defecto para 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

