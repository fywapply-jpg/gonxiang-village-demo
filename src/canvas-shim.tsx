/**
 * Shim layer that replicates the cursor/canvas SDK surface so the app
 * runs as a standard Vite/React build outside Cursor.
 */
import { CSSProperties, ReactNode, useState, createContext, useContext } from 'react';

// ── Theme ─────────────────────────────────────────────────────────────────────

const DARK = {
  bg: { editor: '#1e1e2e', elevated: '#252535', chrome: '#16161e' },
  text: { primary: '#e2e2e8', secondary: '#9898a8', tertiary: '#5c5c72', onAccent: '#ffffff' },
  fill: { primary: '#ffffff22', secondary: '#ffffff14', tertiary: '#ffffff09', quaternary: '#ffffff05' },
  stroke: { primary: '#ffffff28', secondary: '#ffffff18', tertiary: '#ffffff0e' },
  accent: { primary: '#4f8ef7', control: '#3b7af0' },
};

const LIGHT = {
  bg: { editor: '#ffffff', elevated: '#f5f5f7', chrome: '#e8e8ec' },
  text: { primary: '#18181c', secondary: '#52525c', tertiary: '#9999a8', onAccent: '#ffffff' },
  fill: { primary: '#00000014', secondary: '#0000000d', tertiary: '#00000007', quaternary: '#00000003' },
  stroke: { primary: '#00000022', secondary: '#00000014', tertiary: '#0000000a' },
  accent: { primary: '#2563eb', control: '#1d4ed8' },
};

export type CanvasHostTheme = typeof DARK & { kind: 'dark' | 'light' };

const ThemeCtx = createContext<CanvasHostTheme>({ ...DARK, kind: 'dark' });

export function ThemeProvider({ children, mode }: { children: ReactNode; mode: 'dark' | 'light' }) {
  const tokens = mode === 'dark' ? DARK : LIGHT;
  return <ThemeCtx.Provider value={{ ...tokens, kind: mode }}>{children}</ThemeCtx.Provider>;
}

export function useHostTheme(): CanvasHostTheme {
  return useContext(ThemeCtx);
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function Stack({ children, gap = 0, style }: { children?: ReactNode; gap?: number; style?: CSSProperties }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>{children}</div>;
}

export function Row({
  children, gap = 0, align = 'start', justify = 'start', wrap = false, style,
}: {
  children?: ReactNode; gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between';
  wrap?: boolean; style?: CSSProperties;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'row', gap,
      alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align,
      justifyContent: justify === 'start' ? 'flex-start' : justify === 'end' ? 'flex-end' : justify,
      flexWrap: wrap ? 'wrap' : 'nowrap',
      ...style,
    }}>{children}</div>
  );
}

export function Grid({
  children, columns, gap = 0, align, style,
}: {
  children?: ReactNode; columns: number | string;
  gap?: number; align?: string; style?: CSSProperties;
}) {
  const cols = typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap, alignItems: align, ...style }}>
      {children}
    </div>
  );
}

export function Divider({ style }: { style?: CSSProperties }) {
  const theme = useHostTheme();
  return <hr style={{ border: 'none', borderTop: `1px solid ${theme.stroke.tertiary}`, ...style }} />;
}

export function Spacer() {
  return <div style={{ flex: 1 }} />;
}

// ── Typography ────────────────────────────────────────────────────────────────

const TONE_MAP: Record<string, string> = {};

export function H2({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  const theme = useHostTheme();
  return <h2 style={{ fontSize: 18, fontWeight: 600, color: theme.text.primary, lineHeight: 1.35, ...style }}>{children}</h2>;
}

export function H3({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  const theme = useHostTheme();
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, lineHeight: 1.35, ...style }}>{children}</h3>;
}

export function Text({
  children, tone, size, weight, italic, truncate, style, as,
}: {
  children?: ReactNode;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  size?: 'body' | 'small';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  italic?: boolean; truncate?: boolean | 'start' | 'end';
  style?: CSSProperties; as?: 'p' | 'span';
}) {
  const theme = useHostTheme();
  const colorMap: Record<string, string> = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    tertiary: theme.text.tertiary,
    quaternary: theme.text.tertiary,
  };
  const weightMap: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
  const merged: CSSProperties = {
    fontSize: size === 'small' ? 12 : 14,
    color: tone ? colorMap[tone] : theme.text.primary,
    fontWeight: weight ? weightMap[weight] : 400,
    fontStyle: italic ? 'italic' : undefined,
    ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } : {}),
    ...style,
  };
  const Tag = as ?? 'span';
  return <Tag style={merged}>{children}</Tag>;
}

