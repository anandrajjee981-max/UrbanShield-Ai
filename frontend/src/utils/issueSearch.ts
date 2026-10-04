import type { BackendAdminIssue, BackendIssueStatus, BackendSafeIssue } from '../services/api';
import type { CitizenReport } from '../types';

/**
 * Shared matcher for the Topbar global search.
 *
 * Anything project-related matches: description/title words, issue type
 * ("flood", "heat", "drainage"…), lifecycle status ("reported", "resolved",
 * "pending"…), address / GPS coordinates, people (reporter, crew),
 * AI analysis fields and the short id. Every query token must appear in at
 * least one field (AND semantics), so "flood resolved" narrows correctly.
 */

const normField = (v: unknown): string =>
  String(v ?? '').toLowerCase().replace(/_/g, ' ');

/** Extra searchable words for a backend lifecycle status. */
const statusWords = (s: BackendIssueStatus | undefined): string => {
  switch (s) {
    case 'REPORTED': return 'reported pending new';
    case 'VERIFIED': return 'verified approved';
    case 'ASSIGNED': return 'assigned verified crew';
    case 'IN_PROGRESS': return 'in progress verified working';
    case 'RESOLVED': return 'resolved actioned done completed fixed';
    case 'REJECTED': return 'rejected declined';
    default: return '';
  }
};

export function matchesQuery(query: string, fields: unknown[]): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = fields.map(normField).join(' | ');
  return tokens.every((t) => hay.includes(t));
}

/** Searchable fields of a citizen "My Reports" card. */
export function citizenReportFields(r: CitizenReport): unknown[] {
  return [
    r.title,
    r.description,
    r.category,
    r.address,
    r.status,
    r.rawStatus,
    statusWords(r.rawStatus),
    r.locationType,
    r.skillRequired,
    r.complexity,
    r.resolutionNote,
    r.id.slice(0, 8),
    `${r.lat} ${r.lng}`,
  ];
}

/** Searchable fields of a citizen/authority issue row. */
export function safeIssueFields(i: BackendSafeIssue): unknown[] {
  return [
    i.description,
    i.issueType,
    i.status,
    statusWords(i.status),
    i.address,
    i.locationType,
    i.skillRequired,
    i.complexity,
    i.resolutionNote,
    i.id.slice(0, 8),
    i.latitude,
    i.longitude,
  ];
}

/** Searchable fields of an authority browse row (adds reporter + crew names). */
export function adminIssueFields(i: BackendAdminIssue): unknown[] {
  return [
    ...safeIssueFields(i),
    i.citizen?.name,
    i.citizen?.email,
    i.assignee?.name,
    i.assignee?.email,
  ];
}
