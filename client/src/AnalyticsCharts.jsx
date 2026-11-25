import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

export default function AnalyticsCharts({ variant, chartData = [], totals = {} }) {
  if (variant === 'trend') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 16, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3478f6" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#3478f6" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#edf1f7" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8390a5', fontSize: 12 }} dy={10} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8390a5', fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8edf5', boxShadow: '0 12px 30px #152b4c12' }} />
          <Area type="monotone" dataKey="count" stroke="#3478f6" strokeWidth={3} fill="url(#blueFill)" activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={[
            { name: 'Reunited', value: totals.reunited },
            { name: 'Still active', value: Math.max(totals.total - totals.reunited, 0) },
          ]}
          innerRadius={62}
          outerRadius={82}
          dataKey="value"
          stroke="none"
          startAngle={90}
          endAngle={-270}
        >
          <Cell fill="#45bd90" />
          <Cell fill="#edf2f8" />
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
