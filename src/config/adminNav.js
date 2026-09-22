// RUTA: src/config/adminNav.js
//
// Fuente única de verdad para la agrupación de las secciones de
// Administración. La usan tanto el submenú del sidebar (Layout.jsx) como
// la barra de pestañas agrupada dentro de la página /admin (Admin.jsx),
// para que ambas vistas siempre queden sincronizadas.

export const ADMIN_GROUPS = [
  {
    id: "catalogo",
    label: "Catálogo de producto",
    items: [
      { id: "windowTypes", label: "Tipos de Ventana" },
      { id: "windowSeries", label: "Series" },
      { id: "windowCategories", label: "Categorías" },
      { id: "catalogoPerfiles", label: "Catálogo de Perfiles" },
    ],
  },
  {
    id: "calculo",
    label: "Cálculo y fabricación",
    items: [
      { id: "calculations", label: "Ajustes de Cálculo" },
      { id: "accessoryRules", label: "Reglas de Accesorios" },
      { id: "materials", label: "Materiales" },
    ],
  },
  {
    id: "colores",
    label: "Colores y vidrio",
    items: [
      { id: "pvcColors", label: "Colores PVC" },
      { id: "glassColors", label: "Tipos de Vidrio" },
    ],
  },
  {
    id: "opciones",
    label: "Opciones del cotizador",
    items: [
      { id: "optionConfig", label: "Opciones del Cotizador" },
      { id: "windowOptionAssign", label: "Asignación de Opciones" },
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
