import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from "expo";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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
      const data = remoteMessage?.data || {};
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          showBadge: true,
        });
      }
      const currentBadge = await Notifications.getBadgeCountAsync();
      const nextBadge = currentBadge + 1;

      let title = "Notification";
      let body = "You have a new notification";

      if (data.type === "private_chat") {
        title = `💬 ${data.senderName || "New Message"}`;
        body = data.message || "New message received";
      } else if (data.type === "group_chat") {
        title = `👥 ${data.groupName || "Group Message"}`;
        body = `${data.senderName || ""}: ${data.message || ""}`;
      } else if (data.type === "lead_created") {
        title = "📌 New Lead Assigned";
        body = data.body || "A new lead has been assigned to you";
      } else if (data.type === "lead_note_added") {
        title = "📝 Lead Note Added";
        body = data.body || "A new note was added to the lead";
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          badge: nextBadge,
        },
        trigger: null,
      });

      await Notifications.setBadgeCountAsync(nextBadge);
    });

    console.log("✅ Firebase background handler registered (APK)");
  } catch (err) {
    console.log("⚠ Background handler error:", err.message);
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
