import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "@/services/api";

// ── Caché en memoria con TTL de 5 minutos ──────────────────────────────────
// Los catálogos (window-types, pvc-colors, glass-colors, clients) cambian
// muy rara vez durante una sesión. Antes el modal de cotizaciones recargaba
// los mismos endpoints en cada apertura, lo que generaba ráfagas que podían
// disparar 429. Ahora todo se centraliza acá y los componentes consumen
// directamente sin volver a pegarle al backend.
// ──────────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;
const catalogCache = {
  data: null,
  timestamp: null,
};
const isCacheValid = () =>
  catalogCache.data !== null &&
  catalogCache.timestamp !== null &&
  Date.now() - catalogCache.timestamp < CACHE_TTL_MS;

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [windowTypes, setWindowTypes] = useState([]);
  const [pvcColors, setPvcColors] = useState([]);
  const [glassColors, setGlassColors] = useState([]);
  const [clients, setClients] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retryCatalogs = useCallback(() => {
    catalogCache.data = null;
    catalogCache.timestamp = null;
    setCatalogError(null);
    setLoadingCatalogs(true);
    setRetryCount(c => c + 1);
  }, []);

  // Invalida el cache y vuelve a cargar. Para usar cuando se crea/edita
  // un cliente o tipo de ventana desde otra pantalla.
  const invalidateCatalogs = useCallback(() => {
    catalogCache.data = null;
    catalogCache.timestamp = null;
    setRetryCount(c => c + 1);
  }, []);

  // Inserción optimista — evita que el select de clientes parpadee mientras
  // se ejecuta el refetch tras crear un cliente nuevo desde el modal.
  const addClient = useCallback((newClient) => {
    if (!newClient || newClient.id == null) return;
    setClients(prev => {
      if (prev.some(c => c.id === newClient.id)) return prev;
      const next = [...prev, newClient];
      if (catalogCache.data) catalogCache.data = { ...catalogCache.data, clients: next };
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchCatalogs = async () => {
      if (isCacheValid() && retryCount === 0) {
        setWindowTypes(catalogCache.data.windowTypes);
        setPvcColors(catalogCache.data.pvcColors);
        setGlassColors(catalogCache.data.glassColors);
        setClients(catalogCache.data.clients);
        setLoadingCatalogs(false);
        return;
      }
      try {
        const [types, pvc, glass, cli] = await Promise.all([
          api.get("/window-types"),
          api.get("/pvc-colors"),
          api.get("/glass-colors"),
          api.get("/clients"),
        ]);
        if (cancelled) return;
        const wt = Array.isArray(types.data) ? types.data : [];
        const pc = Array.isArray(pvc.data) ? pvc.data : [];
        const gc = Array.isArray(glass.data) ? glass.data : [];
        const cl = Array.isArray(cli.data) ? cli.data : [];
        catalogCache.data = { windowTypes: wt, pvcColors: pc, glassColors: gc, clients: cl };
        catalogCache.timestamp = Date.now();
        setWindowTypes(wt);
        setPvcColors(pc);
        setGlassColors(gc);
        setClients(cl);
        setCatalogError(null);
      } catch (err) {
        if (!cancelled) {
          setCatalogError('No se pudieron cargar los catálogos. Verifica tu conexión.');
        }
      } finally {
        if (!cancelled) setLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
    return () => { cancelled = true; };
  }, [retryCount]);

  // realGlassTypes excluye "DUELA" y "VIDRIO Y DUELA" — usado por el modal.
  const realGlassTypes = useMemo(
    () => glassColors.filter(g => {
      const name = (g?.name || '').toUpperCase();
      return name !== 'DUELA' && name !== 'VIDRIO Y DUELA';
    }),
    [glassColors]
  );

  const value = {
    windowTypes,
    pvcColors,
    glassColors,
    realGlassTypes,
    clients,
    loadingCatalogs,
    catalogError,
    retryCatalogs,
    invalidateCatalogs,
    addClient,
  };

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog debe usarse dentro de <CatalogProvider>");
  return ctx;
}
