import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../data/mockMarket'
import {
  externalProviderPasswordMessage,
  getExternalProvidersFromIdToken,
  isExternalProviderAccount,
} from '../lib/authProviders'
import {
  changePassword,
} from '../lib/cognito'
import { isCognitoConfigured, isDevAuthBypass } from '../lib/cognitoConfig'
import {
  passwordsMatch,
  validatePassword,
} from '../lib/passwordValidation'
import {
  createCashTransfer,
  getCashTransfers,
  getOrders,
  getPortfolio,
  isPortfolioApiConfigured,
  type CashTransferItem,
  type OrderItem,
} from '../lib/portfolioApi'
import './Account.css'

type ActivityItem =
  | {
      id: string
      kind: 'cash'
      side: string
      amount: number
      created_at: string
    }
  | {
      id: string
      kind: 'trade'
      side: string
      symbol: string
      quantity: number
      fill_price: number
      total: number
      created_at: string
    }

function mergeHistory(
  transfers: CashTransferItem[],
  orders: OrderItem[],
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...transfers.map((t) => ({
      id: `cash-${t.id}`,
      kind: 'cash' as const,
      side: t.side,
      amount: t.amount,
      created_at: t.created_at,
    })),
    ...orders.map((o) => ({
      id: `trade-${o.id}`,
      kind: 'trade' as const,
      side: o.side,
      symbol: o.symbol,
      quantity: o.quantity,
      fill_price: o.fill_price,
      total: o.total,
      created_at: o.created_at,
    })),
  ]
  return items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function Account() {
  const { accessToken, email, idToken } = useAuth()
  const portfolioOn = isPortfolioApiConfigured()
  const devBypass = isDevAuthBypass()
  const isSsoAccount = isExternalProviderAccount(idToken)
  const ssoMessage = isSsoAccount
    ? externalProviderPasswordMessage(getExternalProvidersFromIdToken(idToken))
    : null

  const [side, setSide] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [cash, setCash] = useState<number | null>(null)
  const [transfers, setTransfers] = useState<CashTransferItem[]>([])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [cashError, setCashError] = useState<string | null>(null)
  const [cashSuccess, setCashSuccess] = useState<string | null>(null)
  const [cashBusy, setCashBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  const passwordIssues = password.length > 0 ? validatePassword(password) : []

  const history = useMemo(
    () => mergeHistory(transfers, orders),
    [transfers, orders],
  )

  const refresh = useCallback(async () => {
    if (!portfolioOn) {
      setLoading(false)
      return
    }
    if (!accessToken) {
      setLoading(false)
      setCashError('Sign in again to load your account.')
      return
    }
    try {
      const [portfolioResult, cashResult, ordersResult] = await Promise.allSettled([
        getPortfolio(accessToken, email, '1D'),
        getCashTransfers(accessToken, email),
        getOrders(accessToken, email, undefined, 100),
      ])

      const errors: string[] = []

      if (portfolioResult.status === 'fulfilled') {
        setCash(portfolioResult.value.cash_balance)
      } else {
        errors.push(
          portfolioResult.reason instanceof Error
            ? portfolioResult.reason.message
            : 'Portfolio failed',
        )
      }

      if (cashResult.status === 'fulfilled') {
        setTransfers(cashResult.value)
      } else {
        errors.push(
          cashResult.reason instanceof Error
            ? cashResult.reason.message
            : 'Cash history failed',
        )
      }

      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value)
      } else {
        errors.push(
          ordersResult.reason instanceof Error
            ? ordersResult.reason.message
            : 'Orders failed',
        )
      }

      setCashError(errors.length > 0 ? errors.join(' · ') : null)
    } catch (err) {
      setCashError(err instanceof Error ? err.message : 'Failed to load account')
    } finally {
      setLoading(false)
    }
  }, [accessToken, email, portfolioOn])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleCashSubmit(event: FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setCashError('Enter a valid amount')
      return
    }
    setCashBusy(true)
    setCashError(null)
    setCashSuccess(null)
    try {
      const result = await createCashTransfer(accessToken, email, {
        side,
        amount: value,
      })
      setCash(result.cash_balance)
      setAmount('')
      setCashSuccess(
        `${side === 'deposit' ? 'Added' : 'Withdrew'} ${formatCurrency(value)}`,
      )
      await refresh()
    } catch (err) {
      setCashError(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setCashBusy(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPwError(null)
    setPwSuccess(null)

    if (devBypass) {
      setPwSuccess('Dev mode: password changes are not sent to Cognito.')
      return
    }

    if (!isCognitoConfigured()) {
      setPwError('Cognito is not configured. Add your pool settings to .env.')
      return
    }

    const issues = validatePassword(password)
    if (issues.length > 0) {
      setPwError(`Password requirements: ${issues.join(', ')}.`)
      return
    }

    if (!passwordsMatch(password, confirmPassword)) {
      setPwError('Passwords do not match.')
      return
    }

    if (!currentPassword) {
      setPwError('Enter your current password.')
      return
    }

    setPwBusy(true)
    try {
      await changePassword(currentPassword, password)
      setPwSuccess('Password updated successfully.')
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Password change failed.')
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <main className="account-page">
      <header className="account-hero">
        <p className="account-label">Account</p>
        <h1 className="account-title">{email ?? 'Your account'}</h1>
        <p className="account-buying-power">
          Buying power{' '}
          <strong>
            {loading ? '…' : cash !== null ? formatCurrency(cash) : '—'}
          </strong>
        </p>
      </header>

      <div className="account-grid">
        <section className="account-panel" aria-label="Add or withdraw money">
          <h2 className="account-section-title">Add / withdraw</h2>
          {!portfolioOn ? (
            <p className="account-hint">Portfolio API is not configured.</p>
          ) : (
            <form className="account-form" onSubmit={handleCashSubmit}>
              <div className="account-tabs">
                <button
                  type="button"
                  className={side === 'deposit' ? 'active' : ''}
                  onClick={() => setSide('deposit')}
                >
                  Add money
                </button>
                <button
                  type="button"
                  className={side === 'withdraw' ? 'active' : ''}
                  onClick={() => setSide('withdraw')}
                >
                  Withdraw
                </button>
              </div>
              <label className="account-field">
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              {cashError ? (
                <p className="account-error" role="alert">
                  {cashError}
                </p>
              ) : null}
              {cashSuccess ? (
                <p className="account-success" role="status">
                  {cashSuccess}
                </p>
              ) : null}
              <button type="submit" className="account-submit" disabled={cashBusy}>
                {cashBusy
                  ? 'Working…'
                  : side === 'deposit'
                    ? 'Add money'
                    : 'Withdraw'}
              </button>
            </form>
          )}
        </section>

        <section className="account-panel" aria-label="Change password">
          <h2 className="account-section-title">Change password</h2>
          {isSsoAccount ? (
            <p className="account-hint" role="status">
              {ssoMessage}
            </p>
          ) : (
            <>
              {devBypass ? (
                <p className="account-hint">
                  Cognito is skipped in dev mode. Password changes are not applied.
                </p>
              ) : null}
              <form className="account-form" onSubmit={handlePasswordSubmit} noValidate>
                {!devBypass ? (
                  <label className="account-field">
                    Current password
                    <div className="account-password-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={pwBusy}
                        required
                      />
                      <button
                        type="button"
                        className="account-toggle-password"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </label>
                ) : null}
                <label className="account-field">
                  New password
                  <div className="account-password-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={pwBusy}
                      required
                    />
                    <button
                      type="button"
                      className="account-toggle-password"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {passwordIssues.length > 0 ? (
                    <ul className="account-pw-hints">
                      {passwordIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : password.length > 0 ? (
                    <p className="account-success">Password meets requirements</p>
                  ) : null}
                </label>
                <label className="account-field">
                  Confirm new password
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={pwBusy}
                    required
                  />
                </label>
                {pwError ? (
                  <p className="account-error" role="alert">
                    {pwError}
                  </p>
                ) : null}
                {pwSuccess ? (
                  <p className="account-success" role="status">
                    {pwSuccess}
                  </p>
                ) : null}
                <button type="submit" className="account-submit" disabled={pwBusy}>
                  {pwBusy ? 'Saving…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="account-panel account-panel--history" aria-label="Account history">
          <h2 className="account-section-title">History</h2>
          {!portfolioOn ? (
            <p className="account-hint">Portfolio API is not configured.</p>
          ) : history.length === 0 ? (
            <p className="account-hint">No activity yet — transfer cash or trade a stock.</p>
          ) : (
            <ul className="account-history">
              {history.map((item) => {
                if (item.kind === 'cash') {
                  const isIn = item.side === 'deposit'
                  return (
                    <li key={item.id} className="account-history-row">
                      <div>
                        <span className="account-history-title">
                          {isIn ? 'Added money' : 'Withdrew money'}
                        </span>
                        <span className="account-history-time">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span
                        className={
                          isIn
                            ? 'account-history-amount account-history-amount--in'
                            : 'account-history-amount account-history-amount--out'
                        }
                      >
                        {isIn ? '+' : '−'}
                        {formatCurrency(item.amount)}
                      </span>
                    </li>
                  )
                }

                const isBuy = item.side === 'buy'
                return (
                  <li key={item.id} className="account-history-row">
                    <div>
                      <span className="account-history-title">
                        {isBuy ? 'Bought' : 'Sold'}{' '}
                        <Link to={`/stock/${item.symbol}`}>{item.symbol}</Link>
                      </span>
                      <span className="account-history-meta">
                        {item.quantity} shares @ {formatCurrency(item.fill_price)}
                      </span>
                      <span className="account-history-time">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={
                        isBuy
                          ? 'account-history-amount account-history-amount--out'
                          : 'account-history-amount account-history-amount--in'
                      }
                    >
                      {isBuy ? '−' : '+'}
                      {formatCurrency(item.total)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
