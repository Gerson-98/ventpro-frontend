// RUTA: src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Windows from "./pages/Windows";
import "./index.css";
import OrderDetail from "./pages/OrderDetail";
import Clients from "./pages/Clients";
import Admin from "./pages/Admin/Admin";
import CalculationsManager from './pages/CalculationsManager';
import Quotations from './pages/Quotations';
import QuotationDetail from './pages/QuotationDetail';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import MyDashboard from './pages/MyDashboard';
import GananciasPage from './pages/GananciasPage';
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AdminRoute from "./components/AdminRoute";
import MaterialesConsolidado from './pages/MaterialesConsolidado';

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/",
        element: (
          <AdminRoute>
            <Home />
          </AdminRoute>
        ),
      },
      { path: "/my-dashboard", element: <MyDashboard /> },
      { path: "/orders", element: <AdminRoute><Orders /></AdminRoute> },
      { path: "/orders/:id", element: <AdminRoute><OrderDetail /></AdminRoute> },
      { path: "/windows", element: <Windows /> },
      { path: "/clients", element: <Clients /> },
      { path: "/materiales-consolidado", element: <AdminRoute><MaterialesConsolidado /></AdminRoute> },
      { path: "/ganancias", element: <AdminRoute><GananciasPage /></AdminRoute> },
      {
        path: "/admin",
        element: (
          <AdminRoute>
            <Admin />
          </AdminRoute>
        ),
      },
      { path: "/calculationsmanager", element: <CalculationsManager /> },
      { path: "/quotations", element: <Quotations /> },
      { path: "/quotations/:id", element: <QuotationDetail /> },
      { path: "/calendar", element: <CalendarPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);