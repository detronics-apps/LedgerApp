/** Reasons a colleague can flag someone else's entry for a second look - not
 * an accusation, just "can we double-check this together". */
export const FLAG_REASONS = [
  { value: 'duplicate', label: 'Looks like a duplicate' },
  { value: 'impact-too-high', label: 'Impact rated too high' },
  { value: 'impact-too-low', label: 'Impact rated too low' },
  { value: 'proof-too-high', label: 'Proof rated too high' },
  { value: 'proof-too-low', label: 'Proof rated too low' },
  { value: 'other', label: 'Other' },
];

/** open: just raised. under-review: an admin has picked it up. updated: the
 * entry's owner adjusted it. rejected: an admin looked and it's fine as-is. */
export const FLAG_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'under-review', label: 'Under review' },
  { value: 'updated', label: 'Updated' },
  { value: 'rejected', label: 'Rejected' },
];

export function flagReasonLabel(value) {
  return FLAG_REASONS.find((r) => r.value === value)?.label ?? value;
}

export function flagStatusLabel(value) {
  return FLAG_STATUSES.find((s) => s.value === value)?.label ?? value;
}

const ACTIVE_STATUSES = ['open', 'under-review'];

export function isActiveFlag(flag) {
  return ACTIVE_STATUSES.includes(flag.status);
}

/** One person can flag a given entry again only once their last flag on it
 * has been resolved (updated/rejected) - never while one of theirs is still
 * open or under review. Different people can each have their own active
 * flag on the same entry at the same time; that's the whole point of the
 * "flagged by N people" counter. */
export function hasActiveFlagFrom(flags, entryId, uid) {
  return flags.some((f) => f.entryId === entryId && f.flaggedBy === uid && isActiveFlag(f));
}
