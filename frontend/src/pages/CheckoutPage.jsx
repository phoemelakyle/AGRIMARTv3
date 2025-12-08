import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../context/AuthContext'
import { fetchCartItems, fetchDefaultAddress, fetchPaymentOptions, processCheckout } from '../api/agrimartApi'

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
      <p className="text-base font-bold text-emerald-600">₱{(item.price * item.quantity).toFixed(2)}</p>
    </div>
  </article>
)

const CheckoutPage = () => {
  const { user } = useAuth()
  const location = useLocation()
  const { selectedItems } = location.state || { selectedItems: [] }

  const [items, setItems] = useState([])
  const [address, setAddress] = useState(null)
  const [paymentOptions, setPaymentOptions] = useState([])
  const [selectedPayment, setSelectedPayment] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  // Load selected items
  useEffect(() => {
    if (!selectedItems || selectedItems.length === 0) return

    fetchCartItems()
      .then((response) => {
        if (response.ok) {
          const filtered = (response.body.items ?? [])
            .filter(item =>
              selectedItems.includes(`${item.productId}_${item.variationId || ''}`)
            )
            .map(item => ({
              cartId: item.cartId,
              productId: item.productId,
              variationId: item.variationId || '',
              sellerId: item.sellerId,
              productName: item.productName,
              image: item.image,
              quantity: Number(item.quantity ?? 1),
              unit: item.unit ?? '',
              price: Number(item.price ?? 0),
            }))
          setItems(filtered)
        } else {
          setError('Unable to load selected cart items.')
        }
      })
      .catch(() => setError('Network error while loading items.'))
  }, [selectedItems])

  // Load default address
  useEffect(() => {
    fetchDefaultAddress()
      .then((response) => {
        if (response.ok) setAddress(response.body.address)
      })
      .catch(() => {})
  }, [])

  // Load payment options
  useEffect(() => {
    fetchPaymentOptions()
      .then((response) => {
        if (response.ok) {
          const options = response.body.options ?? {}
          const list = Object.entries(options).map(([method, account]) => ({
            method,
            account
          }))
          setPaymentOptions(list)
          if (list.length > 0) setSelectedPayment(`${list[0].method} • ${list[0].account}`)
        }
      })
      .catch(() => {})
  }, [])

  // Totals
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])
  const deliveryFee = items.length > 0 ? 120 : 0
  const total = subtotal + deliveryFee
  const orderId = useMemo(() => `ORD-${Date.now().toString().slice(-6)}`, [])

  const handleSubmit = async (e) => {
  e.preventDefault()
  if (!selectedPayment) return setError("Please select a payment method.")
  if (items.length === 0) return setError("No items selected.")

  // Create payload compatible with Flask backend
  const selectedItemsPayload = items.map(item => {
    const arr = [
      item.productId,      // 0: productId
      item.variationId,    // 1: variationId
      item.productName,    // 2: productName
      item.unit,           // 3: unit
      item.price,          // 4: price
      item.quantity,       // 5: quantity
      item.price * item.quantity, // 6: total
      item.image,          // 7: image
      item.sellerId        // 8: sellerId
    ]
    console.log("Selected item prepared for backend:", arr)
    return JSON.stringify(arr)
  })

  const productTotalsPayload = items.map(item => {
    const total = item.price * item.quantity
    console.log("Product total for backend:", total)
    return total
  })

  // Map variation_id to selected payment
  const paymentOptionsPayload = {}
  items.forEach(item => {
    paymentOptionsPayload[item.variationId] = selectedPayment
  })
  console.log("Payment options payload:", paymentOptionsPayload)

  // Prepare FormData for Flask
  const formData = new FormData()
  selectedItemsPayload.forEach(si => formData.append('selected_items', si))
  productTotalsPayload.forEach(pt => formData.append('product_total[]', pt))
  formData.append('payment_option_id', JSON.stringify(paymentOptionsPayload))

  console.log("Final FormData being sent to backend:")
  for (let pair of formData.entries()) {
    console.log(pair[0], pair[1])
  }

  setStatus('submitting')
  const res = await processCheckout(formData)
  console.log("Response from backend:", res)
  
  if (res.ok) {
    setStatus('submitted')
    window.location.href = '/homepage_buyer'
  } else {
    setError(res.body?.message || 'Checkout failed')
    setStatus('idle')
  }
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
            <Link to="/cart" className="shop-btn text-sm px-4 py-2">Back to cart</Link>
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          {status === 'submitted' && <p className="mt-3 text-sm font-semibold text-emerald-600">Order {orderId} is ready to be processed.</p>}
        </section>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* LEFT SIDE */}
          <section className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                No selected items. Go back to cart.
              </div>
            ) : (
              items.map(item => <CheckoutItem key={`${item.productId}_${item.variationId}`} item={item} />)
            )}
          </section>

          {/* RIGHT SUMMARY */}
          <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
            {/* Address */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Delivery address</h2>
              <p className="text-sm text-slate-500">
                {address ? `${address.Full_Name}, ${address.Municipality}, ${address.Province}` : 'No default address found.'}
              </p>
              <Link to="/buyer_address" className="text-sm font-semibold text-emerald-600">Update address</Link>
            </div>

            {/* PAYMENT METHODS */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Payment method</h3>
                <div className="space-y-2">
                  {paymentOptions.map(option => {
                    const label = `${option.method} • ${option.account}`
                    return (
                      <label key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-300">
                        <input
                          type="radio"
                          name="payment"
                          value={label}
                          checked={selectedPayment === label}
                          onChange={(e) => setSelectedPayment(e.target.value)}
                          className="accent-emerald-500"
                        />
                        {label}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notes for the farmer</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions..."
                  className="h-24 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500"
                />
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm text-slate-500">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Delivery fee</span><span>₱{deliveryFee.toFixed(2)}</span></div>
                <div className="flex items-center justify-between text-base font-semibold text-slate-900"><span>Total</span><span>₱{total.toFixed(2)}</span></div>
              </div>

              <button type="submit" className="shop-btn w-full">Place order securely</button>
            </form>
          </section>
        </div>
      </div>
    </>
  )
}

export default CheckoutPage
