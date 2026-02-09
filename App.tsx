
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { MOCK_PRODUCTS, MOCK_VIDEOS } from './constants';
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

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]);
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loadingLogo, setLoadingLogo] = useState<string>(() => localStorage.getItem('cached_loading_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  const products = useMemo(() => dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS, [dbProducts]);
  const videos = useMemo(() => dbVideos.length > 0 ? dbVideos : MOCK_VIDEOS, [dbVideos]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderProductId, setOrderProductId] = useState<string>('');
  
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] });
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<YoutubeVideo>>({ title: '', url: '' });

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const refreshData = async () => {
    const startTime = Date.now();
    try {
      const [prodRes, vidRes, setRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*')
      ]);

      if (prodRes.data) setDbProducts(prodRes.data.map(p => ({ ...p, gallery: p.gallery || [] })));
      if (vidRes.data) setDbVideos(vidRes.data);
      if (setRes.data) {
        setRes.data.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loading_logo') {
            setLoadingLogo(s.value);
            localStorage.setItem('cached_loading_logo', s.value);
          }
        });
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 1200 - elapsed);
      setTimeout(() => setIsLoading(false), delay);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        setSelectedProductId(hash.replace('#/preview/', ''));
        setActiveSection('Preview');
      } else if (hash === '#/order') setActiveSection('Order');
      else if (['#/themes', '#/widgets', '#/walls'].includes(hash)) {
        setActiveSection(hash.replace('#/', '').charAt(0).toUpperCase() + hash.replace('#/', '').slice(1) as any);
      } else if (hash === '#/admin' && isAdminMode) setActiveSection('Admin');
      else setActiveSection('Home');
    };
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminMode]);

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = e => reject(e);
  });

  const handleAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Dashboard Access Granted");
    } else {
      showNotify("Invalid Password", "error");
    }
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Title & Cover Image required", "error");
    setIsPublishing(true);
    try {
      const payload = {
        id: editProduct.id || Date.now().toString(),
        title: editProduct.title,
        description: editProduct.description || '',
        category: editProduct.category || 'Themes',
        price: editProduct.price || 0,
        image: editProduct.image,
        gallery: editProduct.gallery || [],
        is_premium: (editProduct.price || 0) > 0,
        compatibility: 'Realme UI / ColorOS'
      };
      const { error } = await supabase.from('products').upsert(payload);
      if (error) throw error;
      await refreshData();
      setIsEditingProduct(false);
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] });
      showNotify("Asset saved successfully");
    } catch (err) { 
      showNotify("Sync Error", "error"); 
    } finally { setIsPublishing(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Permanently delete this item?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setDbProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Item removed");
    } catch (err) { 
      showNotify("Sync Error", "error"); 
    }
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("Title and URL are required", "error");
    setIsPublishing(true);
    try {
      let vidId = editVideo.id;
      if (!vidId) {
          const url = new URL(editVideo.url);
          if (url.hostname === 'youtu.be') vidId = url.pathname.slice(1);
          else vidId = url.searchParams.get('v') || '';
          if (!vidId) vidId = editVideo.url.split('/').pop() || Date.now().toString();
      }

      const { error } = await supabase.from('videos').upsert({
        id: vidId,
        title: editVideo.title,
        url: editVideo.url
      });
      
      if (error) throw error;
      await refreshData();
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("Tutorial video saved");
    } catch (err) { 
      showNotify("Invalid YouTube Link", "error"); 
    } finally { setIsPublishing(false); }
  };

  const deleteVideo = async (id: string) => {
    if (!window.confirm("Remove this tutorial video?")) return;
    try {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      setDbVideos(prev => prev.filter(v => v.id !== id));
      showNotify("Video removed");
    } catch (err) { 
      showNotify("Deletion failed", "error"); 
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value });
      if (error) throw error;
      if (key === 'admin_password') setAdminPassword(value);
      if (key === 'site_logo') setSiteLogo(value);
      if (key === 'loading_logo') {
        setLoadingLogo(value);
        localStorage.setItem('cached_loading_logo', value);
      }
      showNotify("Settings updated");
    } catch (err) { showNotify("Failed to update", "error"); }
  };

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] transition-colors duration-500">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl relative z-10 bg-white">
          <img src={loadingLogo} className="w-full h-full object-cover" alt="Loading..." onError={(e) => (e.currentTarget.src = "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa")} />
        </div>
        <div className="absolute -inset-4 border-2 border-dashed border-[#007AFF] rounded-full spinner-ring"></div>
      </div>
      <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
         <h3 className="text-xl font-black uppercase tracking-tighter text-zinc-900 dark:text-zinc-100">Mohamed Edge</h3>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32">
      <Header isAdmin={isAdminMode} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} onThemeToggle={() => setIsDarkMode(!isDarkMode)} isDarkMode={isDarkMode} logoUrl={siteLogo} />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 animate-in zoom-in duration-300">
              <div className="text-center space-y-2"><i className="fa-solid fa-lock text-[#007AFF] text-2xl"></i><h3 className="font-black uppercase text-xs tracking-widest">Admin Control</h3></div>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="••••" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-4 text-[10px] font-black uppercase text-zinc-400">Cancel</button>
                <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-500/30">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight uppercase px-1 flex items-center gap-3"><div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> Marketplace</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map(p => <ProductCard key={p.id} product={p} onPreview={(id) => window.location.hash = `#/preview/${id}`} onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} />)}
              </div>
            </section>
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
           <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <button onClick={() => window.history.back()} className="mb-8 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"><i className="fa-solid fa-arrow-left"></i></button>
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               <div className="lg:col-span-7 space-y-6">
                  <div className="glass-panel p-2 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800">
                    <img src={selectedProduct.image} className="w-full rounded-[2rem]" />
                  </div>
                  {selectedProduct.gallery && selectedProduct.gallery.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedProduct.gallery.map((img, idx) => (
                        <div key={idx} className="aspect-[9/16] rounded-3xl overflow-hidden border-2 border-white dark:border-zinc-800 shadow-lg">
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
               </div>
               <div className="lg:col-span-5">
                 <div className="glass-panel p-8 sm:p-12 rounded-[2.5rem] space-y-6 sticky top-28">
                    <h2 className="text-4xl font-black tracking-tight leading-none">{selectedProduct.title}</h2>
                    <p className="text-5xl font-black text-[#007AFF] tracking-tighter">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price.toFixed(2)} EGP`}</p>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full my-6"></div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{selectedProduct.description}</p>
                    <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-500/40 active:scale-95 transition-all">Order License</button>
                 </div>
               </div>
             </div>
           </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="w-full max-w-md mx-auto">
              <div className="flex p-1.5 bg-zinc-200/50 dark:bg-zinc-900/50 backdrop-blur-3xl rounded-[2rem] shadow-inner border border-white/40 dark:border-white/5">
                {['Inventory', 'Videos', 'Settings'].map(tab => (
                  <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-3 px-2 rounded-[1.6rem] transition-all duration-300 relative ${adminTab === tab ? 'bg-white dark:bg-zinc-800 shadow-xl scale-[1.05] text-[#007AFF]' : 'text-zinc-400'}`}>
                    <span className="text-[9px] font-black uppercase tracking-tighter">{tab}</span>
                  </button>
                ))}
              </div>
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <div className="glass-panel p-6 rounded-[2.5rem] flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tight">Product Inventory</h3>
                  <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] }); setIsEditingProduct(true); }} className="px-8 py-3.5 bg-[#007AFF] text-white rounded-xl font-black uppercase text-[9px] shadow-lg">Create New Asset</button>
                </div>

                {isEditingProduct && (
                  <div className="glass-panel p-8 sm:p-12 rounded-[3.5rem] space-y-8 border-2 border-[#007AFF]/30 animate-in zoom-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Basic Information</label>
                        <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Item Title" />
                        <select className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-xs outline-none" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                          <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option>
                        </select>
                        <input type="number" className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-xs outline-none" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} placeholder="Price (EGP)" />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Main Cover Image</label>
                        <label className="w-full flex items-center gap-4 p-5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-300 cursor-pointer overflow-hidden">
                          <input type="file" className="hidden" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}) }} />
                          {editProduct.image ? <img src={editProduct.image} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 rounded-xl flex items-center justify-center"><i className="fa-solid fa-camera"></i></div>}
                          <span className="text-xs font-bold uppercase">{editProduct.image ? 'Change Cover' : 'Upload Cover'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase text-zinc-400">Preview Gallery ({(editProduct.gallery || []).length}/20)</label>
                            {(editProduct.gallery || []).length < 20 && (
                                <label className="text-[10px] font-black uppercase text-[#007AFF] cursor-pointer hover:underline">
                                    + Add Previews
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={async e => {
                                        if (e.target.files) {
                                            const newImages = [...(editProduct.gallery || [])];
                                            for (let i = 0; i < Math.min(e.target.files.length, 20 - newImages.length); i++) {
                                                newImages.push(await fileToBase64(e.target.files[i]));
                                            }
                                            setEditProduct({ ...editProduct, gallery: newImages });
                                        }
                                    }} />
                                </label>
                            )}
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-3">
                            {(editProduct.gallery || []).map((img, idx) => (
                                <div key={idx} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button onClick={() => setEditProduct({...editProduct, gallery: editProduct.gallery?.filter((_, i) => i !== idx)})} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><i className="fa-solid fa-trash text-xs"></i></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <textarea className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium text-sm h-32 outline-none" placeholder="Provide a detailed description of the asset..." value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                    
                    <div className="flex gap-4">
                       <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 font-black text-[10px] uppercase rounded-2xl">Cancel</button>
                       <button onClick={saveProduct} className="flex-[3] py-5 bg-[#007AFF] text-white font-black text-[10px] uppercase rounded-2xl shadow-xl transition-all active:scale-[0.98]">
                        {isPublishing ? <i className="fa-solid fa-spinner animate-spin mr-2"></i> : <i className="fa-solid fa-cloud-arrow-up mr-2"></i>}
                        Publish Changes
                       </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-5 glass-panel rounded-[2.5rem] flex items-center justify-between group">
                      <div className="flex items-center gap-5 flex-1">
                        <img src={p.image} className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-zinc-800 shadow-sm" />
                        <div>
                            <h4 className="font-black text-base tracking-tight">{p.title}</h4>
                            <p className="text-[9px] font-black uppercase text-zinc-400">{p.category} • {p.price.toFixed(2)} EGP</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditProduct({ ...p, gallery: p.gallery || [] }); setIsEditingProduct(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-11 h-11 bg-[#007AFF]/10 text-[#007AFF] rounded-full flex items-center justify-center hover:bg-[#007AFF] hover:text-white transition-all"><i className="fa-solid fa-pen-to-square"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-11 h-11 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <div className="glass-panel p-6 rounded-[2.5rem] flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tight">Tutorial Management</h3>
                  <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="px-8 py-3.5 bg-red-500 text-white rounded-xl font-black uppercase text-[9px] shadow-lg">New Tutorial</button>
                </div>

                {isEditingVideo && (
                  <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-2 border-red-500/30 animate-in zoom-in">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-zinc-400">Video Details</label>
                      <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-500" value={editVideo.title || ''} onChange={e => setEditVideo({...editVideo, title: e.target.value})} placeholder="Tutorial Title" />
                      <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-500" value={editVideo.url || ''} onChange={e => setEditVideo({...editVideo, url: e.target.value})} placeholder="YouTube Link (e.g., https://youtube.com/watch?v=...)" />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 font-black text-[10px] uppercase rounded-2xl">Cancel</button>
                      <button onClick={saveVideo} className="flex-[3] py-5 bg-red-500 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl transition-all active:scale-[0.98]">Save Video</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {dbVideos.length > 0 ? dbVideos.map(v => (
                    <div key={v.id} className="p-4 glass-panel rounded-[2rem] flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-12 bg-zinc-100 rounded-lg overflow-hidden border-2 border-white dark:border-zinc-800">
                          <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-black text-sm">{v.title}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditVideo(v); setIsEditingVideo(true); }} className="w-10 h-10 bg-[#007AFF]/10 text-[#007AFF] rounded-full flex items-center justify-center hover:bg-[#007AFF] hover:text-white transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                        <button onClick={() => deleteVideo(v.id)} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can text-xs"></i></button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 text-zinc-400 font-black uppercase text-[10px]">No tutorials listed.</div>
                  )}
                </div>
              </div>
            )}
            
            {adminTab === 'Settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel p-10 rounded-[3.5rem] space-y-8">
                  <h3 className="font-black text-xl uppercase tracking-tighter">Branding & Identity</h3>
                  <div className="space-y-4">
                    <label className="block p-5 bg-zinc-100 dark:bg-zinc-800 rounded-3xl cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Navigation Logo</span>
                      <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) updateSetting('site_logo', await fileToBase64(e.target.files[0])) }} />
                      <div className="flex items-center gap-4"><img src={siteLogo} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" /><span className="text-[10px] font-black uppercase">Change Site Logo</span></div>
                    </label>
                    <label className="block p-5 bg-zinc-100 dark:bg-zinc-800 rounded-3xl cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Splash Screen Icon</span>
                      <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) updateSetting('loading_logo', await fileToBase64(e.target.files[0])) }} />
                      <div className="flex items-center gap-4"><img src={loadingLogo} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" /><span className="text-[10px] font-black uppercase">Change Splash Logo</span></div>
                    </label>
                  </div>
                </div>
                <div className="glass-panel p-10 rounded-[3.5rem] space-y-8">
                  <h3 className="font-black text-xl uppercase tracking-tighter">Access Control</h3>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-400 block">Master Administrator Password</label>
                    <input type="password" placeholder="••••••••" className="w-full p-6 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 font-black focus:outline-[#007AFF]" onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} />
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">* Settings are auto-saved on field blur</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 rounded-[2rem] font-black text-[10px] uppercase shadow-2xl animate-in fade-in slide-in-from-top-12 flex items-center gap-4 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-500 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-xl`}></i>
          <span>{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={(s) => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />}
    </div>
  );
};

export default App;
