import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const initialCleanProducts = [
  {
    id: 'clean-1',
    name: 'تنظيف غرفه ارضيه وأسطح وتهويه بدون كنس ومسح',
    description: 'تنظيف غرفه ارضيه وأسطح وتهويه بدون كنس ومسح',
    price: 8,
    originalPrice: 15,
    category: 'clean',
  },
  {
    id: 'clean-2',
    name: 'ترتيب ارضيه وأسطح وكنس',
    description: 'ترتيب ارضيه وأسطح وكنس',
    price: 12,
    originalPrice: 21,
    category: 'clean',
  },
  {
    id: 'clean-3',
    name: 'كنس وترتيب ارض وكمدينه وأسطح',
    description: 'كنس وترتيب ارض وكمدينه وأسطح',
    price: 16,
    originalPrice: 29,
    category: 'clean',
  },
  {
    id: 'clean-4',
    name: 'كنس مسح ترتيب ارضيه ترتيب اسطح تهويه مسح اسطح مسح مرايا وتنظيف المرايه وتهويه الغرفه',
    description: 'كنس مسح ترتيب ارضيه ترتيب اسطح تهويه مسح اسطح مسح مرايا وتنظيف المرايه وتهويه الغرفه',
    price: 25,
    originalPrice: 34,
    category: 'clean',
  },
  {
    id: 'clean-5',
    name: 'تنظيف الدواليب كامله ما عدا الملابس',
    description: 'تنظيف الدواليب كامله ما عدا الملابس',
    price: 10,
    originalPrice: 15,
    category: 'clean',
  },
  {
    id: 'clean-6',
    name: 'ترتيب الارضيه و الأسرة 🛏️',
    description: 'ترتيب الارضيه و الأسرة 🛏️',
    price: 5,
    originalPrice: 10,
    category: 'clean',
  }
];

export async function seedProducts() {
  try {
    const q = query(collection(db, 'products'), where('category', '==', 'clean'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      for (const product of initialCleanProducts) {
        await setDoc(doc(db, 'products', product.id), {
          ...product,
          createdAt: new Date()
        });
      }
    }
  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.error("Error seeding products:", error);
    }
  }
}
