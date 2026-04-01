/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Clean from './pages/Clean';
import Delivery from './pages/Delivery';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import MyOrders from './pages/MyOrders';
import Login from './components/Login';
import NotificationPrompt from './components/NotificationPrompt';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-gray-500 font-sans" dir="rtl">جاري التحميل...</div>;
  }

  if (!user) {
    return (
      <NotificationPrompt>
        <Login />
      </NotificationPrompt>
    );
  }

  return (
    <NotificationPrompt>
      <CartProvider>
        <Router>
          <Toaster position="top-center" dir="rtl" />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="clean" element={<Clean />} />
              <Route path="delivery" element={<Delivery />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="my-orders" element={<MyOrders />} />
              <Route path="admin-login" element={<AdminLogin />} />
              <Route path="admin-dashboard" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </Router>
      </CartProvider>
    </NotificationPrompt>
  );
}
