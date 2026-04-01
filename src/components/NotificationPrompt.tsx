import React, { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';

export default function NotificationPrompt({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
    }
  };

  return (
    <>
      {showPrompt && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellRing className="w-10 h-10 text-blue-600 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">تفعيل الإشعارات</h2>
            <p className="text-gray-600 leading-relaxed">
              يرجى السماح بالإشعارات لنتمكن من تنبيهك فوراً عند الموافقة على طلبك أو رفضه.
            </p>
            <div className="pt-4 space-y-3">
              <button
                onClick={requestPermission}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg shadow-lg shadow-blue-200"
              >
                السماح بالإشعارات
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3 px-6 rounded-xl transition-colors"
              >
                ربما لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
