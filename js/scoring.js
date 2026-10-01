export const IMPACT_LEVELS = [
  { value: 1, label: 'Small help', description: 'A quick, low-effort assist with limited or personal scope.' },
  { value: 2, label: 'Noticeable help', description: 'Saved someone real time or unblocked a specific problem.' },
  { value: 3, label: 'Meaningful contribution', description: "Improved how a team or process works, not just one person's day." },
  { value: 4, label: 'Significant improvement', description: 'Measurably improved outcomes across a team or client, likely to keep paying off.' },
  { value: 5, label: 'Company-shaping improvement', description: 'Change how the company operates, do/get work, or is perceived. Company wide change.' },
];

export const PROOF_LEVELS = [
  { value: 1, label: 'Trust me', description: 'Verbal only - just your word, or a colleague who can vouch for it out loud.' },
  { value: 2, label: 'A reference', description: 'Some effort went into recording it - an email, meeting minutes, or similar.' },
  { value: 3, label: 'The full record', description: 'Effort captured in an actual document, presentation or tool that everyone can see and use - a training guide, a written explanation, or a link to a page (e.g. OneNote) that lays it out.' },
];

/** points = impact x proof x taskWeight x categoryWeight; weights default to 1 for an unweighted task/category. */
export function computePoints(impact, proof, taskWeight = 1, categoryWeight = 1) {
  return impact * proof * taskWeight * categoryWeight;
}
