// screens/GroupChat.js
import React, {
  useEffect,
  useState,
  useRef,
  useContext,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  FlatList,
  Alert,
  ActionSheetIOS,
  Keyboard,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import io from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio, Video } from "expo-av";
import { API_BASE_URL } from "../config";
import { DataContext } from "../context";
import GroupTopBar from "./GroupTopBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { File, Directory } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import mime from "mime";
const isImage = (t = "", url = "") =>
  /image\//i.test(t) || /\.(jpe?g|png|gif|webp|heic|heif|svg)$/i.test(url);
const isVideo = (t = "", url = "") =>
  /video\//i.test(t) || /\.(mp4|m4v|mov|webm)$/i.test(url);
const isAudio = (t = "", url = "") =>
  /audio\//i.test(t) || /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(url);

const guessMimeFromName = (name = "") => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "svg"].includes(ext)
  )
    return `image/${ext === "jpg" ? "jpeg" : ext}`;
  if (["mp4", "m4v", "mov", "webm"].includes(ext)) return "video/mp4";
  if (["mp3", "m4a", "aac", "wav", "ogg", "opus", "flac"].includes(ext))
    return "audio/*";
  return "application/octet-stream";
};
const getSafeUrl = (url = "") => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
};
const formatClock = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function GroupChat({ navigation, route }) {
  const { user, apiGet, checkSession } = useContext(DataContext) || {};
  const groupId = route?.params?.groupId;
  const [showMentionBox, setShowMentionBox] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [paddingBottom, setPaddingBottom] = useState(12);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);

  const flatRef = useRef(null);
  const socketRef = useRef(null);
  const playingRef = useRef(null);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchGroupData = useCallback(async () => {
    if (!groupId) {
      console.warn("❌ Missing groupId in fetchGroupData");
      Alert.alert("Error", "Invalid group ID.");
      return;
    }

    try {
      setLoading(true);

      const res = await apiGet(`/groups/${groupId}`);
      const raw = res?.data || res || {};
      const g = raw.data || raw.group || raw;

      if (!g || !g._id) throw new Error("Invalid group data");

      setGroup({
        _id: g._id,
        name: g.name || "Unnamed Group",
        groupImage:
          g.groupImage && g.groupImage.trim() !== ""
            ? g.groupImage
            : "https://via.placeholder.com/100",
      });

      const membersWithProfile = (g.members || []).map((m) => ({
        _id: m._id,
        name: m.name || "Unknown",
        profileImage:
          m?.profileImage && m.profileImage.trim() !== ""
            ? m.profileImage
            : "https://via.placeholder.com/80",
      }));

      setCurrentMembers(membersWithProfile);
    } catch (err) {
      console.error("❌ Group fetch error:", err);
      Alert.alert("Error", "Failed to fetch group details.");
    } finally {
      setLoading(false);
    }
  }, [apiGet, groupId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  useEffect(() => {
    apiGet(`/group/${groupId}/messages`, {}, (res) => {
      setMessages(res?.messages || []);
      requestAnimationFrame(scrollToEnd);
    });
  }, [groupId]);
  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const a = new Date(d1);
    const b = new Date(d2);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const formatDateLabel = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(d, today)) return "Today";
    if (isSameDay(d, yesterday)) return "Yesterday";

    return d.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* Keyboard padding */
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setPaddingBottom(10)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setPaddingBottom(12)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /* Socket */
  useEffect(() => {
    const s = io(API_BASE_URL, { transports: ["websocket"], forceNew: true });
    socketRef.current = s;
    if (user?._id) s.emit("register", user._id);
    s.emit("join_group", { groupId });

    s.on("receive_group_message", (msg) => {
      if (String(msg.groupId) !== String(groupId)) return;
      setMessages((prev) => [...prev, msg]);
      requestAnimationFrame(scrollToEnd);
    });

    return () => {
      s.emit("leave_group", { groupId });
      s.disconnect();
      socketRef.current = null;
    };
  }, [groupId, user?._id]);

  const scrollToEnd = () => flatRef.current?.scrollToEnd({ animated: true });

  /* Attachments */
  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      return Alert.alert("Permission required", "Allow photo library access.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.9,
    });
    if (result.canceled) return;
    const files = result.assets.map((a) => ({
      uri: a.uri,
      name: a.fileName || a.uri.split("/").pop() || `file-${Date.now()}`,
      type: a.type === "video" ? "video/mp4" : guessMimeFromName(a.uri),
    }));
    setAttachments((p) => [...p, ...files]);
  };

  const pickDocuments = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["*/*", "image/*", "video/*", "audio/*", "application/*", "text/*"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const files = res.assets.map((a) => ({
      uri: a.uri,
      name: a.name || `file-${Date.now()}`,
      type: a.mimeType || guessMimeFromName(a.name),
    }));
    setAttachments((p) => [...p, ...files]);
  };

  const openAttach = () => {
    const opts = ["Gallery", "Browse Files", "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) pickFromGallery();
          if (i === 1) pickDocuments();
        }
      );
    } else {
      Alert.alert("Add attachment", "Choose source", [
        { text: "Gallery", onPress: pickFromGallery },
        { text: "Browse Files", onPress: pickDocuments },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };


  const downloadAndOpen = async (url, fileName) => {
    try {
      if (!url) {
        Alert.alert("Error", "File URL missing.");
        return;
      }

      const safeUrl = getSafeUrl(url);
      const finalName =
        fileName || safeUrl.split("/").pop() || `file-${Date.now()}`;

      const fileUri = FileSystem.documentDirectory + finalName;

      // Download file
      const result = await FileSystem.downloadAsync(safeUrl, fileUri);

      const mimeType = guessMimeFromName(finalName);

      // Open via share sheet — SAFE for Android + iOS
      await Sharing.shareAsync(result.uri, {
        mimeType,
        dialogTitle: "Open or Save File",
      });
    } catch (err) {
      console.log("DOWNLOAD ERROR →", err);
      Alert.alert("Error", "Unable to download this file.");
    }
  };


  /* Send message */
  const sendMessage = async () => {
    try {
      const freshToken = await checkSession();
      if (!freshToken) {
        Alert.alert("Error", "Session expired. Please log in again.");
        return;
      }

      if (!user || !user._id) {
        Alert.alert("Error", "User not found or unauthorized.");
        return;
      }

      let activeGroupId = groupId;
      if (!activeGroupId) {
        const res = await apiGet(`/groups/${groupId}`);
        const g = res?.data?.data || res?.data?.group || res?.data || {};
        if (!g?._id) {
          Alert.alert("Error", "Invalid group. Please reopen chat.");
          return;
        }
        activeGroupId = g._id;
        setGroup(g);
      }

      if (!text.trim() && attachments.length === 0) return;

      const formData = new FormData();
      formData.append("groupId", activeGroupId);
      formData.append("senderId", String(user._id));
      if (text.trim()) formData.append("content", text.trim());

      // ✅ Add correct MIME support for XLSX
      const correctMime = (name = "") => {
        const ext = name.split(".").pop().toLowerCase();
        if (ext === "xlsx")
          return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (ext === "xls") return "application/vnd.ms-excel";
        return "application/octet-stream";
      };

      attachments.forEach((file, i) => {
        const finalType = file.type || correctMime(file.name);
        const uri = file.uri.startsWith("file://") ? file.uri : `file://${file.uri}`;

        formData.append("files", {
          uri,
          name: file.name || `upload-${Date.now()}-${i}`,
          type: finalType,
        });
      });

      const response = await fetch(
        `${API_BASE_URL}/groups/${activeGroupId}/messages`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${freshToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        console.error("❌ Message send failed:", data);
        Alert.alert(
          "Error",
          data?.error || data?.message || "Failed to send message."
        );
        return;
      }

      setMessages((prev) => [...prev, data.message]);
      setText("");
      setAttachments([]);
      requestAnimationFrame(scrollToEnd);

      socketRef.current?.emit("send_group_message", {
        groupId: activeGroupId,
        message: data.message,
      });
    } catch (err) {
      console.error("sendMessage error:", err);
      Alert.alert("Error", "Something went wrong while sending the message.");
    }
  };


  /* Preview modal */
  const openPreview = (items, index) => {
    setModalItems(items);
    setModalIndex(index);
    setModalOpen(true);
  };

  const stopAudio = async () => {
    if (playingRef.current) {
      try {
        await playingRef.current.stopAsync();
        await playingRef.current.unloadAsync();
      } catch { }
    }
    playingRef.current = null;
  };

  const playAudio = async (uri) => {
    await stopAudio();
    const { sound } = await Audio.Sound.createAsync({ uri });
    playingRef.current = sound;
    await sound.playAsync();
  };

  const renderBubble = ({ item, index }) => {

    const prevMsg = messages[index - 1];
    const showDate =
      index === 0 ||
      !isSameDay(item.createdAt, prevMsg?.createdAt);
    const isMine =
      String(item?.senderId?._id || item.senderId) === String(user._id);
    const bubble = isMine ? styles.myBubble : styles.theirBubble;

    const atts = (item.attachments || []).map((a) => ({
      url: a.url || a.path || a.uri,
      type: a.type || guessMimeFromName(a.url || a.path || ""),
      name: a.name || (a.url || "").split("/").pop() || "file",
    }));

    const media = atts.filter(
      (a) =>
        isImage(a.type, a.url) ||
        isVideo(a.type, a.url) ||
        isAudio(a.type, a.url)
    );
    const files = atts.filter((a) => !media.includes(a));

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {formatDateLabel(item.createdAt)}
            </Text>
          </View>
        )}
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
          {!isMine && (item?.senderId?.profileImage || item?.profileImage) ? (
            <Image
              source={{ uri: item?.senderId?.profileImage || item?.profileImage }}
              style={styles.msgAvatar}
            />
          ) : !isMine ? (
            <Ionicons
              name="person-circle-outline"
              size={28}
              color="#999"
              style={{ marginRight: 6 }}
            />
          ) : null}

          <View style={[styles.bubble, bubble]}>
            {/* Optional sender name for group */}
            {!isMine && item?.senderId?.name ? (
              <Text style={styles.senderName} numberOfLines={1}>
                {item.senderId.name}
              </Text>
            ) : null}

            {item.content ? (
              <Text style={styles.msgText}>{item.content}</Text>
            ) : null}
            {media.length > 0 ? (
              <View style={styles.mediaWrap}>
                {media.map((m, i) => {
                  const uri = m.url;

                  // IMAGE
                  if (isImage(m.type, uri)) {
                    return (
                      <View key={`m-${i}`} style={styles.mediaItem}>
                        <Pressable onPress={() => openPreview(media, i)}>
                          <Image source={{ uri }} style={styles.mediaImg} />
                        </Pressable>

                        <TouchableOpacity
                          style={styles.downloadBtn}
                          onPress={() => downloadAndOpen(uri, m.name)}
                        >
                          <Ionicons name="download-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  // VIDEO  (RESTORED ORIGINAL PREVIEW)
                  if (isVideo(m.type, uri)) {
                    return (
                      <View key={`m-${i}`} style={styles.mediaItem}>
                        <Pressable onPress={() => openPreview(media, i)} style={{ flex: 1 }}>
                          <View style={styles.videoBox}>
                            <Video
                              source={{ uri }}
                              style={styles.video}
                              resizeMode="cover"
                              useNativeControls
                            />
                            <View style={styles.playOverlay}>
                              <Ionicons name="play-circle" size={40} color="#fff" />
                            </View>
                          </View>
                        </Pressable>

                        {/* DOWNLOAD ICON */}
                        <TouchableOpacity
                          style={styles.downloadBtn}
                          onPress={() =>
                            downloadAndOpen(uri, m.name || `video-${Date.now()}.mp4`)
                          }
                        >
                          <Ionicons name="download-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  // AUDIO
                  if (isAudio(m.type, uri)) {
                    return (
                      <View key={`a-${i}`} style={styles.audioRow}>
                        <TouchableOpacity onPress={() => playAudio(uri)} style={styles.audioPlay}>
                          <Ionicons name="play" size={18} color="#fff" />
                        </TouchableOpacity>

                        <Text style={styles.audioName} numberOfLines={1}>{m.name}</Text>

                        <TouchableOpacity onPress={() => downloadAndOpen(uri, m.name)}>
                          <Ionicons name="download-outline" size={22} color="#0B6E4F" />
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return null;
                })}
              </View>
            ) : null}


            {files.map((f, i) => (
              <View key={`f-${i}`} style={styles.fileTile}>
                <Ionicons name="document-attach-outline" size={24} color="#333" />

                <Text
                  style={styles.fileName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {f.name}
                </Text>

                <TouchableOpacity onPress={() => downloadAndOpen(f.url, f.name)}>

                  <Ionicons name="download-outline" size={24} color="#0B6E4F" />
                </TouchableOpacity>
              </View>
            ))}


            <Text style={styles.time}>{formatClock(item.createdAt)}</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#ECE5DD" }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={styles.topBar}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Group Image */}
        {group?.groupImage ? (
          <Image
            source={{ uri: group.groupImage }}
            style={styles.groupAvatar}
          />
        ) : (
          <Ionicons name="people-circle-outline" size={50} color="#fff" />
        )}

        {/* Group Info */}
        <View style={{ flex: 1 }}>
          <Text style={styles.groupTitle} numberOfLines={1}>
            {group?.name ? String(group.name) : "Group"}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {currentMembers.slice(0, 3).map((m, i) => (
              <Image
                key={m._id || i}
                source={{
                  uri: m.profileImage || "https://via.placeholder.com/40",
                }}
                style={[styles.memberAvatar, { marginLeft: i === 0 ? 0 : -8 }]}
              />
            ))}

            <Text style={styles.memberNames} numberOfLines={1}>
              {currentMembers.length > 0
                ? currentMembers
                  .slice(0, 3)
                  .map((m) =>
                    typeof m.name === "string" ? m.name.split(" ")[0] : "User"
                  )
                  .join(", ") + (currentMembers.length > 3 ? "..." : "")
                : "No members"}
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

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={Array.from(new Map(messages.map((m) => [m._id, m])).values())}
        keyExtractor={(m, i) =>
          m?._id ? `msg-${m._id}` : `temp-${i}-${Date.now()}`
        }
        renderItem={({ item, index }) => renderBubble({ item, index })}
        contentContainerStyle={{
          padding: 10,
          paddingBottom: 70 + paddingBottom,
        }}
        onContentSizeChange={scrollToEnd}
        onLayout={scrollToEnd}
      />
      {attachments.length > 0 && (
        <View style={styles.pendingStrip}>
          {attachments.map((f, i) => (
            <View key={i} style={styles.pendingItem}>
              {isImage(f.type, f.uri) ? (
                <Image source={{ uri: f.uri }} style={styles.pendingThumb} />
              ) : isVideo(f.type, f.uri) ? (
                <View
                  style={[
                    styles.pendingThumb,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Ionicons name="videocam" size={18} color="#444" />
                </View>
              ) : isAudio(f.type, f.uri) ? (
                <View
                  style={[
                    styles.pendingThumb,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Ionicons name="musical-notes" size={18} color="#444" />
                </View>
              ) : (
                <View
                  style={[
                    styles.pendingThumb,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Ionicons name="document" size={18} color="#444" />
                </View>
              )}
              <TouchableOpacity
                onPress={() =>
                  setAttachments((p) => p.filter((_, idx) => idx !== i))
                }
                style={styles.pendingRemove}
              >
                <Ionicons name="close-circle" size={18} color="#E11D48" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {/* Composer */}
      {showMentionBox && filteredUsers.length > 0 && (
        <View
          style={{
            backgroundColor: "#fff",
            maxHeight: 120,
            borderRadius: 8,
            position: "absolute",
            bottom: 70,
            left: 10,
            right: 10,
            zIndex: 999,
            elevation: 5,
            paddingVertical: 6,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", padding: 8 }}
                onPress={() => {
                  const words = text.split(" ");
                  words.pop();
                  const newText = [...words, `@${item.name}`].join(" ") + " ";
                  setText(newText);
                  setShowMentionBox(false);
                }}
              >
                <Image
                  source={{ uri: item.profileImage }}
                  style={{ width: 30, height: 30, borderRadius: 15, marginRight: 8 }}
                />
                <Text style={{ fontSize: 15 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={[styles.composer, { paddingBottom }]}>
        <TouchableOpacity onPress={openAttach} style={{ paddingHorizontal: 6 }}>
          <Ionicons name="attach" size={24} color="#555" />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={(txt) => {
            setText(txt);

            const lastWord = txt.slice(0, cursorPosition).split(" ").pop();

            if (lastWord.startsWith("@")) {
              setShowMentionBox(true);
              const query = lastWord.slice(1).toLowerCase();
              setFilteredUsers(
                currentMembers.filter((m) =>
                  m.name.toLowerCase().includes(query)
                )
              );
            } else {
              setShowMentionBox(false);
            }
          }}
          onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
          placeholder="Type a message"
          placeholderTextColor="#9CA3AF"
          multiline
          style={styles.input}
        />

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim() && attachments.length === 0}
        >
          <Ionicons
            name="send"
            size={20}
            color={!text.trim() && attachments.length === 0 ? "#bbb" : "#fff"}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  !text.trim() && attachments.length === 0
                    ? "#cfcfcf"
                    : "#25D366",
              },
            ]}
          />
        </TouchableOpacity>
      </View>
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalTop}>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={() => setModalIndex((i) => Math.max(0, i - 1))}
                disabled={modalIndex <= 0}
                style={{ paddingHorizontal: 12 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={26}
                  color={modalIndex <= 0 ? "#777" : "#fff"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setModalIndex((i) => Math.min(modalItems.length - 1, i + 1))
                }
                disabled={modalIndex >= modalItems.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={26}
                  color={modalIndex >= modalItems.length - 1 ? "#777" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalBody}>
            {modalItems[modalIndex] &&
              (() => {
                const it = modalItems[modalIndex];
                const uri = it.url || it.uri;
                if (isImage(it.type, uri)) {
                  return (
                    <Image
                      source={{ uri }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  );
                }
                if (isVideo(it.type, uri)) {
                  return (
                    <Video
                      source={{ uri }}
                      style={styles.modalVideo}
                      resizeMode="contain"
                      useNativeControls
                      shouldPlay
                    />
                  );
                }
                if (isAudio(it.type, uri)) {
                  return (
                    <View style={styles.modalAudio}>
                      <TouchableOpacity
                        onPress={() => playAudio(uri)}
                        style={styles.bigPlay}
                      >
                        <Ionicons name="play-circle" size={66} color="#fff" />
                      </TouchableOpacity>
                      <Text
                        style={{ color: "#fff", marginTop: 12 }}
                        numberOfLines={1}
                      >
                        {it.name}
                      </Text>
                    </View>
                  );
                }
                if (isExcel(it.type, uri)) {
                  return (
                    <View style={styles.modalFile}>
                      <Ionicons name="document-text-outline" size={60} color="#fff" />
                      <Text style={{ color: "#fff", marginTop: 10 }}>{it.name}</Text>

                      <TouchableOpacity onPress={() => downloadAndOpen(f.url, f.name)}>

                        <Ionicons name="download-outline" size={40} color="#4ADE80" />
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <View style={styles.modalFile}>
                    <Ionicons
                      name="document-attach-outline"
                      size={48}
                      color="#fff"
                    />
                    <Text
                      style={{ color: "#fff", marginTop: 10 }}
                      numberOfLines={1}
                    >
                      {it.name}
                    </Text>
                  </View>
                );
              })()}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#075E54",
    paddingTop: 36,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 10,
  },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 10,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerSub: { color: "#e9f5f1", fontSize: 12 },

  row: { flexDirection: "row", marginVertical: 6, paddingHorizontal: 6 },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },

  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    alignSelf: "flex-end",
  },

  bubble: { maxWidth: "80%", borderRadius: 12, padding: 8 },
  myBubble: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },

  senderName: {
    color: "#0B6E4F",
    fontWeight: "700",
    marginBottom: 2,
    fontSize: 12,
  },
  msgText: { color: "#111", fontSize: 15, lineHeight: 20 },

  mediaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  mediaItem: { width: 160, height: 160, borderRadius: 10, overflow: "hidden" },
  mediaImg: { width: "100%", height: "100%" },
  videoBox: { flex: 1, backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },
  playOverlay: { position: "absolute", top: "40%", left: "40%", opacity: 0.85 },

  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
  },
  audioPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  audioName: { flex: 1, color: "#222" },

  fileTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    backgroundColor: "#fefefe",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  fileName: { flex: 1, color: "#111" },
  fileOpen: { color: "#0645AD", fontWeight: "700" },

  time: { color: "#777", fontSize: 11, alignSelf: "flex-end", marginTop: 4 },

  composer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    color: "#666",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  sendButton: { padding: 10, borderRadius: 20, marginLeft: 6 },

  pendingStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 60,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#f7f7f7",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pendingItem: { position: "relative" },
  pendingThumb: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  pendingRemove: {
    position: "absolute",
    right: -6,
    top: -6,
    backgroundColor: "#fff",
    borderRadius: 10,
  },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)" },
  modalTop: {
    height: 58,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  modalImage: { width: "100%", height: "85%" },
  modalVideo: { width: "100%", height: "85%" },
  modalAudio: { alignItems: "center", justifyContent: "center" },
  bigPlay: { alignItems: "center", justifyContent: "center" },
  modalFile: { alignItems: "center", justifyContent: "center" },
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
  fileName: {
    flex: 1,
    color: "#111",
    fontSize: 13,
    maxWidth: 140,
  },
  downloadBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 6,
    borderRadius: 20,
    zIndex: 20,
  },
  dateSeparator: {
    alignSelf: "center",
    backgroundColor: "#E1F3FB",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 10,
  },

  dateText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },

});
