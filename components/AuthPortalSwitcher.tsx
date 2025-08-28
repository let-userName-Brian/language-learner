import { createShadowStyle } from "@/utils/shadowStyles";
import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

type PortalOption = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  highlighted?: boolean;
};

interface AuthPortalSwitcherProps {
  title: string;
  currentPortal: 'student' | 'teacher' | 'parent' | 'teacher-signup';
  headerColor: string;
}

export default function AuthPortalSwitcher({ title, currentPortal, headerColor }: AuthPortalSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));
  const headerColorAnimatedValue = useRef(new Animated.Value(0)).current;
  const [colorIndex, setColorIndex] = useState(0);

  const colors = ['#4CAF50', '#8e44ad', '#FF6B35']; // student, teacher, parent

  // Update color index when headerColor changes
  useEffect(() => {
    const newIndex = colors.indexOf(headerColor);
    if (newIndex !== -1 && newIndex !== colorIndex) {
      Animated.timing(headerColorAnimatedValue, {
        toValue: newIndex,
        duration: 300,
        useNativeDriver: false,
      }).start();
      setColorIndex(newIndex);
    }
  }, [headerColor]);

  const getPortalOptions = (): PortalOption[] => {
    const baseOptions: PortalOption[] = [
      {
        key: 'student',
        title: 'Student',
        subtitle: 'Continue learning',
        icon: 'book',
        color: '#4CAF50',
        route: '/signin',
      },
      {
        key: 'teacher',
        title: 'Teacher',
        subtitle: 'Manage classroom',
        icon: 'school',
        color: '#8e44ad',
        route: '/teacher-signin',
      },
      {
        key: 'parent',
        title: 'Parent',
        subtitle: 'Track progress',
        icon: 'people',
        color: '#FF6B35',
        route: '/parent-signin',
      },
    ];

    // Add teacher signup option for student and teacher pages
    if (currentPortal === 'student' || currentPortal === 'teacher') {
      baseOptions.push({
        key: 'teacher-signup',
        title: 'New Teacher',
        subtitle: 'Create account',
        icon: 'add',
        color: '#3b82f6',
        route: '/teacher-signup',
        highlighted: true,
      });
    }

    // Filter out current portal from options
    return baseOptions.filter(option => option.key !== currentPortal);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    Animated.spring(animatedValue, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleOptionPress = (route: string) => {
    // Collapse first, then navigate
    Animated.spring(animatedValue, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start(() => {
      setIsExpanded(false);
      router.replace(route as Href);
    });
  };

  const options = getPortalOptions();

  const expandedHeight = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, options.length * 64 + 80], // Height for options + padding
  });

  const panelOpacity = animatedValue.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0, 1], // Stay invisible until 10% expanded
  });

  const shadowOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  const fabRotation = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const fabBackgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [headerColor, 'rgba(239, 68, 68, 1)'],
  });

  return (
    <View style={{
      position: 'absolute',
      bottom: 40,
      right: 24,
      alignItems: 'flex-end',
    }}>
      {/* Expanded Options Panel */}
      <Animated.View style={[{
        height: expandedHeight,
        width: 280,
        backgroundColor: "white",
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
        opacity: panelOpacity,
        borderWidth: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
        borderColor: "rgba(0,0,0,0.05)",
      },
      isExpanded ? createShadowStyle(12) : {}
      ]}>
        <View style={{ padding: 20 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#1e293b",
            textAlign: "center",
            marginBottom: 16,
          }}>
            {title}
          </Text>
          
          {options.map((option, index) => (
            <Animated.View
              key={option.key}
              style={{
                opacity: animatedValue,
                transform: [{
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              }}
            >
              <Pressable
                onPress={() => handleOptionPress(option.route)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: option.highlighted ? "#f0f9ff" : "transparent",
                  marginBottom: index < options.length - 1 ? 8 : 0,
                  borderWidth: option.highlighted ? 1 : 0,
                  borderColor: option.highlighted ? "#bae6fd" : "transparent",
                }}
              >
                <View style={[{
                  width: 36,
                  height: 36,
                  backgroundColor: option.color,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                },
                createShadowStyle(3, option.color)
                ]}>
                  <Ionicons name={option.icon} size={18} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: "700", 
                    color: "#1e293b", 
                    marginBottom: 1,
                  }}>
                    {option.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    {option.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Floating Action Button */}
      <Pressable
        onPress={toggleExpanded}
        style={[{
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
        },
        createShadowStyle(12)
        ]}
      >
        <Animated.View style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: fabBackgroundColor,
          justifyContent: "center",
          alignItems: "center",
          transform: [{ rotate: fabRotation }],
        }}>
          <Ionicons 
            name={isExpanded ? "close" : "apps"} 
            size={24} 
            color="white" 
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}
