import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function createNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
      showBadge: true,
    });
  }
}
