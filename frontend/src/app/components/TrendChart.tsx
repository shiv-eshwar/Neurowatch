import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

interface TrendChartProps {
  data: Array<{
    session: number;
    overall: number;
    typing?: number;
    reaction?: number;
    memory?: number;
    voice?: number;
  }>;
  showDomains?: boolean;
}

export function TrendChart({ data, showDomains = false }: TrendChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Progress Over Time</h3>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="session"
            label={{ value: 'Session Number', position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis
            label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
            stroke="#6b7280"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          <Legend />

          <Area
            type="monotone"
            dataKey="overall"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#colorOverall)"
            name="Overall Risk"
          />

          {showDomains && (
            <>
              <Line type="monotone" dataKey="typing" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Typing" />
              <Line type="monotone" dataKey="reaction" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Reaction" />
              <Line type="monotone" dataKey="memory" stroke="#6366f1" strokeWidth={1.5} dot={false} name="Memory" />
              <Line type="monotone" dataKey="voice" stroke="#ec4899" strokeWidth={1.5} dot={false} name="Voice" />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t border-gray-200 pt-4">
        <div>
          <div className="text-sm text-gray-600">Current</div>
          <div className="text-xl font-semibold text-gray-900">{data[data.length - 1]?.overall ?? '—'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Baseline</div>
          <div className="text-xl font-semibold text-gray-900">{data[0]?.overall ?? '—'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Change</div>
          <div className={`text-xl font-semibold ${
            (data[data.length - 1]?.overall ?? 0) > (data[0]?.overall ?? 0)
              ? 'text-orange-600'
              : 'text-green-600'
          }`}>
            {data.length > 1
              ? `${(data[data.length - 1]?.overall ?? 0) - (data[0]?.overall ?? 0) > 0 ? '+' : ''}${((data[data.length - 1]?.overall ?? 0) - (data[0]?.overall ?? 0)).toFixed(0)}`
              : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
