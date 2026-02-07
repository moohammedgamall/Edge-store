
import React from 'react';

export type Section = 'Home' | 'Themes' | 'Widgets' | 'Walls' | 'Order' | 'Admin' | 'Preview';

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
  image: string;
  gallery?: string[]; // Added to support multiple images
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
