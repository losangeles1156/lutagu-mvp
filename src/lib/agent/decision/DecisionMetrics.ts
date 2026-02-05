export interface DecisionMetricsSnapshot {
    totalRequests: number;
    intentCoverage: number; // 0-1
    decisionAdequacy: number; // 0-1
    scenarioCompleteness: number; // 0-1
}

class DecisionMetricsCollector {
    private total = 0;
    private intentCaptured = 0;
    private adequate = 0;
    private scenarioComplete = 0;

    recordIntent(intent: string) {
        this.total += 1;
        if (intent && intent !== 'unknown') this.intentCaptured += 1;
    }

    recordAdequacy(ok: boolean) {
        if (ok) this.adequate += 1;
    }

    recordScenarioCompleteness(ok: boolean) {
        if (ok) this.scenarioComplete += 1;
    }

    snapshot(): DecisionMetricsSnapshot {
        const total = Math.max(this.total, 1);
        return {
            totalRequests: this.total,
            intentCoverage: this.intentCaptured / total,
            decisionAdequacy: this.adequate / total,
            scenarioCompleteness: this.scenarioComplete / total,
        };
    }

    logSnapshot(prefix: string) {
        const snap = this.snapshot();
        console.log(`[DecisionMetrics:${prefix}] Intent=${(snap.intentCoverage * 100).toFixed(1)}% | Adequacy=${(snap.decisionAdequacy * 100).toFixed(1)}% | Scenario=${(snap.scenarioCompleteness * 100).toFixed(1)}% | Total=${snap.totalRequests}`);
    }
}

export const decisionMetrics = new DecisionMetricsCollector();
