export const IMPACT_LEVELS = [
  { value: 1, label: 'Small help', description: 'A quick, low-effort assist with limited or personal scope.' },
  { value: 2, label: 'Noticeable help', description: 'Saved someone real time or unblocked a specific problem.' },
  { value: 3, label: 'Meaningful contribution', description: "Improved how a team or process works, not just one person's day." },
  { value: 4, label: 'Significant improvement', description: 'Measurably improved outcomes across a team or client, likely to keep paying off.' },
  { value: 5, label: 'Company-shaping improvement', description: 'Changed how the company operates, wins work, or is perceived, company-wide.' },
];

export const PROOF_LEVELS = [
  { value: 1, label: 'Trust me', description: 'No specific evidence.' },
  { value: 2, label: 'Here is the data', description: 'A document, link, or result exists.' },
  { value: 3, label: 'Here is proof of the impact', description: 'Clear evidence the impact actually happened.' },
];

/** points = impact x proof x taskWeight x categoryWeight; weights default to 1 for an unweighted task/category. */
export function computePoints(impact, proof, taskWeight = 1, categoryWeight = 1) {
  return impact * proof * taskWeight * categoryWeight;
}
