import * as fs from 'fs';
import * as path from 'path';

/**
 * In-memory project store shared by the `plan` and `track` modules.
 * Seeded from fixtures/projects.json on first access. Module-level state
 * guarantees that both modules see the same time log.
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  status: 'active' | 'planning' | 'paused' | 'completed';
  priority: 'high' | 'medium' | 'low';
  plannedHours: number;
  deadline: string;
  imageUrl: string;
}

export interface TimeLogEntry {
  id: string;
  projectId: string;
  minutes: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

interface FixtureFile {
  projects: Project[];
  timeLog: TimeLogEntry[];
}

let projects: Project[] | null = null;
let timeLog: TimeLogEntry[] = [];
let nextLogNumber = 1;

function loadFixtures(): void {
  if (projects) return;
  const file = path.join(process.cwd(), 'fixtures', 'projects.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as FixtureFile;
  projects = raw.projects ?? [];
  timeLog = (raw.timeLog ?? []).map((e) => ({ ...e }));
  nextLogNumber = timeLog.length + 1;
}

export function listProjects(): Project[] {
  loadFixtures();
  return [...(projects as Project[])];
}

export function findProjectById(id: string): Project | undefined {
  loadFixtures();
  return (projects as Project[]).find((p) => p.id === id);
}

/**
 * Resolve a project by exact id first, then by case-insensitive name.
 */
export function resolveProject(idOrName: string): Project | undefined {
  loadFixtures();
  const needle = idOrName.trim();
  const byId = findProjectById(needle);
  if (byId) return byId;
  const lower = needle.toLowerCase();
  return (projects as Project[]).find((p) => p.name.toLowerCase() === lower);
}

export function listTimeLog(): TimeLogEntry[] {
  loadFixtures();
  return [...timeLog];
}

export function addTimeLogEntry(projectId: string, minutes: number, date: string, note?: string): TimeLogEntry {
  loadFixtures();
  const entry: TimeLogEntry = {
    id: `log-${String(nextLogNumber++).padStart(3, '0')}`,
    projectId,
    minutes,
    date,
    note,
  };
  timeLog.push(entry);
  return entry;
}

export function totalMinutesForProject(projectId: string): number {
  loadFixtures();
  return timeLog
    .filter((e) => e.projectId === projectId)
    .reduce((sum, e) => sum + e.minutes, 0);
}

/** Returns the ISO date (YYYY-MM-DD) for the given offset from a YYYY-MM-DD start date. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
