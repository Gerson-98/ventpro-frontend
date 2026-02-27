// RUTA: src/pages/OrderDetail.jsx

import { useEffect, useState } from "react";
import { FaUpload, FaFileInvoice } from 'react-icons/fa';
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { FaMoneyBillWave, FaFilePdf, FaArrowLeft, FaFileAlt, FaChartBar, FaPlus, FaTrashAlt, FaEdit, FaClone, FaSave, FaMagic, FaCalendarAlt, FaTimes, FaCamera } from "react-icons/fa";
import AddWindowModal from "@/components/AddWindowModal";
import ProfilesReportModal from "@/components/ProfilesReportModal";
import CutOptimizationModal from "@/components/CutOptimizationModal";
import RescheduleOrderModal from "@/components/RescheduleOrderModal";
import { useAuth } from "@/context/AuthContext";
import { generateDocumentPDF } from '@/lib/generateDocumentPDF';
import ChecklistPanel from '@/components/ChecklistPanel';

const PUERTA_CORREDIZA_BASE_NAME = 'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 45 CM';
const TIPO_CIERRE_CORREDIZA_MAP = {
  chapa_ambas_hojas: 'CHAPA AMBAS HOJAS',
  chapa_una_hoja: 'CHAPA EN 1 HOJA',
  solo_cerrojo: 'SOLO CERROJO'
};

const PUERTA_ANDINA_BASE_NAME = 'PUERTA ANDINA';
const DISENO_ANDINA_MAP = {
  con_diseno: 'CON DISEÑO',
  lisa: 'LISA'
};
const SEGURO_ANDINA_MAP = {
  chapa_bola: 'Chapa de bola',
  chapa_manecilla: 'CHAPA DE MANECILLA'
};

const VENTANA_PROYECTABLE_BASE_NAME = 'VENTANA PROYECTABLE';
const TIPO_APERTURA_PROYECTABLE_MAP = {
  afuera: 'AFUERA',
  adentro: 'ADENTRO'
};
const PUERTA_CORREDIZA_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 5 CM';
const PUERTA_3H_MARCO_45_BASE_NAME = 'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 45 CM';
const PUERTA_3H_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 5 CM';
const VENTANA_3H_MARCO_45_BASE_NAME = 'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 45 CM';
const VENTANA_3H_MARCO_5_BASE_NAME = 'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 5 CM';
const TIPO_VARIANTE_3H_MAP = {
  tres_iguales: '3 IGUALES',
  laterales_ocultos: 'LATERALES OCULTOS'
};
const PUERTA_4H_MARCO_45_BASE_NAME = 'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 45 CM';
const PUERTA_4H_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 5 CM';
const TIPO_CIERRE_4H_MAP = {
  chapa_llave: 'CHAPA DE LLAVE',
  chapa_interna: 'CHAPA INTERNA',
  solo_cerrojo: 'SOLO CERROJO'
};

