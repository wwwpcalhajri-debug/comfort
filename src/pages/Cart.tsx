import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft } from 'lucide-react';

export default function Cart() {
  const { cart, removeFromCart, total } = useCart();

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">السلة فارغة</h2>
        <Link to="/" className="text-blue-600 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">سلة المشتريات</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
              <p className="text-gray-500 text-sm">الكمية: {item.quantity}</p>
            </div>
            <div className="flex items-center gap-6">
              <span className="font-bold text-lg">{item.price * item.quantity} ﷼</span>
              <button 
                onClick={() => removeFromCart(item.id)}
                className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg transition-colors"
                title="حذف"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-gray-500">المجموع الكلي</p>
          <p className="text-3xl font-extrabold text-blue-600">{total} ﷼</p>
        </div>
        
        <Link 
          to="/checkout"
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          إتمام الطلب
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
