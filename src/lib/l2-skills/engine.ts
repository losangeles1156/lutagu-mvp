import lineTopology from '@/lib/l2-skills/line-topology.jr-kanto.v1.json';
import incidentRules from '@/lib/l2-skills/incident-rules.v1.json';
import travelerExplanations from '@/lib/l2-skills/traveler-explanations.v1.json';

export type AdvisoryLevel = 'none' | 'watch' | 'warning';
export type RailImpactLevel = 'none' | 'potential' | 'active';
export type IncidentDetail = 'normal' | 'delay_minor' | 'delay_major' | 'halt' | 'canceled' | 'unknown';

type TopologyLine = {
  canonical_line_id: string;
  service_group: string;
  display_names: { ja: string; en: string; zh: string };
  aliases: string[];
  railway_ids: string[];
  related_railway_ids: string[];
};

const topology = lineTopology as { lines: TopologyLine[] };
const rules = incidentRules as {
  delay_major_threshold_minutes: number;
  rules: Record<'normal' | 'canceled' | 'halt' | 'delay', string[]>;
};
const explanations = travelerExplanations as {
  'zh-TW': Record<string, string>;
  en: Record<string, string>;
};

export function normalizeRailwayId(input: string): string {
  return String(input || '').trim().replace(/^odpt:Railway:/, 'odpt.Railway:');
}

function normalizeToken(input: string): string {
  return String(input || '').toLowerCase().replace(/[\s\-_.:]/g, '');
}

export function getTopologyLineByRailwayId(railwayId: string): TopologyLine | null {
  const normalized = normalizeRailwayId(railwayId);
  for (const line of topology.lines) {
    if (line.railway_ids.some((id) => normalizeRailwayId(id) === normalized)) return line;
    if (line.related_railway_ids.some((id) => normalizeRailwayId(id) === normalized)) return line;
  }
  return null;
}

export function getTopologyLineByDisplayName(nameEn?: string, nameJa?: string): TopologyLine | null {
  const enToken = normalizeToken(nameEn || '');
  const jaToken = normalizeToken(nameJa || '');

  for (const line of topology.lines) {
    const targets = [
      line.display_names.en,
      line.display_names.ja,
      line.display_names.zh,
      ...line.aliases,
    ].map(normalizeToken);

    if ((enToken && targets.includes(enToken)) || (jaToken && targets.includes(jaToken))) {
      return line;
    }
  }

  return null;
}

export function extractDelayMinutesFromText(text: string): number | null {
  const s = String(text || '');
  if (!s) return null;

  const candidates: number[] = [];
  const patterns: RegExp[] = [
    /(\d{1,3})\s*分/g,
    /(\d{1,3})\s*(?:min|mins|minutes)/gi,
    /delay(?:ed)?\s*(?:by|of)?\s*(\d{1,3})\s*(?:min|mins|minutes)/gi,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) candidates.push(n);
    }
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function containsAny(text: string, candidates: string[]): boolean {
  const lower = text.toLowerCase();
  return candidates.some((k) => lower.includes(k.toLowerCase()));
}

export function classifyIncidentDetail(params: {
  statusText?: string;
  messageJa?: string;
  messageEn?: string;
  messageZh?: string;
  severity?: string;
}): { detail: IncidentDetail; status: 'normal' | 'delay' | 'suspended'; delayMinutes: number | null } {
  const combined = `${params.statusText || ''}\n${params.messageJa || ''}\n${params.messageEn || ''}\n${params.messageZh || ''}`;

  if (containsAny(combined, rules.rules.normal)) {
    return { detail: 'normal', status: 'normal', delayMinutes: null };
  }

  if (containsAny(combined, rules.rules.canceled)) {
    return { detail: 'canceled', status: 'suspended', delayMinutes: null };
  }

  if (containsAny(combined, rules.rules.halt)) {
    return { detail: 'halt', status: 'suspended', delayMinutes: null };
  }

  const delayMinutes = extractDelayMinutesFromText(combined);
  if (delayMinutes !== null) {
    return {
      detail: delayMinutes >= rules.delay_major_threshold_minutes ? 'delay_major' : 'delay_minor',
      status: 'delay',
      delayMinutes,
    };
  }

  if (containsAny(combined, rules.rules.delay) || ['major', 'minor'].includes(String(params.severity || '').toLowerCase())) {
    return { detail: 'delay_minor', status: 'delay', delayMinutes: null };
  }

  if (String(params.severity || '').toLowerCase() === 'critical') {
    return { detail: 'halt', status: 'suspended', delayMinutes: null };
  }

  return { detail: 'unknown', status: 'normal', delayMinutes: null };
}

