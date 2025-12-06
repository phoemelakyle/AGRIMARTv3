import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { registerBuyer } from '../api/agrimartApi'

const BuyerRegistration = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', username: '', password: '', confirmPassword: '' })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords must match.' })
      return
    }
    setSubmitting(true)
    setStatus({ type: '', message: '' })
    const payload = {
      name: form.name,
      email: form.email,
      phoneNumber: form.phone,
      username: form.username,
      password: form.password,
    }

    const response = await registerBuyer(payload)
    setSubmitting(false)
    if (response.ok) {
      navigate('/login')
    } else {
      setStatus({ type: 'error', message: response.body?.message || 'Unable to register right now.' })
    }
  }

  return (
    <>
      <Navigation />
      <main className="page-shell space-y-6">
        <section className="mx-auto max-w-3xl space-y-4 rounded-3xl bg-white p-8 shadow-lg">
          <p className="text-xs uppercase tracking-widest text-slate-500">Buyer registration</p>
          <h1 className="text-3xl font-semibold text-slate-900">Create your agrimart buyer account</h1>
          <p className="text-sm text-slate-500">Get instant access to fresh listings, manage your carts, and discover local sellers.</p>
          {status.message && (
            <div
              className={`rounded-2xl p-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {status.message}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1 text-sm text-slate-600">
              <span>Full name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                placeholder="Jane Farmer"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            <label className="block space-y-1 text-sm text-slate-600">
              <span>Email address</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                placeholder="jane@example.com"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            <label className="block space-y-1 text-sm text-slate-600">
              <span>Cellphone number</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="09XXXXXXXXX"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            <label className="block space-y-1 text-sm text-slate-600">
              <span>Username</span>
              <input
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                required
                placeholder="janebuyer"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm text-slate-600">
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-emerald-400 focus:outline-none"
                />
              </label>
              <label className="block space-y-1 text-sm text-slate-600">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-emerald-400 focus:outline-none"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="shop-btn w-full text-sm"
              style={{ cursor: submitting ? 'progress' : 'pointer' }}>
              {submitting ? 'Creating account…' : 'Create buyer account'}
            </button>
          </form>
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-600">
              Log in here →
            </Link>
          </p>
        </section>
      </main>
    </>
  )
}

export default BuyerRegistration
