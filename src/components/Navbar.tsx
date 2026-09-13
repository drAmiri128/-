import { ViewMode } from '../types';

interface NavbarProps {
  currentView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  isAdminUnlocked?: boolean;
  onLockAdmin?: () => void;
  systemTitle?: string;
  activeItemsCount?: number;
}

export function Navbar(_props: NavbarProps) {
  // Lock access button moved into the Controller dashboard as requested.
  // Navbar returns null to keep the top floating header clean.
  return null;
}

