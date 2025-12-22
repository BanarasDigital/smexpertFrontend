import React, { useEffect, useContext, useState, useRef, useCallback } from "react";
import { View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { DataContext } from "./context";
import { API_BASE_URL } from "./config";
import { navigationRef } from "./navserviceRef";

// Screens (UNCHANGED)
import MainTabs from "./pages/MainTabs/MainTabs";
import Login from "./pages/authPages/Login/Login";
import ChatScreen from "./pages/Chats/ChatPage";
import ImageEditScreen from "./pages/ImageEditScreen/ImageEditScreen";
import RegisterScreen from "./pages/RegisterUserPage/RegisterUserPage";
import GroupConversation from "./pages/Group/getGroup/Groups";
import LoadingSpinner from "./component/LoadingSpinner/LoadingSpinner";
import ManageGroupMembers from "./component/ManageGroupMembers";
import ForgotPassword from "./component/ForgotPassword";
import ResetPassword from "./component/ResetPassword";
import GroupChat from "./component/GroupChat";
import HomePage from "./pages/HomePage/HomePage";
import GroupInfo from "./component/GroupInfo";
import SelectChat from "./component/SelectChat";
import LeadPage from "./pages/LeadPage";
import LeadUserPage from "./pages/LeadUserPage";

const Stack = createNativeStackNavigator();

/** ✅ Foreground display config (KEEP ONLY THIS ONE) */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function createAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    showBadge: true,
  });
}

export default function App() {
  const { checkSession, token, loading, user } = useContext(DataContext);
  const [ready, setReady] = useState(false);
  const pushTokenRef = useRef(null);
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    "09fc2a00-0337-4b5e-8caf-2f9a93804582";

  const handleNotificationNavigation = useCallback((data) => {
    if (!data) return;

    switch (data.type) {
      case "private_chat":
        navigationRef.current?.navigate("Chat", { id: data.senderId });
        break;

      case "group_chat":
        navigationRef.current?.navigate("GroupChat", { groupId: data.groupId });
        break;

      case "lead_created":
      case "lead_note_added":
        navigationRef.current?.navigate("LeadUserPage", { userId: data.leadUserId });
        break;

      default:
        console.log("Unknown notification type:", data);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    Notifications.setBadgeCountAsync(0);
  }, []);

  useEffect(() => {
    let unsubMessage;
    let unsubToken;

    (async () => {
      try {
        if (Platform.OS === "android" && Platform.Version >= 33) {
          const perm = await Notifications.getPermissionsAsync();
          if (perm.status !== "granted") {
            await Notifications.requestPermissionsAsync();
          }
        }

        await createAndroidChannel();

        const isExpoGo = Constants.appOwnership === "expo";
        if (isExpoGo) {
          setReady(true);
          return;
        }

        const messaging = require("@react-native-firebase/messaging").default;

        await messaging().registerDeviceForRemoteMessages();
        await messaging().requestPermission();

        const fcmToken = await messaging().getToken();
        pushTokenRef.current = fcmToken;

        if (fcmToken) {
          await fetch(`${API_BASE_URL}/save-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: fcmToken,
              projectId,
              platform: Platform.OS,
              meta: { userId: user?._id || null },
            }),
          });
        }

        unsubToken = messaging().onTokenRefresh(async (t) => {
          pushTokenRef.current = t;
          try {
            await fetch(`${API_BASE_URL}/save-token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: t,
                projectId,
                platform: Platform.OS,
                meta: { userId: user?._id || null },
              }),
            });
          } catch {}
        });

        unsubMessage = messaging().onMessage(async (remoteMessage) => {
          const data = remoteMessage.data || {};
          const myId = String(user?._id || "");

          if (
            (data.type === "private_chat" || data.type === "group_chat") &&
            String(data.senderId) === myId
          ) return;

          if (data.type === "lead_note_added" && data.adminOnly === "true" && user?.role !== "admin")
            return;

          const title =
            data.type === "private_chat"
              ? `💬 ${data.senderName || "New Message"}`
              : data.type === "group_chat"
              ? `👥 ${data.groupName || "Group"}`
              : data.type === "lead_created"
              ? "📌 New Lead Assigned"
              : data.type === "lead_note_added"
              ? "📝 Lead Note Added"
              : data.title || "Notification";

          const body =
            data.type === "private_chat"
              ? data.message || ""
              : data.type === "group_chat"
              ? `${data.senderName || ""}: ${data.message || ""}`
              : data.body || data.message || "You have a new notification";

          const currentBadge = await Notifications.getBadgeCountAsync();
          const nextBadge = currentBadge + 1;

          await Notifications.scheduleNotificationAsync({
            content: { title, body, data, badge: nextBadge },
            trigger: null,
          });

          await Notifications.setBadgeCountAsync(nextBadge);
        });

        setReady(true);
      } catch (e) {
        console.log("FCM init error:", e);
        setReady(true);
      }
    })();

    return () => {
      unsubMessage && unsubMessage();
      unsubToken && unsubToken();
    };
  }, [user?._id, user?.role]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data;
      handleNotificationNavigation(data);
    });
    return () => sub.remove();
  }, [handleNotificationNavigation]);

  if (loading || !ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Chats" component={HomePage} />
            <Stack.Screen name="Leads" component={LeadPage} />
            <Stack.Screen name="LeadUserPage" component={LeadUserPage} />
            <Stack.Screen name="ImageEditScreen" component={ImageEditScreen} />
            <Stack.Screen name="AddUser" component={RegisterScreen} />
            <Stack.Screen name="GroupInfo" component={GroupInfo} />
            <Stack.Screen name="GroupConversation" component={GroupConversation} />
            <Stack.Screen name="ManageGroupMembers" component={ManageGroupMembers} />
            <Stack.Screen name="GroupChat" component={GroupChat} />
            <Stack.Screen name="SelectChat" component={SelectChat} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="ResetPassword" component={ResetPassword} />
          </>
        )}
      </Stack.Navigator>
      <Toast />
    </SafeAreaView>
  );
}
