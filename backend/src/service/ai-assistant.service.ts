import { env } from '../config/env.js';
import * as adminTaskDao from '../dao/admin-task.dao.js';
import * as assignmentDao from '../dao/assignment.dao.js';
import * as authorityDao from '../dao/authority.dao.js';
import * as issueDao from '../dao/issue.dao.js';
import type { AuthorityTaskWithIssueRow } from '../dao/assignment.dao.js';
import type { AdminWorkItem } from '../types/admin-task.types.js';
import type { Issue, MonitoredIssue } from '../models/issue.model.js';
import type { UserRole } from '../types/auth.types.js';
import type {
  AiChatContextRecord,
  AiChatInput,
  AiChatResult,
  AiForecastDay,
  AiForecastWeather,
  AiRoleContext,
} from '../types/ai-assistant.types.js';
import { AI_FORECAST_CONFIDENCES, AI_CHAT_INTENTS } from '../types/ai-assistant.types.js';
import { aiModelResponseSchema } from '../validation/ai-assistant.schema.js';
import { AppError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import { completeJson, isMistralConfigured, MistralError, type MistralMessage } from './mistral.service.js';
import { forecastForCoordinates, forecastForPlace, type WeatherForecast } from './weather.service.js';

/**
 * Orchestrates the dashboard AI assistant.
 *
 * Flow:
 *   1. build a bounded, role-scoped summary of the civic data the caller may
 *      already read (never another role's data);
 *   2. if a place can be resolved, fetch a real 3-day forecast (Open-Meteo);
 *   3. ask Mistral for a structured answer over exactly that data;
 *   4. merge provider weather numbers back in (the model never owns numbers).
 *
 * The model is told to answer only from the supplied data and to say when a fact
 * is missing, so a question outside the caller's data scope gets an honest "I do
 * not have that" rather than a hallucinated record.
 */

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** Local calendar date (YYYY-MM-DD) - never UTC, so IST mornings do not roll over. */
const localDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Server-computed relative label for a record's creation date, so the model
 * never has to guess what "today" means or misread a date as a schedule.
 */
const relativeLabel = (createdOn: string, serverDate: string): string => {
  const DAY_MS = 86_400_000;
  const diff = Math.round((Date.parse(serverDate) - Date.parse(createdOn)) / DAY_MS);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff === -1) return 'tomorrow';
  if (diff > 1) return `${diff} days ago`;
  if (diff < -1) return `in ${-diff} days`;
  return createdOn;
};

const countBy = (values: string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
};

/** Keeps limitation footnotes unique while preserving order. */
const dedupe = <T>(values: T[]): T[] => [...new Set(values)];

const formatCounts = (counts: Record<string, number>): string => {
  const entries = Object.entries(counts);
  return entries.length === 0 ? 'none' : entries.map(([key, value]) => `${key}: ${value}`).join(', ');
};

const describeIssueLocation = (issue: Pick<Issue, 'address' | 'latitude' | 'longitude'>): string => {
  const address = issue.address?.trim();
  if (address) return address;
  if (issue.latitude !== null && issue.longitude !== null) {
    return `${issue.latitude.toFixed(3)}, ${issue.longitude.toFixed(3)}`;
  }
  return 'location not provided';
};

type IssueLike = Pick<
  Issue,
  'issueType' | 'description' | 'status' | 'address' | 'latitude' | 'longitude' | 'createdAt'
>;

const issueRecord = (issue: IssueLike, serverDate: string): AiChatContextRecord => ({
  kind: 'issue',
  title: truncate(issue.description.trim(), 140) || issue.issueType,
  status: issue.status,
  category: issue.issueType,
  location: describeIssueLocation(issue),
  createdOn: issue.createdAt.toISOString().slice(0, 10),
  createdLabel: relativeLabel(issue.createdAt.toISOString().slice(0, 10), serverDate),
});

const taskRecord = (task: AuthorityTaskWithIssueRow, serverDate: string): AiChatContextRecord => ({
  kind: 'task',
  title: truncate(task.description.trim(), 140) || task.issue_type,
  status: task.status,
  category: task.required_skill,
  location:
    task.address?.trim() ||
    (task.latitude !== null && task.longitude !== null
      ? `${Number(task.latitude).toFixed(3)}, ${Number(task.longitude).toFixed(3)}`
      : 'location not provided'),
  createdOn: task.created_at.toISOString().slice(0, 10),
  createdLabel: relativeLabel(task.created_at.toISOString().slice(0, 10), serverDate),
});

