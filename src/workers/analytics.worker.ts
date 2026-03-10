/**
 * Analytics Web Worker for heavy statistical calculations
 * Handles confidence intervals, correlations, and more off the main thread
 */
import {
  calculateConfidenceInterval,
  calculateCoefficientOfVariation,
} from '../utils/analytics/stats';
import {
  calculatePearsonCorrelation,
  calculateMultipleCorrelation,
} from '../utils/analytics/correlation';

// Type definitions for worker messages
export type WorkerRequest =
  | { type: 'CALC_CONFIDENCE_INTERVAL'; payload: number[] }
  | { type: 'CALC_CV'; payload: number[] }
  | { type: 'CALC_CORRELATION'; payload: { x: number[]; y: number[] } }
  | { type: 'CALC_MULTIPLE_CORRELATION'; payload: { X: number[][]; y: number[] } }
  | {
      type: 'CALC_CORRELATION_ANALYTICS';
      payload: { durationHrs: number[]; costPed: number[]; lootPed: number[] };
    };

export type WorkerResponse =
  | { type: 'RESULT_CONFIDENCE_INTERVAL'; data: { lower: number; upper: number; mean: number } }
  | { type: 'RESULT_CV'; data: number }
  | { type: 'RESULT_CORRELATION'; data: { r: number; p: number } }
  | { type: 'RESULT_MULTIPLE_CORRELATION'; data: { rSquared: number; p: number } }
  | {
      type: 'RESULT_CORRELATION_ANALYTICS';
      data: {
        durationVsLoot: { r: number; p: number };
        costVsLoot: { r: number; p: number };
        multiple: { rSquared: number; p: number };
      };
    }
  | { type: 'ERROR'; error: string };

// Main worker message handler
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  try {
    const { type, payload } = e.data;

    switch (type) {
      case 'CALC_CONFIDENCE_INTERVAL': {
        const [lower, upper] = calculateConfidenceInterval(payload);
        const mean = payload.length > 0 ? payload.reduce((a, b) => a + b, 0) / payload.length : 0;
        self.postMessage({ type: 'RESULT_CONFIDENCE_INTERVAL', data: { lower, upper, mean } });
        break;
      }

      case 'CALC_CV': {
        const result = calculateCoefficientOfVariation(payload);
        self.postMessage({ type: 'RESULT_CV', data: result });
        break;
      }

      case 'CALC_CORRELATION': {
        const result = calculatePearsonCorrelation(payload.x, payload.y);
        self.postMessage({ type: 'RESULT_CORRELATION', data: result });
        break;
      }

      case 'CALC_MULTIPLE_CORRELATION': {
        const result = calculateMultipleCorrelation(payload.X[0], payload.X[1], payload.y);
        self.postMessage({ type: 'RESULT_MULTIPLE_CORRELATION', data: result });
        break;
      }

      case 'CALC_CORRELATION_ANALYTICS': {
        const durationVsLoot = calculatePearsonCorrelation(payload.durationHrs, payload.lootPed);
        const costVsLoot = calculatePearsonCorrelation(payload.costPed, payload.lootPed);
        const multiple = calculateMultipleCorrelation(
          payload.durationHrs,
          payload.costPed,
          payload.lootPed
        );
        self.postMessage({
          type: 'RESULT_CORRELATION_ANALYTICS',
          data: { durationVsLoot, costVsLoot, multiple },
        });
        break;
      }

      default:
        throw new Error(`Unknown worker task type: ${(e.data as WorkerRequest).type}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error instanceof Error) {
      self.postMessage({ type: 'ERROR', error: error.message });
    } else {
      self.postMessage({ type: 'ERROR', error: String(error) });
    }
  }
};
