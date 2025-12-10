// Header.js
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import React, { useState, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { DataContext } from "../../context";
import { useNavigation } from "@react-navigation/native";
import { goToLogin } from "../../navserviceRef";

export default function MyHeader({ activeTab, setActiveTab }) {
  const { logoutFunc, user } = useContext(DataContext);
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);

  const menuItems = [
    { name: "Profile", label: "Profile" },
    {
      name: "Logout",
      label: "Logout",
      action: async () => {
        try {
          if (logoutFunc) await logoutFunc();
        } finally {
          goToLogin(); // root reset to Login
          setModalVisible(false);
        }
      },
    },
  ];

  const tabs = [
    { name: "Chats", label: "CHATS" },
    ...(user?.user_type === "admin" ? [{ name: "Users", label: "USERS" }] : []),
    ...(user?.user_type === "admin" ? [{ name: "CreateGroup", label: "CREATE GROUP" }] : []),
    ...(user?.user_type === "user" ? [{ name: "UserListChat", label: "USERLIST" }] : []),
       { name: "Groups", label: "GROUPS" },
    { name: "Payments", label: "PAYMENTS" },
  ];

  const handleTabPress = (tabName) => {
    setActiveTab?.(tabName);
    navigation.navigate(tabName);
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SM Expert</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <View className="tabs" style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={() => handleTabPress(tab.name)}>
            <Text style={styles.tabText}>{tab.label}</Text>
            {activeTab === tab.name && <View style={styles.activeUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={styles.menuItem}
                onPress={item.action || (() => navigation.navigate(item.name))}
              >
                <Text style={[styles.menuText, item.name === "Logout" ? { color: "red" } : null]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#075E54",
    paddingTop: 55,
    paddingBottom: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#075E54",
    paddingVertical: 10,
    borderBottomWidth: 0.3,
    borderBottomColor: "#ccc",
  },
  tabItem: { alignItems: "center" },
  tabText: { color: "white", fontSize: 14, fontWeight: "bold" },
  activeUnderline: { marginTop: 4, height: 2, width: "100%", backgroundColor: "#fff", borderRadius: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    marginTop: 5,
  },
  menuContainer: {
    backgroundColor: "white",
    marginTop: 60,
    marginRight: 10,
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 160,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 18 },
  menuText: { fontSize: 16, color: "#333" },
});
