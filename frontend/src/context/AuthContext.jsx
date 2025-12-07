import { createContext, useContext, useEffect, useState } from 'react'
import { fetchSession, loginUser, logoutUser } from '../api/agrimartApi'

const AuthContext = createContext({ user: null, login: async () => {}, logout: async () => {} })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const response = await fetchSession()
        if (!cancelled && response.ok && response.body.user) {
          setUser(response.body.user)
        }
      } catch (error) {
        // Log failures so we can debug API availability without crashing the UI
        console.error('Unable to fetch session', error)
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async ({ username, password }) => {
    const response = await loginUser({ username, password })
    if (response.ok) {
      setUser(response.body.user)
    }
    return response
  }

  async function logout() {
    const response = await logoutUser()
    if (response.ok) {
      setUser(null)
    }
    return response
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  return useContext(AuthContext)
}
