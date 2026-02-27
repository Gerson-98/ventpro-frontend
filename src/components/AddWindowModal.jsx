// RUTA: src/components/AddWindowModal.jsx

import { useState, useEffect } from "react";
import api from "@/services/api";
import { FaPlus, FaTrashAlt, FaClone, FaUpload, FaCheckCircle, FaCalculator } from 'react-icons/fa';

// --- CONSTANTES DE MAPEADO ---
const PUERTA_CORREDIZA_BASE_NAME = 'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 45 CM';
const TIPO_CIERRE_CORREDIZA_MAP = { chapa_ambas_hojas: 'CHAPA AMBAS HOJAS', chapa_una_hoja: 'CHAPA EN 1 HOJA', solo_cerrojo: 'SOLO CERROJO' };
const PUERTA_ANDINA_BASE_NAME = 'PUERTA ANDINA';
const DISENO_ANDINA_MAP = { con_diseno: 'CON DISEÑO', lisa: 'LISA' };
const SEGURO_ANDINA_MAP = { chapa_bola: 'CHAPA DE BOLA', chapa_manecilla: 'CHAPA DE MANECILLA' };
const VENTANA_PROYECTABLE_BASE_NAME = 'VENTANA PROYECTABLE';
const TIPO_APERTURA_PROYECTABLE_MAP = { afuera: 'AFUERA', adentro: 'ADENTRO' };
const PUERTA_3H_MARCO_45_BASE_NAME = 'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 45 CM';
const PUERTA_3H_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 3 HOJAS 66 CM MARCO 5 CM';
const VENTANA_3H_MARCO_45_BASE_NAME = 'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 45 CM';
const VENTANA_3H_MARCO_5_BASE_NAME = 'VENTANA CORREDIZA 3 HOJAS 55 CM MARCO 5 CM';
const TIPO_VARIANTE_3H_MAP = { tres_iguales: '3 IGUALES', laterales_ocultos: 'LATERALES OCULTOS' };
const PUERTA_CORREDIZA_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 2 HOJAS 66 CM MARCO 5 CM';
const PUERTA_4H_MARCO_45_BASE_NAME = 'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 45 CM';
const PUERTA_4H_MARCO_5_BASE_NAME = 'PUERTA CORREDIZA 4 HOJAS 66 CM MARCO 5 CM';
const TIPO_CIERRE_4H_MAP = { chapa_llave: 'CHAPA DE LLAVE', chapa_interna: 'CHAPA INTERNA', solo_cerrojo: 'SOLO CERROJO' };
const PUERTA_LUJO_BASE_NAME = 'PUERTA DE LUJO';
const LUJO_CANTIDAD_HOJAS_MAP = { '1': '1 HOJA', '2': '2 HOJAS' };
const LUJO_ESTILO_MAP = { con_diseno: 'CON DISEÑO', lisa: 'LISA' };
const LUJO_TIPO_PERFIL_MAP = { adentro: 'HOJA DE LUJO ADENTRO', afuera: 'HOJA DE LUJO AFUERA' };
const VENTANA_ABATIBLE_BASE_NAME = 'VENTANA ABATIBLE';
const ABATIBLE_CANTIDAD_MAP = { '1': '1 HOJA', '2': '2 HOJAS' };
const ABATIBLE_PERFIL_MAP = { adentro: 'ABATIBLE ADENTRO', afuera: 'ABATIBLE AFUERA' };

