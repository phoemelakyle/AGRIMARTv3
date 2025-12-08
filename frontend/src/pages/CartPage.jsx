import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { removeCartItem, fetchCartItems, updateCartQuantity } from '../api/agrimartApi'

const CartItemCard = ({ item, onRemove, onToggleSelect, isSelected, onQuantityChange }) => (
  <article className="flex w-full flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row">
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(`${item.ProductID}_${item.VariationID}`)}
        className="h-5 w-5"
      />
      <div className="h-32 w-32 overflow-hidden rounded-2xl bg-slate-100 sm:w-40">
        <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
      </div>
    </div>

    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">

          <button
            className="px-3 py-1 border rounded-lg"
            onClick={() => onQuantityChange(item, -1)}
          >
            -
          </button>

          <span className="font-semibold">{item.quantity}</span>

          <button
            className="px-3 py-1 border rounded-lg"
            onClick={() => onQuantityChange(item, +1)}
          >
            +
          </button>

          <span className="text-xs uppercase tracking-wider text-slate-400">
            {item.unit}
          </span>

        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-900">{item.productName}</h3>
      <p className="text-lg font-bold text-emerald-600">
        ₱{(item.price * item.quantity).toFixed(2)}
      </p>

      <div className="flex gap-3 text-sm text-slate-500">
        <button
          type="button"
          onClick={() => onRemove(`${item.ProductID}_${item.VariationID}`)}
          className="rounded-full border border-slate-200 px-4 py-1 font-semibold text-slate-500"
        >
          Remove
        </button>
      </div>
    </div>
  </article>
)


const CartPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [selectedItems, setSelectedItems] = useState({})

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    fetchCartItems()
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          const mappedItems = (response.body.items ?? []).map(item => ({
            cartId: item.cartId,
            ProductID: item.productId,
            VariationID: item.variationId || '',
            productName: item.productName,
            image: item.image,
            quantity: Number(item.quantity ?? 1),
            unit: item.unit ?? '',
            price: Number(item.price ?? 0)
          }))
          setItems(mappedItems)
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

    return () => { cancelled = true }
  }, [])

  const handleRemove = async (cartId) => {
    try {
      const result = await removeCartItem(cartId)
      if (result.ok && result.body.success) {
        setItems(prev => prev.filter(item => `${item.ProductID}_${item.VariationID}` !== cartId))
        setSelectedItems(prev => {
          const copy = { ...prev }
          delete copy[cartId]
          return copy
        })
      } else {
        alert(result.body?.message || 'Failed to remove item')
      }
    } catch (err) {
      console.error(err)
      alert('Network error. Could not remove item.')
    }
  }

  const handleToggleSelect = (cartId) => {
    setSelectedItems(prev => ({
      ...prev,
      [cartId]: !prev[cartId]
    }))
  }

const handleQuantityChange = async (item, change) => {
  const newQty = item.quantity + change;
  if (newQty < 1) return;

  const itemId = `${item.ProductID}_${item.VariationID}`;

  const { ok } = await updateCartQuantity(itemId, newQty);

  if (ok) {
    setItems(prev =>
      prev.map(x =>
        x.ProductID === item.ProductID && x.VariationID === item.VariationID
          ? { ...x, quantity: newQty }
          : x
      )
    );
  } else {
    alert("Failed to update quantity");
  }
};

  // Only selected items are used to calculate subtotal and total
  const selectedItemsArray = items.filter(item => selectedItems[`${item.ProductID}_${item.VariationID}`])

  const subtotal = useMemo(() => selectedItemsArray.reduce((sum, item) => sum + item.price * item.quantity, 0), [selectedItemsArray])
  const deliveryFee = selectedItemsArray.length > 0 ? 120 : 0
  const total = subtotal + deliveryFee

  const userName = user?.username || (user?.userType === 'seller' ? 'Seller' : 'Neighbor')

  const handleCheckout = () => {
    if (selectedItemsArray.length === 0) {
      alert("Please select at least one item to checkout.")
      return
    }
    const selectedIds = selectedItemsArray.map(item => `${item.ProductID}_${item.VariationID}`)
    navigate('/checkout', { state: { selectedItems: selectedIds } })
  }

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
              <button onClick={() => navigate('/homepage_buyer')} className="shop-btn text-sm px-5 py-2">
                Back to shop
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500">Manage items, adjust quantities, and finalize your fresh order.</p>
          {status === 'loading' && <p className="text-sm text-slate-500">Loading cart items…</p>}
          {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
        </section>

        {items.length === 0 && status === 'loaded' && (
          <section className="mx-auto max-w-5xl rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
            <p>Your cart is empty. Add fresh items from the homepage.</p>
          </section>
        )}

        {items.length > 0 && (
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Cart Items */}
            <section className="space-y-4">
              {items.map(item => (
                <CartItemCard
                  key={`${item.ProductID}_${item.VariationID}`}
                  item={item}
                  onRemove={handleRemove}
                  onToggleSelect={handleToggleSelect}
                  isSelected={!!selectedItems[`${item.ProductID}_${item.VariationID}`]}
                  onQuantityChange={handleQuantityChange}
                />
              ))}
            </section>

            {/* Order Summary */}
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
              <button onClick={handleCheckout} className="shop-btn w-full text-center">
                Checkout Securely
              </button>
              <p className="text-xs text-slate-400">Orders are packed daily. Express delivery is available for nearby buyers.</p>
            </section>
          </div>
        )}
      </div>
    </>
  )
}

export default CartPage
