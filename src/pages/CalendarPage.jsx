// RUTA: src/pages/CalendarPage.jsx

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt } from 'react-icons/fa';

const STATUS_CONFIG = {
    en_proceso: { label: 'En Proceso', color: '#3b82f6', bg: 'bg-blue-500' },
    en_fabricacion: { label: 'En Fabricación', color: '#f97316', bg: 'bg-orange-500' },
    listo_para_instalar: { label: 'Listo p/ Instalar', color: '#8b5cf6', bg: 'bg-violet-500' },
    en_ruta: { label: 'En Ruta', color: '#06b6d4', bg: 'bg-cyan-500' },
    completado: { label: 'Completado', color: '#22c55e', bg: 'bg-emerald-500' },
    cancelado: { label: 'Cancelado', color: '#ef4444', bg: 'bg-red-500' },
};

const DEFAULT_COLOR = '#6b7280';

// CSS del calendario inyectado una sola vez
const CALENDAR_CSS = `
  .calendar-wrapper .fc {
    font-family: inherit;
    font-size: 0.82rem;
  }
  .calendar-wrapper .fc-toolbar {
    flex-wrap: wrap;
    gap: 6px;
  }
  .calendar-wrapper .fc-toolbar-title {
    font-size: 0.95rem !important;
    font-weight: 700;
    color: #111827;
    text-transform: capitalize;
  }
  .calendar-wrapper .fc-button {
    background: #f3f4f6 !important;
    border: 1px solid #e5e7eb !important;
    color: #374151 !important;
    border-radius: 8px !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
    padding: 4px 10px !important;
    box-shadow: none !important;
    transition: background 0.15s;
  }
  .calendar-wrapper .fc-button:hover {
    background: #e5e7eb !important;
  }
  .calendar-wrapper .fc-button-active,
  .calendar-wrapper .fc-button-primary:not(:disabled).fc-button-active {
    background: #2563eb !important;
    color: white !important;
    border-color: #2563eb !important;
  }
  .calendar-wrapper .fc-today-button {
    background: #2563eb !important;
    border-color: #2563eb !important;
    color: white !important;
  }
  .calendar-wrapper .fc-col-header-cell {
    background: #f9fafb;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    padding: 6px 0;
    border-color: #f3f4f6 !important;
  }
  .calendar-wrapper .fc-daygrid-day {
    border-color: #f3f4f6 !important;
  }
  .calendar-wrapper .fc-daygrid-day-number {
    font-size: 0.75rem;
    color: #374151;
    padding: 3px 6px;
  }
  .calendar-wrapper .fc-day-today {
    background: #eff6ff !important;
  }
  .calendar-wrapper .fc-day-today .fc-daygrid-day-number {
    background: #2563eb;
    color: white;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 2px;
  }
  .calendar-wrapper .fc-event {
    border-radius: 5px !important;
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    padding: 1px 5px !important;
    border: none !important;
    cursor: pointer;
  }
  .calendar-wrapper .fc-event:hover { opacity: 0.85; }
  .calendar-wrapper .fc-scrollgrid {
    border-color: #f3f4f6 !important;
    border-radius: 8px;
  }
  .calendar-wrapper .fc-scrollgrid td,
  .calendar-wrapper .fc-scrollgrid th {
    border-color: #f3f4f6 !important;
  }
`;

