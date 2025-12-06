export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function handleResponse(response) {
  if (!response.ok) {
    return response.json().catch(() => ({ message: 'Server error' })).then((body) => ({ ok: false, status: response.status, body }))
  }
  return response.json().then((body) => ({ ok: true, body }))
}

export async function loginUser({ username, password }) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return handleResponse(response)
}

export async function logoutUser() {
  const response = await fetch(`${API_URL}/api/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchSession() {
  const response = await fetch(`${API_URL}/api/status`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchCartItems() {
  const response = await fetch(`${API_URL}/api/cart`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchProducts({ category = 'all', rangeKm = 30 }) {
  const query = new URLSearchParams()
  if (category) {
    query.set('category', category)
  }
  query.set('range_km', String(rangeKm))
  const response = await fetch(`${API_URL}/api/products?${query.toString()}`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchCategories() {
  const response = await fetch(`${API_URL}/api/categories`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchProductDetail(productId) {
  const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(productId)}`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchDefaultAddress() {
  const response = await fetch(`${API_URL}/api/default-address`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchBuyerAddresses() {
  const response = await fetch(`${API_URL}/api/buyer_addresses`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function createBuyerAddress(payload) {
  const response = await fetch(`${API_URL}/api/buyer_addresses`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function updateBuyerAddress(addressId, payload) {
  const response = await fetch(`${API_URL}/api/buyer_addresses/${encodeURIComponent(addressId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function deleteBuyerAddress(addressId) {
  const response = await fetch(`${API_URL}/api/buyer_addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function setDefaultBuyerAddress(addressId) {
  const response = await fetch(`${API_URL}/api/buyer_addresses/${encodeURIComponent(addressId)}/default`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchPaymentOptions() {
  const response = await fetch(`${API_URL}/api/payment-options`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function savePaymentOptions(optionsPayload) {
  const response = await fetch(`${API_URL}/api/payment-options`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ options: optionsPayload }),
  })
  return handleResponse(response)
}

export async function registerBuyer(payload) {
  const response = await fetch(`${API_URL}/api/register/buyer`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function registerSeller(payload) {
  const response = await fetch(`${API_URL}/api/register/seller`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function fetchSellerProducts() {
  const response = await fetch(`${API_URL}/api/seller/products`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function checkSellerPaymentOptions() {
  const response = await fetch(`${API_URL}/check_payment_options`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchSellerPaymentOptions() {
  const response = await fetch(`${API_URL}/api/seller/payment-options`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function saveSellerPaymentOptions(selectedOptions) {
  const response = await fetch(`${API_URL}/api/seller/payment-options`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedOptions }),
  })
  return handleResponse(response)
}

export async function deleteSellerProduct(productId) {
  const response = await fetch(`${API_URL}/api/seller/products/${productId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function updateSellerProduct(productId, payload) {
  const response = await fetch(`${API_URL}/api/seller/products/${productId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      weight: Number(payload.weight),
      packagingLength: Number(payload.packagingLength),
      packagingWidth: Number(payload.packagingWidth),
      packagingHeight: Number(payload.packagingHeight),
    }),
  })
  return handleResponse(response)
}

export async function addSellerProductVariation(productId, variationPayload) {
  const response = await fetch(`${API_URL}/api/seller/products/${productId}/variations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      unit: variationPayload.unit,
      price: Number(variationPayload.price),
      quantity: Number(variationPayload.quantity),
    }),
  })
  return handleResponse(response)
}

export async function updateSellerProductVariation(productId, variationId, variationPayload) {
  const response = await fetch(
    `${API_URL}/api/seller/products/${productId}/variations/${variationId}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit: variationPayload.unit,
        price: Number(variationPayload.price),
        quantity: Number(variationPayload.quantity),
      }),
    },
  )
  return handleResponse(response)
}

export async function deleteSellerProductVariation(productId, variationId) {
  const response = await fetch(
    `${API_URL}/api/seller/products/${productId}/variations/${variationId}`,
    {
      method: 'DELETE',
      credentials: 'include',
    },
  )
  return handleResponse(response)
}

export async function assignProductAddress(productId, addressId) {
  const response = await fetch(`${API_URL}/api/seller/products/${productId}/address/${addressId}`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function createSellerProduct(formData) {
  const response = await fetch(`${API_URL}/api/seller/products`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  return handleResponse(response)
}

export async function addProductVariationToCart({ productId, variationId, quantity }) {
  const response = await fetch(`${API_URL}/add-to-cart-quan`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productID: productId, variationID: variationId, newQuantity: quantity }),
  })
  return handleResponse(response)
}

export async function fetchSellerAddresses() {
  const response = await fetch(`${API_URL}/api/seller_addresses`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function saveSellerAddress(addressPayload) {
  const response = await fetch(`${API_URL}/api/seller_addresses`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addressPayload),
  })
  return handleResponse(response)
}

export async function deleteSellerAddress(addressId) {
  const response = await fetch(`${API_URL}/api/seller_addresses/${addressId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function setDefaultSellerAddress(addressId) {
  const response = await fetch(`${API_URL}/api/seller_addresses/${addressId}/default`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchSellerAccount() {
  const response = await fetch(`${API_URL}/api/seller_account`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function updateSellerAccount(payload) {
  const response = await fetch(`${API_URL}/api/seller_account`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(response)
}

export async function fetchSellerOrders({ status = 'unpaid', sort = 'recent' } = {}) {
  const query = new URLSearchParams()
  query.set('status', status)
  query.set('sort', sort)
  const response = await fetch(`${API_URL}/api/seller_orders?${query.toString()}`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function shipSellerOrder(orderId) {
  const response = await fetch(`${API_URL}/api/seller_orders/${orderId}/ship`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function cancelSellerOrder(orderId) {
  const response = await fetch(`${API_URL}/api/seller_orders/${orderId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function fetchBuyerOrders({ status = 'to_pay', sort = 'recent' } = {}) {
  const query = new URLSearchParams()
  query.set('status', status)
  query.set('sort', sort)
  const response = await fetch(`${API_URL}/api/buyer_orders?${query.toString()}`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function payBuyerOrder(orderId) {
  const response = await fetch(`${API_URL}/api/buyer_orders/${orderId}/pay`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function cancelBuyerOrder(orderId) {
  const response = await fetch(`${API_URL}/api/buyer_orders/${orderId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function markBuyerOrderReceived(orderId) {
  const response = await fetch(`${API_URL}/api/buyer_orders/${orderId}/received`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}
