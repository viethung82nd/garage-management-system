import { ConfigProvider } from 'antd'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app'
import { AuthProvider } from './shared/auth'
import { NotificationCenter } from './widgets/notification-center'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ConfigProvider theme={{ token: { fontFamily: 'var(--font-body)' } }}>
      <AuthProvider>
        <BrowserRouter>
          <NotificationCenter />
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>,
)
