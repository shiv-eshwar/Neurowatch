import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface RiskIndicatorProps {
  score: number;
  level: 'low' | 'moderate' | 'elevated' | 'high';
  label: string;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  sessionNumber: number;
}

export function RiskIndicator({ score, level, label, trend, sessionNumber }: RiskIndicatorProps) {
  const colors = {
    low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', ring: 'ring-green-500/20' },
    moderate: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', ring: 'ring-yellow-500/20' },
    elevated: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', ring: 'ring-orange-500/20' },
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-500/20' }
  };

  const colorScheme = colors[level];

  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingDown className="w-6 h-6 text-green-600" />;
    if (trend === 'declining') return <TrendingUp className="w-6 h-6 text-orange-600" />;
    if (trend === 'stable') return <Minus className="w-6 h-6 text-gray-600" />;
    return null;
  };

  const getTrendLabel = () => {
    if (trend === 'improving') return 'Improving';
    if (trend === 'declining') return 'Needs attention';
    if (trend === 'stable') return 'Stable';
    return 'Building baseline';
  };

  return (
    <div className={`${colorScheme.bg} ${colorScheme.border} border-2 rounded-2xl p-8 text-center`}>
      <div className="mb-3">
        <span className="text-sm text-gray-600">Session {sessionNumber}</span>
      </div>

      <div className="mb-4">
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${colorScheme.ring} ring-8 mb-4`}>
          <div className="text-center">
            <div className={`text-4xl font-semibold ${colorScheme.text}`}>{score}</div>
            <div className="text-xs text-gray-600 mt-1">/ 100</div>
          </div>
        </div>
      </div>

      <h2 className={`text-2xl font-semibold ${colorScheme.text} mb-2`}>
        {label}
      </h2>

      <div className="flex items-center justify-center gap-2 text-gray-700">
        {getTrendIcon()}
        <span>{getTrendLabel()}</span>
      </div>
    </div>
  );
}
