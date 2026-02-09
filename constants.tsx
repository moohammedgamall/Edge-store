
import { NavItem, Product, BannerSettings } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'Home', label: 'Home', icon: 'fa-solid fa-house' },
  { id: 'Themes', label: 'Themes', icon: 'fa-solid fa-layer-group' },
  { id: 'Widgets', label: 'Widgets', icon: 'fa-solid fa-grid-2' },
  { id: 'Walls', label: 'Walls', icon: 'fa-solid fa-image' },
];

NAV_ITEMS[2].icon = 'fa-solid fa-table-cells-large';

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
    title: 'Minimal ColorOS 15',
    description: 'A clean and sophisticated theme inspired by nature with rounded icons.',
    category: 'Themes',
    price: 4.99,
    image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400',
    rating: 4.8,
    downloads: '2.5k',
    is_premium: true,
    compatibility: 'ColorOS 14/15'
  },
  {
    id: '2',
    title: 'Realme Hyper Grid',
    description: 'Dynamic widgets displaying time and weather in a modern style.',
    category: 'Widgets',
    price: 0,
    image: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=400',
    rating: 4.5,
    downloads: '10k',
    is_premium: false,
    compatibility: 'Realme UI 5.0'
  }
];
