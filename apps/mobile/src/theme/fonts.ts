import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// One per theme font; the names are what themes.ts asks for. Loaded up front
// so no screen ever draws in the wrong typeface or with missing icons.
export const FONTS = {
	Righteous: require('../../assets/fonts/Righteous-Regular.ttf'),
	BebasNeue: require('../../assets/fonts/BebasNeue-Regular.ttf'),
	PressStart2P: require('../../assets/fonts/PressStart2P-Regular.ttf'),
	Hind: require('../../assets/fonts/Hind-Bold.ttf'),
	...MaterialCommunityIcons.font,
};
