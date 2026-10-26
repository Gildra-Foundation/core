import type { ReactNode } from 'react';
import type { NavItem, NavLink } from '../layout/Header';
import type { SearchEntry } from '../layout/SearchPalette';
export interface SiteDefinition {
  title: string;
  description: string;
  nav: NavItem[];
  header: { searchLabel: string; badge?: string; mobileBadge?: string };
  searchSections: SearchEntry[];
  search: { placeholder: string; emptyHint: string; loadingText: string };
  footerLinks: NavLink[];
  sources: ReactNode;
  about: (count: number, version: string, date: string) => string;
  legal: ReactNode[];
}
