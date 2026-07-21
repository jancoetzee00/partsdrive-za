export interface Part {
  id: string;
  title: string;
  category: string;
  price: number;
  condition: 'Brand New' | 'Like New' | 'Good Used' | 'Spares / Scrap';
  make: string;
  model: string;
  year: number;
  description: string;
  location: string;
  province: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  sellerWhatsApp: boolean;
  sellerVerified: boolean;
  sellerType: 'private' | 'dealer';
  images: string[];
  createdAt: string;
  views: number;
  compatibility?: string[];
}

export interface SellerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  location: string;
  province: string;
  subscriptionActive: boolean;
  subscriptionTier: 'starter' | 'pro' | null;
  subscriptionExpiry: string | null;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: 'starter' | 'pro';
  name: string;
  price: number;
  period: string;
  features: string[];
  listingLimit: number;
  badge: string;
  color: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter Seller',
    price: 149,
    period: 'month',
    features: [
      'Showcase up to 10 active parts listings',
      'Basic listing visibility in search results',
      'Direct WhatsApp click-to-chat for buyers',
      'Verified Seller badge on all parts',
      'Standard email & chat seller support'
    ],
    listingLimit: 10,
    badge: 'Starter',
    color: 'emerald'
  },
  {
    id: 'pro',
    name: 'Pro Dealer',
    price: 399,
    period: 'month',
    features: [
      'Unlimited parts listings',
      'Premium search booster (listings shown higher)',
      'Rich analytical dashboard (track page views)',
      'Featured badge & exclusive "Verified Dealer" status',
      'Call, WhatsApp & direct email contact options',
      'Priority 24/7 South African support'
    ],
    listingLimit: 9999,
    badge: 'Pro Dealer',
    color: 'blue'
  }
];

export const SOUTH_AFRICAN_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape'
];

export const PROVINCE_CITIES: Record<string, string[]> = {
  'Gauteng': ['Johannesburg', 'Pretoria', 'Midrand', 'Sandton', 'Kempton Park', 'Soweto', 'Centurion', 'Benoni', 'Roodepoort'],
  'Western Cape': ['Cape Town', 'Stellenbosch', 'George', 'Paarl', 'Somerset West', 'Mossel Bay', 'Knysna', 'Bellville'],
  'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Umhlanga', 'Pinetown', 'Newcastle', 'Richards Bay', 'Margate'],
  'Eastern Cape': ['Gqeberha (Port Elizabeth)', 'East London', 'Uitenhage', 'Mthatha', 'Grahamstown'],
  'Free State': ['Bloemfontein', 'Welkom', 'Sasolburg', 'Bethlehem', 'Kroonstad'],
  'Limpopo': ['Polokwane', 'Tzaneen', 'Mokopane', 'Thohoyandou', 'Phalaborwa'],
  'Mpumalanga': ['Mbombela (Nelspruit)', 'eMalahleni (Witbank)', 'Secunda', 'Middelburg', 'Ermelo'],
  'North West': ['Rustenburg', 'Potchefstroom', 'Klerksdorp', 'Brits', 'Mahikeng'],
  'Northern Cape': ['Kimberley', 'Upington', 'Kuruman', 'Springbok']
};

export const AUTOMOTIVE_CATEGORIES = [
  'Engine & Drivetrain',
  'Body Parts & Panels',
  'Electrical & Lights',
  'Wheels, Tyres & Suspension',
  'Brakes & Safety',
  'Interior & Accessories',
  'Exhaust & Intake',
  'Cooling System',
  'Other / Uncategorized'
];

export const VEHICLE_MAKES = [
  'Toyota',
  'Volkswagen',
  'BMW',
  'Ford',
  'Mercedes-Benz',
  'Nissan',
  'Hyundai',
  'Audi',
  'Chevrolet',
  'Opel',
  'Renault',
  'Kia',
  'Isuzu',
  'Honda',
  'Mazda',
  'Suzuki'
];
