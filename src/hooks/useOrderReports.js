import { useState } from "react";
import api from "@/services/api";

export default function useOrderReports(id) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({});
  const [isReportLoading, setIsReportLoading] = useState(false);

  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationData, setOptimizationData] = useState({});
  const [isOptimizationLoading, setIsOptimizationLoading] = useState(false);

  const handleGenerateReport = async () => {
    setIsReportLoading(true);
    setShowReportModal(true);
    try {
      const response = await api.get(`/reports/order/${id}/profiles`);
      setReportData(response.data);
    } catch (error) {
      console.error("Error al generar el reporte:", error);
      alert("No se pudo generar el reporte. Inténtalo de nuevo.");
      setShowReportModal(false);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleOptimizeCuts = async () => {
    setIsOptimizationLoading(true);
    setShowOptimizationModal(true);
    try {
      const response = await api.get(`/reports/order/${id}/optimize-cuts`);
      setOptimizationData(response.data);
    } catch (error) {
      console.error("Error al optimizar los cortes:", error);
      alert("No se pudo generar el plan de corte. Inténtalo de nuevo.");
      setShowOptimizationModal(false);
    } finally {
      setIsOptimizationLoading(false);
    }
  };

  return {
    handleGenerateReport,
    handleOptimizeCuts,
    showReportModal,
    setShowReportModal,
    reportData,
    isReportLoading,
    showOptimizationModal,
    setShowOptimizationModal,
    optimizationData,
    isOptimizationLoading,
  };
}
