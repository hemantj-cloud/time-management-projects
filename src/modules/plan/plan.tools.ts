import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { listProjects, resolveProject, totalMinutesForProject, round2, type Project } from '../../data/project-store.js';

const PRIORITY_RANK: Record<Project['priority'], number> = { high: 3, medium: 2, low: 1 };

export class PlanTools {
  @Tool({
    name: 'search-projects',
    description: 'Search projects by keyword and optional status. Returns project cards with cover images.',
    inputSchema: z.object({
      keyword: z.string().optional().describe('Keyword to match against project name, description, category or tags'),
      status: z.enum(['active', 'planning', 'paused', 'completed']).optional().describe('Filter by project status'),
    }),
    examples: {
      request: { keyword: 'design', status: 'active' },
      response: {
        query: { keyword: 'design', status: 'active' },
        total: 3,
        projects: [],
      },
    },
  })
  @Widget('project-cards')
  async searchProjects(input: any, ctx: ExecutionContext) {
    const keyword = typeof input?.keyword === 'string' ? input.keyword.trim().toLowerCase() : '';
    const status = typeof input?.status === 'string' ? input.status : undefined;
    ctx.logger.info('Searching projects', { keyword, status });

    const matches = listProjects().filter((p) => {
      if (status && p.status !== status) return false;
      if (!keyword) return true;
      const haystack = [p.name, p.description, p.category, ...p.tags].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });

    return {
      query: { keyword: keyword || null, status: status ?? null },
      total: matches.length,
      projects: matches.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        status: p.status,
        priority: p.priority,
        deadline: p.deadline,
        plannedHours: p.plannedHours,
        loggedHours: round2(totalMinutesForProject(p.id) / 60),
        imageUrl: p.imageUrl,
      })),
    };
  }

  @Tool({
    name: 'compare-projects',
    description: 'Compare projects side-by-side by planned hours, logged hours, deadline and priority. Takes project ids.',
    inputSchema: z.object({
      projectIds: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe('Project ids to compare (e.g. "proj-website-redesign"). Names are also accepted.'),
    }),
    examples: {
      request: { projectIds: ['proj-website-redesign', 'proj-mobile-app-wireframes'] },
      response: {
        projects: [],
        notFound: [],
      },
    },
  })
  async compareProjects(input: any, ctx: ExecutionContext) {
    const ids: string[] = Array.isArray(input?.projectIds) ? input.projectIds : [];
    ctx.logger.info('Comparing projects', { count: ids.length });

    const found: Project[] = [];
    const notFound: string[] = [];
    for (const id of ids) {
      const project = resolveProject(String(id));
      if (project) {
        if (!found.some((p) => p.id === project.id)) found.push(project);
      } else {
        notFound.push(String(id));
      }
    }

    const rows = found.map((p) => {
      const loggedHours = round2(totalMinutesForProject(p.id) / 60);
      return {
        id: p.id,
        name: p.name,
        plannedHours: p.plannedHours,
        loggedHours,
        remainingHours: round2(Math.max(0, p.plannedHours - loggedHours)),
        percentComplete: p.plannedHours > 0 ? Math.min(100, round2((loggedHours / p.plannedHours) * 100)) : 0,
        deadline: p.deadline,
        priority: p.priority,
        status: p.status,
      };
    });

    rows.sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority as Project['priority']];
      const pb = PRIORITY_RANK[b.priority as Project['priority']];
      if (pb !== pa) return pb - pa;
      return a.deadline.localeCompare(b.deadline);
    });

    return {
      count: rows.length,
      projects: rows,
      notFound,
    };
  }
}
