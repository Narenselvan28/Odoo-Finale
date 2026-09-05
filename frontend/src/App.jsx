import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import PrivateRoute from "./components/PrivateRoute";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PricingStudio from "./pages/PricingStudio";
import QuotationsList from "./pages/QuotationsList";
import ApprovalsDesk from "./pages/ApprovalsDesk";
import CatalogManagement from "./pages/CatalogManagement";
import CustomersDesk from "./pages/CustomersDesk";
import InventoryDesk from "./pages/InventoryDesk";
import BillingDesk from "./pages/BillingDesk";
import DealIntelligence from "./pages/DealIntelligence";
import UsersAdmin from "./pages/UsersAdmin";
import CustomerPortal from "./pages/CustomerPortal";
import PipelineKanban from "./pages/PipelineKanban";
import ReportingDesk from "./pages/ReportingDesk";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Customer-Facing Live Negotiation Portal (Spec B8 - Publicly Accessible) */}
            <Route path="/portal/:id" element={<CustomerPortal />} />

            {/* Protected Enterprise Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/cpq"
              element={
                <PrivateRoute>
                  <PricingStudio />
                </PrivateRoute>
              }
            />
            <Route
              path="/cpq/:id"
              element={
                <PrivateRoute>
                  <PricingStudio />
                </PrivateRoute>
              }
            />
            <Route
              path="/quotations"
              element={
                <PrivateRoute>
                  <QuotationsList />
                </PrivateRoute>
              }
            />
            <Route
              path="/pipeline"
              element={
                <PrivateRoute>
                  <PipelineKanban />
                </PrivateRoute>
              }
            />
            <Route
              path="/reporting"
              element={
                <PrivateRoute>
                  <ReportingDesk />
                </PrivateRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <PrivateRoute>
                  <ApprovalsDesk />
                </PrivateRoute>
              }
            />
            <Route
              path="/catalog"
              element={
                <PrivateRoute>
                  <CatalogManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <PrivateRoute>
                  <CustomersDesk />
                </PrivateRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <PrivateRoute>
                  <InventoryDesk />
                </PrivateRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <PrivateRoute>
                  <BillingDesk />
                </PrivateRoute>
              }
            />
            <Route
              path="/intelligence"
              element={
                <PrivateRoute>
                  <DealIntelligence />
                </PrivateRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateRoute>
                  <UsersAdmin />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
