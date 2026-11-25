import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

export default function AnalyticsCharts({ variant, chartData = [], totals = {}, reduceMotion = false }) {
  if (variant === 'trend') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 16, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#43c9ff" stopOpacity={0.26} />
              <stop offset="95%" stopColor="#43c9ff" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#edf1f7" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#91a8c6', fontSize: 12 }} dy={10} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#91a8c6', fontSize: 12 }} />
          <Tooltip contentStyle={{ color: '#e4efff', background: 'rgba(10,25,44,.96)', borderRadius: 12, border: '1px solid rgba(126,180,244,.28)', boxShadow: '0 12px 30px rgba(0,0,0,.32)' }} />
          <Area type="monotone" dataKey="count" stroke="#45c9ff" strokeWidth={3} fill="url(#blueFill)" activeDot={{ r: 5 }} isAnimationActive={!reduceMotion} />
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
          isAnimationActive={!reduceMotion}
        >
          <Cell fill="#45bd90" />
          <Cell fill="#213650" />
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
