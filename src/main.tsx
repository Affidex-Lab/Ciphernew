import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter'
import { Buffer } from 'buffer'
import process from 'process'

if (!(window as any).Buffer) (window as any).Buffer = Buffer
if (!(window as any).process) (window as any).process = process

createRoot(document.getElementById('root')!).render(
  <AppRouter />
)
