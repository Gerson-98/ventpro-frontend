// RUTA: src/components/RescheduleOrderModal.jsx

import { useState, useEffect } from "react";
import api from "@/services/api";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "react-day-picker/dist/style.css";

export default function RescheduleOrderModal({ open, onClose, order, onRescheduleSuccess }) {
    const [range, setRange] = useState({ from: null, to: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [bookedRanges, setBookedRanges] = useState([]);
    const [isScheduleLoading, setIsScheduleLoading] = useState(true);

    useEffect(() => {
        if (!open) return;
        if (order?.installationStartDate && order?.installationEndDate) {
            setRange({
                from: new Date(order.installationStartDate),
                to: new Date(order.installationEndDate),
            });
        } else {
            setRange({ from: null, to: null });
        }
        setError("");

        const fetchScheduledOrders = async () => {
            setIsScheduleLoading(true);
            try {
                const response = await api.get('/orders/scheduled');
                const all = response.data || [];
                setBookedRanges(all.filter(o => o.id !== order?.id));
            } catch {
                console.error("Error al cargar el calendario");
            } finally {
                setIsScheduleLoading(false);
            }
        };
        fetchScheduledOrders();
    }, [open, order]);

    const handleClose = () => { setError(""); onClose(); };

    const handleSubmit = async () => {
        if (!range.from || !range.to) {
            setError("Selecciona la fecha de inicio y fin en el calendario.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await api.patch(`/orders/${order.id}/reschedule`, {
                installationStartDate: range.from.toISOString(),
                installationEndDate: range.to.toISOString(),
            });
            onRescheduleSuccess();
        } catch (err) {
            const msg = err?.response?.data?.message;
            setError(msg || "No se pudo reprogramar. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const isDayDisabled = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return day < today;
    };

    const bookedDaysList = bookedRanges.flatMap((o) => {
        const days = [];
        const current = new Date(o.installationStartDate);
        const end = new Date(o.installationEndDate);
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className="w-[calc(100%-1.5rem)] sm:max-w-[500px] p-0 overflow-hidden rounded-2xl flex flex-col max-h-[92dvh]"
                aria-describedby={undefined}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 sm:px-6 py-4 sm:py-5 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg sm:text-xl font-bold flex items-center gap-2.5">
                            <CalendarCheck2 size={20} />
                            Reprogramar Instalación
                        </DialogTitle>
                        <p className="text-white/80 text-xs sm:text-sm mt-1">
                            Selecciona el nuevo rango de fechas para{" "}
                            <span className="font-semibold">{order?.project}</span>.
                        </p>
                    </DialogHeader>
                </div>

                {/* Cuerpo scrolleable */}
                <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-4">

                    {/* Leyenda */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-300 inline-block" />
                            Con instalación
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
                            Seleccionado
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
                            No disponible
                        </div>
                    </div>

                    {/* Hint */}
                    {selectionHint && (
                        <div className="text-center text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg py-2 px-3">
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
                                    range_start: "!bg-indigo-600 !text-white !rounded-l-md",
                                    range_end: "!bg-indigo-600 !text-white !rounded-r-md",
                                    range_middle: "!bg-indigo-100 !text-indigo-800",
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
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3">
                            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-indigo-600" />
                            <div className="text-sm">
                                <p className="font-semibold text-indigo-800">Nueva fecha de instalación</p>
                                <p className="mt-0.5 text-indigo-700">
                                    <span className="font-medium">
                                        {format(range.from, "EEEE d 'de' MMMM", { locale: es })}
                                    </span>
                                    {duration > 1 && (
                                        <> → <span className="font-medium">
                                            {format(range.to, "EEEE d 'de' MMMM yyyy", { locale: es })}
                                        </span></>
                                    )}
                                    {duration === 1 && (
                                        <span className="text-xs text-indigo-600"> · {format(range.from, "yyyy")}</span>
                                    )}
                                </p>
                                <p className="text-xs mt-1 text-indigo-600 font-medium">
                                    {duration} {duration === 1 ? "día" : "días"} de instalación
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Otras instalaciones */}
                    {bookedRanges.length > 0 && (
                        <div className="text-xs space-y-1.5">
                            <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                                Otras instalaciones agendadas:
                            </p>
                            {bookedRanges.map(o => (
                                <div key={o.id} className="flex items-center gap-2 text-gray-500">
                                    <span className="w-2 h-2 rounded-full bg-red-300 flex-shrink-0" />
                                    <span className="font-medium text-gray-700 truncate max-w-[140px] sm:max-w-[170px]">{o.project}</span>
                                    <span className="text-gray-400 ml-auto whitespace-nowrap">
                                        {format(new Date(o.installationStartDate), "d MMM", { locale: es })}
                                        {o.installationStartDate !== o.installationEndDate && (
                                            <> → {format(new Date(o.installationEndDate), "d MMM yy", { locale: es })}</>
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

                {/* Footer — col en móvil, row en sm+ */}
                <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={loading} className="rounded-xl w-full sm:w-auto">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isReady || loading}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 w-full sm:w-auto"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Guardando...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <CalendarCheck2 size={15} />
                                Guardar Fechas
                            </span>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}