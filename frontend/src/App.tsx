import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AdminSidebar from "./components/layout/AdminSidebar";
import CartDrawer from "./components/cart/CartDrawer";
import ProtectedRoute from "./components/ui/ProtectedRoute";

import Home from "./pages/Home";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import BoutiqueRegister from "./pages/BoutiqueRegister";
import BoutiqueDashboard from "./pages/BoutiqueDashboard";
import BoutiqueProducts from "./pages/BoutiqueProducts";
import BoutiqueProductForm from "./pages/BoutiqueProductForm";
import BoutiqueOrders from "./pages/BoutiqueOrders";
import BoutiqueSettings from "./pages/BoutiqueSettings";
import BoutiquePayouts from "./pages/BoutiquePayouts";
import BoutiqueOnboardingReturn from "./pages/BoutiqueOnboardingReturn";
import BoutiqueOnboardingRefresh from "./pages/BoutiqueOnboardingRefresh";
import Boutiques from "./pages/Boutiques";
import BoutiqueStorefront from "./pages/BoutiqueStorefront";
import BoutiqueSidebar from "./components/layout/BoutiqueSidebar";

import Dashboard from "./pages/admin/Dashboard";
import ProductManager from "./pages/admin/ProductManager";
import ProductForm from "./pages/admin/ProductForm";
import InventoryManager from "./pages/admin/InventoryManager";
import OrderManager from "./pages/admin/OrderManager";
import UserManager from "./pages/admin/UserManager";
import CategoryManager from "./pages/admin/CategoryManager";
import BrandManager from "./pages/admin/BrandManager";
import CollectionManager from "./pages/admin/CollectionManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <CartDrawer />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function BoutiqueLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <BoutiqueSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#111",
                  color: "#fff",
                  fontSize: "14px",
                },
              }}
            />
            <Routes>
              {/* Public routes */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/boutiques" element={<Boutiques />} />
                <Route path="/boutiques/:slug" element={<BoutiqueStorefront />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/boutique/register" element={<BoutiqueRegister />} />
                <Route
                  path="/boutique/onboarding/return"
                  element={
                    <ProtectedRoute>
                      <BoutiqueOnboardingReturn />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/boutique/onboarding/refresh"
                  element={
                    <ProtectedRoute>
                      <BoutiqueOnboardingRefresh />
                    </ProtectedRoute>
                  }
                />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />

                {/* Protected routes */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderDetail />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Admin routes */}
              <Route
                element={
                  <ProtectedRoute adminOnly>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/products" element={<ProductManager />} />
                <Route path="/admin/products/new" element={<ProductForm />} />
                <Route path="/admin/products/:id/edit" element={<ProductForm />} />
                <Route path="/admin/categories" element={<CategoryManager />} />
                <Route path="/admin/brands" element={<BrandManager />} />
                <Route path="/admin/collections" element={<CollectionManager />} />
                <Route path="/admin/inventory" element={<InventoryManager />} />
                <Route path="/admin/orders" element={<OrderManager />} />
                <Route path="/admin/users" element={<UserManager />} />
              </Route>

              {/* Boutique routes — sidebar layout, no role gate at the
                  router level because boutique APIs already 403. */}
              <Route
                element={
                  <ProtectedRoute>
                    <BoutiqueLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/boutique/dashboard" element={<BoutiqueDashboard />} />
                <Route path="/boutique/products" element={<BoutiqueProducts />} />
                <Route path="/boutique/products/new" element={<BoutiqueProductForm />} />
                <Route path="/boutique/products/:id/edit" element={<BoutiqueProductForm />} />
                <Route path="/boutique/orders" element={<BoutiqueOrders />} />
                <Route path="/boutique/settings" element={<BoutiqueSettings />} />
                <Route path="/boutique/payouts" element={<BoutiquePayouts />} />
              </Route>
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
