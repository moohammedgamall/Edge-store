import React, { useState, useEffect, useRef } from 'react';
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
  
  const [banner, setBanner] = useState<BannerSettings & { isVisible?: boolean }>(DEFAULT_BANNER);
  const [products, setProducts] = useState<Product[]>([]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('1234');
  const [passwordInput, setPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordData, setNewPasswordData] = useState({ current: '', next: '', confirm: '' });

  const [selectedPhone, setSelectedPhone] = useState<'Realme' | 'Oppo'>('Realme');
  const [selectedCategory, setSelectedCategory] = useState<Section>('Themes');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [isEditingBanner, setIsEditingBanner] = useState<boolean>(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

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
        // Fetch Admin Password
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'admin_password')
          .maybeSingle();
        
        if (settingsError) {
          console.error("Supabase Error:", settingsError.message);
        }
        if (settingsData) setAdminPassword(settingsData.value);

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
        console.error("Fetch Error:", error);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdminAuth = () => {
    if (passwordInput.trim() === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotification("Welcome Back, Admin", "success");
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
      showNotification("Update Failed: " + err.message, "info");
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

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setEditProduct({ ...editProduct, image: base64 });
        showNotification("Cover image loaded");
      } catch (err) {
        showNotification("Upload failed", "info");
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setBanner({ ...banner, imageUrl: base64 });
        showNotification("Hero image loaded");
      } catch (err) {
        showNotification("Banner upload failed", "info");
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
      showNotification(`${files.length} screenshots added`);
    } catch (err) {
      showNotification("Gallery failed", "info");
    }
  };

  const handleSaveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotification("Missing title/image", "info");
    
    const productToSave = { 
      id: editProduct.id || Date.now().toString(),
      title: editProduct.title,
      description: editProduct.description || '',
      category: editProduct.category || 'Themes',
      price: editProduct.price || 0,
      image: editProduct.image,
      gallery: editProduct.gallery || [],
      rating: editProduct.rating || 5.0,
      downloads: editProduct.downloads || '0',
      isPremium: editProduct.isPremium || false,
      compatibility: editProduct.compatibility || 'ColorOS 15',
      downloadUrl: editProduct.downloadUrl || ''
    };

    const { error } = await supabase.from('products').upsert(productToSave);
    if (!error) {
      setProducts(prev => {
        const exists = prev.find(p => p.id === productToSave.id);
        return exists ? prev.map(p => p.id === productToSave.id ? (productToSave as Product) : p) : [productToSave as Product, ...prev];
      });
      setIsEditing(false);
      showNotification("Asset published");
    } else {
      showNotification("Save Error: " + error.message, "info");
    }
  };

  const handleSaveBanner = async () => {
    const { error } = await supabase.from('banner').upsert({ 
      id: 1, 
      title: banner.title, 
      highlight: banner.highlight, 
      imageUrl: banner.imageUrl 
    });
    if (!error) {
      setIsEditingBanner(false);
      showNotification("Store Banner Updated");
    } else {
      showNotification("Banner save failed", "info");
    }
  };

  const handleDownload = (product: Product) => {
    if (product.downloadUrl) {
      window.open(product.downloadUrl, '_blank');
      showNotification("Download started...");
    } else {
      showNotification("Link not available", "info");
    }
  };

  const handleOpenPreview = (id: string) => {
    window.location.hash = `#/preview/${id}`;
  };

  const handleOrderViaTelegram = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const message = `👋 *New Order from Edge Store*\n\n📱 Device: ${selectedPhone}\n📦 Item: ${product.title}\n📂 Category: ${product.category}\n💰 Price: ${product.price === 0 ? 'FREE' : product.price + ' EGP'}`;
    window.open(`https://t.me/Mohamed_edge?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSliderScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const width = sliderRef.current.offsetWidth;
      setCurrentSlide(Math.round(scrollLeft / width));
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
          <button onClick={() => { setIsChangingPassword(!isChangingPassword); setIsEditing(false); setIsEditingBanner(false); }} className={`px-5 py-3 rounded-2xl font-black text-xs transition-all ${isChangingPassword ? 'bg-zinc-900 text-white' : 'bg-white border shadow-sm'}`}>Security</button>
          <button onClick={() => { setIsEditingBanner(!isEditingBanner); setIsEditing(false); setIsChangingPassword(false); }} className={`px-5 py-3 rounded-2xl font-black text-xs transition-all ${isEditingBanner ? 'bg-zinc-900 text-white' : 'bg-white border shadow-sm'}`}>Banner</button>
          <button onClick={() => { setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); setEditProduct({ id: Date.now().toString(), price: 0, category: 'Themes', rating: 5.0, downloads: '0', isPremium: false, gallery: [] }); }} className="px-5 py-3 bg-[#007AFF] text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20"><i className="fa-solid fa-plus mr-2"></i>Add Asset</button>
        </div>
      </header>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <input placeholder="Headline" className="w-full p-4 rounded-xl border font-bold text-sm" value={banner.title} onChange={e => setBanner({...banner, title: e.target.value})} />
              <input placeholder="Highlight (Blue Color)" className="w-full p-4 rounded-xl border font-bold text-sm" value={banner.highlight} onChange={e => setBanner({...banner, highlight: e.target.value})} />
              <div onClick={() => bannerFileInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer bg-zinc-50 overflow-hidden group">
                {banner.imageUrl ? <img src={banner.imageUrl} className="w-full h-full object-cover" alt="" /> : <div className="text-center"><i className="fa-solid fa-cloud-arrow-up text-zinc-300 text-2xl mb-1"></i><p className="text-[10px] font-black text-zinc-400 uppercase">Hero Image</p></div>}
              </div>
              <input ref={bannerFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            </div>
          </div>
          <button onClick={handleSaveBanner} className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-black text-sm shadow-xl">Update Store Hero</button>
        </div>
      )}

      {isEditing && (
        <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 animate-in zoom-in-95 border-white shadow-2xl">
          <div className="flex justify-between items-center"><h3 className="text-xl font-black tracking-tight">Editor</h3><button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"><i className="fa-solid fa-xmark"></i></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <input placeholder="Asset Name" className="w-full p-4 rounded-2xl border-2 border-zinc-100 outline-none font-bold text-base" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Price (EGP)" type="number" className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                <input placeholder="OS Version" className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm" value={editProduct.compatibility || ''} onChange={e => setEditProduct({...editProduct, compatibility: e.target.value})} />
              </div>
              <select className="w-full p-4 rounded-xl border-2 border-zinc-100 font-black text-sm bg-white" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
              </select>
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer bg-zinc-50 overflow-hidden relative group">
                {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" alt="" /> : <div className="text-center"><i className="fa-solid fa-image text-zinc-300 text-3xl mb-1"></i><p className="text-[10px] font-black text-zinc-400 uppercase">Main Cover</p></div>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
              <input placeholder="Download URL" className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm" value={editProduct.downloadUrl || ''} onChange={e => setEditProduct({...editProduct, downloadUrl: e.target.value})} />
            </div>
            <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-400">Screenshots (Max 15)</h4>
              <button onClick={() => galleryInputRef.current?.click()} className="w-full py-4 bg-white border shadow-sm text-[#007AFF] rounded-2xl flex items-center justify-center gap-3 font-black text-xs"><i className="fa-solid fa-plus-circle"></i> Add Images</button>
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
          <textarea placeholder="Description" className="w-full p-5 rounded-2xl border-2 border-zinc-100 outline-none font-medium text-sm h-32" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
          <button onClick={handleSaveProduct} className="w-full py-5 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-lg shadow-2xl active:scale-95 transition-all">Publish Live Asset</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-2">
        {products.map(p => (
          <div key={p.id} className="glass-panel p-4 rounded-3xl flex items-center justify-between border-white shadow-sm">
            <div className="flex items-center gap-4">
              <img src={p.image} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
              <div><h4 className="font-black text-base">{p.title}</h4><p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{p.category} • {p.price} EGP</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditProduct(p); setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); }} className="w-10 h-10 bg-blue-50 text-[#007AFF] rounded-xl flex items-center justify-center shadow-sm"><i className="fa-solid fa-pen"></i></button>
              <button onClick={async () => { if(confirm('Permanently delete this item?')) { const {error} = await supabase.from('products').delete().eq('id', p.id); if(!error) setProducts(pr => pr.filter(x => x.id !== p.id)); } }} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shadow-sm"><i className="fa-solid fa-trash"></i></button>
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
        <header className="flex items-center justify-between px-2">
           <button onClick={() => { window.location.hash = '#/'; setActiveSection('Home'); }} className="w-12 h-12 glass-panel rounded-full flex items-center justify-center text-zinc-900 border-white shadow-xl active:scale-90 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
           <div className="text-center px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#007AFF] mb-1">{p.category}</span>
              <h2 className="text-2xl font-black tracking-tighter text-zinc-900 line-clamp-1">{p.title}</h2>
           </div>
           <div className="w-12 opacity-0"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
           <div className="lg:col-span-7 space-y-4">
              <div className="relative group">
                 <div ref={sliderRef} onScroll={handleSliderScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar rounded-[2.5rem] shadow-2xl bg-white border-4 border-white">
                    {fullGallery.map((url, idx) => <div key={idx} className="min-w-full snap-center p-4"><img src={url} className="w-full h-auto rounded-[2rem] object-contain" alt="" /></div>)}
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
                    <div className="text-amber-500 font-black flex items-center gap-1.5 text-lg"><i className="fa-solid fa-star"></i> {p.rating}</div>
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
                      <p className="text-[11px] font-bold text-zinc-900">Immediate</p>
                    </div>
                 </div>
                 <button onClick={() => { setSelectedCategory(p.category === 'Apps' ? 'Themes' : p.category as Section); setSelectedProductId(p.id); setActiveSection('Order'); window.location.hash = '#/order'; }} className="w-full py-5 rounded-[1.5rem] bg-[#007AFF] text-white font-black text-lg shadow-2xl shadow-blue-500/20 active:scale-95 transition-all">Proceed to Checkout</button>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderOrderPage = () => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const productsInCategory = products.filter(p => p.category === selectedCategory);

    return (
      <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in px-2">
        <header className="flex flex-col items-center text-center gap-5">
           <h2 className="text-4xl font-black text-zinc-900 tracking-tighter">Secure Checkout</h2>
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
                   <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-5 rounded-2xl bg-zinc-50 font-black text-base appearance-none outline-none border-2 border-transparent focus:border-[#007AFF] transition-all">
                      {productsInCategory.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      {productsInCategory.length === 0 && <option disabled>Stock Currently Empty</option>}
                   </select>
                </div>
             </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-28">
             <div className="glass-panel p-8 rounded-[3rem] border-white shadow-2xl space-y-6">
                <div className="aspect-[4/3] rounded-[2rem] overflow-hidden border shadow-inner">
                   {selectedProduct ? <img src={selectedProduct.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-zinc-100 flex items-center justify-center"><i className="fa-solid fa-spinner animate-spin text-zinc-300"></i></div>}
                </div>
                {selectedProduct && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-2xl border text-center">
                       <div className="w-full">
                          <p className="text-[9px] font-black text-zinc-400 uppercase mb-1 tracking-widest">Order Total</p>
                          <p className="text-3xl font-black">{selectedProduct.price} EGP</p>
                       </div>
                    </div>
                    {selectedProduct.price > 0 && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-center">
                         <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white"><i className="fa-solid fa-wallet text-xl"></i></div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Transfer Via Vodafone Cash</p>
                            <p className="text-xl font-black text-amber-900">01091931466</p>
                         </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {selectedProduct.price === 0 ? (
                        <button onClick={() => handleDownload(selectedProduct)} className="w-full py-5 bg-[#007AFF] text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Download Asset</button>
                      ) : (
                        <button onClick={handleOrderViaTelegram} className="w-full py-5 bg-[#24A1DE] text-white font-black text-lg rounded-2xl shadow-xl shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                          <i className="fa-brands fa-telegram text-2xl"></i><span>Order via Telegram</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] gap-4"><div className="w-12 h-12 border-[5px] border-[#007AFF]/10 border-t-[#007AFF] rounded-full animate-spin"></div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 animate-pulse">Syncing Database...</p></div>;

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={handleLogout} />
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
              <section className="relative w-full aspect-[16/10] sm:aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl group border-4 border-white">
                <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" alt="" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent flex flex-col justify-center px-8 sm:px-24">
                  <div className="max-w-2xl space-y-6">
                    <div className="inline-block px-4 py-1.5 bg-[#007AFF]/20 backdrop-blur-xl border border-[#007AFF]/30 rounded-full mb-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007AFF]">New Release</span>
                    </div>
                    <h2 className="text-4xl sm:text-7xl font-black text-white leading-[1.1] tracking-tighter">
                      {banner.title} <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] to-blue-400 drop-shadow-sm">{banner.highlight}</span>
                    </h2>
                    <p className="text-white/60 text-sm sm:text-lg font-medium max-w-md line-clamp-2">Elevate your device experience with high-fidelity assets designed for performance and aesthetics.</p>
                    <div className="flex flex-wrap gap-4 pt-4">
                      <button onClick={() => setActiveSection('Themes')} className="px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/40 active:scale-95 transition-all flex items-center gap-3 group/btn">
                        <span>Browse Collection</span>
                        <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover/btn:translate-x-1"></i>
                      </button>
                      <button onClick={() => setActiveSection('Walls')} className="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-white/20">
                        Top Rated
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
                {products.length > 0 ? products.slice(0, 5).map(p => (
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
      {notification && <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 w-[90%] max-w-sm"><div className="px-6 py-4 rounded-3xl shadow-2xl font-black flex items-center justify-center gap-3 border bg-[#007AFF] text-white border-blue-600/20 text-xs uppercase tracking-widest"><i className="fa-solid fa-circle-check text-base"></i> {notification.message}</div></div>}
      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={setActiveSection} />}
    </div>
  );
};

export default App;