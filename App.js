// App.js
import React, { useEffect, useContext, useState, useRef } from "react";
import { View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { DataContext } from "./context";
import { API_BASE_URL } from "./config";

// Screens
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

// ✅ Android notification channel for local notifications (Expo)
async function createAndroidChannel() {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });
    } catch (e) {
      console.log("Channel creation error:", e.message);
    }
  }
}

// ✅ Global notification handler (Expo)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function App() {
  const { checkSession, token, loading } = useContext(DataContext);
  const [ready, setReady] = useState(false);
  const pushTokenRef = useRef(null);

  // Optional: if you later integrate navigationRef for deep linking
  // const navigationRef = useRef();

  const checkValidSession = async () => {
    try {
      const ok = await checkSession();
      if (!ok) {
        console.log("Session expired or invalid -> user must login");
      }
    } catch (err) {
      console.log("Error checking session:", err);
    }
  };

  useEffect(() => {
    checkSession();
    checkValidSession();
    createAndroidChannel();

    const isExpoGo = Constants.appOwnership === "expo";

    // ❗ In Expo Go, FCM (RNFirebase) does NOT work.
    // Only real APK or dev-build will receive push.
    if (isExpoGo) {
      console.log("Running in Expo Go -> FCM will not work, only local notifs.");
      Notifications.requestPermissionsAsync().catch(() => { });
      setReady(true);
      return;
    }

    let messaging;
    try {
      // React Native Firebase Messaging
      messaging = require("@react-native-firebase/messaging").default;
    } catch (err) {
      console.warn("Firebase messaging failed to load:", err.message);
      setReady(true);
      return;
    }

    let unsubOnMessage = null;
    let unsubOnTokenRefresh = null;

    (async () => {
      try {
        // Must be called once before using FCM
        await messaging().registerDeviceForRemoteMessages();

        // Ask permission (iOS; on Android usually granted)
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log("FCM permission not granted");
        }

        // Get FCM token
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          pushTokenRef.current = fcmToken;
          console.log("FCM Token:", fcmToken);

          // Save token to backend
          fetch(`${API_BASE_URL}/save-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: fcmToken,
              projectId: "smexpert",
              platform: Platform.OS,
            }),
          }).catch((err) =>
            console.warn("save-token failed:", err.message)
          );
        }

        // On token refresh -> save again
        unsubOnTokenRefresh = messaging().onTokenRefresh((newToken) => {
          pushTokenRef.current = newToken;
          console.log("FCM token refreshed:", newToken);
          fetch(`${API_BASE_URL}/save-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: newToken,
              projectId: "smexpert",
              platform: Platform.OS,
            }),
          }).catch((err) =>
            console.warn("save-token refresh failed:", err.message)
          );
        });

        // Foreground messages -> show local notification using Expo
        unsubOnMessage = messaging().onMessage(async (remoteMessage) => {
          const title =
            remoteMessage.notification?.title ||
            remoteMessage.data?.title ||
            "New message";
          const body =
            remoteMessage.notification?.body ||
            remoteMessage.data?.body ||
            "";

          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: remoteMessage.data || {},
            },
            trigger: null,
          });
        });

        // ❗ Deep linking / navigation from notification
        // If you want later:
        // messaging().onNotificationOpenedApp(remoteMessage => {
        //   const screen = remoteMessage?.data?.screen;
        //   if (screen) navigationRef.current?.navigate(screen);
        // });
        //
        // const initial = await messaging().getInitialNotification();
        // if (initial?.data?.screen) {
        //   navigationRef.current?.navigate(initial.data.screen);
        // }
      } catch (err) {
        console.warn("FCM init error:", err);
      } finally {
        setReady(true);
      }
    })();

    return () => {
      try {
        unsubOnMessage && unsubOnMessage();
      } catch { }
      try {
        unsubOnTokenRefresh && unsubOnTokenRefresh();
      } catch { }
    };
  }, []);

  if (loading || !ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
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
            <Stack.Screen
              name="GroupConversation"
              component={GroupConversation}
            />
            <Stack.Screen
              name="ManageGroupMembers"
              component={ManageGroupMembers}
            />
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

export default App;
