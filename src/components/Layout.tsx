import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShoppingCart, Settings, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { collection, query, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';

export default function Layout() {
  const { cart } = useCart();
  const [isAdmin, setIsAdmin] = useState(false);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Check if user is admin
        let isAdminUser = false;
        if (user.isAnonymous) {
          const guestPhone = localStorage.getItem('guestPhone');
          if (guestPhone === '0553538409') {
            isAdminUser = true;
          }
        } else if (user.phoneNumber === '+966553538409' || user.phoneNumber === '0553538409') {
          isAdminUser = true;
        }

        if (isAdminUser) {
          setIsAdmin(true);
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            setIsAdmin(adminDoc.exists());
          } catch (e) {
            console.error(e);
            setIsAdmin(false);
          }
        }

        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const order = change.doc.data();
              if (order.status === 'approved') {
                toast.success('تم تأكيد حجزك بنجاح!');
                if (Notification.permission === 'granted') {
                  new Notification('راحة', { body: 'تم تأكيد حجزك بنجاح!' });
                }
              } else if (order.status === 'rejected') {
                toast.error('نعتذر، تم رفض طلبك.');
                if (Notification.permission === 'granted') {
                  new Notification('راحة', { body: 'نعتذر، تم رفض طلبك.' });
                }
              }
            }
          });
        });
        return () => unsubscribeOrders();
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900 font-sans" dir="rtl">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            راحة
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/my-orders" className="text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1" title="طلباتي">
              <Package className="w-6 h-6" />
              <span className="hidden sm:inline font-medium text-sm">طلباتي</span>
            </Link>
            {isAdmin && (
              <Link to="/admin-login" className="text-gray-500 hover:text-gray-700" title="إعدادات المالك">
                <Settings className="w-6 h-6" />
              </Link>
            )}
            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1 -translate-y-1">
                  {cartItemsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
