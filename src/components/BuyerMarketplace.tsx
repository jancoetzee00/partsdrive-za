import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, MapPin, Sparkles, Car, Wrench, 
  CheckCircle2, Phone, Mail, ExternalLink, X, ArrowUpDown, 
  AlertCircle, AlertTriangle, Loader2, Calendar, MessageSquare, Info, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Part, AUTOMOTIVE_CATEGORIES, SOUTH_AFRICAN_PROVINCES, PROVINCE_CITIES, VEHICLE_MAKES } from '../types';
import { collection, getDocs, updateDoc, doc, increment, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BuyerMarketplaceProps {
  parts: Part[];
  onRefreshParts: () => void;
}

export default function BuyerMarketplace({ parts: propParts, onRefreshParts }: BuyerMarketplaceProps) {
  const [parts, setParts] = useState<Part[]>(propParts);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('latest');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Compatibility Checker States
  const [compMake, setCompMake] = useState<string>('');
  const [compModel, setCompModel] = useState<string>('');
  const [compYear, setCompYear] = useState<string>('');
  const [compEngine, setCompEngine] = useState<string>('');
  const [compChecking, setCompChecking] = useState<boolean>(false);
  const [compResult, setCompResult] = useState<{
    compatible: 'Yes' | 'No' | 'Maybe';
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  } | null>(null);
  const [compError, setCompError] = useState<string | null>(null);

  // Email Inquiry States
  const [inquiryPart, setInquiryPart] = useState<Part | null>(null);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerVehicle, setBuyerVehicle] = useState<string>('');
  const [inquiryMessage, setInquiryMessage] = useState<string>('');
  const [inquirySending, setInquirySending] = useState<boolean>(false);
  const [inquirySuccess, setInquirySuccess] = useState<boolean>(false);

  // Price Alert States
  const [alertEmail, setAlertEmail] = useState<string>('');
  const [alertSubmitting, setAlertSubmitting] = useState<boolean>(false);
  const [alertSuccess, setAlertSuccess] = useState<boolean>(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Reset alert form state when selectedPart changes
  useEffect(() => {
    if (selectedPart) {
      setAlertEmail('');
      setAlertSuccess(false);
      setAlertError(null);
    }
  }, [selectedPart]);

  // Auto-generate customized template when inquiry opens
  useEffect(() => {
    if (inquiryPart) {
      setInquiryMessage(
        `Hi ${inquiryPart.sellerName},\n\nI am interested in your automotive spare part listing: "${inquiryPart.title}" (R${inquiryPart.price.toLocaleString('en-ZA')}) on Partsdrive ZA.\n\nCould you please let me know if this part is still available and if we can arrange collection/delivery?\n\nKind regards,\n${buyerName || '[My Name]'}`
      );
      setInquirySuccess(false);
    }
  }, [inquiryPart]);

  // Keep message signature updated when buyer changes their name
  useEffect(() => {
    if (inquiryPart && buyerName) {
      setInquiryMessage(prev => {
        const lines = prev.split('\n');
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          if (lastLine.startsWith('Kind regards,') || lastLine === '[My Name]' || lastLine === '') {
            return prev;
          }
          // Safely replace or append the name if signature matches
          const nameIdx = prev.lastIndexOf('\nKind regards,\n');
          if (nameIdx !== -1) {
            return prev.substring(0, nameIdx) + `\nKind regards,\n${buyerName}`;
          }
        }
        return prev;
      });
    }
  }, [buyerName]);

  // Handler to compile and send the inquiry
  const handleSendInquiryEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySending(true);

    setTimeout(() => {
      setInquirySending(false);
      setInquirySuccess(true);

      const subject = `Inquiry on Partsdrive ZA: ${inquiryPart?.title}`;
      let body = inquiryMessage;
      if (buyerEmail) {
        body += `\n\nMy Contact Details:\nEmail: ${buyerEmail}`;
      }
      if (buyerPhone) {
        body += `\nPhone: ${buyerPhone}`;
      }
      if (buyerVehicle) {
        body += `\nVehicle Fitment Check: ${buyerVehicle}`;
      }

      const mailtoUrl = `mailto:${inquiryPart?.sellerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    }, 1200);
  };

  // Handler to set a price alert in Firestore
  const handleSetPriceAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !alertEmail) return;

    setAlertSubmitting(true);
    setAlertError(null);
    setAlertSuccess(false);

    try {
      const alertId = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const alertData = {
        id: alertId,
        partId: selectedPart.id,
        partTitle: selectedPart.title,
        email: alertEmail,
        initialPrice: selectedPart.price,
        createdAt: new Date().toISOString()
      };
      
      // Store under 'priceAlerts' collection in Firestore
      await setDoc(doc(db, 'priceAlerts', alertId), alertData);
      
      setAlertSuccess(true);
      setAlertEmail('');
    } catch (err: any) {
      console.error("Error setting price alert:", err);
      setAlertError("Failed to register price alert. Please try again.");
    } finally {
      setAlertSubmitting(false);
    }
  };

  // Sync prop parts
  useEffect(() => {
    setParts(propParts);
  }, [propParts]);

  // Handle Province/City cascading
  useEffect(() => {
    setSelectedCity('All');
  }, [selectedProvince]);

  // Filter parts based on active parameters
  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (part.compatibility && part.compatibility.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;
    const matchesMake = selectedMake === 'All' || part.make === selectedMake;
    const matchesCondition = selectedCondition === 'All' || part.condition === selectedCondition;
    const matchesProvince = selectedProvince === 'All' || part.province === selectedProvince;
    const matchesCity = selectedCity === 'All' || part.location === selectedCity;
    const matchesVerified = !verifiedOnly || part.sellerVerified;

    const priceNum = part.price;
    const matchesMinPrice = minPrice === '' || priceNum >= parseFloat(minPrice);
    const matchesMaxPrice = maxPrice === '' || priceNum <= parseFloat(maxPrice);

    return matchesSearch && matchesCategory && matchesMake && matchesCondition && 
           matchesProvince && matchesCity && matchesVerified && matchesMinPrice && matchesMaxPrice;
  });

  // Sort filtered parts
  const sortedParts = [...filteredParts].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'priceAsc') {
      return a.price - b.price;
    }
    if (sortBy === 'priceDesc') {
      return b.price - a.price;
    }
    if (sortBy === 'popular') {
      return b.views - a.views;
    }
    return 0;
  });

  // Increment view count when user clicks view details
  const handleViewPart = async (part: Part) => {
    setSelectedPart(part);
    // Reset compatibility checker state
    setCompResult(null);
    setCompError(null);
    setCompMake(part.make);
    setCompModel(part.model);
    setCompYear(part.year.toString());
    setCompEngine('');

    try {
      // Increment views in Firestore
      const docRef = doc(db, 'parts', part.id);
      await updateDoc(docRef, {
        views: increment(1)
      });
      // Update local view count
      setParts(prev => prev.map(p => p.id === part.id ? { ...p, views: p.views + 1 } : p));
      onRefreshParts();
    } catch (err) {
      console.warn('Could not increment views in Firestore:', err);
    }
  };

  // Call backend compatibility API
  const handleCheckCompatibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !compMake || !compModel) {
      setCompError('Please enter at least vehicle Make and Model.');
      return;
    }

    setCompChecking(true);
    setCompResult(null);
    setCompError(null);

    try {
      const response = await fetch('/api/ai/compatibility-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partTitle: selectedPart.title,
          partCategory: selectedPart.category,
          partDescription: selectedPart.description,
          buyerMake: compMake,
          buyerModel: compModel,
          buyerYear: compYear,
          buyerEngine: compEngine
        })
      });

      if (!response.ok) {
        throw new Error('Verification request failed. Ensure your Gemini API key is active.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setCompResult(data);
    } catch (err: any) {
      console.error('Error checking compatibility:', err);
      setCompError(err.message || 'An error occurred during AI analysis. Please verify your connection.');
    } finally {
      setCompChecking(false);
    }
  };

  // Generate pre-filled WhatsApp link
  const getWhatsAppLink = (part: Part) => {
    const localPhone = part.sellerPhone;
    // Format to international +27 format for South Africa
    let cleanPhone = localPhone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '27' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('27')) {
      cleanPhone = '27' + cleanPhone;
    }
    cleanPhone = cleanPhone.replace('+', '');

    const message = `Hi ${part.sellerName}, I am interested in your listing on Partsdrive ZA: "${part.title}" listed for R${part.price.toLocaleString('en-ZA')}. Is this still available?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Search Header Banner - Bento Styled with Heavy Border and Shadow */}
      <div className="relative overflow-hidden bg-slate-900 p-8 text-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] md:p-12">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-none bg-blue-600/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-80 w-80 rounded-none bg-yellow-400/10 blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white border-2 border-slate-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <span>PREMIUM NATIONWIDE SPARS DIRECTORY</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter sm:text-5xl leading-tight uppercase">
            FIND SPARES FASTER IN <span className="text-blue-500">SOUTH AFRICA</span>
          </h1>
          <p className="text-base text-slate-300 max-w-2xl font-medium">
            Browse and query spares from certified monthly sellers. Instantly verify compatibility using our Gemini AI engine before initiating WhatsApp contact.
          </p>

          {/* Quick Search Bar */}
          <div className="pt-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-4 h-5 w-5 text-slate-900" />
                <input
                  type="text"
                  placeholder="Search parts (e.g. Golf GTI gearbox, Hilux bumper, alternator)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white text-slate-900 placeholder-slate-500 font-bold border-2 border-slate-900 py-3.5 pl-12 pr-4 outline-none transition focus:bg-yellow-50 focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center justify-center gap-2 bg-yellow-400 border-2 border-slate-900 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-900 hover:bg-yellow-500 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 cursor-pointer active:translate-y-[1px]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters {showFilters ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Drawer/Panel - Bento Retro Style */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white p-6 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {/* Make Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Vehicle Make</label>
                <select
                  value={selectedMake}
                  onChange={(e) => setSelectedMake(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                >
                  <option value="All">All Makes</option>
                  {VEHICLE_MAKES.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                >
                  <option value="All">All Categories</option>
                  {AUTOMOTIVE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Province Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Province</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                >
                  <option value="All">All Provinces</option>
                  {SOUTH_AFRICAN_PROVINCES.map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">City / Town</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={selectedProvince === 'All'}
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white disabled:opacity-40"
                >
                  <option value="All">All Cities</option>
                  {selectedProvince !== 'All' && PROVINCE_CITIES[selectedProvince]?.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Condition Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Condition</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                >
                  <option value="All">All Conditions</option>
                  <option value="Brand New">Brand New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good Used">Good Used</option>
                  <option value="Spares / Scrap">Spares / Scrap</option>
                </select>
              </div>

              {/* Price Filters */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Min Price (R)</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Max Price (R)</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                />
              </div>

              {/* Reset Button */}
              <div className="flex items-end pb-0.5">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                    setSelectedMake('All');
                    setSelectedCondition('All');
                    setSelectedProvince('All');
                    setSelectedCity('All');
                    setMinPrice('');
                    setMaxPrice('');
                    setVerifiedOnly(false);
                  }}
                  className="w-full bg-rose-100 text-slate-900 border-2 border-slate-900 hover:bg-rose-200 transition font-black text-xs uppercase tracking-wider py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-y-[1px]"
                >
                  Reset Active Filters
                </button>
              </div>
            </div>

            {/* Subscribed Sellers Filter Toggle */}
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between border-t-2 border-slate-900 pt-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center bg-emerald-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-slate-950">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black uppercase text-slate-900">Verified Monthly Subscribers Only</h4>
                  <p className="text-xs text-slate-500 font-medium">Only show parts belonging to active monthly paying sellers & dealers</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-7 w-12 border-2 border-slate-900 bg-slate-200 after:absolute after:left-[4px] after:top-[4px] after:h-5 after:w-5 after:bg-white after:border-2 after:border-slate-900 after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-5 peer-focus:outline-none"></div>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sorting & Listing Count Section - Bento Style */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border-2 border-slate-900 p-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
        <div className="text-slate-900 text-sm font-black uppercase tracking-wider">
          Found <span className="bg-yellow-400 px-2 py-0.5 border border-slate-900 text-slate-950">{sortedParts.length}</span> listed spares 
          {searchTerm && <span> for &ldquo;{searchTerm}&rdquo;</span>}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-900 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-100 border-2 border-slate-900 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-900 outline-none focus:bg-white"
          >
            <option value="latest">Latest Listings</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="popular">Popular (Most Views)</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {sortedParts.length === 0 ? (
        <div className="border-4 border-dashed border-slate-950 bg-white py-16 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <Wrench className="mx-auto h-12 w-12 text-slate-900 animate-bounce" />
          <h3 className="mt-4 font-display text-xl font-black uppercase text-slate-950">No automotive spares found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto font-medium">
            Try adjusting your search keywords, category filters, or location to discover parts listings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedParts.map((part) => (
            <motion.div
              key={part.id}
              layoutId={`part-card-${part.id}`}
              onClick={() => handleViewPart(part)}
              className="group cursor-pointer overflow-hidden bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[-4px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150"
            >
              <div className="relative h-48 w-full bg-slate-100 border-b-2 border-slate-900 overflow-hidden">
                <img
                  src={part.images?.[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'}
                  alt={part.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span className="bg-slate-900 text-white border border-slate-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    {part.condition}
                  </span>
                  {part.sellerVerified && (
                    <span className="flex items-center gap-1 bg-emerald-400 text-slate-950 border border-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{part.sellerType === 'dealer' ? 'PRO DEALER' : 'VERIFIED'}</span>
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest block">{part.category}</span>
                  <h3 className="font-display text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors">
                    {part.title}
                  </h3>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xl font-black text-blue-700">
                    R{part.price.toLocaleString('en-ZA')}
                  </span>
                  <span className="text-[10px] bg-slate-100 border border-slate-300 px-2 py-0.5 text-slate-600 font-bold uppercase font-mono">
                    {part.views} views
                  </span>
                </div>

                <div className="flex items-center justify-between border-t-2 border-slate-900 pt-3 text-xs text-slate-700 font-bold">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="truncate">{part.location}, {part.province}</span>
                  </div>
                  <span className="shrink-0">{new Date(part.createdAt).toLocaleDateString('en-ZA')}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInquiryPart(part);
                  }}
                  id={`btn-card-inquire-${part.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-yellow-300 text-slate-950 border-2 border-slate-900 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>Send Inquiry Email</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal & AI Compatibility Checker - Bento Retro Style */}
      <AnimatePresence>
        {selectedPart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-none"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPart(null)}
                className="absolute right-4 top-4 z-10 bg-rose-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] p-2 hover:bg-rose-600 transition cursor-pointer"
              >
                <X className="h-5 w-5 font-black" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Visual Image Section */}
                <div className="p-6 bg-slate-50 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="overflow-hidden bg-white border-2 border-slate-900 aspect-4/3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                      <img
                        src={selectedPart.images?.[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'}
                        alt={selectedPart.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {/* Tiny Images Row if multiple */}
                    {selectedPart.images && selectedPart.images.length > 1 && (
                      <div className="flex gap-2">
                        {selectedPart.images.map((img, idx) => (
                          <div key={idx} className="h-16 w-16 overflow-hidden bg-white cursor-pointer border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:border-blue-600 transition">
                            <img src={img} alt="Thumb" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Seller Bio Card */}
                  <div className="mt-6 bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
                      <div className="flex h-11 w-11 items-center justify-center bg-blue-600 text-white border-2 border-slate-900 font-display font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        {selectedPart.sellerName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-slate-950 text-sm truncate uppercase tracking-tight">{selectedPart.sellerName}</h4>
                          {selectedPart.sellerVerified && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{selectedPart.sellerType} Partner</p>
                      </div>
                      {selectedPart.sellerVerified && (
                        <span className="bg-emerald-400 text-slate-950 border border-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <a
                        href={getWhatsAppLink(selectedPart)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-400 border-2 border-slate-900 px-3 py-2 text-xs font-black text-slate-950 hover:bg-emerald-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer active:translate-y-[1px]"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp Chat</span>
                      </a>
                      <a
                        href={`tel:${selectedPart.sellerPhone}`}
                        className="inline-flex items-center justify-center gap-1.5 bg-blue-600 border-2 border-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer active:translate-y-[1px]"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Call Seller</span>
                      </a>
                    </div>
                    <div className="text-center pt-1">
                      <button 
                        onClick={() => setInquiryPart(selectedPart)}
                        id="btn-detail-email-inquiry"
                        className="text-xs font-bold text-slate-600 hover:text-blue-600 transition inline-flex items-center gap-1.5 underline decoration-slate-300 cursor-pointer"
                      >
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                        <span>Or Send Email Inquiry</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content & AI Checker Section */}
                <div className="p-6 border-t md:border-t-0 md:border-l-4 border-slate-900 flex flex-col justify-between bg-slate-50">
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{selectedPart.category}</span>
                      <h2 className="font-display text-2xl font-black text-slate-950 uppercase tracking-tight leading-tight">{selectedPart.title}</h2>
                    </div>

                    <div className="flex items-baseline justify-between bg-yellow-100 border-2 border-slate-900 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Price in ZAR</span>
                        <div className="font-mono text-2xl font-black text-slate-950">
                          R{selectedPart.price.toLocaleString('en-ZA')}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Condition</span>
                        <div className="text-xs bg-slate-950 text-white font-black px-2.5 py-1 uppercase tracking-widest mt-1 border border-slate-900">
                          {selectedPart.condition}
                        </div>
                      </div>
                    </div>

                    {/* Part Details Accordion/Box */}
                    <div className="space-y-2 bg-white border-2 border-slate-900 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-100 pb-1.5">Specifications & Info</h4>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium pt-1">{selectedPart.description}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 text-xs text-slate-900 font-bold border-t border-slate-100">
                        <div><span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block">OEM Fitment</span> {selectedPart.make} {selectedPart.model}</div>
                        <div><span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block">Year Model</span> {selectedPart.year}</div>
                        <div><span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block">Location</span> {selectedPart.location}, {selectedPart.province}</div>
                        <div><span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block">Date Advertised</span> {new Date(selectedPart.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* PRICE ALERT REGISTRATION */}
                    <div className="border-2 border-slate-900 bg-blue-50 p-4 space-y-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                      <div className="flex items-center gap-2 text-slate-950">
                        <Bell className="h-4 w-4 text-blue-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider">Set Price Drop Alert</h4>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        Get notified automatically by email if the price of this <strong>{selectedPart.make} {selectedPart.model}</strong> part falls below <strong>R{selectedPart.price.toLocaleString('en-ZA')}</strong>.
                      </p>

                      {alertSuccess ? (
                        <div className="bg-emerald-100 border-2 border-emerald-600 p-3 text-xs text-emerald-950 font-bold shadow-[2px_2px_0px_0px_rgba(16,185,129,0.2)]">
                          <p className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                            <span>Price Alert successfully set! We'll keep an eye on this for you.</span>
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleSetPriceAlert} className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="Enter your email (e.g. buyer@example.com)"
                              value={alertEmail}
                              onChange={(e) => setAlertEmail(e.target.value)}
                              className="flex-1 bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-50"
                            />
                            <button
                              type="submit"
                              disabled={alertSubmitting}
                              className="bg-slate-950 text-white border-2 border-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer disabled:opacity-50"
                            >
                              {alertSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                              ) : (
                                <span>Set Alert</span>
                              )}
                            </button>
                          </div>
                          {alertError && (
                            <p className="text-[10px] text-rose-700 font-bold flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>{alertError}</span>
                            </p>
                          )}
                        </form>
                      )}
                    </div>

                    {/* AI COMPATIBILITY CHECKER */}
                    <div className="border-2 border-slate-900 bg-yellow-50 p-4 space-y-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                      <div className="flex items-center gap-2 text-slate-950">
                        <Wrench className="h-4 w-4 text-blue-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider">AI Fitment Compatibility Checker</h4>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        Not sure if this spare part fits your specific vehicle? Enter your vehicle specifications below and let Gemini AI run compatibility analysis!
                      </p>

                      <form onSubmit={handleCheckCompatibility} className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Car Make (e.g. Volkswagen)"
                            value={compMake}
                            onChange={(e) => setCompMake(e.target.value)}
                            required
                            className="bg-white border-2 border-slate-900 px-2.5 py-1.5 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-100"
                          />
                          <input
                            type="text"
                            placeholder="Model (e.g. Polo Vivo)"
                            value={compModel}
                            onChange={(e) => setCompModel(e.target.value)}
                            required
                            className="bg-white border-2 border-slate-900 px-2.5 py-1.5 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-100"
                          />
                          <input
                            type="text"
                            placeholder="Year (e.g. 2017)"
                            value={compYear}
                            onChange={(e) => setCompYear(e.target.value)}
                            className="bg-white border-2 border-slate-900 px-2.5 py-1.5 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-100"
                          />
                          <input
                            type="text"
                            placeholder="Engine (e.g. 1.4 Trendline)"
                            value={compEngine}
                            onChange={(e) => setCompEngine(e.target.value)}
                            className="bg-white border-2 border-slate-900 px-2.5 py-1.5 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-100"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={compChecking}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white border-2 border-slate-900 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer disabled:opacity-50"
                        >
                          {compChecking ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                              <span>Mechanic analyzing parts...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-yellow-300" />
                              <span>Verify Fitment with AI</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Display Compatibility Report */}
                      {compResult && (
                        <div className={`border-2 border-slate-900 p-3.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                          compResult.compatible === 'Yes' ? 'bg-emerald-100 text-emerald-950' :
                          compResult.compatible === 'No' ? 'bg-rose-100 text-rose-950' :
                          'bg-amber-100 text-amber-950'
                        } space-y-1.5`}>
                          <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider">
                            {compResult.compatible === 'Yes' && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                            {compResult.compatible === 'No' && <AlertCircle className="h-4 w-4 text-rose-700" />}
                            {compResult.compatible === 'Maybe' && <AlertTriangle className="h-4 w-4 text-amber-700" />}
                            <span>VERDICT: {
                              compResult.compatible === 'Yes' ? 'Guaranteed Compatibility' :
                              compResult.compatible === 'No' ? 'Incompatible Part' :
                              'Maybe (Verification Required)'
                            }</span>
                            <span className="ml-auto text-[9px] uppercase font-mono px-1.5 py-0.5 bg-white border border-slate-900">
                              Conf: {compResult.confidence}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed font-bold whitespace-pre-line">
                            {compResult.reasoning}
                          </p>
                        </div>
                      )}

                      {compError && (
                        <div className="bg-rose-100 p-3 text-xs text-rose-950 border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-start gap-1.5 font-bold">
                          <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                          <span>{compError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Inquiry Modal */}
      <AnimatePresence>
        {inquiryPart && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg overflow-hidden bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 space-y-5 rounded-none"
            >
              {/* Close Button */}
              <button
                onClick={() => setInquiryPart(null)}
                id="btn-close-inquiry"
                className="absolute right-4 top-4 bg-rose-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] p-2 hover:bg-rose-600 transition cursor-pointer"
              >
                <X className="h-4 w-4 font-black" />
              </button>

              <div className="space-y-1 pr-8">
                <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest block">Email Inquiry</span>
                <h3 className="font-display text-xl font-black text-slate-950 uppercase tracking-tight">
                  Inquire About: {inquiryPart.title}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                  Seller: {inquiryPart.sellerName} ({inquiryPart.sellerEmail})
                </p>
              </div>

              {inquirySuccess ? (
                <div className="border-4 border-emerald-500 bg-emerald-50 p-6 text-center space-y-4 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.3)]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none bg-emerald-100 border-2 border-emerald-500 text-emerald-600 font-bold">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display text-lg font-black uppercase text-emerald-950">Inquiry Prepared!</h4>
                    <p className="text-xs text-emerald-800 font-medium max-w-sm mx-auto">
                      We have compiled your inquiry and initiated your mail client to send it to the seller. If your email application didn't open automatically, use the button below to retry.
                    </p>
                  </div>
                  
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const subject = `Inquiry on Partsdrive ZA: ${inquiryPart.title}`;
                        let body = inquiryMessage;
                        if (buyerEmail) body += `\n\nMy Contact Details:\nEmail: ${buyerEmail}`;
                        if (buyerPhone) body += `\nPhone: ${buyerPhone}`;
                        if (buyerVehicle) body += `\nVehicle Fitment Check: ${buyerVehicle}`;
                        window.location.href = `mailto:${inquiryPart.sellerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }}
                      id="btn-retry-mailto"
                      className="inline-flex items-center justify-center gap-1.5 bg-emerald-400 text-slate-950 border-2 border-slate-900 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-emerald-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open Mail Client Again</span>
                    </button>
                    <button
                      onClick={() => setInquiryPart(null)}
                      id="btn-inquiry-done"
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-100 text-slate-950 border-2 border-slate-900 py-2 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition cursor-pointer"
                    >
                      <span>Back to Marketplace</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInquiryEmail} className="space-y-4">
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="inquiry-buyer-name" className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Your Name</label>
                        <input
                          id="inquiry-buyer-name"
                          type="text"
                          required
                          placeholder="e.g. Sipho Zulu"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="inquiry-buyer-email" className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Your Email</label>
                        <input
                          id="inquiry-buyer-email"
                          type="email"
                          required
                          placeholder="e.g. sipho@gmail.com"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="inquiry-buyer-phone" className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Your Phone (Optional)</label>
                        <input
                          id="inquiry-buyer-phone"
                          type="tel"
                          placeholder="e.g. 082 123 4567"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="inquiry-buyer-vehicle" className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Your Vehicle (Optional)</label>
                        <input
                          id="inquiry-buyer-vehicle"
                          type="text"
                          placeholder="e.g. 2018 Toyota Hilux"
                          value={buyerVehicle}
                          onChange={(e) => setBuyerVehicle(e.target.value)}
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="inquiry-message" className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Custom Message</label>
                      <textarea
                        id="inquiry-message"
                        required
                        rows={5}
                        placeholder="Type your message here..."
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:bg-yellow-50 resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={inquirySending}
                    id="btn-submit-inquiry"
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white border-2 border-slate-900 py-3 text-xs font-black uppercase tracking-wider hover:bg-blue-700 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {inquirySending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Sending Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 text-yellow-300" />
                        <span>Send Email Inquiry</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
