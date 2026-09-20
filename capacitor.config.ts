import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'et.eyob.traditionalstore',
  appName: 'Eyob Traditional Store',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#FAF6EE' },
  ios: { backgroundColor: '#FAF6EE' },
};

export default config;
