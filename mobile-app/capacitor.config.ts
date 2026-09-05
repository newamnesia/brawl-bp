import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.newam.brawlbp',
  appName: '荒野训练',
  webDir: 'dist/client',
  server: { androidScheme: 'https', cleartext: false },
  android: { backgroundColor: '#0f1419' },
};
export default config;
