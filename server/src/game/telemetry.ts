interface MetricPoint {
  key: string;
  value: number;
  ts: string;
}

const metrics = new Map<string, number>();
const economyAudit: MetricPoint[] = [];

export function incrementMetric(key: string, value = 1): void {
  metrics.set(key, (metrics.get(key) ?? 0) + value);
}

export function addEconomyAudit(key: string, value: number): void {
  economyAudit.push({
    key,
    value,
    ts: new Date().toISOString()
  });
}

export function getMetrics(): Record<string, number> {
  return Object.fromEntries(metrics.entries());
}

export function getEconomyAuditTail(limit = 100): MetricPoint[] {
  return economyAudit.slice(-limit);
}
