// RUTA: src/config/adminNav.js
//
// Fuente única de verdad para la agrupación de las secciones de
// Administración. La usan tanto el submenú del sidebar (Layout.jsx) como
// la barra de pestañas agrupada dentro de la página /admin (Admin.jsx),
// para que ambas vistas siempre queden sincronizadas.

// Nota: "Catálogo de Perfiles", "Ajustes de Cálculo", "Reglas de Accesorios",
// "Opciones del Cotizador" y "Asignación de Opciones" existieron acá pero se
// quitaron del menú — eran las pantallas del sistema de cálculo legacy /
// pre-asistente. Con los 24 tipos activos ya migrados al asistente (que
// ahora crea y asigna sus propios grupos de opción al vuelo), esas 5
// pantallas dejaron de ser parte del flujo normal. Sus componentes siguen en
// el repo (Tabs/CatalogoPerfilesTab.jsx, CalculationsTab.jsx,
// AccessoryRulesTab.jsx, OptionConfigTab.jsx, WindowOptionAssignTab.jsx) por
// si #36/#37 (los 2 tipos legacy que quedan, hoy inactivos) se retoman más
// adelante — en ese caso, volver a listarlas aquí.
export const ADMIN_GROUPS = [
  {
    id: "catalogo",
    label: "Catálogo de producto",
    items: [
      { id: "windowTypes", label: "Tipos de Ventana" },
      { id: "windowSeries", label: "Series" },
      { id: "windowCategories", label: "Categorías" },
    ],
  },
  {
    id: "materiales",
    label: "Materiales y colores",
    items: [
      { id: "materials", label: "Materiales" },
      { id: "pvcColors", label: "Colores PVC" },
      { id: "glassColors", label: "Tipos de Vidrio" },
    ],
  },
  {
    id: "personas",
    label: "Personas",
    items: [
      { id: "clients", label: "Clientes" },
      { id: "users", label: "Usuarios" },
      { id: "permissions", label: "Permisos" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { id: "checklists", label: "Checklists" },
      { id: "configuracion", label: "Configuración" },
    ],
  },
];

// Lista plana de ids válidos, útil para validar el ?tab= de la URL.
export const ADMIN_TAB_IDS = ADMIN_GROUPS.flatMap((g) => g.items.map((i) => i.id));

// Dado un tab id, devuelve el grupo al que pertenece (o el primero si no
// se encuentra, como fallback seguro).
export function findGroupForTab(tabId) {
  return (
    ADMIN_GROUPS.find((g) => g.items.some((i) => i.id === tabId)) ||
    ADMIN_GROUPS[0]
  );
}
