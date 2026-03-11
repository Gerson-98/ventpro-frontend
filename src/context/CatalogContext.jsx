import { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/api";

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
      try {
        const [types, pvc, glass] = await Promise.all([
          api.get("/window-types"),
          api.get("/pvc-colors"),
          api.get("/glass-colors"),
        ]);
        if (cancelled) return;
        setWindowTypes(Array.isArray(types.data) ? types.data : []);
        setPvcColors(Array.isArray(pvc.data) ? pvc.data : []);
        setGlassColors(Array.isArray(glass.data) ? glass.data : []);
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
