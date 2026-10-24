import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { themeFor, type Theme } from '@grandcityrace/shared';

// Screens outside a game use the default theme; a game's screens are wrapped
// in its host's choice.
const ThemeContext = createContext<Theme>(themeFor(undefined));

export function ThemeProvider({
	themeId,
	children,
}: {
	themeId: string | null | undefined;
	children: ReactNode;
}) {
	const theme = useMemo(() => themeFor(themeId), [themeId]);
	return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
	return useContext(ThemeContext);
}
