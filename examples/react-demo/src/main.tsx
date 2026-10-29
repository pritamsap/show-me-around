import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TourProvider, type TourFile } from './tour'
import tour from './tour/tour.json'
import { version } from '../package.json'

// Narration made by /tour-voice: { stepId: url }
const voiceFiles = import.meta.glob('./tour/voice/*.wav', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const tourVoice = Object.fromEntries(
  Object.entries(voiceFiles).map(([path, url]) => [path.split('/').pop()!.replace('.wav', ''), url]),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TourProvider
      tour={tour as TourFile}
      appVersion={version}
      voice={tourVoice}
      theme="dark"
      colors={{ accent: '#10b981', accentText: '#052e16', cardBg: '#0b1220' }}
      onBeforeStep={(step) => {
        if (step.route) window.location.hash = step.route
      }}
    >
      <App />
    </TourProvider>
  </StrictMode>,
)
