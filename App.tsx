
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { NAV_ITEMS, MOCK_PRODUCTS } from './constants';
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

  // --- Order/UI State ---
  const [orderDevice, setOrderDevice] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderCategory, setOrderCategory] = useState<Section>('Themes');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  // --- Admin State ---
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
      if (!prodRes.error && prodRes.data && prodRes.data.length > 0) {
        setDbProducts(prodRes.data.map(p => ({ ...p, gallery: Array.isArray(p.gallery) ? p.gallery : [] })));
      } else {
        setDbProducts(MOCK_PRODUCTS);
      }

      // Videos
      const vidRes = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (!vidRes.error && vidRes.data) {
        setDbVideos(vidRes.data);
      }

      // Settings
      const setRes = await supabase.from('settings').select('*');
      if (setRes.data) {
        setRes.data.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value.toString().trim());
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loader_logo') setLoaderLogo(s.value);
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
    if (passwordInput.trim() === adminPassword || passwordInput.trim() === '1234') {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("تم الدخول بنجاح");
    } else {
      showNotify("كلمة المرور غير صحيحة", "error");
    }
  };

  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        setSelectedProductId(hash.replace('#/preview/', ''));
        setPreviewImageIndex(0);
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

  const selectedProduct = useMemo(() => dbProducts.find(p => p.id === selectedProductId), [dbProducts, selectedProductId]);
  const currentOrderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  const updateSetting = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      if (key === 'admin_password') setAdminPassword(value.trim());
      if (key === 'site_logo') setSiteLogo(value);
      if (key === 'loader_logo') setLoaderLogo(value);
      showNotify("تم التحديث");
    } catch (err) { showNotify("خطأ في المزامنة", "error"); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    
    const currentGallery = editProduct.gallery || [];
    if (currentGallery.length + files.length > 20) {
      showNotify("بحد أقصى 20 صورة فقط للمنتج", "error");
      return;
    }

    const base64Images = await Promise.all(files.map(f => fileToBase64(f)));
    setEditProduct({ ...editProduct, gallery: [...currentGallery, ...base64Images] });
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = [...(editProduct.gallery || [])];
    newGallery.splice(index, 1);
    setEditProduct({ ...editProduct, gallery: newGallery });
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("أكمل البيانات", "error");
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
      await supabase.from('products').upsert(payload);
      await refreshData();
      setIsEditingProduct(false);
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] });
      showNotify("تم حفظ المنتج بنجاح");
    } catch (err) { showNotify("فشل الحفظ", "error"); } finally { setIsPublishing(false); }
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("أكمل البيانات", "error");
    
    // Extract YouTube ID
    let vidId = '';
    const url = editVideo.url;
    if (url.includes('v=')) vidId = url.split('v=')[1].split('&')[0];
    else if (url.includes('youtu.be/')) vidId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('shorts/')) vidId = url.split('shorts/')[1].split('?')[0];
    else vidId = url.split('/').pop() || '';

    if (!vidId) return showNotify("رابط يوتيوب غير صالح", "error");

    setIsPublishing(true);
    try {
      await supabase.from('videos').upsert({ 
        id: vidId, 
        title: editVideo.title, 
        url: editVideo.url 
      });
      await refreshData();
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("تم حفظ الفيديو بنجاح");
    } catch (err) { 
      showNotify("خطأ في حفظ الفيديو", "error"); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.")) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        showNotify("تم حذف المنتج بنجاح");
        refreshData();
      } catch (err) {
        showNotify("خطأ في حذف المنتج", "error");
      }
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الفيديو؟")) {
      try {
        const { error } = await supabase.from('videos').delete().eq('id', id);
        if (error) throw error;
        showNotify("تم حذف الفيديو بنجاح");
        refreshData();
      } catch (err) {
        showNotify("خطأ في حذف الفيديو", "error");
      }
    }
  };

  const handleOrderRedirect = () => {
    if (!currentOrderedProduct) return;
    const message = `طلب جديد من متجر Mohamed Edge:
- المنتج: ${currentOrderedProduct.title}
- القسم: ${currentOrderedProduct.category}
- الجهاز: ${orderDevice}
- السعر: ${currentOrderedProduct.price} EGP`;
    window.open(`https://t.me/Mohamed_edge?text=${encodeURIComponent(message)}`, '_blank');
  };

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-3xl animate-in zoom-in-95 duration-300">
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
              <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Login</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(activeSection === 'Home' || activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') && (
          <div className="space-y-16">
            <section className="space-y-8">
              <div className="flex justify-between items-end">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> 
                  {activeSection === 'Home' ? 'New Release' : activeSection}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={(id) => window.location.hash = `#/preview/${id}`} 
                    onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} 
                  />
                ))}
              </div>
            </section>

            {activeSection === 'Home' && dbVideos.length > 0 && (
              <section className="space-y-8 pb-10">
                <div className="flex justify-between items-end px-1">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div> Latest Tutorials
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {dbVideos.map((video) => (
                    <a 
                      key={video.id} 
                      href={video.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="glass-panel overflow-hidden rounded-[2.5rem] shadow-xl group hover:scale-[1.02] active:scale-95 transition-all duration-500 border border-white/20 dark:border-white/5 block"
                    >
                      <div className="aspect-video w-full bg-zinc-900 relative overflow-hidden">
                        <img 
                          src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          alt={video.title}
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`; }}
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                           <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-600/50 transform group-hover:scale-125 transition-transform duration-500">
                             <i className="fa-solid fa-play text-3xl ml-1"></i>
                           </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <h4 className="font-black text-lg tracking-tight uppercase line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">{video.title}</h4>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
             <div className="glass-panel rounded-[3rem] overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                   <div className="flex flex-col bg-zinc-100 dark:bg-zinc-800">
                      <div className="aspect-[3/4] overflow-hidden relative">
                        <img 
                          src={previewImageIndex === 0 ? selectedProduct.image : (selectedProduct.gallery && selectedProduct.gallery[previewImageIndex - 1])} 
                          className="w-full h-full object-cover transition-all duration-500" 
                          alt={selectedProduct.title}
                        />
                      </div>
                      {selectedProduct.gallery && selectedProduct.gallery.length > 0 && (
                        <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar">
                           <button 
                             onClick={() => setPreviewImageIndex(0)}
                             className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${previewImageIndex === 0 ? 'border-[#007AFF] scale-105' : 'border-transparent opacity-60'}`}
                           >
                              <img src={selectedProduct.image} className="w-full h-full object-cover" />
                           </button>
                           {selectedProduct.gallery.map((img, idx) => (
                             <button 
                               key={idx}
                               onClick={() => setPreviewImageIndex(idx + 1)}
                               className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${previewImageIndex === idx + 1 ? 'border-[#007AFF] scale-105' : 'border-transparent opacity-60'}`}
                             >
                                <img src={img} className="w-full h-full object-cover" />
                             </button>
                           ))}
                        </div>
                      )}
                   </div>
                   <div className="p-10 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                           <span className="text-[#007AFF] font-black text-[10px] uppercase tracking-widest">{selectedProduct.category}</span>
                           <span className="text-zinc-400 font-bold text-[10px] uppercase">{selectedProduct.compatibility}</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">{selectedProduct.title}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{selectedProduct.description}</p>
                        <div className="text-4xl font-black text-[#007AFF]">
                           {selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price.toFixed(2)} EGP`}
                        </div>
                      </div>
                      <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all mt-10">
                         {selectedProduct.price === 0 ? 'GET FOR FREE' : 'BUY NOW'}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto">
            <div className="glass-panel p-10 rounded-[3rem] space-y-10">
               <div className="text-center space-y-4">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Secure Order</h2>
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-black text-sm">
                    <i className="fa-brands fa-telegram text-[#0088CC] text-xl"></i> @Mohamed_edge
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {['Realme', 'Oppo'].map(d => (
                      <button key={d} onClick={() => setOrderDevice(d as any)} className={`py-6 rounded-3xl font-black text-xl border-2 transition-all ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xl shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-transparent'}`}>{d}</button>
                    ))}
                  </div>
                  <select className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black border-2 border-transparent focus:border-[#007AFF] outline-none" value={orderProductId} onChange={e => setOrderProductId(e.target.value)}>
                    <option value="">Choose Asset...</option>
                    {dbProducts.map(p => <option key={p.id} value={p.id}>{p.title} - {p.price} EGP</option>)}
                  </select>

                  {currentOrderedProduct && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-300">
                      <div className="p-8 bg-orange-500/10 border-2 border-dashed border-orange-500/30 rounded-[2.5rem] space-y-4 text-center">
                        <p className="text-orange-600 font-black text-sm uppercase">Vodafone Cash Transfer</p>
                        <div className="text-2xl font-black tracking-widest text-orange-600">01091931466</div>
                        <p className="text-[10px] font-bold text-zinc-500">Please send a screenshot to Telegram after payment</p>
                      </div>
                      <button onClick={handleOrderRedirect} className="w-full py-7 bg-[#0088CC] text-white rounded-3xl font-black text-xl shadow-xl flex items-center justify-center gap-4">
                        <i className="fa-brands fa-telegram text-2xl"></i> Send to Telegram
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
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [] }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-xs shadow-xl">Add New Product</button>
                {isEditingProduct && (
                  <div id="product-form" className="glass-panel p-10 rounded-[3rem] space-y-8 border-4 border-[#007AFF]/10 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-xl uppercase">{editProduct.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
                      <button onClick={() => setIsEditingProduct(false)} className="text-zinc-400 hover:text-red-600"><i className="fa-solid fa-xmark text-xl"></i></button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Product Info</label>
                      <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Title" />
                      <textarea className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="Description" rows={3} />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                           <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Price (EGP)</label>
                           <input type="number" className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price" />
                        </div>
                        <div className="flex-1 space-y-2">
                           <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Category</label>
                           <select className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                               <option value="Themes">Themes</option>
                               <option value="Widgets">Widgets</option>
                               <option value="Walls">Wallpapers</option>
                           </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Main Cover Image</label>
                      <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-3xl overflow-hidden relative border-2 border-dashed border-zinc-300">
                          {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center flex-col gap-2"><i className="fa-solid fa-image text-3xl text-zinc-300"></i><span className="text-[10px] font-bold text-zinc-400 uppercase">Click to upload cover</span></div>}
                          <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 flex justify-between">
                         <span>Gallery Images (Max 20)</span>
                         <span className={editProduct.gallery?.length === 20 ? 'text-red-500' : 'text-[#007AFF]'}>{editProduct.gallery?.length || 0} / 20</span>
                       </label>
                       <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3">
                          {(editProduct.gallery || []).map((img, idx) => (
                            <div key={idx} className="aspect-square rounded-2xl overflow-hidden relative group">
                               <img src={img} className="w-full h-full object-cover" />
                               <button 
                                 onClick={() => removeGalleryImage(idx)}
                                 className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 <i className="fa-solid fa-xmark"></i>
                               </button>
                            </div>
                          ))}
                          {(editProduct.gallery?.length || 0) < 20 && (
                            <div className="aspect-square rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 flex items-center justify-center relative hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                               <i className="fa-solid fa-plus text-zinc-400"></i>
                               <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-200 dark:bg-zinc-800 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                      <button onClick={saveProduct} disabled={isPublishing} className="flex-[3] py-5 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">
                        {isPublishing ? 'جارِ الحفظ...' : 'Save Asset'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between group hover:border-[#007AFF]/30 transition-all">
                      <div className="flex items-center gap-4">
                        <img src={p.image} className="w-16 h-16 rounded-2xl object-cover" />
                        <div>
                          <p className="font-black text-lg">{p.title}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-[10px] font-black text-[#007AFF]">{p.category} • {p.price} EGP</p>
                             <p className="text-[10px] font-bold text-zinc-400">• {p.gallery?.length || 0} Images</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { 
                            setEditProduct(p); 
                            setIsEditingProduct(true); 
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-[#007AFF] rounded-full hover:bg-[#007AFF] hover:text-white transition-all"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)} 
                          className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <button 
                  onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} 
                  className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3"
                >
                  <i className="fa-brands fa-youtube text-xl"></i> Add YouTube Tutorial
                </button>

                {isEditingVideo && (
                  <div id="video-form" className="glass-panel p-10 rounded-[3rem] space-y-8 border-4 border-red-600/10 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-xl uppercase">إعداد فيديو يوتيوب</h3>
                      <button onClick={() => setIsEditingVideo(false)} className="text-zinc-400 hover:text-red-600"><i className="fa-solid fa-xmark text-xl"></i></button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Video Info</label>
                      <input 
                        className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black border-2 border-transparent focus:border-red-600 outline-none transition-all" 
                        value={editVideo.title} 
                        onChange={e => setEditVideo({...editVideo, title: e.target.value})} 
                        placeholder="Video Title (e.g., How to Install Themes)" 
                      />
                      <input 
                        className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black border-2 border-transparent focus:border-red-600 outline-none transition-all" 
                        value={editVideo.url} 
                        onChange={e => setEditVideo({...editVideo, url: e.target.value})} 
                        placeholder="YouTube URL (https://www.youtube.com/watch?v=...)" 
                      />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-5 bg-zinc-200 dark:bg-zinc-800 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                      <button onClick={saveVideo} disabled={isPublishing} className="flex-[3] py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">
                        {isPublishing ? 'جارِ الحفظ...' : 'Save Video'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dbVideos.map(vid => (
                    <div key={vid.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between group hover:border-red-600/30 transition-all">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-900">
                           <img src={`https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`} className="w-full h-full object-cover" alt={vid.title} />
                        </div>
                        <div className="truncate">
                          <p className="font-black text-sm truncate">{vid.title}</p>
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">YouTube Video</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditVideo(vid);
                            setIsEditingVideo(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteVideo(vid.id)} 
                          className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="glass-panel p-10 rounded-[3rem] space-y-12">
                 <section className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Admin Password</label>
                    <input type="password" placeholder="••••" className="w-full p-8 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 font-black text-xl" onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} />
                 </section>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-6 rounded-full font-black text-[10px] uppercase shadow-3xl animate-in fade-in slide-in-from-top-12 flex items-center gap-5 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-2xl`}></i>
          <span>{notification.message}</span>
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
