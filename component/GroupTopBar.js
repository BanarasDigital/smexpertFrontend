import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

/* Unified Header (same as ManageGroupMembers top bar) */
const GroupTopBar = ({ group, navigation }) => {
  const members = group?.members || [];

  return (
    <View style={styles.topBar}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Group Image */}
      {group?.image ? (
        <Image source={{ uri: group.image }} style={styles.groupAvatar} />
      ) : (
        <Ionicons name="people-circle-outline" size={50} color="#fff" />
      )}

      {/* Group Info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.groupTitle} numberOfLines={1}>
          {group?.name || "Group Chat"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {members.slice(0, 3).map((m, i) => (
            <Image
              key={m._id || i}
              source={{
                uri: m.profileImage || "https://via.placeholder.com/40",
              }}
              style={[styles.memberAvatar, { marginLeft: i === 0 ? 0 : -8 }]}
            />
          ))}
          <Text style={styles.memberNames} numberOfLines={1}>
            {members
              .slice(0, 3)
              .map((m) => m.name?.split(" ")[0])
              .join(", ")}
            {members.length > 3 ? "..." : ""}
          </Text>
        </View>
      </View>

      {/* Right Icons */}
      <Ionicons name="videocam" size={24} color="#fff" style={styles.icon} />
      <Ionicons name="call" size={22} color="#fff" style={styles.icon} />
      <MaterialIcons
        name="more-vert"
        size={24}
        color="#fff"
        style={styles.icon}
      />
    </View>
  );
};

export default GroupTopBar;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#075E54",
    paddingTop: 36,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backButton: { marginRight: 8 },
  groupAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 10,
  },
  groupTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  memberAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#075E54",
  },
  memberNames: { color: "#e0f2f1", fontSize: 12, marginLeft: 6 },
  icon: { marginLeft: 12 },
});
