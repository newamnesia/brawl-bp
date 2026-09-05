import { Capacitor } from '@capacitor/core';

export function serviceUrl() {
  return localStorage.getItem('bp-service-url') || import.meta.env.VITE_SOCKET_URL ||
    (Capacitor.isNativePlatform() ? '' : window.location.origin);
}

export function invitationUrl(code: string) {
  const base = localStorage.getItem('bp-service-url') || import.meta.env.VITE_PUBLIC_WEB_URL || serviceUrl();
  return `${base.replace(/\/+$/, '')}/bp?code=${encodeURIComponent(code)}`;
}