export default function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [upcomingOrders, setUpcomingOrders] = useState([]);
    const [showSidebar, setShowSidebar] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchScheduledOrders = async () => {
            try {
                const response = await api.get('/orders/scheduled');
                const data = response.data;

                const formattedEvents = data.map((order) => {
                    const cfg = STATUS_CONFIG[order.status];
                    const color = cfg?.color || DEFAULT_COLOR;
                    return {
                        id: String(order.id),
                        title: order.project,
                        start: order.installationStartDate,
                        end: new Date(new Date(order.installationEndDate).setDate(
                            new Date(order.installationEndDate).getDate() + 1
                        )),
                        backgroundColor: color,
                        borderColor: color,
                        extendedProps: { status: order.status },
                    };
                });

                setEvents(formattedEvents);

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const upcoming = data
                    .filter(o => new Date(o.installationStartDate) >= today)
                    .sort((a, b) => new Date(a.installationStartDate) - new Date(b.installationStartDate))
                    .slice(0, 5);
                setUpcomingOrders(upcoming);
            } catch (error) {
                console.error('❌ Error al cargar los pedidos agendados:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchScheduledOrders();
    }, []);

    const handleEventClick = (clickInfo) => {
        navigate(`/orders/${clickInfo.event.id}`);
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-gray-400 gap-2 text-sm">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Cargando calendario...
            </div>
        );
    }

    // Panel lateral — contenido compartido entre drawer móvil y sidebar desktop
    const SidebarContent = () => (
        <div className="space-y-4">
            {/* Próximas instalaciones */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FaCalendarAlt size={12} className="text-blue-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">Próximas instalaciones</p>
                    </div>
                </div>

                {upcomingOrders.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-400">
                        <FaCalendarAlt size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No hay instalaciones próximas</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {upcomingOrders.map(order => {
                            const cfg = STATUS_CONFIG[order.status];
                            return (
                                <button
                                    key={order.id}
                                    onClick={() => { navigate(`/orders/${order.id}`); setShowSidebar(false); }}
                                    className="w-full px-5 py-3.5 text-left hover:bg-blue-50/40 transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-1 min-h-[32px] rounded-full flex-shrink-0 mt-0.5"
                                            style={{ backgroundColor: cfg?.color || DEFAULT_COLOR }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                                                {order.project}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {formatDate(order.installationStartDate)}
                                                {order.installationEndDate && order.installationEndDate !== order.installationStartDate && (
                                                    <span> → {formatDate(order.installationEndDate)}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Resumen por estado */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Resumen</p>
                </div>
                <div className="p-4 space-y-2">
                    {Object.entries(STATUS_CONFIG).map(([key, { label, color, bg }]) => {
                        const count = events.filter(e => e.extendedProps?.status === key).length;
                        if (count === 0) return null;
                        return (
                            <div key={key} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${bg}`} />
                                    <span className="text-xs text-gray-600">{label}</span>
                                </div>
                                <span className="text-xs font-bold text-gray-800">{count}</span>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">Sin proyectos agendados</p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <style>{CALENDAR_CSS}</style>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                            Calendario de Instalaciones
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1">
                            {events.length} proyecto{events.length !== 1 ? 's' : ''} agendado{events.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {/* Botón para abrir panel lateral en móvil */}
                    <button
                        onClick={() => setShowSidebar(true)}
                        className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <FaCalendarAlt size={13} className="text-blue-500" />
                        <span className="hidden sm:inline">Próximas</span>
                        {upcomingOrders.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {upcomingOrders.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Drawer overlay móvil ── */}
                {showSidebar && (
                    <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                        {/* Overlay oscuro */}
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setShowSidebar(false)}
                        />
                        {/* Panel */}
                        <div className="relative z-10 w-80 max-w-[90vw] h-full bg-gray-50 overflow-y-auto p-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-gray-800">Panel de instalaciones</p>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors text-lg leading-none"
                                >
                                    ×
                                </button>
                            </div>
                            <SidebarContent />
                        </div>
                    </div>
                )}

                {/* ── Layout principal ── */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* ── Calendario ── */}
                    <div className="flex-1 min-w-0 w-full">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Leyenda — scroll horizontal en móvil */}
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                    {Object.entries(STATUS_CONFIG).map(([key, { label, bg }]) => (
                                        <div key={key} className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${bg}`} />
                                            <span className="text-[11px] text-gray-500 whitespace-nowrap">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-2 sm:p-4 calendar-wrapper">
                                <FullCalendar
                                    plugins={[dayGridPlugin]}
                                    initialView="dayGridMonth"
                                    events={events}
                                    locale="es"
                                    headerToolbar={{
                                        left: 'prev,next',
                                        center: 'title',
                                        right: 'today',
                                    }}
                                    eventClick={handleEventClick}
                                    height="auto"
                                    // En desktop mostramos más controles via CSS si se desea
                                    views={{
                                        dayGridMonth: {
                                            titleFormat: { year: 'numeric', month: 'long' },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Sidebar — solo visible en lg+ ── */}
                    <div className="hidden lg:block w-72 flex-shrink-0">
                        <SidebarContent />
                    </div>
                </div>
            </div>
        </div>
    );
}