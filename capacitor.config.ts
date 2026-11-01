import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.wunschliste.local',
  appName: 'Wunschliste',
  webDir: 'dist',
  plugins: {
    SystemBars: { insetsHandling: 'native', initialViewportFitValueHint: 'cover' },
  },
}

export default config
