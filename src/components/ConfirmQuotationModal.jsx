// RUTA: src/components/ConfirmQuotationModal.jsx

import { useState, useEffect } from "react";
import api from "@/services/api";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CalendarCheck2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "react-day-picker/dist/style.css";

export default function ConfirmQuotationModal({ open, onClose, quotationId, onConfirmSuccess }) {
    // range: { from: Date | null, to: Date | null }
    const [range, setRange] = useState({ from: null, to: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [bookedRanges, setBookedRanges] = useState([]);
    const [isScheduleLoading, setIsScheduleLoading] = useState(true);

    // ── Carga pedidos agendados ───────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const fetchScheduledOrders = async () => {
            setIsScheduleLoading(true);
            try {
                const response = await api.get('/orders/scheduled');
                setBookedRanges(response.data);
            } catch {
                console.error("Error al cargar el calendario");
            } finally {
                setIsScheduleLoading(false);
            }
        };
        fetchScheduledOrders();
    }, [open]);

    const handleClose = () => {
        setRange({ from: null, to: null });
        setError("");
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

    // ── Días deshabilitados (pasados + ocupados) ──────────────────────────────
    const isDayDisabled = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (day < today) return true;
        for (const order of bookedRanges) {
            const start = new Date(order.installationStartDate);
            const end = new Date(order.installationEndDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            if (day >= start && day <= end) return true;
        }
        return false;
    };

    // ── Lista de días ocupados para el modifier ───────────────────────────────
    const bookedDaysList = bookedRanges.flatMap((order) => {
        const days = [];
        const current = new Date(order.installationStartDate);
        const end = new Date(order.installationEndDate);
        current.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    });

    // ── Datos derivados ───────────────────────────────────────────────────────
    const isReady = range.from && range.to;
    const duration = isReady
        ? differenceInCalendarDays(range.to, range.from) + 1
        : null;

    // Instrucción contextual según el estado de selección
    const selectionHint = !range.from
        ? "Haz click en la fecha de inicio"
        : !range.to
            ? "Ahora haz click en la fecha de fin"
            : null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            {/* flex flex-col + max-h para que el footer nunca desaparezca */}
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl flex flex-col max-h-[90vh]">

                {/* ── Header fijo ── */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-5 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-bold flex items-center gap-2.5">
                            <CalendarCheck2 size={22} />
                            Agendar Instalación
                        </DialogTitle>
                        <p className="text-emerald-100 text-sm mt-1">
                            Selecciona el rango de fechas para la instalación.
                        </p>
                    </DialogHeader>
                </div>

                {/* ── Contenido scrolleable ── */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

                    {/* Leyenda */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                            Ocupado
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

                    {/* Hint de instrucción */}
                    {selectionHint && (
                        <div className="text-center text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3">
                            👆 {selectionHint}
                        </div>
                    )}

                    {/* Calendario */}
                    <div className="flex justify-center">
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
                                onSelect={(val) => {
                                    setRange(val || { from: null, to: null });
                                    setError("");
                                }}
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

                    {/* Resumen del rango seleccionado */}
                    {isReady && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
                            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-emerald-800">Instalación programada</p>
                                <p className="text-emerald-700 mt-0.5">
                                    <span className="font-medium">
                                        {format(range.from, "EEEE d 'de' MMMM", { locale: es })}
                                    </span>
                                    {duration > 1 && (
                                        <>
                                            {" → "}
                                            <span className="font-medium">
                                                {format(range.to, "EEEE d 'de' MMMM yyyy", { locale: es })}
                                            </span>
                                        </>
                                    )}
                                    {duration === 1 && (
                                        <span className="text-emerald-600"> ({format(range.from, "yyyy")})</span>
                                    )}
                                </p>
                                <p className="text-emerald-600 text-xs mt-1">
                                    {duration} {duration === 1 ? "día" : "días"} de instalación
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Instalaciones ya agendadas */}
                    {bookedRanges.length > 0 && (
                        <div className="text-xs text-gray-500 space-y-1.5">
                            <p className="font-semibold text-gray-600 uppercase tracking-wide text-[10px]">
                                Instalaciones agendadas:
                            </p>
                            {bookedRanges.map(order => (
                                <div key={order.id} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-700 truncate max-w-[160px]">
                                        {order.project}
                                    </span>
                                    <span className="text-gray-400 ml-auto whitespace-nowrap">
                                        {format(new Date(order.installationStartDate), "d MMM", { locale: es })}
                                        {order.installationStartDate !== order.installationEndDate && (
                                            <> → {format(new Date(order.installationEndDate), "d MMM yy", { locale: es })}</>
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
                </div>

                {/* ── Footer fijo — nunca desaparece ── */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                        className="rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isReady || loading}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Confirmando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CalendarCheck2 size={15} />
                                Confirmar Cotización
                            </span>
                        )}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}