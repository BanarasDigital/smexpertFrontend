import React from "react";
import { View, Text, StyleSheet } from "react-native";

const STATUS_STYLES = {
  new: { bg: "#E5F3FF", text: "#0A84FF", label: "New" },
  in_progress: { bg: "#EDE9FE", text: "#5B21B6", label: "In Progress" },
  interested: { bg: "#DCFCE7", text: "#166534", label: "Interested" },
  follow_up: { bg: "#FEF3C7", text: "#92400E", label: "Follow Up" },
  converted: { bg: "#D1FAE5", text: "#047857", label: "Converted" },
  dropped: { bg: "#FEE2E2", text: "#B91C1C", label: "Dropped" },
  unassigned: { bg: "#F3F4F6", text: "#4B5563", label: "Unassigned" },
};

// 🔥 Universal Badge
export default function StatusBadge({ value }) {
  if (!value) return null;

  const cfg = STATUS_STYLES[value] || {
    bg: "#E5E7EB",
    text: "#374151",
    label: value,
  };

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
