import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suara Cerdas - AI Voice Studio',
  description: 'Ubah teks menjadi suara alami dengan AI. Untuk podcast, iklan, berita, MC, dan konten marketing.',
  keywords: 'text to speech, AI voice, suara AI, voiceover, podcast, iklan radio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
