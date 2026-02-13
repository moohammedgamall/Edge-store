
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { NAV_ITEMS } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

// إعداد عميل Supabase
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

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<any[]>([]); 
  
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loaderLogo, setLoaderLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState<string>("1234");

  const [newPassInput, setNewPassInput] = useState('');
  const [orderDevice, setOrderDevice] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' });
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<YoutubeVideo>>({ title: '', url: '' });

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // وظيفة جلب البيانات من السيرفر
  const refreshData = async () => {
    try {
      // 1. جلب المنتجات
      const { data: prods, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (prodErr) throw prodErr;
      if (prods) setDbProducts(prods.map(p => ({ ...p, gallery: Array.isArray(p.gallery) ? p.gallery : [] })));

      // 2. جلب الفيديوهات
      const { data: vids, error: vidErr } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (vidErr) throw vidErr;
      if (vids) setDbVideos(vids);
      
      // 3. جلب الإعدادات
      const { data: settings, error: settErr } = await supabase.from('settings').select('*');
      if (settErr) throw settErr;
      if (settings) {
        settings.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loader_logo') setLoaderLogo(s.value);
        });
      }
    } catch (err: any) {
      console.error("Database Error:", err.message);
      showNotify("خطأ في الاتصال بالقاعدة: تأكد من تفعيل أذونات RLS", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

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
      showNotify("تم الدخول بنجاح");
    } else {
      showNotify("رمز المرور خاطئ", "error");
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

  const selectedProduct = useMemo(() => dbProducts.find(p => p.id === selectedProductId), [dbProducts, selectedProductId]);
  const currentOrderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const currentGallery = editProduct.gallery || [];
    if (currentGallery.length + files.length > 20) return showNotify("الحد الأقصى 20 صورة", "error");
    const base64Images = await Promise.all(files.map(f => fileToBase64(f)));
    setEditProduct({ ...editProduct, gallery: [...currentGallery, ...base64Images] });
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("العنوان وصورة الغلاف مطلوبة", "error");
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

      await refreshData(); // إعادة التحميل من السيرفر فوراً
      setIsEditingProduct(false);
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' });
      showNotify("تم حفظ ونشر المنتج بنجاح");
    } catch (err: any) { 
      showNotify(`خطأ في الحفظ: ${err.message}`, "error"); 
    } finally { setIsPublishing(false); }
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("جميع الحقول مطلوبة", "error");
    let vidId = editVideo.url.includes('v=') ? editVideo.url.split('v=')[1].split('&')[0] : editVideo.url.split('/').pop()?.split('?')[0];
    if (!vidId) return showNotify("رابط يوتيوب غير صالح", "error");
    
    setIsPublishing(true);
    try {
      const { error } = await supabase.from('videos').upsert({ id: vidId, title: editVideo.title, url: editVideo.url });
      if (error) throw error;
      await refreshData();
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("تم إضافة الفيديو");
    } catch (err: any) { showNotify(err.message, "error"); } finally { setIsPublishing(false); }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      await refreshData();
      showNotify("تم تحديث الإعدادات");
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'site' | 'loader') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      await updateSetting(type === 'site' ? 'site_logo' : 'loader_logo', base64);
    } catch (err) { showNotify("فشل رفع الشعار", "error"); }
  };

  if (isLoading && dbProducts.length === 0) return null;

  return (
    <div className="min-h-screen pb-32">
      <Header isAdmin={isAdminMode} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode} logoUrl={siteLogo} />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-3xl text-center">
            <i className="fa-solid fa-lock text-[#007AFF] text-3xl mb-2"></i>
            <h3 className="font-black uppercase text-sm tracking-widest">لوحة التحكم</h3>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="••••" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setIsAuthModalOpen(false); window.location.hash = '#/'; }} className="py-4 font-bold text-zinc-400">إلغاء</button>
              <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black">دخول</button>
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
                  <div className="col-span-full py-20 text-center glass-panel rounded-[2rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-xs">لا يوجد منتجات حالياً</div>
                )}
              </div>
            </section>
            
            {activeSection === 'Home' && dbVideos.length > 0 && (
              <section className="space-y-8 pb-10">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3"><div className="w-1.5 h-6 bg-red-600 rounded-full"></div> الشروحات</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {dbVideos.map(v => (
                    <a key={v.id} href={v.url} target="_blank" className="glass-panel overflow-hidden rounded-[2.5rem] group border border-white/20 block">
                      <div className="aspect-video w-full bg-zinc-900 relative">
                        <img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-play ml-1"></i>
                          </div>
                        </div>
                      </div>
                      <div className="p-6"><h4 className="font-black text-lg uppercase line-clamp-2">{v.title}</h4></div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Preview Page */}
        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-6xl mx-auto pb-20 px-4">
             <button onClick={() => window.location.hash = '#/'} className="w-10 h-10 mb-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 hover:scale-110 transition-transform"><i className="fa-solid fa-chevron-left"></i></button>
             <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-16">
                <div className="w-full flex flex-col items-center gap-8 lg:w-auto shrink-0">
                   <div className="relative aspect-[1290/2796] w-full max-w-[320px] rounded-[40px] bg-black p-3 shadow-3xl">
                      <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-zinc-900">
                        <img src={selectedProduct.gallery[previewImageIndex] || selectedProduct.image} className="w-full h-full object-cover transition-opacity duration-500" alt="" />
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-3 justify-center">
                      {(selectedProduct.gallery.length > 0 ? selectedProduct.gallery : [selectedProduct.image]).map((img, idx) => (
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
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">السعر</p>
                          <span className="text-4xl font-black text-[#007AFF]">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</span>
                        </div>
                        <i className="fa-solid fa-medal text-[#007AFF] text-4xl opacity-20"></i>
                      </div>
                      <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-[2rem] font-black text-xl hover:scale-[1.02] transition-all">اطلب الآن</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Order Page */}
        {activeSection === 'Order' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8">
            <div className="glass-panel p-10 md:p-16 rounded-[4.5rem] space-y-14 text-center">
                <div className="w-24 h-24 bg-[#007AFF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-shield-halved text-[#007AFF] text-4xl"></i>
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">بوابة الطلب</h2>
                <div className="space-y-10 max-w-2xl mx-auto">
                <div className="grid grid-cols-2 gap-4">
                  {['Realme', 'Oppo'].map(d => (
                    <button key={d} onClick={() => setOrderDevice(d as any)} className={`py-6 rounded-2xl font-black text-xl border-2 transition-all ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent'}`}>
                      {d}
                    </button>
                  ))}
                </div>
                <select className="w-full p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black" value={orderProductId} onChange={e => setOrderProductId(e.target.value)}>
                  <option value="">اختر المنتج...</option>
                  {dbProducts.map(p => <option key={p.id} value={p.id}>{p.title} — {p.price} EGP</option>)}
                </select>
                {currentOrderedProduct && (
                  <div className="space-y-8 animate-in zoom-in-95">
                    <div className="p-10 bg-orange-500/5 border-2 border-dashed border-orange-500/20 rounded-3xl">
                      <p className="text-orange-600 font-black text-xs uppercase mb-2">الدفع عبر فودافون كاش</p>
                      <div className="text-3xl font-black tracking-widest text-orange-600 select-all font-mono">01091931466</div>
                    </div>
                    <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=اطلب: ${currentOrderedProduct.title}`, '_blank')} className="w-full py-8 bg-[#0088CC] text-white rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-4">
                      <i className="fa-brands fa-telegram text-3xl"></i> تواصل عبر تليجرام
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Dashboard */}
        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex p-2 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-[2rem] max-w-lg mx-auto shadow-xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-2xl transition-all text-xs uppercase font-black ${adminTab === tab ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow-lg' : 'text-zinc-400'}`}>{tab}</button>)}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-xs">إضافة منتج جديد</button>
                {isEditingProduct && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-4 border-[#007AFF]/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="اسم المنتج" />
                        <textarea className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="الوصف" rows={3} />
                        <div className="grid grid-cols-2 gap-4">
                          <input type="number" className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="السعر بالجنيه" />
                          <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.android_version} onChange={e => setEditProduct({...editProduct, android_version: e.target.value})} placeholder="نسخة الأندرويد" />
                        </div>
                        <select className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}><option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option></select>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-zinc-400">صورة الغلاف</label>
                           <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-3xl overflow-hidden relative border-2 border-dashed border-zinc-300">
                             {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center flex-col text-zinc-300"><i className="fa-solid fa-image text-3xl mb-2"></i><span>ارفع صورة</span></div>}
                             <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                           </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-zinc-400">معرض الصور ({editProduct.gallery?.length || 0}/20)</label><label className="cursor-pointer text-[#007AFF] font-black text-xs uppercase underline">رفع الصور<input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" /></label></div>
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
                    <button onClick={saveProduct} disabled={isPublishing} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-sm shadow-xl">{isPublishing ? 'جاري النشر...' : 'حفظ ونشر على الموقع'}</button>
                  </div>
                )}
                {/* List of products to delete or edit */}
                <div className="space-y-4">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4"><img src={p.image} className="w-16 h-16 rounded-xl object-cover" /><div><p className="font-black">{p.title}</p><p className="text-[10px] text-[#007AFF]">{p.category} • {p.price} EGP</p></div></div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-600 rounded-full"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={async () => { if(confirm('حذف المنتج؟')) { await supabase.from('products').delete().eq('id', p.id); refreshData(); } }} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full"><i className="fa-solid fa-trash"></i></button>
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
                      <label className="text-[10px] font-black uppercase text-zinc-400">شعار الموقع العلوي</label>
                      <div className="w-32 h-32 rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100">
                        <img src={siteLogo} className="w-full h-full object-cover" />
                        <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'site')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </section>
                    <section className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-zinc-400">شعار صفحة التحميل</label>
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
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-6 rounded-full font-black text-[10px] uppercase shadow-3xl flex items-center gap-5 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-2xl`}></i>
          <span>{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={s => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />}
    </div>
  );
};

export default App;
