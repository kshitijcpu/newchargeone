import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';

const STATUS_COLOR = {
  AVAILABLE: '#A3E635',
  BUSY: '#F59E0B',
  OCCUPIED: '#F59E0B',
  CHARGING: '#22D3EE',
  FAULT: '#EF4444',
  OFFLINE: '#64748B',
  MAINTENANCE: '#F59E0B',
};

const boltSvg = (fill) => `<svg viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 4.5 14H11l-1.5 8L18 10h-6.5L13 2z"/></svg>`;

export function markerIcon(status, pulse = false) {
  const c = STATUS_COLOR[status] || '#64748B';
  const dark = status === 'OFFLINE';
  return L.divIcon({
    className: `co-marker ${pulse ? 'pulse' : ''}`,
    html: `<div class="pin" style="background:${c}">${boltSvg(dark ? '#CBD5E1' : '#0B1220')}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
    popupAnchor: [0, -30],
  });
}

function buildPopupHtml(s) {
  const c = s.counts || {};
  const healthColor = (s.health ?? 0) >= 80 ? '#A3E635' : (s.health ?? 0) >= 55 ? '#F59E0B' : '#EF4444';
  const statusColors = { AVAILABLE: '#A3E635', CHARGING: '#22D3EE', FAULT: '#EF4444', OFFLINE: '#64748B', MAINTENANCE: '#F59E0B', OCCUPIED: '#F59E0B', BUSY: '#F59E0B' };
  const sc = statusColors[s.status] || '#64748B';
  return `
    <div style="min-width:220px;padding:14px 16px;">
      <div style="font-weight:800;font-size:14px;margin-bottom:2px;line-height:1.3">${s.name}</div>
      <div style="color:#64748B;font-size:11px;margin-bottom:10px">${s.operatorName || ''} · ${s.city || ''}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:${sc}">
          <span style="width:7px;height:7px;border-radius:50%;background:${sc};display:inline-block"></span>
          ${s.status || 'UNKNOWN'}
        </span>
        <span style="color:#334155;font-size:11px;">|</span>
        <span style="font-size:11px;font-weight:700;color:${healthColor}">Health ${s.health ?? '—'}/100</span>
      </div>
      <div style="display:flex;gap:10px;font-size:11px;margin-bottom:10px">
        <span style="color:#A3E635;font-weight:600">● ${c.available ?? 0} free</span>
        <span style="color:#F59E0B;font-weight:600">● ${c.occupied ?? 0} busy</span>
        <span style="color:#EF4444;font-weight:600">● ${c.fault ?? 0} fault</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07)">
        <span style="color:#94A3B8;font-size:11px">₹${s.pricePerKwh}/kWh · up to ${s.maxPower} kW</span>
        ${s.id ? `<a href="/station/${s.id}" style="font-size:11px;font-weight:700;color:#A3E635;text-decoration:none;background:rgba(163,230,53,0.1);border:1px solid rgba(163,230,53,0.3);border-radius:6px;padding:3px 10px" onclick="event.stopPropagation()">View →</a>` : ''}
      </div>
    </div>`;
}

export default function MapView({
  stations = [],
  center = [19.076, 72.8777],
  zoom = 11,
  height = '100%',
  onSelect,
  selectedId,
  fit = false,
  route = null,
  className = '',
  pulse = true,
  userPos = null,
  showLocateBtn = false,
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const routeRef = useRef(null);
  const userRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const { locate, geo } = useApp();

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true, zoomAnimation: true }).setView(center, zoom);
    // Stadia Alidade Smooth Dark — sharp, modern dark tiles (no API key needed)
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.setView(center, zoom);
  }, [center[0], center[1], zoom]);

  useEffect(() => {
    const layer = layerRef.current, map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    stations.forEach(s => {
      const isPulsing = pulse && (s.status === 'AVAILABLE' || s.id === selectedId);
      const m = L.marker([s.lat, s.lng], { icon: markerIcon(s.status, isPulsing) });
      m.bindPopup(buildPopupHtml(s), { maxWidth: 260, className: 'co-popup' });
      m.on('click', () => onSelect && onSelect(s));
      layer.addLayer(m);
    });
    if (fit && stations.length) {
      map.fitBounds(L.latLngBounds(stations.map(s => [s.lat, s.lng])).pad(0.15));
    }
  }, [stations, selectedId, fit, onSelect, pulse]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    if (route && route.length > 1) {
      const g = L.layerGroup().addTo(map);
      L.polyline(route, { color: '#334155', weight: 6, opacity: .7 }).addTo(g);
      L.polyline(route, { color: '#A3E635', weight: 2.5, className: 'energy-flow' }).addTo(g);
      routeRef.current = g;
      map.fitBounds(L.latLngBounds(route).pad(0.2));
    }
  }, [JSON.stringify(route)]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userRef.current) { userRef.current.remove(); userRef.current = null; }
    const pos = userPos || geo;
    if (pos) {
      const g = L.layerGroup().addTo(map);
      L.circle([pos.lat, pos.lng], {
        radius: Math.min(pos.accuracy || 60, 500),
        color: '#38BDF8', weight: 1, opacity: 0.3,
        fillColor: '#38BDF8', fillOpacity: 0.06,
      }).addTo(g);
      L.marker([pos.lat, pos.lng], {
        icon: L.divIcon({
          className: 'user-loc',
          html: '<div class="ring"></div><div class="dot"></div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
        zIndexOffset: 1000,
      }).bindPopup('<b style="color:#F8FAFC">You are here</b><br/><span style="color:#64748B;font-size:11px">Live location</span>').addTo(g);
      userRef.current = g;
    }
  }, [userPos?.lat, userPos?.lng, geo?.lat, geo?.lng]);

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      const g = await locate();
      const map = mapRef.current;
      if (map && g) map.flyTo([g.lat, g.lng], 14, { animate: true, duration: 1.2 });
    } catch {}
    finally { setLocating(false); }
  }, [locate]);

  return (
    <div style={{ position: 'relative', height, width: '100%' }} className={`rounded-2xl border border-line overflow-hidden z-0 ${className}`}>
      <div ref={elRef} style={{ height: '100%', width: '100%' }} />
      {showLocateBtn && (
        <button
          onClick={handleLocate}
          className={`map-locate-btn ${locating ? 'locating' : ''}`}
          title="Find my location"
          aria-label="Find my location"
        >
          {locating ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/><circle cx="12" cy="12" r="7"/></svg>
          )}
        </button>
      )}
    </div>
  );
}
