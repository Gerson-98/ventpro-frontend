// RUTA: src/components/RescheduleOrderModal.jsx

import { useState, useEffect } from "react";
import api from "@/services/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import "react-day-picker/dist/style.css";

// Este modal recibe el pedido completo para saber el ID y las fechas actuales
export default function RescheduleOrderModal({ open, onClose, order, onRescheduleSuccess }) {
    const [installationStartDate, setInstallationStartDate] = useState(null);
    const [duration, setDuration] = useState(1);
    const [installationEndDate, setInstallationEndDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [bookedDays, setBookedDays] = useState([]);
    const [isScheduleLoading, setIsScheduleLoading] = useState(true);

    // Carga los pedidos agendados (excluyendo el actual) cuando se abre el modal
    useEffect(() => {
        if (open) {
            // Pre-llenamos el modal con las fechas actuales del pedido
            if (order?.installationStartDate) {
                setInstallationStartDate(new Date(order.installationStartDate));
                const start = new Date(order.installationStartDate);
                const end = new Date(order.installationEndDate);
                // Calculamos la duración en días
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                setDuration(diffDays);
            }

            const fetchScheduledOrders = async () => {
                setIsScheduleLoading(true);
                try {
                    const response = await api.get('/orders/scheduled');
                    // Filtramos para excluir el pedido que estamos editando
                    const otherBookedDays = response.data.filter(o => o.id !== order.id);
                    setBookedDays(otherBookedDays);
                } catch (error) {
                    console.error("❌ Error al cargar el calendario:", error);
                } finally {
                    setIsScheduleLoading(false);
                }
            };
            fetchScheduledOrders();
        }
    }, [open, order]);

    // Calcula la fecha de fin automáticamente
    useEffect(() => {
        if (installationStartDate && duration > 0) {
            const startDate = new Date(installationStartDate);
            const endDate = new Date(startDate.getTime());
            endDate.setDate(startDate.getDate() + parseInt(duration, 10) - 1);
            setInstallationEndDate(endDate);
        } else {
            setInstallationEndDate(null);
        }
    }, [installationStartDate, duration]);

    const handleClose = () => {
        setError("");
        onClose();
    };

    // Llama al nuevo endpoint de reprogramación
    const handleSubmit = async () => {
        if (!installationStartDate || !installationEndDate) {
            setError("Debes seleccionar una fecha de inicio y una duración válida.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const payload = {
                installationStartDate: installationStartDate.toISOString(),
                installationEndDate: installationEndDate.toISOString(),
            };
            // Llamada al nuevo endpoint PATCH
            await api.patch(`/orders/${order.id}/reschedule`, payload);
            onRescheduleSuccess(); // Llama a la función de éxito para recargar los datos
        } catch (err) {
            console.error("❌ Error al reprogramar el pedido:", err);
            setError("No se pudo reprogramar. Revisa la consola para más detalles.");
        } finally {
            setLoading(false);
        }
    };

    const isDayBooked = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (day < today) return true;

        for (const o of bookedDays) {
            const start = new Date(o.installationStartDate);
            const end = new Date(o.installationEndDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            if (day >= start && day <= end) {
                return true;
            }
        }
        return false;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">🔄 Reprogramar Instalación</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="installationStartDate" className="text-right">
                            Fecha de Inicio
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !installationStartDate && "text-muted-foreground")} disabled={isScheduleLoading}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {isScheduleLoading ? "Cargando..." : (installationStartDate ? format(installationStartDate, "PPP", { locale: es }) : <span>Elige una fecha</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4">
                                <Calendar mode="single" selected={installationStartDate} onSelect={setInstallationStartDate} initialFocus locale={es} disabled={isDayBooked} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">Duración (días)</Label>
                        <Input id="duration" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} className="col-span-3" />
                    </div>
                    {installationEndDate && (
                        <div className="text-center text-sm text-gray-600 bg-gray-100 p-2 rounded-md">
                            <p>La instalación finalizará el: <strong>{format(installationEndDate, "PPP", { locale: es })}</strong></p>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={!installationStartDate || loading}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}