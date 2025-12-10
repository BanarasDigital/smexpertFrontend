// PaymentTabsWithHeader.js
import React, { useContext } from "react";
import { View } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import PaymentUpdate from "../PaymentUpdate/PaymentUpdate";
import PaymentReport from "../PaymentReport/PaymentReport";
import { DataContext } from "../../context";
import MyHeader from "../../component/Header/Header";

const Tab = createMaterialTopTabNavigator();

export default function PaymentTabsWithHeader({ navigation }) {
  const { user } = useContext(DataContext);
  const headerTabs = [
    { name: "Update", label: "UPDATE" },
    ...(user?.user_type === "admin"
      ? [{ name: "Report", label: "REPORT" }]
      : []),
  ];

  return (
    <View style={{ flex: 1 }}>
      <MyHeader navigation={navigation} tabs={headerTabs} />
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: "bold" },
          tabBarIndicatorStyle: { backgroundColor: "#fff" },
          tabBarStyle: {
            backgroundColor: "#ffffffff",
          },
          swipeEnabled: false,   
       lazy: true, 
        }}
        initialRouteName="Update"
      >
        <Tab.Screen
          name="Update"
          component={PaymentUpdate}
          options={{ tabBarLabel: "UPDATE" }}
        />
        {user?.user_type === "admin" && (
          <Tab.Screen
            name="Report"
            component={PaymentReport}
            options={{ tabBarLabel: "REPORT" }}
          />
        )}
      </Tab.Navigator>
    </View>
  );
}
