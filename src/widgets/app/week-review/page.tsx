'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface WeekProject {
  id: string;
  name: string;
  hours: number;
  minutes: number;
  imageUrl?: string;
}

interface WeekData {
  weekStart?: string;
  weekEnd?: string;
  totalHours?: number;
  projects?: WeekProject[];
}

const accent = '#3B82F6';

export default function WeekReviewWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  const data = isReady ? getToolOutput<WeekData>() : null;

  if (!isReady) {
    return <div style={{ padding: 24, color: mutedColor, textAlign: 'center' }}>Initializing…</div>;
  }
  if (!data) {
    return <div style={{ padding: 24, color: mutedColor, textAlign: 'center' }}>Loading…</div>;
  }

  const projects: WeekProject[] = Array.isArray(data.projects) ? data.projects : [];
  const totalHours = typeof data.totalHours === 'number' ? data.totalHours : 0;
  const maxHours = projects.reduce((m, p) => Math.max(m, Number(p.hours) || 0), 0);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: textColor, padding: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Week of {data.weekStart ?? ''}</div>
        <div style={{ fontSize: 12, color: mutedColor }}>
          {totalHours} h total · {projects.length} project{projects.length === 1 ? '' : 's'}
        </div>
      </div>

      {projects.length === 0 ? (
        <div style={{ padding: 16, color: mutedColor, textAlign: 'center' }}>No time logged this week.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map((p) => {
            const hours = Number(p.hours) || 0;
            const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  padding: 8,
                }}
              >
                <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: borderColor }}>
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontWeight: 700 }}>
                      {(p.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: mutedColor, marginBottom: 6 }}>{hours} h logged</div>
                  <div style={{ height: 6, background: borderColor, borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: accent }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
