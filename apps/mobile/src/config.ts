import { Platform } from 'react-native';

// The web console also hosts the public legal pages the app links to
export const WEB_URL = 'https://grand-city-race.com';

export const LEGAL = {
	privacy: `${WEB_URL}/privacy`,
	terms: `${WEB_URL}/terms`,
	guidelines: `${WEB_URL}/guidelines`,
	support: `${WEB_URL}/support`,
	help: `${WEB_URL}/help`,
};

// Where reports about a game, a host or a player go
export const CONTACT_EMAIL = 'paddock-cliques5u@icloud.com';

export const STORE_URL = Platform.OS === 'ios'
	? 'https://apps.apple.com/app/id6760836695'
	: 'https://play.google.com/store/apps/details?id=com.gcrace.app';
