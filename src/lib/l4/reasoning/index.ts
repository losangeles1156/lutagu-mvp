/**
 * LUTAGU Agent Reasoning Chain
 *
 * 核心模組：讓 AI 具備交通決策的思考能力
 *
 * 三大指標：
 * 1. TPI (Transfer Pain Index) - 轉乘辛苦指標
 * 2. CDR (Cascade Delay Risk) - 延誤連鎖風險
 * 3. WVC (Wait Value Coefficient) - 等待價值係數
 */

// Types
export * from './types';

// TPI - Transfer Pain Index
export {
  calcTransferPainIndex,
  getTransferTPI,
  PRESET_TPI
} from './TransferPainIndex';

// CDR - Cascade Delay Risk
export {
  calcTransferSuccessRate,
  estimateTransferTime,
  calcCascadeDelayRisk,
  calcLastTrainRisk,
  scanCascadeImpact
} from './CascadeDelayRisk';

// WVC - Wait Value Coefficient
export {
  calcWaitValue,
  shouldAdviseToRest,
  generateCoffeeBreakSuggestion
} from './WaitValueCoefficient';
