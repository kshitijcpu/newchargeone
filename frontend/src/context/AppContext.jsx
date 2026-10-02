import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken } from '../lib/api';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

let toastId = 0;

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!getToken());
  const [toasts, setToasts] = useState([]);
  const [netStats, setNetStats] = useState(null);
  const [unread, setUnread] = useState(0);
  const [geo, setGeo] = useState(null); // { lat, lng, accuracy, at } — live-updated via watchPosition
  const socketRef = useRef(null);
  const geoWatchRef = useRef(null);

  const toast = useCallback((msg, type = 'success') => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (getToken()) {
      api('/auth/me').then(d => setUser(d.user)).catch(() => setToken(null)).finally(() => setBooting(false));
    }
  }, []);

  useEffect(() => {
    const s = io({ path: '/socket.io' });
    socketRef.current = s;
    s.on('network:stats', setNetStats);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    const s = socketRef.current;
    if (!s || !user) return;
    const onNotif = (d) => {
      if (d.userId === user.id) {
        setUnread(u => u + 1);
        api('/notifications').then(r => {
          const latest = r.notifications[0];
          if (latest) toast(latest.title, latest.type === 'fault' ? 'warn' : 'success');
        }).catch(() => {});
      }
    };
    s.on('notification:new', onNotif);
    return () => s.off('notification:new', onNotif);
  }, [user, toast]);

  const locate = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { toast('Geolocation is not supported by this browser', 'error'); return reject(new Error('unsupported')); }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, at: Date.now() };
        setGeo(g);
        // start/refresh live tracking so the blue dot follows the user
        if (geoWatchRef.current == null) {
          geoWatchRef.current = navigator.geolocation.watchPosition(
            (p2) => setGeo({ lat: p2.coords.latitude, lng: p2.coords.longitude, accuracy: p2.coords.accuracy, at: Date.now() }),
            () => {}, { enableHighAccuracy: true, maximumAge: 15000 }
          );
        }
        resolve(g);
      },
      (err) => {
        toast(err.code === 1 ? 'Location permission denied — using Mumbai as default' : 'Could not get your location — using Mumbai as default', 'warn');
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  }), [toast]);

  useEffect(() => () => { if (geoWatchRef.current != null) navigator.geolocation?.clearWatch(geoWatchRef.current); }, []);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token); setUser(d.user);
    return d.user;
  };
  const register = async (body) => {
    const d = await api('/auth/register', { method: 'POST', body });
    setToken(d.token); setUser(d.user);
    return d.user;
  };
  const logout = () => { setToken(null); setUser(null); };

  const value = useMemo(() => ({ user, setUser, booting, login, register, logout, toast, toasts, socket: socketRef, netStats, unread, setUnread, geo, locate }), [user, booting, toasts, netStats, unread, geo, locate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
