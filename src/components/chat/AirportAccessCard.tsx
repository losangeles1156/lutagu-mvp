'use client';

import { useLocale, useTranslations } from 'next-intl';

interface AirportAccessCardProps {
  data: any;
}

export function AirportAccessCard({ data }: AirportAccessCardProps) {
  const locale = useLocale();
  const tL4 = useTranslations('l4.dashboard');
  const access = data?.airportAccess || data;
  if (!access) return null;

  const recommended = access.recommendation;
  const alternatives = Array.isArray(access.alternatives) ? access.alternatives : [];
  const tableOptions = [recommended, ...alternatives].filter(Boolean);

  const renderOption = (label: string, opt: any) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</div>
        <div className="text-xs font-bold text-slate-500">Score: {opt?.score ?? '-'}</div>
      </div>
      <div className="text-sm font-semibold text-slate-800">{opt?.option?.name || '-'}</div>
      <div className="text-xs text-slate-500 mt-1">
        {opt?.option?.typicalTimeMin ? `${opt.option.typicalTimeMin} min` : ''}
        {opt?.option?.typicalFareYen ? ` · ¥${opt.option.typicalFareYen}` : ''}
        {opt?.option?.typicalFareYenRange ? ` · ¥${opt.option.typicalFareYenRange[0]}-${opt.option.typicalFareYenRange[1]}` : ''}
      </div>
      {opt?.reasoning && (
        <div className="mt-2 text-[11px] text-slate-500">
          Headway penalty: {opt.reasoning.headwayPenalty ?? '-'} · Transfer penalty: {opt.reasoning.transferPenalty ?? '-'} · Weather penalty: {opt.reasoning.weatherPenalty ?? '-'}
        </div>
      )}
      {Array.isArray(opt?.option?.notes) && opt.option.notes.length > 0 && (
        <div className="mt-2 text-[11px] text-slate-600">
          {opt.option.notes.join(' · ')}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3 mt-4 w-full">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          {tL4('airportAccess') || 'Airport Access'}
        </span>
        <span className="text-[10px] font-bold text-slate-400">
          {access.airportName?.[locale] || access.airportName?.['zh-TW'] || access.airportName?.en || access.airport}
        </span>
      </div>

      {recommended && renderOption(tL4('recommended') || 'Recommended', recommended)}

      {tableOptions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            {tL4('comparison') || 'Comparison'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-slate-600">
              <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="text-left py-1 pr-2">{tL4('mode') || 'Mode'}</th>
                  <th className="text-left py-1 pr-2">{tL4('time') || 'Time'}</th>
                  <th className="text-left py-1 pr-2">{tL4('fare') || 'Fare'}</th>
                  <th className="text-left py-1 pr-2">{tL4('score') || 'Score'}</th>
                  <th className="text-left py-1 pr-2">{tL4('headway') || 'Headway'}</th>
                  <th className="text-left py-1 pr-2">{tL4('transfer') || 'Transfer'}</th>
                  <th className="text-left py-1 pr-2">{tL4('weather') || 'Weather'}</th>
                </tr>
              </thead>
              <tbody>
                {tableOptions.map((opt: any, idx: number) => {
                  const isRecommended = opt === recommended;
                  return (
                    <tr key={idx} className={isRecommended ? 'bg-amber-50/40' : ''}>
                      <td className="py-1 pr-2 font-semibold text-slate-700">
                        {opt?.option?.modeLabel || opt?.option?.name || '-'}
                      </td>
                      <td className="py-1 pr-2">
                        {opt?.option?.typicalTimeMin ? `${opt.option.typicalTimeMin} min` : '-'}
                      </td>
                      <td className="py-1 pr-2">
                        {opt?.option?.typicalFareYen ? `¥${opt.option.typicalFareYen}` : opt?.option?.typicalFareYenRange ? `¥${opt.option.typicalFareYenRange[0]}-${opt.option.typicalFareYenRange[1]}` : '-'}
                      </td>
                      <td className="py-1 pr-2">{opt?.score ?? '-'}</td>
                      <td className="py-1 pr-2">{opt?.reasoning?.headwayPenalty ?? '-'}</td>
                      <td className="py-1 pr-2">{opt?.reasoning?.transferPenalty ?? '-'}</td>
                      <td className="py-1 pr-2">{opt?.weatherAdjusted ? tL4('adjusted') || 'Adjusted' : '-'}</td>
                    </tr>
                  );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{tL4('alternatives') || 'Alternatives'}</div>
          {alternatives.map((opt: any, idx: number) => (
            <div key={idx}>{renderOption(`${tL4('optionLabel') || 'Option'} ${idx + 1}`, opt)}</div>
          ))}
        </div>
      )}

      {access.context && (
        <div className="text-[11px] text-slate-400 px-1">
          {access.context.date} {access.context.time} · {access.context.weatherSummary}
        </div>
      )}
    </div>
  );
}
