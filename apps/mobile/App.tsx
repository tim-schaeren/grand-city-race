import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/tasks/locationTask';
import RootNavigator from './src/navigation';
import UpdateGate from './src/components/UpdateGate';
import { FONTS } from './src/theme/fonts';

export default function App() {
	const [fontsLoaded, fontError] = useFonts(FONTS);

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
