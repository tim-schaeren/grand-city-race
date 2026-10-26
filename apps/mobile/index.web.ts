import { registerRootComponent } from 'expo';

import PreviewApp from './src/preview/PreviewApp';

// On the web the app is only ever the console's phone preview (see
// src/preview); the game itself runs on phones
registerRootComponent(PreviewApp);
