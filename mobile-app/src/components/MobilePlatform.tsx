import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor, SystemBars, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export default function MobilePlatform() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const training = pathname === '/offline-training/game';
    void ScreenOrientation.lock({ orientation: training ? 'landscape' : 'portrait' }).catch(console.warn);
    void (training ? SystemBars.hide() : SystemBars.show()).catch(console.warn);
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const track = async (promise: Promise<PluginListenerHandle>) => {
      const handle = await promise;
      if (disposed) await handle.remove(); else handles.push(handle);
    };
    void track(App.addListener('backButton', () => {
      if (training) window.dispatchEvent(new Event('training-pause'));
      else if (pathname.startsWith('/room/')) window.dispatchEvent(new Event('room-back'));
      else if (pathname === '/') void App.minimizeApp();
      else navigate('/');
    }));
    void track(App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) window.dispatchEvent(new Event('training-pause'));
      else window.dispatchEvent(new Event('app-resume'));
    }));
    return () => { disposed = true; handles.forEach(handle => void handle.remove()); };
  }, [pathname, navigate]);
  return null;
}
