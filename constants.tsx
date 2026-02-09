
import { NavItem, Product, BannerSettings } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'Home', label: 'Home', icon: 'fa-solid fa-house' },
  { id: 'Themes', label: 'Themes', icon: 'fa-solid fa-layer-group' },
  { id: 'Widgets', label: 'Widgets', icon: 'fa-solid fa-table-cells-large' },
  { id: 'Walls', label: 'Walls', icon: 'fa-solid fa-image' },
];

export const DEFAULT_BANNER: BannerSettings = {
  title: "Liquid Glass for",
  highlight: "ColorOS 15",
  description: "Elevate your device experience with high-fidelity assets designed for performance and aesthetics.",
  imageUrl: "https://images.unsplash.com/photo-1616440802336-31f0bc333754?auto=format&fit=crop&q=80&w=1200",
  buttonText: "Explore Shop"
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'Minimal OS 15',
    description: 'A clean and sophisticated theme inspired by nature with rounded icons and smooth animations.',
    category: 'Themes',
    price: 45,
    image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400',
    rating: 4.8,
    downloads: '2.5k',
    is_premium: true,
    compatibility: 'ColorOS 14/15'
  },
  {
    id: '2',
    title: 'Hyper Grid Widgets',
    description: 'Dynamic widgets displaying time, weather, and battery in a modern glassmorphism style.',
    category: 'Widgets',
    price: 0,
    image: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=400',
    rating: 4.5,
    downloads: '10k',
    is_premium: false,
    compatibility: 'Realme UI 5.0'
  },
  {
    id: '3',
    title: 'Deep Space Wall',
    description: 'Ultra high definition 8K wallpaper for OLED screens with deep blacks and vibrant colors.',
    category: 'Walls',
    price: 15,
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=400',
    rating: 5.0,
    downloads: '1.2k',
    is_premium: true,
    compatibility: 'All Devices'
  },
  {
    id: '4',
    title: 'Abstract Fluid',
    description: 'Modern fluid art theme with custom icon pack and dynamic lockscreen.',
    category: 'Themes',
    price: 35,
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400',
    rating: 4.7,
    downloads: '800',
    is_premium: true,
    compatibility: 'ColorOS 15'
  },
  {
    id: '5',
    title: 'Retro Clock',
    description: 'A nostalgic flip-clock widget for your home screen.',
    category: 'Widgets',
    price: 0,
    image: 'https://images.unsplash.com/photo-1508921334172-b68ed3004f2d?auto=format&fit=crop&q=80&w=400',
    rating: 4.2,
    downloads: '5k',
    is_premium: false,
    compatibility: 'Realme UI'
  },
  {
    id: '6',
    title: 'Cyberpunk Neon',
    description: 'High-contrast neon theme for the ultimate futuristic look.',
    category: 'Themes',
    price: 50,
    image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=400',
    rating: 4.9,
    downloads: '1.5k',
    is_premium: true,
    compatibility: 'ColorOS 15'
  }
];
