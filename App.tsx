
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
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]);
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // --- UI Flow State ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderProductId, setOrderProductId] = useState<string>(() => localStorage.getItem('last_ordered_id') || '');
  
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
      const [prodRes, vidRes, setRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*')
      ]);

      if (prodRes.data) setDbProducts(prodRes.data.map(p => ({ ...p, gallery: Array.isArray(p.gallery) ? p.gallery : [] })));
      if (vidRes.data) setDbVideos(vidRes.data);
      if (setRes.data) {
        setRes.data.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') setSiteLogo(s.value);
        });
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = e => reject(e);
  });

  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.trim().match(regex);
    if (match) return match[1];
    // If it's just the ID (11 chars)
    if (url.trim().length === 11) return url.trim();
    return null;
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("All fields required", "error");
    const vidId = extractYoutubeId(editVideo.url);
    if (!vidId) return showNotify("Invalid YouTube Link", "error");
    
    setIsPublishing(true);
    try {
      const { error } = await supabase.from('videos').upsert({
        id: vidId,
        title: editVideo.title,
        url: `https://www.youtube.com/watch?v=${vidId}`
      });
      if (error) throw error;
      await refreshData();
      setIsEditingVideo(false);
      showNotify("Tutorial Added Successfully");
    } catch (err) { 
      showNotify("Error Saving Video", "error"); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Title & Cover required", "error");
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
      showNotify("Product Published");
    } catch (err) { 
      showNotify("Database Error", "error"); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      await refreshData();
      showNotify("Setting Updated");
    } catch (err) { 
      showNotify("Failed to Update", "error"); 
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

  const handleAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Access Granted");
    } else {
      showNotify("Invalid Password", "error");
    }
  };

  const filteredProducts = useMemo(() => {
    if (activeSection === 'Home') return dbProducts;
    if (activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') {
        return dbProducts.filter(p => p.category === activeSection);
    }
    return dbProducts;
  }, [dbProducts, activeSection]);

  const videos = useMemo(() => dbVideos, [dbVideos]);
  const selectedProduct = useMemo(() => dbProducts.find(p => p.id === selectedProductId), [dbProducts, selectedProductId]);
  const orderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  if (isLoading) return null;

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6">
              <div className="text-center space-y-2">
                <i className="fa-solid fa-lock text-[#007AFF] text-2xl"></i>
                <h3 className="font-black uppercase text-xs tracking-widest">Admin Access</h3>
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
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Products Listing */}
            <section className="space-y-8">
              <div className="flex justify-between items-end px-1">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> {activeSection === 'Home' ? 'Marketplace' : activeSection}
                </h2>
                <span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">{filteredProducts.length} Items</span>
              </div>
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map(p => (
                    <ProductCard 
                      key={p.id} 
                      product={p} 
                      onPreview={(id) => { setSelectedProductId(id); window.location.hash = `#/preview/${id}`; }} 
                      onBuy={(id) => { 
                        setOrderProductId(id); 
                        localStorage.setItem('last_ordered_id', id); 
                        window.location.hash = '#/order'; 
                      }} 
                    />
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] text-zinc-400 font-black uppercase text-xs tracking-widest">
                  No assets available here yet
                </div>
              )}
            </section>
            
            {/* Tutorials Section (Home Only) */}
            {activeSection === 'Home' && (
              <section className="space-y-10">
                <div className="flex justify-between items-end px-1">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full"></div> Video Tutorials
                  </h2>
                </div>
                {videos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {videos.map(v => (
                      <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className="glass-panel group rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all border-2 border-transparent hover:border-red-600/20">
                        <div className="aspect-video relative bg-zinc-900">
                          <img 
                            src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                            <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-125 transition-transform">
                              <i className="fa-solid fa-play ml-1"></i>
                            </div>
                          </div>
                          <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest">
                            Tutorial
                          </div>
                        </div>
                        <div className="p-5">
                            <h4 className="font-black text-sm line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">{v.title}</h4>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] text-zinc-400 font-black uppercase text-[10px] tracking-widest">
                    Tutorials list is empty
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* Order Page */}
        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="glass-panel p-8 sm:p-12 rounded-[3.5rem] space-y-10 relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#007AFF]/10 blur-[80px]"></div>
               <div className="text-center space-y-2">
                 <h2 className="text-4xl font-black tracking-tight uppercase leading-none">Order Page</h2>
                 <p className="text-zinc-400 font-black text-[10px] tracking-[0.4em] uppercase">Confirm & Download</p>
               </div>

               {orderedProduct ? (
                 <div className="space-y-8">
                   <div className="flex items-center gap-6 p-6 bg-zinc-100 dark:bg-zinc-800/50 rounded-[2.5rem] border border-white dark:border-zinc-700 shadow-inner">
                      <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl shrink-0 border-2 border-white dark:border-zinc-600">
                        <img src={orderedProduct.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-2xl tracking-tighter leading-none">{orderedProduct.title}</h3>
                        <p className="text-[#007AFF] font-black text-2xl mt-2">{orderedProduct.price === 0 ? 'FREE' : `${orderedProduct.price.toFixed(2)} EGP`}</p>
                        <span className="inline-block mt-3 px-3 py-1 bg-zinc-200 dark:bg-zinc-700 rounded-full text-[8px] font-black uppercase tracking-widest">{orderedProduct.category}</span>
                      </div>
                   </div>

                   <div className="space-y-4 px-4">
                      <div className="flex justify-between font-black text-xs text-zinc-400 uppercase tracking-widest"><span>Subtotal</span><span className="text-zinc-900 dark:text-zinc-100">{orderedProduct.price.toFixed(2)} EGP</span></div>
                      <div className="flex justify-between font-black text-xs text-zinc-400 uppercase tracking-widest"><span>License Fee</span><span className="text-zinc-900 dark:text-zinc-100">0.00 EGP</span></div>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full my-4"></div>
                      <div className="flex justify-between font-black text-4xl uppercase tracking-tighter items-baseline">
                        <span className="text-sm text-zinc-400">Total Price</span>
                        <span className="text-[#007AFF]">{orderedProduct.price.toFixed(2)} EGP</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-4 pt-4">
                     <a href={`https://wa.me/201026419747?text=I'd like to order: ${orderedProduct.title}`} target="_blank" rel="noopener noreferrer" className="w-full py-6 bg-[#25D366] text-white rounded-[2rem] font-black text-xl shadow-xl shadow-green-500/20 text-center flex items-center justify-center gap-3 transition-transform active:scale-95">
                       <i className="fa-brands fa-whatsapp text-3xl"></i> WhatsApp Confirm
                     </a>
                     <a href="https://t.me/Mohamed_Edge" target="_blank" rel="noopener noreferrer" className="w-full py-6 bg-[#0088CC] text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-500/20 text-center flex items-center justify-center gap-3 transition-transform active:scale-95">
                       <i className="fa-brands fa-telegram text-3xl"></i> Telegram Order
                     </a>
                   </div>
                 </div>
               ) : (
                 <div className="text-center p-20 space-y-6">
                    <i className="fa-solid fa-cart-plus text-7xl text-zinc-200 dark:text-zinc-800"></i>
                    <p className="text-zinc-400 font-black uppercase text-xs tracking-widest">No product selected</p>
                    <button onClick={() => window.location.hash = '#/'} className="px-10 py-4 bg-[#007AFF] text-white rounded-full font-black text-[10px] uppercase shadow-lg transition-transform active:scale-95">Browse Marketplace</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Preview Page */}
        {activeSection === 'Preview' && selectedProduct && (
           <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <button onClick={() => window.history.back()} className="mb-8 w-14 h-14 bg-white dark:bg-zinc-800 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"><i className="fa-solid fa-chevron-left text-lg"></i></button>
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               <div className="lg:col-span-7 space-y-8">
                  <div className="glass-panel p-2 rounded-[3rem] overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl">
                    <img src={selectedProduct.image} className="w-full rounded-[2.5rem]" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {selectedProduct.gallery?.map((img, idx) => (
                      <div key={idx} className="aspect-[9/16] rounded-[2rem] overflow-hidden shadow-xl border-4 border-white dark:border-zinc-800 hover:scale-105 transition-transform duration-500">
                        <img src={img} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
               </div>
               <div className="lg:col-span-5">
                 <div className="glass-panel p-10 sm:p-14 rounded-[3.5rem] space-y-8 sticky top-28 border-2 border-white/50">
                    <div>
                        <span className="px-3 py-1 bg-[#007AFF]/10 text-[#007AFF] rounded-full text-[9px] font-black uppercase tracking-widest">{selectedProduct.category}</span>
                        <h2 className="text-5xl font-black tracking-tighter leading-none mt-4">{selectedProduct.title}</h2>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-6xl font-black text-[#007AFF] tracking-tighter">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price.toFixed(0)}`}</p>
                        <span className="text-xl font-black text-zinc-400">EGP</span>
                    </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full"></div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg leading-relaxed">{selectedProduct.description}</p>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-zinc-500"><i className="fa-solid fa-shield-check text-[#007AFF] text-lg"></i> Official Support</div>
                        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-zinc-500"><i className="fa-solid fa-bolt text-[#007AFF] text-lg"></i> Instant Delivery</div>
                    </div>
                    <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-7 bg-[#007AFF] text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-blue-500/40 active:scale-95 transition-all">Order License</button>
                 </div>
               </div>
             </div>
           </div>
        )}

        {/* Admin Section */}
        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-right-10 duration-500">
            <div className="flex p-2 bg-zinc-200/50 dark:bg-zinc-900/50 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 dark:border-white/5 max-w-lg mx-auto shadow-2xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => (
                <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 px-2 rounded-[2rem] transition-all duration-500 ${adminTab === tab ? 'bg-white dark:bg-zinc-800 shadow-xl text-[#007AFF] font-black scale-105' : 'text-zinc-400 font-bold'} text-[10px] uppercase tracking-widest`}>
                  {tab}
                </button>
              ))}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <div className="glass-panel p-8 rounded-[3rem] flex justify-between items-center shadow-2xl">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Products Cloud</h3>
                  <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] }); setIsEditingProduct(true); }} className="px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all">New Item</button>
                </div>

                {isEditingProduct && (
                  <div className="glass-panel p-10 rounded-[3.5rem] space-y-10 animate-in zoom-in border-4 border-[#007AFF]/10 shadow-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-8">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-2">Main Cover Image</label>
                             <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-[2.5rem] overflow-hidden relative group border-4 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-[#007AFF] transition-colors">
                                {editProduct.image ? (
                                  <img src={editProduct.image} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
                                    <i className="fa-solid fa-cloud-arrow-up text-4xl mb-3"></i>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Select Main Preview</span>
                                  </div>
                                )}
                                <input type="file" accept="image/*" onChange={async e => { 
                                  if(e.target.files?.[0]) { 
                                    const b64 = await fileToBase64(e.target.files[0] as File); 
                                    setEditProduct({...editProduct, image: b64}); 
                                  } 
                                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                             </div>
                          </div>
                          
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-2">Gallery (20 Slots)</label>
                            <div className="grid grid-cols-5 gap-3 min-h-[120px] p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem]">
                               {editProduct.gallery?.map((img, idx) => (
                                 <div key={idx} className="aspect-[9/16] rounded-xl overflow-hidden relative group shadow-md">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button onClick={() => setEditProduct({...editProduct, gallery: editProduct.gallery?.filter((_, i) => i !== idx)})} className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><i className="fa-solid fa-xmark text-xl"></i></button>
                                 </div>
                               ))}
                               {(!editProduct.gallery || editProduct.gallery.length < 20) && (
                                 <div className="aspect-[9/16] rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 relative hover:border-[#007AFF] transition-colors">
                                    <i className="fa-solid fa-plus"></i>
                                    <input type="file" multiple accept="image/*" onChange={async e => {
                                      if(e.target.files) {
                                        const files = Array.from(e.target.files).slice(0, 20 - (editProduct.gallery?.length || 0));
                                        const b64s = await Promise.all(files.map(f => fileToBase64(f as File)));
                                        setEditProduct({...editProduct, gallery: [...(editProduct.gallery || []), ...b64s]});
                                      }
                                    }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                 </div>
                               )}
                            </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-xl" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Asset Name" />
                          <div className="flex gap-4">
                             <div className="flex-1 relative">
                                <input type="number" className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.price || ''} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price" />
                                <span className="absolute right-6 top-6 text-zinc-400 font-black text-[10px]">EGP</span>
                             </div>
                             <select className="flex-1 p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                                <option value="Themes">Themes</option>
                                <option value="Widgets">Widgets</option>
                                <option value="Walls">Wallpapers</option>
                             </select>
                          </div>
                          <textarea className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-medium h-40 outline-none border-2 border-transparent focus:border-[#007AFF] resize-none" placeholder="Features & Compatibility..." value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                          <div className="flex gap-4 pt-6">
                            <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-6 bg-zinc-100 dark:bg-zinc-800 font-black text-[10px] uppercase rounded-3xl active:scale-95 transition-all">Cancel</button>
                            <button onClick={saveProduct} disabled={isPublishing} className="flex-[3] py-6 bg-[#007AFF] text-white font-black text-[10px] uppercase rounded-3xl shadow-2xl shadow-blue-500/30 active:scale-95 transition-all">{isPublishing ? 'Pushing Data...' : 'Save & Sync'}</button>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-6 glass-panel rounded-[2.5rem] flex items-center justify-between group shadow-xl hover:border-[#007AFF]/40 transition-all">
                      <div className="flex items-center gap-6">
                        <img src={p.image} className="w-20 h-20 rounded-2xl object-cover shadow-2xl border-2 border-white dark:border-zinc-700" />
                        <div>
                          <p className="font-black text-xl leading-none">{p.title}</p>
                          <p className="text-[10px] font-black text-[#007AFF] uppercase mt-2 tracking-[0.2em]">{p.category} • {p.price} EGP</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); }} className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center hover:bg-[#007AFF] hover:text-white transition-all"><i className="fa-solid fa-pen-nib text-lg"></i></button>
                        <button onClick={async () => { if(window.confirm("Delete this asset permanently?")) { await supabase.from('products').delete().eq('id', p.id); refreshData(); showNotify("Deleted"); } }} className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can text-lg"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <div className="glass-panel p-8 rounded-[3rem] flex justify-between items-center shadow-2xl">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Tutorials Hub</h3>
                  <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-red-500/20 active:scale-95 transition-all">Add Video</button>
                </div>
                {isEditingVideo && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 animate-in zoom-in border-4 border-red-600/10 shadow-3xl">
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-600" value={editVideo.title || ''} onChange={e => setEditVideo({...editVideo, title: e.target.value})} placeholder="Video Headline" />
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-600" value={editVideo.url || ''} onChange={e => setEditVideo({...editVideo, url: e.target.value})} placeholder="YouTube URL or Video ID" />
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 font-black text-[10px] uppercase rounded-2xl">Cancel</button>
                      <button onClick={saveVideo} className="flex-[3] py-5 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">{isPublishing ? 'Linking...' : 'Add Tutorial'}</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-5">
                  {dbVideos.map(v => (
                    <div key={v.id} className="p-5 glass-panel rounded-[2.5rem] flex items-center justify-between shadow-xl">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-14 rounded-2xl overflow-hidden shadow-2xl border-2 border-white dark:border-zinc-800">
                          <img 
                            src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <span className="font-black text-lg tracking-tight">{v.title}</span>
                      </div>
                      <button onClick={async () => { if(window.confirm("Remove video?")) { await supabase.from('videos').delete().eq('id', v.id); refreshData(); showNotify("Deleted"); } }} className="w-12 h-12 text-red-600 hover:bg-red-600/10 rounded-full transition-all flex items-center justify-center"><i className="fa-solid fa-trash-can text-xl"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="glass-panel p-12 rounded-[4rem] space-y-12 shadow-3xl">
                <div className="space-y-5">
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em] px-4">Master Security Password</label>
                   <input type="password" placeholder="Set New Admin Password" className="w-full p-8 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 font-black border-2 border-transparent focus:border-[#007AFF] outline-none text-xl" onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} />
                </div>
                <div className="space-y-5">
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em] px-4">Global Branding Logo (URL)</label>
                   <div className="flex gap-5">
                     <input type="text" placeholder="https://..." className="flex-1 p-8 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 font-black border-2 border-transparent focus:border-[#007AFF] outline-none" value={siteLogo} onChange={e => setSiteLogo(e.target.value)} />
                     <button onClick={() => updateSetting('site_logo', siteLogo)} className="px-12 bg-[#007AFF] text-white rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl active:scale-95 transition-all">Update</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Notification */}
      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-6 rounded-full font-black text-[10px] uppercase shadow-3xl animate-in fade-in slide-in-from-top-12 flex items-center gap-5 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-2xl`}></i>
          <span className="tracking-widest">{notification.message}</span>
        </div>
      )}

      {/* Bottom Navigation (User View) */}
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
