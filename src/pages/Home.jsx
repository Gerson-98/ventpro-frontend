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

      const totalSales = ordersRes.data.reduce(
        (sum, o) => sum + (o.total || 0),
        0
      );

      // Agrupar pedidos por mes
      const grouped = {};
      ordersRes.data.forEach((o) => {
        const date = new Date(o.createdAt || o.fecha || o.updatedAt);
        const month = date.toLocaleString("es-GT", {
          month: "short",
          year: "numeric",
        });
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

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Panel principal</h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <SummaryCard
          title="Clientes"
          value={stats.clients}
          icon={<FaUsers size={24} />}
          color="blue"
        />
        <SummaryCard
          title="Pedidos"
          value={stats.orders}
          icon={<FaClipboardList size={24} />}
          color="green"
        />
        <SummaryCard
          title="Ventanas"
          value={stats.windows}
          icon={<FaWindowMaximize size={24} />}
          color="indigo"
        />
        <SummaryCard
          title="Ventas Totales"
          value={`Q ${stats.totalSales.toLocaleString("es-GT")}`}
          icon={<FaMoneyBillWave size={24} />}
          color="yellow"
        />
      </div>

      {/* Gráfica de Pedidos por mes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Pedidos por mes
        </h2>
        {monthlyOrders.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyOrders}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="pedidos"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm italic">
            No hay pedidos suficientes para mostrar estadísticas.
          </p>
        )}
      </div>

      {/* Accesos rápidos */}
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccess
          to="/orders"
          title="Ver Pedidos"
          desc="Consulta los pedidos activos y sus ventanas asociadas."
        />
        <QuickAccess
          to="/clients"
          title="Gestión de Clientes"
          desc="Agrega, edita o elimina los clientes registrados."
        />
        <QuickAccess
          to="/admin"
          title="Administración"
          desc="Configura colores, tipos de ventana y catálogo PVC."
        />
      </div>

      <div className="mt-16 text-center text-gray-400 text-sm">
        <p>VentPro © {new Date().getFullYear()} | Sistema de gestión de ventanas</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* Subcomponentes UI */
function SummaryCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    indigo: "bg-indigo-100 text-indigo-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h2 className="text-3xl font-semibold text-gray-800">{value}</h2>
        </div>
        <div className={`${colors[color]} p-3 rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickAccess({ to, title, desc }) {
  return (
    <Link
      to={to}
      className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-400 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <FaArrowRight className="text-gray-400 group-hover:text-blue-600 transition" />
      </div>
      <p className="text-gray-500 text-sm">{desc}</p>
    </Link>
  );
}
