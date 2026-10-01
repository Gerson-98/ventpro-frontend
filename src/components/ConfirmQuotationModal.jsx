// RUTA: src/components/ConfirmQuotationModal.jsx

import { useState, useEffect } from "react";
import api from "@/services/api";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CalendarCheck2, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "react-day-picker/dist/style.css";

export default function ConfirmQuotationModal({
    open,
    onClose,
    quotationId,
    onConfirmSuccess,
    isReconfirm = false,
    excludeOrderId = null,
    initialDates = null,
}) {
    const [range, setRange] = useState({ from: null, to: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [bookedRanges, setBookedRanges] = useState([]);
    const [isScheduleLoading, setIsScheduleLoading] = useState(true);

    // ── Paso previo obligatorio: el vendedor debe confirmar con el cliente
    // dónde va el marco y si se quitan etiquetas ANTES de poder agendar.
    // Sin esto no se habilita el calendario — evita que se agende "a ciegas"
    // y luego el que instala tenga que llamar al cliente para preguntarlo.
    const MARCO_OPTIONS = [
        { value: "centro", label: "En el centro" },
        { value: "orilla_adentro", label: "A la orilla lado adentro" },
        { value: "orilla_afuera", label: "A la orilla lado afuera" },
        { value: "otro", label: "Otro" },
    ];
    const [step, setStep] = useState("details");
    const [marcoUbicacion, setMarcoUbicacion] = useState([]);
    const [marcoUbicacionOtro, setMarcoUbicacionOtro] = useState("");
    const [quitarEtiquetas, setQuitarEtiquetas] = useState("");
    const [quitarEtiquetasOtro, setQuitarEtiquetasOtro] = useState("");
    const [detailsError, setDetailsError] = useState("");

    const toggleMarcoOption = (value) => {
        setMarcoUbicacion((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
        setDetailsError("");
    };

    const handleContinueFromDetails = () => {
        if (marcoUbicacion.length === 0) {
            setDetailsError("Selecciona al menos una ubicación del marco — llama al cliente si no lo sabes.");
            return;
        }
        if (marcoUbicacion.includes("otro") && !marcoUbicacionOtro.trim()) {
            setDetailsError("Describe la ubicación del marco en el campo de texto.");
            return;
        }
        if (!quitarEtiquetas) {
            setDetailsError("Indica si se van a quitar las etiquetas.");
            return;
        }
        if (quitarEtiquetas === "otro" && !quitarEtiquetasOtro.trim()) {
            setDetailsError("Describe la respuesta sobre las etiquetas en el campo de texto.");
            return;
        }
        setDetailsError("");
        setStep("calendar");
    };

    const buildMarcoUbicacionPayload = () =>
        marcoUbicacion.map((v) =>
            v === "otro" ? marcoUbicacionOtro.trim() : MARCO_OPTIONS.find((o) => o.value === v)?.label
        );

    const buildQuitarEtiquetasPayload = () =>
        quitarEtiquetas === "otro" ? quitarEtiquetasOtro.trim() : quitarEtiquetas === "si" ? "Sí" : "No";

    useEffect(() => {
        if (!open) return;
        setStep("details");
        setMarcoUbicacion([]);
        setMarcoUbicacionOtro("");
        setQuitarEtiquetas("");
        setQuitarEtiquetasOtro("");
        setDetailsError("");
        if (initialDates?.from && initialDates?.to) {
            setRange({ from: new Date(initialDates.from), to: new Date(initialDates.to) });
        } else {
            setRange({ from: null, to: null });
        }

        const fetchScheduledOrders = async () => {
            setIsScheduleLoading(true);
            try {
                const response = await api.get('/orders/scheduled');
                const all = response.data || [];
                const filtered = excludeOrderId ? all.filter(o => o.id !== excludeOrderId) : all;
                setBookedRanges(filtered);
            } catch {
                console.error("Error al cargar el calendario");
            } finally {
                setIsScheduleLoading(false);
            }
        };
        fetchScheduledOrders();
    }, [open, excludeOrderId, initialDates]);

    const handleClose = () => {
        setRange({ from: null, to: null });
        setError("");
        setStep("details");
        onClose();
    };

    const handleSubmit = async () => {
        if (!range.from || !range.to) {
            setError("Selecciona la fecha de inicio y fin en el calendario.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const payload = {
                installationStartDate: range.from.toISOString(),
                installationEndDate: range.to.toISOString(),
                marcoUbicacion: buildMarcoUbicacionPayload(),
                quitarEtiquetas: buildQuitarEtiquetasPayload(),
            };
            const response = await api.post(`/quotations/${quotationId}/confirm`, payload);
            onConfirmSuccess(response.data.id);
        } catch (err) {
            const backendMessage = err?.response?.data?.message;
            setError(backendMessage || "No se pudo confirmar. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const isDayDisabled = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return day < today;
    };

    const bookedDaysList = bookedRanges.flatMap((order) => {
        const days = [];
        const current = new Date(order.fabricationStartDate);
        const end = new Date(order.fabricationEndDate);
        current.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    });

    const isReady = range.from && range.to;
    const duration = isReady ? differenceInCalendarDays(range.to, range.from) + 1 : null;
    const selectionHint = !range.from
        ? "Haz click en la fecha de inicio"
        : !range.to
            ? "Ahora haz click en la fecha de fin"
            : null;

    const headerGradient = isReconfirm ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gradient-to-br from-emerald-600 to-emerald-700";
    const confirmBtnClass = isReconfirm ? "rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-6 w-full sm:w-auto" : "rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 w-full sm:w-auto";
    const rangeCardClass = isReconfirm ? "bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3" : "bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className="w-[calc(100%-1.5rem)] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl flex flex-col max-h-[92dvh]"
                aria-describedby={undefined}
            >
                {/* Header */}
                <div className={`${headerGradient} px-5 sm:px-6 py-4 sm:py-5 flex-shrink-0`}>
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg sm:text-xl font-bold flex items-center gap-2.5">
                            {isReconfirm ? <RefreshCw size={20} /> : <CalendarCheck2 size={20} />}
                            {isReconfirm ? "Re-agendar Fabricación" : "Agendar Fabricación"}
                        </DialogTitle>
                        <p className="text-white/80 text-xs sm:text-sm mt-1">
                            {isReconfirm
                                ? "El pedido existente se actualizará con las nuevas fechas y ventanas."
                                : "Selecciona el rango de fechas para la fabricación."
                            }
                        </p>
                    </DialogHeader>
                </div>

                {/* Cuerpo scrolleable */}
                <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-4">

                    {step === "details" ? (
                        <>
                            <p className="text-sm text-gray-600">
                                Antes de agendar, confirma esto con el cliente por teléfono — queda guardado como nota en el pedido.
                            </p>

                            <div>
                                <p className="text-sm font-semibold text-gray-800 mb-2">¿Cuál es la ubicación del marco?</p>
                                <div className="space-y-2">
                                    {MARCO_OPTIONS.map((opt) => (
                                        <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={marcoUbicacion.includes(opt.value)}
                                                onChange={() => toggleMarcoOption(opt.value)}
                                                className="rounded accent-emerald-600"
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                                {marcoUbicacion.includes("otro") && (
                                    <input
                                        type="text"
                                        value={marcoUbicacionOtro}
                                        onChange={(e) => { setMarcoUbicacionOtro(e.target.value); setDetailsError(""); }}
                                        placeholder="Describe la ubicación del marco"
                                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                )}
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-gray-800 mb-2">¿Se van a quitar etiquetas?</p>
                                <div className="space-y-2">
                                    {[{ value: "si", label: "Sí" }, { value: "no", label: "No" }, { value: "otro", label: "Otro" }].map((opt) => (
                                        <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="quitarEtiquetas"
                                                checked={quitarEtiquetas === opt.value}
                                                onChange={() => { setQuitarEtiquetas(opt.value); setDetailsError(""); }}
                                                className="accent-emerald-600"
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                                {quitarEtiquetas === "otro" && (
                                    <input
                                        type="text"
                                        value={quitarEtiquetasOtro}
                                        onChange={(e) => { setQuitarEtiquetasOtro(e.target.value); setDetailsError(""); }}
                                        placeholder="Describe la respuesta"
                                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                )}
                            </div>

                            {detailsError && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
                                    <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                                    <span>{detailsError}</span>
                                </div>
                            )}
                        </>
                    ) : (
                    <>
                    {/* Leyenda */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                            Con fabricación
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                            Seleccionado
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
                            No disponible
                        </div>
                    </div>

                    {/* Hint */}
                    {selectionHint && (
                        <div className="text-center text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3">
                            👆 {selectionHint}
                        </div>
                    )}

                    {/* Calendario */}
                    <div className="flex justify-center overflow-x-auto">
                        {isScheduleLoading ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                                <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <span className="text-sm">Cargando calendario...</span>
                            </div>
                        ) : (
                            <Calendar
                                mode="range"
                                selected={range}
                                onSelect={(val) => { setRange(val || { from: null, to: null }); setError(""); }}
                                locale={es}
                                disabled={isDayDisabled}
                                modifiers={{ booked: bookedDaysList }}
                                modifiersClassNames={{
                                    booked: "!bg-red-100 !text-red-400",
                                    range_start: "!bg-emerald-600 !text-white !rounded-l-md",
                                    range_end: "!bg-emerald-600 !text-white !rounded-r-md",
                                    range_middle: "!bg-emerald-100 !text-emerald-800",
                                    today: "font-bold underline",
                                }}
                                classNames={{
                                    months: "flex flex-col",
                                    month: "space-y-3",
                                    caption: "flex justify-center pt-1 relative items-center text-sm font-semibold",
                                    nav_button: cn("h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border rounded-md"),
                                    table: "w-full border-collapse",
                                    head_row: "flex",
                                    head_cell: "text-gray-400 rounded-md w-9 font-normal text-xs",
                                    row: "flex w-full mt-1",
                                    cell: "h-9 w-9 text-center text-sm relative",
                                    day: "h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded-md transition-colors",
                                    day_disabled: "text-gray-300 cursor-not-allowed hover:bg-transparent",
                                }}
                            />
                        )}
                    </div>

                    {/* Resumen del rango */}
                    {isReady && (
                        <div className={rangeCardClass}>
                            <CheckCircle2
                                size={18}
                                className={`mt-0.5 flex-shrink-0 ${isReconfirm ? 'text-amber-600' : 'text-emerald-600'}`}
                            />
                            <div className="text-sm">
                                <p className={`font-semibold ${isReconfirm ? 'text-amber-800' : 'text-emerald-800'}`}>
                                    {isReconfirm ? "Nueva fecha de fabricación" : "Fabricación programada"}
                                </p>
                                <p className={`mt-0.5 ${isReconfirm ? 'text-amber-700' : 'text-emerald-700'}`}>
                                    <span className="font-medium">
                                        {format(range.from, "EEEE d 'de' MMMM", { locale: es })}
                                    </span>
                                    {duration > 1 && (
                                        <>{" → "}<span className="font-medium">
                                            {format(range.to, "EEEE d 'de' MMMM yyyy", { locale: es })}
                                        </span></>
                                    )}
                                    {duration === 1 && (
                                        <span className={`text-xs ${isReconfirm ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {" "}({format(range.from, "yyyy")})
                                        </span>
                                    )}
                                </p>
                                <p className={`text-xs mt-1 font-medium ${isReconfirm ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {duration} {duration === 1 ? "día" : "días"} de fabricación
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Fabricaciones agendadas */}
                    {bookedRanges.length > 0 && (
                        <div className="text-xs text-gray-500 space-y-1.5">
                            <p className="font-semibold text-gray-600 uppercase tracking-wide text-[10px]">
                                Fabricaciones agendadas:
                            </p>
                            {bookedRanges.map(order => (
                                <div key={order.id} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-700 truncate max-w-[140px] sm:max-w-[160px]">
                                        {order.project}
                                    </span>
                                    <span className="text-gray-400 ml-auto whitespace-nowrap">
                                        {format(new Date(order.fabricationStartDate), "d MMM", { locale: es })}
                                        {order.fabricationStartDate !== order.fabricationEndDate && (
                                            <> → {format(new Date(order.fabricationEndDate), "d MMM yy", { locale: es })}</>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
                            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    </>
                    )}
                </div>

                {/* Footer — col en móvil, row en sm+ */}
                <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={step === "calendar" ? () => setStep("details") : handleClose}
                        disabled={loading}
                        className="rounded-xl w-full sm:w-auto"
                    >
                        {step === "calendar" ? "Atrás" : "Cancelar"}
                    </Button>
                    {step === "details" ? (
                        <Button onClick={handleContinueFromDetails} className={confirmBtnClass}>
                            Continuar
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={!isReady || loading} className={confirmBtnClass}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    {isReconfirm ? "Actualizando..." : "Confirmando..."}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {isReconfirm ? <RefreshCw size={15} /> : <CalendarCheck2 size={15} />}
                                    {isReconfirm ? "Re-confirmar Pedido" : "Confirmar Cotización"}
                                </span>
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}