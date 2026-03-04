import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUsers,
  FaClipboardList,
  FaWindowMaximize,
  FaMoneyBillWave,
  FaArrowRight,
} from "react-icons/fa";
import api from "@/services/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function Home() {
  const [stats, setStats] = useState({
    clients: 0,
    orders: 0,
    windows: 0,
    totalSales: 0,
  });
  const [monthlyOrders, setMonthlyOrders] = useState([]);

  const fetchData = async () => {
    try {
      const [clientsRes, ordersRes, windowsRes] = await Promise.all([
        api.get("/clients"),
        api.get("/orders"),
        api.get("/windows"),
      ]);

      const clients = clientsRes.data.length;
      const orders = ordersRes.data.length;
      const windows = windowsRes.data.length;
      const totalSales = ordersRes.data.reduce((sum, o) => sum + (o.total || 0), 0);

      const grouped = {};
      ordersRes.data.forEach((o) => {
        const date = new Date(o.createdAt || o.fecha || o.updatedAt);
        const month = date.toLocaleString("es-GT", { month: "short", year: "numeric" });
        grouped[month] = (grouped[month] || 0) + 1;
      });

      const monthly = Object.entries(grouped).map(([month, count]) => ({
        month,
        pedidos: count,
      }));

      setStats({ clients, orders, windows, totalSales });
      setMonthlyOrders(monthly);
    } catch (err) {
      console.error("❌ Error al obtener datos del dashboard:", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Panel principal</h1>

        {/* ── Tarjetas resumen ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
          <SummaryCard
            title="Clientes"
            value={stats.clients}
            icon={<FaUsers size={20} />}
            color="blue"
          />
          <SummaryCard
            title="Pedidos"
            value={stats.orders}
            icon={<FaClipboardList size={20} />}
            color="green"
          />
          <SummaryCard
            title="Ventanas"
            value={stats.windows}
            icon={<FaWindowMaximize size={20} />}
            color="indigo"
          />
          <SummaryCard
            title="Ventas"
            value={`Q ${stats.totalSales.toLocaleString("es-GT")}`}
            icon={<FaMoneyBillWave size={20} />}
            color="yellow"
            compact
          />
        </div>

        {/* ── Gráfica ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-10">
          <h2 className="text-base sm:text-xl font-semibold text-gray-700 mb-4">
            Pedidos por mes
          </h2>
          {monthlyOrders.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyOrders}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="pedidos"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm italic">
              No hay pedidos suficientes para mostrar estadísticas.
            </p>
          )}
        </div>

        {/* ── Accesos rápidos ── */}
        <h2 className="text-base sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
          <QuickAccess
            to="/orders"
            title="Ver Pedidos"
            desc="Consulta los pedidos activos y sus ventanas asociadas."
          />
          <QuickAccess
            to="/clients"
            title="Clientes"
            desc="Agrega, edita o elimina los clientes registrados."
          />
          <QuickAccess
            to="/admin"
            title="Administración"
            desc="Configura colores, tipos de ventana y catálogo PVC."
          />
        </div>

        <div className="mt-12 sm:mt-16 text-center text-gray-400 text-xs sm:text-sm">
          <p>VentPro © {new Date().getFullYear()} | Sistema de gestión de ventanas</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, compact = false }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    indigo: "bg-indigo-100 text-indigo-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-gray-500 text-xs sm:text-sm truncate">{title}</p>
          <h2 className={`font-semibold text-gray-800 mt-0.5 ${compact ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-3xl'} leading-tight`}>
            {value}
          </h2>
        </div>
        <div className={`${colors[color]} p-2 sm:p-3 rounded-lg flex-shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickAccess({ to, title, desc }) {
  return (
    <Link
      to={to}
      className="group bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg hover:border-blue-400 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-800">{title}</h3>
        <FaArrowRight className="text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" size={13} />
      </div>
      <p className="text-gray-500 text-xs sm:text-sm">{desc}</p>
    </Link>
  );
}