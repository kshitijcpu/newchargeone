import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Crosshair, Loader2, Navigation, Zap, MapPin } from 'lucide-react';
import MapView from '../../components/MapView';
import StationCard from '../../components/StationCard';
import { SkeletonRows, EmptyState, PageHead, StatusBadge, HealthRing } from '../../components/ui';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

const SPEEDS = { Slow: [0, 22], Fast: [22, 60], 'Ultra Fast': [60, 1000] };

export default function FindCharger() {
  const { socket, geo, locate, toast, user } = useApp();
  const nav = useNavigate();
  const [stations, setStations] = useState(null);
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sel, setSel] = useState(null);
  const [coords, setCoords] = useState(null);        // confirmed "near me" origin
  const [locating, setLocating] = useState(false);
  const [mapView, setMapView] = useState({ center: [19.076, 72.8777], zoom: 11, fit: true });
  const [f, setF] = useState({ connector: '', speed: '', availability: '', maxPrice: 20, maxDist: 2000, minHealth: 0, facilities: [] });

  const load = (c = coords) =>
    api(`/stations/nearby?limit=99${c ? `&lat=${c.lat}&lng=${c.lng}` : ''}`)
      .then(d => setStations(d.stations)).catch(() => setStations([]));

  useEffect(() => {
    load();
    // Auto-locate if geolocation already permitted (non-blocking)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(p => {
        if (p.state === 'granted') nearMe();
      }).catch(() => {});
    }
  }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    const h = () => load();
    s.on('charger:update', h);
    return () => s.off('charger:update', h);
  }, [socket, coords]);

  const nearMe = async () => {
    setLocating(true);
    try {
      const g = await locate();
      setCoords(g);
      const d = await api(`/stations/nearby?limit=99&lat=${g.lat}&lng=${g.lng}`);
      setStations(d.stations);
      setMapView({ center: [g.lat, g.lng], zoom: 12, fit: false });
      const nearest = d.stations[0];
      if (nearest) {
        setSel(nearest);
        toast(`Nearest charger: ${nearest.name} — ${nearest.distanceKm} km away`, 'info');
      }
    } catch { /* toast already shown, keep Mumbai default */ }
    finally { setLocating(false); }
  };

  const filtered = useMemo(() => {
    if (!stations) return null;
    let list = stations;
    if (q) { const s = q.toLowerCase(); list = list.filter(x => (x.name + x.city + x.address + x.operatorName).toLowerCase().includes(s)); }
    if (f.connector) list = list.filter(x => x.connectors.includes(f.connector));
    if (f.speed) { const [a, b] = SPEEDS[f.speed]; list = list.filter(x => x.maxPower > a && x.maxPower <= b); }
    if (f.availability === 'Available') list = list.filter(x => x.counts.available > 0);
    if (f.availability === 'Busy') list = list.filter(x => x.status === 'BUSY' || x.counts.occupied > 0);
    if (f.availability === 'Offline') list = list.filter(x => x.status === 'OFFLINE' || x.counts.offline > 0);
    list = list.filter(x => x.pricePerKwh <= f.maxPrice && x.health >= f.minHealth && (x.distanceKm ?? 0) <= f.maxDist);
    f.facilities.forEach(fc => { list = list.filter(x => x.facilities.includes(fc)); });
    return list;
  }, [stations, q, f]);

  const nearest = coords && filtered && filtered.length ? filtered[0] : null;

  const Chip = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`chip cursor-pointer transition ${active ? 'text-bg bg-primary border-primary' : 'text-sub bg-card2 border-line hover:border-slate-500'}`}>{children}</button>
  );

  return (
    <div>
      <PageHead title="Find a charger" sub="Live availability and health across participating networks"
        right={
          <button className={`btn ${coords ? 'btn-ghost !border-cyan-400/50 !text-cyan-300' : 'btn-primary'}`} onClick={nearMe} disabled={locating}>
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {coords ? 'Live location on' : 'Near me'}
          </button>
        } />

      {/* Nearest station banner */}
      {nearest && (
        <div className="card p-4 mb-4 border-cyan-400/40 flex flex-wrap items-center gap-4 animate-fadeUp">
          <div className="w-11 h-11 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-cyan-300" />
          </div>
          <HealthRing score={nearest.health} size={46} stroke={5} />
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">Nearest charging station</div>
            <div className="font-bold truncate">{nearest.name} <span className="text-sub font-medium">· {nearest.operatorName}</span></div>
            <div className="text-xs text-sub flex flex-wrap items-center gap-x-2.5">
              <b className="text-cyan-300">{nearest.distanceKm} km away</b>
              <span>{nearest.counts.available} available now</span>
              <span>up to {nearest.maxPower} kW</span>
              <span className="text-primary font-semibold">₹{nearest.pricePerKwh}/kWh</span>
            </div>
          </div>
          <StatusBadge status={nearest.status} />
          <div className="flex gap-2">
            <button className="btn-ghost !py-2 !text-xs" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${nearest.lat},${nearest.lng}`, '_blank')}>
              <Navigation className="w-3.5 h-3.5" /> Navigate
            </button>
            <button className="btn-primary !py-2 !text-xs" onClick={() => nav(`/station/${nearest.id}`)}>
              <Zap className="w-3.5 h-3.5" /> View & Charge
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[420px_1fr] gap-4">
        <div>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sub" />
              <input className="input !pl-10" placeholder="Search location or destination" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <button className={`btn-ghost !px-3 ${showFilters ? '!border-primary/50 !text-primary' : ''}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="w-4 h-4" /></button>
          </div>

          {showFilters && (
            <div className="card p-4 mb-3 space-y-4 animate-fadeUp">
              <div>
                <div className="label">Connector</div>
                <div className="flex gap-2 flex-wrap">{['CCS2', 'Type 2', 'CHAdeMO'].map(c => <Chip key={c} active={f.connector === c} onClick={() => setF(x => ({ ...x, connector: x.connector === c ? '' : c }))}>{c}</Chip>)}</div>
              </div>
              <div>
                <div className="label">Charging speed</div>
                <div className="flex gap-2 flex-wrap">{Object.keys(SPEEDS).map(c => <Chip key={c} active={f.speed === c} onClick={() => setF(x => ({ ...x, speed: x.speed === c ? '' : c }))}>{c}</Chip>)}</div>
              </div>
              <div>
                <div className="label">Availability</div>
                <div className="flex gap-2 flex-wrap">{['Available', 'Busy', 'Offline'].map(c => <Chip key={c} active={f.availability === c} onClick={() => setF(x => ({ ...x, availability: x.availability === c ? '' : c }))}>{c}</Chip>)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="label">Max price — ₹{f.maxPrice}/kWh</div>
                  <input type="range" min="10" max="20" value={f.maxPrice} onChange={e => setF(x => ({ ...x, maxPrice: +e.target.value }))} className="w-full accent-[#A3E635]" />
                </div>
                <div>
                  <div className="label">Min reliability — {f.minHealth}</div>
                  <input type="range" min="0" max="95" step="5" value={f.minHealth} onChange={e => setF(x => ({ ...x, minHealth: +e.target.value }))} className="w-full accent-[#A3E635]" />
                </div>
              </div>
              <div>
                <div className="label">Facilities</div>
                <div className="flex gap-2 flex-wrap">{['Parking', 'Cafe', 'Restroom', '24x7'].map(c => <Chip key={c} active={f.facilities.includes(c)} onClick={() => setF(x => ({ ...x, facilities: x.facilities.includes(c) ? x.facilities.filter(y => y !== c) : [...x.facilities, c] }))}>{c}</Chip>)}</div>
              </div>
              <button className="btn-ghost w-full !py-2 !text-xs" onClick={() => setF({ connector: '', speed: '', availability: '', maxPrice: 20, maxDist: 2000, minHealth: 0, facilities: [] })}><X className="w-3.5 h-3.5" /> Clear filters</button>
            </div>
          )}

          <div className="text-xs text-sub mb-2">
            {filtered ? `${filtered.length} stations` : 'Loading…'} · sorted by distance{coords ? ' from your live location' : ' from city centre'}
          </div>
          <div className="space-y-3 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1">
            {!filtered ? <SkeletonRows n={4} /> :
              filtered.length === 0 ? <EmptyState title="No chargers match your filters" sub="Relax a filter or search a different area." /> :
              filtered.map((s, i) => <StationCard key={s.id} s={s} selected={sel?.id === s.id} onSelect={(x) => setSel(x)} nearest={!!coords && i === 0} />)}
          </div>
        </div>
        <div className="h-[420px] lg:h-[calc(100vh-190px)] lg:sticky lg:top-20">
          <MapView stations={filtered || []} fit={mapView.fit && !!filtered?.length} center={mapView.center} zoom={mapView.zoom} selectedId={sel?.id} onSelect={setSel} userPos={geo} showLocateBtn />
        </div>
      </div>
    </div>
  );
}
