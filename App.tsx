
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
  const [siteLogo, setSiteLogo] = useState<string>(() => localStorage.getItem('cached_loading_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
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
      const prodRes = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (prodRes.error) console.error("Products Fetch Error:", prodRes.error.message);
      else setDbProducts(prodRes.data.map(p => ({ ...p, gallery: Array.isArray(p.gallery) ? p.gallery : [] })));

      const vidRes = await supabase.from('videos').select('*');
      if (vidRes.error) {
          console.error("Videos Table Error:", vidRes.error.message);
          const tutRes = await supabase.from('tutorials').select('*');
          if (!tutRes.error) setDbVideos(tutRes.data);
      } else {
          setDbVideos(vidRes.data || []);
      }

      const setRes = await supabase.from('settings').select('*');
      if (setRes.data) {
        setRes.data.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') {
            setSiteLogo(s.value);
            localStorage.setItem('cached_loading_logo', s.value);
          }
        });
      }
    } catch (err) {
      console.error("Critical Sync Failure:", err);
    } finally {
      // Delaying slightly for a smoother transition from loader
      setTimeout(() => setIsLoading(false), 800);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = cleanUrl.match(regex);
    if (match && match[1]) return match[1];
    if (cleanUrl.length === 11) return cleanUrl;
    return null;
  };

  const saveVideo = async () => {
    const vidId = extractYoutubeId(editVideo.url || '');
    if (!editVideo.title || !vidId) {
      return showNotify("Please provide a valid Title and YouTube Link", "error");
    }
    
    setIsPublishing(true);
    try {
      const payload = {
        id: vidId,
        title: editVideo.title,
        url: `https://www.youtube.com/watch?v=${vidId}`
      };

      const { error } = await supabase.from('videos').upsert(payload);
      if (error) {
        const { error: error2 } = await supabase.from('tutorials').upsert(payload);
        if (error2) throw error2;
      }
      
      await refreshData();
      setIsEditingVideo(false);
      showNotify("Tutorial Synced Successfully");
    } catch (err: any) { 
      console.error("Save Video Error:", err.message);
      showNotify(`Database Error: ${err.message}`, "error"); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  const getVideoId = (v: any) => v.id || v.youtube_id || extractYoutubeId(v.url);

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
      showNotify("Asset published to marketplace");
    } catch (err) { 
      showNotify("Database synchronization error", "error"); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      if (key === 'site_logo') localStorage.setItem('cached_loading_logo', value);
      await refreshData();
      showNotify("Setting updated in cloud");
    } catch (err) { 
      showNotify("Failed to save settings", "error"); 
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
      showNotify("Incorrect security code", "error");
    }
  };

  const filteredProducts = useMemo(() => {
    if (activeSection === 'Home') return dbProducts;
    if (activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') {
        return dbProducts.filter(p => p.category === activeSection);
    }
    return dbProducts;
  }, [dbProducts, activeSection]);

  const orderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  if (isLoading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-in fade-in duration-500">
          <div className="relative mb-8">
              <div className="w-24 h-24 md:w-32 md:h-32 border-4 border-white dark:border-zinc-800 rounded-full overflow-hidden shadow-2xl relative z-10 bg-white">
                  <img src={siteLogo} className="w-full h-full object-cover" alt="Logo" />
              </div>
              <div className="absolute -inset-4 border-2 border-dashed border-[#007AFF] rounded-full animate-[spin_8s_linear_infinite]"></div>
          </div>
          <div className="text-center space-y-2">
              <h3 className="font-black text-xl md:text-2xl tracking-tighter uppercase dark:text-white">Mohamed Edge</h3>
              <p className="font-black text-[9px] uppercase tracking-[0.4em] text-zinc-400">Syncing Marketplace...</p>
          </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-3xl">
              <div className="text-center space-y-2">
                <i className="fa-solid fa-lock text-[#007AFF] text-2xl"></i>
                <h3 className="font-black uppercase text-xs tracking-widest">Master Admin</h3>
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
            {/* Products Marketplace */}
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
                      onBuy={(id) => { setOrderProductId(id); localStorage.setItem('last_ordered_id', id); window.location.hash = '#/order'; }} 
                    />
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] text-zinc-400 font-black uppercase text-xs tracking-widest">
                   No {activeSection} found in database
                </div>
              )}
            </section>
            
            {/* Video Tutorials Section */}
            {activeSection === 'Home' && (
              <section className="space-y-8">
                <div className="flex justify-between items-end px-1">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full"></div> Video Tutorials
                  </h2>
                </div>
                {dbVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {dbVideos.map(v => {
                      const vId = getVideoId(v);
                      if (!vId) return null;
                      return (
                        <a key={vId} href={v.url || `https://youtube.com/watch?v=${vId}`} target="_blank" rel="noopener noreferrer" className="glass-panel group rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all border-2 border-transparent hover:border-red-600/20 shadow-lg">
                          <div className="aspect-video relative bg-zinc-900">
                            <img 
                              src={`https://img.youtube.com/vi/${vId}/maxresdefault.jpg`} 
                              className="w-full h-full object-cover" 
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://img.youtube.com/vi/${vId}/hqdefault.jpg`; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-125 transition-transform">
                                <i className="fa-solid fa-play ml-1"></i>
                              </div>
                            </div>
                          </div>
                          <div className="p-5">
                              <h4 className="font-black text-sm line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">{v.title || 'Untitled Tutorial'}</h4>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem] text-zinc-400 font-black uppercase text-[10px] tracking-widest">
                    No tutorials available on this cloud project
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="glass-panel p-8 sm:p-12 rounded-[3.5rem] space-y-10 relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#007AFF]/10 blur-[80px]"></div>
               <div className="text-center space-y-2">
                 <h2 className="text-4xl font-black tracking-tight uppercase leading-none">Order Details</h2>
                 <p className="text-zinc-400 font-black text-[10px] tracking-[0.4em] uppercase">Complete your purchase</p>
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
                      </div>
                   </div>
                   <div className="grid grid-cols-1 gap-4 pt-4">
                     <a href={`https://wa.me/201026419747?text=I'd like to order: ${orderedProduct.title}`} target="_blank" className="w-full py-6 bg-[#25D366] text-white rounded-[2rem] font-black text-xl shadow-xl shadow-green-500/20 text-center flex items-center justify-center gap-3 active:scale-95 transition-transform">
                       <i className="fa-brands fa-whatsapp text-3xl"></i> WhatsApp Confirm
                     </a>
                     <a href="https://t.me/Mohamed_Edge" target="_blank" className="w-full py-6 bg-[#0088CC] text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-500/20 text-center flex items-center justify-center gap-3 active:scale-95 transition-transform">
                       <i className="fa-brands fa-telegram text-3xl"></i> Telegram Order
                     </a>
                   </div>
                 </div>
               ) : (
                 <div className="text-center p-20 space-y-6">
                    <i className="fa-solid fa-cart-shopping text-7xl text-zinc-200 dark:text-zinc-800"></i>
                    <p className="text-zinc-400 font-black uppercase text-xs tracking-widest">No selection made</p>
                    <button onClick={() => window.location.hash = '#/'} className="px-10 py-4 bg-[#007AFF] text-white rounded-full font-black text-[10px] uppercase shadow-lg">Browse Marketplace</button>
                 </div>
               )}
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
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Marketplace Cloud</h3>
                  <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] }); setIsEditingProduct(true); }} className="px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">New Asset</button>
                </div>
                
                {isEditingProduct && (
                  <div className="glass-panel p-10 rounded-[3.5rem] space-y-10 animate-in zoom-in border-4 border-[#007AFF]/10 shadow-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <label className="text-[10px] font-black uppercase text-zinc-400 px-2">Main Cover</label>
                            <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] overflow-hidden relative border-2 border-dashed border-zinc-300">
                                {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="fa-solid fa-image text-3xl text-zinc-300"></i></div>}
                                <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Asset Title" />
                            <div className="flex gap-4">
                                <input type="number" className="flex-1 p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price" />
                                <select className="flex-1 p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                                    <option value="Themes">Themes</option>
                                    <option value="Widgets">Widgets</option>
                                    <option value="Walls">Wallpapers</option>
                                </select>
                            </div>
                            <textarea className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-medium h-32 outline-none" placeholder="Description" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-200 dark:bg-zinc-800 rounded-3xl font-black uppercase text-[10px]">Discard</button>
                                <button onClick={saveProduct} disabled={isPublishing} className="flex-[2] py-5 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-[10px] shadow-lg">{isPublishing ? 'Linking...' : 'Save Asset'}</button>
                            </div>
                        </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-6 glass-panel rounded-[2.5rem] flex items-center justify-between group shadow-xl">
                      <div className="flex items-center gap-6">
                        <img src={p.image} className="w-20 h-20 rounded-2xl object-cover shadow-2xl border-2 border-white dark:border-zinc-700" />
                        <div>
                          <p className="font-black text-xl leading-none">{p.title}</p>
                          <p className="text-[10px] font-black text-[#007AFF] uppercase mt-2 tracking-widest">{p.category} • {p.price} EGP</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); }} className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={async () => { if(window.confirm("Remove asset?")) { await supabase.from('products').delete().eq('id', p.id); refreshData(); showNotify("Removed"); } }} className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <div className="glass-panel p-8 rounded-[3rem] flex justify-between items-center shadow-2xl">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Tutorial Hub</h3>
                  <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">New Video</button>
                </div>
                
                {isEditingVideo && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 animate-in zoom-in border-4 border-red-600/10 shadow-3xl">
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-600" value={editVideo.title} onChange={e => setEditVideo({...editVideo, title: e.target.value})} placeholder="Video Headline" />
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-600" value={editVideo.url} onChange={e => setEditVideo({...editVideo, url: e.target.value})} placeholder="YouTube Link or Shorts Link" />
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 font-black text-[10px] uppercase rounded-2xl">Cancel</button>
                      <button onClick={saveVideo} disabled={isPublishing} className="flex-[3] py-5 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">{isPublishing ? 'Processing...' : 'Add Video'}</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5">
                  {dbVideos.length > 0 ? dbVideos.map(v => {
                    const vidId = getVideoId(v);
                    return (
                      <div key={vidId || Math.random()} className="p-5 glass-panel rounded-[2.5rem] flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-14 rounded-2xl overflow-hidden shadow-2xl border-2 border-white dark:border-zinc-800 bg-zinc-800">
                            {vidId && <img src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-lg tracking-tight">{v.title || 'Untitled'}</span>
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{vidId || 'ID Pending'}</span>
                          </div>
                        </div>
                        <button onClick={async () => { if(window.confirm("Remove video?")) { await supabase.from('videos').delete().eq('id', vidId); await supabase.from('tutorials').delete().eq('id', vidId); refreshData(); showNotify("Deleted"); } }} className="w-12 h-12 text-red-600 flex items-center justify-center hover:bg-red-600/10 rounded-full transition-colors"><i className="fa-solid fa-trash-can text-xl"></i></button>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-24 glass-panel rounded-[3rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                        <p className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">No Cloud Data for Tutorials</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="glass-panel p-12 rounded-[4rem] space-y-12 shadow-3xl">
                <div className="space-y-5">
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em] px-4">Master Password</label>
                   <input type="password" placeholder="New Admin Pass" className="w-full p-8 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 font-black border-2 border-transparent focus:border-[#007AFF] outline-none text-xl" onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} />
                </div>
                <div className="space-y-5">
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em] px-4">Branding Logo (URL)</label>
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

      {/* Bottom Navigation */}
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
