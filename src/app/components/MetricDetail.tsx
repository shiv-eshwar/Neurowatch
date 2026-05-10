import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface MetricDetailProps {
  domain: string;
  metrics: Array<{
    name: string;
    value: string | number;
    status: 'good' | 'watch' | 'concern' | 'neutral';
    description: string;
    baseline?: string | number;
  }>;
  flags: string[];
}

export function MetricDetail({ domain, metrics, flags }: MetricDetailProps) {
  const getStatusIcon = (status: string) => {
    if (status === 'good') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'concern') return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (status === 'watch') return <AlertCircle className="w-5 h-5 text-orange-600" />;
    return <Info className="w-5 h-5 text-gray-600" />;
  };

  const getStatusBg = (status: string) => {
    if (status === 'good') return 'bg-green-50 border-green-200';
    if (status === 'concern') return 'bg-red-50 border-red-200';
    if (status === 'watch') return 'bg-orange-50 border-orange-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4 capitalize">{domain} Metrics</h3>

      {flags.length > 0 && (
        <div className="mb-6 space-y-2">
          <h4 className="text-sm font-semibold text-orange-900">Detected Patterns</h4>
          {flags.map((flag, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-orange-800 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {metrics.map((metric, idx) => (
          <div key={idx} className={`border rounded-lg p-4 ${getStatusBg(metric.status)}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(metric.status)}
                <h4 className="font-semibold text-gray-900">{metric.name}</h4>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-gray-900">{metric.value}</div>
                {metric.baseline && (
                  <div className="text-xs text-gray-600">Baseline: {metric.baseline}</div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700">{metric.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
