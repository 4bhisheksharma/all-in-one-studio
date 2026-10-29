import React from 'react';
import {
  ShoppingBag,
  Smartphone,
  Zap,
  User,
  Shield,
  Sparkles,
  Layers,
  Crop,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react';

interface RecipeIconProps {
  name?: string;
  className?: string;
}

export const RecipeIcon: React.FC<RecipeIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'shopping-bag':
    case '🛍️':
      return <ShoppingBag className={className} />;
    case 'smartphone':
    case '📱':
      return <Smartphone className={className} />;
    case 'zap':
    case '⚡':
      return <Zap className={className} />;
    case 'user':
    case '👤':
      return <User className={className} />;
    case 'shield':
    case '🛡️':
      return <Shield className={className} />;
    case 'sparkles':
    case '✨':
      return <Sparkles className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'crop':
      return <Crop className={className} />;
    case 'image':
      return <ImageIcon className={className} />;
    default:
      return <Sliders className={className} />;
  }
};
