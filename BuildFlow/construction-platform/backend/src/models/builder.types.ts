/**
 * Builder modules: schedule, daily logs, change orders, selections, leads, estimates and the client portal.
 * Dates without a time are ISO `YYYY-MM-DD` strings; timestamps are ISO strings. Money is in dollars (number).
 */

// ---------- schedule ----------
export type ScheduleStatus = 'not_started' | 'in_progress' | 'complete';
export interface ScheduleItem {
  id: string; projectId: string;
  title: string;
  startDate: string; endDate: string;          // inclusive work days on the calendar
  predecessorIds: string[];                    // finish-to-start: starts the day after every predecessor ends
  lagDays: number;                             // extra days after the latest predecessor
  assignees: string[];                         // people or trade partners (free text or vendor ids)
  status: ScheduleStatus; progress: number;    // 0-100
  visibleToClient: boolean;
  notes?: string;
  createdAt: string; updatedAt: string;
}

// ---------- daily logs ----------
export interface DailyLog {
  id: string; projectId: string;
  date: string; author: string;
  weather?: { conditions?: string; highF?: number; lowF?: number; delay?: boolean };
  crew: { name: string; company?: string; hours?: number }[];
  workPerformed: string;
  delays?: string; safety?: string;
  photos: { url: string; caption?: string }[];
  visibleToClient: boolean;
  createdAt: string; updatedAt: string;
}

// ---------- change orders ----------
export type ChangeOrderStatus = 'draft' | 'pending_client' | 'approved' | 'declined' | 'void';
export interface PricedLine { description: string; quantity: number; unitCost: number; markupPct: number }
export interface ChangeOrder {
  id: string; projectId: string;
  number: string;                               // CO-0001, per project
  title: string; description?: string;
  lines: PricedLine[];
  scheduleImpactDays: number;
  status: ChangeOrderStatus;
  sentAt?: string; decidedAt?: string; decidedBy?: string; signatureName?: string; declineReason?: string;
  createdAt: string; updatedAt: string;
}

// ---------- selections ----------
export type SelectionStatus = 'pending' | 'selected' | 'approved' | 'ordered';
export interface SelectionOption { id: string; name: string; description?: string; price: number; vendor?: string; imageUrl?: string }
export interface Selection {
  id: string; projectId: string;
  category: string; title: string;
  allowance: number; dueDate?: string;
  options: SelectionOption[];
  chosenOptionId?: string; clientNotes?: string; chosenAt?: string; chosenBy?: string;
  status: SelectionStatus;
  createdAt: string; updatedAt: string;
}

// ---------- leads ----------
export const LEAD_STAGES = ['new', 'contacted', 'site_visit', 'estimating', 'proposal_sent', 'won', 'lost'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
export interface Lead {
  id: string;
  name: string;                                 // the job/opportunity, e.g. "Smith kitchen remodel"
  contactName?: string; email?: string; phone?: string; address?: string;
  source?: string; stage: LeadStage;
  estimatedValue?: number; confidence?: number; // 0-100
  owner?: string; notes?: string;
  projectId?: string;                           // set when won and converted to a job
  activities: { at: string; type: string; note: string; by?: string }[];
  createdAt: string; updatedAt: string;
}

// ---------- estimates ----------
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export interface EstimateLine { costCode?: string; description: string; quantity: number; unit?: string; unitCost: number; markupPct: number }
export interface Estimate {
  id: string;
  leadId?: string; projectId?: string;
  number: string;                               // EST-0001
  title: string;
  sections: { name: string; lines: EstimateLine[] }[];
  taxRatePct: number;
  validUntil?: string; notes?: string;
  status: EstimateStatus;
  createdAt: string; updatedAt: string;
}

// ---------- client portal ----------
export interface ClientAccess {
  id: string; projectId: string;
  name: string; email?: string;
  tokenHash: string;                            // sha256 of the portal link token; the token itself is never stored
  revoked: boolean; lastSeenAt?: string;
  createdAt: string; updatedAt: string;
}
