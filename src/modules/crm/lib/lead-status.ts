import type { CallResult, LeadStatus } from '../schema/lead.schema';

const STATUS_RANK: Record<LeadStatus, number> = {
  new: 0,
  contacting: 1,
  consulting: 2,
  awaiting_survey: 3,
  quoted: 4,
  negotiating: 5,
  won: 100,
  lost: 100,
};

function canAdvanceTo(current: LeadStatus, target: LeadStatus): boolean {
  if (current === 'won' || current === 'lost') return false;
  return STATUS_RANK[current] < STATUS_RANK[target];
}

function canSetLost(current: LeadStatus): boolean {
  return (
    current === 'new' ||
    current === 'contacting' ||
    current === 'consulting' ||
    current === 'awaiting_survey'
  );
}

/** Safe status transition after logging a call result. Returns null if status should not change. */
export function resolveStatusAfterCallResult(
  current: LeadStatus,
  callResult: CallResult,
): LeadStatus | null {
  switch (callResult) {
    case 'consulted':
      return canAdvanceTo(current, 'consulting') ? 'consulting' : null;
    case 'survey_agreed':
      return canAdvanceTo(current, 'awaiting_survey') ? 'awaiting_survey' : null;
    case 'not_interested':
    case 'wrong_number':
      return canSetLost(current) ? 'lost' : null;
    case 'no_answer':
    case 'call_back':
      return current === 'new' ? 'contacting' : null;
    default:
      return null;
  }
}

/** Status transition when sales clicks the call button. */
export function resolveStatusAfterCallAttempt(current: LeadStatus): LeadStatus | null {
  return current === 'new' ? 'contacting' : null;
}