/** An admin work item is the only kind of "task" an admin has (manual follow-ups). */
const workItemRecord = (workItem: AdminWorkItem, serverDate: string): AiChatContextRecord => ({
  kind: 'task',
  title: truncate(workItem.title.trim(), 140),
  status: workItem.status,
  category: `${workItem.type} · ${workItem.priority}`,
  location: 'n/a',
  createdOn: workItem.createdAt.toISOString().slice(0, 10),
  createdLabel: relativeLabel(workItem.createdAt.toISOString().slice(0, 10), serverDate),
});

// ---------------------------------------------------------------------------
// Role-scoped context
// ---------------------------------------------------------------------------

interface LocationHint {
  label: string;
  latitude?: number;
  longitude?: number;
  query?: string;
}

interface RoleData {
  context: AiRoleContext;
  locationHint: LocationHint | null;
}

const buildCitizenContext = async (userId: string, serverDate: string): Promise<RoleData> => {
  const issues = await issueDao.findIssuesByUserId(userId, env.AI_CHAT_CONTEXT_LIMIT);
  const counts = countBy(issues.map((issue) => issue.status));
  const latest = issues[0];

  const locationHint: LocationHint | null = latest
    ? latest.latitude !== null && latest.longitude !== null
      ? { label: latest.address?.trim() || 'a location you reported', latitude: latest.latitude, longitude: latest.longitude }
      : latest.address?.trim()
        ? { label: latest.address.trim(), query: latest.address.trim() }
        : null
    : null;

  return {
    context: {
      role: 'CITIZEN',
      summary:
        issues.length === 0
          ? 'This citizen has not reported any issues yet.'
          : `This citizen has ${issues.length} recent report(s). Status breakdown: ${formatCounts(counts)}.`,
      records: issues.map((issue) => issueRecord(issue, serverDate)),
      counts,
      sources: ["UrbanShield issue records (the caller's own reports)"],
      limitations: [],
    },
    locationHint,
  };
};

const buildAuthorityContext = async (userId: string, serverDate: string): Promise<RoleData> => {
  const application = await authorityDao.findAuthorityApplicationByUserId(userId);

  if (!application || application.verificationStatus !== 'VERIFIED') {
    return {
      context: {
        role: 'AUTHORITY',
        summary: 'This account is not a currently verified authority.',
        records: [],
        counts: {},
        sources: [],
        limitations: ['No task data was included because the account is not a verified authority.'],
      },
      locationHint: null,
    };
  }

  const tasks = await assignmentDao.findTasksByAuthorityApplicationId(application.id, null);
  const counts = countBy(tasks.map((task) => task.status));
  const latest = tasks[0];

  const locationHint: LocationHint | null = latest
    ? latest.latitude !== null && latest.longitude !== null
      ? {
          label: latest.address?.trim() || 'one of your assigned tasks',
          latitude: Number(latest.latitude),
          longitude: Number(latest.longitude),
        }
      : latest.address?.trim()
        ? { label: latest.address.trim(), query: latest.address.trim() }
        : null
    : null;

  return {
    context: {
      role: 'AUTHORITY',
      summary:
        tasks.length === 0
          ? `No tasks are currently assigned to this authority (${application.department}).`
          : `This authority (${application.department}) has ${tasks.length} task(s). Status breakdown: ${formatCounts(counts)}.`,
      records: tasks.map((task) => taskRecord(task, serverDate)),
      counts,
      sources: ["UrbanShield authority task records (the caller's own tasks)"],
      limitations: [],
    },
    locationHint,
  };
};

const buildAdminContext = async (serverDate: string): Promise<RoleData> => {
  const issues = await issueDao.findIssuesForMonitoring(null, env.AI_CHAT_CONTEXT_LIMIT);
  const counts = countBy(issues.map((issue: MonitoredIssue) => issue.status));
  const openWorkItems = await adminTaskDao.findAdminWorkItems('OPEN');

  const records = [
    ...issues.map((issue) => issueRecord(issue, serverDate)),
    ...openWorkItems.map((workItem) => workItemRecord(workItem, serverDate)),
  ].slice(0, env.AI_CHAT_CONTEXT_LIMIT);

  return {
    context: {
      role: 'ADMIN',
      summary: `City issue monitoring shows ${issues.length} recent report(s). Status breakdown: ${formatCounts(counts)}. ${openWorkItems.length} open admin work item(s) (manual follow-ups for issues the automated pipeline could not process) await review.`,
      records,
      counts: { ...counts, OPEN_WORK_ITEMS: openWorkItems.length },
      sources: ['UrbanShield issue monitoring records', 'Admin work-item queue'],
      limitations: [
        `This is a recent snapshot (up to ${env.AI_CHAT_CONTEXT_LIMIT} records), not the full database.`,
      ],
    },
    locationHint: null,
  };
};

