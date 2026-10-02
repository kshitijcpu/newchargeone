import React, { useEffect, useState } from 'react';
import { Search, Crosshair, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import MapView from '../../components/MapView';
import StationCard from '../../components/StationCard';
import { SkeletonRows, EmptyState } from '../../components/ui';
import { api } from '../../lib/api';

export default function PublicStations() {
  const { geo, locate, toast } = useApp();
  const [stations, setStations] = useState(null);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [sel, setSel] = useState(null);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);

  const nearMe = async () => {
    setLocating(true);
    try {
      const g = await locate();
      const d = await api(`/stations/nearby?limit=99&lat=${g.lat}&lng=${g.lng}`);
      setStations(d.stations); setCity(''); setQ(''); setLocated(true);
      const n = d.stations[0];
      if (n) { setSel(n); toast(`Nearest station: ${n.name} — ${n.distanceKm} km away`, 'info'); }
    } catch {} finally { setLocating(false); }
  };

  useEffect(() => {
    if (located) return; // keep the near-me ordering until a filter is used
    const t = setTimeout(() => {
      api(`/stations?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ''}`)
        .then(d => setStations(d.stations)).catch(() => setStations([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, city, located]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold">Explore supported stations</h1>
      <p className="text-sub text-sm mt-1">Live status across participating networks. Log in to verify, reserve and charge.</p>
      <div className="grid lg:grid-cols-[400px_1fr] gap-4 mt-6">
        <div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sub" />
            <input className="input !pl-10" placeholder="Search location or destination" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap mb-4">
            <button onClick={nearMe} disabled={locating} className={`chip cursor-pointer ${located ? 'text-cyan-300 bg-cyan-400/10 border-cyan-400/40' : 'text-bg bg-primary border-primary'}`}>
              {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />} {located ? 'Live location on' : 'Near me'}
            </button>
            {['', 'Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Bengaluru', 'Delhi', 'Hyderabad'].map(c => (
              <button key={c} onClick={() => { setLocated(false); setCity(c); }} className={`chip cursor-pointer ${city === c && !located ? 'text-bg bg-primary border-primary' : 'text-sub bg-card2 border-line hover:border-slate-500'}`}>{c || 'All cities'}</button>
            ))}
          </div>
          <div className="space-y-3 lg:max-h-[62vh] lg:overflow-y-auto lg:pr-1">
            {!stations ? <SkeletonRows n={4} /> :
              stations.length === 0 ? <EmptyState title="No stations match" sub="Try a different search or city filter." /> :
              stations.map(s => <StationCard key={s.id} s={s} selected={sel?.id === s.id} onSelect={setSel} compact />)}
          </div>
        </div>
        <div className="h-[420px] lg:h-[calc(62vh+120px)] lg:sticky lg:top-20">
          <MapView stations={stations || []} fit={!located && !!stations?.length} center={located && geo ? [geo.lat, geo.lng] : [19.076, 72.8777]} zoom={located ? 12 : 11} selectedId={sel?.id} onSelect={setSel} userPos={geo} />
        </div>
      </div>
    </div>
  );
}
