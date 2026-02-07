
import React from 'react';

export type Section = 'Home' | 'Themes' | 'Widgets' | 'Walls' | 'Order' | 'Admin';

export interface BannerSettings {
  title: string;
  highlight: string;
  imageUrl: string;
  buttonText: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: Section | 'Apps'; 
  price: number;
  image: string;
  rating: number;
  downloads: string;
  isPremium: boolean;
  compatibility: string;
  downloadUrl?: string; 
}

export interface NavItem {
  id: Section;
  icon: string; 
  label: string;
}
