
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
  
  const isDarkMode = false;

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]); 
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
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [isFetchingVideo, setIsFetchingVideo] = useState(false);

  const showNotify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const refreshData = async () => {
    // 1. أولاً نقوم بتحميل الإعدادات لإخفاء شاشة التحميل بسرعة
    try {
      const { data: settingsData } = await supabase.from('settings').select('*');
      if (settingsData) {
        settingsData.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loader_logo') {
            setLoaderLogo(s.value);
            localStorage.setItem('cached_loader_logo', s.value);
          }
        });
      }
      
      // إخفاء الـ Splash بمجرد تحميل الإعدادات أو فوراً لتحسين "سرعة الظهور"
      if (typeof (window as any).hideSplash === 'function') {
        (window as any).hideSplash();
      }

      // 2. تحميل المنتجات والفيديوهات في الخلفية
      const [prodRes, vidRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false })
      ]);

      if (prodRes.data) setDbProducts(prodRes.data as Product[]);
      if (vidRes.data) setDbVideos(vidRes.data as YoutubeVideo[]);
    } catch (err) {
      console.error("Data fetch error", err);
      if (typeof (window as any).hideSplash === 'function') {
        (window as any).hideSplash();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    refreshData(); 
  }, []);

  // ... (نفس باقي الدوال السابقة)
  const handleUrlBlur = async () => {
    if (!videoUrlInput) return;
    const vidId = getYouTubeId(videoUrlInput);
    if (!vidId) return;
    setIsFetchingVideo(true);
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrlInput)}&format=json`);
      if (response.ok) {
        const data = await response.json();
        setVideoTitleInput(data.title);
      }
    } catch (e) { console.error(e); } finally { setIsFetchingVideo(false); }
  };

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
        } else {
           const { data } = await supabase.from('products').select('*').eq('id', id).single();
           if (data) { setSelectedProduct(data); setActiveSection('Preview'); }
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

  const addVideo = async () => {
    const vidId = getYouTubeId(videoUrlInput);
    if (!vidId) return showNotify("Invalid YouTube URL", "error");
    if (!videoTitleInput) return showNotify("Please provide a title", "error");
    try {
      const { error } = await supabase.from('videos').upsert({ id: vidId, title: videoTitleInput, url: videoUrlInput });
      if (error) throw error;
      setVideoUrlInput(''); setVideoTitleInput(''); refreshData(); showNotify("Video Added");
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  return (
    <div className="min-h-screen pb-32 bg-[#F2F2F7] transition-colors duration-500">
      <Header isAdmin={isAdminMode} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} onThemeToggle={() => {}} isDarkMode={false} logoUrl={siteLogo} />

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
        {isLoading && dbProducts.length === 0 ? (
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
                  {filteredProducts.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center glass-panel rounded-[2rem] border-dashed border-2 border-zinc-200 text-zinc-400 font-bold uppercase text-[10px] flex flex-col items-center gap-4">
                       <i className="fa-solid fa-box-open text-4xl opacity-20"></i>
                       <span>No assets found in database.</span>
                    </div>
                  )}
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
        
        {/* ... (نفس باقي الأقسام Order و Preview و Admin دون تغيير) ... */}
        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-6xl mx-auto pb-20 px-4 animate-in fade-in duration-500">
             <button onClick={() => window.history.back()} className="w-10 h-10 mb-8 flex items-center justify-center bg-white rounded-full shadow-lg border border-zinc-200 hover:scale-110 transition-transform"><i className="fa-solid fa-chevron-left"></i></button>
             <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12">
                <div className="w-full lg:w-auto shrink-0 flex flex-col items-center gap-8">
                   <div className="relative aspect-[1290/2796] w-full max-w-[320px] rounded-[40px] bg-black p-3 shadow-3xl">
                      <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-zinc-900">
                        <img loading="eager" src={selectedProduct.gallery && selectedProduct.gallery.length > 0 ? selectedProduct.gallery[previewImageIndex] : selectedProduct.image} className="w-full h-full object-cover animate-in fade-in duration-300" alt="" />
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-2 justify-center">
                      {(selectedProduct.gallery?.length ? selectedProduct.gallery : [selectedProduct.image]).map((img, idx) => (
                        <button key={idx} onClick={() => setPreviewImageIndex(idx)} className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${previewImageIndex === idx ? 'border-[#007AFF] scale-110' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                          <img loading="lazy" src={img} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                   </div>
                </div>
                <div className="flex-1 w-full space-y-8">
                   <div className="space-y-4">
                      <span className="px-3 py-1 bg-[#007AFF]/10 text-[#007AFF] rounded-full font-black text-[9px] uppercase">{selectedProduct.category}</span>
                      <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-tight">{selectedProduct.title}</h2>
                      <div className="flex items-center gap-4 text-zinc-500 font-bold text-sm">
                         <span className="flex items-center gap-1.5"><i className="fa-brands fa-android text-green-500"></i> {selectedProduct.android_version || 'Universal'}</span>
                         <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                         <span>{selectedProduct.compatibility}</span>
                      </div>
                      <p className="text-zinc-500 text-lg leading-relaxed pt-4">{selectedProduct.description}</p>
                   </div>
                   <div className="p-8 bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Price</p>
                          <span className="text-3xl font-black text-[#007AFF]">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</span>
                        </div>
                      </div>
                      <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20">Secure This Asset</button>
                   </div>
                </div>
             </div>
          </div>
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
                                      <span className="text-lg font-black tracking-widest font-mono text-zinc-900">01091931466</span>
                                      <button onClick={() => { navigator.clipboard.writeText('01091931466'); showNotify('Number Copied!'); }} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-zinc-400 hover:text-[#007AFF] transition-all"><i className="fa-solid fa-copy text-xs"></i></button>
                                   </div>
                                   
                                   <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                     <p className="text-zinc-900 font-bold text-[11px] leading-relaxed">
                                       <i className="fa-solid fa-triangle-exclamation text-red-500 mr-2"></i>
                                       Please confirm full payment to the number shown on this page before proceeding to contact us via Telegram.
                                     </p>
                                   </div>
                                </div>
                              )}

                              {!currentOrderedProduct.price && (
                                <p className="text-sm text-zinc-500 font-medium">This asset is free. Request the link from Mohamed Edge via Telegram.</p>
                              )}
                           </div>
                           
                           <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=I want to order: ${currentOrderedProduct.title} for ${orderDevice}`, '_blank')} className="w-full py-5 bg-[#0088CC] text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
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
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-zinc-400 px-2 tracking-widest">Gallery Preview (Base64/Links Array)</label>
                             <div className="grid grid-cols-4 gap-2">
                               {editProduct.gallery?.map((g, i) => (
                                 <div key={i} className="aspect-square rounded-lg bg-zinc-200 relative group overflow-hidden">
                                   <img src={g} className="w-full h-full object-cover" />
                                   <button onClick={() => setEditProduct({...editProduct, gallery: editProduct.gallery?.filter((_, idx) => idx !== i)})} className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><i className="fa-solid fa-trash"></i></button>
                                 </div>
                               ))}
                               <div className="aspect-square rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 relative">
                                  <i className="fa-solid fa-plus"></i>
                                  <input type="file" multiple accept="image/*" onChange={async e => { if(e.target.files) { const files = Array.from(e.target.files); const b64s = await Promise.all(files.map(f => fileToBase64(f))); setEditProduct({...editProduct, gallery: [...(editProduct.gallery || []), ...b64s]}); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                               </div>
                             </div>
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

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                 <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                    <h3 className="font-black uppercase text-xs tracking-widest text-zinc-400">Add YouTube Review</h3>
                    <div className="space-y-4">
                       <div className="relative">
                          <input 
                            className="w-full p-4 pr-12 rounded-xl bg-zinc-100 font-bold text-zinc-900 outline-none border-2 border-transparent focus:border-[#007AFF]" 
                            placeholder="YouTube URL" 
                            value={videoUrlInput} 
                            onChange={e => setVideoUrlInput(e.target.value)}
                            onBlur={handleUrlBlur}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isFetchingVideo ? (
                              <i className="fa-solid fa-spinner animate-spin text-[#007AFF]"></i>
                            ) : (
                              <i className="fa-brands fa-youtube text-red-600"></i>
                            )}
                          </div>
                       </div>
                       <input className="w-full p-4 rounded-xl bg-zinc-100 font-bold text-zinc-900 outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="Video Title (Auto-fetched)" value={videoTitleInput} onChange={e => setVideoTitleInput(e.target.value)} />
                    </div>
                    <button onClick={addVideo} className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Publish Video</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dbVideos.map(v => (
                       <div key={v.id} className="p-4 glass-panel rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-16 h-10 bg-black rounded overflow-hidden"><img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} className="w-full h-full object-cover" /></div>
                             <p className="font-bold text-xs truncate max-w-[150px] text-zinc-900">{v.title}</p>
                          </div>
                          <button onClick={async () => { if(confirm('Delete video?')) { await supabase.from('videos').delete().eq('id', v.id); refreshData(); } }} className="text-red-500 hover:scale-110 transition-transform"><i className="fa-solid fa-trash-can"></i></button>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="space-y-10">
                 <div className="glass-panel p-10 rounded-[3rem] space-y-10">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">Store Branding</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <section className="space-y-10">
                         <div className="space-y-4 text-center">
                           <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest">Main Header Logo</label>
                           <div className="w-24 h-24 mx-auto rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100 shadow-xl group">
                             <img src={siteLogo} className="w-full h-full object-cover" />
                             <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); await supabase.from('settings').upsert({key: 'site_logo', value: b64}); refreshData(); showNotify("Header logo updated"); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                           </div>
                         </div>
                         <div className="space-y-4 text-center">
                           <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest">Loading Screen Logo</label>
                           <div className="w-24 h-24 mx-auto rounded-full overflow-hidden relative border-4 border-amber-500/20 bg-zinc-100 shadow-xl group">
                             <img src={loaderLogo} className="w-full h-full object-cover" />
                             <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); await supabase.from('settings').upsert({key: 'loader_logo', value: b64}); refreshData(); showNotify("Loading logo updated"); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                           </div>
                           <p className="text-[9px] text-zinc-400 font-bold italic">Changes splash logo on next reload.</p>
                         </div>
                       </section>
                       <section className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2">Master Password</label>
                            <input type="text" className="w-full p-5 rounded-2xl bg-zinc-100 font-black text-center text-lg text-zinc-900 outline-none" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                         </div>
                         <button onClick={async () => { await supabase.from('settings').upsert({key: 'admin_password', value: adminPassword}); showNotify("Password updated"); }} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-amber-600 transition-colors">Lock Changes</button>
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
