import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Leaf, 
  Zap, 
  Car, 
  Utensils, 
  ShoppingBag, 
  Plus, 
  TrendingDown, 
  Award, 
  Info,
  History,
  PieChart as PieChartIcon,
  LogIn,
  UserPlus,
  LogOut,
  Globe,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  X,
  Trash2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Recommendation, UserProfile } from './types';
import { EMISSION_FACTORS, INITIAL_BADGES } from './constants';
import { getAIRecommendations, getPredictiveInsights } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const MOCK_SAMPLE_ACTIVITIES: Activity[] = [
  {
    id: '1',
    uid: 'sample',
    type: 'commute',
    category: 'car',
    value: 15,
    emissions: 2.7,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    uid: 'sample',
    type: 'meal',
    category: 'beef',
    value: 0.5,
    emissions: 13.5,
    date: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    uid: 'sample',
    type: 'electricity',
    category: 'electricity',
    value: 10,
    emissions: 4.5,
    date: new Date(Date.now() - 172800000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

const CATEGORY_EXPLANATIONS: Record<string, string> = {
  // Commute
  car: 'Gasoline cars emit CO2 through fuel combustion. Reducing mileage or carpooling helps significantly.',
  bus: 'Buses are much more efficient per passenger than private cars, reducing your individual footprint.',
  bike: 'Cycling has zero operational emissions and is the gold standard for sustainable short-distance travel.',
  walking: 'Walking is the most sustainable way to travel with zero carbon impact.',
  // Meals
  meat: 'Meat production, especially beef, requires vast land and water, and produces high methane emissions.',
  vegetarian: 'Removing meat reduces land use and greenhouse gas emissions associated with livestock farming.',
  vegan: 'Plant-based diets have the lowest carbon footprint, avoiding all animal-industry emissions.',
  // Energy
  electricity: 'Electricity footprint depends on your local grid. Saving kWh reduces demand for fossil fuel power plants.',
  heating: 'Heating is a major energy consumer. Improving insulation or lowering the thermostat helps.',
  water: 'Heating water requires significant energy. Shorter showers directly reduce your carbon impact.',
  // Shopping
  fastFashion: 'Fast fashion involves high-intensity manufacturing, global shipping, and high waste levels.',
  sustainable: 'Sustainable brands focus on longevity, recycled materials, and ethical, lower-impact production.'
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6 border border-slate-200">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Something went wrong</h2>
              <p className="text-slate-500">We encountered an unexpected error. Please try refreshing the page.</p>
            </div>
            {this.state.error && (
              <div className="p-4 bg-slate-50 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-slate-400 break-all">{this.state.error.message}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'landing' | 'sample' | 'dashboard' | 'profile'>('landing');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [tempName, setTempName] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<Activity['type']>('commute');
  const [category, setCategory] = useState('car');
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        let profile: UserProfile;
        if (userDoc.exists()) {
          profile = userDoc.data() as UserProfile;
          setUserProfile(profile);
        } else {
          // New User Setup
          profile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            greenScore: 100,
            createdAt: new Date().toISOString(),
            bio: '',
            location: ''
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), profile);
          setUserProfile(profile);
          if (!profile.displayName) {
            setShowProfileSetup(true);
          }
        }
        // Only redirect to dashboard if we're on landing or sample
        // Use a functional update or just check the current view state carefully
        setView(prev => (prev === 'landing' || prev === 'sample') ? 'dashboard' : prev);
      } else {
        setUser(null);
        setUserProfile(null);
        setView(prev => (prev === 'dashboard' || prev === 'profile') ? 'landing' : prev);
      }
    });
    return () => unsubscribe();
  }, []); // Remove view dependency to avoid re-running on every view change

  useEffect(() => {
    if (user && view === 'dashboard') {
      const q = query(
        collection(db, 'activities'), 
        where('uid', '==', user.uid),
        orderBy('date', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Activity));
        setActivities(docs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'activities');
      });
      return () => unsubscribe();
    } else if (view === 'sample') {
      setActivities(MOCK_SAMPLE_ACTIVITIES);
    } else {
      setActivities([]);
    }
  }, [user, view]);

  const stats = useMemo(() => {
    const total = activities.reduce((sum, a) => sum + a.emissions, 0);
    const byType = activities.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + a.emissions;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(byType).map(([name, value]) => ({ name, value }));
    const days = new Set(activities.map(a => a.date)).size || 1;
    const avgDaily = activities.length > 0 ? total / days : 0;
    const score = activities.length === 0 ? 100 : Math.max(0, 100 - (avgDaily * 2));

    return { total, chartData, score, avgDaily };
  }, [activities]);

  useEffect(() => {
    updateAI();
  }, [activities.length, stats.score]);

  const aiTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const updateAI = async () => {
    if (activities.length === 0) {
      setRecommendations([]);
      setInsight("");
      return;
    }

    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

    aiTimeoutRef.current = setTimeout(async () => {
      setLoadingAI(true);
      try {
        const [recs, ins] = await Promise.all([
          getAIRecommendations(activities, stats.score),
          getPredictiveInsights(activities, stats.score)
        ]);
        setRecommendations(recs);
        setInsight(ins);
      } catch (error: any) {
        console.error("Update failed:", error);
      } finally {
        setLoadingAI(false);
      }
    }, 600);
  };

  const handleLogin = async () => {
    console.log("Current Hostname:", window.location.hostname);
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login Error:", error);
      let message = "Failed to sign in.";
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        message = `UNAUTHORIZED DOMAIN: The domain "${domain}" is not authorized. 
        
        HOW TO FIX:
        1. Go to Firebase Console > Authentication > Settings > Authorized Domains.
        2. Click "Add Domain".
        3. Type "${domain}" and click Add.
        
        Even if you are using localhost, it must be in this list!`;
      } else if (error.code === 'auth/popup-blocked') {
        message = "Sign-in popup was blocked by your browser. Please allow popups for this site.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google Sign-in is not enabled in your Firebase project. Please enable it in the Firebase Console under Authentication > Sign-in method.";
      } else {
        message = `Sign-in failed: ${error.message} (Code: ${error.code})`;
      }
      setLoginError(message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('landing');
  };

  const handleSaveProfileSetup = async () => {
    if (!user || !tempName.trim()) return;
    const updatedProfile = { ...userProfile!, displayName: tempName };
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setUserProfile(updatedProfile);
    setShowProfileSetup(false);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userProfile) return;
    const updatedProfile = { ...userProfile, ...updates };
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setUserProfile(updatedProfile);
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const valNum = parseFloat(value);
    if (isNaN(valNum)) return;

    let emissions = 0;
    if (type === 'commute') {
      emissions = valNum * (EMISSION_FACTORS.commute[category as keyof typeof EMISSION_FACTORS.commute] || 0);
    } else if (type === 'meal') {
      // Multiply by valNum (number of meals) to make the input meaningful
      emissions = valNum * (EMISSION_FACTORS.meal[category as keyof typeof EMISSION_FACTORS.meal] || 0);
    } else if (type === 'electricity') {
      emissions = valNum * EMISSION_FACTORS.electricity;
    } else if (type === 'shopping') {
      emissions = valNum * (EMISSION_FACTORS.shopping[category as keyof typeof EMISSION_FACTORS.shopping] || 0);
    }

    const newActivity = {
      uid: user.uid,
      date: new Date().toISOString().split('T')[0],
      type,
      category,
      value: valNum,
      emissions,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'activities'), newActivity);
      setShowForm(false);
      setValue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'activities');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!user || view === 'sample') return;
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `activities/${id}`);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  // --- Views ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-emerald-600" />
            <span className="text-2xl font-bold tracking-tighter">EcoTrack</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('sample')} className="text-sm font-semibold hover:text-emerald-600 transition-colors">Sample Preview</button>
            <button onClick={handleLogin} className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>
        </nav>

        {loginError && (
          <div className="max-w-7xl mx-auto px-6 mt-4">
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl flex flex-col gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="font-bold text-lg">Sign-in Error</h3>
                <button onClick={() => setLoginError(null)} className="ml-auto text-red-400 hover:text-red-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm font-medium whitespace-pre-line leading-relaxed">{loginError}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.hostname);
                    alert("Domain copied to clipboard!");
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all"
                >
                  Copy Domain: {window.location.hostname}
                </button>
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
                >
                  Open Firebase Console
                </a>
                <button 
                  onClick={() => {
                    console.log("--- Firebase Debug Info ---");
                    console.log("Domain:", window.location.hostname);
                    console.log("Auth State:", auth.currentUser ? "Logged In" : "Logged Out");
                    alert("Debug info logged to browser console (F12)!");
                  }}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Log Debug Info
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">
              <Globe className="w-4 h-4" />
              <span>Join 50,000+ Participants</span>
            </div>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
              TRACK YOUR <span className="text-emerald-600">IMPACT.</span> <br />
              SAVE THE <span className="text-emerald-600">PLANET.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-lg leading-relaxed">
              EcoTrack is your personal sustainability companion. Log your daily habits, visualize your carbon footprint, and get AI-powered recommendations to live a greener life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleLogin} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95">
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => setView('sample')} className="border-2 border-slate-200 px-10 py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95">
                View Preview
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-emerald-100 rounded-[40px] blur-3xl opacity-30 animate-pulse" />
            <img 
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=1000" 
              alt="Sustainability" 
              className="relative rounded-[40px] shadow-2xl border-8 border-white"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Leaf className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">EcoTrack</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {view === 'sample' ? (
              <div className="flex items-center gap-4">
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Preview Mode</span>
                <button onClick={handleLogin} className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold">Sign Up to Start</button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right cursor-pointer" onClick={() => setView('profile')}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Eco Warrior</p>
                  <p className="text-sm font-bold">Hi, {userProfile?.displayName?.split(' ')[0] || 'Warrior'}!</p>
                </div>
                <button 
                  onClick={() => setShowForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Log Activity</span>
                </button>
                <button onClick={() => setView('profile')} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                  <UserPlus className="w-5 h-5" />
                </button>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {loginError && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl flex flex-col gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-lg">Sign-in Error</h3>
              <button onClick={() => setLoginError(null)} className="ml-auto text-red-400 hover:text-red-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm font-medium leading-relaxed">{loginError}</p>
            {loginError.includes("UNAUTHORIZED DOMAIN") && (
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.hostname);
                    alert("Domain copied to clipboard!");
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all"
                >
                  Copy Domain: {window.location.hostname}
                </button>
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
                >
                  Open Firebase Console
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'profile' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="flex items-center gap-4">
              <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowRight className="w-6 h-6 rotate-180" />
              </button>
              <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Display Name</label>
                <input 
                  type="text" 
                  value={userProfile?.displayName || ''}
                  onChange={(e) => handleUpdateProfile({ displayName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Email</label>
                <input 
                  type="email" 
                  value={userProfile?.email || ''}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Location</label>
                <input 
                  type="text" 
                  value={userProfile?.location || ''}
                  onChange={(e) => handleUpdateProfile({ location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="City, Country"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Bio</label>
                <textarea 
                  value={userProfile?.bio || ''}
                  onChange={(e) => handleUpdateProfile({ bio: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-32 resize-none"
                  placeholder="Tell us about your sustainability goals..."
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setView('dashboard')}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Save & Return to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Stats & Charts */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Welcome Greeting */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-1"
              >
                <h2 className="text-3xl font-bold tracking-tight">
                  Hi, {view === 'sample' ? 'Participant' : (userProfile?.displayName?.split(' ')[0] || 'Warrior')}!
                </h2>
                <p className="text-slate-500">
                  {view === 'sample' 
                    ? "This is a preview of your future dashboard. Sign up to start tracking your real impact!"
                    : "Ready to track your impact today? Every small action counts."}
                </p>
              </motion.div>
              
              {/* Hero Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Emissions</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{stats.total.toFixed(1)}</span>
                    <span className="text-slate-400 text-sm font-medium">kg CO₂</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-emerald-600 text-sm font-medium">
                    <TrendingDown className="w-4 h-4" />
                    <span>{activities.length === 0 ? 'Start logging!' : 'Tracking active'}</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500 mb-1">Green Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{stats.score.toFixed(0)}</span>
                    <span className="text-slate-400 text-sm font-medium">/ 100</span>
                  </div>
                  <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-1000" 
                      style={{ width: `${stats.score}%` }}
                    />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Daily Average</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{stats.avgDaily.toFixed(1)}</span>
                      <span className="text-slate-400 text-sm font-medium">kg/day</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 italic">Global avg: ~13kg</p>
                </motion.div>
              </div>

              {/* Visualization Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-emerald-600" />
                      Emissions Breakdown
                    </h3>
                  </div>
                  <div className="h-[250px] w-full relative min-h-[250px]">
                    {activities.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <PieChartIcon className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">Log data to see chart</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={stats.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            isAnimationActive={true}
                          >
                            {stats.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-600" />
                      Recent Activity
                    </h3>
                  </div>
                  <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {activities.length === 0 && (
                      <p className="text-slate-400 text-center py-8">No activities logged yet.</p>
                    )}
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            {activity.type === 'commute' && <Car className="w-4 h-4 text-blue-500" />}
                            {activity.type === 'meal' && <Utensils className="w-4 h-4 text-orange-500" />}
                            {activity.type === 'electricity' && <Zap className="w-4 h-4 text-yellow-500" />}
                            {activity.type === 'shopping' && <ShoppingBag className="w-4 h-4 text-purple-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold capitalize">{activity.type}</p>
                            <p className="text-xs text-slate-500">{activity.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">{activity.emissions.toFixed(2)}kg</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">CO₂e</p>
                          </div>
                          {view !== 'sample' && (
                            <button 
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete activity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Insights Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5" />
                    <h3 className="font-bold">AI Predictive Insight</h3>
                    <button 
                      onClick={updateAI} 
                      disabled={loadingAI}
                      className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                      title="Refresh AI Insights"
                    >
                      <RefreshCw className={cn("w-3 h-3", loadingAI && "animate-spin")} />
                    </button>
                  </div>
                  <p className="text-emerald-50 font-medium leading-relaxed">
                    {loadingAI ? "Analyzing your habits..." : insight || "Log more activities to get personalized insights."}
                  </p>
                </div>
                <div className="absolute top-[-20%] right-[-10%] opacity-10">
                  <Leaf className="w-48 h-48" />
                </div>
              </div>
            </div>

            {/* Right Column: AI Recommendations & Badges */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Recommendations */}
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  AI Recommendations
                </h3>
                <div className="space-y-4">
                  {loadingAI ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="animate-pulse flex flex-col gap-2">
                        <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-12 bg-slate-100 rounded"></div>
                      </div>
                    ))
                  ) : (
                    recommendations.map((rec, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 transition-colors group cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm group-hover:text-emerald-700 transition-colors">{rec.title}</h4>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                            rec.impact === 'high' ? "bg-red-100 text-red-600" : 
                            rec.impact === 'medium' ? "bg-orange-100 text-orange-600" : 
                            "bg-blue-100 text-blue-600"
                          )}>
                            {rec.impact}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">{rec.description}</p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          <span>Potential Saving</span>
                          <span>{rec.potentialSaving}kg CO₂ / wk</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                  {!loadingAI && recommendations.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Log activities to get AI tips.</p>
                  )}
                </div>
              </section>

              {/* Badges / Gamification */}
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  Your Badges
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {INITIAL_BADGES.map((badge) => (
                    <div 
                      key={badge.id} 
                      className={cn(
                        "flex flex-col items-center text-center p-4 rounded-xl border transition-all",
                        badge.unlocked ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 opacity-40 grayscale"
                      )}
                    >
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                        {badge.id === '1' && <Leaf className="w-5 h-5 text-emerald-600" />}
                        {badge.id === '2' && <Utensils className="w-5 h-5 text-orange-600" />}
                        {badge.id === '3' && <Car className="w-5 h-5 text-blue-600" />}
                        {badge.id === '4' && <Zap className="w-5 h-5 text-yellow-600" />}
                      </div>
                      <p className="text-[10px] font-bold leading-tight">{badge.name}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Profile Setup Modal */}
      <AnimatePresence>
        {showProfileSetup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Leaf className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold">Welcome to EcoTrack!</h2>
                <p className="text-slate-500">Let's start by getting to know you. What should we call you?</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Your Name</label>
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. Aaliyah"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <button 
                onClick={handleSaveProfileSetup}
                disabled={!tempName.trim()}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:bg-slate-300 transition-all active:scale-95"
              >
                Complete Registration
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Log Activity</h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-emerald-600" />
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Why track this?</p>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {CATEGORY_EXPLANATIONS[category] || CATEGORY_EXPLANATIONS[type]}
                  </p>
                </div>

                <form onSubmit={handleAddActivity} className="space-y-6">
                  {view === 'sample' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 font-medium">
                      Preview Mode: Logging is disabled. Sign in to save your data!
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Activity Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'commute', icon: Car },
                        { id: 'meal', icon: Utensils },
                        { id: 'electricity', icon: Zap },
                        { id: 'shopping', icon: ShoppingBag },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setType(item.id as Activity['type']);
                            if (item.id === 'commute') setCategory('car');
                            if (item.id === 'meal') setCategory('meat');
                            if (item.id === 'shopping') setCategory('fastFashion');
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                            type === item.id ? "bg-emerald-50 border-emerald-500 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-400"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-[10px] font-bold uppercase">{item.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {type !== 'electricity' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Category</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        {type === 'commute' && (
                          <>
                            <option value="car">Car (Petrol/Diesel)</option>
                            <option value="bus">Public Bus</option>
                            <option value="bike">Bicycle</option>
                            <option value="walking">Walking</option>
                          </>
                        )}
                        {type === 'meal' && (
                          <>
                            <option value="meat">Meat-based Meal</option>
                            <option value="vegetarian">Vegetarian Meal</option>
                            <option value="vegan">Vegan Meal</option>
                          </>
                        )}
                        {type === 'shopping' && (
                          <>
                            <option value="fastFashion">Fast Fashion Item</option>
                            <option value="sustainable">Sustainable Brand Item</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                      {type === 'commute' ? 'Distance (km)' : 
                       type === 'electricity' ? 'Usage (kWh)' : 
                       type === 'shopping' ? 'Number of Items' : 
                       type === 'meal' ? 'Number of Meals/Servings' : 'Quantity'}
                    </label>
                    <input 
                      type="number" 
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={type === 'meal' ? "e.g. 1" : "e.g. 15"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      required
                      disabled={view === 'sample'}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={view === 'sample'}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
                    >
                      Save Activity
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