export function matchLineWithDisruption(params: {
  lineNameEn?: string;
  lineNameJa?: string;
  railwayId?: string;
  disruptionRailwayId?: string;
  disruptionLineNameEn?: string;
  disruptionLineNameJa?: string;
}) {
  const lineByName = getTopologyLineByDisplayName(params.lineNameEn, params.lineNameJa);
  const lineByRailway = getTopologyLineByRailwayId(params.railwayId || '');
  const baseLine = lineByRailway || lineByName;

  if (!baseLine) {
    return {
      matched: false,
      canonicalLineId: null,
      serviceGroup: null,
      confidence: 0.25,
      reasons: ['fallback_name_or_station_map'],
    };
  }

  const disruptionId = normalizeRailwayId(params.disruptionRailwayId || '');
  const disruptionLine = getTopologyLineByRailwayId(disruptionId)
    || getTopologyLineByDisplayName(params.disruptionLineNameEn, params.disruptionLineNameJa);

  if (!disruptionLine) {
    return {
      matched: false,
      canonicalLineId: baseLine.canonical_line_id,
      serviceGroup: baseLine.service_group,
      confidence: 0.45,
      reasons: ['no_disruption_line_match'],
    };
  }

  if (baseLine.canonical_line_id === disruptionLine.canonical_line_id) {
    return {
      matched: true,
      canonicalLineId: baseLine.canonical_line_id,
      serviceGroup: baseLine.service_group,
      confidence: 0.99,
      reasons: ['exact_canonical_match'],
    };
  }

  if (baseLine.service_group && baseLine.service_group === disruptionLine.service_group) {
    return {
      matched: true,
      canonicalLineId: baseLine.canonical_line_id,
      serviceGroup: baseLine.service_group,
      confidence: 0.84,
      reasons: ['same_service_group_related_line'],
    };
  }

  return {
    matched: false,
    canonicalLineId: baseLine.canonical_line_id,
    serviceGroup: baseLine.service_group,
    confidence: 0.35,
    reasons: ['different_service_group'],
  };
}

export function toWeatherAlertLevel(alerts: Array<{ severity?: string }>): AdvisoryLevel {
  if (!Array.isArray(alerts) || alerts.length === 0) return 'none';
  const sev = alerts.map((a) => String(a?.severity || '').toLowerCase());
  if (sev.some((s) => s === 'critical' || s === 'warning')) return 'warning';
  if (sev.some((s) => s === 'advisory' || s === 'info')) return 'watch';
  return 'none';
}

export function toRailImpactLevel(params: { hasRailIssue: boolean; weatherAlertLevel: AdvisoryLevel }): RailImpactLevel {
  if (params.hasRailIssue) return 'active';
  if (params.weatherAlertLevel !== 'none') return 'potential';
  return 'none';
}

function applyTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key) => String(vars[key] ?? ''));
}

export function buildTravelerExplanation(params: {
  lineName: string;
  status: 'normal' | 'delay' | 'suspended';
  weatherAlertLevel: AdvisoryLevel;
  railImpactLevel: RailImpactLevel;
  delayMinutes: number | null;
}): { plain_zh_tw: string; plain_en: string } {
  const bufferMinutes = params.delayMinutes ? Math.max(5, Math.min(30, params.delayMinutes)) : 10;

  if (params.status === 'suspended') {
    return {
      plain_zh_tw: applyTemplate(explanations['zh-TW'].suspended, { line: params.lineName, buffer_minutes: bufferMinutes }),
      plain_en: applyTemplate(explanations.en.suspended, { line: params.lineName, buffer_minutes: bufferMinutes }),
    };
  }

  if (params.status === 'delay') {
    return {
      plain_zh_tw: applyTemplate(explanations['zh-TW'].delay, { line: params.lineName, buffer_minutes: bufferMinutes }),
      plain_en: applyTemplate(explanations.en.delay, { line: params.lineName, buffer_minutes: bufferMinutes }),
    };
  }

  if (params.weatherAlertLevel !== 'none' && params.railImpactLevel === 'potential') {
    return {
      plain_zh_tw: explanations['zh-TW'].weather_watch_no_rail_impact,
      plain_en: explanations.en.weather_watch_no_rail_impact,
    };
  }

  return {
    plain_zh_tw: explanations['zh-TW'].normal,
    plain_en: explanations.en.normal,
  };
}

export function mapConditionToIconCode(condition: string): string {
  const c = String(condition || '').toLowerCase();
  if (c.includes('snow')) return 'snow';
  if (c.includes('thunder')) return 'thunder';
  if (c.includes('rain') || c.includes('showers')) return 'rain';
  if (c.includes('fog')) return 'fog';
  if (c.includes('wind')) return 'wind';
  if (c.includes('clear') || c.includes('sun')) return 'sunny';
  if (c.includes('cloud')) return 'cloudy';
  return 'unknown';
}
