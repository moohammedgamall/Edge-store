
import React from 'react';

export type Section = 'Home' | 'Themes' | 'Widgets' | 'Walls' | 'Order' | 'Admin' | 'Preview';

export interface YoutubeVideo {
  id: string;
  title: string;
  url: string;
}

export interface BannerSettings {
  title: string;
  highlight: string;
  description: string;
  imageUrl: string;
  buttonText: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: Section | 'Apps'; 
  price: number;
  image: string;      // This is the Cover Image
  gallery: string[];  // Array of preview images (up to 20)
  rating: number;
  downloads: string;
  is_premium: boolean;
  compatibility: string;
}

export interface NavItem {
  id: Section;
  icon: string; 
  label: string;
}
