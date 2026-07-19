import { App as AntApp, ConfigProvider } from 'antd'
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
      {/* antd's static notification/message/Modal APIs can't consume
          ConfigProvider's context on their own — wrapping in App gives
          NotificationCenter a themed, context-aware instance via App.useApp(). */}
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <NotificationCenter />
            <App />
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
