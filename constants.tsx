
import { NavItem, Product, BannerSettings, YoutubeVideo } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'Home', label: 'Home', icon: 'fa-solid fa-house' },
  { id: 'Themes', label: 'Themes', icon: 'fa-solid fa-layer-group' },
  { id: 'Widgets', label: 'Widgets', icon: 'fa-solid fa-table-cells-large' },
  { id: 'Walls', label: 'Walls', icon: 'fa-solid fa-image' },
];

export const MOCK_VIDEOS: YoutubeVideo[] = [];
export const MOCK_PRODUCTS: Product[] = [];

export const DEFAULT_BANNER: BannerSettings = {
  title: "Official Store",
  highlight: "Mohamed Edge",
  description: "Exclusively designed assets for ColorOS and Realme UI.",
  imageUrl: "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa",
  buttonText: "Explore"
};
