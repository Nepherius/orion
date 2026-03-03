interface HealingCostInput {
  medicalDecay: number;
  medicalMarkup: number;
  medicalME: number;
  medicalMEMarkup: number;
  isFapType?: boolean;
}

const toSafeNumber = (value: number, fallback: number = 0) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return value;
};

export function calculateHealingCostPerUse({
  medicalDecay,
  medicalMarkup,
  medicalME,
  medicalMEMarkup,
  isFapType = false,
}: HealingCostInput): number {
  const decay = Math.max(0, toSafeNumber(medicalDecay));
  const markup = Math.max(0, toSafeNumber(medicalMarkup));
  const me = Math.max(0, toSafeNumber(medicalME));
  const meMarkup = Math.max(0, toSafeNumber(medicalMEMarkup));

  const adjustedMedicalDecayPec = decay * (markup / 100);
  const decayCostPed = adjustedMedicalDecayPec / 100;
  const meCostPed = isFapType ? 0 : me * 0.0001 * (meMarkup / 100);

  return decayCostPed + meCostPed;
}
