import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SelectRolePage from './pages/SelectRolePage'
import BuyerHomepage from './pages/BuyerHomepage'
import SellerHomepage from './pages/SellerHomepage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import BuyerRegistration from './pages/BuyerRegistration'
import SellerRegistration from './pages/SellerRegistration'
import './App.css'
import SellerOrders from './pages/SellerOrders'
import ViewProductPage from './pages/ViewProductPage'
import SellerAddress from './pages/SellerAddress'
import SellerAccountPage from './pages/SellerAccountPage'
import SellerPaymentOptions from './pages/SellerPaymentOptions'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import EditProduct from './pages/EditProduct'
import BuyerPaymentOptions from './pages/BuyerPaymentOptions'
import BuyerAddress from './pages/BuyerAddress'
import BuyerOrders from './pages/BuyerOrders'
import SellerAddProduct from './pages/SellerAddProduct'
import Footer from './components/Footer'
import { footerColumns } from './data/siteData'

const SiteLayout = () => (
  <>
    <Outlet />
    <Footer footerColumns={footerColumns} />
  </>
)

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/select_role" element={<SelectRolePage />} />
            <Route path="/buyer_registration" element={<BuyerRegistration />} />
            <Route path="/seller_registration" element={<SellerRegistration />} />
            <Route path="/homepage_buyer" element={<BuyerHomepage />} />
            <Route path="/homepage_seller" element={<SellerHomepage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/viewproduct/:productId" element={<ViewProductPage />} />
            <Route path="/seller_account" element={<SellerAccountPage />} />
            <Route path="/seller_address" element={<SellerAddress />} />
            <Route path="/seller_payment_options" element={<SellerPaymentOptions />} />
            <Route path="/seller_orders" element={<SellerOrders />} />
            <Route path="/add_product" element={<SellerAddProduct />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/edit_product/:productId" element={<EditProduct />} />
            <Route path="/buyer_payment_options" element={<BuyerPaymentOptions />} />
            <Route path="/buyer_orders" element={<BuyerOrders />} />
            <Route path="/buyer_address" element={<BuyerAddress />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
