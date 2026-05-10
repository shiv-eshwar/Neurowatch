import { Sparkles, Heart, Eye, Target, Bell } from 'lucide-react';

interface InsightsPanelProps {
  summary: string;
  positiveIndicators: string[];
  areasToWatch: string[];
  recommendations: string[];
  shouldAlert: boolean;
  nextFocus: string;
}

export function InsightsPanel({
  summary,
  positiveIndicators,
  areasToWatch,
  recommendations,
  shouldAlert,
  nextFocus
}: InsightsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Personalized Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Your Summary</h3>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </div>
        </div>
      </div>

      {/* Positive Indicators */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">What's Going Well</h3>
        </div>
        <ul className="space-y-2">
          {positiveIndicators.map((indicator, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
              <span className="text-gray-700 text-sm">{indicator}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Areas to Watch */}
      {areasToWatch.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Areas to Monitor</h3>
          </div>
          <ul className="space-y-2">
            {areasToWatch.map((area, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 text-sm">{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lifestyle Recommendations */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Wellness Suggestions</h3>
        </div>
        <ul className="space-y-2">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span className="text-gray-700 text-sm">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Next Session Focus */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Next Session Focus</h4>
            <p className="text-sm text-gray-700">{nextFocus}</p>
          </div>
        </div>
      </div>

      {shouldAlert && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">
            <strong>Caregiver Notification:</strong> Based on recent trends, your designated caregiver has been notified to provide support if needed.
          </p>
        </div>
      )}
    </div>
  );
}
