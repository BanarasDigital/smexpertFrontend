import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from "expo";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";

/**
 * ✅ ANDROID CHANNEL (safe helper)
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    showBadge: true,
  });
}

/**
 * ✅ MUST be TOP LEVEL (APK requirement)
 */
if (!isExpoGo) {
  try {
    const messaging = require("@react-native-firebase/messaging").default;

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      const data = remoteMessage?.data || {};

      await ensureAndroidChannel();

      const currentBadge = await Notifications.getBadgeCountAsync();
      const nextBadge = currentBadge + 1;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title || "Notification",
          body: data.body || "You have a new notification",
          data,
          badge: nextBadge,
        },
        trigger: null,
      });

      await Notifications.setBadgeCountAsync(nextBadge);
    });

    console.log("✅ Background notification handler registered (APK)");
  } catch (e) {
    console.log("❌ Background handler error:", e);
  }
}

// ⬇️ KEEP APP SAME (NO CHANGE BELOW)
import App from "./App";
import { DataProviderFuncComp } from "./context";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navserviceRef";

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
