import { consoleCopy as cc, THEME_LIST, type Theme } from '@grandcityrace/shared';
import { displayFont } from '../utils/themeStyle';

// A small drawing of a quest screen in each theme's own colours and type
function ThemeOption({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void }) {
  const c = theme.colors;
  const edge = theme.shape.shadowOffset;
  const display = displayFont(theme);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-lg border-2 p-1.5 text-left transition-colors ${selected ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <div
        className="flex flex-col items-center gap-2 rounded-md px-3 py-4"
        style={{ background: c.background, border: `1px solid ${edge ? c.border : '#e5e7eb'}` }}
      >
        <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: theme.uppercaseHeadings ? c.text : c.muted, fontFamily: display }}>
          {cc.settings.sampleQuest}
        </span>
        <span
          className="text-center leading-tight"
          style={{
            color: c.heading,
            fontFamily: display,
            fontWeight: display ? 400 : 700,
            fontSize: `${18 * theme.fonts.scale}px`,
            textTransform: theme.uppercaseHeadings ? 'uppercase' : 'none',
            textShadow: theme.headingShadow ? `2px 2px 0 ${c.shadow}` : 'none',
          }}
        >
          {cc.settings.sampleTitle}
        </span>
        <span
          className="mt-1 px-3 py-1 text-[11px]"
          style={{
            background: c.accent,
            color: c.onAccent,
            fontFamily: display,
            borderRadius: theme.shape.radius / 2,
            boxShadow: edge ? `${edge / 2}px ${edge / 2}px 0 ${c.shadow}` : 'none',
            textTransform: theme.uppercaseHeadings ? 'uppercase' : 'none',
          }}
        >
          {cc.settings.sampleButton}
        </span>
      </div>
      <div className="px-1 pb-1 pt-2">
        <p className="text-sm font-medium text-gray-900">{theme.name}</p>
        <p className="text-xs text-gray-400">{theme.description}</p>
      </div>
    </button>
  );
}

export function ThemePicker({ value, onChange }: { value: string; onChange: (themeId: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {THEME_LIST.map(theme => (
        <ThemeOption key={theme.id} theme={theme} selected={value === theme.id} onSelect={() => onChange(theme.id)} />
      ))}
    </div>
  );
}
