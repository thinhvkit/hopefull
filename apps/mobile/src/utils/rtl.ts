import { I18nManager, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useLocaleStore } from '@/store/locale';

// Check if app is in RTL mode
export const isRTL = (): boolean => {
  return I18nManager.isRTL;
};

// Get the correct flex direction based on RTL
export const getFlexDirection = (
  direction: 'row' | 'row-reverse' | 'column' | 'column-reverse' = 'row'
): ViewStyle['flexDirection'] => {
  if (!I18nManager.isRTL) return direction;

  switch (direction) {
    case 'row':
      return 'row-reverse';
    case 'row-reverse':
      return 'row';
    default:
      return direction;
  }
};

// Get the correct text alignment based on RTL
export const getTextAlign = (
  align: 'left' | 'right' | 'center' | 'auto' = 'left'
): TextStyle['textAlign'] => {
  if (!I18nManager.isRTL) return align;

  switch (align) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    default:
      return align;
  }
};

// Flip horizontal margins and paddings for RTL
export const flipHorizontal = <T extends ViewStyle | TextStyle>(style: T): T => {
  if (!I18nManager.isRTL) return style;

  const flipped = { ...style } as any;

  // Flip margins
  if ('marginLeft' in style || 'marginRight' in style) {
    const { marginLeft, marginRight, ...rest } = flipped;
    flipped.marginLeft = marginRight;
    flipped.marginRight = marginLeft;
  }

  // Flip paddings
  if ('paddingLeft' in style || 'paddingRight' in style) {
    const { paddingLeft, paddingRight } = flipped;
    flipped.paddingLeft = paddingRight;
    flipped.paddingRight = paddingLeft;
  }

  // Flip positioning
  if ('left' in style || 'right' in style) {
    const { left, right } = flipped;
    flipped.left = right;
    flipped.right = left;
  }

  // Flip border radius
  if ('borderTopLeftRadius' in style || 'borderTopRightRadius' in style) {
    const { borderTopLeftRadius, borderTopRightRadius } = flipped;
    flipped.borderTopLeftRadius = borderTopRightRadius;
    flipped.borderTopRightRadius = borderTopLeftRadius;
  }

  if ('borderBottomLeftRadius' in style || 'borderBottomRightRadius' in style) {
    const { borderBottomLeftRadius, borderBottomRightRadius } = flipped;
    flipped.borderBottomLeftRadius = borderBottomRightRadius;
    flipped.borderBottomRightRadius = borderBottomLeftRadius;
  }

  return flipped as T;
};

// RTL-aware style creator
export const createRTLStyles = <T extends StyleSheet.NamedStyles<T>>(
  styles: T | StyleSheet.NamedStyles<T>
): T => {
  if (!I18nManager.isRTL) return StyleSheet.create(styles) as T;

  const flippedStyles: any = {};

  for (const key in styles) {
    flippedStyles[key] = flipHorizontal(styles[key] as any);
  }

  return StyleSheet.create(flippedStyles) as T;
};

// Hook for RTL-aware styling
export const useRTLStyles = () => {
  const { isRTL: isRTLLocale } = useLocaleStore();

  return {
    isRTL: isRTLLocale,
    flexRow: isRTLLocale ? 'row-reverse' : 'row',
    flexRowReverse: isRTLLocale ? 'row' : 'row-reverse',
    textAlign: isRTLLocale ? 'right' : 'left',
    textAlignOpposite: isRTLLocale ? 'left' : 'right',
    alignSelf: isRTLLocale ? 'flex-end' : 'flex-start',
    alignSelfOpposite: isRTLLocale ? 'flex-start' : 'flex-end',
  } as const;
};

// Get icon name for directional icons (arrows, etc.)
export const getDirectionalIcon = (
  ltrIcon: string,
  rtlIcon: string
): string => {
  return I18nManager.isRTL ? rtlIcon : ltrIcon;
};

// Common directional icon pairs
export const DirectionalIcons = {
  back: () => getDirectionalIcon('arrow-back', 'arrow-forward'),
  forward: () => getDirectionalIcon('arrow-forward', 'arrow-back'),
  chevronLeft: () => getDirectionalIcon('chevron-back', 'chevron-forward'),
  chevronRight: () => getDirectionalIcon('chevron-forward', 'chevron-back'),
};
