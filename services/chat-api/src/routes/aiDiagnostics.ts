import { Router } from 'express';
import { supabaseAdmin } from '@/lib/supabase';

export const aiDiagnosticsRouter = Router();

aiDiagnosticsRouter.get('/', async (req, res) => {
    try {
        const hours = Number(req.query.hours || 24);
        const limit = Math.min(5000, Math.max(100, Number(req.query.limit || 2000)));
        const locale = typeof req.query.locale === 'string' ? req.query.locale : undefined;
        const nodeId = typeof req.query.nodeId === 'string' ? req.query.nodeId : undefined;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        let query = supabaseAdmin
            .from('ai_chat_metrics')
            .select('created_at, locale, response_time_ms, input_length, output_length, had_error, error_message, metadata')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (locale) query = query.eq('locale', locale);
        if (nodeId) query = query.eq('node_id', nodeId);

        const { data, error } = await query;
        if (error) {
            res.status(500).json({ error: 'query_failed', message: error.message });
            return;
        }

        const records = data || [];
        const total = records.length;
        const byDecisionSource = new Map<string, number>();
        const byDecisionLevel = new Map<string, number>();
        const byAnomalyReason = new Map<string, number>();
        const byAgentTool = new Map<string, number>();
        const byMatchedSkill = new Map<string, number>();
        const byFallback = { true: 0, false: 0 };
        const byDataMuxHit = { true: 0, false: 0 };
        const byErrorMessage = new Map<string, number>();

        let errorCount = 0;
        let totalLatency = 0;
        let totalInput = 0;
        let totalOutput = 0;
        let anomalyDetected = 0;
        let anomalyFalsePositive = 0;
        let alphaNumericMissing = 0;
        let emojiOnly = 0;
        let cjkOnly = 0;

        for (const row of records) {
            const meta = (row as any).metadata || {};
            const decisionSource = meta.decisionSource || 'unknown';
            const decisionLevel = meta.decisionLevel || 'unknown';
            const anomalyReason = meta.anomalyReason || '';
            const agentTool = meta.agentTool || '';
            const matchedSkill = meta.matchedSkill || '';
            const usedFallback = Boolean(meta.usedFallback);
            const dataMuxHit = Boolean(meta.dataMuxHit);

            byDecisionSource.set(decisionSource, (byDecisionSource.get(decisionSource) || 0) + 1);
            byDecisionLevel.set(decisionLevel, (byDecisionLevel.get(decisionLevel) || 0) + 1);
            if (anomalyReason) byAnomalyReason.set(anomalyReason, (byAnomalyReason.get(anomalyReason) || 0) + 1);
            if (agentTool) byAgentTool.set(agentTool, (byAgentTool.get(agentTool) || 0) + 1);
            if (matchedSkill) byMatchedSkill.set(matchedSkill, (byMatchedSkill.get(matchedSkill) || 0) + 1);
            byFallback[usedFallback ? 'true' : 'false'] += 1;
            byDataMuxHit[dataMuxHit ? 'true' : 'false'] += 1;

            const hadError = Boolean((row as any).had_error);
            if (hadError) {
                errorCount += 1;
                const msg = String((row as any).error_message || 'unknown');
                byErrorMessage.set(msg, (byErrorMessage.get(msg) || 0) + 1);
            }

            totalLatency += Number((row as any).response_time_ms || 0);
            totalInput += Number((row as any).input_length || 0);
            totalOutput += Number((row as any).output_length || 0);

            const inputHasAlphaNumeric = Boolean(meta.inputHasAlphaNumeric);
            const inputHasEmoji = Boolean(meta.inputHasEmoji);
            const inputHasCjk = Boolean(meta.inputHasCjk);
            const inputIsEmojiOnly = Boolean(meta.inputIsEmojiOnly) || (inputHasEmoji && !inputHasAlphaNumeric && !inputHasCjk);
            const inputIsCjkOnly = Boolean(meta.inputIsCjkOnly) || (inputHasCjk && !inputHasAlphaNumeric);
            const isAnomaly = Boolean(meta.anomalyDetected ?? anomalyReason);

            if (isAnomaly) anomalyDetected += 1;
            if (isAnomaly && inputHasAlphaNumeric) anomalyFalsePositive += 1;

            if (!inputHasAlphaNumeric) alphaNumericMissing += 1;
            if (inputIsEmojiOnly) emojiOnly += 1;
            if (inputIsCjkOnly) cjkOnly += 1;
        }

        const asSortedArray = (m: Map<string, number>) =>
            Array.from(m.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => ({ key, count }));

        const response = {
            window_hours: hours,
            total,
            error_rate: total > 0 ? errorCount / total : 0,
            anomaly_rate: total > 0 ? anomalyDetected / total : 0,
            anomaly_false_positive_rate: anomalyDetected > 0 ? anomalyFalsePositive / anomalyDetected : 0,
            avg_latency_ms: total > 0 ? totalLatency / total : 0,
            avg_input_length: total > 0 ? totalInput / total : 0,
            avg_output_length: total > 0 ? totalOutput / total : 0,
            decision_source: asSortedArray(byDecisionSource),
            decision_level: asSortedArray(byDecisionLevel),
            anomaly_reason: asSortedArray(byAnomalyReason),
            agent_tool: asSortedArray(byAgentTool),
            matched_skill: asSortedArray(byMatchedSkill),
            used_fallback: byFallback,
            data_mux_hit: byDataMuxHit,
            error_message: asSortedArray(byErrorMessage).slice(0, 10),
            input_patterns: {
                alpha_numeric_missing: alphaNumericMissing,
                emoji_only: emojiOnly,
                emoji_only_rate: total > 0 ? emojiOnly / total : 0,
                cjk_only: cjkOnly
            }
        };

        res.json(response);
    } catch (e: any) {
        res.status(500).json({ error: 'diagnostics_failed', message: e?.message || String(e) });
    }
});
