import { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/api";

// ── Caché en memoria con TTL de 5 minutos ──────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const catalogCache = {
  data: null,
  timestamp: null,
};
const isCacheValid = () =>
  catalogCache.data !== null &&
  catalogCache.timestamp !== null &&
  Date.now() - catalogCache.timestamp < CACHE_TTL_MS;
// ────────────────────────────────────────────────────────

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [windowTypes, setWindowTypes] = useState([]);
  const [pvcColors, setPvcColors] = useState([]);
  const [glassColors, setGlassColors] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retryCatalogs = () => {
    setCatalogError(null);
    setLoadingCatalogs(true);
    setRetryCount(c => c + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchCatalogs = async () => {
      // Si el caché es válido, úsalo sin llamar a la API
      if (isCacheValid() && retryCount === 0) {
        setWindowTypes(catalogCache.data.windowTypes);
        setPvcColors(catalogCache.data.pvcColors);
        setGlassColors(catalogCache.data.glassColors);
        setLoadingCatalogs(false);
        return;
      }
      try {
        const [types, pvc, glass] = await Promise.all([
          api.get("/window-types"),
          api.get("/pvc-colors"),
          api.get("/glass-colors"),
        ]);
        if (cancelled) return;
        const windowTypes = Array.isArray(types.data) ? types.data : [];
        const pvcColors = Array.isArray(pvc.data) ? pvc.data : [];
        const glassColors = Array.isArray(glass.data) ? glass.data : [];
        // Guardar en caché
        catalogCache.data = { windowTypes, pvcColors, glassColors };
        catalogCache.timestamp = Date.now();
        setWindowTypes(windowTypes);
        setPvcColors(pvcColors);
        setGlassColors(glassColors);
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

  return (
    <CatalogContext.Provider value={{ windowTypes, pvcColors, glassColors, loadingCatalogs, catalogError, retryCatalogs }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog debe usarse dentro de <CatalogProvider>");
  return ctx;
}
