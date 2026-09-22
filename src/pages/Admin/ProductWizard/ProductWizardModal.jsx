// RUTA: src/pages/Admin/ProductWizard/ProductWizardModal.jsx
//
// Asistente paso a paso para crear/editar un tipo de ventana con el motor
// de fórmulas nuevo (calc_engine = "formula"). Reemplaza para estos
// productos el flujo clásico de 6 pestañas separadas (Tipos, Catálogo de
// Perfiles, Ajustes de Cálculo, Reglas de Accesorios...).
//
// Nunca toca productos con calc_engine = "legacy" — el backend ya lo
// garantiza (ProductWizardService.updateProduct lanza si no es "formula"),
// pero además esta pantalla solo se ofrece desde la UI para productos
// nuevos o ya creados con el wizard.

import { useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaTrashAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaMagic,
} from "react-icons/fa";
import api from "@/services/api";
import FormulaBuilder from "./FormulaBuilder";

const STEPS = [
  { id: 1, label: "Datos básicos" },
  { id: 2, label: "Perfiles" },
  { id: 3, label: "Vidrio" },
  { id: 4, label: "Accesorios" },
  { id: 5, label: "Vista previa" },
  { id: 6, label: "Guardar" },
];

const EMPTY_PERFIL = { material_id: "", piezasAncho: 2, piezasAlto: 2, formulaAncho: [], formulaAlto: [] };

