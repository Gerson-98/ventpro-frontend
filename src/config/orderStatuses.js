// Fuente única de verdad para los estados de pedidos.
// Los valores deben coincidir con el enum OrderStatus de Prisma (schema.prisma).

export const ORDER_STATUS = {
  EN_PROCESO: 'en_proceso',
  EN_FABRICACION: 'en_fabricacion',
  LISTO_PARA_INSTALAR: 'listo_para_instalar',
  EN_RUTA: 'en_ruta',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.EN_PROCESO]: 'En Proceso',
  [ORDER_STATUS.EN_FABRICACION]: 'En Fabricación',
  [ORDER_STATUS.LISTO_PARA_INSTALAR]: 'Listo para Instalar',
  [ORDER_STATUS.EN_RUTA]: 'En Ruta',
  [ORDER_STATUS.COMPLETADO]: 'Completado',
  [ORDER_STATUS.CANCELADO]: 'Cancelado',
};

export const ORDER_STATUS_LIST = Object.entries(ORDER_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const ORDER_STATUS_STYLES = {
  [ORDER_STATUS.EN_PROCESO]: { badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500', badgeFull: 'bg-blue-100 text-blue-800 border-blue-300' },
  [ORDER_STATUS.EN_FABRICACION]: { badge: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500', badgeFull: 'bg-orange-100 text-orange-800 border-orange-300' },
  [ORDER_STATUS.LISTO_PARA_INSTALAR]: { badge: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500', badgeFull: 'bg-purple-100 text-purple-800 border-purple-300' },
  [ORDER_STATUS.EN_RUTA]: { badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', dot: 'bg-cyan-500', badgeFull: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  [ORDER_STATUS.COMPLETADO]: { badge: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500', badgeFull: 'bg-green-100 text-green-800 border-green-300' },
  [ORDER_STATUS.CANCELADO]: { badge: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500', badgeFull: 'bg-red-100 text-red-800 border-red-300' },
};

const DEFAULT_STYLE = { badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400', badgeFull: 'bg-gray-100 text-gray-700 border-gray-200' };

export const getStatusStyle = (status) =>
  ORDER_STATUS_STYLES[status] || DEFAULT_STYLE;

export const getStatusLabel = (status) =>
  ORDER_STATUS_LABELS[status] || status || 'Sin estado';
