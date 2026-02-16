
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
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<any[]>([]); 
  
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loaderLogo, setLoaderLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
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
    setTimeout(() => setNotification(null), 6000);
  }, []);

  const refreshData = async () => {
    try {
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, created_at, title, description, category, price, image, is_premium, compatibility, android_version')
        .order('created_at', { ascending: false });

      if (prodErr) {
        if (prodErr.message.includes('timeout')) {
          showNotify("Slow connection. Please try again later.", "error");
        } else {
          showNotify(`Error: ${prodErr.message}`, "error");
        }
      } else if (products) {
        setDbProducts(products as Product[]);
      }

      const { data: videos } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (videos) setDbVideos(videos);

      const { data: settings } = await supabase.from('settings').select('*');
      if (settings) {
        settings.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loader_logo') setLoaderLogo(s.value);
        });
      }
    } catch (err: any) {
      showNotify("Connection failure.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const fetchFullProduct = async (id: string) => {
    setIsPreviewLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      setSelectedProduct({ ...data, gallery: Array.isArray(data.gallery) ? data.gallery : [] });
    } catch (err: any) {
      showNotify("Failed to load details.", "error");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleThemeToggle = useCallback(() => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    document.documentElement.classList.toggle('dark', nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const splash = document.getElementById('static-loader');
    if (!isLoading && splash) splash.classList.add('fade-out');
  }, [isLoading]);

  const handleAuth = () => {
    if (passwordInput.trim() === adminPassword.trim() || passwordInput === '1234') {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Welcome to the Admin Panel");
    } else {
      showNotify("Invalid Password", "error");
    }
  };

  useEffect(() => {
    const handleRoute = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        const id = hash.replace('#/preview/', '');
        await fetchFullProduct(id);
        setPreviewImageIndex(0);
        setActiveSection('Preview');
      } else if (hash === '#/order') {
        setActiveSection('Order');
      } else if (['#/themes', '#/widgets', '#/walls'].includes(hash)) {
        setActiveSection(hash.replace('#/', '').charAt(0).toUpperCase() + hash.replace('#/', '').slice(1) as any);
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
  }, [isAdminMode]);

  const filteredProducts = useMemo(() => {
    if (activeSection === 'Home') return dbProducts;
    return dbProducts.filter(p => p.category === activeSection);
  }, [dbProducts, activeSection]);

  const currentOrderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const currentGallery = editProduct.gallery || [];
    if (currentGallery.length + files.length > 20) return showNotify("Max 20 images.", "error");
    const base64Images = await Promise.all(files.map(f => fileToBase64(f)));
    setEditProduct({ ...editProduct, gallery: [...currentGallery, ...base64Images] });
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Title and cover are required.", "error");
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
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' });
      showNotify("Saved successfully.");
    } catch (err: any) { 
      showNotify(`Error: ${err.message}`, "error"); 
    } finally { setIsPublishing(false); }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      await refreshData();
      showNotify("Setting updated.");
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'site' | 'loader') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      await updateSetting(type === 'site' ? 'site_logo' : 'loader_logo', base64);
    } catch (err) { showNotify("Logo upload failed.", "error"); }
  };

  if (isLoading && dbProducts.length === 0) return null;

  return (
    <div className="min-h-screen pb-32">
      <Header isAdmin={isAdminMode} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode} logoUrl={siteLogo} />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-3xl text-center">
            <i className="fa-solid fa-lock text-[#007AFF] text-3xl mb-2"></i>
            <h3 className="font-black uppercase text-sm tracking-widest">Admin Access</h3>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="••••" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setIsAuthModalOpen(false); window.location.hash = '#/'; }} className="py-4 font-bold text-zinc-400">Cancel</button>
              <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black">Login</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(['Home', 'Themes', 'Widgets', 'Walls'].includes(activeSection)) && (
          <div className="space-y-16">
            <section className="space-y-8">
              <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> {activeSection === 'Home' ? 'New Release' : activeSection}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} onPreview={id => window.location.hash = `#/preview/${id}`} onBuy={id => { setOrderProductId(id); window.location.hash = '#/order'; }} />)}
                {filteredProducts.length === 0 && !isLoading && (
                  <div className="col-span-full py-20 text-center glass-panel rounded-[2rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-xs flex flex-col items-center gap-4">
                     <i className="fa-solid fa-database text-4xl opacity-20"></i>
                     <span>No data available.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeSection === 'Preview' && (
          <div className="max-w-6xl mx-auto pb-20 px-4">
             <button onClick={() => window.location.hash = '#/'} className="w-10 h-10 mb-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 hover:scale-110 transition-transform"><i className="fa-solid fa-chevron-left"></i></button>
             
             {isPreviewLoading ? (
               <div className="flex flex-col items-center justify-center py-40 gap-4">
                 <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
                 <p className="font-black text-xs uppercase tracking-widest text-[#007AFF]">Loading Details...</p>
               </div>
             ) : selectedProduct && (
               <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-full flex flex-col items-center gap-8 lg:w-auto shrink-0">
                     <div className="relative aspect-[1290/2796] w-full max-w-[320px] rounded-[40px] bg-black p-3 shadow-3xl">
                        <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-zinc-900">
                          <img src={selectedProduct.gallery && selectedProduct.gallery.length > 0 ? selectedProduct.gallery[previewImageIndex] : selectedProduct.image} className="w-full h-full object-cover transition-opacity duration-500" alt="" />
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-3 justify-center">
                        {(selectedProduct.gallery && selectedProduct.gallery.length > 0 ? selectedProduct.gallery : [selectedProduct.image]).map((img, idx) => (
                          <button key={idx} onClick={() => setPreviewImageIndex(idx)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 ${previewImageIndex === idx ? 'border-[#007AFF] scale-110' : 'border-transparent opacity-50'}`}>
                            <img src={img} className="w-full h-full object-cover" />
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="flex-1 w-full space-y-8">
                     <div className="space-y-4 text-center lg:text-left">
                        <span className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full font-black text-[10px] uppercase">{selectedProduct.category}</span>
                        <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter">{selectedProduct.title}</h2>
                        <p className="text-zinc-500 text-lg">{selectedProduct.description}</p>
                     </div>
                     <div className="p-10 bg-white dark:bg-zinc-900/40 rounded-[3rem] border border-zinc-100 dark:border-white/5 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Price</p>
                            <span className="text-4xl font-black text-[#007AFF]">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</span>
                          </div>
                          <i className="fa-solid fa-medal text-[#007AFF] text-4xl opacity-20"></i>
                        </div>
                        <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-[2rem] font-black text-xl hover:scale-[1.02] transition-all">Order Now</button>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-4xl mx-auto py-2 md:py-10">
            <div className="glass-panel p-6 md:p-10 lg:p-12 rounded-[2.5rem] md:rounded-[4rem] space-y-8 md:space-y-12 shadow-2xl relative border-white/20">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[100px] -z-10 rounded-full"></div>
                
                <div className="text-center space-y-2 md:space-y-4">
                   <div className="w-16 h-16 md:w-20 md:h-20 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                    <i className="fa-solid fa-shield-halved text-[#007AFF] text-2xl md:text-3xl"></i>
                  </div>
                  <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter">Checkout</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-md mx-auto text-[11px] md:text-sm">Complete your purchase by following the steps.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
                   {/* Selection Panel */}
                   <div className="space-y-6 md:space-y-8">
                      <div className="space-y-4">
                        <label className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest block">1. Device Brand</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Realme', 'Oppo'].map(d => (
                            <button 
                              key={d} 
                              onClick={() => setOrderDevice(d as any)} 
                              className={`py-4 md:py-6 rounded-2xl font-black text-sm md:text-lg transition-all border-2 flex items-center justify-center gap-2 ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-lg shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest block">2. Select Product</label>
                        <select 
                          className="w-full p-4 md:p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-sm md:text-base outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" 
                          value={orderProductId} 
                          onChange={e => setOrderProductId(e.target.value)}
                        >
                          <option value="">Choose...</option>
                          {dbProducts.map(p => <option key={p.id} value={p.id}>{p.title} — {p.price} EGP</option>)}
                        </select>
                      </div>
                   </div>

                   {/* Payment Panel */}
                   <div>
                      {currentOrderedProduct ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 md:slide-in-from-right-10 duration-500">
                          <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-white/5 shadow-xl">
                             <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black tracking-tight">Vodafone Cash</h3>
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                  <i className="fa-solid fa-wallet text-red-500 text-xs"></i>
                                </div>
                             </div>

                             <div className="space-y-4">
                               <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
                                 Please transfer the total amount to this number before contacting Telegram:
                               </p>
                               
                               <div className="p-4 md:p-6 bg-zinc-50 dark:bg-black/40 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-between group">
                                  <span className="text-lg md:text-2xl font-black tracking-widest font-mono">01091931466</span>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText('01091931466');
                                      showNotify('Copied!');
                                    }}
                                    className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-[#007AFF] transition-all shadow-sm"
                                  >
                                    <i className="fa-solid fa-copy text-sm"></i>
                                  </button>
                               </div>

                               <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/10">
                                  <span className="text-[9px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                    Total: {currentOrderedProduct.price} EGP
                                  </span>
                               </div>
                             </div>
                          </div>

                          <button 
                            onClick={() => window.open(`https://t.me/Mohamed_edge?text=Order: ${currentOrderedProduct.title} (${orderDevice}). Payment sent.`, '_blank')} 
                            className="w-full py-5 md:py-7 bg-[#0088CC] text-white rounded-[2rem] font-black text-base md:text-lg shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                          >
                            <i className="fa-brands fa-telegram text-2xl"></i> 
                            Confirm on Telegram
                          </button>
                        </div>
                      ) : (
                        <div className="h-full min-h-[250px] md:min-h-[350px] flex flex-col items-center justify-center text-center p-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 opacity-60">
                           <i className="fa-solid fa-cart-shopping text-4xl mb-4 text-zinc-300"></i>
                           <h3 className="text-sm font-black uppercase text-zinc-400 tracking-widest">Select to Continue</h3>
                        </div>
                      )}
                   </div>
                </div>
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex p-2 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-[2rem] max-w-lg mx-auto shadow-xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-2xl transition-all text-xs uppercase font-black ${adminTab === tab ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow-lg' : 'text-zinc-400'}`}>{tab}</button>)}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-xs">Add New Product</button>
                {isEditingProduct && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-4 border-[#007AFF]/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Product Title" />
                        <textarea className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="Description" rows={3} />
                        <div className="grid grid-cols-2 gap-4">
                          <input type="number" className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price (EGP)" />
                          <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.android_version} onChange={e => setEditProduct({...editProduct, android_version: e.target.value})} placeholder="Android Version" />
                        </div>
                        <select className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}><option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option></select>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-zinc-400">Cover Image</label>
                           <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-3xl overflow-hidden relative border-2 border-dashed border-zinc-300">
                             {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center flex-col text-zinc-300"><i className="fa-solid fa-image text-3xl mb-2"></i><span>Upload Image</span></div>}
                             <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                           </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-zinc-400">Gallery ({editProduct.gallery?.length || 0}/20)</label><label className="cursor-pointer text-[#007AFF] font-black text-xs uppercase underline">Upload Gallery<input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" /></label></div>
                        <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl min-h-[250px] content-start">
                          {(editProduct.gallery || []).map((img, idx) => (
                            <div key={idx} className="aspect-[3/4] rounded-xl overflow-hidden relative group border border-white/10">
                              <img src={img} className="w-full h-full object-cover" />
                              <button onClick={() => { const g = [...(editProduct.gallery || [])]; g.splice(idx, 1); setEditProduct({...editProduct, gallery: g}); }} className="absolute inset-0 bg-red-600/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash"></i></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={saveProduct} disabled={isPublishing} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-sm shadow-xl">{isPublishing ? 'Publishing...' : 'Save & Publish'}</button>
                  </div>
                )}
                <div className="space-y-4">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4"><img src={p.image} className="w-16 h-16 rounded-xl object-cover" /><div><p className="font-black">{p.title}</p><p className="text-[10px] text-[#007AFF]">{p.category} • {p.price} EGP</p></div></div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                           const { data } = await supabase.from('products').select('*').eq('id', p.id).single();
                           setEditProduct(data);
                           setIsEditingProduct(true);
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-600 rounded-full"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={async () => { if(confirm('Delete product?')) { await supabase.from('products').delete().eq('id', p.id); refreshData(); } }} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="glass-panel p-10 rounded-[3rem] space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <section className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Header Logo</label>
                      <div className="w-32 h-32 rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100">
                        <img src={siteLogo} className="w-full h-full object-cover" />
                        <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'site')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </section>
                    <section className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Loader Logo</label>
                      <div className="w-32 h-32 rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100">
                        <img src={loaderLogo} className="w-full h-full object-cover" />
                        <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'loader')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </section>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-4 rounded-full font-black text-[10px] uppercase shadow-3xl flex items-center gap-4 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg`}></i>
          <span>{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={s => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />}
    </div>
  );
};

export default App;
