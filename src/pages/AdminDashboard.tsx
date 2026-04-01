import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FileText, Image as ImageIcon, X, Plus, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  
  // Coupons state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'coupons'>('orders');

  useEffect(() => {
    const checkAdminAndLoadData = async (user: any) => {
      if (localStorage.getItem('admin_auth') !== 'true') {
        navigate('/admin-login');
        return null;
      }

      let isAdmin = false;

      if (user) {
        if (user.isAnonymous) {
          const guestPhone = localStorage.getItem('guestPhone');
          if (guestPhone === '0553538409') {
            isAdmin = true;
          }
        } else if (user.phoneNumber === '+966553538409' || user.phoneNumber === '0553538409') {
          isAdmin = true;
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            isAdmin = adminDoc.exists();
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (!isAdmin) {
        navigate('/');
        return null;
      }

      setIsCheckingAdmin(false);

      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const unsubscribeOrders = onSnapshot(q, (snapshot) => {
        const ords: any[] = [];
        snapshot.forEach((doc) => {
          ords.push({ id: doc.id, ...doc.data() });
        });
        setOrders(ords);

        // Check for new orders to notify
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const order = change.doc.data();
            // Only notify if the order was created in the last 10 seconds (to avoid spam on initial load)
            if (order.createdAt && Date.now() - order.createdAt.toMillis() < 10000) {
              toast.info(`طلب جديد من ${order.customerName}`);
              
              // Play sound
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
              } catch (e) {
                console.error('Audio play failed:', e);
              }

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('راحة', { body: `يوجد طلب جديد من ${order.customerName}` });
              }
            }
          }
        });
      }, (error) => {
        console.error("Error fetching orders:", error);
        toast.error('حدث خطأ في جلب الطلبات. تأكد من صلاحياتك.');
      });

      const qCoupons = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const unsubscribeCoupons = onSnapshot(qCoupons, (snapshot) => {
        const cps: any[] = [];
        snapshot.forEach((doc) => {
          cps.push({ id: doc.id, ...doc.data() });
        });
        setCoupons(cps);
      });

      return () => {
        unsubscribeOrders();
        unsubscribeCoupons();
      };
    };

    let cleanupFns: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (cleanupFns) {
        cleanupFns();
      }
      const cleanup = await checkAdminAndLoadData(user);
      if (cleanup) {
        cleanupFns = cleanup;
      }
    });

    return () => {
      unsubscribeAuth();
      if (cleanupFns) {
        cleanupFns();
      }
    };
  }, [navigate]);

  if (isCheckingAdmin) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-gray-500 font-sans" dir="rtl">جاري التحقق من الصلاحيات...</div>;
  }

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponDiscount) {
      toast.error('الرجاء إدخال كود الخصم وقيمة الخصم');
      return;
    }
    
    const discount = Number(newCouponDiscount);
    if (isNaN(discount) || discount <= 0) {
      toast.error('قيمة الخصم غير صحيحة');
      return;
    }

    try {
      await setDoc(doc(db, 'coupons', newCouponCode.trim().toUpperCase()), {
        code: newCouponCode.trim().toUpperCase(),
        discountAmount: discount,
        isActive: true,
        createdAt: new Date()
      });
      toast.success('تم إضافة الكوبون بنجاح');
      setNewCouponCode('');
      setNewCouponDiscount('');
    } catch (error) {
      console.error('Error adding coupon:', error);
      toast.error('حدث خطأ أثناء إضافة الكوبون');
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    try {
      await deleteDoc(doc(db, 'coupons', code));
      toast.success('تم حذف الكوبون');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('حدث خطأ أثناء حذف الكوبون');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      toast.success(status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب');
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error('حدث خطأ أثناء تحديث الطلب');
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    if (method === 'card') return 'بطاقة ائتمانية';
    if (method === 'apple_pay') return 'Apple Pay';
    if (method === 'transfer') return 'تحويل بنكي';
    if (method.startsWith('installment_')) {
      const subMethod = method.split('_')[1];
      let subLabel = '';
      if (subMethod === 'card') subLabel = 'بطاقة';
      if (subMethod === 'apple_pay') subLabel = 'Apple Pay';
      if (subMethod === 'transfer') subLabel = 'تحويل';
      if (subMethod === 'cash') subLabel = 'كاش';
      return `تقسيط (${subLabel})`;
    }
    return method;
  };

  const handleViewReceipt = (fileData: string) => {
    if (fileData.startsWith('data:image')) {
      setSelectedReceipt(fileData);
    } else {
      try {
        // For PDFs and other files, convert base64 to Blob to avoid Safari limits
        const arr = fileData.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        
        // Open in new tab
        window.open(blobUrl, '_blank');
      } catch (error) {
        console.error('Error opening file:', error);
        toast.error('حدث خطأ أثناء فتح الملف');
      }
    }
  };

  const handleDownloadReceipt = (fileData: string) => {
    try {
      const arr = fileData.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'receipt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('حدث خطأ أثناء تحميل الملف');
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">لوحة تحكم المالك</h1>
        <button 
          onClick={() => {
            localStorage.removeItem('admin_auth');
            navigate('/');
          }}
          className="text-red-600 hover:underline font-medium"
        >
          تسجيل الخروج
        </button>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-4 font-semibold transition-colors relative ${activeTab === 'orders' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          الطلبات الواردة
          {activeTab === 'orders' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-4 px-4 font-semibold transition-colors relative ${activeTab === 'coupons' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          إدارة الكوبونات
          {activeTab === 'coupons' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
            لا توجد طلبات حتى الآن
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{order.customerName}</h3>
                      <p className="text-gray-500 font-mono mt-1" dir="ltr">{order.customerPhone}</p>
                    </div>
                    <div className="text-left">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'pending' ? 'قيد الانتظار' : order.status === 'approved' ? 'مقبول' : 'مرفوض'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">الباقات المطلوبة:</h4>
                    <ul className="space-y-2">
                      {order.items.map((item: any, idx: number) => (
                        <li key={idx} className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
                          <span className="text-gray-800">{item.name} <span className="text-gray-400">(x{item.quantity})</span></span>
                          <span className="font-bold">{item.price * item.quantity} ﷼</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="w-full md:w-1/3 bg-gray-50 p-5 rounded-xl flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">المجموع:</span>
                      <span className="font-bold text-lg text-blue-600">{order.totalAmount} ﷼</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">طريقة الدفع:</span>
                      <span className="font-medium">{getPaymentMethodLabel(order.paymentMethod)}</span>
                    </div>

                    {order.couponCode && (
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-500">كود الخصم:</span>
                        <span className="font-mono font-bold text-blue-600" dir="ltr">{order.couponCode}</span>
                      </div>
                    )}
                    {order.couponDiscount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">قيمة الخصم:</span>
                        <span className="font-bold text-green-600">-{order.couponDiscount} ﷼</span>
                      </div>
                    )}
                    
                    {order.installmentDuration && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">مدة التقسيط:</span>
                          <span className="font-medium">{order.installmentDuration} أسابيع</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">الدفعة الأسبوعية:</span>
                          <span className="font-bold text-green-600">{order.weeklyPayment?.toFixed(2)} ﷼</span>
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-200">
                      <span>تاريخ الطلب:</span>
                      <span>{order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPp', { locale: ar }) : ''}</span>
                    </div>

                    {order.rating && (
                      <div className="mt-4 pt-4 border-t border-gray-200 bg-yellow-50/50 -mx-6 px-6 pb-4 rounded-b-2xl">
                        <span className="block text-sm font-bold text-gray-800 mb-2">تقييم العميل:</span>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg key={star} className={`w-5 h-5 ${order.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                          ))}
                        </div>
                        {order.feedbackText && (
                          <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-yellow-100">
                            "{order.feedbackText}"
                          </p>
                        )}
                      </div>
                    )}

                    {order.receiptFile && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <span className="block text-sm text-gray-500 mb-2">إيصال التحويل:</span>
                        {order.receiptFile.startsWith('data:image') && (
                          <img 
                            src={order.receiptFile} 
                            alt="إيصال التحويل" 
                            className="w-full h-32 object-cover rounded-lg mb-3 cursor-pointer border border-gray-200 hover:opacity-90 transition-opacity"
                            onClick={() => handleViewReceipt(order.receiptFile)}
                          />
                        )}
                        <button 
                          type="button"
                          onClick={() => handleViewReceipt(order.receiptFile)}
                          className="flex items-center justify-center gap-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer"
                        >
                          {order.receiptFile.startsWith('data:image') ? (
                            <><ImageIcon className="w-4 h-4" /> تكبير الصورة</>
                          ) : (
                            <><FileText className="w-4 h-4" /> عرض ملف الإيصال</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex gap-3 mt-6">
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'approved')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors"
                      >
                        موافقة
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'rejected')}
                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 rounded-lg transition-colors"
                      >
                        رفض
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <a 
                      href={`https://wa.me/${order.customerPhone?.replace(/^0/, '966')}?text=${encodeURIComponent(`مرحباً ${order.customerName}، تم تأكيد طلبك بنجاح في موقع راحة. شكراً لثقتك بنا!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-2 px-2 rounded-lg transition-colors text-sm text-center"
                    >
                      رسالة موافقة (واتساب)
                    </a>
                    <a 
                      href={`https://wa.me/${order.customerPhone?.replace(/^0/, '966')}?text=${encodeURIComponent(`مرحباً ${order.customerName}، نعتذر منك، تم رفض طلبك الأخير في موقع راحة. لمزيد من التفاصيل يمكنك التواصل معنا.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-2 rounded-lg transition-colors text-sm text-center"
                    >
                      رسالة رفض (واتساب)
                    </a>
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">إضافة كوبون جديد</h2>
            <form onSubmit={handleAddCoupon} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">كود الخصم</label>
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="مثال: SUMMER20"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  dir="ltr"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">قيمة الخصم (ريال)</label>
                <input
                  type="number"
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(e.target.value)}
                  placeholder="مثال: 50"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> إضافة
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">الكوبونات الحالية</h2>
            </div>
            {coupons.length === 0 ? (
              <div className="p-8 text-center text-gray-500">لا توجد كوبونات مضافة</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-gray-50 text-gray-600 text-sm">
                    <tr>
                      <th className="p-4 font-medium">كود الخصم</th>
                      <th className="p-4 font-medium">قيمة الخصم</th>
                      <th className="p-4 font-medium">تاريخ الإضافة</th>
                      <th className="p-4 font-medium text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-600" dir="ltr">{coupon.code}</td>
                        <td className="p-4 font-semibold text-green-600">{coupon.discountAmount} ﷼</td>
                        <td className="p-4 text-sm text-gray-500">
                          {coupon.createdAt?.toDate ? format(coupon.createdAt.toDate(), 'PP', { locale: ar }) : ''}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف الكوبون"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">عرض الإيصال</h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-gray-50">
              <img src={selectedReceipt} alt="Receipt" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                type="button"
                onClick={() => handleDownloadReceipt(selectedReceipt)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-xl transition-colors cursor-pointer"
              >
                تحميل الملف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
