import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { fetchCartItems, fetchDefaultAddress, fetchPaymentOptions } from '../api/agrimartApi'

const CheckoutItem = ({ item }) => (
  <article className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row">
    <div className="h-20 w-full overflow-hidden rounded-2xl bg-slate-100 sm:w-28">
      <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
    </div>
    <div className="flex flex-1 flex-col gap-1 text-sm">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
        <span>{item.unit}</span>
        <span>Qty {item.quantity}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{item.productName}</h3>
      <p className="text-slate-500">Variation {item.variationId}</p>
      <p className="text-base font-bold text-emerald-600">₱{(item.price * item.quantity).toFixed(2)}</p>
    </div>
  </article>
)

const CheckoutPage = () => {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [address, setAddress] = useState(null)
  const [paymentOptions, setPaymentOptions] = useState([])
  const [selectedPayment, setSelectedPayment] = useState('Cash on Delivery')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchCartItems()
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          setItems(response.body.items ?? [])
        } else {
          setError(response.body?.message || 'Unable to load cart items for checkout.')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Network error while fetching cart data.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDefaultAddress()
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          setAddress(response.body.address)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchPaymentOptions()
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          const options = response.body.options ?? {}
          const optionList = Object.entries(options).map(([method, account]) => ({ method, account }))
          setPaymentOptions(optionList)
          if (optionList[0]) {
            setSelectedPayment(`${optionList[0].method} • ${optionList[0].account}`)
          }
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])
  const deliveryFee = items.length > 0 ? 120 : 0
  const total = subtotal + deliveryFee
  const orderId = useMemo(() => `ORD-${Date.now().toString().slice(-6)}`, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (items.length === 0) {
      setError('Add items to your cart before placing the order.')
      return
    }
    setStatus('submitted')
  }

  const userLabel = user?.username || 'AngkatAni shopper'

  return (
    <>
      <Navigation />
      <div className="page-shell space-y-6">
        <section className="mx-auto max-w-5xl rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider text-emerald-600">Checkout</p>
              <h1 className="text-3xl font-bold text-slate-900">{userLabel}, review your order</h1>
            </div>
            <Link to="/cart" className="shop-btn text-sm px-4 py-2">
              Back to cart
            </Link>
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          {status === 'submitted' && (
            <p className="mt-3 text-sm font-semibold text-emerald-600">Order {orderId} is ready to be processed by the backend.</p>
          )}
        </section>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                Your cart is empty. Add items before checking out.
              </div>
            ) : (
              items.map((item) => <CheckoutItem key={`${item.cartId}`} item={item} />)
            )}
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Delivery address</h2>
              <p className="text-sm text-slate-500">
                {address
                  ? `${address.Full_Name ?? 'Your default address'}, ${address.Municipality}, ${address.Province}`
                  : 'No default address found. Add one in the profile section.'}
              </p>
              <Link to="/buyer_address" className="text-sm font-semibold text-emerald-600">
                Update address
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Payment method</h3>
                <div className="space-y-2">
                  {paymentOptions.length === 0 && (
                    <p className="text-sm text-slate-500">Cash on Delivery (fallback)</p>
                  )}
                  {paymentOptions.map((option) => {
                    const label = `${option.method} • ${option.account}`
                    return (
                      <label key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-300">
                        <input
                          type="radio"
                          name="payment"
                          value={label}
                          checked={selectedPayment === label}
                          onChange={(event) => setSelectedPayment(event.target.value)}
                          className="accent-emerald-500"
                        />
                        {label}
                      </label>
                    )
                  })}
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-300">
                    <input
                      type="radio"
                      name="payment"
                      value="Cash on Delivery"
                      checked={selectedPayment === 'Cash on Delivery'}
                      onChange={(event) => setSelectedPayment(event.target.value)}
                      className="accent-emerald-500"
                    />
                    Cash on Delivery
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notes for the farmer</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add any special instructions (pick up times, packaging, etc.)"
                  className="h-24 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1 text-sm text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery fee</span>
                  <span>₱{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="shop-btn w-full"
                disabled={items.length === 0 || status === 'submitted'}
              >
                {status === 'submitted' ? 'Order ready' : 'Place order securely'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  )
}

export default CheckoutPage
