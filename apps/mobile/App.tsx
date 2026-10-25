import { useFonts } from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/tasks/locationTask';
import RootNavigator from './src/navigation';
import UpdateGate from './src/components/UpdateGate';

export default function App() {
	// Loaded up front so no screen ever draws in the wrong typeface or with
	// missing icons
	const [fontsLoaded, fontError] = useFonts({
		// One per theme font; the names are what themes.ts asks for
		Righteous: require('./assets/fonts/Righteous-Regular.ttf'),
		BebasNeue: require('./assets/fonts/BebasNeue-Regular.ttf'),
		PressStart2P: require('./assets/fonts/PressStart2P-Regular.ttf'),
		Hind: require('./assets/fonts/Hind-Bold.ttf'),
		...MaterialCommunityIcons.font,
	});

	// A font that fails to load shouldn't keep the app from opening
	if (!fontsLoaded && !fontError) return null;

	return (
		<SafeAreaProvider>
			<UpdateGate>
				<RootNavigator />
			</UpdateGate>
		</SafeAreaProvider>
	);
}
