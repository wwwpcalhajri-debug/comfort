import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, useCart } from '../context/CartContext';
import { seedProducts } from '../lib/seed';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export default function Clean() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    seedProducts();

    const q = query(collection(db, 'products'), where('category', '==', 'clean'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      // Sort by price ascending just to keep them somewhat ordered
      prods.sort((a, b) => a.price - b.price);
      setProducts(prods);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast.success('تمت الإضافة للسلة بنجاح');
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">جاري التحميل...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-600 mb-8 text-center">خدمات كلين</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between border border-gray-100 hover:shadow-lg transition-shadow"
          >
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{product.name}</h3>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-2xl font-extrabold text-blue-600">{product.price} ﷼</span>
                {product.originalPrice > product.price && (
                  <span className="text-sm text-gray-400 line-through">قبل {product.originalPrice} ﷼</span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => handleAddToCart(product)}
              className="mt-6 w-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              إضافة للسلة
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
