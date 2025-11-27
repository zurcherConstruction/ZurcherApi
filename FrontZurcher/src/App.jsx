import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
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
import NotFound from "./Components/NotFound";
import Unauthorized from "./Components/Auth/Unauthorized";
//import Landing from "./Components/Landing";
import PdfReceipt from "./Components/PdfReceipt";
import BarraLateral from "./Components/Dashboard/BarraLateral";
import BudgetList from "./Components/Budget/BudgetList";
import Works from "./Components/Works/Work";
import ProgressTracker from "./Components/ProgressTracker";
import WorkZoneMap from "./Components/WorkZoneMap"; //  Mapa de obras por zona
import WorkDetail from "./Components/Works/WorkDetail";
import Materiales from "./Components/Materiales";
import MaterialsCheck from "./Components/Seguimiento/WorkStatusManager";
import SendNotification from "./Components/SendNotification";
import Notifications from "./Components/Notifications";
//import InstallationForm from "./Components/Works/InstalationForm";
import CreateBudget from "./Components/Budget/CreateBudget";
import ForgotPassword from "./Components/Auth/ForgotPassword";
import ResetPassword from "./Components/Auth/ResetPassword";
import ArchveBudget from "./Components/Budget/ArchiveBudget";
import FileDetail from "./Components/Budget/FileDetail";
import PendingWorks from "./Components/Works/PendingWorks";
import AttachInvoice from "./Components/Seguimiento/AttachInvoice";
import VerImagenes from "./Components/Works/VerImagenes";
import BalanceStats from "./Components/BalanceStats";
import LoadingSpinner from "./Components/LoadingSpinner";
import UploadInitialPay from "./Components/Budget/UploadInitialPay";
import PriceBudgetManagement from "./Components/Budget/PriceBudgetManagement";
import ItemsBudgets from "./Components/Budget/ItemsBudgets";
import EditBudget from "./Components/Budget/EditBudget";
import Summary from "./Components/Summary";
import AccountsReceivable from "./Components/AccountsReceivable";
import GestionBudgets from "./Components/Budget/GestionBudgets";
import CreateLegacyBudget from "./Components/Budget/CreateLegacyBudget";
import FixedExpensesManager from "./Components/FixedExpenses/FixedExpensesManager"; // 🆕 Gastos Fijos
// 🆕 Importar página de revisión de presupuesto (pública)
import BudgetReviewPage from "./Components/Budget/BudgetReviewPage";
// Importar componentes de la Landing
import LandingClients from "./Components/Landing/LandingClients";
import ThankYou from "./Components/Landing/ThankYou";
import ChangeOrderResponsePage from "./Components/Landing/ChangeOrderResponsePage";
import PrivacyPolicy from "./Components/PrivacyPolicy";
// Importar componentes de Mantenimiento
import MaintenanceList from "./Components/Maintenance/MaintenanceList";
import MaintenanceForm from "./pages/MaintenanceForm";
import OwnerMaintenanceView from "./Components/Maintenance/OwnerMaintenanceView";
import LegacyMaintenanceEditor from "./Components/Maintenance/LegacyMaintenanceEditor"; // 🆕 Editor de trabajos legacy
import MaintenanceCalendar from "./Components/Maintenance/MaintenanceCalendar"; // 🆕 Calendario de mantenimiento
import SupplierInvoiceManager from './Components/SupplierInvoices/SupplierInvoiceManager';
// Importar componentes de Bank Accounts
import BankAccountsDashboard from './Components/BankAccounts/BankAccountsDashboard';
import BankAccountDetail from './Components/BankAccounts/BankAccountDetail';
import NewTransactionModal from './Components/BankAccounts/NewTransactionModal';
// Importar componentes de Workers
import WorkerDashboard from "./Components/Workers/WorkerDashboard";
import WorkerWorkUpload from "./Components/Workers/WorkerWorkUpload";
import WorkerMaintenanceDashboard from "./Components/Workers/WorkerMaintenanceDashboard";
import WorkerMaintenanceDetail from "./Components/Workers/WorkerMaintenanceDetail";
import WorkerGeneralExpense from "./Components/Workers/WorkerGeneralExpense";


