import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Jobs from "./pages/admin/Jobs";
import JobNew from "./pages/admin/JobNew";
import JobDetail from "./pages/admin/JobDetail";
import Customers from "./pages/admin/Customers";
import Services from "./pages/admin/Services";
import Settings from "./pages/admin/Settings";
import EmailPreview from "./pages/admin/EmailPreview";
import Requests from "./pages/admin/Requests";
import Quotes from "./pages/admin/Quotes";
import Products from "./pages/admin/Products";
import ProductEdit from "./pages/admin/ProductEdit";
import Accessories from "./pages/admin/Accessories";
import AccessoryEdit from "./pages/admin/AccessoryEdit";
import PromoCodes from "./pages/admin/PromoCodes";
import PromoCodeEdit from "./pages/admin/PromoCodeEdit";
import ShopOrders from "./pages/admin/ShopOrders";
import AbandonedCarts from "./pages/admin/AbandonedCarts";
import AdminReviews from "./pages/admin/Reviews";
import AdminStatus from "./pages/admin/Status";
import QuoteView from "./pages/QuoteView";
import ProductDetail from "./pages/ProductDetail";
import ShopOrderSuccess from "./pages/ShopOrderSuccess";
import ShopPage from "./pages/Shop";
import RecoverCart from "./pages/RecoverCart";
import Unsubscribe from "./pages/Unsubscribe";
import Track from "./pages/Track";
import RequestPhotos from "./pages/RequestPhotos";
import SetPassword from "./pages/auth/SetPassword";
import AccountDashboard from "./pages/account/Dashboard";
import OrderDetail from "./pages/account/OrderDetail";
import ShopOrderDetail from "./pages/account/ShopOrderDetail";
import AccountLayout from "@/components/account/AccountLayout";
import CustomerRoute from "@/components/account/CustomerRoute";
import { CartProvider } from "@/lib/cart";
import CartDrawer from "@/components/shop/CartDrawer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <CartDrawer />
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/set-password" element={<SetPassword />} />
            <Route path="/quote/:token" element={<QuoteView />} />
            <Route path="/request/:token/photos" element={<RequestPhotos />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/track" element={<Track />} />
            <Route path="/shop/order/success" element={<ShopOrderSuccess />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:id" element={<ProductDetail />} />
            <Route path="/recover-cart" element={<RecoverCart />} />
            <Route path="/account" element={<CustomerRoute><AccountLayout /></CustomerRoute>}>
              <Route index element={<AccountDashboard />} />
              <Route path="orders/:jobId" element={<OrderDetail />} />
              <Route path="shop-orders/:id" element={<ShopOrderDetail />} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="requests" element={<Requests />} />
              <Route path="quotes" element={<Quotes />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="jobs/new" element={<JobNew />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="customers" element={<Customers />} />
              <Route path="services" element={<Services />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductEdit />} />
              <Route path="products/:id" element={<ProductEdit />} />
              <Route path="accessories" element={<Accessories />} />
              <Route path="accessories/new" element={<AccessoryEdit />} />
              <Route path="accessories/:id" element={<AccessoryEdit />} />
              <Route path="promo-codes" element={<PromoCodes />} />
              <Route path="promo-codes/new" element={<PromoCodeEdit />} />
              <Route path="promo-codes/:id" element={<PromoCodeEdit />} />
              <Route path="shop-orders" element={<ShopOrders />} />
              <Route path="abandoned-carts" element={<AbandonedCarts />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="settings" element={<Settings />} />
              <Route path="email-preview" element={<EmailPreview />} />
              <Route path="status" element={<AdminStatus />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
