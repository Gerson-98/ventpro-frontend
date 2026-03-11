import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/services/api";

export default function useOrderData(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef(null);

  const fetchOrder = useCallback(async (signal) => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`, { signal });
      setOrder(res.data);
    } catch (err) {
      // Ignora errores de cancelación — ocurren al navegar antes de que llegue la respuesta
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Error al obtener pedido:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    fetchOrder(controller.signal);
    // Cleanup: cancela la petición si el componente se desmonta o cambia el id
    return () => controller.abort();
  }, [fetchOrder]);

  const refetch = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    fetchOrder(controller.signal);
  }, [fetchOrder]);

  return { order, setOrder, loading, refetch };
}