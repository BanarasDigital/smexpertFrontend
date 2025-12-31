import React, { useEffect, useContext, useState, useRef, useCallback } from "react";
import { View, Platform, AppState } from "react-native";
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
import PaymentTabsWithHeader from "./pages/PaymentTabs/PaymentTabs";

const Stack = createNativeStackNavigator();

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

  const pendingNotificationRef = useRef(null);
  const seenMsgIdsRef = useRef(new Map());
  const badgeRef = useRef(0);

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    "a976cee9-0521-4bca-a1b3-10e718d2f52f";

  // ✅ MUST be inside App component (you had it outside)
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  // ✅ Dedup for 10 sec window
  const shouldProcessMessage = useCallback((remoteMessage) => {
    const id =
      remoteMessage?.messageId ||
      remoteMessage?.data?.messageId ||
      `${remoteMessage?.data?.type || "na"}:${remoteMessage?.sentTime || Date.now()}`;

    const now = Date.now();
    const last = seenMsgIdsRef.current.get(id);
    if (last && now - last < 10_000) return false;

    seenMsgIdsRef.current.set(id, now);

    // cleanup
    for (const [k, t] of seenMsgIdsRef.current.entries()) {
      if (now - t > 60_000) seenMsgIdsRef.current.delete(k);
    }

    return true;
  }, []);

  // ✅ Navigation on tap (now includes Payments)
  const handleNotificationNavigation = useCallback(
    (data) => {
      if (!data) return;

      switch (data.type) {
        case "private_chat":
          navigationRef.current?.navigate("Chat", { id: data.senderId });
          break;

        case "group_chat":
          navigationRef.current?.navigate("GroupChat", { groupId: data.groupId });
          break;

        case "lead_created":
          if (user?.user_type === "admin") navigationRef.current?.navigate("Leads");
          else navigationRef.current?.navigate("LeadUserPage", { userId: data.leadUserId });
          break;

        case "lead_note_added":
          navigationRef.current?.navigate("Leads");
          break;

        case "payment_created":
        case "payment_updated": {
          const isAdmin = user?.user_type === "admin";

          navigationRef.current?.navigate("Payments", {
            screen: isAdmin ? "Report" : "Update",
          });
          break;
        }

        default:
          console.log("Unknown notification type:", data);
      }
    },
    [user?.user_type]
  );

  // ✅ Boot
  useEffect(() => {
    checkSession();
  }, []);

  // ✅ Badge: load initial + reset on app active
  useEffect(() => {
    let sub;

    (async () => {
      try {
        const current = await Notifications.getBadgeCountAsync();
        badgeRef.current = Number(current || 0);
      } catch {
        badgeRef.current = 0;
      }
    })();

    sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        badgeRef.current = 0;
        try {
          await Notifications.setBadgeCountAsync(0);
        } catch { }
      }
    });

    return () => sub?.remove?.();
  }, []);

  // ✅ FCM setup
  useEffect(() => {
    let unsubMessage;
    let unsubToken;

    (async () => {
      try {
        // Android 13+ permission
        if (Platform.OS === "android" && Platform.Version >= 33) {
          const perm = await Notifications.getPermissionsAsync();
          if (perm.status !== "granted") await Notifications.requestPermissionsAsync();
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

        // ✅ Save token with userId always
        // ✅ Save token with userId + userType
        if (fcmToken) {
          await fetch(`${API_BASE_URL}/save-token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // ✅ REQUIRED
            },
            body: JSON.stringify({
              token: fcmToken,
              projectId,
              platform: Platform.OS,
              meta: {
                userId: user?._id || null,          // ✅ FIX
                userType: user?.user_type || null, // ✅ FIX (admin | user)
              },
            }),
          });
        }


        unsubToken = messaging().onTokenRefresh(async (t) => {
          try {
            await fetch(`${API_BASE_URL}/save-token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                token: t,
                projectId,
                platform: Platform.OS,
                meta: {
                  userId: user?._id || null,          // ✅ FIX
                  userType: user?.user_type || null, // ✅ FIX
                },
              }),
            });
          } catch (e) {
            console.log("Token refresh save failed", e);
          }
        });


        // ✅ Foreground notifications (Data-only, title/body always)
        unsubMessage = messaging().onMessage(async (remoteMessage) => {
          if (!shouldProcessMessage(remoteMessage)) return;

          const data = remoteMessage.data || {};
          const myId = String(user?._id || "");

          // Prevent self notification for chats
          if (
            (data.type === "private_chat" || data.type === "group_chat") &&
            String(data.senderId) === myId
          ) return;

          // Admin-only note
          if (data.type === "lead_note_added" && data.adminOnly === "true" && user?.user_type !== "admin")
            return;

          const title = data.title || "Notification";
          const body = data.body || data.message || "";

          let currentBadge = 0;

          try {
            currentBadge = await Notifications.getBadgeCountAsync();
          } catch {
            currentBadge = badgeRef.current || 0;
          }

          const nextBadge = Number(currentBadge || 0) + 1;
          badgeRef.current = nextBadge;

          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data,
              badge: nextBadge, // ✅ TOTAL COUNT
              sound: "default",
            },
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
  }, [user?._id, user?.user_type, shouldProcessMessage, projectId]);

  // ✅ Tap handling
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data;

      if (navigationRef.current) handleNotificationNavigation(data);
      else pendingNotificationRef.current = data;
    });

    return () => sub.remove();
  }, [handleNotificationNavigation]);

  // If app opened and navigation ready
  useEffect(() => {
    if (ready && pendingNotificationRef.current && navigationRef.current) {
      handleNotificationNavigation(pendingNotificationRef.current);
      pendingNotificationRef.current = null;
    }
  }, [ready, handleNotificationNavigation]);

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
            <Stack.Screen name="Payments" component={PaymentTabsWithHeader} />
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
