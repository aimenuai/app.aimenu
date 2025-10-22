import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts';

interface AnalyticsChartProps {
  trendData: { date: string; visits: number; sources: Record<string, number> }[];
  getSourceColor: (source: string) => string;
  getSourceLabel: (source: string) => string;
}

export default function AnalyticsChart({ trendData, getSourceColor, getSourceLabel }: AnalyticsChartProps) {
  const chartData = trendData.map(d => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    QR: d.sources.QR || 0,
    GMB: d.sources.GMB || 0,
    FB: d.sources.FB || 0,
    IG: d.sources.IG || 0,
    LI: d.sources.LI || 0,
    TT: d.sources.TT || 0,
  }));

  const sources = ['QR', 'GMB', 'FB', 'IG', 'LI', 'TT'];

  const allVisitsCount = trendData.reduce((sum, d) => sum + d.visits, 0);

  const totalBySource = sources.reduce((acc, source) => {
    const total = trendData.reduce((sum, d) => sum + (d.sources[source] || 0), 0);
    if (total > 0) {
      acc.push({
        name: source,
        value: total,
        fill: getSourceColor(source),
        label: getSourceLabel(source)
      });
    }
    return acc;
  }, [] as { name: string; value: number; fill: string; label: string }[]);

  const knownSourcesTotal = totalBySource.reduce((sum, item) => sum + item.value, 0);
  const otherVisits = allVisitsCount - knownSourcesTotal;

  if (otherVisits > 0) {
    totalBySource.push({
      name: 'OTHER',
      value: otherVisits,
      fill: '#9ca3af',
      label: 'Other'
    });
  }

  const totalVisits = allVisitsCount;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
      <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              padding={{ left: 30, right: 30 }}
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              width={50}
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
              labelStyle={{ color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}
              itemStyle={{ color: '#ffffff', fontSize: '13px' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => getSourceLabel(value)}
            />
            <Line
              type="monotone"
              dataKey="QR"
              stroke={getSourceColor('QR')}
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="GMB"
              stroke={getSourceColor('GMB')}
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="FB"
              stroke={getSourceColor('FB')}
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="IG"
              stroke={getSourceColor('IG')}
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="LI"
              stroke={getSourceColor('LI')}
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="TT"
              stroke={getSourceColor('TT')}
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full lg:w-96" style={{ minHeight: '400px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={totalBySource}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              innerRadius="50%"
              paddingAngle={2}
              label={(entry) => `${entry.label}: ${entry.value}`}
              labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
            >
              {totalBySource.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <Label
                value={totalVisits}
                position="center"
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  fill: '#1f2937'
                }}
              />
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
              itemStyle={{ color: '#ffffff', fontSize: '13px' }}
              formatter={(value: number, name: string) => {
                const item = totalBySource.find(s => s.name === name);
                const percentage = ((value / totalVisits) * 100).toFixed(1);
                return [`${value} (${percentage}%)`, item?.label || name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