function emptyState() {
  return {
    name: "",
    displayName: "",
    series_id: "",
    category_id: "",
    pvcColorIds: [],
    perfiles: {
      MARCO: { ...EMPTY_PERFIL },
      HOJA: { enabled: true, ...EMPTY_PERFIL },
      TAPAJAMBA: { enabled: false, ...EMPTY_PERFIL },
      BATIENTE: { enabled: false, ...EMPTY_PERFIL },
      MOSQUITERO: { enabled: false, ...EMPTY_PERFIL },
    },
    vidrio: { usesGlass: false, cant_vidrios: 1, formulaAncho: [], formulaAlto: [] },
    accesorios: [],
    refuerzoHojaMaterialId: "",
    refuerzoMosquiteroMaterialId: "",
  };
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function ProductWizardModal({ editingId, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [data, setData] = useState(emptyState());

  const [materials, setMaterials] = useState([]);
  const [accessoryMaterials, setAccessoryMaterials] = useState([]);
  const [pvcColors, setPvcColors] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);

  const [exampleWidth, setExampleWidth] = useState(100);
  const [exampleHeight, setExampleHeight] = useState(150);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // ── Carga inicial: catálogos + (si aplica) producto a editar ──────────────
  useEffect(() => {
    (async () => {
      try {
        const [perfilesRes, accesoriosRes, colorsRes, seriesRes, categoriesRes, optionGroupsRes] =
          await Promise.all([
            api.get("/materials", { params: { type: "PERFIL" } }),
            api.get("/materials", { params: { type: "ACCESORIO" } }),
            api.get("/pvc-colors"),
            api.get("/window-series"),
            api.get("/window-categories"),
            api.get("/option-groups"),
          ]);
        setMaterials(perfilesRes.data || []);
        setAccessoryMaterials(accesoriosRes.data || []);
        setPvcColors(colorsRes.data || []);
        setAllSeries(seriesRes.data || []);
        setAllCategories(categoriesRes.data || []);
        setOptionGroups(optionGroupsRes.data || []);

        if (editingId) {
          const { data: product } = await api.get(`/product-wizard/${editingId}`);
          const perfiles = { ...emptyState().perfiles };
          // Los slots opcionales (Hoja/Tapajamba/Batiente) arrancan
          // deshabilitados al precargar — solo se activan si el producto
          // realmente trae ese perfil configurado.
          perfiles.HOJA = { ...perfiles.HOJA, enabled: false };
          perfiles.TAPAJAMBA = { ...perfiles.TAPAJAMBA, enabled: false };
          perfiles.BATIENTE = { ...perfiles.BATIENTE, enabled: false };
          perfiles.MOSQUITERO = { ...perfiles.MOSQUITERO, enabled: false };
          for (const p of product.perfiles) {
            perfiles[p.slot] = {
              enabled: true,
              material_id: String(p.material_id ?? ""),
              piezasAncho: p.piezasAncho ?? 0,
              piezasAlto: p.piezasAlto ?? 0,
              formulaAncho: p.formulaAncho || [],
              formulaAlto: p.formulaAlto || [],
            };
          }
          setData({
            name: product.name,
            displayName: product.displayName || "",
            series_id: product.series_id ? String(product.series_id) : "",
            category_id: product.category_id ? String(product.category_id) : "",
            pvcColorIds: (product.pvcColorIds || []).map(String),
            perfiles,
            vidrio: {
              usesGlass: !!product.vidrio?.usesGlass,
              cant_vidrios: product.vidrio?.cant_vidrios ?? 1,
              formulaAncho: product.vidrio?.formulaAncho || [],
              formulaAlto: product.vidrio?.formulaAlto || [],
            },
            accesorios: (product.accesorios || []).map((a) => ({
              material_id: String(a.material_id),
              quantity: a.quantity,
              required: a.required ?? true,
              option_group: a.option_group || "",
              option_key: a.option_key || "",
            })),
            refuerzoHojaMaterialId: product.refuerzoHojaMaterialId ? String(product.refuerzoHojaMaterialId) : "",
            refuerzoMosquiteroMaterialId: product.refuerzoMosquiteroMaterialId ? String(product.refuerzoMosquiteroMaterialId) : "",
          });
        }
      } catch (err) {
        console.error(err);
        setErrors(["No se pudieron cargar los catálogos necesarios para el asistente."]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const availableCategories = useMemo(() => {
    if (!data.series_id) return allCategories;
    const series = allSeries.find((s) => s.id === Number(data.series_id));
    if (!series?.categories?.length) return allCategories;
    return series.categories.map((sc) => sc.category).filter(Boolean);
  }, [data.series_id, allSeries, allCategories]);

  const materialName = (id) => materials.find((m) => String(m.id) === String(id))?.name;

  // ── Construye el DTO real que espera el backend ────────────────────────────
  const buildDto = () => {
    const perfiles = [];
    for (const slot of ["MARCO", "HOJA", "TAPAJAMBA", "BATIENTE", "MOSQUITERO"]) {
      const p = data.perfiles[slot];
      const isOptional = slot !== "MARCO";
      if (isOptional && !p.enabled) continue;
      perfiles.push({
        slot,
        material_id: Number(p.material_id) || 0,
        piezasAncho: Number(p.piezasAncho) || 0,
        piezasAlto: Number(p.piezasAlto) || 0,
        formulaAncho: p.formulaAncho || [],
        formulaAlto: p.formulaAlto || [],
      });
    }
    return {
      name: data.name.trim(),
      displayName: data.displayName.trim() || undefined,
      series_id: data.series_id ? Number(data.series_id) : undefined,
      category_id: data.category_id ? Number(data.category_id) : undefined,
      pvcColorIds: data.pvcColorIds.map(Number),
      perfiles,
      vidrio: data.vidrio.usesGlass
        ? {
            usesGlass: true,
            cant_vidrios: Number(data.vidrio.cant_vidrios) || 1,
            formulaAncho: data.vidrio.formulaAncho || [],
            formulaAlto: data.vidrio.formulaAlto || [],
          }
        : { usesGlass: false },
      accesorios: data.accesorios
        .filter((a) => a.material_id)
        .map((a) => ({
          material_id: Number(a.material_id),
          quantity: Number(a.quantity) || 1,
          required: a.required !== false,
          option_group: a.option_group || undefined,
          option_key: a.option_key || undefined,
        })),
      refuerzoHojaMaterialId: data.refuerzoHojaMaterialId ? Number(data.refuerzoHojaMaterialId) : undefined,
      refuerzoMosquiteroMaterialId: data.refuerzoMosquiteroMaterialId ? Number(data.refuerzoMosquiteroMaterialId) : undefined,
    };
  };

  // ── Validación de cliente (paso 1-4), previa a llegar a la vista previa ────
  const clientErrors = useMemo(() => {
    const errs = [];
    if (!data.name.trim()) errs.push("El nombre interno es obligatorio.");
    if (data.pvcColorIds.length === 0) errs.push("Debes asociar al menos un color PVC.");
    if (!data.perfiles.MARCO.material_id) errs.push("Debes elegir el perfil de Marco.");
    if (data.perfiles.HOJA.enabled && !data.perfiles.HOJA.material_id)
      errs.push("Activaste Hoja pero no elegiste su perfil.");
    if (data.perfiles.TAPAJAMBA.enabled && !data.perfiles.TAPAJAMBA.material_id)
      errs.push("Activaste Tapajamba pero no elegiste su perfil.");
    if (data.perfiles.BATIENTE.enabled && !data.perfiles.BATIENTE.material_id)
      errs.push("Activaste Batiente pero no elegiste su perfil.");
    if (data.perfiles.MOSQUITERO.enabled && !data.perfiles.MOSQUITERO.material_id)
      errs.push("Activaste Mosquitero pero no elegiste su perfil.");
    if (data.vidrio.usesGlass && (!data.vidrio.cant_vidrios || data.vidrio.cant_vidrios <= 0))
      errs.push("La cantidad de vidrios debe ser mayor a 0.");
    for (const a of data.accesorios) {
      if (!a.material_id) errs.push("Hay un accesorio sin seleccionar.");
      else if (!a.quantity || a.quantity <= 0) errs.push(`El accesorio "${accessoryMaterials.find(m => String(m.id) === a.material_id)?.name || ""}" necesita una cantidad mayor a 0.`);
      if (!!a.option_group !== !!a.option_key) errs.push(`El accesorio "${accessoryMaterials.find(m => String(m.id) === a.material_id)?.name || ""}" tiene una condición incompleta.`);
    }
    return errs;
  }, [data]);

  const goToStep = (n) => {
    setErrors([]);
    setStep(n);
  };

  const handleNext = () => {
    if (step === 4 && clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors([]);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setErrors([]);
    setStep((s) => Math.max(s - 1, 1));
  };

  const runPreview = async () => {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewResult(null);
    try {
      const dto = buildDto();
      const { data: res } = await api.post("/product-wizard/preview", {
        dto,
        width: Number(exampleWidth),
        height: Number(exampleHeight),
      });
      setPreviewResult(res.measurements);
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo calcular la vista previa.";
      setPreviewError(Array.isArray(msg) ? msg.join(" ") : msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    try {
      const dto = buildDto();
      if (editingId) {
        await api.patch(`/product-wizard/${editingId}`, dto);
      } else {
        await api.post("/product-wizard", dto);
      }
      onSaved?.();
    } catch (err) {
      const msg = err?.response?.data?.message || "Error al guardar el producto.";
      setErrors(Array.isArray(msg) ? msg : [msg]);
    } finally {
      setSaving(false);
    }
  };

  const updatePerfil = (slot, patch) => {
    setData((prev) => ({
      ...prev,
      perfiles: { ...prev.perfiles, [slot]: { ...prev.perfiles[slot], ...patch } },
    }));
  };

  const togglePvcColor = (id) => {
    setData((prev) => {
      const idStr = String(id);
      const has = prev.pvcColorIds.includes(idStr);
      return {
        ...prev,
        pvcColorIds: has
          ? prev.pvcColorIds.filter((c) => c !== idStr)
          : [...prev.pvcColorIds, idStr],
      };
    });
  };

  const addAccesorio = () => {
    setData((prev) => ({
      ...prev,
      accesorios: [...prev.accesorios, { material_id: "", quantity: 1, required: true }],
    }));
  };

  const updateAccesorio = (idx, patch) => {
    setData((prev) => ({
      ...prev,
      accesorios: prev.accesorios.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    }));
  };

  const removeAccesorio = (idx) => {
    setData((prev) => ({ ...prev, accesorios: prev.accesorios.filter((_, i) => i !== idx) }));
  };

  const renderPerfilCard = (slot, title, optional) => {
    const p = data.perfiles[slot];
    const disabled = optional && !p.enabled;
    return (
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 text-sm">
            {title} {!optional && <span className="text-red-500">*</span>}
          </h4>
          {optional && (
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={!!p.enabled}
                onChange={(e) => updatePerfil(slot, { enabled: e.target.checked })}
              />
              Este producto usa {title.toLowerCase()}
            </label>
          )}
        </div>

        {!disabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Perfil / material</label>
                <select
                  value={p.material_id}
                  onChange={(e) => updatePerfil(slot, { material_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecciona un perfil...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Piezas por ventana</label>
                <input
                  type="number"
                  min={1}
                  value={p.piezasAncho || p.piezasAlto || 2}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10) || 1;
                    updatePerfil(slot, {
                      piezasAncho: p.piezasAncho > 0 ? n : 0,
                      piezasAlto: p.piezasAlto > 0 ? n : 0,
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-0.5">Ej: un marco típico usa 2 piezas de ancho y 2 de alto.</p>
              </div>
            </div>

            {/* Caso especial: perfiles que solo se cortan en un sentido (ej. la
                Tapajamba de una corrediza típica no lleva corte de ancho). */}
            <div className="flex gap-4 text-xs text-gray-500">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={p.piezasAncho === 0}
                  disabled={p.piezasAlto === 0}
                  onChange={(e) =>
                    updatePerfil(slot, { piezasAncho: e.target.checked ? 0 : (p.piezasAlto || 2) })
                  }
                />
                No lleva corte de ancho
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={p.piezasAlto === 0}
                  disabled={p.piezasAncho === 0}
                  onChange={(e) =>
                    updatePerfil(slot, { piezasAlto: e.target.checked ? 0 : (p.piezasAncho || 2) })
                  }
                />
                No lleva corte de alto
              </label>
            </div>

            {p.piezasAncho > 0 && (
              <FormulaBuilder
                label="Fórmula de ancho"
                origenLabel="Ancho"
                steps={p.formulaAncho}
                onChange={(steps) => updatePerfil(slot, { formulaAncho: steps })}
                exampleBase={Number(exampleWidth) || 100}
              />
            )}
            {p.piezasAlto > 0 && (
              <FormulaBuilder
                label="Fórmula de alto"
                origenLabel="Alto"
                steps={p.formulaAlto}
                onChange={(steps) => updatePerfil(slot, { formulaAlto: steps })}
                exampleBase={Number(exampleHeight) || 150}
              />
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8 flex items-center gap-3 text-gray-500">
          <Spinner /> Cargando asistente...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full flex flex-col rounded-t-2xl sm:rounded-xl h-[95dvh] sm:h-[90vh] sm:max-w-3xl overflow-hidden shadow-2xl border border-gray-100">

        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-4 pb-3 sm:px-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FaMagic className="text-blue-500" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">
              {editingId ? "Editar producto (asistente)" : "Nuevo tipo de ventana — asistente"}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-4 sm:px-6 py-3 border-b border-gray-100 overflow-x-auto flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-shrink-0">
              <button
                type="button"
                onClick={() => (s.id < step ? goToStep(s.id) : null)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  s.id === step
                    ? "bg-blue-600 text-white"
                    : s.id < step
                    ? "bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {s.id < step ? <FaCheckCircle size={11} /> : <span>{s.id}</span>}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <div className="w-3 sm:w-5 h-px bg-gray-200 mx-0.5" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 sm:px-6 sm:py-5 space-y-4">

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Empecemos por lo básico: cómo se llama este producto y en qué serie/categoría vive.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre interno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: VENTANA CORREDIZA 2 HOJAS S88 NUEVA"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre comercial <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={data.displayName}
                  onChange={(e) => setData((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Como lo verá el cliente en la cotización"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serie</label>
                  <select
                    value={data.series_id}
                    onChange={(e) => setData((p) => ({ ...p, series_id: e.target.value, category_id: "" }))}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Sin serie</option>
                    {allSeries.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.displayName || s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={data.category_id}
                    onChange={(e) => setData((p) => ({ ...p, category_id: e.target.value }))}
                    disabled={availableCategories.length === 0}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Sin categoría</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.displayName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colores PVC disponibles <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {pvcColors.map((c) => {
                    const checked = data.pvcColorIds.includes(String(c.id));
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => togglePvcColor(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          checked
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Elige el perfil de cada pieza y arma su fórmula: a partir del ancho/alto de la ventana,
                encadena las operaciones necesarias para llegar a la medida real de corte.
              </p>
              <div className="grid grid-cols-2 gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                <label className="flex items-center gap-2">
                  Ancho de ejemplo (cm)
                  <input
                    type="number"
                    value={exampleWidth}
                    onChange={(e) => setExampleWidth(e.target.value)}
                    className="w-20 border border-blue-200 rounded px-2 py-1 text-xs"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Alto de ejemplo (cm)
                  <input
                    type="number"
                    value={exampleHeight}
                    onChange={(e) => setExampleHeight(e.target.value)}
                    className="w-20 border border-blue-200 rounded px-2 py-1 text-xs"
                  />
                </label>
              </div>
              {renderPerfilCard("MARCO", "Marco", false)}
              {renderPerfilCard("HOJA", "Hoja", true)}
              {renderPerfilCard("MOSQUITERO", "Mosquitero", true)}
              {renderPerfilCard("TAPAJAMBA", "Tapajamba", true)}
              {renderPerfilCard("BATIENTE", "Batiente", true)}

              {/* ── Refuerzos: reutilizan la medida de Hoja/Mosquitero, no llevan fórmula propia ── */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-gray-800 text-sm">
                  Refuerzos <span className="text-gray-400 font-normal">(opcional)</span>
                </h4>
                <p className="text-xs text-gray-500 -mt-2">
                  Mismo corte que la Hoja o el Mosquitero, pero en otro material. El cotizador
                  los ofrece como agregado opcional.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Refuerzo de Hoja</label>
                    <select
                      value={data.refuerzoHojaMaterialId}
                      onChange={(e) => setData((p) => ({ ...p, refuerzoHojaMaterialId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Sin refuerzo de hoja</option>
                      {materials.map((m) => (
                        <option key={m.id} value={String(m.id)}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Refuerzo de Mosquitero</label>
                    <select
                      value={data.refuerzoMosquiteroMaterialId}
                      onChange={(e) => setData((p) => ({ ...p, refuerzoMosquiteroMaterialId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Sin refuerzo de mosquitero</option>
                      {materials.map((m) => (
                        <option key={m.id} value={String(m.id)}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">¿Este producto lleva vidrio?</p>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={data.vidrio.usesGlass}
                  onChange={(e) =>
                    setData((p) => ({ ...p, vidrio: { ...p.vidrio, usesGlass: e.target.checked } }))
                  }
                />
                Sí, este producto lleva vidrio
              </label>

              {data.vidrio.usesGlass && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cantidad de vidrios por ventana
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={data.vidrio.cant_vidrios}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          vidrio: { ...p.vidrio, cant_vidrios: parseInt(e.target.value, 10) || 1 },
                        }))
                      }
                      className="w-32 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <FormulaBuilder
                    label="Fórmula de ancho del vidrio"
                    origenLabel="Ancho"
                    steps={data.vidrio.formulaAncho}
                    onChange={(steps) => setData((p) => ({ ...p, vidrio: { ...p.vidrio, formulaAncho: steps } }))}
                    exampleBase={Number(exampleWidth) || 100}
                  />
                  <FormulaBuilder
                    label="Fórmula de alto del vidrio"
                    origenLabel="Alto"
                    steps={data.vidrio.formulaAlto}
                    onChange={(steps) => setData((p) => ({ ...p, vidrio: { ...p.vidrio, formulaAlto: steps } }))}
                    exampleBase={Number(exampleHeight) || 150}
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Accesorios de este producto (bisagras, cerraduras, felpa, etc). Marca
                  cada uno como <span className="font-medium text-emerald-600">obligatorio</span> (siempre se agrega)
                  o <span className="font-medium text-amber-600">opcional</span> (se ofrece pero no es forzoso).
                </p>
                <button
                  type="button"
                  onClick={addAccesorio}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0 ml-2"
                >
                  <FaPlus size={10} /> Añadir
                </button>
              </div>

              {data.accesorios.length === 0 && (
                <p className="text-xs text-gray-400 italic">Sin accesorios configurados.</p>
              )}

              {data.accesorios.map((a, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={a.material_id}
                      onChange={(e) => updateAccesorio(idx, { material_id: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Selecciona un accesorio...</option>
                      {accessoryMaterials.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={a.quantity}
                      onChange={(e) => updateAccesorio(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-20 border border-gray-300 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      title="Cantidad por ventana"
                    />
                    <button
                      type="button"
                      onClick={() => removeAccesorio(idx)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                    >
                      <FaTrashAlt size={13} />
                    </button>
                  </div>
                  <div className="flex gap-1.5 pl-0.5">
                    <button
                      type="button"
                      onClick={() => updateAccesorio(idx, { required: true })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        a.required !== false
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-500 border-gray-300"
                      }`}
                    >
                      Obligatorio
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAccesorio(idx, { required: false })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        a.required === false
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-gray-500 border-gray-300"
                      }`}
                    >
                      Opcional
                    </button>
                  </div>

                  {/* ── Condición: siempre, o solo cuando el cliente elige cierta opción ── */}
                  <div className="flex items-center gap-2 pl-0.5 pt-1 border-t border-gray-100">
                    <select
                      value={a.option_group || ""}
                      onChange={(e) => {
                        const group = e.target.value;
                        updateAccesorio(idx, { option_group: group, option_key: "" });
                      }}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Siempre se agrega</option>
                      {optionGroups.map((g) => (
                        <option key={g.id} value={g.key}>Solo si: {g.label}</option>
                      ))}
                    </select>
                    {a.option_group && (
                      <select
                        value={a.option_key || ""}
                        onChange={(e) => updateAccesorio(idx, { option_key: e.target.value })}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
                      >
                        <option value="">Selecciona el valor...</option>
                        {(optionGroups.find((g) => g.key === a.option_group)?.values || []).map((v) => (
                          <option key={v.key} value={v.key}>{v.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Prueba tu configuración con una medida real: verifica que cada pieza salga con la
                medida correcta antes de guardar.
              </p>
              <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ancho (cm)</label>
                  <input
                    type="number"
                    value={exampleWidth}
                    onChange={(e) => setExampleWidth(e.target.value)}
                    className="w-28 border border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alto (cm)</label>
                  <input
                    type="number"
                    value={exampleHeight}
                    onChange={(e) => setExampleHeight(e.target.value)}
                    className="w-28 border border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={runPreview}
                  disabled={previewLoading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {previewLoading ? <><Spinner /> Calculando...</> : "Calcular vista previa"}
                </button>
              </div>

              {previewError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <FaExclamationTriangle size={13} /> {previewError}
                </div>
              )}

              {previewResult && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                      <tr>
                        <th className="py-2 px-3 text-left">Pieza</th>
                        <th className="py-2 px-3 text-right">Ancho de corte</th>
                        <th className="py-2 px-3 text-right">Alto de corte</th>
                        <th className="py-2 px-3 text-right">Piezas ancho</th>
                        <th className="py-2 px-3 text-right">Piezas alto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(previewResult).map(([slot, m]) => (
                        <tr key={slot}>
                          <td className="py-2 px-3 font-medium text-gray-800">{slot}</td>
                          <td className="py-2 px-3 text-right">{m.piezasAncho > 0 ? `${m.ancho} cm` : "—"}</td>
                          <td className="py-2 px-3 text-right">{m.piezasAlto > 0 ? `${m.alto} cm` : "—"}</td>
                          <td className="py-2 px-3 text-right">{m.piezasAncho}</td>
                          <td className="py-2 px-3 text-right">{m.piezasAlto}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Revisa el resumen antes de guardar.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                <p><span className="font-medium text-gray-700">Nombre:</span> {data.name || "—"}</p>
                <p><span className="font-medium text-gray-700">Nombre comercial:</span> {data.displayName || "—"}</p>
                <p>
                  <span className="font-medium text-gray-700">Colores PVC:</span>{" "}
                  {data.pvcColorIds
                    .map((id) => pvcColors.find((c) => String(c.id) === id)?.name)
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Perfiles:</span>{" "}
                  {["MARCO", "HOJA", "MOSQUITERO", "TAPAJAMBA", "BATIENTE"]
                    .filter((s) => s === "MARCO" || data.perfiles[s].enabled)
                    .map((s) => `${s}: ${materialName(data.perfiles[s].material_id) || "sin elegir"}`)
                    .join(" · ")}
                </p>
                {(data.refuerzoHojaMaterialId || data.refuerzoMosquiteroMaterialId) && (
                  <p>
                    <span className="font-medium text-gray-700">Refuerzos:</span>{" "}
                    {[
                      data.refuerzoHojaMaterialId && `Hoja: ${materialName(data.refuerzoHojaMaterialId)}`,
                      data.refuerzoMosquiteroMaterialId && `Mosquitero: ${materialName(data.refuerzoMosquiteroMaterialId)}`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p>
                  <span className="font-medium text-gray-700">Vidrio:</span>{" "}
                  {data.vidrio.usesGlass ? `Sí (${data.vidrio.cant_vidrios} por ventana)` : "No"}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Accesorios:</span>{" "}
                  {data.accesorios.length === 0
                    ? "Ninguno"
                    : data.accesorios
                        .map((a) => {
                          const name = accessoryMaterials.find((m) => String(m.id) === a.material_id)?.name || "?";
                          const cond = a.option_group
                            ? ` — solo si ${optionGroups.find((g) => g.key === a.option_group)?.label || a.option_group} = ${optionGroups.find((g) => g.key === a.option_group)?.values.find((v) => v.key === a.option_key)?.label || a.option_key}`
                            : "";
                          return `${name} x${a.quantity} (${a.required !== false ? "obligatorio" : "opcional"})${cond}`;
                        })
                        .join(", ")}
                </p>
              </div>

              {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <FaExclamationTriangle size={13} /> No se pudo guardar:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Errores de validación de cliente (pasos 1-4) */}
          {errors.length > 0 && step < 6 && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <ul className="list-disc list-inside space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-5 py-4 sm:px-6 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {step === 1 ? "Cancelar" : "Atrás"}
          </button>
          {step < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 transition"
            >
              {saving ? (<><Spinner /> Guardando...</>) : (editingId ? "Guardar cambios" : "Crear producto")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
