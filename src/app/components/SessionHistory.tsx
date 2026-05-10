import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Session {
  session_number: number;
  date: string;
  overall_score: number;
  risk_level: string;
  trend: string;
}

interface SessionHistoryProps {
  sessions: Session[];
  onSelectSession?: (sessionNumber: number) => void;
}

export function SessionHistory({ sessions, onSelectSession }: SessionHistoryProps) {
  const getLevelColor = (level: string) => {
    const colors = {
      low: 'bg-green-100 text-green-700 border-green-200',
      moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      elevated: 'bg-orange-100 text-orange-700 border-orange-200',
      high: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingDown className="w-4 h-4 text-green-600" />;
    if (trend === 'declining') return <TrendingUp className="w-4 h-4 text-orange-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Session History</h3>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {sessions.slice().reverse().map((session) => (
          <div
            key={session.session_number}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onSelectSession?.(session.session_number)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-gray-900">Session {session.session_number}</div>
                <div className={`px-3 py-1 rounded-full text-xs border ${getLevelColor(session.risk_level)}`}>
                  {session.risk_level.toUpperCase()}
                </div>
              </div>
              <div className="text-2xl font-semibold text-gray-900">{session.overall_score}</div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">{session.date}</div>
              <div className="flex items-center gap-1">
                {getTrendIcon(session.trend)}
                <span className="text-gray-600 capitalize">{session.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
