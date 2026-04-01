import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Package, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function MyOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
          const ords: any[] = [];
          snapshot.forEach((doc) => {
            ords.push({ id: doc.id, ...doc.data() });
          });
          setOrders(ords);
          setLoading(false);
        });

        return () => unsubscribeOrders();
      } else {
        setOrders([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <Package className="w-8 h-8 text-blue-600" />
        طلباتي
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-600">لا توجد طلبات سابقة</h2>
          <p className="text-gray-500 mt-2">لم تقم بإجراء أي طلبات حتى الآن.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPp', { locale: ar }) : ''}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status === 'pending' && <Clock className="w-4 h-4" />}
                      {order.status === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                      {order.status === 'rejected' && <XCircle className="w-4 h-4" />}
                      {order.status === 'pending' ? 'قيد الانتظار' : order.status === 'approved' ? 'مقبول' : 'مرفوض'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                        <span className="font-medium text-gray-800">{item.name} <span className="text-gray-400 text-sm">(x{item.quantity})</span></span>
                        <span className="font-bold text-gray-700">{item.price * item.quantity} ﷼</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-64 bg-gray-50 p-5 rounded-xl flex flex-col justify-center space-y-3 border border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">طريقة الدفع:</span>
                    <span className="font-medium">
                      {order.paymentMethod === 'cash' ? 'كاش' : 
                       order.paymentMethod === 'transfer' ? 'تحويل بنكي' : 
                       order.paymentMethod?.includes('installment') ? 'تقسيط' : 'دفع إلكتروني'}
                    </span>
                  </div>
                  
                  {order.couponDiscount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الخصم:</span>
                      <span className="font-bold text-green-600">-{order.couponDiscount} ﷼</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-gray-600 font-medium">الإجمالي:</span>
                    <span className="font-bold text-xl text-blue-600">{order.totalAmount} ﷼</span>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
