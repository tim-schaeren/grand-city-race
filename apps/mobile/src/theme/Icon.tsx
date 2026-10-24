import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppIcon } from '@grandcityrace/shared';

// One icon family everywhere, by Material Design Icons name — the console
// draws the same set from @mdi/js, so the two sides match.
export default function Icon({
	name,
	size = 20,
	color,
}: {
	name: AppIcon | string;
	size?: number;
	color: string;
}) {
	return (
		<MaterialCommunityIcons
			name={name as keyof typeof MaterialCommunityIcons.glyphMap}
			size={size}
			color={color}
		/>
	);
}
