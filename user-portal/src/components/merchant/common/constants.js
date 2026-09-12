import React from 'react';
import { config } from '../../../config';
import {
  Wheat,
  Package,
  Utensils,
  Pizza,
  Sandwich,
  Soup,
  UtensilsCrossed,
  CookingPot,
  Croissant,
  Coffee,
  CupSoda,
  Wine,
  Beer,
  IceCream2,
  Cookie,
  Cake,
  Salad,
  Flame,
  Fish,
  Egg,
  Sparkles,
  Star,
  Tag,
  Apple,
  Popcorn,
  Baby,
  Sparkle,
  Bell,
  Store,
  Leaf,
  ShieldCheck
} from 'lucide-react';

export const API_BASE = config.apiUrl;

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const base = API_BASE.split('/api/v1')[0];
  let subpath = url;
  if (url.includes('/uploads/')) {
    subpath = `/uploads/${url.split('/uploads/')[1]}`;
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    subpath = url.startsWith('/') ? url : `/${url}`;
  } else {
    try {
      const parsed = new URL(url);
      subpath = parsed.pathname;
    } catch (e) {
      subpath = url;
    }
  }
  if (subpath.includes('/uploads/ads/')) {
    subpath = subpath.replace('/uploads/ads/', '/uploads/creative/');
  }
  if (subpath.startsWith('http://') || subpath.startsWith('https://')) {
    return subpath;
  }
  return `${base}${subpath}`;
};

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

export const STATE_ALIASES = {
  "chattisgarh": "Chhattisgarh",
  "orissa": "Odisha",
  "pondicherry": "Puducherry",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "andaman & nicobar": "Andaman and Nicobar Islands",
  "andaman and nicobar": "Andaman and Nicobar Islands",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "uttaranchal": "Uttarakhand"
};

export const normalizeAndMatchState = (apiState) => {
  if (!apiState) return "";
  const cleanApi = apiState.trim().toLowerCase();
  if (STATE_ALIASES[cleanApi]) {
    return STATE_ALIASES[cleanApi];
  }
  const exactMatch = INDIAN_STATES.find(s => s.toLowerCase() === cleanApi);
  if (exactMatch) return exactMatch;

  const normalize = (str) => {
    return str
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "");
  };

  const normalizedApi = normalize(cleanApi);
  const fuzzyMatch = INDIAN_STATES.find(s => normalize(s) === normalizedApi);
  if (fuzzyMatch) return fuzzyMatch;

  const substringMatch = INDIAN_STATES.find(s => {
    const normalizedState = normalize(s);
    return normalizedState.includes(normalizedApi) || normalizedApi.includes(normalizedState);
  });
  if (substringMatch) return substringMatch;
  return "";
};

export const CITY_ALIASES = {
  'bangalore': 'Bengaluru',
  'bangalore urban': 'Bengaluru',
  'bangalore rural': 'Bengaluru',
  'bengaluru': 'Bengaluru',
  'bombay': 'Mumbai',
  'mumbai suburban': 'Mumbai',
  'mumbai city': 'Mumbai',
  'madras': 'Chennai',
  'calcutta': 'Kolkata',
  'gurgaon': 'Gurugram',
  'pondicherry': 'Puducherry',
  'cochin': 'Kochi',
  'trivandrum': 'Thiruvananthapuram',
  'mysore': 'Mysuru',
  'mangalore': 'Mangaluru',
  'belgaum': 'Belagavi',
  'hubli': 'Hubballi',
  'hubli-dharwad': 'Hubballi-Dharwad',
  'baroda': 'Vadodara',
  'calicut': 'Kozhikode',
  'trichy': 'Tiruchirappalli',
  'benaras': 'Varanasi',
  'banaras': 'Varanasi',
  'allahabad': 'Prayagraj',
  'orissa': 'Odisha',
  'simla': 'Shimla',
  'waltair': 'Visakhapatnam',
  'vizag': 'Visakhapatnam'
};

export const normalizeCity = (city) => {
  if (!city) return '';
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower];
  return trimmed
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export const CATEGORY_ICON_PACK = [
  { key: 'wheat', label: 'Grains, Cereals & Millets', icon: Wheat },
  { key: 'package', label: 'Packaged Goods & Retail', icon: Package },
  { key: 'fastfood', label: 'Starters & Fast Food', icon: Utensils },
  { key: 'pizza', label: 'Pizzas & Calzones', icon: Pizza },
  { key: 'burger', label: 'Burgers & Sandwiches', icon: Sandwich },
  { key: 'soup', label: 'Soups, Broths & Noodles', icon: Soup },
  { key: 'dinner', label: 'Main Course & Curries', icon: UtensilsCrossed },
  { key: 'rice', label: 'Rice, Biryani & Thalis', icon: CookingPot },
  { key: 'croissant', label: 'Bakery, Breads & Roti', icon: Croissant },
  { key: 'coffee', label: 'Tea, Coffee & Warm Drinks', icon: Coffee },
  { key: 'drink', label: 'Cold Drinks, Juices & Shakes', icon: CupSoda },
  { key: 'bar', label: 'Cocktails & Bar', icon: Wine },
  { key: 'beer', label: 'Beers & Ciders', icon: Beer },
  { key: 'icecream', label: 'Ice Creams & Sundaes', icon: IceCream2 },
  { key: 'cookie', label: 'Desserts & Sweets', icon: Cookie },
  { key: 'cake', label: 'Cakes & Celebrations', icon: Cake },
  { key: 'salad', label: 'Salads & Healthy Bowls', icon: Salad },
  { key: 'flame', label: 'Tandoor, BBQ & Grills', icon: Flame },
  { key: 'fish', label: 'Seafood & Fish', icon: Fish },
  { key: 'egg', label: 'Breakfast & Eggs', icon: Egg },
  { key: 'sparkles', label: "Chef's Specials & Featured", icon: Sparkles },
  { key: 'star', label: 'Popular & Bestsellers', icon: Star },
  { key: 'tag', label: 'Combos, Packs & Offers', icon: Tag },
  { key: 'apple', label: 'Fresh Fruits & Organic', icon: Apple },
  { key: 'popcorn', label: 'Snacks & Munchies', icon: Popcorn },
  { key: 'baby', label: 'Kids Menu & Portions', icon: Baby },
  { key: 'sauce', label: 'Dips, Sauces & Extras', icon: Sparkle },
  { key: 'bell', label: 'Quick Bites & Street Food', icon: Bell },
  { key: 'store', label: 'Grocery & Essentials', icon: Store },
  { key: 'leaf', label: 'Pure Veg & Vegan', icon: Leaf },
  { key: 'shield', label: 'Health & Wellness', icon: ShieldCheck },
  { key: 'utensils', label: 'General / Multi-cuisine', icon: UtensilsCrossed },
];

