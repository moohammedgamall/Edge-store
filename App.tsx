
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
        // Fetch Settings
        const { data: settingsData } = await supabase.from('settings').select('key, value');
        
        if (settingsData) {
          const pass = settingsData.find(s => s.key === 'admin_password');
          if (pass) setAdminPassword(pass.value);
          
          const sLogo = settingsData.find(s => s.key === 'site_logo');
          if (sLogo) setSiteLogo(sLogo.value);

          const lLogo = settingsData.find(s => s.key === 'loading_logo');
          if (lLogo) setLoadingLogo(lLogo.value);
        }

        // Fetch Banner
        const { data: bannerData } = await supabase
          .from('banner')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        
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

        // Fetch Products
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
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
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'admin_password', value: next.trim() }, { onConflict: 'key' });

      if (error) throw error;

      setAdminPassword(next.trim());
      setIsChangingPassword(false);
      setNewPasswordData({ current: '', next: '', confirm: '' });
      showNotification("Security Key Updated Successfully!");
    } catch (err: any) {
      showNotification("Update Failed", "info");
    }
  };

  const handleSaveIdentity = async () => {
    setIsPublishing(true);
    try {
      const { error: error1 } = await supabase
        .from('settings')
        .upsert({ key: 'site_logo', value: siteLogo }, { onConflict: 'key' });
      
      const { error: error2 } = await supabase
        .from('settings')
        .upsert({ key: 'loading_logo', value: loadingLogo }, { onConflict: 'key' });
      
      if (error1 || error2) throw (error1 || error2);
      
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
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setBanner({ ...banner, imageUrl: base64 });
      } catch (err) {
        console.error("Banner upload failed", err);
      }
    }
  };

  const handleGalleryImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    const currentGallery = editProduct.gallery || [];
    try {
      const newImages = await Promise.all(files.map(file => fileToBase64(file)));
      setEditProduct({ ...editProduct, gallery: [...currentGallery, ...newImages].slice(0, 15) });
    } catch (err) {
      console.error("Gallery upload failed", err);
    }
  };

  const handleSaveProduct = async () => {
    if (!editProduct.title || !editProduct.image) {
      return showNotification("Missing title or main image", "info");
    }
    
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
      
      if (error) {
        console.error("Supabase Error:", error);
        showNotification(`Error: ${error.message}`, "info");
      } else {
        setProducts(prev => {
          const exists = prev.find(p => p.id === productToSave.id);
          if (exists) {
            return prev.map(p => p.id === productToSave.id ? (productToSave as Product) : p);
          }
          return [productToSave as Product, ...prev];
        });
        setIsEditing(false);
        showNotification("Asset published successfully!");
      }
    } catch (err: any) {
      showNotification("Critical Error: Check Connection", "info");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveBanner = async () => {
    setIsPublishing(true);
    try {
      const { error } = await supabase.from('banner').upsert({ 
        id: 1, 
        title: banner.title, 
        highlight: banner.highlight, 
        description: banner.description,
        imageUrl: banner.imageUrl 
      });
      if (error) throw error;
      setIsEditingBanner(false);
      showNotification("Store Banner Updated");
    } catch (err: any) {
      showNotification("Update Failed", "info");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenPreview = (id: string) => {
    window.location.hash = `#/preview/${id}`;
  };

  const handleOrderViaTelegram = () => {
    if (!selectedProduct) return;
    const message = `👋 *New Inquiry from Edge Store*\n\n📱 Device: ${selectedPhone}\n📦 Item: ${selectedProduct.title}\n📂 Category: ${selectedProduct.category}\n💰 Price: ${selectedProduct.price === 0 ? 'FREE' : selectedProduct.price + ' EGP'}`;
    window.open(`https://t.me/Mohamed_edge?text=${encodeURIComponent(message)}`, '_blank');
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
      sliderRef.current.scrollTo({
        left: index * sliderRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const getSingularCategory = (cat?: string) => {
    if (!cat) return 'Asset';
    switch (cat) {
      case 'Themes': return 'Theme';
      case 'Widgets': return 'Widget';
      case 'Walls': return 'Wallpaper';
      default: return 'Asset';
    }
  };

  const renderAdmin = () => (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tighter">Manager</h2>
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Storefront Control</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setIsEditingIdentity(!isEditingIdentity); setIsEditingBanner(false); setIsEditing(false); setIsChangingPassword(false); }} className={`px-5 py-3 rounded-2xl font-black text-xs transition-all ${isEditingIdentity ? 'bg-zinc-900 text-white' : 'bg-white border shadow-sm'}`}>Identity</button>
          <button onClick={() => { setIsChangingPassword(!isChangingPassword); setIsEditing(false); setIsEditingBanner(false); setIsEditingIdentity(false); }} className={`px-5 py-3 rounded-2xl font-black text-xs transition-all ${isChangingPassword ? 'bg-zinc-900 text-white' : 'bg-white border shadow-sm'}`}>Security</button>
          <button onClick={() => { setIsEditingBanner(!isEditingBanner); setIsEditing(false); setIsChangingPassword(false); setIsEditingIdentity(false); }} className={`px-5 py-3 rounded-2xl font-black text-xs transition-all ${isEditingBanner ? 'bg-zinc-900 text-white' : 'bg-white border shadow-sm'}`}>Banner</button>
          <button onClick={() => { setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); setIsEditingIdentity(false); setEditProduct({ id: Date.now().toString(), price: 0, category: 'Themes', rating: 5.0, downloads: '0', is_premium: false, gallery: [] }); }} className="px-5 py-3 bg-[#007AFF] text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20"><i className="fa-solid fa-plus mr-2"></i>Add Asset</button>
        </div>
      </header>

      {isEditingIdentity && (
        <div className="glass-panel p-6 rounded-[2rem] space-y-8 animate-in slide-in-from-top-4 border-white shadow-xl">
           <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 border-b pb-4">Store Identity System</h4>
           
           <div className="space-y-12">
              {/* Site Logo Section */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-[#007AFF] rounded-full"></div>
                    <h5 className="font-black text-xs uppercase text-zinc-400">Section 1: Header Logo</h5>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      onClick={() => logoFileInputRef.current?.click()}
                      className="h-32 rounded-2xl border-2 border-dashed border-zinc-200 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors group"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-zinc-300 text-2xl mb-1 group-hover:text-[#007AFF]"></i>
                      <p className="text-[10px] font-black text-zinc-400 uppercase">Upload Site Logo</p>
                      <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'site')} />
                    </div>
                    <div className="space-y-2">
                      <input 
                        placeholder="Or paste external URL" 
                        className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm bg-white outline-none focus:border-[#007AFF]" 
                        value={siteLogo.startsWith('data:') ? '' : siteLogo} 
                        onChange={e => setSiteLogo(e.target.value)} 
                      />
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-4">
                        <img src={siteLogo} className="w-10 h-10 object-contain bg-white rounded shadow-sm p-1" alt="Site" />
                        <p className="text-[9px] font-bold text-zinc-400">Header Preview</p>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Loading Logo Section */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                    <h5 className="font-black text-xs uppercase text-zinc-400">Section 2: Loading Logo</h5>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      onClick={() => loadingLogoFileInputRef.current?.click()}
                      className="h-32 rounded-2xl border-2 border-dashed border-zinc-200 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors group"
                    >
                      <i className="fa-solid fa-spinner text-zinc-300 text-2xl mb-1 group-hover:text-amber-500"></i>
                      <p className="text-[10px] font-black text-zinc-400 uppercase">Upload Loading Logo</p>
                      <input ref={loadingLogoFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'loading')} />
                    </div>
                    <div className="space-y-2">
                      <input 
                        placeholder="Or paste external URL" 
                        className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm bg-white outline-none focus:border-amber-500" 
                        value={loadingLogo.startsWith('data:') ? '' : loadingLogo} 
                        onChange={e => setLoadingLogo(e.target.value)} 
                      />
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-4">
                        <img src={loadingLogo} className="w-10 h-10 object-contain bg-white rounded shadow-sm p-1" alt="Loading" />
                        <p className="text-[9px] font-bold text-zinc-400">Loading Preview</p>
                      </div>
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleSaveIdentity} 
                disabled={isPublishing}
                className="w-full py-5 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-blue-500/10 active:scale-[0.99] disabled:opacity-50 transition-all"
              >
                {isPublishing ? "Synchronizing with Server..." : "Apply Identity Changes"}
              </button>
           </div>
        </div>
      )}

      {isChangingPassword && (
        <div className="glass-panel p-6 rounded-[2rem] space-y-4 animate-in slide-in-from-top-4 border-white shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="password" placeholder="Old Key" className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold focus:border-[#007AFF] outline-none" value={newPasswordData.current} onChange={e => setNewPasswordData({...newPasswordData, current: e.target.value})} />
            <input type="password" placeholder="New Key" className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold focus:border-[#007AFF] outline-none" value={newPasswordData.next} onChange={e => setNewPasswordData({...newPasswordData, next: e.target.value})} />
            <input type="password" placeholder="Repeat Key" className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold focus:border-[#007AFF] outline-none" value={newPasswordData.confirm} onChange={e => setNewPasswordData({...newPasswordData, confirm: e.target.value})} />
          </div>
          <button onClick={handleUpdatePassword} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black text-sm active:scale-[0.99]">Save New Access Key</button>
        </div>
      )}

      {isEditingBanner && (
        <div className="glass-panel p-6 rounded-[2rem] space-y-4 animate-in slide-in-from-top-4 border-white shadow-xl">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input placeholder="Headline" className="w-full p-4 rounded-xl border font-bold text-sm" value={banner.title} onChange={e => setBanner({...banner, title: e.target.value})} />
                <input placeholder="Highlight (Blue Color)" className="w-full p-4 rounded-xl border font-bold text-sm" value={banner.highlight} onChange={e => setBanner({...banner, highlight: e.target.value})} />
              </div>
              <textarea placeholder="Banner Description (Empty to hide)" className="w-full p-4 rounded-xl border font-bold text-sm h-24" value={banner.description} onChange={e => setBanner({...banner, description: e.target.value})} />
              <div onClick={() => bannerFileInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer bg-zinc-50 overflow-hidden group">
                {banner.imageUrl ? <img src={banner.imageUrl} className="w-full h-full object-cover" alt="" /> : <div className="text-center"><i className="fa-solid fa-cloud-arrow-up text-zinc-300 text-2xl mb-1"></i><p className="text-[10px] font-black text-zinc-400 uppercase">Hero Image</p></div>}
              </div>
              <input ref={bannerFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            </div>
          </div>
          <button 
            disabled={isPublishing}
            onClick={handleSaveBanner} 
            className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-black text-sm shadow-xl disabled:opacity-50"
          >
            {isPublishing ? "Updating..." : "Update Store Hero"}
          </button>
        </div>
      )}

      {isEditing && (
        <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 animate-in zoom-in-95 border-white shadow-2xl">
          <div className="flex justify-between items-center"><h3 className="text-xl font-black tracking-tight">Asset Editor</h3><button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"><i className="fa-solid fa-xmark"></i></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <input placeholder="Asset Name" className="w-full p-4 rounded-2xl border-2 border-zinc-100 outline-none font-bold text-base focus:border-[#007AFF] transition-colors" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Price (EGP)" type="number" className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm focus:border-[#007AFF]" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                <input placeholder="OS Version" className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm focus:border-[#007AFF]" value={editProduct.compatibility || ''} onChange={e => setEditProduct({...editProduct, compatibility: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl border">
                 <input type="checkbox" id="is_premium_check" checked={editProduct.is_premium} onChange={e => setEditProduct({...editProduct, is_premium: e.target.checked})} className="w-5 h-5 accent-[#007AFF]" />
                 <label htmlFor="is_premium_check" className="text-sm font-black text-zinc-600 cursor-pointer">
                   Premium {getSingularCategory(editProduct.category)}
                 </label>
              </div>
              <select className="w-full p-4 rounded-xl border-2 border-zinc-100 font-black text-sm bg-white focus:border-[#007AFF]" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
              </select>
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer bg-zinc-50 overflow-hidden relative group hover:bg-zinc-100 transition-colors">
                {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" alt="" /> : <div className="text-center"><i className="fa-solid fa-image text-zinc-300 text-3xl mb-1"></i><p className="text-[10px] font-black text-zinc-400 uppercase">Main Cover Image</p></div>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
            </div>
            <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-400">Screenshots (Max 15)</h4>
              <button onClick={() => galleryInputRef.current?.click()} className="w-full py-4 bg-white border shadow-sm text-[#007AFF] rounded-2xl flex items-center justify-center gap-3 font-black text-xs hover:shadow-md transition-all"><i className="fa-solid fa-plus-circle"></i> Add Images</button>
              <input ref={galleryInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleGalleryImagesUpload} />
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                {editProduct.gallery?.map((url, idx) => (
                  <div key={idx} className="relative aspect-[9/16] rounded-xl overflow-hidden border-2 border-white shadow-sm group">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setEditProduct({...editProduct, gallery: editProduct.gallery?.filter((_, i) => i !== idx)})} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><i className="fa-solid fa-trash-can"></i></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <textarea placeholder="Description" className="w-full p-5 rounded-2xl border-2 border-zinc-100 outline-none font-medium text-sm h-32 focus:border-[#007AFF]" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
          <button 
            disabled={isPublishing}
            onClick={handleSaveProduct} 
            className="w-full py-5 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-lg shadow-2xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isPublishing ? <><i className="fa-solid fa-circle-notch animate-spin"></i> Publishing...</> : "Publish Live Asset"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-2">
        {products.map(p => (
          <div key={p.id} className="glass-panel p-4 rounded-3xl flex items-center justify-between border-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <img src={p.image} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
              <div><h4 className="font-black text-base">{p.title}</h4><p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{p.category} • {p.price} EGP {p.is_premium ? '• PREMIUM' : ''}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditProduct(p); setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); setIsEditingIdentity(false); }} className="w-10 h-10 bg-blue-50 text-[#007AFF] rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-100 transition-colors"><i className="fa-solid fa-pen"></i></button>
              <button onClick={async () => { if(confirm('Permanently delete this item?')) { const {error} = await supabase.from('products').delete().eq('id', p.id); if(!error) setProducts(pr => pr.filter(x => x.id !== p.id)); } }} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-red-100 transition-colors"><i className="fa-solid fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPreviewPage = () => {
    const p = products.find(x => x.id === selectedProductId);
    if (!p) return null;
    const fullGallery = p.gallery && p.gallery.length > 0 ? p.gallery : [p.image];

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-8">
        <header className="flex items-center justify-between px-2 gap-2">
           <button 
             onClick={() => { window.location.hash = '#/'; setActiveSection('Home'); }} 
             className="w-10 h-10 flex-shrink-0 bg-white/40 backdrop-blur-xl border border-white/30 text-zinc-900 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all hover:bg-white/60"
             aria-label="Back"
           >
             <i className="fa-solid fa-chevron-left text-sm"></i>
           </button>
           <div className="text-center px-2 flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#007AFF] mb-1 block truncate">{p.category}</span>
              <h2 className="text-2xl font-black tracking-tighter text-zinc-900 line-clamp-1">{p.title}</h2>
           </div>
           <div className="w-10 flex-shrink-0"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
           <div className="lg:col-span-7 space-y-4">
              <div className="relative group">
                 <div ref={sliderRef} onScroll={handleSliderScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar rounded-[2.5rem] shadow-2xl bg-white border-4 border-white">
                    {fullGallery.map((url, idx) => <div key={idx} className="min-w-full snap-center p-4"><img src={url} className="w-full h-auto rounded-[2rem] object-contain" alt="" /></div>)}
                 </div>

                 {/* Navigation Arrows */}
                 <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => scrollToIndex((currentSlide - 1 + fullGallery.length) % fullGallery.length)} 
                      className="w-10 h-10 flex-shrink-0 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 text-zinc-900 flex items-center justify-center shadow-xl pointer-events-auto active:scale-90 transition-all hover:bg-white/60"
                    >
                      <i className="fa-solid fa-chevron-left text-sm"></i>
                    </button>
                 </div>
                 <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => scrollToIndex((currentSlide + 1) % fullGallery.length)} 
                      className="w-10 h-10 flex-shrink-0 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 text-zinc-900 flex items-center justify-center shadow-xl pointer-events-auto active:scale-90 transition-all hover:bg-white/60"
                    >
                      <i className="fa-solid fa-chevron-right text-sm"></i>
                    </button>
                 </div>

                 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20">
                    {fullGallery.map((_, idx) => <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${currentSlide === idx ? 'w-6 bg-[#007AFF]' : 'w-1.5 bg-zinc-300'}`} />)}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-5 space-y-6">
              <div className="glass-panel p-8 rounded-[2.5rem] border-white shadow-2xl space-y-8">
                 <div className="flex justify-between items-center">
                    <div><p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Total Price</p><p className="text-4xl font-black text-zinc-900">{p.price === 0 ? 'FREE' : `${p.price} EGP`}</p></div>
                 </div>
                 <div className="space-y-3 pt-4 border-t border-zinc-100"><h4 className="font-black text-xs uppercase text-zinc-400 tracking-widest">About Asset</h4><p className="text-zinc-500 text-sm leading-relaxed font-medium">{p.description || "Premium digital asset designed exclusively for Realme UI and ColorOS devices."}</p></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50 rounded-2xl border text-center flex flex-col items-center justify-center">
                      <i className="fa-solid fa-mobile-screen text-[#007AFF] mb-2 text-lg"></i>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Compatible</p>
                      <p className="text-[11px] font-bold text-zinc-900 truncate w-full">{p.compatibility}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-2xl border text-center flex flex-col items-center justify-center">
                      <i className="fa-solid fa-circle-check text-green-500 mb-2 text-lg"></i>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Availability</p>
                      <p className="text-[11px] font-bold text-zinc-900">Permanent for life</p>
                    </div>
                 </div>
                 <button onClick={() => { setSelectedCategory(p.category === 'Apps' ? 'Themes' : p.category as Section); setSelectedProductId(p.id); setActiveSection('Order'); window.location.hash = '#/order'; }} className="w-full py-5 rounded-[1.5rem] bg-[#007AFF] text-white font-black text-lg shadow-2xl shadow-blue-500/20 active:scale-95 transition-all">Get it Now</button>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderOrderPage = () => {
    return (
      <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in px-2">
        <header className="flex flex-col items-center text-center gap-5">
           <h2 className="text-4xl font-black text-zinc-900 tracking-tighter">Product Inquiry</h2>
           <a href="https://t.me/Mohamed_edge" target="_blank" className="flex items-center gap-4 bg-white p-3 pr-8 rounded-2xl border shadow-sm group hover:border-[#007AFF] transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-[#007AFF] transition-colors"><i className="fa-brands fa-telegram text-3xl text-[#007AFF] group-hover:text-white"></i></div>
              <div className="text-left"><p className="text-[10px] font-black text-zinc-400 uppercase leading-none mb-1">Direct Contact</p><p className="font-black text-zinc-900 text-lg">@Mohamed_edge</p></div>
           </a>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
             <div className="glass-panel p-6 rounded-[2.5rem] space-y-8 border-white shadow-xl">
                <div>
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] ml-2 block mb-3">Device Brand</label>
                   <div className="grid grid-cols-2 gap-3">
                      {['Realme', 'Oppo'].map(b => <button key={b} onClick={() => setSelectedPhone(b as any)} className={`py-4 rounded-2xl font-black text-lg border-2 transition-all ${selectedPhone === b ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-lg shadow-blue-500/10' : 'bg-zinc-50 border-transparent text-zinc-400'}`}>{b}</button>)}
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] ml-2 block mb-3">Filter By Category</label>
                   <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-1">
                      {['Themes', 'Widgets', 'Walls'].map(c => <button key={c} onClick={() => setSelectedCategory(c as any)} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${selectedCategory === c ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}>{c}</button>)}
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] ml-2 block mb-3">Pick Your Asset</label>
                   <select value={selectedProduct?.id || ''} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-5 rounded-2xl bg-zinc-50 font-black text-base appearance-none outline-none border-2 border-transparent focus:border-[#007AFF] transition-all">
                      {productsInCategory.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      {productsInCategory.length === 0 && <option disabled>Stock Currently Empty</option>}
                   </select>
                </div>
             </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-28">
             <div className="glass-panel p-8 rounded-[3rem] border-white shadow-2xl space-y-6">
                <div className="aspect-[4/3] rounded-[2rem] overflow-hidden border shadow-inner bg-zinc-50">
                   {selectedProduct ? <img src={selectedProduct.image} className="w-full h-full object-cover animate-in fade-in duration-500" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-300 font-black text-xs uppercase">No Preview</div>}
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-2xl border text-center">
                      <div className="w-full">
                        <p className="text-[9px] font-black text-zinc-400 uppercase mb-1 tracking-widest">Price / Method</p>
                        <p className="text-3xl font-black">{selectedProduct?.price || 0} EGP</p>
                      </div>
                  </div>
                  
                  {selectedProduct && selectedProduct.price > 0 && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-center animate-in slide-in-from-bottom-2">
                        <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white"><i className="fa-solid fa-wallet text-xl"></i></div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Transfer Via Vodafone Cash</p>
                          <p className="text-xl font-black text-amber-900">01091931466</p>
                        </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button onClick={handleOrderViaTelegram} disabled={!selectedProduct} className="w-full py-5 bg-[#24A1DE] text-white font-black text-lg rounded-2xl shadow-xl shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                      <i className="fa-brands fa-telegram text-2xl"></i><span>Order via Telegram</span>
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full animate-pulse"></div>
      <div className="relative mb-12">
        <div className="w-40 h-40 relative z-10 animate-pulse flex items-center justify-center">
          {!imgLoadError ? (
            <img 
              src={loadingLogo}
              alt="Loading Logo" 
              className="w-full h-full object-contain"
              onError={() => {
                setImgLoadError(true);
              }}
            />
          ) : (
            <div className="w-32 h-32 bg-zinc-900 rounded-3xl flex items-center justify-center shadow-2xl">
              <span className="text-white font-black text-4xl tracking-tighter">ME</span>
            </div>
          )}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-[#007AFF] rounded-full animate-ping opacity-10"></div>
      </div>
      <div className="text-center space-y-4 relative z-10">
        <h3 className="text-3xl font-black tracking-tighter text-zinc-900">Edge Store</h3>
        <div className="flex flex-col items-center">
          <div className="w-56 h-1.5 bg-zinc-200 rounded-full overflow-hidden mb-4 shadow-inner">
            <div className="h-full bg-gradient-to-r from-[#007AFF] to-blue-400 w-1/3 animate-[loading_1.8s_infinite_ease-in-out]"></div>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-400">Loading Premium Experience</p>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header logoUrl={siteLogo} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={handleLogout} />
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/30 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[3rem] space-y-6 border-white shadow-2xl animate-in zoom-in-95">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 text-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100"><i className="fa-solid fa-shield-keyhole text-2xl"></i></div>
                <h3 className="text-xl font-black tracking-tight">Access Locked</h3>
                <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-1">Enter Master Key</p>
              </div>
              <input type="password" autoFocus value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} className="w-full p-5 rounded-2xl bg-zinc-100 text-center text-3xl font-black tracking-[0.5em] outline-none border-2 border-transparent focus:border-[#007AFF] transition-all shadow-inner" placeholder="••••" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setIsAuthModalOpen(false); setPasswordInput(''); }} className="py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Exit</button>
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent sm:bg-gradient-to-r sm:from-black/90 sm:via-black/30 sm:to-transparent flex flex-col justify-end sm:justify-center p-6 sm:px-16 md:px-24">
                  <div className="max-w-2xl space-y-4 sm:space-y-6 text-center sm:text-left items-center sm:items-start flex flex-col">
                    <div className="inline-block px-3 py-1 bg-[#007AFF]/20 backdrop-blur-xl border border-[#007AFF]/30 rounded-full">
                       <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-[#007AFF]">New Release</span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-tight tracking-tighter">
                      {banner.title} <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] to-blue-400 drop-shadow-md">{banner.highlight}</span>
                    </h2>
                    {banner.description && (
                      <p className="text-white/70 text-xs sm:text-sm md:text-lg font-medium max-w-sm sm:max-w-md line-clamp-2 sm:line-clamp-3">
                        {banner.description}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 w-full sm:w-auto">
                      <button onClick={() => setActiveSection('Themes')} className="w-full sm:w-auto px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-500/40 active:scale-95 transition-all flex items-center justify-center gap-3 group/btn">
                        <span>Browse collection</span>
                        <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover/btn:translate-x-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
            <section className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3"><div className="w-2 h-8 bg-[#007AFF] rounded-full"></div> Featured Assets</h2>
                <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest bg-zinc-100 px-3 py-1 rounded-full">{products.length} Items</div>
              </div>
              <div className="grid grid-cols-1 gap-8 sm:gap-12">
                {products.length > 0 ? products.map(p => (
                  <ProductCard key={p.id} product={p} onPreview={handleOpenPreview} onBuy={(id, cat) => { setSelectedCategory(cat === 'Apps' ? 'Themes' : cat as Section); setSelectedProductId(id); setActiveSection('Order'); window.location.hash = '#/order'; }} />
                )) : <div className="text-center py-20 bg-white/50 rounded-[3rem] border border-dashed border-zinc-200"><i className="fa-solid fa-box-open text-zinc-200 text-6xl mb-4"></i><p className="text-zinc-400 font-black uppercase tracking-widest text-xs">Waiting for Content...</p></div>}
              </div>
            </section>
          </div>
        )}
        {activeSection === 'Preview' && renderPreviewPage()}
        {activeSection === 'Order' && renderOrderPage()}
        {activeSection === 'Admin' && isAdminMode && renderAdmin()}
        {['Themes', 'Widgets', 'Walls'].includes(activeSection) && (
          <div className="space-y-10 pb-32 animate-in fade-in">
            <div className="px-2">
               <h2 className="text-3xl font-black tracking-tighter">{activeSection}</h2>
               <p className="text-zinc-400 text-xs font-black uppercase tracking-[0.2em] mt-1">Premium Collection</p>
            </div>
            <div className="grid grid-cols-1 gap-10">
              {products.filter(p => p.category === activeSection).length > 0 ? products.filter(p => p.category === activeSection).map(p => (
                <ProductCard key={p.id} product={p} onPreview={handleOpenPreview} onBuy={(id, cat) => { setSelectedCategory(cat === 'Apps' ? 'Themes' : cat as Section); setSelectedProductId(id); setActiveSection('Order'); window.location.hash = '#/order'; }} />
              )) : <div className="text-center py-24 bg-white/50 rounded-[3rem] border-dashed border-2 border-zinc-100"><p className="text-zinc-300 font-black text-sm uppercase tracking-widest">No assets available in this category yet.</p></div>}
            </div>
          </div>
        )}
      </main>
      {notification && <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 w-[90%] max-sm"><div className="px-6 py-4 rounded-3xl shadow-2xl font-black flex items-center justify-center gap-3 border bg-[#007AFF] text-white border-blue-600/20 text-xs uppercase tracking-widest"><i className="fa-solid fa-circle-check text-base"></i> {notification.message}</div></div>}
      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={setActiveSection} />}
    </div>
  );
};

export default App;