const buildRoleData = async (role: UserRole, userId: string, serverDate: string): Promise<RoleData> => {
  try {
    if (role === 'CITIZEN') return await buildCitizenContext(userId, serverDate);
    if (role === 'AUTHORITY') return await buildAuthorityContext(userId, serverDate);
    return await buildAdminContext(serverDate);
  } catch (error) {
    // A read failure must not take the whole assistant down: answer with the
    // general scope and be explicit that the personal data could not be read.
    logger.warn('Assistant role context failed', {
      role,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return {
      context: {
        role,
        summary: 'Personal civic data could not be read right now.',
        records: [],
        counts: {},
        sources: [],
        limitations: ['Your personal records could not be loaded, so the answer is general only.'],
      },
      locationHint: null,
    };
  }
};

// ---------------------------------------------------------------------------
// Location resolution
// ---------------------------------------------------------------------------

const MESSAGE_PLACE_PATTERNS = [
  /\b(?:in|for|at|near|around|of)\s+([A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,3})/u,
  /\b([A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,3})\s+(?:weather|forecast|risk|risks)/u,
];

const WEATHER_KEYWORD_PATTERN =
  /(?:weather|forecast|rain(?:ing|fall|ly|storm)?|flood(?:ing|s)?|storm|thunder(?:storm)?|temperature|humidity|monsoon|drizzle|downpour|precipitation|wind(?:y| speed)?|heat|heatwave|wave of heat|imd)/i;

/**
 * True when the question itself is about weather/risk - the ONLY case where a
 * forecast is fetched, attached and returned. Deterministically gates weather so
 * the model can never smuggle a forecast into a "Show my tasks" style question.
 */
const mentionsWeather = (input: AiChatInput): boolean =>
  WEATHER_KEYWORD_PATTERN.test(input.message) || (input.location?.city?.trim().length ?? 0) > 0;

const extractPlaceFromMessage = (message: string): string | null => {
  for (const pattern of MESSAGE_PLACE_PATTERNS) {
    const match = message.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && candidate.length >= 3) return candidate;
  }
  return null;
};

const resolveForecast = async (input: AiChatInput, locationHint: LocationHint | null): Promise<WeatherForecast | null> => {
  const explicitCity = input.location?.city;
  if (explicitCity) {
    const query = input.location?.area ? `${input.location.area}, ${explicitCity}` : explicitCity;
    const forecast = await forecastForPlace(query);
    if (forecast) return forecast;
  }

  const placeFromMessage = extractPlaceFromMessage(input.message);
  if (placeFromMessage) {
    const forecast = await forecastForPlace(placeFromMessage);
    if (forecast) return forecast;
  }

  if (locationHint) {
    if (locationHint.latitude !== undefined && locationHint.longitude !== undefined) {
      return forecastForCoordinates(locationHint.latitude, locationHint.longitude, locationHint.label);
    }
    if (locationHint.query) {
      return forecastForPlace(locationHint.query);
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Prompting
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = [
  'You are "UrbanShield AI", the civic assistant inside an Indian municipal issue platform.',
  'You are READ-ONLY: you cannot create, verify, assign, resolve or change anything.',
  'The current server date is provided in "serverDate" (YYYY-MM-DD). Use it to say "today"/"tomorrow"; never invent a date.',
  'Answer ONLY from the ROLE CONTEXT and WEATHER DATA in the user message.',
  'Never invent issues, tasks, statuses, authorities, statistics or weather numbers.',
  'If a requested fact is not present, say plainly that you do not have it.',
  '',
  'Role scope - the caller is exactly the "callerRole" value; stay inside its data:',
  '- CITIZEN: data = the reports this citizen filed. "My reports"/"my issues" means these records.',
  '- AUTHORITY: data = tasks assigned to this verified authority. "My tasks" means these task records. Never discuss other authorities, specific citizens, or admin matters.',
  '- ADMIN: data = city-wide issue monitoring plus open admin work items. An ADMIN has NO assigned authority tasks, no service schedule, and no "one of your tasks" locations - "tasks" for an admin means the open work items (manual follow-ups for issues the automated pipeline could not process).',
  '',
  'Dates: a record "createdOn" (label "createdLabel") is when the record was created, NOT a schedule. Do not say a task is "scheduled for" a date; say it was created {createdLabel}.',
  '',
  'Listing: when asked to show lists ("my tasks", "my reports", "open work items", "issues"), ENUMERATE EVERY record in roleContext.records one by one, one numbered line per record with its title, status, category and createdLabel (example: "1. Tap leak at Gandhi Chowk - PENDING - tap leaks - created yesterday"). A summary sentence alone is an incomplete answer.',
  '',
  'JSON example when the caller asks for a list of records (match this shape exactly, filling real records):',
  '{"message": "You have 3 tasks, one per line:\\n1. Tap leak at Gandhi Chowk - PENDING - tap leaks - created yesterday\\n2. Broken pipe at Harmu - IN_PROGRESS - sewage - created 2 days ago\\n3. Wastewater blockage at Doranda - PENDING - drainage - created yesterday", "intent": "STATUS_EXPLANATION", "days": [], "limitations": []}',
  '',
  'Weather: use only the WEATHER DATA numbers; never estimate temperature, rain or wind yourself.',
  '- If the user asks about weather/forecast/risk and WEATHER DATA is missing, say it is unavailable and ask for a city or area.',
  '- If the user is NOT asking about weather, do not mention weather or a forecast at all - neither in the message nor in "limitations".',
  '- Include "days" ONLY when the user asked about weather/forecast/risk, and ONLY for dates present in WEATHER DATA. Otherwise "days": [].',
  '- Set each day confidence from data quality; use "UNAVAILABLE" when there is no weather data.',
  '',
  'Write a calm, practical answer of at most 150 words.',
  'Reply with STRICT JSON only (no markdown, no prose around it) in this shape:',
  '{"message": string, "intent": "THREE_DAY_FORECAST" | "ISSUE_OVERVIEW" | "STATUS_EXPLANATION" | "GENERAL_HELP", "days": [{"date": "YYYY-MM-DD", "summary": string, "risks": string[], "precautions": string[], "confidence": "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE", "dataQuality": string}], "limitations": string[]}',
].join('\n');

const buildMessages = (
  input: AiChatInput,
  role: UserRole,
  context: AiRoleContext,
  weather: WeatherForecast | null,
): MistralMessage[] => {
  const weatherBlock = weather
    ? {
        location: weather.label,
        timezone: weather.timezone,
        days: weather.days.map((day) => ({
          date: day.date,
          condition: day.condition,
          temperatureMaxC: day.temperatureMaxC,
          temperatureMinC: day.temperatureMinC,
          precipitationChance: day.precipitationChance,
          windMaxKph: day.windMaxKph,
        })),
      }
    : null;

  const userPayload = {
    serverDate: localDateOnly(new Date()),
    callerRole: role,
    question: input.message,
    roleContext: {
      summary: context.summary,
      counts: context.counts,
      records: context.records,
      limitations: context.limitations,
    },
    ...(weatherBlock ? { weatherData: weatherBlock } : {}),
  };

  const messages: MistralMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  if (input.history.length > 0) {
    messages.push({
      role: 'system',
      content: `Recent conversation (for context only):\n${input.history
        .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
        .join('\n')}`,
    });
  }

  messages.push({ role: 'user', content: JSON.stringify(userPayload) });

  return messages;
};

// ---------------------------------------------------------------------------
// Response assembly
// ---------------------------------------------------------------------------

const weatherFacts = (day: WeatherForecast['days'][number]): AiForecastWeather => ({
  condition: day.condition,
  temperatureMaxC: day.temperatureMaxC,
  temperatureMinC: day.temperatureMinC,
  precipitationChance: day.precipitationChance,
  windMaxKph: day.windMaxKph,
});

/**
 * Merges the model's risk reading onto the provider's numbers, keyed by date.
 *
 * The provider owns every number; the model only contributes prose. A date the
 * provider returned always appears in the result, even if the model omitted it.
 */
const assembleForecast = (
  weather: WeatherForecast | null,
  modelDays: Array<{
    date: string;
    summary: string;
    risks: string[];
    precautions: string[];
    confidence: (typeof AI_FORECAST_CONFIDENCES)[number];
    dataQuality: string;
  }>,
): AiForecastDay[] => {
  if (!weather) return [];

  const byDate = new Map(modelDays.map((day) => [day.date, day]));

  return weather.days.map((day) => {
    const model = byDate.get(day.date);
    return {
      date: day.date,
      summary: model?.summary?.trim() || `${day.condition}.`,
      weather: weatherFacts(day),
      risks: model?.risks ?? [],
      precautions: model?.precautions ?? [],
      confidence: model?.confidence ?? 'MEDIUM',
      dataQuality: model?.dataQuality?.trim() || `Open-Meteo forecast for ${weather.label}.`,
    };
  });
};

const parseModelOutput = (raw: string): ReturnType<typeof aiModelResponseSchema.parse> | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = aiModelResponseSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const mapMistralError = (error: MistralError): AppError => {
  switch (error.code) {
    case 'MISTRAL_RATE_LIMITED':
      return new AppError(429, 'The AI assistant is busy right now. Please try again in a moment.', 'AI_SERVICE_RATE_LIMITED');
    case 'MISTRAL_TIMEOUT':
      return new AppError(504, 'The AI assistant took too long to answer. Please try again.', 'AI_SERVICE_TIMEOUT');
    case 'MISTRAL_NOT_CONFIGURED':
    case 'MISTRAL_UNAVAILABLE':
      return new AppError(503, 'The AI assistant is unavailable right now. Please try again later.', 'AI_SERVICE_UNAVAILABLE');
    case 'MISTRAL_INVALID_RESPONSE':
    default:
      return new AppError(503, 'The AI assistant could not produce an answer. Please try again.', 'AI_SERVICE_UNAVAILABLE');
  }
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Confirms the caller's role against the users table instead of trusting the JWT
 * role alone (same rationale as requireVerifiedAuthority): a token minted before
 * a promotion/demotion must not leak a different role's data scope. Falls back to
 * the JWT role if the read fails so a database hiccup never bricks the assistant.
 */
const resolveEffectiveRole = async (jwtRole: UserRole, userId: string, limitations: string[]): Promise<UserRole> => {
  try {
    const standing = await authorityDao.findAuthorityStandingByUserId(userId);
    if (standing) {
      if (standing.role !== jwtRole) {
        limitations.push('Your account role changed recently; the assistant used your current role.');
      }
      return standing.role;
    }
  } catch {
    // Database read failed - fall through to the JWT role.
  }
  return jwtRole;
};

/** Answers one assistant question for the authenticated caller. */
export const chat = async (role: UserRole, userId: string, input: AiChatInput): Promise<AiChatResult> => {
  if (!isMistralConfigured()) {
    throw new AppError(503, 'The AI assistant is unavailable right now. Please try again later.', 'AI_SERVICE_UNAVAILABLE');
  }

  const serverDate = localDateOnly(new Date());
  const limitations: string[] = [];

  // Derive the effective role from the database (like requireVerifiedAuthority):
  // a JWT minted before an account was promoted/demoted still carries the old
  // role, and that must not leak a different role's data scope.
  const effectiveRole = await resolveEffectiveRole(role, userId, limitations);

  const { context, locationHint } = await buildRoleData(effectiveRole, userId, serverDate);

  // Only a weather question ever gets weather attached; a records-only question
  // (e.g. "Show my tasks") must never produce forecast days or weather prose.
  const usesForecast = mentionsWeather(input);
  const weather = usesForecast ? await resolveForecast(input, locationHint) : null;

  const dataSources = [...context.sources];
  limitations.push(...context.limitations);

  if (weather) {
    dataSources.push(`Open-Meteo 3-day forecast for ${weather.label}`);
  } else if (usesForecast) {
    limitations.push('No live weather forecast was available; weather questions can only be answered in general terms.');
  }

  let raw: string;
  try {
    raw = await completeJson(buildMessages(input, effectiveRole, context, weather));
  } catch (error) {
    if (error instanceof MistralError) throw mapMistralError(error);
    throw error;
  }

  const model = parseModelOutput(raw);

  if (!model) {
    logger.warn('Assistant returned an unstructured response', { model: env.MISTRAL_MODEL });
    return {
      message:
        'I could not put together a reliable answer just now. Please try rephrasing your question, or ask me about your reports, tasks or a city\u2019s 3-day civic risk.',
      intent: 'GENERAL_HELP',
      role: effectiveRole,
      forecast: [],
      dataSources,
      limitations: dedupe([...limitations, 'The assistant response could not be structured.']),
      location: weather
        ? { label: weather.label, latitude: weather.latitude, longitude: weather.longitude, timezone: weather.timezone }
        : null,
    };
  }

  const intent = AI_CHAT_INTENTS.includes(model.intent) ? model.intent : 'GENERAL_HELP';

  // Deterministic backstop: a non-weather question never surfaces weather notes,
  // no matter what the model wrote (instruction rarely fails, but gate anyway).
  const modelLimitations = usesForecast
    ? model.limitations
    : model.limitations.filter((limitation) => !WEATHER_KEYWORD_PATTERN.test(limitation));

  return {
    message: model.message,
    intent,
    role: effectiveRole,
    forecast: assembleForecast(weather, model.days),
    dataSources,
    limitations: dedupe([...limitations, ...modelLimitations]),
    location: weather
      ? { label: weather.label, latitude: weather.latitude, longitude: weather.longitude, timezone: weather.timezone }
      : null,
  };
};
