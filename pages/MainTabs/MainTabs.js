// MainTabs.js
import React, { useContext, useState } from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { DataContext } from "../../context";

import HomePage from "../HomePage/HomePage";
import UserManagement from "../authPages/UserManagement/UserManagement";
import CreateGroupScreen from "../Group/CreateGroup/createGroup";
import GroupConversation from "../Group/getGroup/Groups";
import PaymentTabs from "../PaymentTabs/PaymentTabs";
import ProfilePage from "../Profile/ProfilePage";
import MyHeader from "../../component/Header/Header";
import UserListChat from "./../UserListChat";
import GroupInfo from "../../component/GroupInfo";
import ForgotPassword from "../../component/ForgotPassword";
import ResetPassword from "../../component/ResetPassword";
import LeadPage from "../LeadPage";
import LeadUserPage from "../LeadUserPage";
const Tab = createMaterialTopTabNavigator();

export default function MainTabs() {
  const { user } = useContext(DataContext);
  const [activeTab, setActiveTab] = useState("Chat");

  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={{
        tabBarStyle: { display: "none" },
        header: () => <MyHeader activeTab={activeTab} setActiveTab={setActiveTab} />,
        swipeEnabled: false,
        lazy: true,
      }}
      sceneContainerStyle={{ backgroundColor: "#fff" }}
    >
      <Tab.Screen
        name="Chats"
        component={HomePage}
        listeners={{ focus: () => setActiveTab("Chats") }}
      />
      {user?.user_type === "admin" && (
        <Tab.Screen
          name="Users"
          component={UserManagement}
          listeners={{ focus: () => setActiveTab("Users") }}
        />
      )}
      {user?.user_type === "admin" && (
        <Tab.Screen
          name="CreateGroup"
          component={CreateGroupScreen}
          listeners={{ focus: () => setActiveTab("Groups") }}
        />
      )}
      {user?.user_type === "user" && (
        <Tab.Screen
          name="UserListChat"
          component={UserListChat}
          listeners={{ focus: () => setActiveTab("UserListChat") }}
        />
      )}
      <Tab.Screen
        name="Groups"
        component={GroupConversation}
        listeners={{ focus: () => setActiveTab("Groups") }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentTabs}
        listeners={{ focus: () => setActiveTab("Payments") }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePage}
        listeners={{ focus: () => setActiveTab("Profile") }}
      />
      <Tab.Screen
        name="GroupInfo"
        component={GroupInfo}
        listeners={{ focus: () => setActiveTab("GroupInfo") }}
      />
      <Tab.Screen
        name="ForgotPassword"
        component={ForgotPassword}
        listeners={{ focus: () => setActiveTab("ForgotPassword") }}
      />
      <Tab.Screen
        name="ResetPassword"
        component={ResetPassword}
        listeners={{ focus: () => setActiveTab("ResetPassword") }}
      />
      <Tab.Screen
        name="leads"
        component={LeadPage}
        listeners={{ focus: () => setActiveTab("LeadPage") }}
      />
      <Tab.Screen
        name="lead"
        component={LeadUserPage}
        listeners={{ focus: () => setActiveTab("LeadUserPage") }}
      />
    </Tab.Navigator>
  );
}