// ── Surfaces ──────────────────────────────────────────────────────────────────

export function Pill({
  children, tone, size = 'md', active, style, onClick,
}: {
  children?: ReactNode;
  tone?: 'neutral' | 'added' | 'deleted' | 'renamed' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md'; active?: boolean;
  style?: CSSProperties; onClick?: () => void;
}) {
  const theme = useHostTheme();
  const toneColors: Record<string, { text: string; bg: string; border: string }> = {
    neutral:  { text: theme.text.secondary,  bg: theme.fill.secondary,   border: theme.stroke.secondary },
    success:  { text: '#22c55e',             bg: '#22c55e18',            border: '#22c55e40' },
    warning:  { text: '#f59e0b',             bg: '#f59e0b18',            border: '#f59e0b40' },
    info:     { text: theme.accent.primary,  bg: `${theme.accent.primary}18`, border: `${theme.accent.primary}40` },
    added:    { text: '#22c55e',             bg: '#22c55e18',            border: '#22c55e40' },
    deleted:  { text: '#ef4444',             bg: '#ef444418',            border: '#ef444440' },
    renamed:  { text: '#a78bfa',             bg: '#a78bfa18',            border: '#a78bfa40' },
  };
  const c = toneColors[tone ?? 'neutral'];
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: size === 'sm' ? '1px 5px' : '2px 8px',
        borderRadius: 99,
        fontSize: size === 'sm' ? 10 : 11,
        fontWeight: 500,
        color: active ? '#fff' : c.text,
        background: active ? c.text : c.bg,
        border: size === 'sm' ? 'none' : `1px solid ${c.border}`,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap' as const,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Stat({
  value, label, tone, style,
}: {
  value: ReactNode; label: string;
  tone?: 'success' | 'danger' | 'warning' | 'info';
  style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const toneColor: Record<string, string> = {
    success: '#22c55e', danger: '#ef4444', warning: '#f59e0b', info: theme.accent.primary,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: tone ? toneColor[tone] : theme.text.primary, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: theme.text.tertiary }}>{label}</span>
    </div>
  );
}

export function Callout({
  children, tone = 'info', title, style,
}: {
  children?: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  title?: ReactNode; style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const toneColors: Record<string, { border: string; bg: string; title: string }> = {
    info:    { border: theme.accent.primary, bg: `${theme.accent.primary}12`, title: theme.accent.primary },
    success: { border: '#22c55e',            bg: '#22c55e12',                 title: '#22c55e' },
    warning: { border: '#f59e0b',            bg: '#f59e0b12',                 title: '#f59e0b' },
    danger:  { border: '#ef4444',            bg: '#ef444412',                 title: '#ef4444' },
    neutral: { border: theme.stroke.primary, bg: theme.fill.tertiary,         title: theme.text.secondary },
  };
  const c = toneColors[tone];
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      borderLeft: `3px solid ${c.border}`,
      background: c.bg, ...style,
    }}>
      {title && <div style={{ fontWeight: 600, fontSize: 13, color: c.title, marginBottom: 4 }}>{title}</div>}
      <div style={{ fontSize: 13, color: theme.text.secondary }}>{children}</div>
    </div>
  );
}

export function Table({
  headers, rows, columnAlign, rowTone, framed = true, striped, style,
}: {
  headers: ReactNode[]; rows: ReactNode[][];
  columnAlign?: Array<'left' | 'center' | 'right' | undefined>;
  rowTone?: Array<string | undefined>;
  framed?: boolean; striped?: boolean; style?: CSSProperties;
}) {
  const theme = useHostTheme();
  const toneRowBg: Record<string, string> = {
    success: '#22c55e14', danger: '#ef444414', warning: '#f59e0b14',
    info: `${theme.accent.primary}14`, neutral: theme.fill.tertiary,
  };
  return (
    <div style={{
      borderRadius: framed ? 8 : 0,
      border: framed ? `1px solid ${theme.stroke.secondary}` : 'none',
      overflow: 'auto', ...style,
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.stroke.secondary}` }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '8px 12px', textAlign: columnAlign?.[i] ?? 'left',
                fontWeight: 600, color: theme.text.secondary, whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{
              borderBottom: `1px solid ${theme.stroke.tertiary}`,
              background: rowTone?.[ri] ? toneRowBg[rowTone[ri]!] ?? undefined
                : striped && ri % 2 === 1 ? theme.fill.tertiary : undefined,
            }}>
              {headers.map((_, ci) => (
                <td key={ci} style={{
                  padding: '8px 12px', textAlign: columnAlign?.[ci] ?? 'left',
                  color: theme.text.primary,
                }}>{row[ci]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
