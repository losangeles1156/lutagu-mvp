import type { ResponseSchema } from './types';

export function formatDecisionResponse(res: ResponseSchema, locale: string): string {
    const isZh = locale.startsWith('zh');
    if (isZh) {
        return [
            `🎯 最佳行動建議: ${res.primary_answer}`,
            `🔮 情境預告: ${res.scenario_preview}`,
            `⚠️ 風險提醒: ${res.risk_warning}`,
            `➡️ 下一步: ${res.next_action}`,
        ].join('\n');
    }

    return [
        `🎯 Best Action: ${res.primary_answer}`,
        `🔮 Scenario Preview: ${res.scenario_preview}`,
        `⚠️ Risk: ${res.risk_warning}`,
        `➡️ Next Step: ${res.next_action}`,
    ].join('\n');
}
