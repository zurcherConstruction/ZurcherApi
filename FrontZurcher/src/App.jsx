import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { restoreSession } from './Redux/Actions/authActions';
import PrivateRoute from './Components/PrivateRoute';
import Header from './Components/Header';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Importa tus componentes
import Login from './Components/Auth/Login';
import Register from './Components/Auth/Register';
import Dashboard from './Components/Dashboard/Dashboard';
import Seguimiento from './Components/Seguimiento/Seguimiento';
import NotFound from './Components/NotFound';
import Unauthorized from './Components/Auth/Unauthorized';
import Landing from './Components/Landing';
import PdfReceipt from './Components/PdfReceipt';
import BarraLateral from './Components/Dashboard/BarraLateral';
import BudgetList from './Components/Budget/BudgetList';
//import PdfViewerPage from './Components/PdfViewerPage';
import Works from './Components/Works/Work';
import ProgressTracker from './Components/ProgressTracker';
import WorkDetail from './Components/Works/WorkDetail';
import Materiales from './Components/Materiales';
import MaterialsCheck from './Components/Seguimiento/WorkStatusManager';

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
       <Header />
      <div className="flex">
        <BarraLateral />
        <div className="flex-1 ml-60 pt-20 p-4">
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/pdf" element={<PdfReceipt />} />
          <Route path="/seguimiento" element={<Seguimiento />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          {/* <Route path="/pdf-viewer" element={<PdfViewerPage />} /> */}
          <Route path="/budgets" element={<BudgetList/> } />
          <Route path="/works" element={<Works />} />
          <Route path="/work/:idWork" element={<WorkDetail />} />
         <Route path="/progress-tracker" element={<ProgressTracker />} />
         <Route path="/materiales" element={<Materiales />} />
         <Route path="/inspecciones" element={<MaterialsCheck />} />
         

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
    </div>
    <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
