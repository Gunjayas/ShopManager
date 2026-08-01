import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@fontsource-variable/geist";
import "./styles/theme.css";
import { Layout } from "./components/Layout";
import { InventoryPage } from "./pages/InventoryPage";
import { LossesPage } from "./pages/LossesPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PosPage } from "./pages/PosPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

// Defines the mobile app routes and keeps legacy intake links pointed at the reconciled Orders flow.
function App() { return <BrowserRouter><Routes><Route element={<Layout />}><Route path="/pos" element={<PosPage />} /><Route path="/inventory" element={<InventoryPage />} /><Route path="/orders" element={<OrdersPage />} /><Route path="/orders/:orderId" element={<OrderDetailPage />} /><Route path="/intake" element={<Navigate to="/orders" replace />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/losses" element={<LossesPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/pos" replace />} /></Route></Routes></BrowserRouter>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);