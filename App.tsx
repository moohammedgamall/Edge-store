import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings } from './types';
import { MOCK_PRODUCTS, DEFAULT_BANNER } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

// Supabase Configuration using provided credentials
const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdixlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

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
        setIsAdminMode(false);
        if (activeSection === 'Admin') setActiveSection('Home');
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
        const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'admin_password').single();
        if (settingsData) setAdminPassword(settingsData.value);

        const { data: bannerData } = await supabase.from('banner').select('*').eq('id', 1).single();
        if (bannerData) {
          setBanner({
            title: bannerData.title,
            highlight: bannerData.highlight,
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
        console.error("Connection Error:", error);
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
      showNotification("Welcome Admin", "success");
    } else {
      showNotification("Access Denied", "info");
      setPasswordInput('');
    }
  };

  const handleUpdatePassword = async () => {
    const currentInput = newPasswordData.current.trim();
    const nextInput = newPasswordData.next.trim();
    const confirmInput = newPasswordData.confirm.trim();

    // 1. Validation Checks
    if (currentInput !== adminPassword) {
      showNotification("Current key is incorrect", "info");
      return;
    }
    if (!nextInput) {
      showNotification("New key cannot be empty", "info");
      return;
    }
    if (nextInput !== confirmInput) {
      showNotification("New keys do not match", "info");
      return;
    }

    // 2. Database Update Logic
    try {
      // Using direct update which is more reliable than upsert for a single known row
      const { error } = await supabase
        .from('settings')
        .update({ value: nextInput })
        .eq('key', 'admin_password');

      if (error) {
        console.error("Supabase Error:", error);
        showNotification("DB Error: " + error.message, "info");
      } else {
        // Update local state immediately upon success
        setAdminPassword(nextInput);
        setIsChangingPassword(false);
        setNewPasswordData({ current: '', next: '', confirm: '' });
        showNotification("Security key updated successfully", "success");
      }
    } catch (err) {
      console.error("Unexpected Error:", err);
      showNotification("An unexpected error occurred", "info");
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
        showNotification("Main image uploaded");
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
        showNotification("Banner image uploaded");
      } catch (err) {
        showNotification("Banner upload failed", "info");
      }
    }
  };

  const handleGalleryImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const currentGallery = editProduct.gallery || [];
    if (currentGallery.length + files.length > 20) {
      showNotification("Limit exceeded (Max 20)", "info");
      return;
    }

    try {
      const newImages = await Promise.all(files.map(file => fileToBase64(file)));
      setEditProduct({
        ...editProduct,
        gallery: [...currentGallery, ...newImages]
      });
      showNotification(`${files.length} images added to gallery`);
    } catch (err) {
      showNotification("Gallery upload failed", "info");
    }
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleRemoveGalleryImage = (index: number) => {
    const currentGallery = editProduct.gallery || [];
    setEditProduct({
      ...editProduct,
      gallery: currentGallery.filter((_, i) => i !== index)
    });
  };

  const handleSaveProduct = async () => {
    if (!editProduct.title || !editProduct.image) {
      showNotification("Missing title or image", "info");
      return;
    }
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
      showNotification("Synced to Database");
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
      showNotification("Banner updated");
    }
  };

  const handleDownload = (product: Product) => {
    if (product.downloadUrl) {
      window.open(product.downloadUrl, '_blank');
      showNotification("Direct link opened");
    } else {
      showNotification("No link provided", "info");
    }
  };

  const handleOpenPreview = (id: string) => {
    window.location.hash = `#/preview/${id}`;
  };

  const handleOrderViaTelegram = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const message = `👋 Edge Store Order\n\nDevice: ${selectedPhone}\nProduct: ${product.title}\nCategory: ${product.category}\nPrice: ${product.price === 0 ? 'FREE' : product.price + ' EGP'}`;
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
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-32 animate-in fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">Control Panel</h2>
          <p className="text-zinc-500 text-xs font-bold">nlqnbfvsghlomuugixlk.supabase.co</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setIsChangingPassword(!isChangingPassword); setIsEditing(false); setIsEditingBanner(false); }} className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all ${isChangingPassword ? 'bg-zinc-800 text-white' : 'bg-white border'}`}>Security</button>
          <button onClick={() => { setIsEditingBanner(!isEditingBanner); setIsEditing(false); setIsChangingPassword(false); }} className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all ${isEditingBanner ? 'bg-zinc-800 text-white' : 'bg-white border'}`}>Banner</button>
          <button onClick={() => { setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); setEditProduct({ id: Date.now().toString(), price: 0, category: 'Themes', rating: 5.0, downloads: '0', isPremium: false, gallery: [] }); }} className="px-4 py-2.5 bg-[#007AFF] text-white rounded-xl font-black text-xs shadow-lg shadow-blue-500/10"><i className="fa-solid fa-plus mr-2"></i>New Product</button>
        </div>
      </header>

      {isChangingPassword && (
        <div className="glass-panel p-6 rounded-[1.5rem] space-y-4 animate-in slide-in-from-top-4">
          <div className="text-center sm:text-left mb-2">
            <h3 className="font-black text-zinc-900">Change Admin Access Key</h3>
            <p className="text-zinc-400 text-[10px] font-bold">Manage your dashboard security</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="password" placeholder="Current Key" className="p-3.5 rounded-xl border text-sm focus:border-[#007AFF] outline-none" value={newPasswordData.current} onChange={e => setNewPasswordData({...newPasswordData, current: e.target.value})} />
            <input type="password" placeholder="New Key" className="p-3.5 rounded-xl border text-sm focus:border-[#007AFF] outline-none" value={newPasswordData.next} onChange={e => setNewPasswordData({...newPasswordData, next: e.target.value})} />
            <input type="password" placeholder="Confirm New Key" className="p-3.5 rounded-xl border text-sm focus:border-[#007AFF] outline-none" value={newPasswordData.confirm} onChange={e => setNewPasswordData({...newPasswordData, confirm: e.target.value})} />
          </div>
          <button onClick={handleUpdatePassword} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-black text-sm active:scale-[0.98] transition-all">Update Security Key</button>
        </div>
      )}

      {isEditingBanner && (
        <div className="glass-panel p-6 rounded-[1.5rem] space-y-4 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input placeholder="Headline" className="w-full p-3.5 rounded-xl border text-sm font-bold" value={banner.title} onChange={e => setBanner({...banner, title: e.target.value})} />
              <input placeholder="Highlight" className="w-full p-3.5 rounded-xl border text-sm font-bold" value={banner.highlight} onChange={e => setBanner({...banner, highlight: e.target.value})} />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 px-1">Or use image URL</label>
                <input placeholder="Image URL" className="w-full p-3.5 rounded-xl border text-sm" value={banner.imageUrl} onChange={e => setBanner({...banner, imageUrl: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-400 px-1">Banner Image</label>
              <div 
                onClick={() => bannerFileInputRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#007AFF] transition-all bg-zinc-50 overflow-hidden relative"
              >
                {banner.imageUrl ? (
                  <>
                    <img src={banner.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity">
                       <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                    </div>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-image text-zinc-300 text-2xl mb-1"></i>
                    <span className="text-[10px] font-black text-zinc-400">Upload Banner</span>
                  </>
                )}
              </div>
              <input ref={bannerFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            </div>
          </div>
          <button onClick={handleSaveBanner} className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all">Update Hero Section</button>
        </div>
      )}

      {isEditing && (
        <div className="glass-panel p-6 rounded-[2rem] space-y-6 animate-in zoom-in-95">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black">Configure Asset</h3>
            <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"><i className="fa-solid fa-xmark"></i></button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input placeholder="Product Title" className="w-full p-4 rounded-xl border-2 border-zinc-100 focus:border-[#007AFF] outline-none font-bold text-sm transition-all" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400 px-1">Price (EGP)</label>
                  <input placeholder="0.00" type="number" className="w-full p-4 rounded-xl border-2 border-zinc-100 focus:border-[#007AFF] outline-none font-bold text-sm transition-all" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400 px-1">OS Version</label>
                  <input placeholder="e.g. ColorOS 15" className="w-full p-4 rounded-xl border-2 border-zinc-100 focus:border-[#007AFF] outline-none font-bold text-sm transition-all" value={editProduct.compatibility || ''} onChange={e => setEditProduct({...editProduct, compatibility: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-400 px-1">Category</label>
                <select className="w-full p-4 rounded-xl border-2 border-zinc-100 font-bold text-sm outline-none bg-white" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                  <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 px-1">Main Cover</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#007AFF] transition-all bg-white overflow-hidden relative"
                >
                  {editProduct.image ? (
                    <>
                      <img src={editProduct.image} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity">
                         <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                      </div>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-image text-zinc-300 text-2xl mb-1"></i>
                      <span className="text-[10px] font-black text-zinc-400">Click to Upload Cover</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
              </div>

              <input placeholder="Download URL (Drive/Mega/etc)" className="w-full p-4 rounded-xl border-2 border-zinc-100 focus:border-[#007AFF] outline-none font-bold text-sm transition-all" value={editProduct.downloadUrl || ''} onChange={e => setEditProduct({...editProduct, downloadUrl: e.target.value})} />
            </div>

            <div className="p-5 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Gallery (Max 20)</h4>
                <span className="text-[10px] font-black px-2 py-0.5 bg-zinc-200 rounded-full">{editProduct.gallery?.length || 0}/20</span>
              </div>
              
              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-4 bg-white border-2 border-zinc-200 text-zinc-600 rounded-xl flex items-center justify-center gap-3 font-black text-xs hover:border-[#007AFF] hover:text-[#007AFF] transition-all shadow-sm active:scale-95"
              >
                <i className="fa-solid fa-images"></i>
                <span>Upload From Device</span>
              </button>
              <input ref={galleryInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleGalleryImagesUpload} />

              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
                {editProduct.gallery?.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group shadow-sm bg-white">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => handleRemoveGalleryImage(idx)} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><i className="fa-solid fa-trash-can text-xs"></i></button>
                  </div>
                ))}
                {(editProduct.gallery?.length || 0) === 0 && (
                  <div className="col-span-full h-24 flex flex-col items-center justify-center text-zinc-300">
                    <i className="fa-solid fa-photo-film text-xl mb-1"></i>
                    <p className="text-[10px] font-black">Empty Gallery</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <textarea placeholder="Product Description..." className="w-full p-4 rounded-xl border-2 border-zinc-100 focus:border-[#007AFF] outline-none font-medium text-sm h-24 transition-all" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />

          <button onClick={handleSaveProduct} className="w-full py-4 bg-[#007AFF] text-white rounded-xl font-black text-base shadow-xl shadow-blue-500/10 active:scale-95 transition-all">Publish to Edge Store</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 px-2">
        {products.map(p => (
          <div key={p.id} className="glass-panel p-3 rounded-2xl flex items-center justify-between border-white">
            <div className="flex items-center gap-3">
              <img src={p.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
              <div><h4 className="font-bold text-sm">{p.title}</h4><p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">{p.category} • {p.gallery?.length || 0} pics</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditProduct(p); setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); }} className="w-9 h-9 bg-blue-50 text-[#007AFF] rounded-lg flex items-center justify-center text-xs"><i className="fa-solid fa-pen"></i></button>
              <button onClick={async () => { if(confirm('Delete this item?')) { const {error} = await supabase.from('products').delete().eq('id', p.id); if(!error) setProducts(pr => pr.filter(x => x.id !== p.id)); } }} className="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-xs"><i className="fa-solid fa-trash"></i></button>
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
           <button onClick={() => { window.location.hash = '#/'; setActiveSection('Home'); }} className="w-10 h-10 glass-panel rounded-full flex items-center justify-center text-zinc-900 border-white shadow-xl"><i className="fa-solid fa-chevron-left"></i></button>
           <div className="text-center px-4">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#007AFF] mb-1">{p.category}</span>
              <h2 className="text-xl font-black tracking-tighter text-zinc-900 line-clamp-1">{p.title}</h2>
           </div>
           <div className="w-10 opacity-0"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-2">
           <div className="lg:col-span-7 space-y-4">
              <div className="relative group">
                 <div ref={sliderRef} onScroll={handleSliderScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar rounded-[2rem] shadow-2xl bg-white border-2 border-white">
                    {fullGallery.map((url, idx) => <div key={idx} className="min-w-full snap-center p-3"><img src={url} className="w-full h-auto rounded-[1.5rem] object-contain" alt="" /></div>)}
                 </div>
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1 bg-black/5 backdrop-blur-xl rounded-full">
                    {fullGallery.map((_, idx) => <div key={idx} className={`h-1 rounded-full transition-all ${currentSlide === idx ? 'w-4 bg-[#007AFF]' : 'w-1 bg-zinc-300'}`} />)}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-5 space-y-4">
              <div className="glass-panel p-6 rounded-[2rem] border-white shadow-2xl space-y-6">
                 <div className="flex justify-between items-center">
                    <div><p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mb-1">Price</p><p className="text-3xl font-black text-zinc-900">{p.price === 0 ? 'FREE' : `${p.price} EGP`}</p></div>
                    <div className="text-amber-500 font-black flex items-center gap-1.5 text-sm"><i className="fa-solid fa-star"></i> {p.rating}</div>
                 </div>
                 <div className="space-y-2 pt-2 border-t"><h4 className="font-black text-[10px] uppercase text-zinc-400">Description</h4><p className="text-zinc-500 text-sm leading-relaxed">{p.description || "Premium digital asset for Realme UI."}</p></div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-50 rounded-2xl border text-center flex flex-col items-center justify-center overflow-hidden">
                      <i className="fa-solid fa-mobile-screen text-[#007AFF] mb-1"></i>
                      <p className="text-[8px] font-black text-zinc-400 uppercase">OS</p>
                      <p className="text-[10px] font-bold text-zinc-900 truncate w-full px-1">{p.compatibility}</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-2xl border text-center flex flex-col items-center justify-center">
                      <i className="fa-solid fa-shield-check text-[#007AFF] mb-1"></i>
                      <p className="text-[8px] font-black text-zinc-400 uppercase">Status</p>
                      <p className="text-[10px] font-bold text-zinc-900">Verified</p>
                    </div>
                 </div>
                 <button onClick={() => { setSelectedCategory(p.category === 'Apps' ? 'Themes' : p.category as Section); setSelectedProductId(p.id); setActiveSection('Order'); window.location.hash = '#/order'; }} className="w-full py-3.5 rounded-xl bg-[#007AFF] text-white font-black text-base shadow-xl shadow-blue-500/10 active:scale-95 transition-all">Checkout</button>
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
      <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in px-2">
        <header className="flex flex-col items-center text-center gap-4">
           <h2 className="text-3xl font-black text-zinc-900">Finish Order</h2>
           <a href="https://t.me/Mohamed_edge" target="_blank" className="flex items-center gap-3 bg-white p-2.5 pr-6 rounded-2xl border shadow-sm group">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-[#007AFF] transition-colors"><i className="fa-brands fa-telegram text-2xl text-[#007AFF] group-hover:text-white"></i></div>
              <div className="text-left"><p className="text-[8px] font-black text-zinc-400 uppercase leading-none">Telegram</p><p className="font-bold text-zinc-900">@Mohamed_edge</p></div>
           </a>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
             <div className="glass-panel p-5 rounded-[1.5rem] space-y-6">
                <div className="grid grid-cols-2 gap-2">
                   {['Realme', 'Oppo'].map(b => <button key={b} onClick={() => setSelectedPhone(b as any)} className={`py-3.5 rounded-xl font-black text-base border-2 transition-all ${selectedPhone === b ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'bg-zinc-50 border-transparent'}`}>{b}</button>)}
                </div>
                <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                   {['Themes', 'Widgets', 'Walls'].map(c => <button key={c} onClick={() => setSelectedCategory(c as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${selectedCategory === c ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{c}</button>)}
                </div>
                <div className="space-y-1">
                   <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-50 font-black text-sm appearance-none outline-none border focus:border-[#007AFF]">
                      {productsInCategory.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      {productsInCategory.length === 0 && <option disabled>Stock Empty</option>}
                   </select>
                </div>
             </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-28">
             <div className="glass-panel p-6 rounded-[2rem] border-white shadow-2xl space-y-5 overflow-hidden">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border shadow-inner">
                   {selectedProduct ? <img src={selectedProduct.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-zinc-100" />}
                </div>
                {selectedProduct && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border">
                       <div><p className="text-[8px] font-black text-zinc-400 uppercase mb-0.5">Summary</p><p className="text-2xl font-black">{selectedProduct.price} EGP</p></div>
                       <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-full">SECURE</span>
                    </div>
                    {selectedProduct.price > 0 && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                         <i className="fa-solid fa-wallet text-amber-500 text-xs"></i>
                         <p className="text-[10px] font-bold text-amber-900 leading-tight">Vodafone Cash Transfer: <br/><span className="text-sm font-black">01091931466</span></p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {selectedProduct.price === 0 ? (
                        <button onClick={() => handleDownload(selectedProduct)} className="w-full py-3.5 bg-[#007AFF] text-white font-black text-base rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all">Download Now</button>
                      ) : (
                        <button onClick={handleOrderViaTelegram} className="w-full py-3.5 bg-[#24A1DE] text-white font-black text-base rounded-xl shadow-lg shadow-sky-500/10 active:scale-95 transition-all flex items-center justify-center gap-3">
                          <i className="fa-brands fa-telegram text-xl"></i><span>Order on Telegram</span>
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

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#F2F2F7]"><div className="w-10 h-10 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header onAdminTrigger={() => setIsAuthModalOpen(true)} />
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md">
           <div className="w-full max-w-[300px] glass-panel p-6 rounded-[2rem] space-y-6 animate-in zoom-in-95">
              <div className="text-center"><h3 className="text-lg font-black">Admin Mode</h3><p className="text-zinc-400 font-bold text-[10px]">Enter Access Key</p></div>
              <input type="password" autoFocus value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} className="w-full p-4 rounded-xl bg-zinc-100 text-center text-2xl font-black tracking-widest outline-none" placeholder="••••" />
              <div className="grid grid-cols-2 gap-2"><button onClick={() => { setIsAuthModalOpen(false); setPasswordInput(''); }} className="py-2.5 text-xs font-black text-zinc-400">Cancel</button><button onClick={handleAdminAuth} className="py-2.5 bg-[#007AFF] text-white rounded-xl font-black text-xs">Verify</button></div>
           </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-10 pb-32">
            {banner.isVisible && (
              <section className="relative w-full aspect-[16/10] sm:aspect-video rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl group">
                <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" alt="" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent flex flex-col justify-center px-6 sm:px-20">
                  <div className="max-w-xl space-y-4"><h2 className="text-3xl sm:text-6xl font-black text-white leading-tight">{banner.title} <span className="text-[#007AFF]">{banner.highlight}</span></h2><button onClick={() => setActiveSection('Themes')} className="px-6 py-3 bg-[#007AFF] text-white rounded-xl font-black shadow-xl shadow-blue-500/20">Shop Now</button></div>
                </div>
              </section>
            )}
            <section className="space-y-6"><h2 className="text-xl font-black flex items-center gap-2"><div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> Trends</h2><div className="grid grid-cols-1 gap-6 sm:gap-10">{products.slice(0, 3).map(p => <ProductCard key={p.id} product={p} onPreview={handleOpenPreview} onBuy={(id, cat) => { setSelectedCategory(cat === 'Apps' ? 'Themes' : cat as Section); setSelectedProductId(id); setActiveSection('Order'); window.location.hash = '#/order'; }} />)}</div></section>
          </div>
        )}
        {activeSection === 'Preview' && renderPreviewPage()}
        {activeSection === 'Order' && renderOrderPage()}
        {activeSection === 'Admin' && isAdminMode && renderAdmin()}
        {['Themes', 'Widgets', 'Walls'].includes(activeSection) && (
          <div className="space-y-8 pb-32 animate-in fade-in"><h2 className="text-2xl font-black px-2">{activeSection}</h2><div className="grid grid-cols-1 gap-6">{products.filter(p => p.category === activeSection).map(p => <ProductCard key={p.id} product={p} onPreview={handleOpenPreview} onBuy={(id, cat) => { setSelectedCategory(cat === 'Apps' ? 'Themes' : cat as Section); setSelectedProductId(id); setActiveSection('Order'); window.location.hash = '#/order'; }} />)}</div></div>
        )}
      </main>
      {notification && <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 w-[90%] sm:w-auto"><div className="px-4 py-2 rounded-full shadow-2xl font-bold flex items-center justify-center gap-2 border bg-[#007AFF] text-white border-blue-600 text-[10px] sm:text-xs"><i className="fa-solid fa-circle-check"></i> {notification.message}</div></div>}
      {!isAdminMode && <BottomNav activeSection={activeSection} onSectionChange={setActiveSection} />}
    </div>
  );
};

export default App;