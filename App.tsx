import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings } from './types';
import { MOCK_PRODUCTS, DEFAULT_BANNER } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

// Supabase Configuration
const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdpeGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  
  const [banner, setBanner] = useState<BannerSettings & { isVisible?: boolean }>(DEFAULT_BANNER);
  const [products, setProducts] = useState<Product[]>([]);

  // Site Identity State
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loadingLogo, setLoadingLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('1234');
  const [passwordInput, setPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordData, setNewPasswordData] = useState({ current: '', next: '', confirm: '' });

  const [selectedPhone, setSelectedPhone] = useState<'Realme' | 'Oppo'>('Realme');
  const [selectedCategory, setSelectedCategory] = useState<Section>('Themes');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ is_premium: false });
  const [isEditingBanner, setIsEditingBanner] = useState<boolean>(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const loadingLogoFileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const productsInCategory = useMemo(() => {
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const selectedProduct = useMemo(() => {
    const found = products.find(p => p.id === selectedProductId);
    if (found && (found.category === selectedCategory || selectedCategory === 'Themes' || selectedCategory === 'Home' || activeSection === 'Preview')) return found;
    return productsInCategory.length > 0 ? productsInCategory[0] : null;
  }, [products, selectedProductId, selectedCategory, productsInCategory, activeSection]);

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        if (!isAdminMode) {
          window.location.hash = '#/';
          setIsAuthModalOpen(true);
        } else {
          setActiveSection('Admin');
        }
      } else if (hash.startsWith('#/preview/')) {
        const id = hash.replace('#/preview/', '');
        setSelectedProductId(id);
        setActiveSection('Preview');
      } else {
        if (activeSection === 'Admin' && !isAdminMode) setActiveSection('Home');
      }
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, [isAdminMode, activeSection]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: settingsData } = await supabase.from('settings').select('key, value');
        
        if (settingsData) {
          const pass = settingsData.find(s => s.key === 'admin_password');
          if (pass) setAdminPassword(pass.value);
          const sLogo = settingsData.find(s => s.key === 'site_logo');
          if (sLogo) setSiteLogo(sLogo.value);
          const lLogo = settingsData.find(s => s.key === 'loading_logo');
          if (lLogo) setLoadingLogo(lLogo.value);
        }

        const { data: bannerData } = await supabase.from('banner').select('*').eq('id', 1).maybeSingle();
        if (bannerData) {
          setBanner({
            title: bannerData.title,
            highlight: bannerData.highlight,
            description: bannerData.description || DEFAULT_BANNER.description,
            imageUrl: bannerData.imageUrl,
            buttonText: bannerData.buttonText || 'Explore Shop',
            isVisible: true
          });
        }

        const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (productsData && productsData.length > 0) {
          setProducts(productsData);
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      } catch (error) {
        setProducts(MOCK_PRODUCTS);
      } finally {
        setTimeout(() => setIsLoading(false), 1200);
      }
    };
    fetchData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdminAuth = () => {
    if (passwordInput.trim() === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotification("Welcome Back, Admin");
    } else {
      showNotification("Invalid Security Key", "info");
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAdminMode(false);
    setActiveSection('Home');
    window.location.hash = '#/';
    showNotification("Logged out successfully", "info");
  };

  const handleUpdatePassword = async () => {
    const { current, next, confirm } = newPasswordData;
    if (current.trim() !== adminPassword) return showNotification("Old key is incorrect", "info");
    if (!next.trim() || next !== confirm) return showNotification("New keys don't match", "info");

    try {
      const { error } = await supabase.from('settings').upsert({ key: 'admin_password', value: next.trim() }, { onConflict: 'key' });
      if (error) throw error;
      setAdminPassword(next.trim());
      setIsChangingPassword(false);
      setNewPasswordData({ current: '', next: '', confirm: '' });
      showNotification("Security Key Updated Successfully!");
    } catch (err) {
      showNotification("Update Failed", "info");
    }
  };

  const handleSaveIdentity = async () => {
    setIsPublishing(true);
    try {
      await supabase.from('settings').upsert({ key: 'site_logo', value: siteLogo }, { onConflict: 'key' });
      await supabase.from('settings').upsert({ key: 'loading_logo', value: loadingLogo }, { onConflict: 'key' });
      setIsEditingIdentity(false);
      showNotification("Identity Config Updated");
    } catch (err) {
      showNotification("Save Failed", "info");
    } finally {
      setIsPublishing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'site' | 'loading') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        if (target === 'site') setSiteLogo(base64);
        else setLoadingLogo(base64);
      } catch (err) {
        showNotification("File processing failed", "info");
      }
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setEditProduct({ ...editProduct, image: base64 });
      } catch (err) { console.error(err); }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setBanner({ ...banner, imageUrl: base64 });
      } catch (err) { console.error(err); }
    }
  };

  const handleGalleryImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const currentGallery = editProduct.gallery || [];
    try {
      const newImages = await Promise.all(files.map(file => fileToBase64(file as File)));
      setEditProduct({ ...editProduct, gallery: [...currentGallery, ...newImages].slice(0, 15) });
    } catch (err) { console.error(err); }
  };

  const handleSaveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotification("Missing title or image", "info");
    setIsPublishing(true);
    const productToSave = { 
      id: editProduct.id || Date.now().toString(),
      title: editProduct.title,
      description: editProduct.description || '',
      category: editProduct.category || 'Themes',
      price: editProduct.price || 0,
      image: editProduct.image,
      gallery: editProduct.gallery || [],
      rating: 5.0, 
      downloads: editProduct.downloads || '0',
      is_premium: editProduct.is_premium || false,
      compatibility: editProduct.compatibility || 'ColorOS 15'
    };
    try {
      const { error } = await supabase.from('products').upsert(productToSave);
      if (error) throw error;
      setProducts(prev => {
        const exists = prev.find(p => p.id === productToSave.id);
        return exists ? prev.map(p => p.id === productToSave.id ? (productToSave as Product) : p) : [productToSave as Product, ...prev];
      });
      setIsEditing(false);
      showNotification("Asset published!");
    } catch (err) { showNotification("Save Failed", "info"); }
    finally { setIsPublishing(false); }
  };

  const handleSaveBanner = async () => {
    setIsPublishing(true);
    try {
      await supabase.from('banner').upsert({ id: 1, title: banner.title, highlight: banner.highlight, description: banner.description, imageUrl: banner.imageUrl });
      setIsEditingBanner(false);
      showNotification("Banner Updated");
    } catch (err) { showNotification("Update Failed", "info"); }
    finally { setIsPublishing(false); }
  };

  const handleSliderScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const width = sliderRef.current.offsetWidth;
      setCurrentSlide(Math.round(scrollLeft / width));
    }
  };

  const scrollToIndex = (index: number) => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: index * sliderRef.current.offsetWidth, behavior: 'smooth' });
    }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full animate-pulse"></div>
      <div className="relative mb-12">
        {/* Loading Logo - Circular without border */}
        <div className="w-48 h-48 relative z-10 animate-pulse flex items-center justify-center rounded-full shadow-2xl overflow-hidden">
          {!imgLoadError ? (
            <img 
              src={loadingLogo}
              alt="Mohamed Edge" 
              className="w-full h-full object-cover rounded-full"
              onError={() => setImgLoadError(true)}
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center">
              <span className="text-white font-black text-4xl tracking-tighter">ME</span>
            </div>
          )}
        </div>
      </div>
      <div className="text-center space-y-4 relative z-10">
        <h3 className="text-3xl font-black tracking-tighter text-zinc-900">Mohamed Edge</h3>
        <div className="flex flex-col items-center">
          <div className="w-56 h-1.5 bg-zinc-200 rounded-full overflow-hidden mb-4 shadow-inner">
            <div className="h-full bg-gradient-to-r from-[#007AFF] to-blue-400 w-1/3 animate-[loading_1.8s_infinite_ease-in-out]"></div>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-400">Solo Entrepreneur Experience</p>
        </div>
      </div>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header logoUrl={siteLogo} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={handleLogout} />
      
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/30 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[3rem] space-y-6 border-white shadow-2xl">
              <div className="text-center">
                <h3 className="text-xl font-black tracking-tight">Access Locked</h3>
                <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enter Master Key</p>
              </div>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} className="w-full p-5 rounded-2xl bg-zinc-100 text-center text-3xl font-black tracking-[0.5em] outline-none" placeholder="••••" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Exit</button>
                <button onClick={handleAdminAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-12 pb-32">
            {banner.isVisible && (
              <section className="relative w-full aspect-[4/5] sm:aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl group border-[3px] sm:border-[5px] border-white">
                <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 sm:px-16 md:px-24">
                  <div className="max-w-2xl space-y-4 text-center sm:text-left items-center sm:items-start flex flex-col">
                    <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-tight tracking-tighter">
                      {banner.title} <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] to-blue-400">{banner.highlight}</span>
                    </h2>
                    <button onClick={() => setActiveSection('Themes')} className="px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-500/40 active:scale-95 transition-all">Browse collection</button>
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <div className="w-2 h-8 bg-[#007AFF] rounded-full"></div> 
                  Featured Assets
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                {products.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={(id) => { setSelectedProductId(id); setActiveSection('Preview'); window.location.hash = `#/preview/${id}`; }} 
                    onBuy={(id, cat) => { setSelectedCategory(cat as Section); setSelectedProductId(id); setActiveSection('Order'); window.location.hash = '#/order'; }} 
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeSection === 'Preview' && (
          <div className="max-w-5xl mx-auto space-y-6 pb-32 animate-in fade-in">
             <button onClick={() => { setActiveSection('Home'); window.location.hash = '#/'; }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all"><i className="fa-solid fa-chevron-left text-sm"></i></button>
             {selectedProduct && (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7">
                    <div className="relative group">
                      <div ref={sliderRef} onScroll={handleSliderScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2.5rem] shadow-xl bg-white border-4 border-white">
                        {(selectedProduct.gallery?.length ? selectedProduct.gallery : [selectedProduct.image]).map((url, i) => (
                          <div key={i} className="min-w-full snap-center p-4">
                            <img src={url} className="w-full h-auto rounded-[2rem] object-contain" />
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-white/20 backdrop-blur-3xl rounded-full">
                        {(selectedProduct.gallery?.length ? selectedProduct.gallery : [selectedProduct.image]).map((_, i) => (
                          <div key={i} className={`h-1.5 rounded-full transition-all ${currentSlide === i ? 'w-6 bg-[#007AFF]' : 'w-1.5 bg-zinc-300'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5 space-y-6">
                    <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-white shadow-2xl">
                       <div>
                         <span className="text-[10px] font-black uppercase text-[#007AFF] tracking-widest mb-1 block">{selectedProduct.category}</span>
                         <h2 className="text-3xl font-black tracking-tighter leading-none">{selectedProduct.title}</h2>
                       </div>
                       <p className="text-4xl font-black text-zinc-900">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                       <div className="space-y-4 pt-4 border-t">
                         <h4 className="font-black text-xs uppercase text-zinc-400">Description</h4>
                         <p className="text-zinc-500 text-sm leading-relaxed font-medium">{selectedProduct.description}</p>
                       </div>
                       <button onClick={() => { setActiveSection('Order'); window.location.hash = '#/order'; }} className="w-full py-5 rounded-2xl bg-[#007AFF] text-white font-black text-lg active:scale-95 transition-all shadow-xl shadow-blue-500/20">Get it Now</button>
                    </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-4xl mx-auto space-y-10 pb-32 animate-in fade-in">
             <div className="text-center space-y-2">
               <h2 className="text-4xl font-black tracking-tighter">Complete Order</h2>
               <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Connect with Mohamed Edge</p>
             </div>
             <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-white shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                   {['Realme', 'Oppo'].map(b => <button key={b} onClick={() => setSelectedPhone(b as any)} className={`py-4 rounded-2xl font-black text-lg transition-all ${selectedPhone === b ? 'bg-[#007AFF] text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>{b}</button>)}
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-2">Selected Product</label>
                  <select value={selectedProduct?.id} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-5 rounded-2xl bg-zinc-100 font-black appearance-none outline-none border-2 border-transparent focus:border-[#007AFF] transition-all">
                    {productsInCategory.map(p => <option key={p.id} value={p.id}>{p.title} — {p.price} EGP</option>)}
                    {productsInCategory.length === 0 && <option disabled>No items in this category</option>}
                  </select>
                </div>
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-center animate-pulse">
                   <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white"><i className="fa-solid fa-wallet text-xl"></i></div>
                   <div className="flex-1">
                     <p className="text-[10px] font-black uppercase text-amber-900 mb-1 tracking-widest">Vodafone Cash</p>
                     <p className="text-xl font-black text-amber-900">01091931466</p>
                   </div>
                </div>
                <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=I would like to order: ${selectedProduct?.title} for ${selectedPhone}`)} className="w-full py-5 bg-[#24A1DE] text-white font-black text-lg rounded-2xl active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-sky-500/20 transition-all">
                  <i className="fa-brands fa-telegram text-2xl"></i><span>Order via Telegram</span>
                </button>
             </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tighter">Store Control</h2>
                <div className="flex gap-2">
                   <button onClick={() => setIsEditingIdentity(!isEditingIdentity)} className="px-5 py-3 rounded-2xl font-black text-xs bg-white border">Identity</button>
                   <button onClick={() => { setIsEditing(true); setEditProduct({id: Date.now().toString(), price: 0, category: 'Themes', is_premium: false}); }} className="px-5 py-3 bg-[#007AFF] text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-500/20">Add Asset</button>
                </div>
             </div>

             {isEditingIdentity && (
               <div className="glass-panel p-8 rounded-[2rem] space-y-8 border-white shadow-xl">
                  <h4 className="text-xs font-black uppercase text-zinc-400 border-b pb-4">Brand System</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <p className="font-black text-xs text-zinc-500 uppercase">Site Logo (Header)</p>
                        <div onClick={() => logoFileInputRef.current?.click()} className="h-28 bg-zinc-50 rounded-3xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors">
                           <img src={siteLogo} className="w-14 h-14 rounded-full shadow-md object-cover" />
                           <input ref={logoFileInputRef} type="file" className="hidden" onChange={e => handleLogoUpload(e, 'site')} />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <p className="font-black text-xs text-zinc-500 uppercase">Loading Logo (Intro)</p>
                        <div onClick={() => loadingLogoFileInputRef.current?.click()} className="h-28 bg-zinc-50 rounded-3xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors">
                           <img src={loadingLogo} className="w-14 h-14 rounded-full shadow-md object-cover" />
                           <input ref={loadingLogoFileInputRef} type="file" className="hidden" onChange={e => handleLogoUpload(e, 'loading')} />
                        </div>
                     </div>
                  </div>
                  <button onClick={handleSaveIdentity} className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-black text-sm active:scale-95 transition-all">Save Identity Configuration</button>
               </div>
             )}

             {isEditing && (
                <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-white shadow-2xl">
                   <div className="flex justify-between items-center"><h3 className="text-xl font-black">Asset Editor</h3><button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-zinc-900"><i className="fa-solid fa-xmark"></i></button></div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input placeholder="Product Name" className="p-4 rounded-xl border-2 border-zinc-100 font-bold focus:border-[#007AFF] outline-none" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
                      <input placeholder="Price (EGP)" type="number" className="p-4 rounded-xl border-2 border-zinc-100 font-bold focus:border-[#007AFF] outline-none" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <select className="p-4 rounded-xl border-2 border-zinc-100 font-bold" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                        <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                      </select>
                      <input placeholder="Compatibility (e.g. ColorOS 15)" className="p-4 rounded-xl border-2 border-zinc-100 font-bold focus:border-[#007AFF] outline-none" value={editProduct.compatibility || ''} onChange={e => setEditProduct({...editProduct, compatibility: e.target.value})} />
                   </div>
                   <div className="space-y-4">
                      <div onClick={() => fileInputRef.current?.click()} className="h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer bg-zinc-50 hover:bg-zinc-100 overflow-hidden">
                        {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <p className="text-[10px] font-black uppercase text-zinc-400">Click to upload Main Image</p>}
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleMainImageUpload} />
                      </div>
                   </div>
                   <textarea placeholder="Product Description" className="w-full p-4 rounded-xl border-2 border-zinc-100 font-medium h-32 focus:border-[#007AFF] outline-none" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                   <button onClick={handleSaveProduct} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">{isPublishing ? "Syncing..." : "Save Asset"}</button>
                </div>
             )}

             <div className="grid grid-cols-1 gap-4">
                {products.map(p => (
                  <div key={p.id} className="p-5 bg-white rounded-3xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <img src={p.image} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                      <div>
                        <p className="font-black text-lg">{p.title}</p>
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{p.category} • {p.price} EGP</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {setEditProduct(p); setIsEditing(true);}} className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors"><i className="fa-solid fa-pen"></i></button>
                      <button onClick={async () => { if(confirm('Permanently delete?')) { await supabase.from('products').delete().eq('id', p.id); setProducts(ps => ps.filter(x => x.id !== p.id)); showNotification("Deleted"); } }} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {['Themes', 'Widgets', 'Walls'].includes(activeSection) && (
          <div className="space-y-10 pb-32 animate-in fade-in">
            <div className="px-2">
               <h2 className="text-3xl font-black tracking-tighter">{activeSection}</h2>
               <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mt-1">Premium Collection</p>
            </div>
            <div className="grid grid-cols-1 gap-10">
              {products.filter(p => p.category === activeSection).length > 0 ? (
                products.filter(p => p.category === activeSection).map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={(id) => { setSelectedProductId(id); setActiveSection('Preview'); window.location.hash = `#/preview/${id}`; }} 
                    onBuy={(id, cat) => { setSelectedCategory(cat as Section); setSelectedProductId(id); setActiveSection('Order'); window.location.hash = '#/order'; }} 
                  />
                ))
              ) : (
                <div className="py-32 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-zinc-200">
                  <p className="text-zinc-400 font-black uppercase text-xs tracking-[0.3em]">Stock Empty</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4">
          <div className="bg-[#007AFF] text-white px-8 py-4 rounded-full font-black text-xs shadow-2xl flex items-center gap-3 uppercase tracking-widest">
            <i className="fa-solid fa-circle-check"></i>
            {notification.message}
          </div>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && (
        <BottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
      )}
    </div>
  );
};

export default App;