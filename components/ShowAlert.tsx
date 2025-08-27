import { useRef, useState } from "react";
import { Alert, Animated, Platform, Text } from "react-native";

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
  }>;
}

export interface BannerOptions {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onShow?: () => void;
}

// Global banner state
let globalBannerState: {
  show: (options: BannerOptions) => void;
  hide: () => void;
} | null = null;

export const ShowAlert = ({ title, message, buttons }: AlertOptions) => {
  if (Platform.OS === "web") {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(
        message ? `${title}\n\n${message}` : title
      );
      if (confirmed) {
        const confirmButton = buttons.find((b) => b.style !== "cancel");
        confirmButton?.onPress?.();
      } else {
        const cancelButton = buttons.find((b) => b.style === "cancel");
        cancelButton?.onPress?.();
      }
    } else {
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons?.[0]?.onPress?.();
    }
  } else {
    // Use React Native Alert for mobile
    Alert.alert(title, message, buttons);
  }
};

// New banner functions
export const showBanner = (options: BannerOptions) => {
  // Execute callback immediately
  options.onShow?.();
  
  // Show banner
  if (globalBannerState) {
    globalBannerState.show(options);
  }
};

export const showSuccessBanner = (message: string, onShow?: () => void) => {
  showBanner({
    message,
    type: "success",
    onShow,
  });
};

export const showErrorBanner = (message: string, onShow?: () => void) => {
  showBanner({
    message,
    type: "error",
    onShow,
  });
};

// Banner component that should be placed at the root of your app
export const GlobalBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerType, setBannerType] = useState<"success" | "error" | "info">("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  // Register global banner controls
  globalBannerState = {
    show: ({ message, type = "info", duration = 3000 }) => {
      setBannerMessage(message);
      setBannerType(type);
      setIsVisible(true);

      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      // Auto hide after duration
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start(() => {
          setIsVisible(false);
        });
      }, duration);
    },
    hide: () => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setIsVisible(false);
      });
    },
  };

  if (!isVisible) return null;

  const getBackgroundColor = () => {
    switch (bannerType) {
      case "success": return "#d4edda";
      case "error": return "#f8d7da";
      default: return "#d1ecf1";
    }
  };

  const getTextColor = () => {
    switch (bannerType) {
      case "success": return "#155724";
      case "error": return "#721c24";
      default: return "#0c5460";
    }
  };

  const getBorderColor = () => {
    switch (bannerType) {
      case "success": return "#c3e6cb";
      case "error": return "#f5c6cb";
      default: return "#bee5eb";
    }
  };

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 50,
        left: 16,
        right: 16,
        backgroundColor: getBackgroundColor(),
        borderWidth: 1,
        borderColor: getBorderColor(),
        borderRadius: 8,
        padding: 16,
        opacity,
        transform: [{ translateY }],
        zIndex: 9999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Text style={{
        color: getTextColor(),
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
      }}>
        {bannerMessage}
      </Text>
    </Animated.View>
  );
};

// Keep existing alert functions for backward compatibility
export const showSuccessAlert = (message: string, onOk?: () => void) => {
  ShowAlert({
    title: "Success",
    message,
    buttons: [{ text: "OK", onPress: onOk }],
  });
};

export const showErrorAlert = (message: string, onOk?: () => void) => {
  ShowAlert({
    title: "Error",
    message,
    buttons: [{ text: "OK", onPress: onOk }],
  });
};

export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  ShowAlert({
    title,
    message,
    buttons: [
      { text: "Cancel", style: "cancel", onPress: onCancel },
      { text: "OK", onPress: onConfirm },
    ],
  });
};
