import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings } from './types';
import { MOCK_PRODUCTS, DEFAULT_BANNER } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

// Supabase Configuration
// Note: Replace these placeholders with your actual Supabase URL and Key in your project settings/Vercel env vars
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for dynamic data
  const [banner, setBanner] = useState<BannerSettings & { isVisible?: boolean }>(DEFAULT_BANNER);
  const [products, setProducts] = useState<Product[]>([]);

  // Selection states for Ordering
  const [selectedPhone, setSelectedPhone] = useState<'Realme' | 'Oppo'>('Realme');
  const [selectedCategory, setSelectedCategory] = useState<Section>('Themes');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Admin editing states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [isEditingBanner, setIsEditingBanner] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL Hash for Routing (Separating Admin)
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        setIsAdminMode(true);
        setActiveSection('Admin');
      } else {
        setIsAdminMode(false);
        if (activeSection === 'Admin') setActiveSection('Home');
      }
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, [activeSection]);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: bannerData } = await supabase.from('banner').select('*').single();
        if (bannerData) setBanner(bannerData);

        const { data: productsData } = await supabase.from('products').select('*');
        if (productsData) setProducts(productsData);
        else setProducts(MOCK_PRODUCTS); // Fallback to mocks if DB empty
      } catch (error) {
        console.error("Supabase fetch error:", error);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update selectedProductId when category changes in Order section
  useEffect(() => {
    if (activeSection === 'Order') {
      const productsInCategory = products.filter(p => p.category === selectedCategory);
      if (productsInCategory.length > 0) {
        if (!selectedProductId || !productsInCategory.find(p => p.id === selectedProductId)) {
          setSelectedProductId(productsInCategory[0].id);
        }
      } else {
        setSelectedProductId('');
      }
    }
  }, [selectedCategory, activeSection, products, selectedProductId]);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDownload = (product: Product) => {
    if (product.downloadUrl) {
      window.open(product.downloadUrl, '_blank');
      showNotification(`Downloading: ${product.title}`);
    } else {
      alert("Link unavailable.");
    }
  };

  const handleBuyProduct = (productId: string, category: string) => {
    const targetCategory = (category === 'Apps' ? 'Themes' : category) as Section;
    setSelectedCategory(targetCategory);
    setSelectedProductId(productId);
    setActiveSection('Order');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderViaTelegram = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const message = `Hello Mohamed_edge 👋\nI want to order:\n\nDevice: ${selectedPhone}\nCategory: ${product.category}\nProduct: ${product.title}\nPrice: ${product.price === 0 ? 'FREE' : '$' + product.price.toFixed(2)}`;
    window.open(`https://t.me/Mohamed_edge?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSaveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return;
    
    const productToSave = { ...editProduct, id: editProduct.id || Date.now().toString() };
    const { error } = await supabase.from('products').upsert(productToSave);

    if (!error) {
      setProducts(prev => {
        const exists = prev.find(p => p.id === productToSave.id);
        return exists ? prev.map(p => p.id === productToSave.id ? productToSave as Product : p) : [...prev, productToSave as Product];
      });
      setIsEditing(false);
      showNotification("Product saved to Supabase");
    }
  };

  const handleSaveBanner = async () => {
    const { error } = await supabase.from('banner').upsert({ id: 1, ...banner });
    if (!error) {
      setIsEditingBanner(false);
      showNotification("Banner updated globally");
    }
  };

  const renderAdmin = () => (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900">Edge Control Center</h2>
          <p className="text-zinc-500 font-medium">Changes here reflect instantly for users.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setIsEditingBanner(!isEditingBanner); setIsEditing(false); }} 
            className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${isEditingBanner ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 border border-zinc-200'}`}
          >
            <i className="fa-solid fa-pen-fancy"></i> Edit Banner
          </button>
          <button 
            onClick={() => { setIsEditing(true); setIsEditingBanner(false); setEditProduct({ id: Date.now().toString(), price: 0, category: 'Themes', rating: 5.0, downloads: '0', isPremium: false }); }} 
            className="px-6 py-3 bg-[#007AFF] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20"
          >
            <i className="fa-solid fa-plus-circle"></i> New Asset
          </button>
        </div>
      </header>

      {isEditingBanner && (
        <div className="glass-panel p-10 rounded-[2rem] space-y-6 animate-in slide-in-from-top-4">
          <h3 className="text-xl font-black">Hero Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input placeholder="Title" className="p-4 rounded-xl border" value={banner.title} onChange={e => setBanner({...banner, title: e.target.value})} />
            <input placeholder="Highlight" className="p-4 rounded-xl border" value={banner.highlight} onChange={e => setBanner({...banner, highlight: e.target.value})} />
            <input placeholder="Image URL" className="p-4 rounded-xl border col-span-2" value={banner.imageUrl} onChange={e => setBanner({...banner, imageUrl: e.target.value})} />
          </div>
          <button onClick={handleSaveBanner} className="w-full py-4 bg-zinc-900 text-white rounded-xl font-black">Apply Changes</button>
        </div>
      )}

      {isEditing && (
        <div className="glass-panel p-10 rounded-[2rem] space-y-6 animate-in zoom-in-95">
          <h3 className="text-xl font-black">Product Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <input placeholder="Title" className="p-4 rounded-xl border" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
             <input placeholder="Price" type="number" className="p-4 rounded-xl border" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
             <input placeholder="Image URL" className="p-4 rounded-xl border col-span-2" value={editProduct.image || ''} onChange={e => setEditProduct({...editProduct, image: e.target.value})} />
          </div>
          <button onClick={handleSaveProduct} className="w-full py-4 bg-[#007AFF] text-white rounded-xl font-black">Save to Database</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {products.map(p => (
          <div key={p.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-white">
            <div className="flex items-center gap-4">
              <img src={p.image} className="w-16 h-10 rounded-lg object-cover" alt="" />
              <h4 className="font-bold">{p.title}</h4>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditProduct(p); setIsEditing(true); }} className="p-3 bg-blue-50 text-[#007AFF] rounded-xl"><i className="fa-solid fa-pen"></i></button>
              <button onClick={async () => { await supabase.from('products').delete().eq('id', p.id); setProducts(pr => pr.filter(x => x.id !== p.id)); }} className="p-3 bg-red-50 text-red-500 rounded-xl"><i className="fa-solid fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-16 pb-32">
      {banner.isVisible && (
        <section className="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl group animate-in zoom-in-95 duration-700">
          <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent flex flex-col justify-center px-12 sm:px-20">
            <div className="max-w-2xl space-y-6">
              <h2 className="text-5xl sm:text-7xl font-black text-white leading-tight">
                {banner.title} <br/>
                <span className="text-[#007AFF]">{banner.highlight}</span>
              </h2>
              <button onClick={() => setActiveSection('Themes')} className="px-10 py-5 bg-[#007AFF] text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-500/30">
                {banner.buttonText}
              </button>
            </div>
          </div>
        </section>
      )}
      <section className="space-y-10">
        <h2 className="text-3xl font-black tracking-tighter">New Arrivals</h2>
        <div className="grid grid-cols-1 gap-12">
          {products.slice(0, 3).map(p => <ProductCard key={p.id} product={p} onBuy={handleBuyProduct} />)}
        </div>
      </section>
    </div>
  );

  const renderOrderPage = () => {
    const productsInCategory = products.filter(p => p.category === selectedCategory);
    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
      <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <header className="flex flex-col items-center text-center gap-8">
           <div className="max-w-2xl">
              <h2 className="text-5xl font-black tracking-tighter text-zinc-900 mb-2">Checkout</h2>
              <p className="text-zinc-500 font-medium text-lg">Finalize your selection for instant access.</p>
           </div>
           
           <a 
             href="https://t.me/Mohamed_edge" 
             target="_blank" 
             rel="noopener noreferrer"
             className="flex items-center gap-4 bg-white p-3 pr-8 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-xl hover:border-[#007AFF]/30 transition-all group scale-105"
           >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-[#007AFF] transition-colors">
                <i className="fa-brands fa-telegram text-3xl text-[#007AFF] group-hover:text-white transition-colors"></i>
              </div>
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] leading-none mb-1">Direct Contact</p>
                 <p className="font-bold text-zinc-900 text-xl tracking-tight">@Mohamed_edge</p>
              </div>
           </a>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-4">
          <div className="lg:col-span-7 relative">
             <div className="absolute left-[24px] top-12 bottom-12 w-[2px] bg-zinc-200 hidden sm:block"></div>
             <div className="space-y-8">
                <div className="flex gap-6 group">
                   <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white border-2 border-zinc-100 items-center justify-center font-black text-zinc-900 z-10 group-hover:border-[#007AFF] transition-colors">01</div>
                   <div className="flex-1 glass-panel p-6 sm:p-8 rounded-[2rem] border border-white shadow-xl hover:shadow-2xl transition-all">
                      <h3 className="font-black text-xl text-zinc-900 mb-6 flex items-center gap-3">
                        <i className="fa-solid fa-microchip text-[#007AFF]"></i>
                        Brand Selection
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                         {['Realme', 'Oppo'].map((phone) => (
                           <button 
                             key={phone} 
                             onClick={() => setSelectedPhone(phone as any)} 
                             className={`relative py-6 rounded-2xl font-black text-xl transition-all border-2 flex flex-col items-center gap-2 overflow-hidden ${selectedPhone === phone ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xl shadow-blue-500/20' : 'bg-zinc-50/50 text-zinc-400 border-transparent hover:bg-white hover:border-zinc-200'}`}
                           >
                              <i className={`fa-solid ${phone === 'Realme' ? 'fa-mobile-screen-button' : 'fa-mobile'} text-3xl opacity-30`}></i>
                              {phone}
                              {selectedPhone === phone && (
                                <div className="absolute top-2 right-2 animate-in zoom-in">
                                  <i className="fa-solid fa-circle-check text-white"></i>
                                </div>
                              )}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="flex gap-6 group">
                   <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white border-2 border-zinc-100 items-center justify-center font-black text-zinc-900 z-10 group-hover:border-[#007AFF] transition-colors">02</div>
                   <div className="flex-1 glass-panel p-6 sm:p-8 rounded-[2rem] border border-white shadow-xl hover:shadow-2xl transition-all">
                      <h3 className="font-black text-xl text-zinc-900 mb-6 flex items-center gap-3">
                        <i className="fa-solid fa-layer-group text-[#007AFF]"></i>
                        Asset Category
                      </h3>
                      <div className="p-1.5 bg-zinc-100/80 rounded-2xl flex items-center">
                         {['Themes', 'Widgets', 'Walls'].map(cat => (
                           <button 
                             key={cat} 
                             onClick={() => setSelectedCategory(cat as Section)} 
                             className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${selectedCategory === cat ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                           >
                             {cat}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="flex gap-6 group">
                   <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-white border-2 border-zinc-100 items-center justify-center font-black text-zinc-900 z-10 group-hover:border-[#007AFF] transition-colors">03</div>
                   <div className="flex-1 glass-panel p-6 sm:p-8 rounded-[2rem] border border-white shadow-xl hover:shadow-2xl transition-all">
                      <h3 className="font-black text-xl text-zinc-900 mb-6 flex items-center gap-3">
                        <i className="fa-solid fa-cart-flatbed-suitcase text-[#007AFF]"></i>
                        Specific Item
                      </h3>
                      <div className="relative">
                         <select 
                           value={selectedProductId} 
                           onChange={(e) => setSelectedProductId(e.target.value)} 
                           className="w-full p-6 rounded-2xl bg-zinc-50/50 border-2 border-transparent text-zinc-900 font-black text-lg appearance-none outline-none focus:border-[#007AFF] focus:bg-white transition-all pl-8 shadow-inner"
                         >
                           {productsInCategory.length > 0 ? productsInCategory.map(p => <option key={p.id} value={p.id}>{p.title}</option>) : <option disabled>Stock Empty</option>}
                         </select>
                         <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[#007AFF]">
                           <i className="fa-solid fa-angles-up-down text-lg"></i>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-32">
             <div className="glass-panel p-8 rounded-[2.5rem] border border-white shadow-2xl space-y-8 overflow-hidden relative group">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#007AFF]/10 rounded-full blur-3xl group-hover:bg-[#007AFF]/20 transition-colors"></div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 text-center">Summary Preview</h4>
                  <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-zinc-100 border-4 border-white">
                    {selectedProduct ? (
                      <>
                        <img src={selectedProduct.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                           <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 bg-[#007AFF] text-white text-[9px] font-black rounded-lg uppercase tracking-[0.1em]">{selectedProduct.category}</span>
                              <span className="text-white/70 text-[10px] font-bold">
                                {selectedPhone === 'Realme' ? 'Realme UI 5.0 / 6.0' : selectedProduct.compatibility}
                              </span>
                           </div>
                           <h3 className="text-white font-black text-2xl tracking-tight leading-none">{selectedProduct.title}</h3>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
                         <i className="fa-solid fa-shopping-cart text-5xl opacity-20"></i>
                         <p className="font-bold text-xs">Waiting for selection...</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedProduct && (
                  <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100/50">
                       <div className="text-left">
                          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1">Price Point</p>
                          <p className="text-4xl font-black text-zinc-900 tracking-tighter">
                             {selectedProduct.price === 0 ? 'FREE' : `$${selectedProduct.price.toFixed(2)}`}
                          </p>
                       </div>
                       <div className="text-right">
                          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-3 py-1.5 rounded-full mb-1">
                             <i className="fa-solid fa-shield-check"></i>
                             <span>Verified</span>
                          </div>
                          <p className="text-zinc-400 text-[9px] font-bold">Encrypted Link</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                      <button 
                        onClick={selectedProduct.price === 0 ? () => handleDownload(selectedProduct) : handleOrderViaTelegram} 
                        className="w-full py-6 rounded-2xl bg-[#007AFF] text-white font-black text-xl shadow-2xl shadow-blue-500/30 hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                      >
                        <i className={`${selectedProduct.price === 0 ? 'fa-solid fa-cloud-arrow-down' : 'fa-brands fa-telegram'} text-2xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform`}></i>
                        {selectedProduct.price === 0 ? 'Download Now' : 'Order via Telegram'}
                      </button>
                      <p className="text-center text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] opacity-50">Instant delivery after confirmation • Secure API</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-2xl text-[#007AFF] animate-pulse">EDGE STORE...</div>;

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header onAdminClick={() => {}} /> {/* Admin icon hidden in user header if needed, but routing handles it */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {activeSection === 'Home' && renderHome()}
        {activeSection === 'Order' && renderOrderPage()}
        {activeSection === 'Admin' && renderAdmin()}
        {['Themes', 'Widgets', 'Walls'].includes(activeSection) && (
          <div className="space-y-12 pb-32">
             <h2 className="text-5xl font-black tracking-tighter">{activeSection}</h2>
             <div className="grid grid-cols-1 gap-12">
                {products.filter(p => p.category === activeSection).map(p => <ProductCard key={p.id} product={p} onBuy={handleBuyProduct} />)}
             </div>
          </div>
        )}
      </main>
      {!isAdminMode && <BottomNav activeSection={activeSection} onSectionChange={setActiveSection} />}
    </div>
  );
};

export default App;