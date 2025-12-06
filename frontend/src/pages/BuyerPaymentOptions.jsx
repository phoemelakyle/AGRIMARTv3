import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { fetchPaymentOptions, savePaymentOptions } from '../api/agrimartApi'
import './BuyerPaymentOptions.css'

const CASH_ONLY_METHOD = 'Cash on Delivery'

const BuyerPaymentOptions = () => {
  const [methods, setMethods] = useState([])
  const [formState, setFormState] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const hydrateState = (methodList, options) => {
    const next = {}
    methodList.forEach((method) => {
      const accountValue = options?.[method.name]
      next[method.name] = {
        enabled: Boolean(accountValue),
        account: accountValue && accountValue !== 'None' ? accountValue : '',
      }
    })
    return next
  }

  const loadPaymentOptions = async () => {
    setLoading(true)
    setMessage('')
    setError('')
    const response = await fetchPaymentOptions()
    setLoading(false)
    if (response.ok) {
      const methodsFromApi = response.body?.paymentMethods ?? []
      const existingOptions = response.body?.options ?? {}
      setMethods(methodsFromApi)
      setFormState(hydrateState(methodsFromApi, existingOptions))
    } else {
      setError(response.body?.message || 'Unable to load payment options.')
    }
  }

  useEffect(() => {
    loadPaymentOptions()
  }, [])

  const handleToggleMethod = (methodName) => {
    setFormState((prev) => {
      const current = prev[methodName] ?? { enabled: false, account: '' }
      return {
        ...prev,
        [methodName]: { ...current, enabled: !current.enabled },
      }
    })
  }

  const handleAccountChange = (methodName, value) => {
    setFormState((prev) => ({
      ...prev,
      [methodName]: { ...prev[methodName], account: value },
    }))
  }

  const activeMethods = useMemo(
    () =>
      Object.entries(formState)
        .filter(([, value]) => value?.enabled)
        .map(([name]) => name),
    [formState],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    const payloadOptions = {}
    let missingMethod = ''
    Object.entries(formState).forEach(([methodName, state]) => {
      if (!state?.enabled) {
        return
      }
      if (methodName === CASH_ONLY_METHOD) {
        payloadOptions[methodName] = 'None'
        return
      }
      if (!state.account?.trim()) {
        missingMethod = methodName
        return
      }
      payloadOptions[methodName] = state.account.trim()
    })

    if (missingMethod) {
      setError(`Please add an account number for ${missingMethod}.`)
      return
    }

    setSaving(true)
    const response = await savePaymentOptions(payloadOptions)
    setSaving(false)
    if (response.ok) {
      setMessage('Payment options saved.')
      loadPaymentOptions()
    } else {
      setError(response.body?.message || 'Unable to save payment options right now.')
    }
  }

  return (
    <>
      <Navigation />
      <section className="page-shell space-y-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Buyer account</p>
              <h1 className="text-3xl font-semibold text-slate-900">Payment methods</h1>
              <p className="text-sm text-slate-500">Keep your bank and wallet details current for quick checkout.</p>
            </div>
            <Link to="/homepage_buyer" className="shop-btn text-sm px-4 py-2">
              Back to shopping
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[240px_1.2fr]">
          <aside className="payment-sidebar">
            <div className="status">
              <h3>Account</h3>
              <ul>
                <li>
                  <Link to="/buyer_account" className="account-btn">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link to="/buyer_payment_options" className="account-btn">
                    Banks &amp; Cards
                  </Link>
                </li>
                <li>
                  <Link to="/buyer_address" className="account-btn">
                    Addresses
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="account-btn">
                    Cart
                  </Link>
                </li>
              </ul>
            </div>
          </aside>

          <section className="payment-panel">
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && <p className="info-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}
              <div className="payment-methods">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading payment methods…</p>
                ) : (
                  methods.map((method) => {
                    const state = formState[method.name] ?? { enabled: false, account: '' }
                    return (
                      <label key={method.name} className="payment-row">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={state.enabled}
                            onChange={() => handleToggleMethod(method.name)}
                            className="accent-emerald-500"
                          />
                          <span className="text-base font-semibold text-slate-900">{method.name}</span>
                        </div>
                        {method.name !== CASH_ONLY_METHOD && (
                          <input
                            type="text"
                            placeholder="Account number"
                            value={state.account}
                            onChange={(event) => handleAccountChange(method.name, event.target.value)}
                            disabled={!state.enabled}
                          />
                        )}
                        {method.name === CASH_ONLY_METHOD && (
                          <p className="text-xs text-slate-500">No account needed for cash payments.</p>
                        )}
                      </label>
                    )
                  })
                )}
              </div>
              <button type="submit" className="button1" disabled={saving || loading || activeMethods.length === 0}>
                {saving ? 'Saving…' : 'Save payment options'}
              </button>
            </form>
          </section>
        </div>
      </section>
    </>
  )
}

export default BuyerPaymentOptions
