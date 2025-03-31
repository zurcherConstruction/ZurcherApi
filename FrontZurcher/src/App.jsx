import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "./Redux/Actions/authActions";
import PrivateRoute from "./Components/PrivateRoute";
import Header from "./Components/Header";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Importa tus componentes
import Login from "./Components/Auth/Login";
import Register from "./Components/Auth/Register";
import Dashboard from "./Components/Dashboard/Dashboard";
import Seguimiento from "./Components/Seguimiento/Seguimiento";
import NotFound from "./Components/NotFound";
import Unauthorized from "./Components/Auth/Unauthorized";
import Landing from "./Components/Landing";
import PdfReceipt from "./Components/PdfReceipt";
import BarraLateral from "./Components/Dashboard/BarraLateral";
import BudgetList from "./Components/Budget/BudgetList";
//import PdfViewerPage from './Components/PdfViewerPage';
import Works from "./Components/Works/Work";
import ProgressTracker from "./Components/ProgressTracker";
import WorkDetail from "./Components/Works/WorkDetail";
import Materiales from "./Components/Materiales";
import MaterialsCheck from "./Components/Seguimiento/WorkStatusManager";
import SendNotification from "./Components/SendNotification";
import Notifications from "./Components/Notifications";
import InstallationForm from "./Components/Works/InstalationForm";
import BudgetEditor from "./Components/Budget/BudgetEditor";

function App() {
  const dispatch = useDispatch();
  const [activeSection, setActiveSection] = useState("Overview");

  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Restaurar sesión al cargar la aplicación
    dispatch(restoreSession());
  }, [dispatch]);

  // Verifica si la ruta actual es "/"
  const isLandingPage = location.pathname === "/";

  return (
    <BrowserRouter>
      {isAuthenticated && <Header />}
      <div className={`flex ${isAuthenticated ? "pt-20" : ""}`}>
        {isAuthenticated && <BarraLateral />}
        <div className="flex-1">
          <Routes>
            {/* Ruta pública */}
            <Route path="/" element={<Landing />} />

            {/* Rutas privadas */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute allowedRoles={["owner", "admin"]}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/firststage"
              element={
                <PrivateRoute allowedRoles={["owner", "recept"]}>
                  <firstStage />
                </PrivateRoute>
              }
            />
            <Route
              path="/progress-tracker"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <ProgressTracker />
                </PrivateRoute>
              }
            />
            <Route
              path="/seguimiento"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <Seguimiento />
                </PrivateRoute>
              }
            />
            <Route
              path="/works"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <Works />
                </PrivateRoute>
              }
            />
            <Route
              path="/work/:idWork"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <WorkDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/installation"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "admin", "user", "worker"]}
                >
                  <InstallationForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/materiales"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <Materiales />
                </PrivateRoute>
              }
            />
            <Route
              path="/inspecciones"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <MaterialsCheck />
                </PrivateRoute>
              }
            />
            <Route
              path="/budgets"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <BudgetList />
                </PrivateRoute>
              }
            />
            <Route
              path="/pdf"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <PdfReceipt />
                </PrivateRoute>
              }
            />

            <Route
              path="/editBudget/:budgetId"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <BudgetEditor />
                </PrivateRoute>
              }
            />
            <Route
              path="/send-notifications"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "recept", "worker", "admin"]}
                >
                  <SendNotification />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "recept", "worker", "admin"]}
                >
                  <Notifications />
                </PrivateRoute>
              }
            />

            {/* Rutas de autenticación */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

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
