import { Link } from 'react-router-dom';
import { Sparkles, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-5xl font-extrabold text-blue-600 mb-4">أهلاً وسهلاً بك في راحة</h1>
        <p className="text-xl text-gray-600">اختر الخدمة التي تناسبك لنقوم بتلبيتها بأفضل جودة</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link to="/clean" className="block">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center justify-center gap-6 cursor-pointer border-2 border-transparent hover:border-blue-500 transition-colors h-64"
          >
            <div className="bg-blue-100 p-6 rounded-full text-blue-600">
              <Sparkles className="w-16 h-16" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">كلين (Clean)</h2>
          </motion.div>
        </Link>

        <Link to="/delivery" className="block">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center justify-center gap-6 cursor-pointer border-2 border-transparent hover:border-green-500 transition-colors h-64"
          >
            <div className="bg-green-100 p-6 rounded-full text-green-600">
              <Truck className="w-16 h-16" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">توصيل (Delivery)</h2>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
