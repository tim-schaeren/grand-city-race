// The app's settings are in app.json. The console's phone preview (npm run
// build:preview) is the same app built for the web, served from /preview on
// the console's site.
module.exports = ({ config }) =>
	process.env.GCR_PREVIEW ? { ...config, experiments: { ...config.experiments, baseUrl: '/preview' } } : config;
