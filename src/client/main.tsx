import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles/theme.module.css";
import { Layout } from "./components/Layout";
import { InventoryPage } from "./pages/InventoryPage";
import { IntakePage } from "./pages/IntakePage";
import { LossesPage } from "./pages/LossesPage";
import { PosPage } from "./pages/PosPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

// Defines the mobile app routes and keeps the POS screen as the default landing page.
function App() { return <BrowserRouter><Routes><Route element={<Layout />}><Route path="/pos" element={<PosPage />} /><Route path="/inventory" element={<InventoryPage />} /><Route path="/intake" element={<IntakePage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/losses" element={<LossesPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/pos" replace />} /></Route></Routes></BrowserRouter>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);