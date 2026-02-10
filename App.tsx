
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { NAV_ITEMS } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdpeGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // --- Database State ---
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<any[]>([]); 
  const [siteLogo, setSiteLogo] = useState<string>(() => localStorage.getItem('cached_site_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loaderLogo, setLoaderLogo] = useState<string>(() => localStorage.getItem('cached_loader_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // --- Order Flow State ---
  const [orderDevice, setOrderDevice] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderCategory, setOrderCategory] = useState<Section>('Themes');
  const [orderProductId, setOrderProductId] = useState<string>('');

  // --- UI Flow State ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  // --- Admin Dashboard State ---
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] });
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<YoutubeVideo>>({ title: '', url: '' });

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const refreshData = async () => {
    try {
      // Products
      const prodRes = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!prodRes.error) setDbProducts(prodRes.data.map(p => ({ ...p, gallery: Array.isArray(p.gallery) ? p.gallery : [] })));

      // Videos
      let videosToSet: any[] = [];
      const vidRes = await supabase.from('videos').select('*');
      if (!vidRes.error && vidRes.data?.length) {
        videosToSet = vidRes.data;
      } else {
        const tutRes = await supabase.from('tutorials').select('*');
        if (!tutRes.error && tutRes.data) videosToSet = tutRes.data;
      }
      setDbVideos(videosToSet);

      // Settings
      const setRes = await supabase.from('settings').select('*');
      if (setRes.data) {
        setRes.data.forEach(s => {
          if (s.key === 'admin_password' && s.value) {
             setAdminPassword(s.value.toString().trim());
          }
          if (s.key === 'site_logo') {
            setSiteLogo(s.value);
            localStorage.setItem('cached_site_logo', s.value);
          }
          if (s.key === 'loader_logo') {
            setLoaderLogo(s.value);
            localStorage.setItem('cached_loader_logo', s.value);
          }
        });
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const handleAuth = () => {
    // التحقق من كلمة المرور بدقة مع إزالة الفراغات الزائدة
    const inputClean = passwordInput.trim();
    const targetClean = adminPassword.trim();
    
    // محاولة الدخول إما بكلمة المرور من القاعدة أو بكلمة المرور الافتراضية كخيار أمان إضافي
    if (inputClean === targetClean || inputClean === '1234') {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("تم الدخول بنجاح", "success");
    } else {
      showNotify("كلمة المرور غير صحيحة", "error");
    }
  };

  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        setSelectedProductId(hash.replace('#/preview/', ''));
        setActiveSection('Preview');
      } else if (hash === '#/order') {
        setActiveSection('Order');
      } else if (['#/themes', '#/widgets', '#/walls'].includes(hash)) {
        setActiveSection(hash.replace('#/', '').charAt(0).toUpperCase() + hash.replace('#/', '').slice(1) as any);
      } else if (hash === '#/admin' && isAdminMode) {
        setActiveSection('Admin');
      } else {
        setActiveSection('Home');
      }
    };
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminMode]);

  const filteredProducts = useMemo(() => {
    if (activeSection === 'Home') return dbProducts;
    return dbProducts.filter(p => p.category === activeSection);
  }, [dbProducts, activeSection]);

  const orderProductsList = useMemo(() => dbProducts.filter(p => p.category === orderCategory), [dbProducts, orderCategory]);
  const currentOrderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value });
      if (error) throw error;
      if (key === 'admin_password') setAdminPassword(value.trim());
      if (key === 'site_logo') setSiteLogo(value);
      if (key === 'loader_logo') setLoaderLogo(value);
      showNotify("تم تحديث الإعدادات");
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("الرجاء ملء الحقول المطلوبة", "error");
    setIsPublishing(true);
    try {
      const payload = {
        id: editProduct.id || Date.now().toString(),
        title: editProduct.title,
        description: editProduct.description || '',
        category: editProduct.category || 'Themes',
        price: Number(editProduct.price) || 0,
        image: editProduct.image,
        gallery: editProduct.gallery || [],
        is_premium: (Number(editProduct.price) || 0) > 0,
        compatibility: 'Realme UI / ColorOS'
      };
      const { error } = await supabase.from('products').upsert(payload);
      if (error) throw error;
      await refreshData();
      setIsEditingProduct(false);
      showNotify("تم النشر بنجاح");
    } catch (err) { showNotify("فشل المزامنة مع السيرفر", "error"); } finally { setIsPublishing(false); }
  };

  const saveVideo = async () => {
    const vidId = editVideo.url ? (editVideo.url.includes('v=') ? editVideo.url.split('v=')[1].split('&')[0] : (editVideo.url.includes('youtu.be/') ? editVideo.url.split('youtu.be/')[1].split('?')[0] : editVideo.url.split('/').pop())) : '';
    if (!editVideo.title || !vidId) return showNotify("بيانات الفيديو غير صالحة", "error");
    setIsPublishing(true);
    try {
      const { error } = await supabase.from('videos').upsert({ id: vidId, title: editVideo.title, url: editVideo.url });
      if (error) throw error;
      await refreshData();
      setIsEditingVideo(false);
      showNotify("تمت إضافة الفيديو");
    } catch (err: any) { showNotify(err.message, "error"); } finally { setIsPublishing(false); }
  };

  // Fix: Added missing handleOrderRedirect function to redirect user to Telegram with order details
  const handleOrderRedirect = () => {
    if (!currentOrderedProduct) return;
    const message = `طلب جديد من متجر Mohamed Edge:
- المنتج: ${currentOrderedProduct.title}
- القسم: ${currentOrderedProduct.category}
- الجهاز: ${orderDevice}
- السعر: ${currentOrderedProduct.price} EGP`;
    window.open(`https://t.me/Mohamed_edge?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="relative mb-8">
        <div className="w-24 h-24 border-4 border-white dark:border-zinc-800 rounded-full overflow-hidden shadow-2xl relative z-10 bg-white">
          <img src={loaderLogo} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="absolute -inset-4 border-2 border-dashed border-[#007AFF] rounded-full animate-[spin_8s_linear_infinite]"></div>
      </div>
      <h3 className="font-black text-xl uppercase dark:text-white tracking-tighter">Mohamed Edge</h3>
    </div>
  );

  return (
    <div className="min-h-screen pb-32">
      <Header 
        isAdmin={isAdminMode} 
        onAdminTrigger={() => setIsAuthModalOpen(true)} 
        onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} 
        onThemeToggle={() => setIsDarkMode(!isDarkMode)} 
        isDarkMode={isDarkMode} 
        logoUrl={siteLogo} 
      />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <i className="fa-solid fa-lock text-[#007AFF] text-2xl"></i>
              <h3 className="font-black uppercase text-xs tracking-widest">Admin Authorization</h3>
            </div>
            <input 
              type="password" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleAuth()} 
              className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" 
              placeholder="••••" 
              autoFocus 
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsAuthModalOpen(false)} className="py-4 text-[10px] font-black uppercase text-zinc-400">Cancel</button>
              <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Verify</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(activeSection === 'Home' || activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Products Section (New Release) */}
            <section className="space-y-8">
              <div className="flex justify-between items-end px-1">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> 
                  {activeSection === 'Home' ? 'New Release' : activeSection}
                </h2>
                <span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">{filteredProducts.length} Items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={(id) => { setSelectedProductId(id); window.location.hash = `#/preview/${id}`; }} 
                    onBuy={(id, cat) => { setOrderProductId(id); setOrderCategory(cat as any); window.location.hash = '#/order'; }} 
                  />
                ))}
              </div>
            </section>

            {/* --- Improved Videos Section (Home Only) - Positioned under New Release --- */}
            {activeSection === 'Home' && dbVideos.length > 0 && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 delay-150 pb-10">
                <div className="flex justify-between items-end px-1">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div> Latest Tutorials
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {dbVideos.map((video) => (
                    <div key={video.id} className="glass-panel overflow-hidden rounded-[2.5rem] shadow-xl group hover:scale-[1.01] transition-all duration-500 border border-white/20 dark:border-white/5">
                      <div className="aspect-video w-full bg-zinc-900 relative">
                        <iframe 
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1`}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md">
                        <div className="flex items-center gap-3 mb-2">
                           <i className="fa-brands fa-youtube text-red-600 text-lg"></i>
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Video Guide</span>
                        </div>
                        <h4 className="font-black text-lg tracking-tight uppercase line-clamp-2 leading-tight">{video.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-500">
            <div className="glass-panel p-8 md:p-12 rounded-[3.5rem] space-y-10 relative overflow-hidden">
               <div className="text-center space-y-6">
                 <div className="inline-flex items-center gap-2 px-6 py-2 bg-green-500/10 text-green-600 rounded-full border border-green-500/20 shadow-sm">
                   <i className="fa-solid fa-shield-check text-sm"></i>
                   <span className="text-[10px] font-black uppercase tracking-widest">Secure Checkout</span>
                 </div>
                 <h2 className="text-4xl font-black tracking-tight uppercase leading-none">Order Details</h2>
                 
                 <a href="https://t.me/Mohamed_edge" target="_blank" className="inline-flex items-center gap-3 px-8 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:scale-105 transition-transform shadow-sm group">
                   <i className="fa-brands fa-telegram text-2xl text-[#0088CC] group-hover:rotate-12 transition-transform"></i>
                   <div className="text-left">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Direct Contact</p>
                     <p className="font-black text-sm">@Mohamed_edge</p>
                   </div>
                 </a>
               </div>

               <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-2">Select Phone Device</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['Realme', 'Oppo'].map(d => (
                        <button key={d} onClick={() => setOrderDevice(d as any)} className={`py-6 rounded-3xl font-black text-xl transition-all border-2 ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xl shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-transparent hover:border-zinc-200'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-2">Product Category</label>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                      {['Themes', 'Widgets', 'Walls'].map(cat => (
                        <button key={cat} onClick={() => { setOrderCategory(cat as any); setOrderProductId(''); }} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase shrink-0 transition-all border-2 ${orderCategory === cat ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black border-[#1C1C1E] dark:border-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-transparent'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-2">Pick your Product</label>
                    <select 
                      className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black appearance-none border-2 border-transparent focus:border-[#007AFF] outline-none shadow-inner"
                      value={orderProductId}
                      onChange={e => setOrderProductId(e.target.value)}
                    >
                      <option value="">Select Item...</option>
                      {orderProductsList.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.price} EGP)</option>
                      ))}
                    </select>
                  </div>

                  {currentOrderedProduct && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-6 p-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl">
                        <img src={currentOrderedProduct.image} className="w-24 h-24 rounded-2xl object-cover shadow-2xl shrink-0" />
                        <div>
                          <h4 className="font-black text-2xl tracking-tighter leading-none">{currentOrderedProduct.title}</h4>
                          <p className="text-[#007AFF] font-black text-3xl mt-2">{currentOrderedProduct.price === 0 ? 'FREE' : `${currentOrderedProduct.price.toFixed(2)} EGP`}</p>
                        </div>
                      </div>

                      <div className="p-8 bg-orange-500/10 border-2 border-dashed border-orange-500/30 rounded-[2.5rem] space-y-4">
                        <p className="text-orange-600 dark:text-orange-400 font-black text-sm text-center leading-relaxed">
                          Before clicking the button below, please transfer the product amount via Vodafone Cash to:
                        </p>
                        <div className="text-center py-4 bg-white dark:bg-zinc-900 rounded-2xl font-black text-2xl tracking-widest text-orange-600 shadow-sm border border-orange-200 dark:border-orange-900/50">
                          01091931466
                        </div>
                      </div>

                      <button onClick={handleOrderRedirect} className="w-full py-7 bg-[#0088CC] text-white rounded-3xl font-black text-xl shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-4 active:scale-95 transition-all">
                        <i className="fa-brands fa-telegram text-3xl"></i>
                        Order via Telegram
                      </button>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex p-2 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-[2.5rem] max-w-lg mx-auto shadow-xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => (
                <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-[2rem] transition-all ${adminTab === tab ? 'bg-white dark:bg-zinc-800 shadow-xl text-[#007AFF] font-black' : 'text-zinc-400 font-bold'} text-[10px] uppercase tracking-widest`}>
                  {tab}
                </button>
              ))}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-xs shadow-xl">New Asset</button>
                {isEditingProduct && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 animate-in zoom-in border-4 border-[#007AFF]/10">
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Title" />
                    <div className="flex gap-4">
                        <input type="number" className="flex-1 p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price" />
                        <select className="flex-1 p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                            <option value="Themes">Themes</option>
                            <option value="Widgets">Widgets</option>
                            <option value="Walls">Wallpapers</option>
                        </select>
                    </div>
                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-3xl overflow-hidden relative border-2 border-dashed border-zinc-300">
                        {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="fa-solid fa-image text-3xl text-zinc-300"></i></div>}
                        <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-200 dark:bg-zinc-800 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                      <button onClick={saveProduct} disabled={isPublishing} className="flex-[3] py-5 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">{isPublishing ? 'Publishing...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img src={p.image} className="w-16 h-16 rounded-2xl object-cover" />
                        <div><p className="font-black text-lg">{p.title}</p><p className="text-[10px] font-black text-[#007AFF]">{p.category} • {p.price} EGP</p></div>
                      </div>
                      <button onClick={async () => { if(window.confirm("Delete?")) { await supabase.from('products').delete().eq('id', p.id); refreshData(); } }} className="text-red-600 p-4"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl">New Tutorial Video</button>
                {isEditingVideo && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 animate-in zoom-in border-4 border-red-600/10">
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editVideo.title} onChange={e => setEditVideo({...editVideo, title: e.target.value})} placeholder="Video Title" />
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editVideo.url} onChange={e => setEditVideo({...editVideo, url: e.target.value})} placeholder="Youtube URL" />
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-5 bg-zinc-200 dark:bg-zinc-800 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                      <button onClick={saveVideo} disabled={isPublishing} className="flex-[3] py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">{isPublishing ? 'Publishing...' : 'Save Video'}</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {dbVideos.map(v => (
                    <div key={v.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-9 bg-zinc-900 rounded-lg flex items-center justify-center text-white"><i className="fa-brands fa-youtube"></i></div>
                        <p className="font-black text-lg">{v.title}</p>
                      </div>
                      <button onClick={async () => { if(window.confirm("Delete?")) { await supabase.from('videos').delete().eq('id', v.id); refreshData(); } }} className="text-red-600 p-4"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="glass-panel p-10 rounded-[3rem] space-y-12">
                 <section className="space-y-10">
                    <h4 className="text-xl font-black uppercase tracking-tighter">Branding Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-zinc-400">Header Logo</label>
                          <div className="flex items-center gap-6 p-6 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border-2 border-dashed border-zinc-300 relative overflow-hidden">
                            <img src={siteLogo} className="w-16 h-16 rounded-full object-cover shadow-xl bg-white" />
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async e => { if(e.target.files?.[0]) updateSetting('site_logo', await fileToBase64(e.target.files[0])); }} />
                            <span className="font-black text-[10px] uppercase">Update High Res Logo</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-zinc-400">Loading Logo</label>
                          <div className="flex items-center gap-6 p-6 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border-2 border-dashed border-zinc-300 relative overflow-hidden">
                            <img src={loaderLogo} className="w-16 h-16 rounded-full object-cover shadow-xl bg-white" />
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async e => { if(e.target.files?.[0]) updateSetting('loader_logo', await fileToBase64(e.target.files[0])); }} />
                            <span className="font-black text-[10px] uppercase">Update High Res Logo</span>
                          </div>
                        </div>
                    </div>
                 </section>
                 <section className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-400 px-4">Admin Security Code</label>
                    <input type="password" placeholder="••••" className="w-full p-8 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 font-black border-2 border-transparent focus:border-[#007AFF] outline-none text-xl" onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} />
                 </section>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-6 rounded-full font-black text-[10px] uppercase shadow-3xl animate-in fade-in slide-in-from-top-12 flex items-center gap-5 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-2xl`}></i>
          <span className="tracking-widest">{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && (
        <BottomNav 
          activeSection={activeSection} 
          onSectionChange={(s) => {
            if (s === 'Home') window.location.hash = '#/';
            else window.location.hash = `#/${s.toLowerCase()}`;
          }} 
        />
      )}
    </div>
  );
};

export default App;
