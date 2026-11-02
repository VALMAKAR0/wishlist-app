import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.wunschliste.local',
  appName: 'Wunschliste',
  webDir: 'dist',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_wunsch', iconColor: '#E8546A' },
    SystemBars: { insetsHandling: 'native', initialViewportFitValueHint: 'cover' },
  },
}

export default config
