import React, { useState } from 'react';
import { 
  CreditCard, ShieldCheck, CheckCircle2, Loader2, ArrowLeft, 
  Smartphone, Wallet, Lock, Sparkles, Building
} from 'lucide-react';
import { motion } from 'motion/react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../types';

interface CheckoutGatewayProps {
  planId: 'starter' | 'pro';
  sellerId: string;
  sellerEmail: string;
  sellerName: string;
  onSuccess: (planId: 'starter' | 'pro', reference: string, expiry: string) => void;
  onCancel: () => void;
}

export default function CheckoutGateway({ 
  planId, sellerId, sellerEmail, sellerName, onSuccess, onCancel 
}: CheckoutGatewayProps) {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
  
  // Payment methods: 'card' | 'capitec' | 'eft'
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'capitec' | 'eft'>('card');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  
  // Form values
  const [cardNumber, setCardNumber] = useState<string>('4000 1234 5678 9010');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvv, setCardCvv] = useState<string>('123');
  const [cardName, setCardName] = useState<string>(sellerName || 'Janco Coetzee');
  
  const [phone, setPhone] = useState<string>('082 555 4321');
  const [selectedBank, setSelectedBank] = useState<string>('FNB');

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate complex clearing steps common in South African PayFast / Capitec Pay gateways
    const steps = [
      'Initiating handshake with secure banking server...',
      paymentMethod === 'card' ? 'Routing 3D-Secure 2.0 query to card issuer bank...' : 
      paymentMethod === 'capitec' ? 'Sending push notification to Capitec Banking App...' :
      `Establishing secure API tunnel with ${selectedBank} Instant EFT gate...`,
      'Awaiting buyer authorization / OTP approval...',
      'Verifying transaction ledger with South African reserve ledger...',
      'Finalizing secure monthly subscription subscription tokens...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      // Call backend payment verify endpoint
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: `PD-SUB-${sellerId.substring(0, 5).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
          planId,
          sellerId
        })
      });

      if (!response.ok) {
        throw new Error('Payment token verification failed.');
      }

      const data = await response.json();
      if (data.success) {
        onSuccess(planId, data.reference, data.subscriptionExpiry);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Simulation completed, but failed updating transaction records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <button 
        onClick={onCancel}
        disabled={loading}
        className="inline-flex items-center gap-2 text-xs font-black text-slate-900 hover:text-blue-700 uppercase tracking-wider bg-white border-2 border-slate-900 px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition mb-6 disabled:opacity-50 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
        <span>Return to Dashboard</span>
      </button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Hand: Checkout Form */}
        <div className="md:col-span-2 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden rounded-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6 min-h-[450px]">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="space-y-3">
                <h3 className="font-display text-xl font-black uppercase text-slate-950 tracking-tight">Processing Secure Payment</h3>
                <p className="text-xs text-blue-700 font-mono font-black uppercase tracking-wider animate-pulse bg-blue-50 border-2 border-slate-900 p-2.5">{currentStep}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-100 border-2 border-slate-900 px-4 py-2 text-xs text-slate-900 font-black uppercase tracking-wider">
                <Lock className="h-4 w-4 text-slate-900 stroke-[2.5]" />
                <span>Encrypted AES-256 Bit SSL Protocol</span>
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-widest">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Secure Pay ZA Checkout</span>
                </div>
                <h2 className="font-display text-2xl font-black text-slate-950 uppercase tracking-tighter">Select Payment Method</h2>
              </div>

              {/* Selector Tabs */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center gap-2 border-2 p-4 text-center cursor-pointer transition rounded-none ${
                    paymentMethod === 'card' 
                      ? 'border-slate-900 bg-yellow-100 text-slate-950 font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-bold'
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-slate-900" />
                  <span className="text-xs uppercase tracking-tight">Credit Card</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('capitec')}
                  className={`flex flex-col items-center justify-center gap-2 border-2 p-4 text-center cursor-pointer transition rounded-none ${
                    paymentMethod === 'capitec' 
                      ? 'border-slate-900 bg-yellow-100 text-slate-950 font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-bold'
                  }`}
                >
                  <Smartphone className="h-5 w-5 text-slate-900" />
                  <span className="text-xs uppercase tracking-tight">Capitec Pay</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('eft')}
                  className={`flex flex-col items-center justify-center gap-2 border-2 p-4 text-center cursor-pointer transition rounded-none ${
                    paymentMethod === 'eft' 
                      ? 'border-slate-900 bg-yellow-100 text-slate-950 font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-bold'
                  }`}
                >
                  <Building className="h-5 w-5 text-slate-900" />
                  <span className="text-xs uppercase tracking-tight">Instant EFT</span>
                </button>
              </div>

              {/* Payment Forms */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        required
                        className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm text-slate-800 font-bold outline-none rounded-none focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          required
                          maxLength={19}
                          className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 pl-11 text-sm text-slate-800 font-bold outline-none rounded-none focus:bg-white font-mono"
                        />
                        <CreditCard className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-900" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          required
                          maxLength={5}
                          className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm text-slate-800 font-bold outline-none rounded-none focus:bg-white font-mono text-center"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-950 uppercase tracking-wide">CVV Code</label>
                        <input
                          type="password"
                          placeholder="CVV"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          required
                          maxLength={3}
                          className="w-full bg-slate-100 border-2 border-slate-900 p-2.5 text-sm text-slate-800 font-bold outline-none rounded-none focus:bg-white font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'capitec' && (
                  <div className="space-y-4 bg-yellow-50 p-5 border-2 border-slate-900 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center bg-blue-100 text-slate-950 border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-none shrink-0">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-slate-950 tracking-tight">Capitec Pay Authorization</h4>
                        <p className="text-xs text-slate-600 font-medium">Pay directly using your Capitec registered cellphone.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Capitec Cellphone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="e.g. 082 123 4567"
                        className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-800 font-bold outline-none rounded-none focus:bg-yellow-100 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-bold uppercase tracking-wide">
                      *A checkout prompt notification will be pushed to your Capitec App. Please approve inside the app.
                    </p>
                  </div>
                )}

                {paymentMethod === 'eft' && (
                  <div className="space-y-4 bg-yellow-50 p-5 border-2 border-slate-900 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center bg-blue-100 text-slate-950 border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-none shrink-0">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-slate-950 tracking-tight">Instant EFT Gateway</h4>
                        <p className="text-xs text-slate-600 font-medium">Instant balance clearance via safe banking connection.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-black text-slate-950 uppercase tracking-wide">Select your Bank</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full bg-white border-2 border-slate-900 p-2.5 text-sm text-slate-800 font-bold outline-none rounded-none focus:bg-yellow-100"
                      >
                        <option value="FNB">First National Bank (FNB)</option>
                        <option value="Standard Bank">Standard Bank</option>
                        <option value="ABSA">ABSA</option>
                        <option value="Nedbank">Nedbank</option>
                        <option value="Capitec">Capitec Bank</option>
                        <option value="TymeBank">TymeBank</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-bold uppercase tracking-wide">
                      *You will login to your secure online banking portal directly to complete authorization.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 border-2 border-slate-900 py-3.5 text-xs font-black uppercase text-white hover:bg-blue-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer rounded-none active:translate-y-[1px]"
                >
                  <Lock className="h-4 w-4" />
                  <span>Securely Authorize R{plan.price.toLocaleString('en-ZA')}</span>
                </button>
              </form>

              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified PCI-DSS Compliant Gateway</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Hand: Order Summary */}
        <div className="bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between h-fit space-y-6 rounded-none">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscription Summary</h3>
            
            <div className="space-y-1">
              <span className="bg-blue-100 text-blue-900 border border-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                {plan.badge} Plan
              </span>
              <h4 className="font-display text-xl font-black text-slate-950 uppercase tracking-tight pt-1.5">{plan.name}</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Monthly seller membership</p>
            </div>

            <hr className="border-t-2 border-slate-900" />

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Monthly rate</span>
                <span className="font-mono text-slate-950">R{plan.price.toLocaleString('en-ZA')}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Vat (15%)</span>
                <span>Included</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span>Setup fee</span>
                <span className="text-emerald-700 font-black">Free</span>
              </div>
            </div>

            <hr className="border-t-2 border-slate-900" />

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs font-black text-slate-950 uppercase tracking-wider">Amount Due Now</span>
              <span className="font-mono text-2xl font-black text-blue-700">
                R{plan.price.toLocaleString('en-ZA')}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t-2 border-slate-900">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">What&apos;s Included</h4>
            <ul className="space-y-2">
              {plan.features.slice(0, 3).map((feat, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-800 font-bold uppercase tracking-wide">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
