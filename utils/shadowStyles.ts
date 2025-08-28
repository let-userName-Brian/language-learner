import { Platform } from 'react-native';

export const createShadowStyle = (
  elevation: number,
  shadowColor: string = '#000',
  shadowOpacity: number = 0.25,
  shadowRadius: number = elevation / 2,
  shadowOffsetHeight: number = elevation / 2
) => {
  return Platform.select({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: shadowOffsetHeight },
      shadowOpacity,
      shadowRadius,
    },
    android: {
      elevation,
    },
    web: {
      boxShadow: `0px ${shadowOffsetHeight}px ${shadowRadius}px rgba(0,0,0,${shadowOpacity})`,
    },
  });
};

// Predefined common shadows
export const shadowStyles = {
  small: createShadowStyle(2),
  medium: createShadowStyle(4), 
  large: createShadowStyle(8),
  xlarge: createShadowStyle(12),
};
