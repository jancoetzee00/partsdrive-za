import React, { useState, useEffect } from 'react';
import { 
  Plus, LogOut, Sparkles, Wrench, Calendar, MapPin, Phone, 
  BarChart3, CheckCircle2, AlertTriangle, Trash2, Edit3, 
  Loader2, Key, Mail, User, Check, RefreshCw, Smartphone, Eye, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, query, where, addDoc 
} from 'firebase/firestore';
import { 
  Part, SellerProfile, AUTOMOTIVE_CATEGORIES, 
  SOUTH_AFRICAN_PROVINCES, PROVINCE_CITIES, VEHICLE_MAKES, SUBSCRIPTION_PLANS 
} from '../types';

interface SellerDashboardProps {
  onSelectPlan: (planId: 'starter' | 'pro') => void;
  sellerProfile: SellerProfile | null;
  onRefreshParts: () => void;
}

export default function SellerDashboard({ onSelectPlan, sellerProfile: propProfile, onRefreshParts }: SellerDashboardProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(propProfile);
  const [sellerParts, setSellerParts] = useState<Part[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [partsLoading, setPartsLoading] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  // Form States
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [province, setProvince] = useState<string>('Gauteng');
  
  // Auth Error
  const [authError, setAuthError] = useState<string | null>(null);

  // Listing Editor Modal States
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [enhanceLoading, setEnhanceLoading] = useState<boolean>(false);

  // Part Form fields
  const [partTitle, setPartTitle] = useState<string>('');
  const [partCategory, setPartCategory] = useState<string>('Engine & Drivetrain');
  const [partPrice, setPartPrice] = useState<string>('');
  const [partCondition, setPartCondition] = useState<'Brand New' | 'Like New' | 'Good Used' | 'Spares / Scrap'>('Good Used');
  const [partMake, setPartMake] = useState<string>('Toyota');
  const [partModel, setPartModel] = useState<string>('');
  const [partYear, setPartYear] = useState<string>('2018');
  const [partDesc, setPartDesc] = useState<string>('');
  const [partImageUrl, setPartImageUrl] = useState<string>('');
  const [partComp, setPartComp] = useState<string[]>([]);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchSellerProfile(currentUser.uid);
        await fetchSellerParts(currentUser.uid);
      } else {
        setProfile(null);
        setSellerParts([]);
        setProfileLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Seller Profile
  const fetchSellerProfile = async (uid: string) => {
    setProfileLoading(true);
    try {
      const docRef = doc(db, 'sellers', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SellerProfile;
        setProfile(data);
      } else {
        // Auto-create initial profile
        const initialProfile: SellerProfile = {
          id: uid,
          name: fullName || user?.displayName || auth.currentUser?.email?.split('@')[0] || 'New Seller',
          email: auth.currentUser?.email || '',
          phone: phone || '082 555 1234',
          whatsapp: whatsapp || '082 555 1234',
          location: location || 'Johannesburg',
          province: province || 'Gauteng',
          subscriptionActive: false,
          subscriptionTier: null,
          subscriptionExpiry: null,
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, initialProfile);
        setProfile(initialProfile);
      }
    } catch (err) {
      console.error('Error fetching seller profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch parts uploaded by this seller
  const fetchSellerParts = async (uid: string) => {
    setPartsLoading(true);
    try {
      const q = query(collection(db, 'parts'), where('sellerId', '==', uid));
      const querySnapshot = await getDocs(q);
      const items: Part[] = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Part);
      });
      setSellerParts(items);
    } catch (err) {
      console.error('Error loading parts:', err);
    } finally {
      setPartsLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      // Create initial seller profile doc
      const newProfile: SellerProfile = {
        id: userCred.user.uid,
        name: fullName || 'New Seller',
        email,
        phone: phone || '082 555 1234',
        whatsapp: whatsapp || '082 555 1234',
        location: location || 'Johannesburg',
        province,
        subscriptionActive: false,
        subscriptionTier: null,
        subscriptionExpiry: null,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'sellers', userCred.user.uid), newProfile);
      setProfile(newProfile);
    } catch (err: any) {
      setAuthError(err.message || 'Sign up failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await auth.signOut();
  };

  // Open Listing Editor
  const handleOpenEditor = (part: Part | null) => {
    if (part) {
      setEditingPart(part);
      setPartTitle(part.title);
      setPartCategory(part.category);
      setPartPrice(part.price.toString());
      setPartCondition(part.condition);
      setPartMake(part.make);
      setPartModel(part.model);
      setPartYear(part.year.toString());
      setPartDesc(part.description);
      setPartImageUrl(part.images?.[0] || '');
      setPartComp(part.compatibility || []);
    } else {
      setEditingPart(null);
      setPartTitle('');
      setPartCategory('Engine & Drivetrain');
      setPartPrice('');
      setPartCondition('Good Used');
      setPartMake('Toyota');
      setPartModel('');
      setPartYear('2018');
      setPartDesc('');
      setPartImageUrl('');
      setPartComp([]);
    }
    setShowEditor(true);
  };

  // Enhance listing text using Gemini AI endpoint
  const handleEnhanceWithAI = async () => {
    if (!partTitle) {
      alert('Please fill in at least the Part Title before calling AI.');
      return;
    }
    setEnhanceLoading(true);
    try {
      const response = await fetch('/api/ai/enhance-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: partTitle,
          description: partDesc,
          make: partMake,
          model: partModel,
          year: partYear,
          category: partCategory,
          condition: partCondition,
          price: partPrice
        })
      });

      if (!response.ok) {
        throw new Error('AI Enhancement failed. Ensure your Gemini API key is configured.');
      }

      const data = await response.json();
      if (data.enhancedTitle) {
        setPartTitle(data.enhancedTitle);
      }
      if (data.enhancedDescription) {
        setPartDesc(data.enhancedDescription);
      }
      if (data.suggestedPriceZAR && !partPrice) {
        setPartPrice(data.suggestedPriceZAR.toString());
      }
      if (data.compatibilityList) {
        setPartComp(data.compatibilityList);
      }
    } catch (err: any) {
      alert(err.message || 'Enhancement failed. Check server logs.');
    } finally {
      setEnhanceLoading(false);
    }
  };

  // Save/Upload Listing to Firestore
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    // Strict Subscription Limitation check
    if (!profile.subscriptionActive && sellerParts.length >= 1) {
      alert('Unsubscribed sellers can list up to 1 part for trial. Please subscribe on a monthly basis to showcase more automotive spares!');
      return;
    }
    if (profile.subscriptionTier === 'starter' && sellerParts.length >= 10 && !editingPart) {
      alert('You have reached the 10-parts listing limit for your Starter Seller plan. Please upgrade to Pro Dealer to upload unlimited listings!');
      return;
    }

    try {
      const numericPrice = parseFloat(partPrice) || 0;
      const numericYear = parseInt(partYear) || new Date().getFullYear();

      // Image default fallbacks
      const imageList = partImageUrl ? [partImageUrl] : [
        partCategory === 'Engine & Drivetrain' ? 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80' :
        partCategory === 'Body Parts & Panels' ? 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=600&q=80' :
        partCategory === 'Electrical & Lights' ? 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' :
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80'
      ];

      const partData: Omit<Part, 'id'> = {
        title: partTitle,
        category: partCategory,
        price: numericPrice,
        condition: partCondition,
        make: partMake,
        model: partModel,
        year: numericYear,
        description: partDesc,
        location: profile.location,
        province: profile.province,
        sellerId: user.uid,
        sellerName: profile.name,
        sellerPhone: profile.phone,
        sellerEmail: profile.email,
        sellerWhatsApp: true,
        sellerVerified: profile.subscriptionActive,
        sellerType: profile.subscriptionTier === 'pro' ? 'dealer' : 'private',
        images: imageList,
        createdAt: editingPart ? editingPart.createdAt : new Date().toISOString(),
        views: editingPart ? editingPart.views : 0,
        compatibility: partComp
      };

      if (editingPart) {
        // Edit existing
        const docRef = doc(db, 'parts', editingPart.id);
        await updateDoc(docRef, partData);
      } else {
        // Add new
        await addDoc(collection(db, 'parts'), partData);
      }

      setShowEditor(false);
      await fetchSellerParts(user.uid);
      onRefreshParts();
    } catch (err) {
      console.error('Error saving listing:', err);
      alert('Could not save listing to Firestore.');
    }
  };

  // Delete Listing
  const handleDeleteListing = async (partId: string) => {
    if (!confirm('Are you sure you want to remove this listing from the marketplace?')) return;
    try {
      await deleteDoc(doc(db, 'parts', partId));
      setSellerParts(prev => prev.filter(p => p.id !== partId));
      onRefreshParts();
    } catch (err) {
      console.error('Error deleting listing:', err);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Retrieving your seller dashboard profiles...</p>
      </div>
    );
  }

  // Not logged in -> Show Sign-In/Up UI - Neobrutalist Bento Style
  if (!user || !profile) {
    return (
      <div className="mx-auto max-w-md bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden mt-6 rounded-none">
        <div className="bg-slate-900 text-white p-6 space-y-2 border-b-4 border-slate-900">
          <h2 className="font-display text-2xl font-black uppercase tracking-tighter">Seller Portal</h2>
          <p className="text-xs text-slate-300 font-medium">Monthly subscription advertising system to showcase spares</p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Tabs - Bento Selector */}
          <div className="flex bg-slate-100 border-2 border-slate-900 p-1 rounded-none">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider transition rounded-none ${authMode === 'login' ? 'bg-slate-900 text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
            >
              Log In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(null); }}
              className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider transition rounded-none ${authMode === 'signup' ? 'bg-slate-900 text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
            >
              Register Account
            </button>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wide">Full Name / Dealership Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. VagSpares Gauteng"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 pl-10 text-sm font-bold text-slate-900 outline-none rounded-none focus:bg-white"
                    />
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-900" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-wide">Cellphone Number</label>
                    <input
                      type="text"
                      placeholder="082 555 1234"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none rounded-none focus:bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-wide">City</label>
                    <input
                      type="text"
                      placeholder="Johannesburg"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none rounded-none focus:bg-white"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@dealership.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 pl-10 text-sm font-bold text-slate-900 outline-none rounded-none focus:bg-white"
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-900" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wide">Secure Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 pl-10 text-sm font-bold text-slate-900 outline-none rounded-none focus:bg-white"
                />
                <Key className="absolute left-3 top-3.5 h-4 w-4 text-slate-900" />
              </div>
            </div>

            {authError && (
              <div className="bg-rose-100 p-3 text-xs text-rose-950 border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-start gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 border-2 border-slate-900 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer disabled:opacity-50 active:translate-y-[1px]"
            >
              {authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>{authMode === 'login' ? 'Access Portal' : 'Register & Start Listing'}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Seller Header panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-4 border-slate-900 pb-5">
        <div>
          <h2 className="font-display text-3xl font-black text-slate-950 uppercase tracking-tighter">Welcome, {profile.name}</h2>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Manage your subscription, list auto parts, and monitor visitor views.</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-1.5 bg-rose-100 border-2 border-slate-900 px-4 py-2.5 text-xs font-black uppercase text-slate-900 hover:bg-rose-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer active:translate-y-[1px] rounded-none"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Subscription Tiers & State Card */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Active Subscription Status */}
        <div className="md:col-span-2 bg-white border-4 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between space-y-6 rounded-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Account Subscription Status</span>
              {profile.subscriptionActive ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                  <h3 className="font-display text-lg font-black uppercase tracking-tight">
                    Active monthly {profile.subscriptionTier === 'pro' ? 'Pro Dealer' : 'Starter Seller'}
                  </h3>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
                  <h3 className="font-display text-lg font-black uppercase tracking-tight">Trial Account (Unverified)</h3>
                </div>
              )}
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                {profile.subscriptionActive 
                  ? `Your showcase subscription is paid and verified. Next automatic renewal: ${new Date(profile.subscriptionExpiry || '').toLocaleDateString('en-ZA')}`
                  : 'You have no active monthly subscription. Verified monthly subscriptions get top results visibility and Unlimited / 10-parts listing options.'
                }
              </p>
            </div>
            
            {profile.subscriptionActive && (
              <span className="bg-emerald-400 text-slate-950 border-2 border-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none">
                Verified Seller Badge Active
              </span>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 border-t-2 border-slate-900 pt-5 text-center sm:text-left">
            <div>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Spares Uploaded</span>
              <div className="font-mono text-3xl font-black text-blue-700">
                {sellerParts.length}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Total Ad Views</span>
              <div className="font-mono text-3xl font-black text-slate-950">
                {sellerParts.reduce((acc, p) => acc + (p.views || 0), 0)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Monthly Limit</span>
              <div className="font-mono text-xl font-black text-rose-700 uppercase">
                {profile.subscriptionActive 
                  ? (profile.subscriptionTier === 'pro' ? 'Unlimited' : '10 Parts')
                  : '1 Ad Trial'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plan Card (If not subscribed or wants upgrade) */}
        <div className="bg-slate-900 text-white border-4 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between space-y-6 rounded-none">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 bg-yellow-400 text-slate-950 border border-slate-900 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest">
              <Sparkles className="h-3 w-3 text-slate-950 fill-current" />
              <span>Showcase Spares</span>
            </div>
            <h4 className="font-display text-lg font-black uppercase tracking-tight">Boost Automotive Sales</h4>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
              Paying subscribers get a Verified Seller badge, premium result placement, and custom analytical view tracking.
            </p>
          </div>

          <div className="space-y-2">
            {!profile.subscriptionActive ? (
              <div className="space-y-2">
                <button
                  onClick={() => onSelectPlan('starter')}
                  className="w-full bg-yellow-400 border-2 border-slate-900 py-2.5 text-xs font-black text-slate-950 hover:bg-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition rounded-none uppercase cursor-pointer"
                >
                  Subscribe Starter (R149/mo)
                </button>
                <button
                  onClick={() => onSelectPlan('pro')}
                  className="w-full bg-blue-600 border-2 border-slate-900 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition rounded-none uppercase cursor-pointer"
                >
                  Subscribe Pro Dealer (R399/mo)
                </button>
              </div>
            ) : profile.subscriptionTier === 'starter' ? (
              <button
                onClick={() => onSelectPlan('pro')}
                className="w-full bg-blue-600 border-2 border-slate-900 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition rounded-none uppercase cursor-pointer"
              >
                Upgrade to Pro Dealer (R399)
              </button>
            ) : (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/40 p-3 flex items-center gap-2 rounded-none">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Holding Highest Plan!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parts Listings Table/Group */}
      <div className="bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 border-b-4 border-slate-900 bg-yellow-50 gap-4">
          <h3 className="font-display font-black text-lg text-slate-950 uppercase tracking-tight">Your Advertising Showcase ({sellerParts.length})</h3>
          <button
            onClick={() => handleOpenEditor(null)}
            className="inline-flex items-center gap-1.5 bg-blue-600 border-2 border-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer active:translate-y-[1px] rounded-none uppercase"
          >
            <Plus className="h-4 w-4" />
            <span>List Automotive Part</span>
          </button>
        </div>

        {partsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : sellerParts.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-50">
            <Wrench className="mx-auto h-12 w-12 text-slate-400 stroke-[2.5]" />
            <h4 className="font-black text-slate-900 uppercase tracking-tight">Your showcase is currently empty</h4>
            <p className="text-xs max-w-xs mx-auto text-slate-600 font-bold">List engines, body panels, gearboxes, or wheel rims to start receiving inquiries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-900">
              <thead className="bg-slate-100 text-xs text-slate-900 font-black uppercase tracking-wider border-b-2 border-slate-900">
                <tr>
                  <th className="px-6 py-3.5">Part Details</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Price (ZAR)</th>
                  <th className="px-6 py-3.5">Views</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-900 font-medium">
                {sellerParts.map((part) => (
                  <tr key={part.id} className="hover:bg-yellow-50/40 transition">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="h-14 w-14 bg-white border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0">
                        <img src={part.images?.[0] || ''} alt="Part" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <div className="font-black text-slate-950 uppercase tracking-tight line-clamp-1">{part.title}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">{part.make} {part.model} &bull; {part.condition}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-900 border border-slate-900 px-2.5 py-1 text-xs font-black uppercase tracking-wider">
                        {part.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-slate-950 text-base">
                      R{part.price.toLocaleString('en-ZA')}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-blue-700">
                      {part.views || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2.5">
                        <button
                          onClick={() => handleOpenEditor(part)}
                          className="p-2 text-slate-950 bg-yellow-400 border-2 border-slate-900 hover:bg-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer"
                          title="Edit Ad"
                        >
                          <Edit3 className="h-4 w-4 stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => handleDeleteListing(part.id)}
                          className="p-2 text-white bg-rose-500 border-2 border-slate-900 hover:bg-rose-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer"
                          title="Delete Ad"
                        >
                          <Trash2 className="h-4 w-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Listing Editor Modal Form - Neobrutalist Bento Theme */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 md:p-8 space-y-6 rounded-none"
            >
              <button
                onClick={() => setShowEditor(false)}
                className="absolute right-5 top-5 bg-rose-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] p-1.5 hover:bg-rose-600 transition cursor-pointer"
              >
                <X className="h-5 w-5 font-black" />
              </button>

              <div className="space-y-1">
                <h3 className="font-display text-xl font-black uppercase text-slate-950 tracking-tight">
                  {editingPart ? 'Modify Parts Advertisement' : 'Publish Automotive Spare Part'}
                </h3>
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Provide precise technical specifications for buyers.</p>
              </div>

              <form onSubmit={handleSaveListing} className="space-y-5">
                {/* AI Assistant Banner */}
                <div className="border-2 border-slate-900 bg-yellow-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-1.5 text-slate-950 font-black text-sm uppercase tracking-wide">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>Gemini AI Copywriter Assistant</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-normal">
                      Write a brief title and click Enhance. Gemini will draft structured, SEO-friendly listings with technical bullet points and compatibility tables!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnhanceWithAI}
                    disabled={enhanceLoading || !partTitle}
                    className="inline-flex items-center justify-center gap-1.5 bg-blue-600 border-2 border-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer disabled:opacity-50 shrink-0 uppercase tracking-wider rounded-none"
                  >
                    {enhanceLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                        <span>Polishing ad...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                        <span>Enhance with AI</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Listing Title / Part Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Golf 7 GTI Gearbox - 6 Speed Manual"
                    value={partTitle}
                    onChange={(e) => setPartTitle(e.target.value)}
                    className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Category</label>
                    <select
                      value={partCategory}
                      onChange={(e) => setPartCategory(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50"
                    >
                      {AUTOMOTIVE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Price (Rands ZAR)</label>
                    <input
                      type="number"
                      required
                      placeholder="Selling price"
                      value={partPrice}
                      onChange={(e) => setPartPrice(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Vehicle Make</label>
                    <select
                      value={partMake}
                      onChange={(e) => setPartMake(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50"
                    >
                      {VEHICLE_MAKES.map(make => (
                        <option key={make} value={make}>{make}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Model (e.g. Hilux)</label>
                    <input
                      type="text"
                      required
                      placeholder="Golf, Hilux etc"
                      value={partModel}
                      onChange={(e) => setPartModel(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Car Year</label>
                    <input
                      type="number"
                      required
                      placeholder="2018"
                      value={partYear}
                      onChange={(e) => setPartYear(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Condition</label>
                    <select
                      value={partCondition}
                      onChange={(e) => setPartCondition(e.target.value as any)}
                      className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50"
                    >
                      <option value="Brand New">Brand New</option>
                      <option value="Like New">Like New</option>
                      <option value="Good Used">Good Used</option>
                      <option value="Spares / Scrap">Spares / Scrap</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Part Photo Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="HTTPS Image URL"
                      value={partImageUrl}
                      onChange={(e) => setPartImageUrl(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 p-2.5 text-xs text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Item Description & Fitment Details</label>
                  <textarea
                    rows={4}
                    placeholder="Provide condition, mileage (if engine/transmission), warranty, shipping information, and fits."
                    value={partDesc}
                    onChange={(e) => setPartDesc(e.target.value)}
                    className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-900 font-bold outline-none rounded-none focus:bg-yellow-50"
                  ></textarea>
                </div>

                {partComp.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Estimated Compatible Models (Generated by AI)</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {partComp.map((comp, idx) => (
                        <span key={idx} className="bg-yellow-100 text-slate-950 border border-slate-900 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t-2 border-slate-900">
                  <button
                    type="button"
                    onClick={() => setShowEditor(false)}
                    className="bg-rose-100 text-slate-900 border-2 border-slate-900 hover:bg-rose-200 px-4 py-2.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-y-[1px] rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white border-2 border-slate-900 hover:bg-blue-700 px-5 py-2.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-y-[1px] rounded-none"
                  >
                    Publish Ad
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
