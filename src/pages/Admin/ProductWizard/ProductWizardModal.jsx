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
import CollapsibleSection, { CollapsibleChevron } from "./CollapsibleSection";
import InfoTip from "./InfoTip";

const STEPS = [
  { id: 1, label: "Datos básicos" },
  { id: 2, label: "Perfiles" },
  { id: 3, label: "Vidrio" },
  { id: 4, label: "Accesorios" },
  { id: 5, label: "Vista previa" },
  { id: 6, label: "Guardar" },
];

const EMPTY_PERFIL = { material_id: "", piezasAncho: 2, piezasAlto: 2, formulaAncho: [], formulaAlto: [], variantes: [] };

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
    vidrio: { usesGlass: false, cant_vidrios: 1, formulaAncho: [], formulaAlto: [], variantes: [] },
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

  // ── Estado de secciones plegables (paso 2/3/4) ─────────────────────────────
  // Todas arrancan cerradas siempre, incluso al editar un producto con datos
  // ya cargados — el usuario las despliega a propósito con el chevron.
  const [openPerfiles, setOpenPerfiles] = useState({
    MARCO: false,
    HOJA: false,
    TAPAJAMBA: false,
    BATIENTE: false,
    MOSQUITERO: false,
    REFUERZOS: false,
  });
  const [vidrioOpen, setVidrioOpen] = useState(false);
  const [openAccesorios, setOpenAccesorios] = useState({});
  // Bloques colapsables del Paso 4, uno por option_group (más "Siempre
  // incluidos"). Sin entrada todavía -> se decide en el render: cerrado si
  // estamos editando un tipo ya existente (para no abrumar con 20 bloques
  // abiertos), abierto si es la primera vez que aparece ese grupo (alta nueva).
  const [openAccesorioGroups, setOpenAccesorioGroups] = useState({});

  const setPerfilOpen = (slot, val) => setOpenPerfiles((prev) => ({ ...prev, [slot]: val }));
  const isAccesorioGroupOpen = (key) =>
    openAccesorioGroups[key] ?? (key === "_always" ? true : !editingId);
  const setAccesorioGroupOpen = (key, val) =>
    setOpenAccesorioGroups((prev) => ({ ...prev, [key]: val }));

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
              variantes: (p.variantes || []).map((v) => ({
                option_group: v.option_group,
                option_key: v.option_key,
                option_category: v.option_category,
                piezasAncho: v.piezasAncho,
                piezasAlto: v.piezasAlto,
                formulaAncho: v.formulaAncho || [],
                formulaAlto: v.formulaAlto || [],
              })),
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
              variantes: (product.vidrio?.variantes || []).map((v) => ({
                option_group: v.option_group,
                option_key: v.option_key,
                option_category: v.option_category,
                piezasAncho: v.piezasAncho,
                piezasAlto: v.piezasAlto,
                formulaAncho: v.formulaAncho || [],
                formulaAlto: v.formulaAlto || [],
              })),
            },
            accesorios: (product.accesorios || []).map((a) => ({
              material_id: String(a.material_id),
              quantity: a.quantity,
              required: a.required ?? true,
              option_group: a.option_group || "",
              option_key: a.option_key || "",
              option_category: a.option_category || "",
              formula_type: a.formula_type,
              formula_slot: a.formula_slot,
              formula_factor: a.formula_factor,
            })),
            refuerzoHojaMaterialId: product.refuerzoHojaMaterialId ? String(product.refuerzoHojaMaterialId) : "",
            refuerzoMosquiteroMaterialId: product.refuerzoMosquiteroMaterialId ? String(product.refuerzoMosquiteroMaterialId) : "",
          });

          // Todas las secciones arrancan cerradas también en modo edición —
          // el usuario decide cuáles desplegar, sin importar qué traiga
          // configurado el producto.
          setOpenAccesorios(
            Object.fromEntries((product.accesorios || []).map((_, i) => [i, false]))
          );
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
        variantes: (p.variantes || [])
          .filter((v) => v.option_group && (v.option_key || v.option_category))
          .map((v) => ({
            option_group: v.option_group,
            option_key: v.option_category ? undefined : v.option_key,
            option_category: v.option_category || undefined,
            piezasAncho: v.piezasAncho != null ? Number(v.piezasAncho) : undefined,
            piezasAlto: v.piezasAlto != null ? Number(v.piezasAlto) : undefined,
            formulaAncho: v.formulaAncho,
            formulaAlto: v.formulaAlto,
          })),
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
            variantes: (data.vidrio.variantes || [])
              .filter((v) => v.option_group && (v.option_key || v.option_category))
              .map((v) => ({
                option_group: v.option_group,
                option_key: v.option_category ? undefined : v.option_key,
                option_category: v.option_category || undefined,
                piezasAncho: v.piezasAncho != null ? Number(v.piezasAncho) : undefined,
                piezasAlto: v.piezasAlto != null ? Number(v.piezasAlto) : undefined,
                formulaAncho: v.formulaAncho,
                formulaAlto: v.formulaAlto,
              })),
          }
        : { usesGlass: false },
      accesorios: data.accesorios
        .filter((a) => a.material_id)
        .map((a) => ({
          material_id: Number(a.material_id),
          quantity: a.formula_type ? undefined : (Number(a.quantity) || 1),
          required: a.required !== false,
          option_group: a.option_group || undefined,
          option_key: a.option_group && !a.option_category ? (a.option_key || undefined) : undefined,
          option_category: a.option_group && a.option_category ? a.option_category : undefined,
          formula_type: a.formula_type || undefined,
          formula_slot: a.formula_type ? a.formula_slot : undefined,
          formula_factor: a.formula_type ? Number(a.formula_factor) || 0 : undefined,
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
      const accName = accessoryMaterials.find(m => String(m.id) === a.material_id)?.name || "";
      if (!a.material_id) errs.push("Hay un accesorio sin seleccionar.");
      else if (a.formula_type) {
        if (!a.formula_factor || a.formula_factor <= 0) errs.push(`El accesorio "${accName}" necesita un factor de fórmula mayor a 0.`);
      } else if (!a.quantity || a.quantity <= 0) {
        errs.push(`El accesorio "${accName}" necesita una cantidad mayor a 0.`);
      }
      if (a.option_group && !!a.option_key === !!a.option_category) errs.push(`El accesorio "${accName}" tiene una condición incompleta.`);
    }
    for (const slot of Object.keys(data.perfiles)) {
      for (const v of data.perfiles[slot].variantes || []) {
        if (!v.option_group || !!v.option_key === !!v.option_category) errs.push(`"${slot}" tiene una variante sin grupo u opción seleccionada.`);
      }
    }
    for (const v of data.vidrio.variantes || []) {
      if (!v.option_group || !!v.option_key === !!v.option_category) errs.push('El vidrio tiene una variante sin grupo u opción seleccionada.');
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
      setPreviewResult(res);
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

  // ── Variantes condicionales (perfiles y vidrio comparten esta lógica) ─────
  // target = { slot: "MARCO" } para un perfil, o { slot: null } para el vidrio.
  const getVariantes = (target) => (target.slot ? data.perfiles[target.slot].variantes : data.vidrio.variantes) || [];

  const setVariantes = (target, next) => {
    if (target.slot) {
      updatePerfil(target.slot, { variantes: next });
    } else {
      setData((prev) => ({ ...prev, vidrio: { ...prev.vidrio, variantes: next } }));
    }
  };

  const addVariante = (target) => {
    setVariantes(target, [...getVariantes(target), { option_group: "", option_key: "", formulaAncho: [], formulaAlto: [] }]);
  };

  const updateVariante = (target, idx, patch) => {
    setVariantes(target, getVariantes(target).map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeVariante = (target, idx) => {
    setVariantes(target, getVariantes(target).filter((_, i) => i !== idx));
  };

  // ── Crear un grupo de opción nuevo sin salir del asistente ─────────────────
  // Antes había que ir primero a "Opciones del Cotizador" a crear el grupo y
  // sus valores, y luego a "Asignación de Opciones" para que apareciera en el
  // cotizador de este tipo — dos pantallas aparte solo para poder referenciarlo
  // acá. Ahora se crea al vuelo: se guarda de inmediato en el catálogo global
  // (para poder reutilizarse en otros productos) y la asignación al tipo de
  // ventana queda implícita al guardar el producto (ver
  // ProductWizardService.syncOptionGroupAssignments en el backend).
  const slugify = (s) =>
    (s || "")
      .toString()
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // quitar acentos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const [newGroupDrafts, setNewGroupDrafts] = useState({});
  const [newGroupSaving, setNewGroupSaving] = useState({});
  const [newGroupError, setNewGroupError] = useState({});

  const varianteKey = (target, idx) => `${target.slot || "VIDRIO"}:${idx}`;

  // ── Editor de categorías de un grupo existente (agrupar valores puntuales
  // bajo una etiqueta común, ej. "1_hoja", para poder condicionar variantes
  // y accesorios por categoría en vez de por cada valor individual) ─────────
  const [categoryPanelOpen, setCategoryPanelOpen] = useState({});
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [categorySaving, setCategorySaving] = useState({});
  const [categoryMsg, setCategoryMsg] = useState({});

  const toggleCategoryPanel = (groupKey) => {
    setCategoryPanelOpen((prev) => {
      const opening = !prev[groupKey];
      if (opening) {
        const group = optionGroups.find((g) => g.key === groupKey);
        setCategoryDrafts((d) => ({
          ...d,
          [groupKey]: Object.fromEntries((group?.values || []).map((v) => [v.id, v.category || ""])),
        }));
        setCategoryMsg((m) => ({ ...m, [groupKey]: "" }));
      }
      return { ...prev, [groupKey]: opening };
    });
  };

  const updateCategoryDraft = (groupKey, valueId, val) => {
    setCategoryDrafts((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], [valueId]: val },
    }));
  };

  const saveCategoryDrafts = async (groupKey) => {
    const group = optionGroups.find((g) => g.key === groupKey);
    if (!group) return;
    const draft = categoryDrafts[groupKey] || {};
    setCategorySaving((prev) => ({ ...prev, [groupKey]: true }));
    setCategoryMsg((prev) => ({ ...prev, [groupKey]: "" }));
    try {
      const changed = group.values.filter((v) => (draft[v.id] ?? "") !== (v.category || ""));
      for (const val of changed) {
        const newCat = draft[val.id]?.trim() || null;
        await api.patch(`/option-values/${val.id}`, { category: newCat });
      }
      setOptionGroups((prev) =>
        prev.map((g) =>
          g.key !== groupKey
            ? g
            : { ...g, values: g.values.map((v) => ({ ...v, category: draft[v.id]?.trim() || null })) }
        )
      );
      setCategoryMsg((prev) => ({ ...prev, [groupKey]: "Categorías guardadas." }));
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudieron guardar las categorías.";
      setCategoryMsg((prev) => ({ ...prev, [groupKey]: Array.isArray(msg) ? msg.join(", ") : msg }));
    } finally {
      setCategorySaving((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  const renderCategoryEditor = (groupKey) => {
    const group = optionGroups.find((g) => g.key === groupKey);
    if (!group) return null;
    const isOpen = !!categoryPanelOpen[groupKey];
    return (
      <div className="text-xs flex items-center">
        <button
          type="button"
          onClick={() => toggleCategoryPanel(groupKey)}
          className="text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          {isOpen ? "Ocultar categorías de este grupo" : "Editar categorías de este grupo"}
        </button>
        <InfoTip text='Ponle una etiqueta corta a cada valor (ej. "1_hoja") para poder agruparlos después. Ej: si tienes 9 tipos de chapa distintos pero solo importa si van en 1 o 2 hojas, etiqueta cada chapa con "1_hoja" o "2_hojas" — se hace una sola vez y se reutiliza en cualquier tipo de ventana que use este mismo grupo.' />
        {isOpen && (
          <div className="mt-1.5 border border-gray-200 bg-gray-50 rounded-lg p-2.5 space-y-2">
            <p className="text-[11px] text-gray-500">
              Agrupa valores bajo una misma categoría (ej. "1_hoja") para poder elegir toda la
              categoría en vez de un valor puntual, tanto acá como en accesorios condicionados.
            </p>
            <table className="w-full text-[11px]">
              <tbody>
                {group.values.map((val) => (
                  <tr key={val.id}>
                    <td className="py-1 pr-2 text-gray-700 align-middle">{val.label}</td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={categoryDrafts[groupKey]?.[val.id] ?? (val.category || "")}
                        onChange={(e) => updateCategoryDraft(groupKey, val.id, e.target.value)}
                        placeholder="Sin categoría"
                        className="w-full border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categoryMsg[groupKey] && (
              <p className={`text-[11px] ${categoryMsg[groupKey].includes("guardad") ? "text-emerald-600" : "text-red-600"}`}>
                {categoryMsg[groupKey]}
              </p>
            )}
            <button
              type="button"
              disabled={categorySaving[groupKey]}
              onClick={() => saveCategoryDrafts(groupKey)}
              className="text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50 px-3 py-1.5 rounded-lg"
            >
              {categorySaving[groupKey] ? "Guardando..." : "Guardar categorías"}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Selector de modo "Un valor específico" / "Una categoría" para
  // condicionar variantes y accesorios ───────────────────────────────────────
  const renderValueOrCategorySelect = ({
    groupKey,
    mode,
    valueVal,
    categoryVal,
    onModeChange,
    onValueChange,
    onCategoryChange,
  }) => {
    const group = optionGroups.find((g) => g.key === groupKey);
    const categories = [...new Set((group?.values || []).map((v) => v.category).filter(Boolean))];
    return (
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onModeChange("value")}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              mode === "value" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-300"
            }`}
          >
            Un valor específico
          </button>
          <button
            type="button"
            onClick={() => onModeChange("category")}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              mode === "category" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-300"
            }`}
          >
            Una categoría
          </button>
          <InfoTip text='"Un valor específico" reacciona a UNA sola opción (ej. solo "Chapa con llave simple"). "Una categoría" reacciona a VARIOS valores agrupados a la vez (ej. las 4 chapas que sean "1 hoja"), sin tener que repetir la misma condición una por una.' />
        </div>
        {mode === "category" ? (
          categories.length > 0 ? (
            <select
              value={categoryVal || ""}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5"
            >
              <option value="">Selecciona la categoría...</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <p className="text-[11px] text-amber-600">
              Este grupo no tiene categorías asignadas todavía. Usa "Editar categorías de este grupo" para crearlas.
            </p>
          )
        ) : (
          <select
            value={valueVal || ""}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5"
          >
            <option value="">Selecciona el valor...</option>
            {(group?.values || []).map((val) => (
              <option key={val.key} value={val.key}>{val.label}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const startNewGroup = (target, idx) => {
    const k = varianteKey(target, idx);
    setNewGroupDrafts((prev) => ({ ...prev, [k]: { label: "", values: [{ label: "" }, { label: "" }] } }));
    setNewGroupError((prev) => ({ ...prev, [k]: "" }));
  };

  const cancelNewGroup = (target, idx) => {
    const k = varianteKey(target, idx);
    setNewGroupDrafts((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const updateNewGroupDraft = (target, idx, patch) => {
    const k = varianteKey(target, idx);
    setNewGroupDrafts((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
  };

  const updateNewGroupValue = (target, idx, valIdx, label) => {
    const k = varianteKey(target, idx);
    setNewGroupDrafts((prev) => ({
      ...prev,
      [k]: { ...prev[k], values: prev[k].values.map((v, i) => (i === valIdx ? { label } : v)) },
    }));
  };

  const addNewGroupValue = (target, idx) => {
    const k = varianteKey(target, idx);
    setNewGroupDrafts((prev) => ({ ...prev, [k]: { ...prev[k], values: [...prev[k].values, { label: "" }] } }));
  };

  const removeNewGroupValue = (target, idx, valIdx) => {
    const k = varianteKey(target, idx);
    setNewGroupDrafts((prev) => ({ ...prev, [k]: { ...prev[k], values: prev[k].values.filter((_, i) => i !== valIdx) } }));
  };

  const saveNewGroup = async (target, idx) => {
    const k = varianteKey(target, idx);
    const draft = newGroupDrafts[k];
    if (!draft) return;

    const label = draft.label.trim();
    const values = draft.values.map((v) => v.label.trim()).filter(Boolean);
    if (!label) {
      setNewGroupError((prev) => ({ ...prev, [k]: "Ponle un nombre al grupo." }));
      return;
    }
    if (values.length < 2) {
      setNewGroupError((prev) => ({ ...prev, [k]: "Agrega al menos 2 valores para elegir entre ellos." }));
      return;
    }
    const key = slugify(label);
    if (!key) {
      setNewGroupError((prev) => ({ ...prev, [k]: "Ese nombre no genera un identificador válido, prueba con otro." }));
      return;
    }

    setNewGroupSaving((prev) => ({ ...prev, [k]: true }));
    setNewGroupError((prev) => ({ ...prev, [k]: "" }));
    try {
      const { data: group } = await api.post("/option-groups", { key, label });
      const createdValues = [];
      for (const vLabel of values) {
        const { data: val } = await api.post("/option-values", {
          group_id: group.id,
          key: slugify(vLabel),
          label: vLabel,
        });
        createdValues.push(val);
      }
      const fullGroup = { ...group, values: createdValues };
      setOptionGroups((prev) => [...prev, fullGroup]);
      updateVariante(target, idx, { option_group: fullGroup.key, option_key: "" });
      cancelNewGroup(target, idx);
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo crear el grupo.";
      setNewGroupError((prev) => ({ ...prev, [k]: Array.isArray(msg) ? msg.join(", ") : msg }));
    } finally {
      setNewGroupSaving((prev) => ({ ...prev, [k]: false }));
    }
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
    setData((prev) => {
      const idx = prev.accesorios.length;
      setOpenAccesorios((o) => ({ ...o, [idx]: true }));
      return {
        ...prev,
        accesorios: [...prev.accesorios, { material_id: "", quantity: 1, required: true }],
      };
    });
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

  // Sección "Variantes por opción" — reutilizada por cada perfil y por el
  // vidrio. Cada variante reemplaza la fórmula por defecto SOLO cuando el
  // cliente elige esa opción en el cotizador (ej. "con 2 hojas divide entre
  // 2, con 1 hoja no divide").
  const renderVariantesSection = (target, defaultFormulaAncho, defaultFormulaAlto) => {
    const variantes = getVariantes(target);
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-amber-800 flex items-center">
            Variantes por opción <span className="font-normal text-amber-600">(opcional)</span>
            <InfoTip text='Usa esto cuando la fórmula de corte deba cambiar según lo que el vendedor elija en el cotizador (ej. "con 2 hojas divide el ancho entre 2, con 1 hoja no"). Si esta pieza se corta siempre igual, no toques esta sección.' />
          </p>
          <button
            type="button"
            onClick={() => addVariante(target)}
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            <FaPlus size={9} /> Añadir variante
          </button>
        </div>
        <p className="text-[11px] text-amber-700">
          Usa esto solo si la fórmula cambia según una opción del cotizador (ej. "cantidad de hojas": con 1
          no se divide, con 2 sí). Si no aplica, ignora esta sección.
        </p>
        {variantes.map((v, idx) => {
          const k = varianteKey(target, idx);
          const draft = newGroupDrafts[k];
          return (
          <div key={idx} className="bg-white border border-amber-200 rounded-lg p-2 space-y-2">
            {draft ? (
              <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-2.5 space-y-2">
                <p className="text-xs font-semibold text-amber-800">Nuevo grupo de opción</p>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Nombre del grupo (ej. "Tipo de Cierre")</label>
                  <input
                    type="text"
                    value={draft.label}
                    onChange={(e) => updateNewGroupDraft(target, idx, { label: e.target.value })}
                    placeholder="Nombre del grupo"
                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Valores que el vendedor podrá elegir</label>
                  <div className="space-y-1">
                    {draft.values.map((val, vIdx) => (
                      <div key={vIdx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={val.label}
                          onChange={(e) => updateNewGroupValue(target, idx, vIdx, e.target.value)}
                          placeholder={`Valor ${vIdx + 1}`}
                          className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5"
                        />
                        {draft.values.length > 2 && (
                          <button type="button" onClick={() => removeNewGroupValue(target, idx, vIdx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                            <FaTrashAlt size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addNewGroupValue(target, idx)}
                    className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-medium"
                  >
                    <FaPlus size={8} /> Añadir valor
                  </button>
                </div>
                {newGroupError[k] && (
                  <p className="text-[11px] text-red-600">{newGroupError[k]}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={newGroupSaving[k]}
                    onClick={() => saveNewGroup(target, idx)}
                    className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                  >
                    {newGroupSaving[k] ? "Creando..." : "Crear grupo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelNewGroup(target, idx)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={v.option_group || ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      startNewGroup(target, idx);
                      return;
                    }
                    updateVariante(target, idx, { option_group: e.target.value, option_key: "" });
                  }}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 flex-1"
                >
                  <option value="">Selecciona el grupo de opción...</option>
                  {optionGroups.map((g) => (
                    <option key={g.id} value={g.key}>{g.label}</option>
                  ))}
                  <option value="__new__">+ Crear grupo nuevo...</option>
                </select>
                {v.option_group && (
                  <div className="flex-1">
                    {renderValueOrCategorySelect({
                      groupKey: v.option_group,
                      mode: v._mode || (v.option_category ? "category" : "value"),
                      valueVal: v.option_key,
                      categoryVal: v.option_category,
                      onModeChange: (mode) =>
                        updateVariante(target, idx, mode === "value"
                          ? { _mode: "value", option_category: undefined }
                          : { _mode: "category", option_key: undefined }),
                      onValueChange: (key) => updateVariante(target, idx, { option_key: key, option_category: undefined, _mode: "value" }),
                      onCategoryChange: (cat) => updateVariante(target, idx, { option_category: cat, option_key: undefined, _mode: "category" }),
                    })}
                  </div>
                )}
                <button type="button" onClick={() => removeVariante(target, idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <FaTrashAlt size={12} />
                </button>
              </div>
            )}
            {v.option_group && !draft && renderCategoryEditor(v.option_group)}
            <FormulaBuilder
              label="Fórmula de ancho para esta variante"
              origenLabel="Ancho"
              steps={v.formulaAncho ?? defaultFormulaAncho}
              onChange={(steps) => updateVariante(target, idx, { formulaAncho: steps })}
              exampleBase={Number(exampleWidth) || 100}
            />
            <FormulaBuilder
              label="Fórmula de alto para esta variante"
              origenLabel="Alto"
              steps={v.formulaAlto ?? defaultFormulaAlto}
              onChange={(steps) => updateVariante(target, idx, { formulaAlto: steps })}
              exampleBase={Number(exampleHeight) || 150}
            />
          </div>
          );
        })}
      </div>
    );
  };

  // Fila individual de un accesorio (Paso 4). Recibe el ÍNDICE del array
  // original data.accesorios — nunca un índice relativo a un grupo — para
  // que updateAccesorio/removeAccesorio sigan apuntando a la fila correcta
  // sin importar en qué bloque colapsable se esté mostrando visualmente.
  const renderAccesorioRow = (idx) => {
    const a = data.accesorios[idx];
    const usesFormula = !!a.formula_type;
    const isOpen = openAccesorios[idx] ?? false;
    const setOpen = (v) => setOpenAccesorios((o) => ({ ...o, [idx]: v }));

    // Etiqueta visible sin tener que expandir la fila: aclara si esta
    // condición es "por categoría" (agrupa varios valores, ej. CREMONA) o
    // "por un valor puntual" (ej. cada chapa específica) — para que se note
    // a simple vista cuál es cuál.
    const condGroup = optionGroups.find((g) => g.key === a.option_group);
    const condBadge = a.option_group ? (
      a.option_category ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
          categoría: {a.option_category}
          <InfoTip text={`Este accesorio se agrega para CUALQUIER valor de "${condGroup?.label || a.option_group}" que esté etiquetado con la categoría "${a.option_category}" — agrupa varios valores a la vez (ej. varios tipos de chapa que cuentan como "2 hojas").`} />
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600 border border-gray-200 flex-shrink-0">
          valor: {condGroup?.values.find((v) => v.key === a.option_key)?.label || a.option_key}
          <InfoTip text={`Este accesorio se agrega SOLO cuando "${condGroup?.label || a.option_group}" es exactamente "${condGroup?.values.find((v) => v.key === a.option_key)?.label || a.option_key}" — un único valor puntual, no una categoría.`} />
        </span>
      )
    ) : null;

    return (
      <div key={idx} className="border border-gray-200 rounded-lg p-2 space-y-2 bg-white">
        {condBadge && <div className="flex">{condBadge}</div>}
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
          {!usesFormula && (
            <input
              type="number"
              min={1}
              value={a.quantity}
              onChange={(e) => updateAccesorio(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
              className="w-20 border border-gray-300 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              title="Cantidad por ventana"
            />
          )}
          <CollapsibleChevron open={isOpen} onClick={() => setOpen(!isOpen)} />
          <button
            type="button"
            onClick={() => removeAccesorio(idx)}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <FaTrashAlt size={13} />
          </button>
        </div>

        <CollapsibleSection open={isOpen} onToggle={setOpen}>
          {/* ── Cantidad: fija, o calculada según cuánto material lleve otra pieza ── */}
          <div className="flex items-center gap-1.5 pl-0.5">
            <button
              type="button"
              onClick={() => updateAccesorio(idx, { formula_type: undefined, formula_slot: undefined, formula_factor: undefined, quantity: a.quantity || 1 })}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                !usesFormula ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-300"
              }`}
            >
              Cantidad fija
            </button>
            <button
              type="button"
              onClick={() => updateAccesorio(idx, { formula_type: 'PER_BARRA', formula_slot: 'hoja', formula_factor: 1 })}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                usesFormula ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-500 border-gray-300"
              }`}
            >
              Por fórmula
            </button>
          </div>
          {usesFormula && (
            <div className="flex items-center gap-2 pl-0.5 flex-wrap text-xs bg-purple-50 border border-purple-100 rounded-lg p-2">
              <span className="text-purple-700">Cantidad =</span>
              <select
                value={a.formula_type}
                onChange={(e) => updateAccesorio(idx, { formula_type: e.target.value })}
                className="border border-purple-200 rounded px-1.5 py-1"
              >
                <option value="PER_BARRA">barras</option>
                <option value="PER_M2">m²</option>
              </select>
              <span className="text-purple-700">de</span>
              <select
                value={a.formula_slot}
                onChange={(e) => updateAccesorio(idx, { formula_slot: e.target.value })}
                className="border border-purple-200 rounded px-1.5 py-1"
              >
                <option value="marco">Marco</option>
                <option value="hoja">Hoja</option>
                <option value="mosquitero">Mosquitero</option>
                <option value="batiente">Batiente</option>
                <option value="tapajamba">Tapajamba</option>
              </select>
              <span className="text-purple-700">×</span>
              <input
                type="number"
                step="any"
                value={a.formula_factor}
                onChange={(e) => updateAccesorio(idx, { formula_factor: parseFloat(e.target.value) || 0 })}
                className="w-16 border border-purple-200 rounded px-1.5 py-1 text-center"
              />
              <span className="text-purple-700">(redondeado hacia arriba)</span>
            </div>
          )}

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
          <div className="flex items-start gap-2 pl-0.5 pt-1 border-t border-gray-100">
            <select
              value={a.option_group || ""}
              onChange={(e) => {
                const group = e.target.value;
                updateAccesorio(idx, { option_group: group, option_key: "", option_category: "" });
              }}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Siempre se agrega</option>
              {optionGroups.map((g) => (
                <option key={g.id} value={g.key}>Solo si: {g.label}</option>
              ))}
            </select>
            {a.option_group && (
              <div className="flex-1 space-y-1">
                {renderValueOrCategorySelect({
                  groupKey: a.option_group,
                  mode: a._mode || (a.option_category ? "category" : "value"),
                  valueVal: a.option_key,
                  categoryVal: a.option_category,
                  onModeChange: (mode) =>
                    updateAccesorio(idx, mode === "value"
                      ? { _mode: "value", option_category: "" }
                      : { _mode: "category", option_key: "" }),
                  onValueChange: (key) => updateAccesorio(idx, { option_key: key, option_category: "", _mode: "value" }),
                  onCategoryChange: (cat) => updateAccesorio(idx, { option_category: cat, option_key: "", _mode: "category" }),
                })}
                {renderCategoryEditor(a.option_group)}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    );
  };

  const renderPerfilCard = (slot, title, optional) => {
    const p = data.perfiles[slot];
    const disabled = optional && !p.enabled;
    const isOpen = openPerfiles[slot];
    return (
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 text-sm">
            {title} {!optional && <span className="text-red-500">*</span>}
          </h4>
          <div className="flex items-center gap-3">
            {optional && (
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={!!p.enabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePerfil(slot, { enabled: checked });
                    if (checked) setPerfilOpen(slot, true);
                  }}
                />
                Este producto usa {title.toLowerCase()}
              </label>
            )}
            {!disabled && (
              <CollapsibleChevron open={isOpen} onClick={() => setPerfilOpen(slot, !isOpen)} />
            )}
          </div>
        </div>

        {!disabled && (
          <CollapsibleSection open={isOpen} onToggle={(v) => setPerfilOpen(slot, v)}>
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
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center">
                  Piezas por ventana
                  <InfoTip text='Cuántos tramos de este perfil se cortan por ventana, en cada sentido. Un marco típico usa 2 piezas de ancho (arriba/abajo) y 2 de alto (los lados) — si necesitas cantidades distintas por lado, usa los checkboxes de abajo.' />
                </label>
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
            {renderVariantesSection({ slot }, p.formulaAncho, p.formulaAlto)}
          </CollapsibleSection>
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
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800 text-sm">
                    Refuerzos <span className="text-gray-400 font-normal">(opcional)</span>
                  </h4>
                  <CollapsibleChevron
                    open={openPerfiles.REFUERZOS}
                    onClick={() => setPerfilOpen("REFUERZOS", !openPerfiles.REFUERZOS)}
                  />
                </div>
                <CollapsibleSection open={openPerfiles.REFUERZOS} onToggle={(v) => setPerfilOpen("REFUERZOS", v)}>
                  <p className="text-xs text-gray-500">
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
                </CollapsibleSection>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">¿Este producto lleva vidrio?</p>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={data.vidrio.usesGlass}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setData((p) => ({ ...p, vidrio: { ...p.vidrio, usesGlass: checked } }));
                      if (checked) setVidrioOpen(true);
                    }}
                  />
                  Sí, este producto lleva vidrio
                </label>
                {data.vidrio.usesGlass && (
                  <CollapsibleChevron open={vidrioOpen} onClick={() => setVidrioOpen((v) => !v)} />
                )}
              </div>

              {data.vidrio.usesGlass && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <CollapsibleSection open={vidrioOpen} onToggle={setVidrioOpen}>
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
                    {renderVariantesSection({ slot: null }, data.vidrio.formulaAncho, data.vidrio.formulaAlto)}
                  </CollapsibleSection>
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

              {(() => {
                // Agrupamos por ÍNDICE del array original (no los objetos),
                // así updateAccesorio(idx, ...) / removeAccesorio(idx) siguen
                // apuntando a la fila correcta sin importar en qué bloque se
                // muestre visualmente. Una fila sin option_group cae en
                // "Siempre incluidos"; en cuanto se le asigna un grupo, en el
                // siguiente render "salta" sola al bloque de ese grupo.
                const alwaysIdxs = [];
                const groupedIdxs = {};
                data.accesorios.forEach((a, idx) => {
                  if (a.option_group) {
                    if (!groupedIdxs[a.option_group]) groupedIdxs[a.option_group] = [];
                    groupedIdxs[a.option_group].push(idx);
                  } else {
                    alwaysIdxs.push(idx);
                  }
                });

                const blocks = [
                  { key: "_always", label: "Siempre incluidos", idxs: alwaysIdxs },
                  ...Object.keys(groupedIdxs).map((groupKey) => {
                    const g = optionGroups.find((og) => og.key === groupKey);
                    return { key: groupKey, label: g?.label || groupKey, idxs: groupedIdxs[groupKey] };
                  }),
                ].filter((block) => block.idxs.length > 0);

                return blocks.map((block) => {
                  const blockOpen = isAccesorioGroupOpen(block.key);
                  return (
                    <div key={block.key} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-700 text-xs">
                          {block.label}
                          <span className="text-gray-400 font-normal"> — {block.idxs.length} accesorio{block.idxs.length === 1 ? "" : "s"}</span>
                        </h4>
                        <CollapsibleChevron
                          open={blockOpen}
                          onClick={() => setAccesorioGroupOpen(block.key, !blockOpen)}
                        />
                      </div>
                      <CollapsibleSection open={blockOpen} onToggle={(v) => setAccesorioGroupOpen(block.key, v)}>
                        <div className="space-y-2">
                          {block.idxs.map((idx) => renderAccesorioRow(idx))}
                        </div>
                      </CollapsibleSection>
                    </div>
                  );
                });
              })()}
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

              {previewResult && previewResult.warnings && previewResult.warnings.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <FaExclamationTriangle size={12} /> Revisar: posibles huecos de configuración
                  </p>
                  <p className="text-[11px] text-amber-700">
                    El sistema detectó posibles huecos de configuración — pueden ser errores reales
                    (como pasó antes con un accesorio que faltaba en una combinación) o normales (ej.
                    varios productos físicos distintos que a propósito solo cubren parte de una
                    categoría cada uno). Revísalos y usa tu criterio.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                    {previewResult.warnings.map((w, wIdx) => (
                      <li key={wIdx}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {previewResult && (
                <div className="space-y-3">
                  {(previewResult.scenarios && previewResult.scenarios.length > 0
                    ? previewResult.scenarios
                    : previewResult.measurements
                    ? [{ label: null, option_group: null, measurements: previewResult.measurements }]
                    : []
                  ).map((scenario, sIdx) => (
                    <div
                      key={sIdx}
                      className={`rounded-lg border overflow-hidden ${
                        scenario.option_group ? "border-blue-300" : "border-gray-200"
                      }`}
                    >
                      {scenario.label && (
                        <div
                          className={`px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                            scenario.option_group ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {scenario.option_group && <FaMagic size={11} />}
                          {scenario.label}
                        </div>
                      )}
                      <div className="overflow-x-auto">
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
                            {Object.entries(scenario.measurements).map(([slot, m]) => (
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
                      {scenario.accesorios && scenario.accesorios.length > 0 && (
                        <div className="border-t border-gray-100 px-3 py-2 space-y-1">
                          <p className="text-[11px] font-semibold text-gray-500">Accesorios en este escenario</p>
                          <ul className="text-xs text-gray-600 space-y-0.5">
                            {scenario.accesorios.map((acc, aIdx) => (
                              <li key={aIdx} className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-700">{acc.materialName}</span>
                                <span className="text-gray-400">
                                  {typeof acc.quantity === "number" ? `x${acc.quantity}` : acc.quantity}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                                    acc.required !== false
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {acc.required !== false ? "obligatorio" : "opcional"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
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
                          const groupLabel = optionGroups.find((g) => g.key === a.option_group)?.label || a.option_group;
                          const cond = a.option_group
                            ? a.option_category
                              ? ` — solo si ${groupLabel} = categoría "${a.option_category}"`
                              : ` — solo si ${groupLabel} = ${optionGroups.find((g) => g.key === a.option_group)?.values.find((v) => v.key === a.option_key)?.label || a.option_key}`
                            : "";
                          const qtyLabel = a.formula_type
                            ? `${a.formula_factor}× ${a.formula_type === "PER_M2" ? "m²" : "barras"} de ${a.formula_slot}`
                            : `x${a.quantity}`;
                          return `${name} ${qtyLabel} (${a.required !== false ? "obligatorio" : "opcional"})${cond}`;
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
