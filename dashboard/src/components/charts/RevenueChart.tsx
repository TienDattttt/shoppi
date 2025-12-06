import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
    { name: "Mon", revenue: 4000 },
    { name: "Tue", revenue: 3000 },
    { name: "Wed", revenue: 2000 },
    { name: "Thu", revenue: 2780 },
    { name: "Fri", revenue: 1890 },
    { name: "Sat", revenue: 2390 },
    { name: "Sun", revenue: 3490 },
];

export function RevenueChart() {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ee4d2d" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ee4d2d" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6B7280", fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6B7280", fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        cursor={{ stroke: "#ee4d2d", strokeWidth: 1 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#ee4d2d"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
