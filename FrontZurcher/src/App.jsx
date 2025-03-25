import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { restoreSession } from './Redux/Actions/authActions';
import PrivateRoute from './Components/PrivateRoute';
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
//import PdfViewerPage from './Components/PdfViewerPage';

function App() {
  const dispatch = useDispatch();
  const [activeSection, setActiveSection] = useState("Overview");

  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Restaurar sesión al cargar la aplicación
    dispatch(restoreSession());
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
          {/* <Route path="/pdf-viewer" element={<PdfViewerPage />} /> */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Rutas protegidas */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={['owner', 'admin']}>
                <Dashboard />
               
              </PrivateRoute>
            }
          />
                
         
          <Route
            path="/firststage"
            element={
              <PrivateRoute allowedRoles={['owner', 'recept']}>
                <firstStage />
              </PrivateRoute>
            }
          />

          {/* Ruta por defecto para 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