function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isSessionRestored, setIsSessionRestored] = useState(false);

  useEffect(() => {
    dispatch(restoreSession()).finally(() => setIsSessionRestored(true));
  }, [dispatch]);

  useEffect(() => {
    // Lista de rutas públicas que no requieren redirección automática
    const publicRoutes = ["/", "/thank-you", "/change-order-response", "/privacy-policy", "/login", "/forgot-password", "/maintenance-form"];
    const isPublicRoute = publicRoutes.some(route =>
      location.pathname === route || location.pathname.startsWith("/reset-password")
    );

    // No redirigir automáticamente desde la landing principal
    // Los usuarios usarán el login modal para acceder al dashboard
  }, [isAuthenticated, location.pathname, navigate]);

  if (!isSessionRestored) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Cargando...</div>
    </div>;
  }

  // Determinar si estamos en una ruta pública de la landing
  const publicLandingRoutes = ["/", "/thank-you", "/change-order-response", "/privacy-policy", "/maintenance-form"];
  const isBudgetReviewRoute = location.pathname.startsWith("/budget-review/");
  const isPublicLandingRoute = publicLandingRoutes.includes(location.pathname) || isBudgetReviewRoute;

  // Determinar si mostrar header y sidebar
  const shouldShowLayout = isAuthenticated && !isPublicLandingRoute;

  return (
    <>
      {shouldShowLayout && <Header />}
      <LoadingSpinner />
      <div className={`flex ${shouldShowLayout ? "pt-16 md:pt-20" : ""} min-h-screen bg-gray-50`}>
        {shouldShowLayout && <BarraLateral />}
        <div className="flex-1 w-full overflow-x-hidden">
          <div className={`w-full max-w-none ${shouldShowLayout ? "px-2 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6" : ""}`}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/" element={<LandingClients />} />

              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/change-order-response" element={<ChangeOrderResponsePage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />

              {/* 🆕 Ruta pública para revisión de presupuestos */}
              <Route path="/budget-review/:budgetId/:reviewToken" element={<BudgetReviewPage />} />

              {/* 🆕 Ruta pública para formulario de mantenimiento (protegida por token en query params) */}
              <Route path="/maintenance-form" element={<MaintenanceForm />} />

              {/* Rutas privadas */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute allowedRoles={["admin", "recept", "owner", "finance"]}>
                    <Dashboard />
                  </PrivateRoute>
                }
              />

              {/* Rutas privadas */}
              <Route
                path="/gestionBudgets"
                element={
                  <PrivateRoute allowedRoles={["admin", "recept", "owner", "follow-up", "finance"]}>
                    <GestionBudgets />
                  </PrivateRoute>
                }
              />

              <Route
                path="/progress-tracker"
                element={
                  <PrivateRoute allowedRoles={["admin", "recept", "owner", "finance"]}>
                    <ProgressTracker />
                  </PrivateRoute>
                }
              />

              <Route
                path="/work-zone-map"
                element={
                  <PrivateRoute allowedRoles={["admin", "recept", "owner", "finance", "worker"]}>
                    <WorkZoneMap />
                  </PrivateRoute>
                }
              />

              <Route
                path="/works"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <Works />
                  </PrivateRoute>
                }
              />
              <Route
                path="/work/:idWork"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin", "finance", "recept"]}>
                    <WorkDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/workCalendar"
                element={
                  <PrivateRoute allowedRoles={["owner", "recept", "admin"]}>
                    <PendingWorks />
                  </PrivateRoute>
                }
              />
              {/* <Route
              path="/installation"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "admin", "user", "worker"]}
                >
                  <InstallationForm />
                </PrivateRoute>
              }
            /> */}
              <Route
                path="/materiales"
                element={
                  <PrivateRoute allowedRoles={["owner", "recept"]}>
                    <Materiales />
                  </PrivateRoute>
                }
              />
              <Route
                path="/itemBudget"
                element={
                  <PrivateRoute allowedRoles={["owner", "recept", "admin"]}>
                    <ItemsBudgets />
                  </PrivateRoute>
                }
              />
              <Route
                path="/check"
                element={
                  <PrivateRoute allowedRoles={["owner"]}>
                    <MaterialsCheck />
                  </PrivateRoute>
                }
              />
              <Route
                path="/budgets"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin", "finance", "recept"]}>
                    <BudgetList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/editBudget"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <EditBudget />
                  </PrivateRoute>
                }
              />
              <Route
                path="/budgets/edit/:budgetId"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <EditBudget />
                  </PrivateRoute>
                }
              />
              <Route
                path="/pdf"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <PdfReceipt />
                  </PrivateRoute>
                }
              />
              <Route
                path="/createBudget"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <CreateBudget />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-legacy-budget"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <CreateLegacyBudget />
                  </PrivateRoute>
                }
              />
              <Route
                path="/archive"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <ArchveBudget />
                  </PrivateRoute>
                }
              />
              <Route path="/archives/:folder/:file" element={<FileDetail />} />

              <Route
                path="/send-notifications"
                element={
                  <PrivateRoute
                    allowedRoles={["owner", "recept", "worker", "admin", "maintenance", "finance", "follow-up"]}
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
              <Route
                path="/attachInvoice"
                element={
                  <PrivateRoute allowedRoles={["owner", "recept", "admin", "finance"]}>
                    <AttachInvoice />
                  </PrivateRoute>
                }
              />
              <Route
                path="/balance"
                element={
                  <PrivateRoute allowedRoles={["owner", "finance"]}>
                    <BalanceStats />
                  </PrivateRoute>
                }
              />
              <Route
                path="/fixed-expenses"
                element={
                  <PrivateRoute allowedRoles={["owner", "finance"]}>
                    <FixedExpensesManager />
                  </PrivateRoute>
                }
              />

              <Route
                path="/supplier-invoices"
                element={
                  <PrivateRoute allowedRoles={["owner", "finance"]}>
                    <SupplierInvoiceManager />
                  </PrivateRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PrivateRoute allowedRoles={["owner"]}>
                    <Register />
                  </PrivateRoute>
                }
              />
              <Route
                path="/ver-imagenes/:idWork"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <VerImagenes />
                  </PrivateRoute>
                }
              />

              <Route
                path="/initialPay"
                element={
                  <PrivateRoute allowedRoles={["owner", "finance"]}>
                    <UploadInitialPay />
                  </PrivateRoute>
                }
              />

              <Route
                path="/priceBudget"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <PriceBudgetManagement />
                  </PrivateRoute>
                }
              />

              <Route
                path="/summary"
                element={
                  <PrivateRoute allowedRoles={["owner", "finance"]}>
                    <Summary />
                  </PrivateRoute>
                }
              />

              <Route
                path="/accounts-receivable"
                element={
                  <PrivateRoute allowedRoles={["admin", "owner", "finance"]}>
                    <AccountsReceivable />
                  </PrivateRoute>
                }
              />

              {/* Rutas de Mantenimiento */}
              <Route
                path="/maintenance"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <OwnerMaintenanceView />
                  </PrivateRoute>
                }
              />

              {/* 🏦 Rutas de Bank Accounts */}
              <Route
                path="/bank-accounts"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin", "finance"]}>
                    <BankAccountsDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/bank-accounts/:id"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin", "finance"]}>
                    <BankAccountDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/bank-accounts/new-transaction"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin", "finance"]}>
                    <NewTransactionModal />
                  </PrivateRoute>
                }
              />

              <Route
                path="/maintenance/works"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin"]}>
                    <MaintenanceList />
                  </PrivateRoute>
                }
              />
              {/* 🆕 Calendario de visitas de mantenimiento */}
              <Route
                path="/maintenance/calendar"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin", "maintenance"]}>
                    <MaintenanceCalendar />
                  </PrivateRoute>
                }
              />
              <Route
                path="/maintenance/:visitId"
                element={
                  <PrivateRoute allowedRoles={["owner", "admin", "worker", "maintenance"]}>
                    <WorkerMaintenanceDetail />
                  </PrivateRoute>
                }
              />

              {/* 🆕 Ruta para editar trabajos legacy de mantenimiento */}
              <Route
                path="/legacy-maintenance"
                element={
                  <PrivateRoute allowedRoles={["admin", "owner", "maintenance"]}>
                    <LegacyMaintenanceEditor />
                  </PrivateRoute>
                }
              />

              {/* Rutas de Workers */}
              <Route
                path="/worker"
                element={
                  <PrivateRoute allowedRoles={["worker"]}>
                    <WorkerDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/worker/work/:workId"
                element={
                  <PrivateRoute allowedRoles={["worker"]}>
                    <WorkerWorkUpload />
                  </PrivateRoute>
                }
              />
              <Route
                path="/worker/maintenance"
                element={
                  <PrivateRoute allowedRoles={["worker", "maintenance"]}>
                    <WorkerMaintenanceDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/worker/maintenance/:visitId"
                element={
                  <PrivateRoute allowedRoles={["worker", "maintenance"]}>
                    <WorkerMaintenanceDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/worker/general-expense"
                element={
                  <PrivateRoute allowedRoles={["worker"]}>
                    <WorkerGeneralExpense />
                  </PrivateRoute>
                }
              />

              {/* Rutas de autenticación */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Ruta por defecto para 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        className="mt-16 md:mt-20"
        toastClassName="text-sm"
      />
    </>
  );
}

export default App;
