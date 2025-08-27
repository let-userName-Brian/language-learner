import { Alert, Platform } from "react-native";

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
  }>;
}

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
