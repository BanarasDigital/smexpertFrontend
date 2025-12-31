// index.js
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import App from "./App";
import { DataProviderFuncComp } from "./context";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navserviceRef";
import Constants from "expo-constants";

/**
 * ✅ ALWAYS allow notifications in foreground (CRITICAL)
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * ✅ Create Android channel ONCE
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    showBadge: true,
    vibrationPattern: [0, 250, 250, 250],
  });
}

const isExpoGo = Constants.appOwnership === "expo";

if (!isExpoGo) {
  try {
    const messaging = require("@react-native-firebase/messaging").default;

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      // ✅ If OS already shows it, do nothing
      if (remoteMessage?.notification) return;

      const data = remoteMessage?.data || {};

      await ensureAndroidChannel();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title || "Notification",
          body: data.body || data.message || "",
          data,
          sound: "default",
        },
        trigger: null,
      });
    });

    console.log("✅ Firebase background handler registered");
  } catch (err) {
    console.log("⚠️ Firebase messaging not available:", err?.message || err);
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
