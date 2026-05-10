import { Activity, Brain, Clock, Mic, TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react';

interface DomainCardProps {
  domain: 'typing' | 'reaction' | 'memory' | 'voice';
  score: number | null;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  flags: string[];
  observation: string;
  onClick?: () => void;
}

export function DomainCard({ domain, score, trend, flags, observation, onClick }: DomainCardProps) {
  const domainConfig = {
    typing: {
      icon: Activity,
      title: 'Typing Dynamics',
      description: 'Motor coordination & rhythm',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    reaction: {
      icon: Clock,
      title: 'Reaction Time',
      description: 'Processing speed & attention',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    memory: {
      icon: Brain,
      title: 'Memory Performance',
      description: 'Recall & recognition',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    voice: {
      icon: Mic,
      title: 'Voice Characteristics',
      description: 'Speech patterns & articulation',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600'
    }
  };

  const config = domainConfig[domain];
  const Icon = config.icon;

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score <= 25) return 'text-green-600';
    if (score <= 50) return 'text-yellow-600';
    if (score <= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-gray-50';
    if (score <= 25) return 'bg-green-50';
    if (score <= 50) return 'bg-yellow-50';
    if (score <= 70) return 'bg-orange-50';
    return 'bg-red-50';
  };

  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingDown className="w-4 h-4 text-green-600" />;
    if (trend === 'declining') return <TrendingUp className="w-4 h-4 text-orange-600" />;
    if (trend === 'stable') return <Minus className="w-4 h-4 text-gray-600" />;
    return null;
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 ${config.iconBg} rounded-lg`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.title}</h3>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
        </div>

        <div className={`${getScoreBg(score)} px-4 py-2 rounded-lg text-center min-w-[60px]`}>
          <div className={`text-2xl font-semibold ${getScoreColor(score)}`}>
            {score ?? '—'}
          </div>
          <div className="text-xs text-gray-600">/ 100</div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-700 leading-relaxed">{observation}</p>
      </div>

      {flags.length > 0 && (
        <div className="mb-4 space-y-1">
          {flags.slice(0, 2).map((flag, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{flag}</span>
            </div>
          ))}
          {flags.length > 2 && (
            <div className="text-xs text-gray-500 px-3">+{flags.length - 2} more</div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-600">
        {getTrendIcon()}
        <span className="capitalize">{trend.replace('_', ' ')}</span>
      </div>
    </div>
  );
}
