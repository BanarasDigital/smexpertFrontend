import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ChatListSkeleton({ items = 6 }) {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={{ padding: 10 }}>
      {Array.from({ length: items }).map((_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.avatar} />
          <View style={styles.content}>
            <View style={[styles.line, { width: "50%" }]} />
            <View style={[styles.line, { width: "70%", marginTop: 6 }]} />
          </View>
          <View style={[styles.time, { width: "15%" }]} />
          <Animated.View
            style={[styles.shimmer, { transform: [{ translateX }] }]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0e0e0",
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
  },
  time: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
    marginLeft: 10,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "30%",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
});
