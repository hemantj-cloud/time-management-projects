'use client';

import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ProjectCard {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  plannedHours?: number;
  loggedHours?: number;
  imageUrl?: string;
}

interface SearchData {
  query?: { keyword?: string | null; status?: string | null };
  total?: number;
  projects?: ProjectCard[];
}

interface UiState {
  busyId: string | null;
  status: string | null;
  totals: Record<string, number>;
}

const logMinutes = 30;
const accent = '#3B82F6';

export default function ProjectCardsWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const [ui, setUi] = useWidgetState<UiState>(() => ({
    busyId: null,
    status: null,
    totals: {},
  }));

  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const placeholderBg = isDark ? '#0f172a' : '#e2e8f0';

  const data = isReady ? getToolOutput<SearchData>() : null;
  const projects: ProjectCard[] = Array.isArray(data?.projects) ? (data?.projects as ProjectCard[]) : [];
  const busyId = ui?.busyId ?? null;
  const statusText = ui?.status ?? null;
  const totals = ui?.totals ?? {};

  const logTime = async (project: ProjectCard) => {
    if (!project?.id || busyId) return;
    setUi({ ...ui, busyId: project.id, status: null });
    try {
      const res = await callTool('log-time', { projectId: project.id, minutes: logMinutes });
      const total = extractTotalHours(res);
      setUi({
        busyId: null,
        status: `Logged ${logMinutes} min on ${project.name}.`,
        totals: total !== null ? { ...totals, [project.id]: total } : totals,
      });
    } catch (err) {
      setUi({ busyId: null, status: `Could not log time on ${project.name}.`, totals });
    }
  };

  if (!isReady) {
    return <div style={{ padding: 24, color: mutedColor, textAlign: 'center' }}>Initializing…</div>;
  }

  if (!data) {
    return <div style={{ padding: 24, color: mutedColor, textAlign: 'center' }}>Loading…</div>;
  }

  if (projects.length === 0) {
    return (
      <div style={{ padding: 24, color: mutedColor, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        No matching projects found.
      </div>
    );
  }

  const total = data.total ?? projects.length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: textColor, padding: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Projects</div>
        <div style={{ fontSize: 12, color: mutedColor }}>
          {total} result{total === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {projects.map((p) => {
          const logged = totals[p.id] ?? p.loggedHours ?? 0;
          const planned = p.plannedHours ?? 0;
          const pct = planned > 0 ? Math.min(100, Math.round((logged / planned) * 100)) : 0;
          const busy = busyId === p.id;
          const name = p.name ?? 'Untitled';
          return (
            <div
              key={p.id}
              style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ width: '100%', aspectRatio: '16 / 9', background: placeholderBg }}>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      fontWeight: 700,
                      color: accent,
                    }}
                  >
                    {initialsOf(name)}
                  </div>
                )}
              </div>

              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                <div style={{ fontSize: 12, color: mutedColor }}>
                  {[p.status, p.priority ? `${p.priority} priority` : null, p.deadline ? `due ${p.deadline}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </div>

                <div style={{ fontSize: 12, color: mutedColor }}>
                  {Number(logged).toFixed(2)} / {planned} h logged
                </div>
                <div style={{ height: 6, background: borderColor, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: accent }} />
                </div>

                <button
                  type="button"
                  onClick={() => logTime(p)}
                  disabled={busy}
                  style={{
                    marginTop: 'auto',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: accent,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: busy ? 'wait' : 'pointer',
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? 'Logging…' : `Log ${logMinutes} min`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {statusText && <div style={{ marginTop: 12, fontSize: 12, color: mutedColor }}>{statusText}</div>}
    </div>
  );
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function extractTotalHours(res: unknown): number | null {
  const r = res as any;
  const candidates = [r?.structuredContent?.totalHours, r?.totalHours, r?.result?.totalHours];
  for (const c of candidates) {
    if (typeof c === 'number') return c;
  }
  return null;
}
