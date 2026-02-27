// RUTA: src/config/windowTypesConfig.js
//
// Capa de presentación — NO modifica la BD.
// Define cómo se agrupan los tipos de ventana en el selector del cotizador.
// Cada grupo tiene "steps" (pasos en cascada) que resuelven al window_type_id real.

export const WINDOW_GROUPS = [
  // ── VENTANAS CORREDIZAS 55 CM ─────────────────────────────────────────────
  {
    id: 'ventana_corrediza_55',
    displayName: 'VENTANA CORREDIZA 55 CM',
    steps: [
      {
        key: 'marco',
        label: 'Marco',
        options: [
          { value: '45', label: 'Marco 45 CM' },
          { value: '5',  label: 'Marco 5 CM'  },
        ],
      },
      {
        key: 'hojas',
        label: 'Número de Hojas',
        options: [
          { value: '2', label: '2 Hojas' },
          { value: '3', label: '3 Hojas' },
          { value: '4', label: '4 Hojas' },
        ],
      },
    ],
    // Mapeo: marco + hojas → nombre exacto en BD
    resolve: {
      '45_2': 'VENTANA CORREDIZA 2 HOJAS 55 CM MARCO 45 CM',
      '45_3': 'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 45 CM',
      '45_4': 'VENTANA CORREDIZA 4 HOJAS 55 CM MARCO 45 CM',
      '5_2':  'VENTANA CORREDIZA 2 HOJAS 55 CM MARCO 5 CM',
      '5_3':  'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 5 CM',
      '5_4':  'VENTANA CORREDIZA 4 HOJAS 55 CM MARCO 5 CM',
    },
    // Clave para construir el resolve key: marco + '_' + hojas
    resolveKey: (variants) => `${variants.marco}_${variants.hojas}`,
  },

  // ── PUERTAS CORREDIZAS 66 CM ──────────────────────────────────────────────
  {
    id: 'puerta_corrediza_66',
    displayName: 'PUERTA CORREDIZA 66 CM',
    steps: [
      {
        key: 'marco',
        label: 'Marco',
        options: [
          { value: '45', label: 'Marco 45 CM' },
          { value: '5',  label: 'Marco 5 CM'  },
        ],
      },
      {
        key: 'hojas',
        label: 'Número de Hojas',
        options: [
          { value: '2', label: '2 Hojas' },
          { value: '3', label: '3 Hojas' },
          { value: '4', label: '4 Hojas' },
        ],
      },
    ],
    resolve: {
      '45_2': 'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 45 CM',
      '45_3': 'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 45 CM',
      '45_4': 'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 45 CM',
      '5_2':  'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 5 CM',
      '5_3':  'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 5 CM',
      '5_4':  'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 5 CM',
    },
    resolveKey: (variants) => `${variants.marco}_${variants.hojas}`,
  },
];

// ─── Tipos simples (sin agrupación — se muestran tal cual en el selector) ──────
// Todos los tipos que NO pertenecen a ningún grupo
export const SIMPLE_TYPE_NAMES = [
  'MARCO FIJO',
  'PUERTA ANDINA',
  'PUERTA DE LUJO',
  'VENTANA ABATIBLE',
  'VENTANA PROYECTABLE',
];

// ─── buildSelectorList ────────────────────────────────────────────────────────
// Construye la lista que se muestra en el <select> principal.
// Devuelve: [...grupos, ...tipos simples] ordenados.
export function buildSelectorList(windowTypes) {
  const items = [];

  // Primero los grupos
  WINDOW_GROUPS.forEach(group => {
    items.push({
      id:           group.id,
      displayName:  group.displayName,
      isGroup:      true,
      windowTypeId: null,
    });
  });

  // Luego los tipos simples — solo los que coincidan con SIMPLE_TYPE_NAMES
  windowTypes.forEach(wt => {
    if (SIMPLE_TYPE_NAMES.includes(wt.name)) {
      items.push({
        id:           `simple_${wt.id}`,
        displayName:  wt.name,
        isGroup:      false,
        windowTypeId: wt.id,
      });
    }
  });

  return items;
}

// ─── resolveWindowTypeId ──────────────────────────────────────────────────────
// Dado un groupId y los valores de los steps, resuelve el window_type_id real.
// Devuelve null si los steps no están completos todavía.
export function resolveWindowTypeId(groupId, variantValues, windowTypes) {
  const group = WINDOW_GROUPS.find(g => g.id === groupId);
  if (!group) return null;

  // Verificar que todos los steps tienen valor
  const allFilled = group.steps.every(step => variantValues[step.key]);
  if (!allFilled) return null;

  const resolveKey = group.resolveKey(variantValues);
  const targetName = group.resolve[resolveKey];
  if (!targetName) return null;

  const wt = windowTypes.find(w => w.name === targetName);
  return wt?.id ?? null;
}

// ─── findGroupAndVariants ─────────────────────────────────────────────────────
// Al cargar una cotización existente, recupera el groupId y variantValues
// a partir del window_type_id guardado en BD.
// Necesario para que el selector muestre correctamente la selección previa.
export function findGroupAndVariants(windowTypeId, windowTypes) {
  if (!windowTypeId || !windowTypes?.length) return null;

  const wt = windowTypes.find(w => w.id === windowTypeId);
  if (!wt) return null;

  for (const group of WINDOW_GROUPS) {
    for (const [key, name] of Object.entries(group.resolve)) {
      if (name === wt.name) {
        // Reconstruir variantValues desde la key (ej: "45_2" → {marco: "45", hojas: "2"})
        const parts = key.split('_');
        const variantValues = {};
        group.steps.forEach((step, i) => {
          variantValues[step.key] = parts[i];
        });
        return { groupId: group.id, variantValues };
      }
    }
  }

  // No pertenece a ningún grupo — es simple
  return null;
}