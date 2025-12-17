import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { API_BASE_URL } from "./config";

// Register for push notifications
export async function registerForPushNotifications(projectId = "dc6a1e35-8228-4feb-8c66-fa22f541b9e4") {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;

    console.log("Notification Token:", token);

    // Save token to the server
    await fetch(`${API_BASE_URL}/saveToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        token,
        platform: Platform.OS,
      }),
    });

    return token;
  } catch (e) {
    console.log("Notification register error:", e);
  }
}


// Handle notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // added badge support
  }),
});
