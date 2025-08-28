import { Text, View } from "react-native";

export const CircularProgress = ({ 
    percentage, 
    size = 90, 
    strokeWidth = 8,
    color = "#f59e0b",
    backgroundColor = "#f3f4f6"
  }: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
  }) => {
    const displayPercentage = Math.round(percentage);
    
    return (
      <View style={{ width: size, height: size, position: 'relative' }}>
        {/* Background circle */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: backgroundColor,
        }} />
        
        {/* Progress circle - rotated to start at 12 o'clock */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate: `${-90 + (percentage / 100) * 360}deg` }],
        }} />
        
        {/* Additional segments for smoother appearance */}
        {percentage > 25 && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderRightColor: color,
            transform: [{ rotate: '-90deg' }],
          }} />
        )}
        
        {percentage > 50 && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderBottomColor: color,
            transform: [{ rotate: '-90deg' }],
          }} />
        )}
        
        {percentage > 75 && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderLeftColor: color,
            transform: [{ rotate: '-90deg' }],
          }} />
        )}
        
        {/* Center text */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: Math.max(size * 0.15, 12),
            fontWeight: '700',
            color: color,
          }}>
            {displayPercentage}%
          </Text>
        </View>
      </View>
    );
  };