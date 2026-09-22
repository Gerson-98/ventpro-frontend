// RUTA: src/pages/Admin/Admin.jsx

import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ADMIN_GROUPS, ADMIN_TAB_IDS, findGroupForTab } from "../../config/adminNav";
import WindowTypesTab from "./Tabs/WindowTypesTab";
import WindowSeriesTab from "./Tabs/WindowSeriesTab";
import WindowCategoriesTab from "./Tabs/WindowCategoriesTab";
import PvcColorsTab from "./Tabs/PvcColorsTab";
import GlassColorsTab from "./Tabs/GlassColorsTab";
import ClientsTab from "./Tabs/ClientsTab";
import UsersTab from "./Tabs/UsersTab";
import PermissionsTab from "./Tabs/PermissionsTab";
import MaterialsTab from "./Tabs/MaterialsTab";
import ChecklistTemplateTab from './Tabs/ChecklistTemplateTab';
import ConfiguracionTab from './Tabs/ConfiguracionTab';

const TAB_COMPONENTS = {
  windowTypes: WindowTypesTab,
  windowSeries: WindowSeriesTab,
  windowCategories: WindowCategoriesTab,
  materials: MaterialsTab,
  pvcColors: PvcColorsTab,
  glassColors: GlassColorsTab,
  clients: ClientsTab,
  users: UsersTab,
  permissions: PermissionsTab,
  checklists: ChecklistTemplateTab,
  configuracion: ConfiguracionTab,
};

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab activo derivado de ?tab=<id> en la URL — así la navegación desde el
  // submenú del sidebar y el recargar la página mantienen la pestaña correcta.
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(
    () => (ADMIN_TAB_IDS.includes(tabParam) ? tabParam : "windowTypes"),
    [tabParam]
  );

  const activeGroup = useMemo(() => findGroupForTab(activeTab), [activeTab]);

  // Grupo actualmente "abierto" en la barra de nivel 1 — por defecto el que
  // contiene la pestaña activa. Si el usuario hace clic en otro grupo, se
  // muestra su primera pestaña.
  const [openGroupId, setOpenGroupId] = useState(activeGroup.id);
  useEffect(() => {
    setOpenGroupId(activeGroup.id);
  }, [activeGroup.id]);

  const setActiveTab = (id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", id);
      return next;
    });
  };

  const handleGroupClick = (group) => {
    setOpenGroupId(group.id);
    if (!group.items.some((i) => i.id === activeTab)) {
      setActiveTab(group.items[0].id);
    }
  };

  const displayedGroup = ADMIN_GROUPS.find((g) => g.id === openGroupId) || activeGroup;
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="p-4 sm:p-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Administración</h1>
        <p className="text-gray-500 text-sm">Gestiona tus catálogos y bibliotecas</p>
      </div>

      {/* ── Nivel 1: grupos ── */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ADMIN_GROUPS.map((group) => {
          const isOpen = group.id === openGroupId;
          const containsActive = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              onClick={() => handleGroupClick(group)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors border ${isOpen
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : containsActive
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {/* ── Nivel 2: pestañas del grupo abierto ── */}
      <div className="relative mb-4 sm:mb-6">
        <div className="absolute bottom-0 left-0 right-0 border-b border-gray-200" />
        <div className="flex overflow-x-auto scrollbar-none gap-0 -mb-px">
          {displayedGroup.items.map((tab) => (
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
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
