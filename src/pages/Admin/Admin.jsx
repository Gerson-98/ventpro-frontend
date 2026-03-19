// RUTA: src/pages/Admin/Admin.jsx

import React, { useState } from "react";
import WindowTypesTab from "./Tabs/WindowTypesTab";
import PvcColorsTab from "./Tabs/PvcColorsTab";
import GlassColorsTab from "./Tabs/GlassColorsTab";
import ClientsTab from "./Tabs/ClientsTab";
import CalculationsTab from "./Tabs/CalculationsTab";
import UsersTab from "./Tabs/UsersTab";
import MaterialsTab from "./Tabs/MaterialsTab";
import CatalogoPerfilesTab from "./Tabs/CatalogoPerfilesTab";
import AccessoryRulesTab from "./Tabs/AccessoryRulesTab";
import OptionConfigTab from './Tabs/OptionConfigTab';
import WindowOptionAssignTab from './Tabs/WindowOptionAssignTab';
import ChecklistTemplateTab from './Tabs/ChecklistTemplateTab';
import ConfiguracionTab from './Tabs/ConfiguracionTab';

export default function Admin() {
  const [activeTab, setActiveTab] = useState("windowTypes");

  const tabs = [
    { id: "windowTypes", label: "Tipos de Ventana" },
    { id: "catalogoPerfiles", label: "Catálogo de Perfiles" },
    { id: "calculations", label: "Ajustes de Cálculo" },
    { id: "accessoryRules", label: "Reglas de Accesorios" },
    { id: "materials", label: "Materiales" },
    { id: "pvcColors", label: "Colores PVC" },
    { id: "glassColors", label: "Tipos de Vidrio" },
    { id: "clients", label: "Clientes" },
    { id: "users", label: "Usuarios" },
    { id: "optionConfig", label: "Opciones del Cotizador" },
    { id: "windowOptionAssign", label: "Asignación de Opciones" },
    { id: "checklists", label: "✓ Checklists" },
    { id: "configuracion", label: "⚙ Configuración" },
  ];

  return (
    <div className="p-4 sm:p-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Administración</h1>
        <p className="text-gray-500 text-sm">Gestiona tus catálogos y bibliotecas</p>
      </div>

      {/* ── Tabs — scroll horizontal en móvil, sin wrap ── */}
      <div className="relative mb-4 sm:mb-6">
        {/* borde inferior full-width */}
        <div className="absolute bottom-0 left-0 right-0 border-b border-gray-200" />
        <div className="flex overflow-x-auto scrollbar-none gap-0 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
        {activeTab === "windowTypes" && <WindowTypesTab />}
        {activeTab === "catalogoPerfiles" && <CatalogoPerfilesTab />}
        {activeTab === "calculations" && <CalculationsTab />}
        {activeTab === "accessoryRules" && <AccessoryRulesTab />}
        {activeTab === "materials" && <MaterialsTab />}
        {activeTab === "pvcColors" && <PvcColorsTab />}
        {activeTab === "glassColors" && <GlassColorsTab />}
        {activeTab === "clients" && <ClientsTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "optionConfig" && <OptionConfigTab />}
        {activeTab === "windowOptionAssign" && <WindowOptionAssignTab />}
        {activeTab === "checklists" && <ChecklistTemplateTab />}
        {activeTab === "configuracion" && <ConfiguracionTab />}
      </div>
    </div>
  );
}