export const getCategoryName = (c) => (typeof c === 'object' && c ? c.name : String(c || ''));
export const getCategoryIconKey = (c) => (typeof c === 'object' && c ? c.icon : '');

export const getSuggestedIconKey = (name) => {
  const cat = (name || '').toLowerCase().trim();
  if (cat.includes('wheat') || cat.includes('millet') || cat.includes('flake') || cat.includes('grain') || cat.includes('oat') || cat.includes('cereal')) return 'wheat';
  if (cat.includes('package') || cat.includes('box') || cat.includes('retail') || cat.includes('ready') || cat.includes('pack')) return 'package';
  if (cat.includes('pizza')) return 'pizza';
  if (cat.includes('burger') || cat.includes('sandwich') || cat.includes('wrap') || cat.includes('roll')) return 'burger';
  if (cat.includes('soup') || cat.includes('noodle') || cat.includes('maggi') || cat.includes('pasta') || cat.includes('chowmein')) return 'soup';
  if (cat.includes('rice') || cat.includes('biryani') || cat.includes('pulao') || cat.includes('thali') || cat.includes('bowl')) return 'rice';
  if (cat.includes('bread') || cat.includes('roti') || cat.includes('naan') || cat.includes('bakery') || cat.includes('paratha')) return 'croissant';
  if (cat.includes('main') || cat.includes('curry') || cat.includes('gravy') || cat.includes('paneer') || cat.includes('dal') || cat.includes('sabzi')) return 'dinner';
  if (cat.includes('coffee') || cat.includes('tea') || cat.includes('chai') || cat.includes('latte')) return 'coffee';
  if (cat.includes('drink') || cat.includes('beverage') || cat.includes('juice') || cat.includes('soda') || cat.includes('shake') || cat.includes('smoothie')) return 'drink';
  if (cat.includes('bar') || cat.includes('cocktail') || cat.includes('wine')) return 'bar';
  if (cat.includes('beer')) return 'beer';
  if (cat.includes('ice cream') || cat.includes('icecream') || cat.includes('sundae') || cat.includes('kulfi')) return 'icecream';
  if (cat.includes('dessert') || cat.includes('sweet') || cat.includes('cookie') || cat.includes('mithai') || cat.includes('halwa')) return 'cookie';
  if (cat.includes('cake') || cat.includes('pastry')) return 'cake';
  if (cat.includes('salad') || cat.includes('healthy') || cat.includes('diet') || cat.includes('raw')) return 'salad';
  if (cat.includes('bbq') || cat.includes('grill') || cat.includes('tandoor') || cat.includes('tikka') || cat.includes('kebab') || cat.includes('kabab')) return 'flame';
  if (cat.includes('fish') || cat.includes('seafood') || cat.includes('prawn') || cat.includes('crab')) return 'fish';
  if (cat.includes('breakfast') || cat.includes('egg') || cat.includes('omelette') || cat.includes('dosa') || cat.includes('idli')) return 'egg';
  if (cat.includes('starter') || cat.includes('appetizer') || cat.includes('snack') || cat.includes('chaat') || cat.includes('finger')) return 'fastfood';
  if (cat.includes('combo') || cat.includes('deal') || cat.includes('offer')) return 'tag';
  if (cat.includes('special') || cat.includes('chef') || cat.includes('signature')) return 'sparkles';
  if (cat.includes('popular') || cat.includes('bestseller') || cat.includes('top')) return 'star';
  return 'utensils';
};

export const normalizeCategoryObj = (c) => {
  if (!c) return { name: 'Starters', icon: 'fastfood' };
  if (typeof c === 'string') {
    return { name: c.trim(), icon: getSuggestedIconKey(c) };
  }
  return {
    name: (c.name || '').trim(),
    icon: (c.icon || '').trim() || getSuggestedIconKey(c.name || '')
  };
};

export const renderCategoryIcon = (iconKey, size = 16, className = '') => {
  const found = CATEGORY_ICON_PACK.find(item => item.key === (iconKey || '').toLowerCase());
  const IconComponent = found ? found.icon : UtensilsCrossed;
  return <IconComponent className={className} style={{ width: size, height: size }} />;
};
