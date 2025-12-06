import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { fetchCartItems } from '../api/agrimartApi'

const CartItemCard = ({ item }) => (
  <article className="flex w-full flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row">
    <div className="h-32 w-full overflow-hidden rounded-2xl bg-slate-100 sm:w-40">
      <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
    </div>
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-400">qty: {item.quantity} {item.unit}</p>
        <span className="text-xs text-slate-500">ID {item.cartId}</span>
      </div>
      <h3 className="text-xl font-semibold text-slate-900">{item.productName}</h3>
      <p className="text-sm text-slate-500">Variation {item.variationId}</p>
      <p className="text-lg font-bold text-emerald-600">₱{(item.price * item.quantity).toFixed(2)}</p>
      <div className="flex gap-3 text-sm text-slate-500">
        <button type="button" className="rounded-full border border-emerald-200 px-4 py-1 font-semibold text-emerald-600">
          Save for later
        </button>
        <button type="button" className="rounded-full border border-slate-200 px-4 py-1 font-semibold text-slate-500">
          Remove
        </button>
      </div>
    </div>
  </article>
)

const CartPage = () => {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetchCartItems()
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          setItems(response.body.items ?? [])
          setStatus('loaded')
          setError('')
        } else {
          setError(response.body?.message || 'Could not load your cart. Please refresh.')
          setStatus('error')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Network error while fetching cart.')
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])
  const deliveryFee = items.length > 0 ? 120 : 0
  const total = subtotal + deliveryFee

  const userName = user?.username || (user?.userType === 'seller' ? 'Seller' : 'Neighbor')

  return (
    <>
      <Navigation />
      <div className="page-shell space-y-6">
        <section className="mx-auto max-w-5xl space-y-3 rounded-3xl bg-white p-6 shadow-lg text-left">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <p className="text-sm uppercase tracking-wider text-emerald-600">Cart</p>
              <h1 className="text-3xl font-bold text-slate-900">Good morning, {userName}</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/homepage_buyer" className="shop-btn text-sm px-5 py-2">
                Back to shop
              </Link>
              <Link to="/checkout" className="shop-btn text-sm px-5 py-2">
                Proceed to checkout
              </Link>
            </div>
          </div>
          <p className="text-sm text-slate-500">Manage items, adjust quantities, and finalize your fresh order.</p>
          {status === 'loading' && <p className="text-sm text-slate-500">Loading cart items…</p>}
          {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
        </section>

        {items.length === 0 && status === 'loaded' ? (
          <section className="mx-auto max-w-5xl rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
            <p>Your cart is empty. Add fresh items from the homepage.</p>
          </section>
        ) : null}

        {items.length > 0 && (
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-4">
              {items.map((item) => (
                <CartItemCard key={item.cartId} item={item} />
              ))}
            </section>
            <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Delivery fee</span>
                <span>{deliveryFee === 0 ? 'Free' : `₱${deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
              <Link to="/checkout" className="shop-btn w-full text-center">
                Checkout Securely
              </Link>
              <p className="text-xs text-slate-400">Orders are packed daily. Express delivery is available for nearby buyers.</p>
            </section>
          </div>
        )}
      </div>
    </>
  )
}

export default CartPage
