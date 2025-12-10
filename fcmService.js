import messaging from "@react-native-firebase/messaging";
import PushNotification from "react-native-push-notification";
import { Platform } from "react-native";

// ✅ Create Android notification channel
PushNotification.createChannel(
  {
    channelId: "whatsapp-like",
    channelName: "Chat Notifications",
    channelDescription: "Message alerts",
    soundName: "default",
    importance: 4,
    vibrate: true,
  },
  () => {}
);

// ✅ Request permission (Android 13+ and iOS)
export const requestPermission = async () => {
  const auth = await messaging().requestPermission();
  return (
    auth === messaging.AuthorizationStatus.AUTHORIZED ||
    auth === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// ✅ Local notification trigger
const triggerNotification = (title, body) => {
  PushNotification.localNotification({
    channelId: "whatsapp-like",
    title,
    message: body,
    playSound: true,
    soundName: "default",
    importance: "high",
    priority: "high",
    vibrate: true,
    smallIcon: "ic_notification",
  });
};

// ✅ Badge count (unread only)
export const updateBadgeCount = (count) => {
  PushNotification.setApplicationIconBadgeNumber(count);
};

// ✅ FCM Handlers
export const initFCM = async (unreadCallback) => {
  const granted = await requestPermission();
  if (!granted) return;

  const token = await messaging().getToken();
  console.log("FCM Token:", token);

  // FOREGROUND
  messaging().onMessage(async (msg) => {
    triggerNotification(msg.notification.title, msg.notification.body);
    unreadCallback(); 
  });

  // BACKGROUND & KILLED
  messaging().setBackgroundMessageHandler(async (msg) => {
    triggerNotification(msg.notification.title, msg.notification.body);
    unreadCallback();
  });

  return token;
};
