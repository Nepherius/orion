import { useMemo } from 'react';
import { HuntSession } from '../../types';
import {
    calculateConfidenceInterval,
    calculateCoefficientOfVariation,
    calculatePearsonCorrelation,
} from '../../utils/analyticsCalculations';
import { Target, TrendingUp, Activity, BarChart2 } from 'lucide-react';

interface StatisticalInsightsProps {
    filteredSessions: HuntSession[];
}

export function StatisticalInsights({ filteredSessions }: StatisticalInsightsProps) {
    const insightsData = useMemo(() => {
        // Only looking at actual hunting sessions that had valid cost and time
        const validSessions = filteredSessions.filter(
            (s) => s.status === 'completed' && s.stats.duration > 0 && s.stats.totalCost > 0
        );

        if (validSessions.length < 4) {
            return null;
        }

        const returnRates: number[] = [];
        const hitRates: number[] = [];
        const costPerMinutes: number[] = [];

        validSessions.forEach((s) => {
            const { totalLoot, totalCost, hits, criticalHits, shotsFired, duration } = s.stats;

            const sessionReturnRate = (totalLoot / totalCost) * 100;
            returnRates.push(sessionReturnRate);

            const sessionHitRate = shotsFired > 0 ? ((hits + criticalHits) / shotsFired) * 100 : 0;
            hitRates.push(sessionHitRate);

            const sessionCpm = totalCost / (duration / 60);
            costPerMinutes.push(sessionCpm);
        });

        // 1. 95% Confidence Interval for Lifetime Return Rate
        const [ciLower, ciUpper] = calculateConfidenceInterval(returnRates, 0.95);
        const meanReturn = returnRates.reduce((a, b) => a + b, 0) / returnRates.length;

        // 2. Return Rate Volatility (Coefficient of Variation)
        // Measures how erratic the returns are relative to their mean.
        const cv = calculateCoefficientOfVariation(returnRates);

        // 3. Does higher accuracy result in better returns?
        const hitRateVsReturn = calculatePearsonCorrelation(hitRates, returnRates);

        // 4. Does cycling faster (Cost per minute) result in better or worse % returns?
        const burnRateVsReturn = calculatePearsonCorrelation(costPerMinutes, returnRates);

        return {
            n: validSessions.length,
            meanReturn,
            ciLower,
            ciUpper,
            cv,
            hitRateVsReturn,
            burnRateVsReturn,
        };
    }, [filteredSessions]);

    if (!insightsData) {
        return (
            <div className="card p-6">
                <h3 className="text-lg font-bold mb-2">Advanced Statistical Modeling</h3>
                <p className="text-sm text-muted">
                    Not enough data to calculate advanced volatility and confidence interval models. Need at least 4 valid sessions.
                </p>
            </div>
        );
    }

    const { n, meanReturn, ciLower, ciUpper, cv, hitRateVsReturn, burnRateVsReturn } = insightsData;

    const getSignificanceLevel = (p: number) => {
        if (p < 0.001) return <span className="text-green-400 font-bold">Highly Significant (p &lt; 0.001)</span>;
        if (p < 0.01) return <span className="text-green-400 font-semibold">Very Significant (p &lt; 0.01)</span>;
        if (p < 0.05) return <span className="text-green-400">Significant (p &lt; 0.05)</span>;
        if (p < 0.1) return <span className="text-yellow-400">Marginally Significant</span>;
        return <span className="text-muted">Not Significant (p ≥ 0.10)</span>;
    };

    const getCorrelationStrength = (r: number) => {
        const abs = Math.abs(r);
        if (abs >= 0.8) return 'Very Strong';
        if (abs >= 0.6) return 'Strong';
        if (abs >= 0.4) return 'Moderate';
        if (abs >= 0.2) return 'Weak';
        return 'Very Weak / None';
    };

    const getVolatilityRating = (cv: number) => {
        if (cv < 10) return <span className="text-green-400">Extremely Consistent</span>;
        if (cv < 25) return <span className="text-blue-400">Consistent (Swarm/Grind)</span>;
        if (cv < 60) return <span className="text-yellow-400">Moderate Variance</span>;
        if (cv < 100) return <span className="text-orange-400">High Variance</span>;
        return <span className="text-red-400">Extreme Volatility (Jackpot Reliant)</span>;
    };

    return (
        <div className="card p-6">
            <div className="mb-4">
                <h3 className="text-lg font-bold">Advanced Statistical Modeling</h3>
                <p className="text-sm text-muted mt-1">
                    Deep analytics on volatility, expected value, and mechanical variance across {n} compiled sessions.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Metric 1: 95% Expected Value */}
                <div className="border border-border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <div className="text-sm text-muted font-medium">95% Expected Mean Return</div>
                    </div>
                    <div className="text-2xl font-bold mb-1">
                        {meanReturn.toFixed(1)}% <span className="text-sm font-normal text-muted ml-1">Avg</span>
                    </div>
                    <div className="text-sm">
                        Range: <span className="font-mono text-body">{ciLower.toFixed(1)}%</span> to <span className="font-mono text-body">{ciUpper.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-muted mt-2 border-t border-border pt-2">
                        Based on your session history, determining the statistical "True" average return ceiling.
                    </div>
                </div>

                {/* Metric 2: Loot Volatility Index */}
                <div className="border border-border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <div className="text-sm text-muted font-medium">Loot Volatility Index (CV)</div>
                    </div>
                    <div className="text-2xl font-bold mb-1 font-mono">
                        {cv.toFixed(1)}%
                    </div>
                    <div className="text-sm font-semibold">
                        {getVolatilityRating(cv)}
                    </div>
                    <div className="text-xs text-muted mt-2 border-t border-border pt-2">
                        Indicates how heavily you rely on large outlier globals rather than consistent small gains.
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Metric 3: Hit Rate Importance */}
                <div className="border border-border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-red-400" />
                        <div className="text-sm text-muted font-medium">Accuracy vs. Profitability</div>
                    </div>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="text-xs text-muted">Pearson's r</div>
                            <div className="text-xl font-bold font-mono">{hitRateVsReturn.r.toFixed(3)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted">Strength</div>
                            <div className="text-sm font-semibold">{getCorrelationStrength(hitRateVsReturn.r)}</div>
                        </div>
                    </div>
                    <div className="text-xs border-t border-border pt-2 mt-2 flex justify-between">
                        <span className="text-muted">p-value: {hitRateVsReturn.p.toFixed(4)}</span>
                        {getSignificanceLevel(hitRateVsReturn.p)}
                    </div>
                </div>

                {/* Metric 4: Burn Rate Importance */}
                <div className="border border-border rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart2 className="w-4 h-4 text-green-400" />
                        <div className="text-sm text-muted font-medium">Burn Rate (Cost/Min) vs. Profitability</div>
                    </div>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="text-xs text-muted">Pearson's r</div>
                            <div className="text-xl font-bold font-mono">{burnRateVsReturn.r.toFixed(3)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted">Strength</div>
                            <div className="text-sm font-semibold">{getCorrelationStrength(burnRateVsReturn.r)}</div>
                        </div>
                    </div>
                    <div className="text-xs border-t border-border pt-2 mt-2 flex justify-between">
                        <span className="text-muted">p-value: {burnRateVsReturn.p.toFixed(4)}</span>
                        {getSignificanceLevel(burnRateVsReturn.p)}
                    </div>
                </div>
            </div>
        </div>
    );
}
