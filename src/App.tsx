import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { isDevAuthBypass } from './lib/cognitoConfig'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ConfirmEmail } from './pages/ConfirmEmail'
import { ForgotPassword } from './pages/ForgotPassword'
import { ChangePassword } from './pages/ChangePassword'
import { AuthCallback } from './pages/AuthCallback'
import { Home } from './pages/Home'
import { SearchPage } from './pages/SearchPage'
import { StockDetail } from './pages/StockDetail'
import { Account } from './pages/Account'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={isDevAuthBypass() ? '/register' : '/login'} replace />
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/account" element={<Account />} />
            <Route path="/transfer" element={<Navigate to="/account" replace />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/stock/:symbol" element={<StockDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
