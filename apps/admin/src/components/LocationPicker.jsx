import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { MAP_LAYERS } from '../utils/maps';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Icon from './Icon';

// Fix Leaflet's default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ value, onChange, defaultCenter, fenceRadius }) {
  const hasLocation = value?.lat && value?.lng;
  const fallback = defaultCenter
    ? [defaultCenter.lat, defaultCenter.lng]
    : [47.3769, 8.5417]; // fallback: Zurich
  const center = hasLocation ? [parseFloat(value.lat), parseFloat(value.lng)] : fallback;

  function handlePick({ lat, lng }) {
    onChange({
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    });
  }

  return (
    <div className="space-y-2">
      {/* Close to square, so a place can be found in every direction around it */}
      <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-gray-300">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} key={hasLocation ? 'located' : 'default'}>
          <TileLayer {...MAP_LAYERS.satellite} />
          <ClickHandler onPick={handlePick} />
          {hasLocation && (
            <>
              <Marker position={[parseFloat(value.lat), parseFloat(value.lng)]} />
              {fenceRadius > 0 && (
                <Circle
                  center={[parseFloat(value.lat), parseFloat(value.lng)]}
                  radius={fenceRadius}
                  pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.1, weight: 1.5 }}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>
      {hasLocation ? (
        <p className="text-xs text-gray-500">
          {parseFloat(value.lat).toFixed(6)}, {parseFloat(value.lng).toFixed(6)}
          <button onClick={() => onChange({ lat: '', lng: '' })} className="ml-2 inline-flex items-center gap-0.5 text-gray-400 hover:text-red-400 transition-colors">{rich(cc.locationPicker.clear({ icon: <Icon name="close" size={12} /> }))}</button>
        </p>
      ) : (
        <p className="text-xs text-gray-400">{cc.locationPicker.clickOnTheMapTo}</p>
      )}
    </div>
  );
}
