import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import Login from "../pages/authPages/Login/Login";
import LoadingSpinner from "./component/LoadingSpinner/LoadingSpinner";
import Toast from "react-native-toast-message";
import HomePage from "../pages/HomePage/HomePage";
import ChatScreen from "../pages/Chats/ChatPage";
import UserManagement from "../pages/authPages/UserManagement/UserManagement";
import { SafeAreaView } from "react-native-safe-area-context";
import RegisterScreen from "../pages/RegisterUserPage/RegisterUserPage";
import { DataContext } from "../context";

import CreateGroupScreen from "./pages/Group/CreateGroup/createGroup";
import GroupConversation from "./pages/Group/getGroup/Groups";

const Stack = createNativeStackNavigator();

function Main() {
  const { checkSession, token, loading } = React.useContext(DataContext);

  React.useEffect(() => {
    checkSession();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "black",
        }}
      >
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }} edges={["bottom"]}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="Home" component={HomePage} />
            <Stack.Screen name="Users" component={UserManagement} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="AddUser" component={RegisterScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupConversation" component={GroupConversation} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Home" component={HomePage} />
            <Stack.Screen name="Users" component={UserManagement} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="AddUser" component={RegisterScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupConversation" component={GroupConversation} />
          </>
        )}
      </Stack.Navigator>

      <Toast />
    </SafeAreaView>
  );
}

export default Main;
