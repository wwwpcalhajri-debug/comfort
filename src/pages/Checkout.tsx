import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { Banknote, Building2, ShieldCheck, CheckCircle2, Star, Upload, Tag } from 'lucide-react';

export default function Checkout() {
  const { cart, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [name, setName] = useState(localStorage.getItem('guestName') || localStorage.getItem('savedName') || auth.currentUser?.displayName || '');
  const [phone, setPhone] = useState(localStorage.getItem('guestPhone') || localStorage.getItem('savedPhone') || '');

  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [installmentAgreed, setInstallmentAgreed] = useState(false);
  const [installmentDuration, setInstallmentDuration] = useState<number | null>(null);
  const [installmentPaymentMethod, setInstallmentPaymentMethod] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const ACCOUNT_NUMBER = '532000010006080149075';
  const IBAN = 'SA78 8000 0532 6080 1014 9075';

  const [orderId, setOrderId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error('حجم الملف كبير جداً. الرجاء رفع ملف بحجم أقل من 1 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (cart.length === 0 && !isSuccess) {
      navigate('/cart');
    }
  }, [cart.length, navigate, isSuccess]);

  if (cart.length === 0 && !isSuccess) {
    return null;
  }

  const finalTotal = Math.max(0, total - (appliedCoupon?.discount || 0));

  const amountToPay = paymentMethod === 'installment' && installmentDuration
    ? finalTotal / installmentDuration
    : finalTotal;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const docRef = doc(db, 'coupons', couponCode.trim().toUpperCase());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().isActive) {
        setAppliedCoupon({ code: docSnap.data().code, discount: docSnap.data().discountAmount });
        toast.success('تم تطبيق كود الخصم بنجاح');
      } else {
        toast.error('كود الخصم غير صحيح أو منتهي الصلاحية');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('حدث خطأ أثناء تطبيق كود الخصم');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleProceed = async () => {
    if (!name || !phone || !paymentMethod) {
      toast.error('الرجاء إكمال جميع البيانات');
      return;
    }

    if (paymentMethod === 'installment') {
      if (!installmentAgreed || !installmentDuration || !installmentPaymentMethod) {
        toast.error('الرجاء إكمال بيانات التقسيط');
        return;
      }
    }

    // Save for future checkouts
    localStorage.setItem('savedName', name);
    localStorage.setItem('savedPhone', phone);

    setIsSubmitting(true);
    await saveOrder();
  };

  const saveOrder = async () => {
    try {
      const orderData = {
        userId: auth.currentUser?.uid || 'anonymous',
        customerName: name,
        customerPhone: phone,
        items: cart,
        totalAmount: finalTotal,
        originalAmount: total,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: appliedCoupon?.discount || null,
        paymentMethod: paymentMethod === 'installment' ? `installment_${installmentPaymentMethod}` : paymentMethod,
        installmentDuration: installmentDuration,
        weeklyPayment: installmentDuration ? finalTotal / installmentDuration : null,
        receiptFile: receiptFile,
        status: 'pending',
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      setOrderId(docRef.id);
      setIsSuccess(true);
      clearCart();
    } catch (error) {
      console.error('Error adding order:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    if (rating === 0) {
      toast.error('الرجاء اختيار التقييم');
      return;
    }
    setIsSubmitting(true);
    try {
      if (orderId) {
        // Update the order with the feedback
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'orders', orderId), {
          rating,
          feedbackText,
          feedbackCreatedAt: new Date()
        });
      }
      toast.success('شكراً لتقييمك!');
      navigate('/');
    } catch (error) {
      console.error('Error adding feedback:', error);
      toast.error('حدث خطأ أثناء إرسال التقييم');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">تم استلام طلبك بنجاح</h1>
        <p className="text-xl text-gray-600 mb-8">سوف يتم اخبارك بالرد لاحقاً</p>

        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
          <h3 className="text-lg font-bold text-blue-800 mb-2">خطوة أخيرة لتأكيد الطلب</h3>
          <p className="text-blue-600 mb-4">يرجى إرسال تفاصيل الطلب للإدارة عبر الواتساب لضمان سرعة التنفيذ</p>
          <a 
            href={`https://wa.me/966553538409?text=${encodeURIComponent(`مرحباً، قمت بطلب جديد من موقع راحة.\n\nرقم الطلب: ${orderId}\nالاسم: ${name}\nالإجمالي: ${finalTotal} ريال\n\nأرجو تأكيد استلام الطلب.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-4 rounded-xl transition-colors"
          >
            إرسال تفاصيل الطلب للإدارة (واتساب)
          </a>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">كيف كانت تجربتك مع الموقع؟</h2>
          <div className="flex justify-center gap-2 mb-8 flex-row-reverse">
            {[5, 4, 3, 2, 1].map(star => (
              <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                <Star className={`w-12 h-12 transition-colors ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 hover:text-yellow-200'}`} />
              </button>
            ))}
          </div>
          <div className="text-right mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظاتك واقتراحاتك (اختياري)</label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={4}
              placeholder="اكتب ملاحظاتك هنا..."
            />
          </div>
          <button 
            onClick={submitFeedback}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 mb-3"
          >
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم والعودة للرئيسية'}
          </button>
          <button 
            onClick={() => navigate('/')}
            disabled={isSubmitting}
            className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">إتمام الطلب</h1>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
        {/* Customer Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">بيانات العميل</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الثلاثي</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="أدخل اسمك الثلاثي"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-left"
              placeholder="05xxxxxxxx"
              dir="ltr"
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">طريقة الدفع</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Banknote className={paymentMethod === 'cash' ? 'text-blue-500' : 'text-gray-400'} />
              <span className="font-medium">كاش</span>
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Building2 className={paymentMethod === 'transfer' ? 'text-blue-500' : 'text-gray-400'} />
              <span className="font-medium">تحويل بنكي</span>
            </button>
            <button
              onClick={() => setPaymentMethod('installment')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'installment' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Banknote className={paymentMethod === 'installment' ? 'text-blue-500' : 'text-gray-400'} />
              <span className="font-medium">أقساط</span>
            </button>
          </div>
        </div>

        {/* Bank Transfer Details */}
        {paymentMethod === 'transfer' && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
            <div>
              <p className="text-sm text-blue-800 mb-2 font-medium">الرجاء التحويل إلى الحساب التالي:</p>
              <div className="bg-white p-3 rounded-lg border border-blue-200 flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-500">رقم الحساب:</span>
                  <span className="font-mono text-gray-800 font-bold" dir="ltr">{ACCOUNT_NUMBER}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">الآيبان:</span>
                  <span className="font-mono text-gray-800 text-sm" dir="ltr">{IBAN}</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-2">إرفاق صورة الإيصال (اختياري)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-blue-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-sm text-blue-600 font-medium">اضغط لرفع الإيصال</p>
                    <p className="text-xs text-gray-500 mt-1">أي صيغة (صورة أو ملف)</p>
                  </div>
                  <input type="file" className="hidden" accept="*/*" onChange={handleFileUpload} />
                </label>
              </div>
              {receiptFile && (
                <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> تم إرفاق الملف بنجاح
                </p>
              )}
            </div>
          </div>
        )}

        {/* Installment Details */}
        {paymentMethod === 'installment' && (
          <div className="space-y-6 pt-6 border-t border-gray-100">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                شروط التقسيط
              </h3>
              <p className="text-sm text-orange-700 leading-relaxed mb-4">
                أقسم بالله العظيم أني سأدفع الأقساط في وقتها المحدد، وأن هذا القسم عهد بيني وبين الله قبل أن يكون بيني وبين الموقع.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={installmentAgreed}
                  onChange={(e) => setInstallmentAgreed(e.target.checked)}
                  className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-orange-900">أوافق وأقسم على ذلك</span>
              </label>
            </div>

            {installmentAgreed && (
              <>
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-800">مدة التقسيط</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[2, 3, 4].map(weeks => (
                      <button
                        key={weeks}
                        onClick={() => setInstallmentDuration(weeks)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          installmentDuration === weeks ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="font-bold">{weeks} أسابيع</span>
                        <div className="text-sm mt-1 opacity-80">
                          {(total / weeks).toFixed(2)} ﷼ / أسبوعياً
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {installmentDuration && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-800">طريقة دفع القسط الأول</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setInstallmentPaymentMethod('cash')}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          installmentPaymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <Banknote className="w-5 h-5" />
                        <span>كاش</span>
                      </button>
                      <button
                        onClick={() => setInstallmentPaymentMethod('transfer')}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          installmentPaymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                        <span>تحويل بنكي</span>
                      </button>
                    </div>
                    
                    {installmentPaymentMethod === 'transfer' && (
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-3 space-y-4">
                        <div>
                          <p className="text-sm text-blue-800 mb-2 font-medium">الرجاء تحويل القسط الأول إلى:</p>
                          <div className="bg-white p-3 rounded-lg border border-blue-200 flex flex-col gap-2">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <span className="text-sm text-gray-500">رقم الحساب:</span>
                              <span className="font-mono text-gray-800 font-bold" dir="ltr">{ACCOUNT_NUMBER}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">الآيبان:</span>
                              <span className="font-mono text-gray-800 text-sm" dir="ltr">{IBAN}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-blue-800 mb-2">إرفاق صورة الإيصال (اختياري)</label>
                          <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-blue-50 transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 text-blue-500 mb-2" />
                                <p className="text-sm text-blue-600 font-medium">اضغط لرفع الإيصال</p>
                                <p className="text-xs text-gray-500 mt-1">أي صيغة (صورة أو ملف)</p>
                              </div>
                              <input type="file" className="hidden" accept="*/*" onChange={handleFileUpload} />
                            </label>
                          </div>
                          {receiptFile && (
                            <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> تم إرفاق الملف بنجاح
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Total and Submit */}
        <div className="pt-6 border-t border-gray-100">
          
          {/* Coupon Section */}
          <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              هل لديك كود خصم؟
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="أدخل كود الخصم هنا"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                dir="ltr"
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <button
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode('');
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-600 font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              ) : (
                <button
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isApplyingCoupon ? 'جاري التحقق...' : 'تطبيق'}
                </button>
              )}
            </div>
            {appliedCoupon && (
              <p className="text-sm text-green-600 mt-2 font-medium">
                تم خصم {appliedCoupon.discount} ﷼ بنجاح!
              </p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-gray-500">
              <span>المبلغ الإجمالي:</span>
              <span className={appliedCoupon ? 'line-through' : ''}>{total.toFixed(2)} ﷼</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-green-600 font-medium">
                <span>الخصم:</span>
                <span>-{appliedCoupon.discount.toFixed(2)} ﷼</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-gray-800 font-bold">المبلغ المطلوب الآن:</span>
              <span className="text-3xl font-bold text-blue-600">{amountToPay.toFixed(2)} ﷼</span>
            </div>
          </div>
          
          <button
            onClick={handleProceed}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'جاري التحضير...' : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                <span>متابعة الدفع</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
