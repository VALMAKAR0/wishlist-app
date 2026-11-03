import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

interface ShareInPlugin {
  getPending(): Promise<{ text: string }>
  addListener(event: 'shareIn', cb: (e: { text: string }) => void): Promise<PluginListenerHandle>
}

export const ShareIn = registerPlugin<ShareInPlugin>('ShareIn')
