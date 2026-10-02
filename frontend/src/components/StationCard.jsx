import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Navigation, Eye, CalendarClock, BadgeCheck, Heart } from 'lucide-react';
import { StatusBadge, HealthRing } from './ui';
import { useApp } from '../context/AppContext';

export default function StationCard({ s, onSelect, selected, compact = false, onFav, fav, nearest = false }) {
  const nav = useNavigate();
  const { user, toast } = useApp();
  const view = () => user ? nav(`/station/${s.id}`) : nav('/login');
  return (
    <div className={`card card-hover p-4 cursor-pointer ${selected ? 'border-primary/50 shadow-glow' : ''}`} onClick={() => onSelect ? onSelect(s) : view()}>
      <div className="flex gap-3">
        <HealthRing score={s.health} size={compact ? 48 : 56} stroke={5} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate flex items-center gap-1.5">
                {nearest && <span className="chip !px-1.5 !py-0.5 !text-[9px] text-cyan-300 bg-cyan-400/10 border-cyan-400/40 shrink-0">📍 NEAREST</span>}
                {s.name}
                {s.verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" title="ChargeOne Verified" />}
              </div>
              <div className="text-xs text-sub truncate">{s.operatorName} · {s.city}</div>
            </div>
            <StatusBadge status={s.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-sub">
            {s.distanceKm != null && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.distanceKm} km</span>}
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warn fill-warn" />{s.rating}</span>
            <span className="font-semibold text-ink">{s.connectors?.join(' · ')}</span>
            <span>up to <b className="text-ink">{s.maxPower} kW</b></span>
            <span className="font-semibold text-primary">₹{s.pricePerKwh}/kWh</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <div className="flex gap-2 text-[11px] font-bold">
          <span className="text-primary">{s.counts?.available ?? 0} Available</span>
          <span className="text-warn">{s.counts?.occupied ?? 0} Busy</span>
          {(s.counts?.fault ?? 0) > 0 && <span className="text-danger">{s.counts.fault} Fault</span>}
        </div>
        <div className="text-[10px] text-slate-500">Verified {s.lastVerifiedMin <= 1 ? 'just now' : `${s.lastVerifiedMin} min ago`}</div>
      </div>
      {!compact && (
        <div className="grid grid-cols-3 gap-2 mt-3" onClick={e => e.stopPropagation()}>
          <button className="btn-ghost !py-2 !text-xs" onClick={view}><Eye className="w-3.5 h-3.5" /> View</button>
          <button className="btn-ghost !py-2 !text-xs" onClick={() => { window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`, '_blank'); }}><Navigation className="w-3.5 h-3.5" /> Navigate</button>
          {onFav ? (
            <button className={`btn-ghost !py-2 !text-xs ${fav ? '!text-danger' : ''}`} onClick={() => onFav(s)}><Heart className={`w-3.5 h-3.5 ${fav ? 'fill-danger' : ''}`} /> {fav ? 'Saved' : 'Save'}</button>
          ) : (
            <button className="btn-primary !py-2 !text-xs" onClick={() => user ? nav(`/station/${s.id}?reserve=1`) : (toast('Log in to reserve a charger', 'info'), nav('/login'))}><CalendarClock className="w-3.5 h-3.5" /> Reserve</button>
          )}
        </div>
      )}
    </div>
  );
}
