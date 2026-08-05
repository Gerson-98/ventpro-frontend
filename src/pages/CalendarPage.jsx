// RUTA: src/pages/CalendarPage.jsx

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/context/PermissionsContext';
import ScheduleInstallationModal from '@/components/ScheduleInstallationModal';
import { FaCalendarAlt, FaUser, FaTimes, FaEye, FaSearch, FaCalendarCheck } from 'react-icons/fa';

const STATUS_CONFIG = {
    en_proceso: { label: 'En Proceso', color: '#3b82f6', bg: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-200' },
    en_fabricacion: { label: 'En Fabricación', color: '#f97316', bg: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 border-orange-200' },
    fabricado: { label: 'Fabricado', color: '#f59e0b', bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200' },
    agendado: { label: 'Agendado', color: '#8b5cf6', bg: 'bg-violet-500', light: 'bg-violet-50 text-violet-700 border-violet-200' },
    en_ruta: { label: 'En Ruta', color: '#06b6d4', bg: 'bg-cyan-500', light: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    completado: { label: 'Completado', color: '#22c55e', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelado: { label: 'Cancelado', color: '#ef4444', bg: 'bg-red-500', light: 'bg-red-50 text-red-700 border-red-200' },
};

const DEFAULT_COLOR = '#6b7280';

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
};

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
                {info.readOnly ? 'Solo lectura' : 'Click para ver el pedido →'}
            </div>
        </div>
    );
}

// ─── Bloque de calendario genérico — reutilizado para Fabricación e Instalación ──
function ScheduleCalendarBlock({
    title,
    icon,
    endpoint,
    startField,
    endField,
    sidebarLabel,
    canNavigateToOrder,
}) {
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
            setLoading(true);
            try {
                const response = await api.get(endpoint);
                const data = response.data;
                setAllOrders(data);
                setEvents(data.map((order) => {
                    const cfg = STATUS_CONFIG[order.status];
                    const color = cfg?.color || DEFAULT_COLOR;
                    return {
                        id: String(order.id),
                        title: order.project,
                        start: order[startField],
                        end: new Date(new Date(order[endField]).setDate(
                            new Date(order[endField]).getDate() + 1
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
                console.error(`❌ Error al cargar ${endpoint}:`, err);
            } finally {
                setLoading(false);
            }
        };
        fetchScheduledOrders();
    }, [endpoint, startField, endField]);

    const filteredEvents = activeStatusFilter
        ? events.map(e => ({
            ...e,
            classNames: e.extendedProps.status !== activeStatusFilter ? ['fc-event-dimmed'] : [],
        }))
        : events;

    const handleEventClick = useCallback((info) => {
        if (!canNavigateToOrder) return;
        navigate(`/orders/${info.event.id}`);
    }, [navigate, canNavigateToOrder]);

    const handleEventMouseEnter = useCallback((info) => {
        clearTimeout(tooltipTimeout.current);
        setTooltip({ info: { ...info, readOnly: !canNavigateToOrder } });
    }, [canNavigateToOrder]);

    const handleEventMouseLeave = useCallback(() => {
        tooltipTimeout.current = setTimeout(() => setTooltip(null), 200);
    }, []);

    const SidebarContent = () => (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">{sidebarLabel}</p>
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
                                onClick={() => canNavigateToOrder && navigate(`/orders/${order.id}`)}
                                className={`px-4 py-3 transition-colors ${canNavigateToOrder ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
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

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {tooltip && <EventTooltip info={tooltip.info} />}

            {/* Header del bloque */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">{title}</h2>
                    <span className="text-xs text-gray-400 font-medium">
                        ({events.length} agendado{events.length !== 1 ? 's' : ''})
                    </span>
                    {!canNavigateToOrder && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                            <FaEye size={8} /> Solo lectura
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowSidebar(true)}
                    className="lg:hidden flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg"
                >
                    <FaCalendarAlt size={11} />
                    {allOrders.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
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
                            <p className="text-sm font-bold text-gray-800">{sidebarLabel}</p>
                            <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                                <FaTimes size={14} />
                            </button>
                        </div>
                        <SidebarContent />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-sm">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Cargando calendario...
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-4 p-4">
                    {/* Calendario */}
                    <div className="flex-1 min-w-0 w-full">
                        {/* Leyenda */}
                        <div className="pb-3 border-b border-gray-100 mb-1">
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

                        <div className={`calendar-wrapper ${!canNavigateToOrder ? 'readonly' : ''}`}>
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

                    {/* Sidebar desktop */}
                    <div className="hidden lg:block w-64 flex-shrink-0">
                        <SidebarContent />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Tabla filtrable de pedidos listos/agendados para instalación ──────────────
function ReadyToScheduleTable({ canReschedule, onScheduleClick }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (statusFilter !== 'todos') params.status = statusFilter;
            const res = await api.get('/orders/ready-to-schedule-installation', { params });
            setRows(res.data || []);
        } catch (err) {
            console.error('Error cargando pedidos listos para agendar:', err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        const t = setTimeout(fetchRows, 300);
        return () => clearTimeout(t);
    }, [fetchRows]);

    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            if (dateFrom && (!r.fabricationEndDate || new Date(r.fabricationEndDate) < new Date(dateFrom))) return false;
            if (dateTo && (!r.fabricationEndDate || new Date(r.fabricationEndDate) > new Date(dateTo))) return false;
            return true;
        });
    }, [rows, dateFrom, dateTo]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <FaCalendarCheck className="text-amber-500" size={15} />
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Pedidos listos para agendar instalación</h2>
                <span className="text-xs text-gray-400 font-medium">({filteredRows.length})</span>
            </div>

            {/* Filtros */}
            <div className="p-4 flex flex-col sm:flex-row flex-wrap gap-2 border-b border-gray-100 bg-gray-50/50">
                <div className="relative flex-1 min-w-[180px]">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                    <input
                        type="text"
                        placeholder="Buscar por proyecto o cliente..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    <option value="todos">Fabricado + Agendado</option>
                    <option value="fabricado">Solo Fabricado</option>
                    <option value="agendado">Solo Agendado</option>
                </select>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    title="Fabricado desde"
                    className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    title="Fabricado hasta"
                    className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 gap-2 text-sm">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Cargando pedidos...
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                    <FaCalendarCheck size={22} className="opacity-30" />
                    <p className="text-sm font-medium">No hay pedidos fabricados pendientes de agendar</p>
                </div>
            ) : (
                <>
                    {/* Tabla — md+ */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/70">
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fabricado</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Instalación</th>
                                    {canReschedule && <th className="py-2.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRows.map(r => {
                                    const cfg = STATUS_CONFIG[r.status];
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-gray-800">{r.project}</td>
                                            <td className="py-3 px-4 text-gray-600">{r.client?.name || '—'}</td>
                                            <td className="py-3 px-4 text-xs text-gray-500">{r.generatedFromQuotation?.user?.name || '—'}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg?.light || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    {cfg?.label || r.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-gray-500">{formatDate(r.fabricationEndDate)}</td>
                                            <td className="py-3 px-4 text-xs text-purple-600">
                                                {r.realInstallationStartDate ? formatDate(r.realInstallationStartDate) : <span className="text-gray-300">Sin agendar</span>}
                                            </td>
                                            {canReschedule && (
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => onScheduleClick(r)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <FaCalendarCheck size={10} />
                                                        {r.realInstallationStartDate ? 'Reagendar' : 'Agendar'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Cards móvil */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {filteredRows.map(r => {
                            const cfg = STATUS_CONFIG[r.status];
                            return (
                                <div key={r.id} className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <span className="font-semibold text-gray-800 text-sm truncate">{r.project}</span>
                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${cfg?.light || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {cfg?.label || r.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">{r.client?.name || '—'}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Fabricado: {formatDate(r.fabricationEndDate)}</span>
                                        <span className="text-purple-600">
                                            {r.realInstallationStartDate ? formatDate(r.realInstallationStartDate) : 'Sin agendar'}
                                        </span>
                                    </div>
                                    {canReschedule && (
                                        <button
                                            onClick={() => onScheduleClick(r)}
                                            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-2 rounded-lg"
                                        >
                                            <FaCalendarCheck size={10} />
                                            {r.realInstallationStartDate ? 'Reagendar instalación' : 'Agendar instalación'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default function CalendarPage() {
    const { hasPermission } = usePermissions();
    const canNavigateToOrder = hasPermission('calendar.navigate_to_order');
    const canReschedule = hasPermission('orders.reschedule');

    const [scheduleModalOrder, setScheduleModalOrder] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleScheduleSuccess = () => {
        setScheduleModalOrder(null);
        setRefreshKey(k => k + 1);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <style>{CALENDAR_CSS}</style>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

                {/* Header */}
                <div className="mb-5 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                        Calendarios de Producción
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1">
                        Agenda la fabricación al confirmar un pedido, y la instalación cuando ya esté fabricado.
                    </p>
                </div>

                {/* Tabla filtrable — pedidos fabricados listos para agendar instalación */}
                {canReschedule && (
                    <ReadyToScheduleTable
                        key={`table-${refreshKey}`}
                        canReschedule={canReschedule}
                        onScheduleClick={(order) => setScheduleModalOrder(order)}
                    />
                )}

                {/* Calendario de Fabricación */}
                <div className="mb-6">
                    <ScheduleCalendarBlock
                        key={`fab-${refreshKey}`}
                        title="Calendario de Fabricación"
                        icon={<FaCalendarAlt className="text-orange-500" size={15} />}
                        endpoint="/orders/scheduled"
                        startField="fabricationStartDate"
                        endField="fabricationEndDate"
                        sidebarLabel="Fabricaciones agendadas"
                        canNavigateToOrder={canNavigateToOrder}
                    />
                </div>

                {/* Calendario de Instalación */}
                <div>
                    <ScheduleCalendarBlock
                        key={`inst-${refreshKey}`}
                        title="Calendario de Instalación"
                        icon={<FaCalendarAlt className="text-purple-500" size={15} />}
                        endpoint="/orders/scheduled-installation"
                        startField="realInstallationStartDate"
                        endField="realInstallationEndDate"
                        sidebarLabel="Instalaciones agendadas"
                        canNavigateToOrder={canNavigateToOrder}
                    />
                </div>
            </div>

            {scheduleModalOrder && (
                <ScheduleInstallationModal
                    open={!!scheduleModalOrder}
                    onClose={() => setScheduleModalOrder(null)}
                    order={scheduleModalOrder}
                    onScheduleSuccess={handleScheduleSuccess}
                />
            )}
        </div>
    );
}
