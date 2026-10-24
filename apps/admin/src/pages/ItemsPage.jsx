import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { SHOP_ITEMS, shopConfig } from '@grandcityrace/shared';
import { db } from '../firebase';
import Icon from '../components/Icon';

const SETTING_LIMITS = {
  durationMinutes: { min: 1, error: cc.itemsPage.mustBeAtLeast1 },
  percent: { min: 1, max: 100, error: cc.itemsPage.mustBeBetween1And },
  cap: { min: 1, error: cc.itemsPage.mustBeAtLeast12 },
};

function ItemCard({ item, config, onSave, saving }) {
  const settings = Object.entries(item.settings);
  const [values, setValues] = useState(() => ({
    price: String(config.price),
    ...Object.fromEntries(settings.map(([key]) => [key, String(config[key])])),
  }));
  const [error, setError] = useState(null);

  const dirty = values.price !== String(config.price)
    || settings.some(([key]) => values[key] !== String(config[key]));

  function save() {
    const price = parseInt(values.price);
    if (!Number.isFinite(price) || price < 0) return setError(cc.itemsPage.priceMustBe0Or);
    const patch = { price };
    for (const [key, label] of settings) {
      const n = parseInt(values[key]);
      const { min, max, error: message } = SETTING_LIMITS[key];
      if (!Number.isFinite(n) || n < min || (max && n > max)) return setError(`${label.replace(/ \(.*\)$/, '')} ${message}.`);
      patch[key] = n;
    }
    setError(null);
    onSave(patch);
  }

  const field = (key, label, min) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        value={values[key]}
        onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className={`bg-white border rounded-lg p-5 ${config.enabled ? 'border-gray-200' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <Icon name={item.icon} size={24} className="text-gray-700" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className={`text-sm font-semibold ${config.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
              {item.name}
            </h2>
            {item.targetsTeam && (
              <span className="text-[11px] text-gray-400">{cc.itemsPage.usedOnAnotherTeam}</span>
            )}
            <button
              onClick={() => onSave({ enabled: !config.enabled })}
              className={`relative w-10 h-6 rounded-full transition-colors ml-auto ${config.enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
              title={config.enabled ? cc.itemsPage.onSale : cc.itemsPage.hiddenFromTeams}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-4' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">{item.description}</p>

          {config.enabled && (
            <>
              <div className="flex flex-wrap items-end gap-3 mt-4">
                {field(cc.itemsPage.price, cc.itemsPage.priceCoins, 0)}
                {settings.map(([key, label]) => field(key, label, SETTING_LIMITS[key].min))}
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? cc.itemsPage.saving : dirty ? cc.itemsPage.save : cc.itemsPage.saved}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [gameId]);

  const config = shopConfig(game);

  async function saveItem(type, patch) {
    setSaving(type);
    try {
      // Written as a nested field so other items are left alone
      await updateDoc(doc(db, 'games', gameId), {
        [`shop.${type}`]: { ...config[type], ...patch },
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{cc.itemsPage.items}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {cc.itemsPage.whatTeamsCanBuyWith}
      </p>

      <div className="space-y-3">
        {SHOP_ITEMS.map(item => (
          // Remounting when a stored value changes picks up another host's edit,
          // without an effect that would fight this host's typing
          <ItemCard
            key={`${item.type}:${JSON.stringify(config[item.type])}`}
            item={item}
            config={config[item.type]}
            saving={saving === item.type}
            onSave={patch => saveItem(item.type, patch)}
          />
        ))}
      </div>
    </div>
  );
}
