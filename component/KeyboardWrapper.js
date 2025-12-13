import React from "react";
import { Platform, KeyboardAvoidingView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function KeyboardWrapper({ children, extraScrollHeight = 80 }) {
  if (Platform.OS === "android") {
    return (
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={extraScrollHeight}
        keyboardOpeningTime={0}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1 }}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