export default function AddWindowModal({ orderId, onClose, onSave }) {
  const [windowTypes, setWindowTypes] = useState([]);
  const [pvcColors, setPvcColors] = useState([]);
  const [glassColors, setGlassColors] = useState([]);
  const [realGlassTypes, setRealGlassTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalPricePerM2, setGlobalPricePerM2] = useState("");
  const [windows, setWindows] = useState([{
    tempId: Date.now(),
    window_type_id: "",
    color_id: "",
    glass_color_id: "",
    width_cm: "",
    height_cm: "",
    quantity: 1,
    price_per_m2: "",
    options: {},
    displayName: "",
    fileToUpload: null,
    previewCortes: null
  }]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [pvcRes, glassRes, typesRes] = await Promise.all([
          api.get("/pvc-colors"),
          api.get("/glass-colors"),
          api.get("/window-types")
        ]);
        setPvcColors(pvcRes.data || []);
        setGlassColors(glassRes.data || []);
        setWindowTypes(typesRes.data || []);
        setRealGlassTypes((glassRes.data || []).filter(g =>
          g.name.toUpperCase() !== 'DUELA' && g.name.toUpperCase() !== 'VIDRIO Y DUELA'
        ));

      } catch (error) { console.error("❌ Error catálogos:", error); }
    };
    fetchCatalogs();
  }, []);

  const addWindow = () => {
    setWindows(prev => [...prev, {
      tempId: Date.now() + Math.random(),
      window_type_id: "",
      color_id: "",
      glass_color_id: "",
      width_cm: "",
      height_cm: "",
      quantity: 1,
      price_per_m2: "", // Precio manual por m2
      options: {},
      displayName: "",
      fileToUpload: null,
      previewCortes: null
    }]);
  };

  const removeWindow = (index) => {
    // No permitir borrar si solo queda una
    if (windows.length > 1) {
      setWindows(prev => prev.filter((_, i) => i !== index));
    }
  };

  const duplicateWindow = (index) => {
    const win = windows[index];
    setWindows(prev => [
      ...prev.slice(0, index + 1),
      { ...win, tempId: Date.now() + Math.random(), fileToUpload: null },
      ...prev.slice(index + 1)
    ]);
  };

  const handleWindowChange = async (index, field, value) => {
    const updated = [...windows];
    updated[index][field] = value;

    if (field === 'window_type_id') {
      const selectedType = windowTypes.find(wt => wt.id === Number(value));
      updated[index].displayName = selectedType?.name || '';
      updated[index].options = {};
      // Lógica de auto-poblado de opciones basada en nombre
      const typeName = selectedType?.name || '';
      if (typeName.startsWith(PUERTA_CORREDIZA_BASE_NAME) || typeName.startsWith(PUERTA_CORREDIZA_MARCO_5_BASE_NAME)) {
        if (typeName.includes('CHAPA AMBAS HOJAS')) updated[index].options.tipo_cierre = 'chapa_ambas_hojas';
        else if (typeName.includes('CHAPA EN 1 HOJA')) updated[index].options.tipo_cierre = 'chapa_una_hoja';
        else if (typeName.includes('SOLO CERROJO')) updated[index].options.tipo_cierre = 'solo_cerrojo';
      }
    }

    setWindows(updated);

    // Si cambian dimensiones o tipo, pedir cortes al servidor (solo para preview visual)
    if (['width_cm', 'height_cm', 'window_type_id'].includes(field)) {
      const win = updated[index];
      if (win.window_type_id && win.width_cm && win.height_cm) {
        try {
          const res = await api.post('/windows/calculate-preview', {
            window_type_id: Number(win.window_type_id),
            width_cm: Number(win.width_cm),
            height_cm: Number(win.height_cm),
            options: win.options
          });
          updated[index].previewCortes = res.data;
          setWindows([...updated]);
        } catch (e) { console.error(e); }
      }
    }
  };

  const handleOptionChange = (index, optName, optValue) => {
    const updated = [...windows];
    updated[index].options = { ...updated[index].options, [optName]: optValue };

    // Re-construir DisplayName dinámico
    const type = windowTypes.find(t => t.id === Number(updated[index].window_type_id));
    const typeName = type?.name || "";
    let finalName = typeName;

    if (typeName === PUERTA_ANDINA_BASE_NAME) {
      finalName = [PUERTA_ANDINA_BASE_NAME, DISENO_ANDINA_MAP[updated[index].options.diseno], SEGURO_ANDINA_MAP[updated[index].options.tipo_seguro]].filter(Boolean).join(' ');
    } else if (typeName.startsWith(PUERTA_CORREDIZA_BASE_NAME)) {
      finalName = `${PUERTA_CORREDIZA_BASE_NAME} ${TIPO_CIERRE_CORREDIZA_MAP[updated[index].options.tipo_cierre] || ''}`.trim();
    } // ... (resto de condiciones iguales a cotización)

    updated[index].displayName = finalName;
    setWindows(updated);
  };

  const calculateTotal = () => {
    return windows.reduce((acc, win) => {
      const w = (parseFloat(win.width_cm) || 0) / 100;
      const h = (parseFloat(win.height_cm) || 0) / 100;
      const q = parseInt(win.quantity) || 0;
      const p = parseFloat(win.price_per_m2) || parseFloat(globalPricePerM2) || 0;
      return acc + (w * h * q * p);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      for (const win of windows) {
        const w_m = (parseFloat(win.width_cm) || 0) / 100;
        const h_m = (parseFloat(win.height_cm) || 0) / 100;
        const p_m2 = parseFloat(win.price_per_m2) || parseFloat(globalPricePerM2) || 0;

        const payload = {
          order_id: Number(orderId),
          width_cm: Number(win.width_cm),
          height_cm: Number(win.height_cm),
          quantity: Number(win.quantity),
          window_type_id: Number(win.window_type_id),
          color_id: Number(win.color_id),
          glass_color_id: win.glass_color_id ? Number(win.glass_color_id) : null,
          options: win.options,
          price: Number((w_m * h_m * p_m2).toFixed(2)), // Precio unitario final calculado
          displayName: win.displayName
        };

        const res = await api.post("/windows", payload);
        if (win.fileToUpload && res.data.id) {
          const formData = new FormData();
          formData.append('file', win.fileToUpload);
          await api.post(`/uploads/order-window-design/${res.data.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }
      onSave();
      onClose();
    } catch (error) {
      alert("Error al guardar.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[98vw] max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Configuración de Pedido #{orderId}</h2>
            <p className="text-sm text-gray-500">Define medidas y precios para fabricación.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <label className="block text-[10px] font-bold text-blue-600 uppercase">Precio Global m²</label>
              <input type="number" value={globalPricePerM2} onChange={(e) => setGlobalPricePerM2(e.target.value)} className="w-32 bg-transparent text-lg font-bold outline-none" placeholder="Q 0.00" />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl transition-colors">&times;</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                <tr className="text-gray-600 uppercase text-[11px] font-bold">
                  <th className="p-3 text-left border-b w-72">Tipo / Descripción</th>
                  <th className="p-3 text-center border-b w-40">Medidas (cm)</th>
                  <th className="p-3 text-center border-b w-20">Cant.</th>
                  <th className="p-3 text-center border-b w-36">Precio m²</th>
                  <th className="p-3 text-left border-b">Opciones y Colores</th>
                  <th className="p-3 text-right border-b w-32">Subtotal</th>
                  <th className="p-3 text-center border-b w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {windows.map((win, index) => {
                  const type = windowTypes.find(t => t.id === Number(win.window_type_id));
                  const typeName = type?.name || "";
                  const area = ((parseFloat(win.width_cm) || 0) * (parseFloat(win.height_cm) || 0)) / 10000;
                  const currentPriceM2 = win.price_per_m2 || globalPricePerM2 || 0;
                  const rowTotal = area * (parseInt(win.quantity) || 0) * (parseFloat(currentPriceM2) || 0);

                  return (
                    <tr key={win.tempId} className="hover:bg-blue-50/20 transition-colors align-top">
                      <td className="p-3">
                        <select value={win.window_type_id} onChange={(e) => handleWindowChange(index, 'window_type_id', e.target.value)} className="w-full p-2 border rounded-lg bg-white mb-1 font-medium" required>
                          <option value="">Seleccione tipo...</option>
                          {windowTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div className="text-[10px] text-blue-600 font-bold px-1">{win.displayName}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 items-center bg-gray-50 p-1 rounded-lg">
                          <input type="number" placeholder="An" value={win.width_cm} onChange={(e) => handleWindowChange(index, 'width_cm', e.target.value)} className="w-full p-1 bg-transparent text-center font-mono" required />
                          <span className="text-gray-400">×</span>
                          <input type="number" placeholder="Al" value={win.height_cm} onChange={(e) => handleWindowChange(index, 'height_cm', e.target.value)} className="w-full p-1 bg-transparent text-center font-mono" required />
                        </div>
                        {win.previewCortes && (
                          <div className="text-[9px] text-gray-400 mt-1 flex justify-between px-1 uppercase font-bold">
                            <span>V: {win.previewCortes.vidrioAncho}x{win.previewCortes.vidrioAlto}</span>
                            <span>H: {win.previewCortes.hojaAncho}x{win.previewCortes.hojaAlto}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <input type="number" value={win.quantity} onChange={(e) => handleWindowChange(index, 'quantity', e.target.value)} className="w-full p-2 border rounded-lg text-center font-bold" min="1" required />
                      </td>
                      <td className="p-3">
                        <input type="number" placeholder={globalPricePerM2 || "0.00"} value={win.price_per_m2} onChange={(e) => handleWindowChange(index, 'price_per_m2', e.target.value)} className="w-full p-2 border rounded-lg text-center font-mono text-blue-700 font-bold" />
                      </td>
                      <td className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select value={win.color_id} onChange={(e) => handleWindowChange(index, 'color_id', e.target.value)} className="p-1 border rounded text-[11px]" required>
                            <option value="">PVC...</option>
                            {pvcColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select value={win.glass_color_id} onChange={(e) => handleWindowChange(index, 'glass_color_id', e.target.value)} className="p-1 border rounded text-[11px]" required>
                            <option value="">Vidrio...</option>
                            {glassColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        {/* Selects de opciones dinámicas según tipo (igual que en cotización) */}
                        {typeName.includes("ANDINA") && (
                          <div className="flex gap-1">
                            <select value={win.options.diseno || ''} onChange={(e) => handleOptionChange(index, 'diseno', e.target.value)} className="w-1/2 p-1 border rounded text-[10px]">
                              <option value="">Diseño...</option>
                              {Object.entries(DISENO_ANDINA_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            {(typeName === PUERTA_ANDINA_BASE_NAME || typeName === PUERTA_LUJO_BASE_NAME) && win.options.diseno === 'con_diseno' && (
                              <label className="flex items-center justify-center border rounded p-1 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors">
                                <FaUpload className="text-blue-600" />
                                <input type="file" className="hidden" onChange={(e) => {
                                  const upd = [...windows];
                                  upd[index].fileToUpload = e.target.files[0];
                                  setWindows(upd);
                                }} />
                              </label>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-gray-700">
                        Q {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-3 text-gray-400">
                          <button type="button" onClick={() => duplicateWindow(index)} title="Duplicar" className="hover:text-blue-600 transition-transform active:scale-90"><FaClone /></button>
                          <button type="button" onClick={() => removeWindow(index)} title="Eliminar" className="hover:text-red-500 transition-transform active:scale-90"><FaTrashAlt /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between items-center bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
            <button type="button" onClick={addWindow} className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all border border-white/20">
              <FaPlus /> Añadir Fila
            </button>
            <div className="flex items-baseline gap-4">
              <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total Pedido:</span>
              <span className="text-4xl font-black font-mono text-blue-400">
                Q {calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
            <button type="submit" disabled={loading || windows.length === 0} className="px-12 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:bg-gray-300">
              {loading ? 'PROCESANDO...' : 'GUARDAR PEDIDO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}