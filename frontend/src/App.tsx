import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CatalogoPage from "./pages/CatalogoPage";
import ProductosAdminPage from "./pages/ProductosAdminPage";
import InsumosAdminPage from "./pages/InsumosAdminPage";
import AdminConfigPage from "./pages/AdminConfigPage";
import CarritoPage from "./pages/CarritoPage";
import MisPedidosPage from "./pages/MisPedidosPage";
import PrivateRoute from "./routes/PrivateRoute";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Routes>
      {/* Públicas sin Navbar */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Con Navbar — todas requieren auth (backend exige autenticación en todos los endpoints) */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <PrivateRoute>
              <CatalogoPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/carrito"
          element={
            <PrivateRoute>
              <CarritoPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/mis-pedidos"
          element={
            <PrivateRoute>
              <MisPedidosPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-pedidos/:id"
          element={
            <PrivateRoute>
              <MisPedidosPage />
            </PrivateRoute>
          }
        />

        {/* Gestión productos: ADMIN o STOCK */}
        <Route
          path="/admin/productos"
          element={
            <PrivateRoute roles={["ADMIN", "STOCK"]}>
              <ProductosAdminPage />
            </PrivateRoute>
          }
        />

        {/* Gestión insumos: ADMIN o STOCK */}
        <Route
          path="/admin/insumos"
          element={
            <PrivateRoute roles={["ADMIN", "STOCK"]}>
              <InsumosAdminPage />
            </PrivateRoute>
          }
        />

        {/* Configuración de precios: solo ADMIN (usa mock, no tiene backend) */}
        <Route
          path="/admin/config"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <AdminConfigPage />
            </PrivateRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
