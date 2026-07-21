import React, { useState, useEffect } from 'react';
import { 
  Car, Wrench, ShieldCheck, Sparkles, MessageSquare, 
  HelpCircle, UserCircle, RefreshCw, Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BuyerMarketplace from './components/BuyerMarketplace';
import SellerDashboard from './components/SellerDashboard';
import CheckoutGateway from './components/CheckoutGateway';
import { Part, SellerProfile } from './types';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { seedDatabaseIfNeeded } from './lib/firebaseSeeder';
import { collection, getDocs, doc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activeView, setActiveView] = useState<'buyer' | 'seller' | 'checkout'>('buyer');
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('starter');

  // Load and seed database on startup
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      // 1. Seed initial parts to Firestore if empty
      await seedDatabaseIfNeeded();

      // 2. Fetch all parts from Firestore
      await fetchAllParts();

      // 3. Monitor auth changes to fetch profile
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const profileDoc = await getDoc(doc(db, 'sellers', user.uid));
            if (profileDoc.exists()) {
              setSellerProfile(profileDoc.data() as SellerProfile);
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `sellers/${user.uid}`);
          }
        } else {
          setSellerProfile(null);
        }
      });

      setLoading(false);
    };

    initApp();
  }, []);

  const fetchAllParts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'parts'));
      const list: Part[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Part);
      });
      // Sort latest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setParts(list);
    } catch (error) {
      console.error('Error fetching parts from Firestore:', error);
      handleFirestoreError(error, OperationType.LIST, 'parts');
    }
  };

  const handleSelectPlan = (planId: 'starter' | 'pro') => {
    setSelectedPlan(planId);
    setActiveView('checkout');
  };

  // Callback once billing cleared in CheckoutGateway
  const handlePaymentSuccess = async (planId: 'starter' | 'pro', reference: string, expiry: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // 1. Update seller profile in Firestore
      const sellerRef = doc(db, 'sellers', currentUser.uid);
      const updatedProfile = {
        subscriptionActive: true,
        subscriptionTier: planId,
        subscriptionExpiry: expiry
      };
      try {
        await updateDoc(sellerRef, updatedProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sellers/${currentUser.uid}`);
      }

      // Refresh local seller profile
      let profileSnap;
      try {
        profileSnap = await getDoc(sellerRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `sellers/${currentUser.uid}`);
      }
      if (profileSnap && profileSnap.exists()) {
        setSellerProfile(profileSnap.data() as SellerProfile);
      }

      // 2. Update all active listings of this seller in Firestore to hold "Verified" status
      const q = query(collection(db, 'parts'), where('sellerId', '==', currentUser.uid));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'parts');
      }
      
      const updatePromises: Promise<void>[] = [];
      if (querySnapshot) {
        querySnapshot.forEach((docSnap) => {
          const partRef = doc(db, 'parts', docSnap.id);
          updatePromises.push(
            (async () => {
              try {
                await updateDoc(partRef, {
                  sellerVerified: true,
                  sellerType: planId === 'pro' ? 'dealer' : 'private'
                });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `parts/${docSnap.id}`);
              }
            })()
          );
        });
      }

      await Promise.all(updatePromises);

      // 3. Refresh general parts listing
      await fetchAllParts();

      // Forward back to dashboard
      setActiveView('seller');
    } catch (error) {
      console.error('Error finalising subscription purchase:', error);
      alert('Subscription cleared, but failed syncing marketplace database.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-yellow-300 selection:text-slate-900">
      {/* Top Navigation Bar with Retro Neobrutalist Border */}
      <header className="sticky top-0 z-40 bg-white border-b-4 border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <div 
              onClick={() => setActiveView('buyer')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-none bg-blue-600 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] group-hover:bg-yellow-400 group-hover:text-slate-900 transition-colors">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-black tracking-tighter text-blue-700 leading-none">
                  PARTSDRIVE <span className="text-slate-900">ZA</span>
                </h1>
                <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase block mt-1">
                  South Africa's Premier Auto Marketplace
                </span>
              </div>
            </div>

            {/* Navigation Selector in Bento Style */}
            <nav className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('buyer')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                  activeView === 'buyer' 
                    ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-y-[-2px]' 
                    : 'bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-100 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-2px]'
                }`}
              >
                Browse Spares
              </button>
              <button
                onClick={() => setActiveView('seller')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                  activeView === 'seller' || activeView === 'checkout'
                    ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-y-[-2px]' 
                    : 'bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-100 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-2px]'
                }`}
              >
                Sell Spares
              </button>
            </nav>

            {/* Total count badge / Support badge */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-none bg-yellow-400 px-4 py-2 text-xs font-black text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] uppercase tracking-wider">
                <Layers className="h-4 w-4 text-slate-950" />
                <span>{parts.length} Spares Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="p-4 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-slate-900 font-bold uppercase tracking-wider">Synchronizing parts ledger...</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeView === 'buyer' && (
                <BuyerMarketplace 
                  parts={parts} 
                  onRefreshParts={fetchAllParts} 
                />
              )}
              {activeView === 'seller' && (
                <SellerDashboard 
                  onSelectPlan={handleSelectPlan}
                  sellerProfile={sellerProfile}
                  onRefreshParts={fetchAllParts}
                />
              )}
              {activeView === 'checkout' && auth.currentUser && (
                <CheckoutGateway
                  planId={selectedPlan}
                  sellerId={auth.currentUser.uid}
                  sellerEmail={auth.currentUser.email || ''}
                  sellerName={sellerProfile?.name || ''}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setActiveView('seller')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer in Neobrutalist Block */}
      <footer className="bg-white border-t-4 border-slate-900 py-8 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            © {new Date().getFullYear()} PARTSDRIVE ZA | THE ENGINE OF THE MARKETPLACE
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-xs font-black uppercase tracking-wider text-slate-900">
            <a href="#terms" className="hover:text-blue-600 transition">Terms of Advertising</a>
            <span className="hidden sm:inline text-slate-300">|</span>
            <a href="#privacy" className="hover:text-blue-600 transition">Privacy Ledger</a>
            <span className="hidden sm:inline text-slate-300">|</span>
            <a href="#pricing" className="hover:text-blue-600 transition">Monthly Seller Rates</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
