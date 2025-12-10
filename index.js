import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from "expo";
import App from "./App";
import { DataProviderFuncComp } from "./context";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navserviceRef";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";

if (!isExpoGo) {
  try {
    const messaging = require("@react-native-firebase/messaging").default;
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("📭 [FCM] Background message received:", remoteMessage);
    });
    console.log("✅ Firebase background handler registered (APK)");
  } catch (err) {
    console.log("⚠ Firebase background handler not registered:", err.message);
  }
}

function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DataProviderFuncComp>
        <NavigationContainer ref={navigationRef}>
          <App />
        </NavigationContainer>
      </DataProviderFuncComp>
    </GestureHandlerRootView>
  );
}

registerRootComponent(Root);
