import React, { useState } from 'react';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Sparkles, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState<'social' | 'phoneForm'>('social');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('guestName');
      localStorage.removeItem('guestPhone');
      await signInWithPopup(auth, googleProvider);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (error) {
      console.error("Login error:", error);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phoneNumber) {
      toast.error('الرجاء إكمال البيانات');
      return;
    }

    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      localStorage.setItem('guestName', fullName);
      localStorage.setItem('guestPhone', phoneNumber);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (error: any) {
      console.error('Phone auth error:', error);
      if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        toast.error('عذراً، يجب تفعيل "Anonymous" من إعدادات Firebase Authentication لكي يعمل هذا الخيار.');
      } else {
        toast.error('حدث خطأ أثناء تسجيل الدخول: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 p-4 font-sans" dir="rtl">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="bg-blue-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center text-blue-600 mb-6">
          <Sparkles className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">أهلاً بك في راحة</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          يرجى تسجيل الدخول للمتابعة وطلب الخدمات بكل أمان.
        </p>

        {loginMethod === 'social' && (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors shadow-md flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="w-6 h-6 bg-white rounded-full p-1" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? 'جاري التحميل...' : 'تسجيل الدخول بحساب جوجل'}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-500">أو</span>
              </div>
            </div>

            <button
              onClick={() => setLoginMethod('phoneForm')}
              disabled={isLoading}
              className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Phone className="w-5 h-5" />
              المتابعة برقم الهاتف
            </button>
          </div>
        )}

        {loginMethod === 'phoneForm' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-right"
                required
              />
            </div>
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 mt-4"
            >
              {isLoading ? 'جاري الدخول...' : 'إنهاء'}
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('social')}
              className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2"
            >
              العودة للخيارات الأخرى
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
