
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings, YoutubeVideo } from './types';
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
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideo[]>([]);

  // Site Identity State - Initializing from LocalStorage for instant branding
  const [siteLogo, setSiteLogo] = useState<string>(localStorage.getItem('site_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loadingLogo, setLoadingLogo] = useState<string>(localStorage.getItem('loading_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [isEditingVideos, setIsEditingVideos] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState<boolean>(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('1234');
  const [passwordInput, setPasswordInput] = useState('');
  
  const [selectedPhone, setSelectedPhone] = useState<'Realme' | 'Oppo'>('Realme');
  const [selectedCategory, setSelectedCategory] = useState<Section>('Themes');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ is_premium: false });
  const [newVideo, setNewVideo] = useState({ title: '', url: '' });

  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const loadingLogoFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const productsInCategory = useMemo(() => {
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const selectedProduct = useMemo(() => {
    const found = products.find(p => p.id === selectedProductId);
    if (found && (found.category === selectedCategory || selectedCategory === 'Themes' || selectedCategory === 'Home' || activeSection === 'Preview')) return found;
    return productsInCategory.length > 0 ? productsInCategory[0] : null;
  }, [products, selectedProductId, selectedCategory, productsInCategory, activeSection]);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

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
      }
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, [isAdminMode]);

  useEffect(() => {
    const fetchData = async () => {
      // Keep loading screen visible for a minimum time for smooth transition
      const startTime = Date.now();
      
      try {
        const { data: settingsData } = await supabase.from('settings').select('key, value');
        if (settingsData) {
          const pass = settingsData.find(s => s.key === 'admin_password');
          if (pass) setAdminPassword(pass.value);
          
          const sLogo = settingsData.find(s => s.key === 'site_logo');
          if (sLogo) {
            setSiteLogo(sLogo.value);
            localStorage.setItem('site_logo', sLogo.value);
          }
          
          const lLogo = settingsData.find(s => s.key === 'loading_logo');
          if (lLogo) {
            setLoadingLogo(lLogo.value);
            localStorage.setItem('loading_logo', lLogo.value);
          }
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
        if (productsData) setProducts(productsData);

        const { data: videosData } = await supabase.from('youtube_videos').select('*').order('created_at', { ascending: false });
        if (videosData) setYoutubeVideos(videosData);

      } catch (error) {
        console.error(error);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1500 - elapsed);
        setTimeout(() => setIsLoading(false), remaining);
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
    showNotification("Logged out", "info");
  };

  const handleSaveVideo = async () => {
    if (!newVideo.title || !newVideo.url) return showNotification("Missing Title or Link", "info");
    setIsPublishing(true);
    const videoData = { id: Date.now().toString(), ...newVideo };
    try {
      const { error } = await supabase.from('youtube_videos').insert(videoData);
      if (error) throw error;
      setYoutubeVideos([videoData, ...youtubeVideos]);
      setNewVideo({ title: '', url: '' });
      showNotification("Video Added Successfully");
    } catch (err) { showNotification("Failed to add video", "info"); }
    finally { setIsPublishing(false); }
  };

  const handleDeleteVideo = async (id: string) => {
    if(!confirm("Delete this video?")) return;
    try {
      await supabase.from('youtube_videos').delete().eq('id', id);
      setYoutubeVideos(youtubeVideos.filter(v => v.id !== id));
      showNotification("Video Deleted");
    } catch (err) { showNotification("Delete failed", "info"); }
  };

  const handleSaveIdentity = async () => {
    setIsPublishing(true);
    try {
      await supabase.from('settings').upsert({ key: 'site_logo', value: siteLogo }, { onConflict: 'key' });
      await supabase.from('settings').upsert({ key: 'loading_logo', value: loadingLogo }, { onConflict: 'key' });
      
      localStorage.setItem('site_logo', siteLogo);
      localStorage.setItem('loading_logo', loadingLogo);
      
      setIsEditingIdentity(false);
      showNotification("Identity Updated");
    } catch (err) { showNotification("Save Failed", "info"); }
    finally { setIsPublishing(false); }
  };

  const handleSaveBanner = async () => {
    setIsPublishing(true);
    try {
      await supabase.from('banner').upsert({ 
        id: 1, 
        title: banner.title, 
        highlight: banner.highlight, 
        description: banner.description, 
        imageUrl: banner.imageUrl 
      });
      setIsEditingBanner(false);
      showNotification("Banner Updated Successfully");
    } catch (err) { showNotification("Update Failed", "info"); }
    finally { setIsPublishing(false); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBanner({ ...banner, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'site' | 'loading') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (target === 'site') setSiteLogo(result);
        else {
          setLoadingLogo(result);
          setImgLoadError(false); // Reset error state for new logo
        }
      };
      reader.readAsDataURL(file);
    }
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

  const handleSliderScroll = () => {
    if (sliderRef.current) {
      setCurrentSlide(Math.round(sliderRef.current.scrollLeft / sliderRef.current.offsetWidth));
    }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/5 blur-[80px] rounded-full"></div>
      <div className="w-48 h-48 animate-pulse rounded-full overflow-hidden shadow-2xl mb-12 relative z-10 border-4 border-white">
        {!imgLoadError ? (
          <img 
            src={loadingLogo} 
            className="w-full h-full object-cover" 
            onError={() => setImgLoadError(true)} 
            alt="Loading..."
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <span className="text-white font-black text-4xl">ME</span>
          </div>
        )}
      </div>
      <h3 className="text-3xl font-black text-zinc-900 tracking-tighter relative z-10">Mohamed Edge</h3>
      <div className="w-12 h-1 bg-[#007AFF] rounded-full mt-4 animate-bounce"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header logoUrl={siteLogo} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={handleLogout} />
      
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[3rem] space-y-6 border-white shadow-2xl">
              <div className="text-center">
                <h3 className="text-xl font-black">Access Locked</h3>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1">Master Key Required</p>
              </div>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} className="w-full p-5 rounded-2xl bg-zinc-100 text-center text-3xl font-black tracking-[0.5em] outline-none" placeholder="••••" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-4 text-xs font-black text-zinc-400 uppercase">Exit</button>
                <button onClick={handleAdminAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 pb-32">
            {banner.isVisible && (
              <section className="relative w-full aspect-[4/5] sm:aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-[5px] border-white group">
                <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-8 md:p-16">
                   <h2 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter">
                     {banner.title} <br/>
                     <span className="text-[#007AFF]">{banner.highlight}</span>
                   </h2>
                   <button onClick={() => setActiveSection('Themes')} className="mt-8 px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black text-xs uppercase tracking-widest self-start shadow-xl active:scale-95 transition-all">Start Exploring</button>
                </div>
              </section>
            )}

            {youtubeVideos.length > 0 && (
              <section className="space-y-8 animate-in slide-in-from-bottom-4">
                <div className="px-2 flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <div className="w-2 h-8 bg-red-600 rounded-full"></div> 
                    Featured Tutorials
                  </h2>
                </div>
                <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-6 pb-4">
                  {youtubeVideos.map((video) => {
                    const videoId = getYoutubeId(video.url);
                    const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
                    return (
                      <div key={video.id} onClick={() => window.open(video.url)} className="min-w-[300px] sm:min-w-[400px] snap-center glass-panel rounded-[2.5rem] overflow-hidden cursor-pointer group border-white">
                        <div className="relative aspect-video">
                          <img src={thumb} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={video.title} />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 text-white group-hover:scale-125 transition-all duration-500">
                              <i className="fa-solid fa-play text-2xl ml-1"></i>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <h4 className="font-black text-lg text-zinc-900 group-hover:text-red-600 transition-colors line-clamp-1">{video.title}</h4>
                          <p className="text-[10px] font-black text-zinc-400 uppercase mt-2 tracking-widest flex items-center gap-2">
                            <i className="fa-brands fa-youtube text-red-600"></i> Watch on YouTube
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="space-y-8">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 px-2">
                <div className="w-2 h-8 bg-[#007AFF] rounded-full"></div> 
                Latest Release
              </h2>
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

        {/* preview, order, and admin sections follow exactly as before... */}
        {activeSection === 'Preview' && selectedProduct && (
           <div className="max-w-5xl mx-auto space-y-6 pb-32 animate-in fade-in">
              <button onClick={() => { setActiveSection('Home'); window.history.back(); }} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                 <div className="lg:col-span-7 relative group">
                    <div ref={sliderRef} onScroll={handleSliderScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[3rem] shadow-2xl bg-white border-8 border-white">
                       {(selectedProduct.gallery?.length ? selectedProduct.gallery : [selectedProduct.image]).map((url, i) => (
                         <div key={i} className="min-w-full snap-center p-2"><img src={url} className="w-full h-auto rounded-[2.5rem] object-contain" /></div>
                       ))}
                    </div>
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 bg-black/10 backdrop-blur-xl px-4 py-2 rounded-full">
                       {(selectedProduct.gallery?.length ? selectedProduct.gallery : [selectedProduct.image]).map((_, i) => (
                         <div key={i} className={`h-1.5 rounded-full transition-all ${currentSlide === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
                       ))}
                    </div>
                 </div>
                 <div className="lg:col-span-5">
                    <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-white shadow-2xl sticky top-28">
                       <div>
                         <span className="text-[10px] font-black uppercase text-[#007AFF] tracking-widest">{selectedProduct.category}</span>
                         <h2 className="text-4xl font-black tracking-tighter mt-1">{selectedProduct.title}</h2>
                       </div>
                       <p className="text-5xl font-black text-zinc-900">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                       <p className="text-zinc-500 font-medium leading-relaxed">{selectedProduct.description}</p>
                       <button onClick={() => { setActiveSection('Order'); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Get Access Now</button>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10 pb-32 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tighter">Master Control</h2>
                <div className="flex flex-wrap gap-3">
                   <button onClick={() => { setIsEditingIdentity(!isEditingIdentity); setIsEditingVideos(false); setIsEditingBanner(false); }} className={`px-6 py-3 rounded-2xl font-black text-xs border shadow-sm ${isEditingIdentity ? 'bg-zinc-900 text-white' : 'bg-white'}`}>Identity</button>
                   <button onClick={() => { setIsEditingBanner(!isEditingBanner); setIsEditingIdentity(false); setIsEditingVideos(false); }} className={`px-6 py-3 rounded-2xl font-black text-xs border shadow-sm ${isEditingBanner ? 'bg-[#007AFF] text-white' : 'bg-white'}`}>Banner</button>
                   <button onClick={() => { setIsEditingVideos(!isEditingVideos); setIsEditingIdentity(false); setIsEditingBanner(false); }} className={`px-6 py-3 rounded-2xl font-black text-xs border shadow-sm ${isEditingVideos ? 'bg-red-600 text-white' : 'bg-white'}`}>Videos</button>
                   <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-xs shadow-xl">New Asset</button>
                </div>
             </div>

             {isEditingIdentity && (
               <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-white shadow-xl animate-in slide-in-from-top-4">
                  <h4 className="text-xs font-black uppercase text-zinc-400 border-b pb-4 tracking-widest">Site Identity</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <p className="text-xs font-black text-zinc-500 uppercase">Site Logo (Header)</p>
                      <div onClick={() => logoFileInputRef.current?.click()} className="h-32 bg-zinc-50 rounded-[2rem] border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-all">
                        <img src={siteLogo} className="w-16 h-16 rounded-full object-cover shadow-lg" />
                        <input ref={logoFileInputRef} type="file" className="hidden" onChange={e => handleLogoUpload(e, 'site')} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-black text-zinc-500 uppercase">Loading Logo (Intro)</p>
                      <div onClick={() => loadingLogoFileInputRef.current?.click()} className="h-32 bg-zinc-50 rounded-[2rem] border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-all">
                        <img src={loadingLogo} className="w-16 h-16 rounded-full object-cover shadow-lg" />
                        <input ref={loadingLogoFileInputRef} type="file" className="hidden" onChange={e => handleLogoUpload(e, 'loading')} />
                      </div>
                    </div>
                  </div>
                  <button onClick={handleSaveIdentity} disabled={isPublishing} className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-black disabled:opacity-50">{isPublishing ? "Updating..." : "Save Identity Configuration"}</button>
               </div>
             )}

             {isEditingBanner && (
               <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-white shadow-xl animate-in slide-in-from-top-4">
                  <h4 className="text-xs font-black uppercase text-[#007AFF] border-b pb-4 tracking-widest">Hero Banner Manager</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <p className="text-xs font-black text-zinc-500 uppercase ml-2">Main Title</p>
                       <input placeholder="e.g. Liquid Glass for" className="w-full p-5 rounded-2xl bg-zinc-100 font-bold outline-none" value={banner.title} onChange={e => setBanner({...banner, title: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                       <p className="text-xs font-black text-zinc-500 uppercase ml-2">Highlight Text</p>
                       <input placeholder="e.g. ColorOS 15" className="w-full p-5 rounded-2xl bg-zinc-100 font-bold outline-none" value={banner.highlight} onChange={e => setBanner({...banner, highlight: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-xs font-black text-zinc-500 uppercase ml-2">Short Description</p>
                     <textarea placeholder="Tell users about this collection..." className="w-full p-5 rounded-2xl bg-zinc-100 font-medium h-24 outline-none resize-none" value={banner.description} onChange={e => setBanner({...banner, description: e.target.value})} />
                  </div>
                  <div className="space-y-4">
                     <p className="text-xs font-black text-zinc-500 uppercase ml-2">Banner Background Visual</p>
                     <div onClick={() => bannerFileInputRef.current?.click()} className="h-48 rounded-[2rem] border-2 border-dashed bg-zinc-50 flex items-center justify-center cursor-pointer overflow-hidden group">
                        {banner.imageUrl ? <img src={banner.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <p className="text-xs font-black text-zinc-400">Click to upload banner image</p>}
                        <input ref={bannerFileInputRef} type="file" className="hidden" onChange={handleBannerUpload} />
                     </div>
                  </div>
                  <button onClick={handleSaveBanner} disabled={isPublishing} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                    {isPublishing ? "Updating Banner..." : "Save Banner Changes"}
                  </button>
               </div>
             )}

             {isEditingVideos && (
               <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-white shadow-xl animate-in slide-in-from-top-4">
                  <h4 className="text-xs font-black uppercase text-red-600 border-b pb-4 tracking-widest">YouTube Manager</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <input placeholder="Video Title" className="p-5 rounded-2xl bg-zinc-100 font-bold outline-none border-2 border-transparent focus:border-red-500 transition-all" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} />
                     <input placeholder="YouTube URL (https://...)" className="p-5 rounded-2xl bg-zinc-100 font-bold outline-none border-2 border-transparent focus:border-red-500 transition-all" value={newVideo.url} onChange={e => setNewVideo({...newVideo, url: e.target.value})} />
                  </div>
                  <button onClick={handleSaveVideo} disabled={isPublishing} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all">Add Video to Home</button>
                  
                  <div className="pt-8 space-y-4">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Current Videos</p>
                    {youtubeVideos.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><i className="fa-brands fa-youtube"></i></div>
                          <span className="font-bold text-sm line-clamp-1">{v.title}</span>
                        </div>
                        <button onClick={() => handleDeleteVideo(v.id)} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center active:scale-90 transition-all"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             {isEditing && (
                <div className="glass-panel p-10 rounded-[3rem] space-y-6 border-white shadow-2xl relative animate-in slide-in-from-top-6">
                   <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-black">Asset Editor</h3><button onClick={() => setIsEditing(false)} className="w-10 h-10 bg-zinc-100 rounded-full"><i className="fa-solid fa-xmark"></i></button></div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <input placeholder="Asset Name" className="p-5 rounded-2xl bg-zinc-100 font-bold outline-none" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
                      <input placeholder="Price (EGP)" type="number" className="p-5 rounded-2xl bg-zinc-100 font-bold outline-none" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <select className="p-5 rounded-2xl bg-zinc-100 font-bold" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                        <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                      </select>
                      <input placeholder="Compatibility" className="p-5 rounded-2xl bg-zinc-100 font-bold" value={editProduct.compatibility || ''} onChange={e => setEditProduct({...editProduct, compatibility: e.target.value})} />
                   </div>
                   <div onClick={() => fileInputRef.current?.click()} className="h-40 rounded-[2rem] border-4 border-dashed border-zinc-100 flex flex-col items-center justify-center cursor-pointer bg-zinc-50 hover:bg-zinc-100 group transition-all">
                      {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover rounded-[1.8rem]" /> : <p className="text-xs font-black uppercase text-zinc-400 group-hover:text-zinc-600 transition-colors">Select Main Visual</p>}
                      <input ref={fileInputRef} type="file" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if(file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setEditProduct({...editProduct, image: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }} />
                   </div>
                   <textarea placeholder="Write full description..." className="w-full p-6 rounded-2xl bg-zinc-100 font-medium h-40 outline-none" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                   <button onClick={handleSaveProduct} disabled={isPublishing} className="w-full py-6 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">{isPublishing ? "Publishing..." : "Sync Asset to Cloud"}</button>
                </div>
             )}

             <div className="grid grid-cols-1 gap-6">
                {products.map(p => (
                  <div key={p.id} className="p-6 bg-white rounded-[2.5rem] flex justify-between items-center shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-6">
                      <img src={p.image} className="w-20 h-20 rounded-[1.5rem] object-cover shadow-lg group-hover:rotate-3 transition-transform" />
                      <div>
                        <p className="font-black text-xl">{p.title}</p>
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">{p.category} • {p.price} EGP</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => {setEditProduct(p); setIsEditing(true);}} className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center hover:bg-[#007AFF] hover:text-white transition-all"><i className="fa-solid fa-pen"></i></button>
                      <button onClick={async () => { if(confirm('Delete permanently?')) { await supabase.from('products').delete().eq('id', p.id); setProducts(ps => ps.filter(x => x.id !== p.id)); showNotification("Asset Deleted"); } }} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {notification && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-8">
           <div className="bg-zinc-900 text-white px-10 py-5 rounded-full font-black text-xs shadow-2xl flex items-center gap-4 uppercase tracking-[0.2em] border border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
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
