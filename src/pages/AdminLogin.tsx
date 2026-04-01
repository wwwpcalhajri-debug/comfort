import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1469') {
      localStorage.setItem('admin_auth', 'true');
      navigate('/admin-dashboard');
    } else {
      toast.error('الرمز السري غير صحيح');
      setPin('');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">تسجيل دخول المالك</h1>
        <p className="text-gray-500 mt-2">الرجاء إدخال الرمز السري للمتابعة</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest"
            placeholder="••••"
            maxLength={4}
            dir="ltr"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
        >
          دخول
        </button>
      </form>
    </div>
  );
}
