
export interface MonitoringMetrics {
    totalRequests: number;
    llmRequests: number;
    templateHits: number;
    algorithmHits: number;
    poiTaggedHits: number;
    cacheHitRate: number;
    avgResponseTime: number;
}

class MetricsCollector {
    private metrics = {
        totalRequests: 0,
        llmRequests: 0,
        templateHits: 0,
        algorithmHits: 0,
        poiTaggedHits: 0,
        totalResponseTime: 0,
        cacheHits: 0,
    };

    public recordRequest(source: 'template' | 'algorithm' | 'llm' | 'poi_tagged' | 'knowledge', responseTime: number, isCacheHit: boolean = false) {
        this.metrics.totalRequests++;
        this.metrics.totalResponseTime += responseTime;

        if (source === 'template') this.metrics.templateHits++;
        if (source === 'algorithm') this.metrics.algorithmHits++;
        if (source === 'llm') this.metrics.llmRequests++;
        if (source === 'poi_tagged') this.metrics.poiTaggedHits++;
        if (source === 'knowledge') this.metrics.templateHits++; // Count knowledge as a type of smart hit
        if (isCacheHit) this.metrics.cacheHits++;

        this.logMetrics();
    }

    public getSnapshot(): MonitoringMetrics {
        return {
            totalRequests: this.metrics.totalRequests,
            llmRequests: this.metrics.llmRequests,
            templateHits: this.metrics.templateHits,
            algorithmHits: this.metrics.algorithmHits,
            poiTaggedHits: this.metrics.poiTaggedHits,
            cacheHitRate: this.metrics.totalRequests > 0 ? this.metrics.cacheHits / this.metrics.totalRequests : 0,
            avgResponseTime: this.metrics.totalRequests > 0 ? this.metrics.totalResponseTime / this.metrics.totalRequests : 0,
        };
    }

    private logMetrics() {
        const snapshot = this.getSnapshot();
        const llmUsageRate = (snapshot.llmRequests / snapshot.totalRequests) * 100;
        console.log(`[Metrics] LLM Usage Rate: ${llmUsageRate.toFixed(1)}% | Cache Hit Rate: ${(snapshot.cacheHitRate * 100).toFixed(1)}%`);

        if (llmUsageRate > 15) {
            console.warn(`[Alert] LLM usage rate exceeded 15%! Current: ${llmUsageRate.toFixed(1)}%`);
        }
    }
}

export const metricsCollector = new MetricsCollector();
