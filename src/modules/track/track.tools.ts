import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import {
  addDays,
  addTimeLogEntry,
  listProjects,
  listTimeLog,
  resolveProject,
  round2,
  totalMinutesForProject,
  todayIso,
} from '../../data/project-store.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class TrackTools {
  @Tool({
    name: 'log-time',
    description: 'Log minutes of work against a project and return the updated total hours for that project.',
    inputSchema: z.object({
      projectId: z.string().describe('Project id (e.g. "proj-website-redesign"). Project names are also accepted.'),
      minutes: z.number().int().min(1).max(1440).describe('Minutes to log (1–1440)'),
      date: z.string().optional().describe('Date of work in YYYY-MM-DD format. Defaults to today.'),
      note: z.string().optional().describe('Optional note about the work done'),
    }),
    examples: {
      request: { projectId: 'proj-website-redesign', minutes: 45 },
      response: {
        projectId: 'proj-website-redesign',
        projectName: 'Website Redesign',
        loggedMinutes: 45,
        totalHours: 5.25,
      },
    },
  })
  async logTime(input: any, ctx: ExecutionContext) {
    const project = resolveProject(String(input?.projectId ?? ''));
    if (!project) {
      throw new Error(`Project not found: ${input?.projectId}`);
    }

    const date = input?.date && ISO_DATE.test(input.date) ? input.date : todayIso();
    const minutes = Number(input.minutes);
    ctx.logger.info('Logging time', { projectId: project.id, minutes, date });

    const entry = addTimeLogEntry(project.id, minutes, date, input?.note);
    const totalHours = round2(totalMinutesForProject(project.id) / 60);

    return {
      entryId: entry.id,
      projectId: project.id,
      projectName: project.name,
      loggedMinutes: minutes,
      date,
      totalHours,
      plannedHours: project.plannedHours,
      message: `Logged ${minutes} minutes on ${project.name}. Total: ${totalHours} hours.`,
    };
  }

  @Tool({
    name: 'review-week',
    description: 'Review hours logged per project for the 7-day week starting on the given date. Returns totalHours, and for EVERY project with logged time: name, hours and imageUrl. Present each project with its hours and imageUrl in the answer.',
    inputSchema: z.object({
      weekStart: z.string().describe('Week start date in YYYY-MM-DD format (e.g. "2026-11-16")'),
    }),
    examples: {
      request: { weekStart: '2026-11-16' },
      response: {
        weekStart: '2026-11-16',
        weekEnd: '2026-11-22',
        totalHours: 0,
        projects: [],
      },
    },
  })
  @Widget('week-review')
  async reviewWeek(input: any, ctx: ExecutionContext) {
    const weekStart = String(input?.weekStart ?? '');
    if (!ISO_DATE.test(weekStart)) {
      throw new Error('weekStart must be in YYYY-MM-DD format');
    }
    const weekEnd = addDays(weekStart, 6);
    ctx.logger.info('Reviewing week', { weekStart, weekEnd });

    const entries = listTimeLog().filter((e) => e.date >= weekStart && e.date <= weekEnd);
    const minutesByProject = new Map<string, number>();
    for (const e of entries) {
      minutesByProject.set(e.projectId, (minutesByProject.get(e.projectId) ?? 0) + e.minutes);
    }

    const projects = listProjects()
      .filter((p) => minutesByProject.has(p.id))
      .map((p) => {
        const minutes = minutesByProject.get(p.id) ?? 0;
        return {
          id: p.id,
          name: p.name,
          hours: round2(minutes / 60),
          minutes,
          imageUrl: p.imageUrl,
        };
      })
      .sort((a, b) => b.minutes - a.minutes);

    const totalMinutes = projects.reduce((sum, p) => sum + p.minutes, 0);
    const totalHours = round2(totalMinutes / 60);

    const breakdown = projects.map((p) => `${p.name}: ${p.hours} h (imageUrl: ${p.imageUrl})`);
    const summary = projects.length
      ? `Week ${weekStart} to ${weekEnd}: ${totalHours} h across ${projects.length} project(s). ${breakdown.join('; ')}.`
      : `Week ${weekStart} to ${weekEnd}: no time logged.`;

    return {
      weekStart,
      weekEnd,
      totalHours,
      entryCount: entries.length,
      projectCount: projects.length,
      summary,
      breakdown,
      projects,
    };
  }
}
