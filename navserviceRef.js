// navserviceRef.js
import { createNavigationContainerRef, StackActions } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
}

export function replace(name, params) {
  if (!navigationRef.isReady()) return;
  const current = navigationRef.getCurrentRoute();
  if (current?.name !== name) navigationRef.dispatch(StackActions.replace(name, params));
}

// Root-level reset helpers (auth ↔ app switches)
export function resetTo(name, params) {
  if (!navigationRef.isReady()) return;
  navigationRef.resetRoot({
    index: 0,
    routes: [{ name, params }],
  });
}

export function goToChats() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("MainTabs", { screen: "Chats" });
}

// export function goToLogin() {
//   resetTo("Login");
// }
