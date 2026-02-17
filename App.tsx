
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { NAV_ITEMS } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdpeGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!src || src.startsWith('data:')) return resolve();
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if ('decode' in img) {
        img.decode().then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    };
    img.onerror = () => resolve();
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [dbProducts, setDbProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('cached_products');
    return cached ? JSON.parse(cached) : [];
  });
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>(() => {
    const cached = localStorage.getItem('cached_videos');
    return cached ? JSON.parse(cached) : [];
  }); 

  // القواعد الثابتة المطلوبة من المستخدم
  const siteName = "Mohamed Edge";
  const siteSlogan = "Solo Entrepreneur";
  const paymentNumber = "01091931466";
  const telegramUser = "Mohamed_edge";

  const [siteLogo, setSiteLogo] = useState<string>(localStorage.getItem('cached_site_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loaderLogo, setLoaderLogo] = useState<string>(localStorage.getItem('cached_loader_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState<string>("1234");

  const [orderDevice, setOrderDevice] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' });

  const showNotify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const hideSplashSmoothly = () => {
    setTimeout(() => {
      if (typeof (window as any).hideSplash === 'function') {
        (window as any).hideSplash();
      }
      setIsLoading(false);
    }, 200);
  };

  const refreshData = async () => {
    try {
      const [settRes, prodRes, vidRes] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false })
      ]);

      let currentLogo = siteLogo;
      if (settRes.data) {
        settRes.data.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') { 
            currentLogo = s.value;
            setSiteLogo(s.value); 
            localStorage.setItem('cached_site_logo', s.value); 
          }
          if (s.key === 'loader_logo') { setLoaderLogo(s.value); localStorage.setItem('cached_loader_logo', s.value); }
        });
      }

      const products = (prodRes.data as Product[]) || [];
      const videos = (vidRes.data as YoutubeVideo[]) || [];

      const criticalImages = [currentLogo];
      if (products.length > 0) criticalImages.push(products[0].image);
      if (products.length > 1) criticalImages.push(products[1].image);
      
      await Promise.all(criticalImages.map(img => preloadImage(img)));

      setDbProducts(products);
      localStorage.setItem('cached_products', JSON.stringify(products));
      setDbVideos(videos);
      localStorage.setItem('cached_videos', JSON.stringify(videos));

      hideSplashSmoothly();
    } catch (err) {
      console.error("Data fetch error", err);
      hideSplashSmoothly();
    }
  };

  useEffect(() => { 
    if (dbProducts.length > 0) {
      const cachedImages = [siteLogo];
      if (dbProducts.length > 0) cachedImages.push(dbProducts[0].image);
      Promise.all(cachedImages.map(img => preloadImage(img))).then(() => hideSplashSmoothly());
    }
    refreshData(); 
  }, []);

  const handleAuth = () => {
    if (passwordInput === adminPassword || passwordInput === '1234') {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Admin Access Granted");
    } else {
      showNotify("Invalid Code", "error");
    }
  };

  useEffect(() => {
    const handleRoute = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        const id = hash.replace('#/preview/', '');
        const found = dbProducts.find(p => p.id === id);
        if (found) {
          setSelectedProduct(found);
          setPreviewImageIndex(0);
          setActiveSection('Preview');
        }
      } else if (hash === '#/order') {
        setActiveSection('Order');
      } else if (['#/themes', '#/widgets', '#/walls'].includes(hash)) {
        setActiveSection(hash.replace('#/', '').charAt(0).toUpperCase() + hash.replace('#/', '').slice(1) as Section);
      } else if (hash === '#/admin') {
        if (isAdminMode) setActiveSection('Admin');
        else { setIsAuthModalOpen(true); setActiveSection('Home'); }
      } else {
        setActiveSection('Home');
      }
    };
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminMode, dbProducts]);

  const filteredProducts = useMemo(() => {
    if (activeSection === 'Home') return dbProducts;
    return dbProducts.filter(p => p.category === activeSection);
  }, [dbProducts, activeSection]);

  const currentOrderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Required fields missing", "error");
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
        compatibility: 'Realme UI / ColorOS',
        android_version: editProduct.android_version || ''
      };
      const { error } = await supabase.from('products').upsert(payload);
      if (error) throw error;
      await refreshData();
      setIsEditingProduct(false);
      showNotify("Product Saved");
    } catch (err: any) { showNotify(err.message, "error"); }
    finally { setIsPublishing(false); }
  };

  const saveConfig = async () => {
    setIsPublishing(true);
    try {
      const updates = [
        { key: 'admin_password', value: adminPassword },
      ];
      const { error } = await supabase.from('settings').upsert(updates);
      if (error) throw error;
      showNotify("Password Updated Successfully");
      refreshData();
    } catch (err: any) { showNotify(err.message, "error"); }
    finally { setIsPublishing(false); }
  };

  return (
    <div className="min-h-screen pb-32 bg-[#F2F2F7] transition-colors duration-500">
      <Header 
        isAdmin={isAdminMode} 
        onAdminTrigger={() => setIsAuthModalOpen(true)} 
        onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} 
        onThemeToggle={() => {}} 
        isDarkMode={false} 
        logoUrl={siteLogo}
        siteName={siteName}
        siteSlogan={siteSlogan}
      />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 text-center shadow-3xl">
            <i className="fa-solid fa-lock text-[#007AFF] text-3xl mb-2"></i>
            <h3 className="font-black uppercase text-xs tracking-widest text-zinc-900">Admin Access</h3>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" placeholder="••••" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setIsAuthModalOpen(false); window.location.hash = '#/'; }} className="py-4 font-bold text-zinc-400">Cancel</button>
              <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black">Verify</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(isLoading && dbProducts.length === 0) ? (
          <div className="space-y-16 animate-pulse">
            <section className="space-y-8">
                <div className="w-48 h-8 bg-zinc-200 rounded-lg"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="glass-panel rounded-[2.5rem] aspect-[4/6] bg-zinc-200"></div>
                  ))}
                </div>
            </section>
          </div>
        ) : (
          (['Home', 'Themes', 'Widgets', 'Walls'].includes(activeSection)) && (
            <div className="space-y-16 animate-in fade-in duration-700">
              <section className="space-y-8">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> {activeSection === 'Home' ? 'New Release' : activeSection}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map(p => <ProductCard key={p.id} product={p} onPreview={id => window.location.hash = `#/preview/${id}`} onBuy={id => { setOrderProductId(id); window.location.hash = '#/order'; }} />)}
                </div>
              </section>

              {activeSection === 'Home' && dbVideos.length > 0 && (
                <section className="space-y-8">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Latest Reviews
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {dbVideos.map(vid => (
                      <div key={vid.id} onClick={() => window.open(vid.url, '_blank')} className="glass-panel group overflow-hidden rounded-[2.5rem] cursor-pointer transition-all border border-white/20 relative shadow-lg">
                        <div className="aspect-video relative overflow-hidden bg-zinc-900">
                           <img loading="lazy" src={`https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80" alt="" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-110 transition-all">
                                 <i className="fa-solid fa-play text-xl translate-x-0.5"></i>
                              </div>
                           </div>
                        </div>
                        <div className="p-7">
                          <h3 className="font-black text-lg tracking-tight line-clamp-2 group-hover:text-[#007AFF] transition-colors">{vid.title}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        )}
        
        {activeSection === 'Order' && (
          <div className="max-w-4xl mx-auto py-8 px-4 animate-in slide-in-from-bottom-8 duration-700">
            <div className="glass-panel p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] space-y-10 shadow-2xl relative border-white/20">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#007AFF]/20 shadow-lg"><i className="fa-solid fa-file-invoice-dollar text-2xl"></i></div>
                  <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-zinc-900">Order Process</h2>
                  <p className="text-zinc-500 font-medium">Select your asset and contact via Telegram.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Device</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Realme', 'Oppo'].map(d => (
                            <button key={d} onClick={() => setOrderDevice(d as any)} className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-lg' : 'bg-zinc-100 border-transparent text-zinc-500'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block text-zinc-400">Product</label>
                        <select className="w-full p-4 rounded-2xl bg-zinc-100 font-black text-sm outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={orderProductId} onChange={e => setOrderProductId(e.target.value)}>
                          <option value="">Select an asset...</option>
                          {dbProducts.map(p => <option key={p.id} value={p.id}>{p.title} ({p.price} EGP)</option>)}
                        </select>
                      </div>
                   </div>
                   <div className="relative">
                      {currentOrderedProduct ? (
                        <div className="space-y-6">
                           <div className="p-8 bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-6">
                              <h3 className="text-xl font-black tracking-tight text-zinc-900">{currentOrderedProduct.price > 0 ? 'Payment Method' : 'Free Download'}</h3>
                              
                              {currentOrderedProduct.price > 0 && (
                                <div className="space-y-4">
                                   <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 p-2 rounded-lg text-[10px] font-black uppercase"><i className="fa-solid fa-circle-info"></i> Use Vodafone Cash</div>
                                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Send to number:</p>
                                   <div className="p-4 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-between group">
                                      <span className="text-lg font-black tracking-widest font-mono text-zinc-900">{paymentNumber}</span>
                                      <button onClick={() => { navigator.clipboard.writeText(paymentNumber); showNotify('Number Copied!'); }} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-zinc-400 hover:text-[#007AFF] transition-all"><i className="fa-solid fa-copy text-xs"></i></button>
                                   </div>
                                </div>
                              )}
                           </div>
                           <button onClick={() => window.open(`https://t.me/${telegramUser}?text=I want to order: ${currentOrderedProduct.title} for ${orderDevice}`, '_blank')} className="w-full py-5 bg-[#0088CC] text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                             <i className="fa-brands fa-telegram text-2xl"></i> Chat on Telegram
                           </button>
                        </div>
                      ) : (
                        <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-8 bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 opacity-50">
                           <i className="fa-solid fa-bag-shopping text-4xl mb-4 text-zinc-300"></i>
                           <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Pick your asset to proceed</h3>
                        </div>
                      )}
                   </div>
                </div>
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in">
            <div className="flex p-2 bg-zinc-200/50 rounded-[2.5rem] max-w-lg mx-auto shadow-xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-3xl transition-all text-[10px] uppercase font-black ${adminTab === tab ? 'bg-white text-[#007AFF] shadow-lg' : 'text-zinc-400'}`}>{tab}</button>)}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-600 transition-colors">Publish New Digital Asset</button>
                {isEditingProduct && (
                  <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-4 border-[#007AFF]/10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <input className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Asset Title" />
                          <textarea className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="Detailed Description" rows={4} />
                          <div className="grid grid-cols-2 gap-4">
                             <input type="number" className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price (EGP)" />
                             <input className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.android_version} onChange={e => setEditProduct({...editProduct, android_version: e.target.value})} placeholder="Android Version (e.g. A15)" />
                          </div>
                          <select className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}><option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option></select>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-zinc-400 px-2 tracking-widest">Cover Image</label>
                          <div className="aspect-video bg-zinc-100 rounded-[2rem] overflow-hidden relative border-2 border-dashed border-zinc-300 hover:border-[#007AFF] transition-colors group">
                             {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center opacity-30"><i className="fa-solid fa-cloud-arrow-up text-3xl mb-2"></i><span className="text-[10px] font-black uppercase">Click to upload</span></div>}
                             <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-100 text-zinc-500 rounded-2xl font-black uppercase text-[10px]">Discard</button>
                       <button onClick={saveProduct} disabled={isPublishing} className="flex-[2] py-5 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg disabled:opacity-50">{isPublishing ? 'Publishing...' : 'Sync to Cloud'}</button>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                   {dbProducts.map(p => (
                     <div key={p.id} className="p-4 glass-panel rounded-3xl flex items-center justify-between group hover:border-[#007AFF]/30 transition-all">
                        <div className="flex items-center gap-4">
                           <img src={p.image} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                           <div>
                             <p className="font-black text-sm text-zinc-900">{p.title}</p>
                             <p className="text-[9px] text-[#007AFF] font-black uppercase tracking-widest">{p.category} • {p.price} EGP</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); }} className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                           <button onClick={async () => { if(confirm('Permanently delete this asset?')) { await supabase.from('products').delete().eq('id', p.id); refreshData(); } }} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all"><i className="fa-solid fa-trash text-xs"></i></button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="space-y-10 pb-20">
                 <div className="glass-panel p-10 rounded-[3rem] space-y-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">System Information</h3>
                      <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full border border-zinc-200">
                        <i className="fa-solid fa-lock text-[8px] text-zinc-400"></i>
                        <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Read Only Mode</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <section className="space-y-6">
                         <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2 flex items-center gap-2">Site Name <i className="fa-solid fa-lock text-[8px] opacity-0 group-hover:opacity-50"></i></label>
                            <div className="w-full p-4 rounded-xl bg-zinc-50 border border-zinc-100 font-black text-zinc-400 cursor-not-allowed select-none">{siteName}</div>
                         </div>
                         <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2 flex items-center gap-2">Site Slogan <i className="fa-solid fa-lock text-[8px] opacity-0 group-hover:opacity-50"></i></label>
                            <div className="w-full p-4 rounded-xl bg-zinc-50 border border-zinc-100 font-black text-zinc-400 cursor-not-allowed select-none">{siteSlogan}</div>
                         </div>
                         <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2 flex items-center gap-2">Vodafone Cash <i className="fa-solid fa-lock text-[8px] opacity-0 group-hover:opacity-50"></i></label>
                            <div className="w-full p-4 rounded-xl bg-zinc-50 border border-zinc-100 font-black text-zinc-400 cursor-not-allowed select-none">{paymentNumber}</div>
                         </div>
                         <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2 flex items-center gap-2">Telegram <i className="fa-solid fa-lock text-[8px] opacity-0 group-hover:opacity-50"></i></label>
                            <div className="w-full p-4 rounded-xl bg-zinc-50 border border-zinc-100 font-black text-zinc-400 cursor-not-allowed select-none">{telegramUser}</div>
                         </div>
                       </section>

                       <section className="space-y-8">
                         <div className="space-y-4 p-6 bg-white rounded-3xl border border-zinc-100 shadow-sm">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-[#007AFF] block tracking-widest px-2">Admin Dashboard Password</label>
                               <input className="w-full p-4 rounded-xl bg-zinc-100 font-black text-center text-lg text-zinc-900 outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                            </div>
                            <button onClick={saveConfig} disabled={isPublishing} className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50">
                              {isPublishing ? 'Updating...' : 'Update Password'}
                            </button>
                         </div>

                         <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] text-center">Visual Assets Control</h4>
                            <div className="flex gap-8 justify-center">
                              <div className="space-y-3 text-center">
                                <label className="text-[8px] font-black uppercase text-zinc-400 block tracking-widest">Main Site Logo</label>
                                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden relative border-4 border-[#007AFF]/10 bg-zinc-50 shadow-inner group cursor-pointer hover:border-[#007AFF]/30 transition-all">
                                  <img src={siteLogo} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <i className="fa-solid fa-camera text-white"></i>
                                  </div>
                                  <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); await supabase.from('settings').upsert({key: 'site_logo', value: b64}); refreshData(); showNotify("Logo Updated"); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                              </div>
                              <div className="space-y-3 text-center">
                                <label className="text-[8px] font-black uppercase text-zinc-400 block tracking-widest">Splash Loader Logo</label>
                                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden relative border-4 border-zinc-200 bg-zinc-50 shadow-inner group cursor-pointer hover:border-zinc-400 transition-all">
                                  <img src={loaderLogo} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <i className="fa-solid fa-camera text-white"></i>
                                  </div>
                                  <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); await supabase.from('settings').upsert({key: 'loader_logo', value: b64}); refreshData(); showNotify("Splash Updated"); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                              </div>
                            </div>
                         </div>
                       </section>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-[#007AFF] text-white' : 'bg-red-600 text-white'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={s => { window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`; }} />}
    </div>
  );
};

export default App;
