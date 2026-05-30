import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { isDevAuthBypass } from './lib/cognitoConfig'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ConfirmEmail } from './pages/ConfirmEmail'
import { ForgotPassword } from './pages/ForgotPassword'
import { ChangePassword } from './pages/ChangePassword'
import { AuthCallback } from './pages/AuthCallback'
import { Home } from './pages/Home'

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
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
