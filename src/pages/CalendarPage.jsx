// RUTA: src/pages/CalendarPage.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FaCalendarAlt, FaUser, FaTimes, FaEye } from 'react-icons/fa';

const STATUS_CONFIG = {
    en_proceso: { label: 'En Proceso', color: '#3b82f6', bg: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-200' },
    en_fabricacion: { label: 'En Fabricación', color: '#f97316', bg: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 border-orange-200' },
    listo_para_instalar: { label: 'Listo p/ Instalar', color: '#8b5cf6', bg: 'bg-violet-500', light: 'bg-violet-50 text-violet-700 border-violet-200' },
    en_ruta: { label: 'En Ruta', color: '#06b6d4', bg: 'bg-cyan-500', light: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    completado: { label: 'Completado', color: '#22c55e', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelado: { label: 'Cancelado', color: '#ef4444', bg: 'bg-red-500', light: 'bg-red-50 text-red-700 border-red-200' },
};

const DEFAULT_COLOR = '#6b7280';

const CALENDAR_CSS = `
  .calendar-wrapper .fc { font-family: inherit; font-size: 0.82rem; }
  .calendar-wrapper .fc-toolbar { flex-wrap: wrap; gap: 6px; }
  .calendar-wrapper .fc-toolbar-title {
    font-size: 0.95rem !important; font-weight: 700;
    color: #111827; text-transform: capitalize;
  }
  .calendar-wrapper .fc-button {
    background: #f3f4f6 !important; border: 1px solid #e5e7eb !important;
    color: #374151 !important; border-radius: 8px !important;
    font-size: 0.75rem !important; font-weight: 500 !important;
    padding: 4px 10px !important; box-shadow: none !important;
    transition: background 0.15s;
  }
  .calendar-wrapper .fc-button:hover { background: #e5e7eb !important; }
  .calendar-wrapper .fc-button-active,
  .calendar-wrapper .fc-button-primary:not(:disabled).fc-button-active {
    background: #2563eb !important; color: white !important; border-color: #2563eb !important;
  }
  .calendar-wrapper .fc-today-button {
    background: #2563eb !important; border-color: #2563eb !important; color: white !important;
  }
  .calendar-wrapper .fc-col-header-cell {
    background: #f9fafb; font-size: 0.65rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: #6b7280; padding: 6px 0; border-color: #f3f4f6 !important;
  }
  .calendar-wrapper .fc-daygrid-day { border-color: #f3f4f6 !important; }
  .calendar-wrapper .fc-daygrid-day-number { font-size: 0.75rem; color: #374151; padding: 3px 6px; }
  .calendar-wrapper .fc-day-today { background: #eff6ff !important; }
  .calendar-wrapper .fc-day-today .fc-daygrid-day-number {
    background: #2563eb; color: white; border-radius: 50%;
    width: 22px; height: 22px; display: flex; align-items: center;
    justify-content: center; margin: 2px;
  }
  .calendar-wrapper .fc-event {
    border-radius: 5px !important; font-size: 0.7rem !important;
    font-weight: 600 !important; padding: 1px 5px !important;
    border: none !important; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .calendar-wrapper .fc-event:hover { opacity: 0.9; transform: translateY(-1px); }
  .calendar-wrapper .fc-event.fc-event-dimmed { opacity: 0.15 !important; }
  .calendar-wrapper.readonly .fc-event { cursor: default !important; }
  .calendar-wrapper.readonly .fc-event:hover { transform: none !important; }
  .calendar-wrapper .fc-scrollgrid { border-color: #f3f4f6 !important; border-radius: 8px; }
  .calendar-wrapper .fc-scrollgrid td,
  .calendar-wrapper .fc-scrollgrid th { border-color: #f3f4f6 !important; }
  .calendar-wrapper .fc-timegrid-slot { height: 2.2rem !important; }
`;

function EventTooltip({ info }) {
    const { event, el } = info;
    const rect = el.getBoundingClientRect();
    const cfg = STATUS_CONFIG[event.extendedProps.status];
    const clientName = event.extendedProps.clientName;
    const top = rect.bottom + window.scrollY + 6;
    const left = Math.min(rect.left + window.scrollX, window.innerWidth - 250);

    return (
        <div
            style={{ top, left, minWidth: 210, maxWidth: 260, zIndex: 9999, position: 'absolute' }}
            className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 pointer-events-none"
        >
            <p className="text-sm font-bold text-gray-900 mb-1 leading-tight">{event.title}</p>
            {clientName && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <FaUser size={9} className="text-gray-400" />{clientName}
                </p>
            )}
            {cfg && (
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.light}`}>
                    {cfg.label}
                </span>
            )}
            <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                {/* Texto dinámico según rol — se pasa como prop */}
                {info.isVendedor ? 'Solo lectura' : 'Click para ver el pedido →'}
            </div>
        </div>
    );
}

export default function CalendarPage() {
    const { user } = useAuth();
    const isVendedor = user?.role === 'VENDEDOR';

    const [events, setEvents] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeStatusFilter, setActiveStatusFilter] = useState(null);
    const [tooltip, setTooltip] = useState(null);
    const tooltipTimeout = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchScheduledOrders = async () => {
            try {
                const response = await api.get('/orders/scheduled');
                const data = response.data;
                setAllOrders(data);
                setEvents(data.map((order) => {
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
                        extendedProps: {
                            status: order.status,
                            clientName: order.client?.name || null,
                        },
                    };
                }));
            } catch (err) {
                console.error('❌ Error al cargar los pedidos agendados:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchScheduledOrders();
    }, []);

    const filteredEvents = activeStatusFilter
        ? events.map(e => ({
            ...e,
            classNames: e.extendedProps.status !== activeStatusFilter ? ['fc-event-dimmed'] : [],
        }))
        : events;

    // Vendedor: no navega al pedido, solo ve el calendario
    const handleEventClick = useCallback((info) => {
        if (isVendedor) return;
        navigate(`/orders/${info.event.id}`);
    }, [navigate, isVendedor]);

    const handleEventMouseEnter = useCallback((info) => {
        clearTimeout(tooltipTimeout.current);
        setTooltip({ info: { ...info, isVendedor } });
    }, [isVendedor]);

    const handleEventMouseLeave = useCallback(() => {
        tooltipTimeout.current = setTimeout(() => setTooltip(null), 200);
    }, []);

    const SidebarContent = () => (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">Instalaciones agendadas</p>
                <span className="text-xs text-gray-400 font-medium">{allOrders.length} total</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                {allOrders.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Sin proyectos agendados</p>
                ) : (
                    allOrders.map((order) => {
                        const cfg = STATUS_CONFIG[order.status];
                        return (
                            <div
                                key={order.id}
                                onClick={() => !isVendedor && navigate(`/orders/${order.id}`)}
                                className={`px-4 py-3 transition-colors ${!isVendedor ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 truncate">{order.project}</p>
                                        {order.client?.name && (
                                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                <FaUser size={8} />{order.client.name}
                                            </p>
                                        )}
                                    </div>
                                    {cfg && (
                                        <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.light}`}>
                                            {cfg.label}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

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

    return (
        <div className="min-h-screen bg-gray-50">
            <style>{CALENDAR_CSS}</style>

            {tooltip && <EventTooltip info={tooltip.info} />}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                            Calendario de Instalaciones
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1 flex items-center gap-2">
                            {events.length} proyecto{events.length !== 1 ? 's' : ''} agendado{events.length !== 1 ? 's' : ''}
                            {activeStatusFilter && (
                                <span className="text-blue-600 font-medium">
                                    · {STATUS_CONFIG[activeStatusFilter]?.label}
                                </span>
                            )}
                            {/* Badge solo lectura para vendedor */}
                            {isVendedor && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                    <FaEye size={8} /> Solo lectura
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSidebar(true)}
                        className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <FaCalendarAlt size={13} className="text-blue-500" />
                        <span className="hidden sm:inline">Instalaciones</span>
                        {allOrders.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {allOrders.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Drawer móvil */}
                {showSidebar && (
                    <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
                        <div className="relative z-10 w-80 max-w-[90vw] h-full bg-gray-50 overflow-y-auto p-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-gray-800">Panel de instalaciones</p>
                                <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                                    <FaTimes size={14} />
                                </button>
                            </div>
                            <SidebarContent />
                        </div>
                    </div>
                )}

                {/* Layout principal */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* Calendario */}
                    <div className="flex-1 min-w-0 w-full">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                            {/* Leyenda */}
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center">
                                    {Object.entries(STATUS_CONFIG).map(([key, { label, bg }]) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveStatusFilter(activeStatusFilter === key ? null : key)}
                                            className={`flex items-center gap-1.5 transition-opacity rounded px-1 py-0.5 ${activeStatusFilter && activeStatusFilter !== key ? 'opacity-25' : 'opacity-100'}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${bg}`} />
                                            <span className="text-[11px] text-gray-500 whitespace-nowrap">{label}</span>
                                        </button>
                                    ))}
                                    {activeStatusFilter && (
                                        <button
                                            onClick={() => setActiveStatusFilter(null)}
                                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                        >
                                            <FaTimes size={8} /> Todos
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* readonly class para vendedor → cursor default en CSS */}
                            <div className={`p-2 sm:p-4 calendar-wrapper ${isVendedor ? 'readonly' : ''}`}>
                                <FullCalendar
                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                    initialView="dayGridMonth"
                                    events={filteredEvents}
                                    locale="es"
                                    headerToolbar={{
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: 'dayGridMonth,timeGridWeek',
                                    }}
                                    buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
                                    eventClick={handleEventClick}
                                    eventMouseEnter={handleEventMouseEnter}
                                    eventMouseLeave={handleEventMouseLeave}
                                    height="auto"
                                    views={{
                                        dayGridMonth: { titleFormat: { year: 'numeric', month: 'long' } },
                                        timeGridWeek: { titleFormat: { day: 'numeric', month: 'short' }, allDayText: 'Todo el día' },
                                    }}
                                    eventContent={(arg) => {
                                        const clientName = arg.event.extendedProps.clientName;
                                        return (
                                            <div className="overflow-hidden px-0.5 w-full">
                                                <div className="font-semibold truncate leading-tight">{arg.event.title}</div>
                                                {clientName && (
                                                    <div className="text-[9px] opacity-75 truncate">{clientName}</div>
                                                )}
                                            </div>
                                        );
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar desktop */}
                    <div className="hidden lg:block w-72 flex-shrink-0">
                        <SidebarContent />
                    </div>
                </div>
            </div>
        </div>
    );
}