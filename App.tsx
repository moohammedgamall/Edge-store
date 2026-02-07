import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings } from './types';
import { MOCK_PRODUCTS, DEFAULT_BANNER } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

// Vercel Environment Variables - Secure initialization
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for dynamic data
  const [banner, setBanner] = useState<BannerSettings & { isVisible?: boolean }>(DEFAULT_BANNER);
  const [products, setProducts] = useState<Product[]>([]);

  // Password Logic
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('1234');
  const [passwordInput, setPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordData, setNewPasswordData] = useState({ current: '', next: '', confirm: '' });

  // Selection states for Ordering
  const [selectedPhone, setSelectedPhone] = useState<'Realme' | 'Oppo'>('Realme');
  const [selectedCategory, setSelectedCategory] = useState<Section>('Themes');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Admin editing states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const [isEditingBanner, setIsEditingBanner] = useState<boolean>(false);

  // Preview Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Check URL Hash for Routing
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

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (!supabase) {
        setProducts(MOCK_PRODUCTS);
        setIsLoading(false);
        return;
      }

      try {
        const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'admin_password').single();
        if (settingsData) setAdminPassword(settingsData.value);

        const { data: bannerData } = await supabase.from('banner').select('*').single();
        if (bannerData) setBanner({ ...bannerData, isVisible: true });

        const { data: productsData } = await supabase.from('products').select('*');
        if (productsData && productsData.length > 0) setProducts(productsData);
        else setProducts(MOCK_PRODUCTS);
      } catch (error) {
        console.error("Fetch error:", error);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSection === 'Order') {
      const productsInCategory = products.filter(p => p.category === selectedCategory);
      if (productsInCategory.length > 0) {
        const alreadySelected = productsInCategory.find(p => p.id === selectedProductId);
        if (!alreadySelected) setSelectedProductId(productsInCategory[0].id);
      } else {
        setSelectedProductId('');
      }
    }
  }, [selectedCategory, activeSection, products, selectedProductId]);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdminAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotification("Welcome back, Admin", "success");
    } else {
      showNotification("Incorrect Password", "info");
      setPasswordInput('');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPasswordData.current !== adminPassword) {
      showNotification("Current password incorrect", "info");
      return;
    }
    if (newPasswordData.next !== newPasswordData.confirm) {
      showNotification("Passwords do not match", "info");
      return;
    }
    if (newPasswordData.next.length < 4) {
      showNotification("Password too short", "info");
      return;
    }

    if (supabase) {
      const { error } = await supabase.from('settings').upsert({ key: 'admin_password', value: newPasswordData.next });
      if (!error) {
        setAdminPassword(newPasswordData.next);
        setIsChangingPassword(false);
        setNewPasswordData({ current: '', next: '', confirm: '' });
        showNotification("Password updated successfully");
      }
    }
  };

  const handleAddToGallery = () => {
    if (!galleryUrlInput.trim()) return;
    const currentGallery = editProduct.gallery || [];
    if (currentGallery.length >= 20) {
      showNotification("Gallery limit reached (max 20)", "info");
      return;
    }
    setEditProduct({
      ...editProduct,
      gallery: [...currentGallery, galleryUrlInput.trim()]
    });
    setGalleryUrlInput('');
  };

  const handleRemoveFromGallery = (index: number) => {
    const currentGallery = editProduct.gallery || [];
    setEditProduct({
      ...editProduct,
      gallery: currentGallery.filter((_, i) => i !== index)
    });
  };

  const handleSaveProduct = async () => {
    if (!supabase || !editProduct.title || !editProduct.image) return;
    const productToSave = { 
      ...editProduct, 
      id: editProduct.id || Date.now().toString(), 
      price: editProduct.price || 0,
      gallery: editProduct.gallery || [] 
    };
    const { error } = await supabase.from('products').upsert(productToSave);
    if (!error) {
      setProducts(prev => {
        const exists = prev.find(p => p.id === productToSave.id);
        return exists ? prev.map(p => p.id === productToSave.id ? productToSave as Product : p) : [...prev, productToSave as Product];
      });
      setIsEditing(false);
      showNotification("Product saved successfully");
    }
  };

  const handleSaveBanner = async () => {
    if (!supabase) return;
    const { error } = await supabase.from('banner').upsert({ id: 1, ...banner });
    if (!error) {
      setIsEditingBanner(false);
      showNotification("Banner updated");
    }
  };

  const handleDownload = (product: Product) => {
    if (product.downloadUrl) {
      window.open(product.downloadUrl, '_blank');
      showNotification(`Downloading: ${product.title}`);
    } else {
      showNotification("Download link not set", "info");
    }
  };

  const handleOrderViaTelegram = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const message = `Hello Mohamed_edge 👋\nI want to order:\n\nDevice: ${selectedPhone}\nCategory: ${product.category}\nProduct: ${product.title}\nPrice: ${product.price === 0 ? 'FREE' : '$' + product.price.toFixed(2)}`;
    window.open(`https://t.me/Mohamed_edge?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleOpenPreview = (id: string) => {
    window.location.hash = `#/preview/${id}`;
    setSelectedProductId(id);
    setActiveSection('Preview');
    setCurrentSlide(0); // Reset slide on open
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSliderScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const width = sliderRef.current.offsetWidth;
      const newSlide = Math.round(scrollLeft / width);
      if (newSlide !== currentSlide) {
        setCurrentSlide(newSlide);
      }
    }
  };

  const renderAdmin = () => (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900">Control Center</h2>
          <p className="text-zinc-500 font-medium text-sm sm:text-base">Manage your digital assets and security.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setIsChangingPassword(!isChangingPassword); setIsEditing(false); setIsEditingBanner(false); }} className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold shadow-lg transition-all text-sm sm:text-base ${isChangingPassword ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 border border-zinc-200'}`}><i className="fa-solid fa-lock mr-2"></i> Security</button>
          <button onClick={() => { setIsEditingBanner(!isEditingBanner); setIsEditing(false); setIsChangingPassword(false); }} className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold shadow-lg transition-all text-sm sm:text-base ${isEditingBanner ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 border border-zinc-200'}`}><i className="fa-solid fa-pen-fancy mr-2"></i> Banner</button>
          <button onClick={() => { setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); setEditProduct({ id: Date.now().toString(), price: 0, category: 'Themes', rating: 5.0, downloads: '0', isPremium: false, gallery: [] }); }} className="px-4 sm:px-6 py-2 sm:py-3 bg-[#007AFF] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 text-sm sm:text-base"><i className="fa-solid fa-plus-circle mr-2"></i> Add Item</button>
        </div>
      </header>
      
      {isChangingPassword && (
        <div className="glass-panel p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] space-y-6 animate-in slide-in-from-top-4">
          <h3 className="text-xl font-black">Change Admin Password</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input type="password" placeholder="Current Password" className="p-4 rounded-xl border bg-white text-sm" value={newPasswordData.current} onChange={e => setNewPasswordData({...newPasswordData, current: e.target.value})} />
            <input type="password" placeholder="New Password" className="p-4 rounded-xl border bg-white text-sm" value={newPasswordData.next} onChange={e => setNewPasswordData({...newPasswordData, next: e.target.value})} />
            <input type="password" placeholder="Confirm New" className="p-4 rounded-xl border bg-white text-sm" value={newPasswordData.confirm} onChange={e => setNewPasswordData({...newPasswordData, confirm: e.target.value})} />
          </div>
          <button onClick={handleUpdatePassword} className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black">Update Password</button>
        </div>
      )}

      {isEditingBanner && (
        <div className="glass-panel p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] space-y-6 animate-in slide-in-from-top-4">
          <h3 className="text-xl font-black">Hero Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input placeholder="Title" className="p-4 rounded-xl border bg-white text-sm" value={banner.title} onChange={e => setBanner({...banner, title: e.target.value})} />
            <input placeholder="Highlight" className="p-4 rounded-xl border bg-white text-sm" value={banner.highlight} onChange={e => setBanner({...banner, highlight: e.target.value})} />
            <input placeholder="Image URL" className="p-4 rounded-xl border bg-white col-span-2 text-sm" value={banner.imageUrl} onChange={e => setBanner({...banner, imageUrl: e.target.value})} />
          </div>
          <button onClick={handleSaveBanner} className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black">Apply Changes</button>
        </div>
      )}

      {isEditing && (
        <div className="glass-panel p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] space-y-8 animate-in zoom-in-95">
          <div className="flex justify-between items-center">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Product Configuration</h3>
            <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-zinc-900"><i className="fa-solid fa-xmark text-xl"></i></button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Basic Info</label>
                  <input placeholder="Product Title" className="w-full p-4 rounded-xl border bg-white font-bold text-sm" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Price ($)</label>
                  <input placeholder="0.00" type="number" className="w-full p-4 rounded-xl border bg-white font-bold text-sm" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
               </div>
               <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Primary Thumbnail URL</label>
                  <input placeholder="https://..." className="w-full p-4 rounded-xl border bg-white text-sm" value={editProduct.image || ''} onChange={e => setEditProduct({...editProduct, image: e.target.value})} />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Category</label>
                  <select className="w-full p-4 rounded-xl border bg-white font-bold text-sm" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                      <option value="Themes">Themes</option>
                      <option value="Widgets">Widgets</option>
                      <option value="Walls">Walls</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Premium Status</label>
                  <div className="flex items-center gap-4 p-4 rounded-xl border bg-white">
                    <input type="checkbox" className="w-5 h-5 accent-[#007AFF]" checked={editProduct.isPremium} onChange={e => setEditProduct({...editProduct, isPremium: e.target.checked})} />
                    <span className="font-bold text-zinc-600 text-sm">Mark as Premium Asset</span>
                  </div>
               </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-zinc-100">
               <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h4 className="font-black text-lg">Product Gallery</h4>
                    <p className="text-zinc-400 text-xs font-medium">Add up to 20 preview images for this item.</p>
                  </div>
                  <span className="text-[10px] font-black bg-zinc-100 px-3 py-1 rounded-full text-zinc-500 uppercase">{(editProduct.gallery || []).length} / 20</span>
               </div>
               <div className="flex gap-2">
                  <input placeholder="Enter Image URL..." className="flex-1 p-4 rounded-xl border bg-white text-sm" value={galleryUrlInput} onChange={e => setGalleryUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddToGallery()} />
                  <button onClick={handleAddToGallery} className="px-5 sm:px-6 bg-zinc-900 text-white rounded-xl font-black text-sm">Add</button>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 pt-2">
                  {(editProduct.gallery || []).map((url, idx) => (
                    <div key={idx} className="relative aspect-square group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => handleRemoveFromGallery(idx)} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xl"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  ))}
                  {(editProduct.gallery || []).length === 0 && (
                    <div className="col-span-full py-8 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-zinc-300 gap-2">
                      <i className="fa-solid fa-images text-2xl"></i>
                      <p className="text-[10px] font-bold uppercase tracking-widest">No Gallery Images</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
          <div className="pt-6">
            <button onClick={handleSaveProduct} className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Commit Changes to Store</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {products.map(p => (
          <div key={p.id} className="glass-panel p-3 sm:p-4 rounded-2xl flex items-center justify-between border border-white">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={p.image} className="w-12 h-12 sm:w-16 sm:h-10 rounded-lg object-cover shadow-sm" alt="" />
              <div>
                <h4 className="font-bold text-sm sm:text-base">{p.title}</h4>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-tighter">{p.category}</p>
                  <span className="text-[9px] sm:text-[10px] text-blue-500 font-bold">• {(p.gallery || []).length} photos</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <button onClick={() => { setEditProduct(p); setIsEditing(true); setIsEditingBanner(false); setIsChangingPassword(false); }} className="p-2.5 sm:p-3 bg-blue-50 text-[#007AFF] rounded-xl"><i className="fa-solid fa-pen text-sm sm:text-base"></i></button>
              <button onClick={async () => { if(!supabase) return; await supabase.from('products').delete().eq('id', p.id); setProducts(pr => pr.filter(x => x.id !== p.id)); }} className="p-2.5 sm:p-3 bg-red-50 text-red-500 rounded-xl"><i className="fa-solid fa-trash text-sm sm:text-base"></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPreviewPage = () => {
    const p = products.find(x => x.id === selectedProductId);
    if (!p) return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <i className="fa-solid fa-magnifying-glass text-5xl text-zinc-200"></i>
        <p className="font-black text-zinc-400">Product Not Found</p>
        <button onClick={() => { window.location.hash = '#/'; setActiveSection('Home'); }} className="text-[#007AFF] font-black">Go Back Home</button>
      </div>
    );

    const fullGallery = p.gallery && p.gallery.length > 0 ? p.gallery : [p.image];

    return (
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <header className="flex items-center justify-between px-2 sm:px-0">
           <button 
             onClick={() => { window.location.hash = '#/'; setActiveSection('Home'); }} 
             className="w-10 h-10 sm:w-12 sm:h-12 glass-panel rounded-full flex items-center justify-center text-zinc-900 border-white hover:bg-white shadow-xl transition-all"
           >
              <i className="fa-solid fa-chevron-left text-sm sm:text-base"></i>
           </button>
           <div className="text-center flex flex-col items-center px-4">
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-[#007AFF] mb-1">{p.category} Preview</span>
              <h2 className="text-xl sm:text-3xl font-black tracking-tighter text-zinc-900 leading-tight">{p.title}</h2>
           </div>
           <div className="w-10 h-10 sm:w-12 sm:h-12 pointer-events-none opacity-0"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
           {/* Interactive Swipeable Gallery Section */}
           <div className="lg:col-span-7 space-y-6">
              <div className="relative group">
                 <div 
                    ref={sliderRef}
                    onScroll={handleSliderScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar rounded-[2rem] sm:rounded-[3rem] shadow-2xl bg-zinc-100 border-4 border-white"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                 >
                    {fullGallery.map((url, idx) => (
                       <div key={idx} className="min-w-full snap-center flex items-center justify-center p-3 sm:p-4">
                          <img 
                            src={url} 
                            className="w-full h-auto rounded-[1.5rem] sm:rounded-[2rem] object-contain shadow-sm" 
                            alt={`Preview ${idx + 1}`} 
                          />
                       </div>
                    ))}
                 </div>

                 <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/20 backdrop-blur-xl rounded-full border border-white/20">
                    {fullGallery.map((_, idx) => (
                       <div 
                          key={idx} 
                          className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-6 bg-[#007AFF]' : 'w-1.5 bg-white/50'}`}
                       />
                    ))}
                 </div>

                 <div className="absolute top-1/2 -translate-y-1/2 left-6 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    <button 
                       onClick={() => sliderRef.current?.scrollBy({ left: -sliderRef.current.offsetWidth, behavior: 'smooth' })}
                       className="w-10 h-10 bg-white/80 backdrop-blur-lg rounded-full shadow-lg flex items-center justify-center text-[#007AFF]"
                    >
                       <i className="fa-solid fa-chevron-left"></i>
                    </button>
                 </div>
                 <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    <button 
                       onClick={() => sliderRef.current?.scrollBy({ left: sliderRef.current.offsetWidth, behavior: 'smooth' })}
                       className="w-10 h-10 bg-white/80 backdrop-blur-lg rounded-full shadow-lg flex items-center justify-center text-[#007AFF]"
                    >
                       <i className="fa-solid fa-chevron-right"></i>
                    </button>
                 </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-1 opacity-60">
                 <i className="fa-solid fa-hand-pointer animate-bounce text-[#007AFF] text-sm"></i>
                 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500">Swipe to explore all {fullGallery.length} screens</p>
              </div>
           </div>

           {/* Info & Purchase Sidebar */}
           <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-8 px-2 sm:px-0">
              <div className="glass-panel p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border-white shadow-2xl space-y-6 sm:space-y-8">
                 <div className="flex justify-between items-start">
                    <div>
                       <p className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1">Market Price</p>
                       <p className="text-3xl sm:text-5xl font-black text-zinc-900 tracking-tighter">
                          {p.price === 0 ? 'FREE' : `$${p.price.toFixed(2)}`}
                       </p>
                    </div>
                    <div className="text-right">
                       <div className="flex items-center gap-1.5 text-amber-500 font-black text-base sm:text-lg">
                          <i className="fa-solid fa-star"></i>
                          <span>{p.rating}</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-zinc-100/50">
                    <h4 className="font-black text-base sm:text-lg tracking-tight">Product Description</h4>
                    <p className="text-zinc-500 font-medium text-sm sm:text-base leading-relaxed">
                       {p.description || "No detailed description available for this item."}
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 sm:p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center gap-1 sm:gap-2 text-center">
                       <i className="fa-solid fa-mobile-screen text-[#007AFF] text-lg sm:text-xl"></i>
                       <span className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-400">Target UI</span>
                       <span className="text-[10px] sm:text-xs font-black text-zinc-900 line-clamp-1">{p.compatibility || 'ColorOS'}</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center gap-1 sm:gap-2 text-center">
                       <i className="fa-solid fa-shield-check text-[#007AFF] text-lg sm:text-xl"></i>
                       <span className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-400">Security</span>
                       <span className="text-[10px] sm:text-xs font-black text-zinc-900">Verified</span>
                    </div>
                 </div>

                 <button 
                   onClick={() => { 
                     const target = (p.category === 'Apps' ? 'Themes' : p.category) as Section;
                     setSelectedCategory(target); 
                     setSelectedProductId(p.id); 
                     setActiveSection('Order'); 
                     window.location.hash = '#/order';
                     window.scrollTo({ top: 0, behavior: 'smooth' }); 
                   }}
                   className="w-full py-4 rounded-xl sm:rounded-2xl bg-[#007AFF] text-white font-black text-lg sm:text-xl shadow-2xl shadow-blue-500/30 hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 sm:gap-4 group"
                 >
                   <i className="fa-solid fa-cart-shopping group-hover:-translate-x-1 transition-transform"></i>
                   Checkout
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderOrderPage = () => {
    const productsInCategory = products.filter(p => p.category === selectedCategory);
    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
      <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700 px-2 sm:px-0">
        <header className="flex flex-col items-center text-center gap-6 sm:gap-8">
           <div className="max-w-2xl px-4">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-zinc-900 mb-2">Checkout</h2>
              <p className="text-zinc-500 font-medium text-base sm:text-lg">Complete your selections to get personalized content for your device.</p>
           </div>
           
           <a 
             href="https://t.me/Mohamed_edge" 
             target="_blank" 
             rel="noopener noreferrer"
             className="flex items-center gap-3 sm:gap-4 bg-white p-2.5 sm:p-3 pr-6 sm:pr-8 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-xl hover:border-[#007AFF]/30 transition-all group scale-100 sm:scale-105"
           >
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-[#007AFF] transition-colors">
                <i className="fa-brands fa-telegram text-2xl sm:text-3xl text-[#007AFF] group-hover:text-white transition-colors"></i>
              </div>
              <div className="text-left">
                 <p className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] leading-none mb-1">Direct Contact</p>
                 <p className="font-bold text-zinc-900 text-lg sm:text-xl tracking-tight leading-none">@Mohamed_edge</p>
              </div>
           </a>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start pt-4">
          <div className="lg:col-span-7 relative">
             <div className="absolute left-[24px] top-12 bottom-12 w-[2px] bg-zinc-200 hidden sm:block"></div>
             <div className="space-y-6 sm:space-y-8">
                <div className="flex gap-4 sm:gap-6 group">
                   <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white border-2 border-zinc-100 items-center justify-center font-black text-zinc-900 z-10 group-hover:border-[#007AFF] transition-colors">01</div>
                   <div className="flex-1 glass-panel p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white shadow-xl hover:shadow-2xl transition-all">
                      <h3 className="font-black text-lg sm:text-xl text-zinc-900 mb-4 sm:mb-6 flex items-center gap-3"><i className="fa-solid fa-microchip text-[#007AFF]"></i>Brand Selection</h3>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                         {['Realme', 'Oppo'].map((phone) => (
                           <button key={phone} onClick={() => setSelectedPhone(phone as any)} className={`relative py-4 sm:py-6 rounded-xl sm:rounded-2xl font-black text-lg sm:text-xl transition-all border-2 flex flex-col items-center gap-1 sm:gap-2 overflow-hidden ${selectedPhone === phone ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xl shadow-blue-500/20' : 'bg-zinc-50/50 text-zinc-400 border-transparent hover:bg-white hover:border-zinc-200'}`}>
                              <i className={`fa-solid ${phone === 'Realme' ? 'fa-mobile-screen-button' : 'fa-mobile'} text-2xl sm:text-3xl opacity-30`}></i>{phone}
                              {selectedPhone === phone && (<div className="absolute top-2 right-2 animate-in zoom-in"><i className="fa-solid fa-circle-check text-white text-xs sm:text-base"></i></div>)}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
                <div className="flex gap-4 sm:gap-6 group">
                   <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white border-2 border-zinc-100 items-center justify-center font-black text-zinc-900 z-10 group-hover:border-[#007AFF] transition-colors">02</div>
                   <div className="flex-1 glass-panel p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white shadow-xl hover:shadow-2xl transition-all">
                      <h3 className="font-black text-lg sm:text-xl text-zinc-900 mb-4 sm:mb-6 flex items-center gap-3"><i className="fa-solid fa-layer-group text-[#007AFF]"></i>Asset Category</h3>
                      <div className="p-1.5 bg-zinc-100/80 rounded-xl sm:rounded-2xl flex items-center">
                         {['Themes', 'Widgets', 'Walls'].map(cat => (
                           <button key={cat} onClick={() => setSelectedCategory(cat as Section)} className={`flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all ${selectedCategory === cat ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>{cat}</button>
                         ))}
                      </div>
                   </div>
                </div>
                <div className="flex gap-4 sm:gap-6 group">
                   <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white border-2 border-zinc-100 items-center justify-center font-black text-zinc-900 z-10 group-hover:border-[#007AFF] transition-colors">03</div>
                   <div className="flex-1 glass-panel p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white shadow-xl hover:shadow-2xl transition-all">
                      <h3 className="font-black text-lg sm:text-xl text-zinc-900 mb-4 sm:mb-6 flex items-center gap-3"><i className="fa-solid fa-cart-flatbed-suitcase text-[#007AFF]"></i>Specific Item</h3>
                      <div className="relative">
                         <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-50/50 border-2 border-transparent text-zinc-900 font-black text-base sm:text-lg appearance-none outline-none focus:border-[#007AFF] focus:bg-white transition-all pl-6 sm:pl-8 shadow-inner">
                           {productsInCategory.length > 0 ? productsInCategory.map(p => <option key={p.id} value={p.id}>{p.title}</option>) : <option disabled>Stock Empty</option>}
                         </select>
                         <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[#007AFF]"><i className="fa-solid fa-angles-up-down text-base sm:text-lg"></i></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-32">
             <div className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white shadow-2xl space-y-6 sm:space-y-8 overflow-hidden relative group">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#007AFF]/10 rounded-full blur-3xl group-hover:bg-[#007AFF]/20 transition-colors"></div>
                <div className="space-y-4">
                  <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 text-center">Summary Preview</h4>
                  <div className="relative aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-zinc-100 border-4 border-white">
                    {selectedProduct ? (
                      <>
                        <img src={selectedProduct.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 sm:p-6">
                           <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                              <span className="px-2 sm:px-3 py-1 bg-[#007AFF] text-white text-[8px] sm:text-[9px] font-black rounded-lg uppercase tracking-[0.1em]">{selectedProduct.category}</span>
                              <span className="text-white/70 text-[9px] sm:text-[10px] font-bold">{selectedPhone === 'Realme' ? 'Realme UI 5.0+' : selectedProduct.compatibility}</span>
                           </div>
                           <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight leading-none line-clamp-1">{selectedProduct.title}</h3>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 gap-4"><i className="fa-solid fa-shopping-cart text-4xl sm:text-5xl opacity-20"></i><p className="font-bold text-[10px]">Waiting for selection...</p></div>
                    )}
                  </div>
                </div>
                {selectedProduct && (
                  <div className="space-y-6 pt-2">
                    <div className="flex flex-col gap-4">
                       <div className="flex items-center justify-between p-4 sm:p-6 bg-zinc-50/50 rounded-2xl sm:rounded-3xl border border-zinc-100/50">
                          <div className="text-left">
                             <p className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-0.5 sm:mb-1">Price Point</p>
                             <p className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tighter">{selectedProduct.price === 0 ? 'FREE' : `$${selectedProduct.price.toFixed(2)}`}</p>
                          </div>
                          <div className="text-right">
                             <div className="flex items-center gap-1.5 text-blue-600 font-black text-[9px] uppercase bg-blue-50 px-2.5 py-1 rounded-full mb-0.5"><i className="fa-solid fa-shield-check"></i><span>Verified</span></div>
                             <p className="text-zinc-400 text-[8px] sm:text-[9px] font-bold">Secure Delivery</p>
                          </div>
                       </div>
                       {selectedProduct.price > 0 && (
                         <div className="p-4 sm:p-5 bg-amber-50 rounded-2xl border border-amber-200/50 flex gap-3 sm:gap-4 animate-in fade-in zoom-in-95">
                            <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 text-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20"><i className="fa-solid fa-wallet text-xs sm:text-sm"></i></div>
                            <div className="space-y-1">
                               <p className="text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">Instruction</p>
                               <p className="text-[10px] sm:text-[11px] font-bold text-amber-800 leading-tight">Transfer via <span className="underline decoration-amber-400 font-black">Vodafone Cash</span> to: <br/><span className="text-base sm:text-lg font-black tracking-tight text-amber-900">01091931466</span></p>
                            </div>
                         </div>
                       )}
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      {selectedProduct.price === 0 ? (
                        <button 
                          onClick={() => handleDownload(selectedProduct)} 
                          className="w-full py-4 rounded-xl sm:rounded-2xl bg-[#007AFF] text-white font-black text-lg sm:text-xl shadow-2xl shadow-blue-500/30 hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                        >
                          <i className="fa-solid fa-cloud-arrow-down text-xl sm:text-2xl group-hover:translate-y-1 transition-transform"></i>
                          Download
                        </button>
                      ) : (
                        <button 
                          onClick={handleOrderViaTelegram} 
                          className="relative overflow-hidden w-full py-4 rounded-xl sm:rounded-2xl bg-[#24A1DE] text-white font-black text-lg sm:text-xl shadow-2xl shadow-sky-500/30 hover:bg-[#229ED9] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                          <i className="fa-brands fa-telegram text-2xl sm:text-3xl group-hover:rotate-12 transition-transform duration-300"></i>
                          <span>Order on Telegram</span>
                        </button>
                      )}
                      <p className="text-center text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] opacity-50">Instant delivery upon confirmation</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] gap-4">
      <div className="w-12 h-12 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin"></div>
      <div className="font-black text-xl text-[#007AFF] animate-pulse">EDGE STORE</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header onAdminTrigger={() => setIsAuthModalOpen(true)} />
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-[340px] glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-2">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto text-xl sm:text-2xl shadow-xl"><i className="fa-solid fa-lock"></i></div>
                 <h3 className="text-xl sm:text-2xl font-black tracking-tight pt-2">Admin Access</h3>
                 <p className="text-zinc-400 font-bold text-xs sm:text-sm">Enter password to proceed.</p>
              </div>
              <input type="password" autoFocus value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} placeholder="••••" className="w-full p-4 rounded-xl bg-zinc-100 text-center text-2xl sm:text-3xl font-black tracking-[0.5em] outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => { setIsAuthModalOpen(false); setPasswordInput(''); }} className="py-3 sm:py-4 rounded-xl font-black text-zinc-400 hover:text-zinc-600 text-sm sm:text-base">Cancel</button>
                 <button onClick={handleAdminAuth} className="py-3 sm:py-4 rounded-xl bg-[#007AFF] text-white font-black shadow-lg text-sm sm:text-base">Login</button>
              </div>
           </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {activeSection === 'Home' && (
          <div className="space-y-12 sm:space-y-16 pb-32">
            {banner.isVisible && (
              <section className="relative w-full aspect-[16/10] sm:aspect-video rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl group animate-in zoom-in-95 duration-700">
                <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex flex-col justify-center px-6 sm:px-20">
                  <div className="max-w-2xl space-y-4 sm:space-y-6">
                    <h2 className="text-3xl sm:text-7xl font-black text-white leading-tight">{banner.title} <br/><span className="text-[#007AFF]">{banner.highlight}</span></h2>
                    <button onClick={() => setActiveSection('Themes')} className="px-6 sm:px-10 py-3 sm:py-5 bg-[#007AFF] text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-xl shadow-xl shadow-blue-500/30">Explore Shop</button>
                  </div>
                </div>
              </section>
            )}
            <section className="space-y-8 sm:space-y-10">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter flex items-center gap-3"><div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-[#007AFF] rounded-full"></div>New Arrivals</h2>
              <div className="grid grid-cols-1 gap-8 sm:gap-12">
                {products.slice(0, 3).map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={handleOpenPreview}
                    onBuy={(id, cat) => {
                      const target = (cat === 'Apps' ? 'Themes' : cat) as Section;
                      setSelectedCategory(target);
                      setSelectedProductId(id);
                      setActiveSection('Order');
                      window.location.hash = '#/order';
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                  />
                ))}
              </div>
            </section>
          </div>
        )}
        {activeSection === 'Preview' && renderPreviewPage()}
        {activeSection === 'Order' && renderOrderPage()}
        {activeSection === 'Admin' && isAdminMode && renderAdmin()}
        {['Themes', 'Widgets', 'Walls'].includes(activeSection) && (
          <div className="space-y-10 sm:space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-1.5 sm:w-2 h-10 sm:h-12 bg-[#007AFF] rounded-full"></div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter">{activeSection}</h2>
             </div>
             <div className="grid grid-cols-1 gap-8 sm:gap-12">
                {products.filter(p => p.category === activeSection).map(p => (
                   <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={handleOpenPreview}
                    onBuy={(id, cat) => {
                       const target = (cat === 'Apps' ? 'Themes' : cat) as Section;
                       setSelectedCategory(target);
                       setSelectedProductId(id);
                       setActiveSection('Order');
                       window.location.hash = '#/order';
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                     }} 
                   />
                ))}
             </div>
          </div>
        )}
      </main>
      {notification && (
        <div className="fixed top-12 sm:top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 w-[90%] sm:w-auto">
           <div className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-full shadow-2xl font-bold flex items-center justify-center gap-3 border text-xs sm:text-base ${notification.type === 'success' ? 'bg-green-500 text-white border-green-600' : 'bg-[#007AFF] text-white border-blue-600'}`}>
              <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-info-circle'}`}></i>
              {notification.message}
           </div>
        </div>
      )}
      {!isAdminMode && <BottomNav activeSection={activeSection} onSectionChange={setActiveSection} />}
    </div>
  );
};

export default App;