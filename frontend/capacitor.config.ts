import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ca.uottawa.clinicflow',
  appName: 'ClinicFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
