import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ChatSkeleton({ lines = 6 }) {
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

    // Generate random width and height for realism
    const randomWidth = () => `${Math.floor(Math.random() * 30 + 50)}%`;
    const randomHeight = () => Math.floor(Math.random() * 30 + 20); // 20–50 px height

    return (
        <View style={{ padding: 10 }}>
            {Array.from({ length: lines }).map((_, i) => {
                const isMine = i % 2 === 0; // alternate sides
                return (
                    <View
                        key={i}
                        style={[
                            styles.messageContainer,
                            { marginVertical: Math.random() * 8 + 4 },
                        ]}
                    >
                        {!isMine && <View style={styles.avatar} />}
                        <View
                            style={[
                                styles.bubble,
                                isMine ? styles.myMessage : styles.theirMessage,
                                {
                                    width: randomWidth(),
                                    height: randomHeight(),
                                },
                            ]}
                        />
                        <Animated.View
                            style={[styles.shimmer, { transform: [{ translateX }] }]}
                        />
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        position: "relative",
    },
    bubble: {
        borderRadius: 12,
        backgroundColor: "#e0e0e0",
        marginHorizontal: 5,
    },
    theirMessage: {
        alignSelf: "flex-start",
    },
    myMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#d0f0c0",
    },
    shimmer: {
        position: "absolute",
        top: 0, 
        left: 0,
        height: "100%",
        width: "30%",
        backgroundColor: "rgba(255,255,255,0.3)"
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#ccc",
        marginRight: 6,
    },
});