const ORDER_STATUSES = [
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'en_fabricacion', label: 'En Fabricación' },
  { value: 'listo_para_instalar', label: 'Listo para Instalar' },
  { value: 'en_ruta', label: 'En Ruta' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const STATUS_STYLES = {
  'en_proceso': 'bg-blue-100 text-blue-800 border-blue-300',
  'en_fabricacion': 'bg-orange-100 text-orange-800 border-orange-300',
  'listo_para_instalar': 'bg-purple-100 text-purple-800 border-purple-300',
  'en_ruta': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'completado': 'bg-green-100 text-green-800 border-green-300',
  'cancelado': 'bg-red-100 text-red-800 border-red-300',
  'default': 'bg-gray-100 text-gray-800 border-gray-300',
};

const PUERTA_LUJO_BASE_NAME = 'PUERTA DE LUJO';
const LUJO_CANTIDAD_HOJAS_MAP = {
  '1': '1 HOJA',
  '2': '2 HOJAS'
};
const LUJO_ESTILO_MAP = {
  con_diseno: 'CON DISEÑO',
  lisa: 'LISA'
};
const LUJO_TIPO_PERFIL_MAP = {
  adentro: 'HOJA DE LUJO ADENTRO',
  afuera: 'HOJA DE LUJO AFUERA'
};

const VENTANA_ABATIBLE_BASE_NAME = 'VENTANA ABATIBLE';
const ABATIBLE_CANTIDAD_MAP = {
  '1': '1 HOJA',
  '2': '2 HOJAS'
};
const ABATIBLE_PERFIL_MAP = {
  adentro: 'HOJA ABATIBLE ADENTRO',
  afuera: 'HOJA ABATIBLE AFUERA'
};

// ─── Enum válido de ChecklistType — validación en frontend ───────────────────
const VALID_CHECKLIST_TYPES = ['carga_camion', 'verificacion_instalacion', 'regreso'];

export default function OrderDetail() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [newFileToUpload, setNewFileToUpload] = useState(null);
  const [savingRow, setSavingRow] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({});
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationData, setOptimizationData] = useState({});
  const [isOptimizationLoading, setIsOptimizationLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [windowTypes, setWindowTypes] = useState([]);
  const [pvcColors, setPvcColors] = useState([]);
  const [glassColors, setGlassColors] = useState([]);
  const [realGlassTypes, setRealGlassTypes] = useState([]);
  const [includeIva, setIncludeIva] = useState(false);

  const handleGeneratePDF = () => { generateDocumentPDF(order, 'order'); };

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [types, pvc, glass] = await Promise.all([
          api.get("/window-types"),
          api.get("/pvc-colors"),
          api.get("/glass-colors"),
        ]);
        setWindowTypes(types.data);
        setPvcColors(pvc.data);
        setGlassColors(glass.data);
        const filteredGlasses = glass.data.filter(g =>
          g.name.toUpperCase() !== 'DUELA' && g.name.toUpperCase() !== 'VIDRIO Y DUELA'
        );
        setRealGlassTypes(filteredGlasses);
      } catch (err) {
        console.error("❌ Error cargando catálogos:", err);
      }
    };
    fetchCatalogs();
  }, []);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      const orderData = res.data;
      setOrder(orderData);
      if (orderData.include_iva !== undefined) {
        setIncludeIva(!!orderData.include_iva);
      }
    } catch (err) {
      console.error("❌ Error al obtener pedido:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (order && order.include_iva !== undefined) {
      setIncludeIva(!!order.include_iva);
    }
  }, [order]);

  const formatCurrency = (amount) => `Q ${Number(amount || 0).toFixed(2)}`;

  const formatInstallationDate = (start, end) => {
    if (!start || !end) return "No agendado";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedStart = startDate.toLocaleDateString('es-GT', options);
    const formattedEnd = endDate.toLocaleDateString('es-GT', options);
    if (formattedStart === formattedEnd) return formattedStart;
    return `${formattedStart} - ${formattedEnd}`;
  };

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

  const handleDelete = async (winId) => {
    if (!confirm("¿Seguro que deseas eliminar esta ventana?")) return;
    try {
      await api.delete(`/windows/${winId}`);
      await fetchOrder();
    } catch (err) {
      console.error("❌ Error al eliminar ventana:", err);
      alert("Error al eliminar ventana.");
    }
  };

  const handleDuplicate = async (winId) => {
    try {
      await api.post(`/windows/${winId}/duplicate`);
      await fetchOrder();
    } catch (err) {
      console.error("❌ Error al duplicar ventana:", err);
      alert("No se pudo duplicar la ventana.");
    }
  };

  const startEdit = (win) => {
    setEditingRow(win.id);
    setEditedValues({
      displayName: win.displayName || win.window_type?.name || "",
      width_cm: win.width_cm || 0,
      height_cm: win.height_cm || 0,
      quantity: win.quantity || 1,
      price: win.price || 0,
      window_type_id: win.window_type?.id || "",
      color_id: win.pvcColor?.id || "",
      glass_color_id: win.glassColor?.id || "",
      options: win.options || {},
      design_image_url: win.design_image_url || null,
    });
    setNewFileToUpload(null);
  };

  const handleEditTypeChange = (e) => {
    const { value } = e.target;
    const selectedType = windowTypes.find(wt => wt.id === Number(value));
    const typeName = selectedType?.name || '';
    let newOptions = {};

    if (typeName.startsWith(PUERTA_CORREDIZA_BASE_NAME) || typeName.startsWith(PUERTA_CORREDIZA_MARCO_5_BASE_NAME)) {
      if (typeName.includes('CHAPA AMBAS HOJAS')) newOptions.tipo_cierre = 'chapa_ambas_hojas';
      else if (typeName.includes('CHAPA EN 1 HOJA')) newOptions.tipo_cierre = 'chapa_una_hoja';
      else if (typeName.includes('SOLO CERROJO')) newOptions.tipo_cierre = 'solo_cerrojo';
    }

    if (typeName.startsWith(PUERTA_3H_MARCO_45_BASE_NAME) || typeName.startsWith(PUERTA_3H_MARCO_5_BASE_NAME)) {
      if (typeName.includes('3 IGUALES')) newOptions.tipo_apertura = 'tres_iguales';
      else if (typeName.includes('LATERALES OCULTOS')) newOptions.tipo_apertura = 'laterales_ocultos';
    }

    setEditedValues(prev => {
      const updatedValues = {
        ...prev,
        window_type_id: Number(value),
        options: newOptions,
        displayName: typeName,
      };
      const basePrice = selectedType?.base_price || selectedType?.price || 0;
      let newPrice = prev.price;
      if (basePrice > 0) {
        const width = parseFloat(updatedValues.width_cm || 0);
        const height = parseFloat(updatedValues.height_cm || 0);
        const areaM2 = (width * height) / 10000;
        newPrice = areaM2 * basePrice;
      }
      return { ...updatedValues, price: newPrice };
    });

    setNewFileToUpload(null);
  };

  const handleEditOptionChange = (optionName, optionValue) => {
    const newOptions = { ...editedValues.options, [optionName]: optionValue };
    let newWindowValues = { ...editedValues, options: newOptions };

    const currentType = windowTypes.find(wt => wt.id === Number(newWindowValues.window_type_id));
    const currentTypeName = currentType?.name || '';
    let baseName = '';

    if (currentTypeName.startsWith(VENTANA_3H_MARCO_45_BASE_NAME)) {
      baseName = VENTANA_3H_MARCO_45_BASE_NAME;
    } else if (currentTypeName.startsWith(VENTANA_3H_MARCO_5_BASE_NAME)) {
      baseName = VENTANA_3H_MARCO_5_BASE_NAME;
    } else if (currentTypeName.startsWith(PUERTA_3H_MARCO_45_BASE_NAME)) {
      baseName = PUERTA_3H_MARCO_45_BASE_NAME;
    } else if (currentTypeName.startsWith(PUERTA_3H_MARCO_5_BASE_NAME)) {
      baseName = PUERTA_3H_MARCO_5_BASE_NAME;
    } else if (currentTypeName.startsWith(PUERTA_CORREDIZA_MARCO_5_BASE_NAME)) {
      baseName = PUERTA_CORREDIZA_MARCO_5_BASE_NAME;
    } else if (currentTypeName.startsWith(PUERTA_CORREDIZA_BASE_NAME)) {
      baseName = PUERTA_CORREDIZA_BASE_NAME;
    }

    if (baseName.startsWith('PUERTA CORREDIZA 3 HOJAS') || baseName.startsWith('VENTANA CORREDIZA 3 HOJAS')) {
      const varianteText = TIPO_VARIANTE_3H_MAP[newOptions.tipo_apertura] || '';
      const finalName = [baseName, varianteText].filter(Boolean).join(' ');
      newWindowValues.displayName = finalName;
      const finalType = windowTypes.find(wt => wt.name === finalName);
      if (finalType) newWindowValues.window_type_id = finalType.id;
    } else if (baseName === PUERTA_CORREDIZA_BASE_NAME || baseName === PUERTA_CORREDIZA_MARCO_5_BASE_NAME) {
      const suffix = TIPO_CIERRE_CORREDIZA_MAP[newOptions.tipo_cierre] || '';
      newWindowValues.displayName = `${baseName} ${suffix}`.trim();
    } else if (currentTypeName === PUERTA_ANDINA_BASE_NAME) {
      const disenoText = DISENO_ANDINA_MAP[newOptions.diseno] || '';
      const seguroText = SEGURO_ANDINA_MAP[newOptions.tipo_seguro] || '';
      newWindowValues.displayName = [PUERTA_ANDINA_BASE_NAME, disenoText, seguroText].filter(Boolean).join(' ');
    } else if (currentTypeName === VENTANA_PROYECTABLE_BASE_NAME) {
      const aperturaText = TIPO_APERTURA_PROYECTABLE_MAP[newOptions.tipo_apertura] || '';
      newWindowValues.displayName = [VENTANA_PROYECTABLE_BASE_NAME, aperturaText].filter(Boolean).join(' ');
    } else if (currentTypeName === PUERTA_4H_MARCO_45_BASE_NAME) {
      const suffix = TIPO_CIERRE_4H_MAP[newOptions.tipo_cierre] || '';
      newWindowValues.displayName = `${PUERTA_4H_MARCO_45_BASE_NAME} ${suffix}`.trim();
    } else if (currentTypeName === PUERTA_4H_MARCO_5_BASE_NAME) {
      const suffix = TIPO_CIERRE_4H_MAP[newOptions.tipo_cierre] || '';
      newWindowValues.displayName = `${PUERTA_4H_MARCO_5_BASE_NAME} ${suffix}`.trim();
    } else if (currentTypeName === PUERTA_LUJO_BASE_NAME) {
      const cantidadText = LUJO_CANTIDAD_HOJAS_MAP[newOptions.cantidad_hojas] || '';
      const estiloText = LUJO_ESTILO_MAP[newOptions.diseno] || '';
      const perfilText = LUJO_TIPO_PERFIL_MAP[newOptions.tipo_perfil] || '';
      newWindowValues.displayName = [PUERTA_LUJO_BASE_NAME, cantidadText, estiloText, perfilText].filter(Boolean).join(' ');
    } else if (currentTypeName === VENTANA_ABATIBLE_BASE_NAME) {
      const cantidadText = ABATIBLE_CANTIDAD_MAP[newOptions.cantidad_hojas] || '';
      const perfilText = ABATIBLE_PERFIL_MAP[newOptions.tipo_perfil] || '';
      newWindowValues.displayName = [VENTANA_ABATIBLE_BASE_NAME, cantidadText, perfilText].filter(Boolean).join(' ');
    } else {
      newWindowValues.displayName = currentType?.name || '';
    }

    let currentDesignImage = editedValues.design_image_url;
    if (optionName === 'diseno' && optionValue === 'lisa') {
      currentDesignImage = null;
      setNewFileToUpload(null);
    }

    const basePrice = currentType?.base_price || 0;
    if (basePrice > 0) {
      const area = (parseFloat(newWindowValues.width_cm || 0) * parseFloat(newWindowValues.height_cm || 0)) / 10000;
      newWindowValues.price = area * basePrice;
    }

    setEditedValues({ ...newWindowValues, design_image_url: currentDesignImage });
  };

  // ─── FIX BUG #4: saveChanges recibe winId explícitamente ─────────────────
  const saveChanges = async (winId) => {
    if (!winId) {
      console.error("❌ saveChanges llamado sin winId válido");
      alert("Error interno: no se pudo identificar la ventana a guardar.");
      return;
    }
    try {
      setSavingRow(true);
      const payload = {
        displayName: editedValues.displayName,
        options: editedValues.options,
        width_cm: parseFloat(editedValues.width_cm) || 0,
        height_cm: parseFloat(editedValues.height_cm) || 0,
        quantity: parseInt(editedValues.quantity, 10) || 1,
        price: Number(editedValues.price) > 0 ? parseFloat(editedValues.price) : undefined,
        window_type_id: editedValues.window_type_id ? Number(editedValues.window_type_id) : null,
        color_id: editedValues.color_id ? Number(editedValues.color_id) : null,
        glass_color_id: editedValues.glass_color_id ? Number(editedValues.glass_color_id) : null,
        design_image_url: editedValues.design_image_url,
      };

      await api.put(`/windows/${winId}`, payload);

      if (newFileToUpload) {
        const formData = new FormData();
        formData.append('file', newFileToUpload);
        await api.post(`/uploads/order-window-design/${winId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await fetchOrder();
      setEditingRow(null);
      setEditedValues({});
    } catch (err) {
      console.error("❌ Error al guardar cambios:", err);
      alert("No se pudieron guardar los cambios.");
    } finally {
      setSavingRow(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      setOrder(prevOrder => ({ ...prevOrder, status: newStatus }));
    } catch (error) {
      console.error("❌ Error al actualizar el estado:", error);
      alert("No se pudo actualizar el estado.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleIvaToggle = async () => {
    try {
      const nuevoEstado = !includeIva;
      await api.patch(`/orders/${order.id}`, { include_iva: nuevoEstado });
      setIncludeIva(nuevoEstado);
      await fetchOrder();
    } catch (error) {
      console.error("Error al cambiar IVA", error);
    }
  };

  const updatePriceInState = (values) => {
    const selectedType = windowTypes.find(wt => wt.id === Number(values.window_type_id));
    const basePrice = selectedType?.base_price || selectedType?.price || 0;
    if (basePrice > 0) {
      const width = parseFloat(values.width_cm || 0);
      const height = parseFloat(values.height_cm || 0);
      const areaM2 = (width * height) / 10000;
      return (areaM2 * basePrice).toFixed(2);
    }
    return values.price;
  };

  if (loading) return <p className="p-6 text-gray-600">Cargando pedido...</p>;
  if (!order) return <p className="p-6 text-red-600">Pedido no encontrado.</p>;

  const displayedTotal = includeIva ? (order?.total * 1.12) : order?.total;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-6xl mx-auto mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4">
          <FaArrowLeft /> Volver a Pedidos
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                <FaFileAlt size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{order.project}</h1>
                <p className="text-gray-600">Cliente: {order.client?.name || "N/A"}</p>
                <p className="text-gray-600">Teléfono: {order.client?.phone || "N/A"}</p>
                <p className="text-lg font-semibold text-blue-700 mt-1">{formatCurrency(displayedTotal)}</p>
                {order.generatedFromQuotationId && (
                  <Link to={`/quotations/${order.generatedFromQuotationId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 mt-3 text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <FaFileInvoice />
                      Ver Cotización Original
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg border border-gray-200 mt-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={includeIva}
                      onChange={handleIvaToggle}
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">Incluir IVA en Facturación</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <select
                value={order.status || ''}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus || !isAdmin}
                className={`px-3 py-1 text-sm border rounded-full font-medium appearance-none disabled:opacity-70 disabled:cursor-not-allowed transition-colors ${STATUS_STYLES[order.status] || STATUS_STYLES.default}`}
              >
                {ORDER_STATUSES.map(statusOption => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
              {order.installationStartDate ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FaCalendarAlt />
                    <span>{formatInstallationDate(order.installationStartDate, order.installationEndDate)}</span>
                  </div>
                  {isAdmin && (
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setShowRescheduleModal(true)}>
                      <FaCalendarAlt /> Reprogramar
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">Sin fecha de instalación</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Ventanas del Pedido</h2>
          {isAdmin && (
            <div className="flex gap-2">
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowModal(true)}>
                <FaPlus /> Añadir Ventana
              </Button>
              <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700" onClick={handleGenerateReport}>
                <FaChartBar /> Generar Reporte
              </Button>
              <Button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700" onClick={handleOptimizeCuts}>
                <FaMagic /> Optimizar Cortes
              </Button>
              <Button className="flex items-center gap-2 bg-red-600 hover:bg-red-700" onClick={handleGeneratePDF}>
                <FaFilePdf /> PDF Pedido
              </Button>
            </div>
          )}
        </div>

        {showModal && (
          <AddWindowModal
            orderId={Number(order.id)}
            onClose={() => setShowModal(false)}
            onSave={async () => { setShowModal(false); await fetchOrder(); }}
          />
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm text-gray-800">
            <thead className="bg-gray-100 text-gray-700">
              <tr className="h-12">
                <th className="text-left px-3 py-2 w-[320px]">TIPO</th>
                <th className="text-center px-3 py-2">MEDIDAS (CM)</th>
                <th className="text-center px-3 py-2">HOJA (CM)</th>
                <th className="text-center px-3 py-2">VIDRIO (CM)</th>
                <th className="text-center px-3 py-2">COLOR PVC</th>
                <th className="text-center px-3 py-2">COLOR VIDRIO</th>
                <th className="text-center px-3 py-2">CANT.</th>
                <th className="text-center px-3 py-2">PRECIO</th>
                {isAdmin && <th className="text-center px-3 py-2 w-[120px]">ACCIONES</th>}
              </tr>
            </thead>
            <tbody>
              {/* ─── FIX BUG #4: renombrado 'window' → 'win' en todo el .map() ─── */}
              {(order.windows || []).map((win) => {
                const isEditingThisRow = editingRow === win.id;
                const selectedTypeInEdit = windowTypes.find(wt => wt.id === Number(editedValues.window_type_id));
                const selectedGlassInEdit = glassColors.find(g => g.id === Number(editedValues.glass_color_id));

                const typeNameInEdit = selectedTypeInEdit?.name || '';
                const isPuertaCorredizaInEdit = isEditingThisRow && typeNameInEdit.startsWith(PUERTA_CORREDIZA_BASE_NAME);
                const isPuertaAndinaInEdit = isEditingThisRow && typeNameInEdit.startsWith(PUERTA_ANDINA_BASE_NAME);
                const isVentanaProyectableInEdit = isEditingThisRow && typeNameInEdit.startsWith(VENTANA_PROYECTABLE_BASE_NAME);
                const isPuertaCorredizaMarco5InEdit = isEditingThisRow && typeNameInEdit.startsWith(PUERTA_CORREDIZA_MARCO_5_BASE_NAME);
                const isPuerta3H_Marco45InEdit = isEditingThisRow && typeNameInEdit.startsWith(PUERTA_3H_MARCO_45_BASE_NAME);
                const isPuerta3H_Marco5InEdit = isEditingThisRow && typeNameInEdit.startsWith(PUERTA_3H_MARCO_5_BASE_NAME);
                const isVentana3H_Marco45InEdit = isEditingThisRow && typeNameInEdit.startsWith(VENTANA_3H_MARCO_45_BASE_NAME);
                const isVentana3H_Marco5InEdit = isEditingThisRow && typeNameInEdit.startsWith(VENTANA_3H_MARCO_5_BASE_NAME);
                const needsAdditionalGlassInEdit = isEditingThisRow && selectedGlassInEdit?.name.toUpperCase() === 'VIDRIO Y DUELA';
                const isTipo4HojasInEdit = isEditingThisRow && (typeNameInEdit.startsWith(PUERTA_4H_MARCO_45_BASE_NAME) || typeNameInEdit.startsWith(PUERTA_4H_MARCO_5_BASE_NAME));
                const isPuertaLujoInEdit = isEditingThisRow && typeNameInEdit.startsWith(PUERTA_LUJO_BASE_NAME);
                const isVentanaAbatibleInEdit = isEditingThisRow && typeNameInEdit.startsWith(VENTANA_ABATIBLE_BASE_NAME);

                return (
                  <tr key={win.id} className={`h-14 border-b hover:bg-gray-50 transition-all align-top ${isEditingThisRow ? 'bg-blue-50/30' : ''}`}>
                    {isEditingThisRow ? (
                      <>
                        {/* TIPO */}
                        <td className="px-3 py-2 align-top">
                          <select
                            name="window_type_id"
                            value={editedValues.window_type_id}
                            onChange={handleEditTypeChange}
                            className="w-full text-sm p-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Seleccione...</option>
                            {windowTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                          </select>
                          <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase" title={editedValues.displayName}>
                            {editedValues.displayName?.replace(selectedTypeInEdit?.name || '', '').trim() || 'ESTÁNDAR'}
                          </p>
                        </td>

                        {/* MEDIDAS */}
                        <td className="px-3 py-2 text-center align-top">
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              value={editedValues.width_cm}
                              onChange={(e) => {
                                const nextValues = { ...editedValues, width_cm: e.target.value };
                                const nuevoPrecio = updatePriceInState(nextValues);
                                setEditedValues({ ...nextValues, price: nuevoPrecio });
                              }}
                              className="w-16 text-center text-sm p-1 border border-gray-300 rounded-md"
                            />
                            <span className="text-gray-400">×</span>
                            <input
                              type="number"
                              value={editedValues.height_cm}
                              onChange={(e) => {
                                const nextValues = { ...editedValues, height_cm: e.target.value };
                                const nuevoPrecio = updatePriceInState(nextValues);
                                setEditedValues({ ...nextValues, price: nuevoPrecio });
                              }}
                              className="w-16 text-center text-sm p-1 border border-gray-300 rounded-md"
                            />
                          </div>
                        </td>

                        {/* PRECIO */}
                        <td className="px-3 py-2 text-right align-top font-medium text-gray-900">
                          <input
                            type="number"
                            value={editedValues.price}
                            onChange={(e) => setEditedValues({ ...editedValues, price: e.target.value })}
                            className="w-24 text-right text-sm p-1 border border-gray-300 rounded-md bg-blue-50"
                          />
                        </td>

                        {/* CELDAS AUTO */}
                        <td colSpan={2} className="px-3 py-2 text-center text-gray-400 italic text-xs align-middle">
                          Se recalcula al guardar
                        </td>

                        {/* COLOR PVC */}
                        <td className="px-3 py-2 align-top">
                          <select
                            value={editedValues.color_id}
                            onChange={(e) => setEditedValues(prev => ({ ...prev, color_id: e.target.value }))}
                            className="w-full text-sm p-2 border border-gray-300 rounded-md"
                          >
                            {pvcColors.map(pc => <option key={pc.id} value={pc.id}>{pc.name}</option>)}
                          </select>
                        </td>

                        {/* COLOR VIDRIO + DINÁMICOS */}
                        <td className="px-3 py-2 align-top">
                          <select
                            value={editedValues.glass_color_id}
                            onChange={(e) => setEditedValues(prev => ({ ...prev, glass_color_id: e.target.value }))}
                            className="w-full text-sm p-2 border border-gray-300 rounded-md"
                          >
                            {glassColors.map(gc => <option key={gc.id} value={gc.id}>{gc.name}</option>)}
                          </select>

                          {needsAdditionalGlassInEdit && (
                            <select
                              value={editedValues.options?.vidrio_adicional_id || ''}
                              onChange={(e) => handleEditOptionChange('vidrio_adicional_id', e.target.value)}
                              className="w-full text-sm p-2 border-blue-400 rounded-md mt-2"
                            >
                              <option value="">-- Vidrio Adicional --</option>
                              {realGlassTypes.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
                            </select>
                          )}

                          {(isPuertaCorredizaInEdit || isPuertaCorredizaMarco5InEdit) && (
                            <div className="mt-2">
                              <select
                                value={editedValues.options?.tipo_cierre || ''}
                                onChange={(e) => handleEditOptionChange('tipo_cierre', e.target.value)}
                                className="w-full text-sm p-2 border-gray-300 rounded-md"
                              >
                                <option value="">Tipo de Cierre...</option>
                                {Object.entries(TIPO_CIERRE_CORREDIZA_MAP).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                              </select>
                            </div>
                          )}

                          {(isPuerta3H_Marco45InEdit || isPuerta3H_Marco5InEdit || isVentana3H_Marco45InEdit || isVentana3H_Marco5InEdit) && (
                            <div className="mt-2">
                              <select
                                value={editedValues.options?.tipo_apertura || ''}
                                onChange={(e) => handleEditOptionChange('tipo_apertura', e.target.value)}
                                className="w-full text-sm p-2 border-gray-300 rounded-md"
                              >
                                <option value="">Variante 3H...</option>
                                {Object.entries(TIPO_VARIANTE_3H_MAP).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                              </select>
                            </div>
                          )}

                          {isPuertaAndinaInEdit && (
                            <div className="mt-2 space-y-2">
                              <select value={editedValues.options?.diseno || ''} onChange={(e) => handleEditOptionChange('diseno', e.target.value)} className="w-full text-sm p-2 border-gray-300 rounded-md">
                                <option value="">Estilo...</option>
                                {Object.entries(DISENO_ANDINA_MAP).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                              </select>
                              <select value={editedValues.options?.tipo_seguro || ''} onChange={(e) => handleEditOptionChange('tipo_seguro', e.target.value)} className="w-full text-sm p-2 border-gray-300 rounded-md">
                                <option value="">Seguro...</option>
                                {Object.entries(SEGURO_ANDINA_MAP).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                              </select>
                            </div>
                          )}

                          {isVentanaAbatibleInEdit && (
                            <div className="space-y-2 mt-2">
                              <select value={editedValues.options?.cantidad_hojas || ''} onChange={(e) => handleEditOptionChange('cantidad_hojas', e.target.value)} className="w-full text-sm p-2 border-gray-300 rounded-md">
                                <option value="">Hojas...</option>
                                {Object.entries(ABATIBLE_CANTIDAD_MAP).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                              </select>
                            </div>
                          )}
                        </td>

                        {/* CANTIDAD */}
                        <td className="px-3 py-2 text-center align-top">
                          <input
                            type="number"
                            min="1"
                            value={editedValues.quantity}
                            onChange={(e) => setEditedValues(prev => ({ ...prev, quantity: e.target.value }))}
                            className="w-14 text-center text-sm p-1 border border-gray-300 rounded-md"
                          />
                        </td>

                        {/* PRECIO EDITABLE */}
                        <td className="px-3 py-2 text-center align-top">
                          <input
                            type="number"
                            value={editedValues.price}
                            onChange={(e) => setEditedValues(prev => ({ ...prev, price: e.target.value }))}
                            className="w-24 text-center text-sm p-1 border border-blue-300 bg-blue-50 rounded-md font-bold text-blue-700"
                          />
                        </td>

                        {/* ACCIONES EDICIÓN — FIX: win.id en lugar de window.id */}
                        {isAdmin && (
                          <td className="text-center w-[120px] align-top py-4">
                            <div className="flex justify-center items-center gap-3 text-lg">
                              <button
                                onClick={() => saveChanges(win.id)}
                                disabled={savingRow}
                                className="text-green-600 hover:text-green-800"
                              >
                                {savingRow ? '...' : <FaSave />}
                              </button>
                              <button onClick={() => setEditingRow(null)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        {/* MODO VISTA */}
                        <td className="px-3 py-2 max-w-[320px] align-top">
                          {win.displayName && win.displayName.includes(PUERTA_ANDINA_BASE_NAME) ? (
                            <div>
                              <span className="block font-medium text-gray-800">{PUERTA_ANDINA_BASE_NAME}</span>
                              <span className="block text-gray-500 text-[11px] uppercase">{win.displayName.replace(PUERTA_ANDINA_BASE_NAME, '').trim()}</span>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-800">{win.displayName || win.window_type?.name || "Desconocido"}</span>
                          )}
                        </td>
                        <td className="text-center pt-2 font-semibold text-gray-700">{win.width_cm} × {win.height_cm}</td>
                        <td className="text-center pt-2 text-gray-600">{win.hojaAncho ? `${win.hojaAncho.toFixed(1)}x${win.hojaAlto.toFixed(1)}` : '—'}</td>
                        <td className="text-center pt-2 text-gray-600">{win.vidrioAncho ? `${win.vidrioAncho.toFixed(1)}x${win.vidrioAlto.toFixed(1)}` : '—'}</td>
                        <td className="text-center pt-2">{win.pvcColor?.name || "—"}</td>
                        <td className="text-center pt-2">
                          {(() => {
                            const isVidrioYDuela = win.glassColor?.name.toUpperCase() === 'VIDRIO Y DUELA';
                            const additionalGlassId = win.options?.vidrio_adicional_id;
                            if (isVidrioYDuela && additionalGlassId) {
                              const additionalGlass = glassColors.find(g => g.id === Number(additionalGlassId));
                              return (
                                <div className="leading-tight">
                                  <span className="block text-xs">{win.glassColor.name}</span>
                                  <span className="block text-[10px] text-blue-600 font-bold">/ {additionalGlass?.name || 'N/A'}</span>
                                </div>
                              );
                            }
                            return <span className="text-xs">{win.glassColor?.name || "—"}</span>;
                          })()}
                        </td>
                        <td className="text-center pt-2">{win.quantity || 1}</td>
                        <td className="text-center pt-2 font-bold text-blue-800">{formatCurrency(win.price)}</td>
                        {isAdmin && (
                          <td className="text-center w-[120px] pt-2">
                            <div className="flex justify-center items-center gap-3 text-lg">
                              <button onClick={() => startEdit(win)} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
                              <button onClick={() => handleDelete(win.id)} className="text-red-500 hover:text-red-700"><FaTrashAlt /></button>
                              <button onClick={() => handleDuplicate(win.id)} className="text-gray-400 hover:text-gray-600"><FaClone /></button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      {showReportModal && (
        <ProfilesReportModal
          data={reportData}
          isLoading={isReportLoading}
          onClose={() => setShowReportModal(false)}
          showPrices={false}
          projectName={order?.project}
          orderId={order?.id}
        />
      )}
      {showOptimizationModal && (
        <CutOptimizationModal
          isLoading={isOptimizationLoading}
          optimizationData={optimizationData}
          onClose={() => setShowOptimizationModal(false)}
        />
      )}
      {showRescheduleModal && (
        <RescheduleOrderModal
          open={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          order={order}
          onRescheduleSuccess={() => { setShowRescheduleModal(false); fetchOrder(); }}
        />
      )}

      {/* CHECKLISTS — solo admin, fuera del card de ventanas */}
      {isAdmin && (
        <div className="max-w-6xl mx-auto mt-6">
          <ChecklistPanel orderId={Number(id)} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
}