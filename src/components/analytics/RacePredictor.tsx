"use client";

import * as React from "react";

interface Prediction {
  distance: string;
  distanceKm: number;
  predictedSeconds: number;
  formatted: string;
}

interface RacePredictorData {
  predictions: Prediction[];
  message?: string;
  basedOnRun?: {
    distanceKm: string;
    durationS: number;
    paceSPerKm: number | null;
  };
}

export function RacePredictor() {
  const [data, setData] = React.useState<RacePredictorData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/analytics/race-predictor")
      .then((r: Response) => r.json())
      .then((d: RacePredictorData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.predictions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {data?.message ?? "Complete a run over 3km to unlock race predictions."}
      </p>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 text-xs font-black uppercase tracking-widest text-black">
              Race
            </th>
            <th className="text-right py-2 text-xs font-black uppercase tracking-widest text-black">
              Predicted Time
            </th>
          </tr>
        </thead>
        <tbody>
          {data.predictions.map((p: Prediction) => (
            <tr
              key={p.distance}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 font-medium text-black">{p.distance}</td>
              <td className="py-3 text-right font-mono font-black text-black text-base">
                {p.formatted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.basedOnRun && (
        <p className="text-xs text-muted-foreground mt-3">
          Based on your best {data.basedOnRun.distanceKm}km effort (Riegel formula)
        </p>
      )}
    </div>
  );
}
