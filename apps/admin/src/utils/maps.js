// Esri's maps, through Grand City Race's ArcGIS Location Platform account.
// Its free tier covers about 2 million tiles a month, and pay-as-you-go is
// off: past that, maps stop loading until the next month instead of costing
// anything. The key ships with the website; Esri only accepts it from our
// own sites for the grey maps (satellite images don't check). It expires on
// 23 January 2027: make a new one in the Location Platform dashboard
// (Developer credentials) before then, or the maps go blank.
const KEY = 'AAPTayDK9LouOPGrWkvmG1yEjFg..x8D2F3ajwzJ9lbQP_pLSvopofwXEeln5jllsACHdTdfrh4L48NWAvyoW1otxkCRbWZlsh46lFRGmCPozBs07-vF1dPDgSbAHDcAUL-EMBYLDyP1KFfVv6jASTE9ono78iTP1s2kUfjRb3fEzddDvwkAbs1KTKqNjQmBDa3OAzcS-sIYer9gBfITzv58Q-utV6coOb5jQdIQ0LsROkOKZhV2yI7HYstUNyDRL0_DQtvustfpDChexAT1_FjQLjdWj';

const STATIC = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1';
const STREETS_CREDIT = 'Powered by Esri &mdash; Esri, TomTom, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors';

// Grey streets with their names drawn in, in squares of 512 pixels: each
// stands in for four ordinary ones, so a screenful takes few requests. Esri
// draws each square when it's first asked for, which takes about half a
// second, so closer in than street level the map enlarges what it has
// instead of loading more, and it loads only once zooming has stopped.
const grey = style => ({
  url: `${STATIC}/arcgis/${style}/static/tile/{z}/{y}/{x}?token=${KEY}`,
  attribution: STREETS_CREDIT,
  tileSize: 512,
  zoomOffset: -1,
  maxNativeZoom: 17,
  maxZoom: 20,
  updateWhenZooming: false,
});

// Props for react-leaflet's TileLayer
export const MAP_LAYERS = {
  light: grey('light-gray'),
  dark: grey('dark-gray'),
  satellite: {
    url: `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${KEY}`,
    attribution: 'Powered by Esri &mdash; Esri, Vantor, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    maxNativeZoom: 19,
    maxZoom: 20,
  },
};
