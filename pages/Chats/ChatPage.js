import React, {
  useEffect,
  useState,
  useRef,
  useContext,
  memo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  Linking,
  Modal,
  Pressable,
  Alert,
  ActionSheetIOS,
  InteractionManager,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { DataContext } from "../../context";
import io from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { API_BASE_URL } from "../../config";
import ChatSkeleton from "../../component/ChatSkeleton";
import * as FileSystem from "expo-file-system/legacy";

import { File, Directory } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import mime from "mime";

import { Video } from "expo-av";
const BAD_URLS = new Set(["null", "undefined", "about:blank", ""]);
const isBadBlob = (v = "") => /^blob:null/i.test(v);
const isTruthyUrl = (v) => {
  if (!v || typeof v !== "string") return false;
  const t = v.trim();
  if (BAD_URLS.has(t)) return false;
  if (isBadBlob(t)) return false;
  return true;
};

const LinkyText = memo(({ text }) => {
  if (!text) return null;
  const looksLikeLink = /(https?:\/\/[^\s]+)/i.test(text);
  const onPress = () => {
    const t = text.trim();
    if (looksLikeLink) {
      Linking.openURL(t).catch(() => { });
    }
  };
  return (
    <Text
      style={[
        styles.messageText,
        looksLikeLink && { textDecorationLine: "underline", color: "#0645AD" },
      ]}
      onPress={looksLikeLink ? onPress : undefined}
    >
      {text}
    </Text>
  );
});

const getSafeUrl = (u = "") => {
  if (!isTruthyUrl(u)) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  if (u.startsWith("uploads/")) return `${API_BASE_URL}/${u}`;
  return `${API_BASE_URL}/${u.replace(/^\/+/, "")}`;
};

const buildAuthHeaders = async (ctx) => {
  try {
    if (ctx?.checkSession) {
      const tk = await ctx.checkSession();
      if (tk) return { Authorization: `Bearer ${tk}` };
    }
    if (ctx?.token) return { Authorization: `Bearer ${ctx.token}` };
  } catch { }
  return {};
};

const guessMimeFromName = (name = "") => {
  if (!name) return "application/octet-stream";

  const ext = (name.split(".").pop() || "").toLowerCase();

  // Complete & updated MIME map
  const map = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    svg: "image/svg+xml",

    // Videos
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    webm: "video/webm",

    // Text / Data
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",

    // Word
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // Excel
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // PowerPoint
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Compressed
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    gz: "application/gzip",
    tar: "application/x-tar",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    opus: "audio/opus",
  };

  // If known extension
  if (map[ext]) return map[ext];

  // Excel variants
  if (ext === "xlsm" || ext === "xlsb") {
    return "application/vnd.ms-excel";
  }

  // Apple iWork formats
  if (ext === "pages") return "application/x-iwork-pages-sffpages";
  if (ext === "numbers") return "application/x-iwork-numbers-sffnumbers";
  if (ext === "key") return "application/x-iwork-keynote-sffkey";

  // Default fallback
  return "application/octet-stream";
};


const isImage = (type = "", url = "") =>
  /image\//i.test(type) || /\.(jpe?g|png|gif|webp|heic|heif|svg)$/i.test(url);
const isVideo = (type = "", url = "") =>
  /video\//i.test(type) || /\.(mp4|m4v|mov|avi|mkv|webm)$/i.test(url);
const isHttpLink = (text = "") => /^https?:\/\//i.test(text.trim());

const normalizeFileUriForForm = (uri = "") => {
  if (!uri) return uri;
  if (Platform.OS === "ios" && !uri.startsWith("file://"))
    return `file://${uri}`;
  return uri;
};

const normalizePickerAsset = (asset) => {
  const name =
    asset.name ||
    asset.fileName ||
    (asset.uri ? asset.uri.split("/").pop() : `file-${Date.now()}`);
  const type = guessMimeFromName(name);
  return {
    uri: asset.uri,
    name,
    type,
    fileSize: asset.size || asset.fileSize || null,
  };
};

const normalizeServerAttachment = (raw) => {
  if (!raw) return null;

  let rawUrl = "";

  if (typeof raw === "string") {
    rawUrl = raw;
  } else {
    rawUrl =
      raw.url ||
      raw.path ||
      raw.filePath ||
      raw.file ||
      raw.location ||
      "";
  }

  const finalUrl = getSafeUrl(rawUrl);

  if (!finalUrl) return null;

  const name = raw?.name || finalUrl.split("/").pop();
  const type = guessMimeFromName(name);

  return {
    url: finalUrl,
    uri: finalUrl, // IMPORTANT FIX
    name,
    type,
  };
};

const toBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return global.btoa(binary);
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
    const result = await FileSystem.downloadAsync(safeUrl, fileUri);

    const mimeType = guessMimeFromName(finalName);
    await Sharing.shareAsync(result.uri, {
      mimeType,
      dialogTitle: "Open or Save File",
    });

  } catch (err) {
    console.log("DOWNLOAD ERROR →", err);
    Alert.alert("Error", "Unable to download this file.");
  }
};


const getAnyAvatarField = (obj) =>
  obj?.profileImage ||
  obj?.photoURL ||
  obj?.avatar ||
  obj?.image ||
  obj?.picture ||
  obj?.avatarUrl ||
  null;
const timeAgo = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 10) return "Just now";
  if (sec < 60) return `${sec} sec ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return "Offline";
};
export default function ChatScreen({ navigation, route }) {
  const ctx = useContext(DataContext) || {};
  const { user, apiGet } = ctx;

  const [message, setMessage] = useState("");
  const [chatData, setChatData] = useState(null);
  const [paddingBottom, setPaddingBottom] = useState(80);
  const [receiver, setReceiver] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const scrollViewRef = useRef();
  const socketRef = useRef(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const peerId = route?.params?.id;
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const lastTypedAtRef = useRef(0);
  useEffect(() => {
    if (!peerId && !user?._id) {
      Alert.alert("Access Denied", "No chat user found", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } else if (!peerId) {
      Alert.alert("No User", "Chat user not available", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } else if (!user?._id) {
      Alert.alert("Not Logged In", "Please login again to continue", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
    }
  }, [peerId, user]);
  useEffect(() => {
    const t = setInterval(() => {
      if (lastSeen) setLastSeen((prev) => prev);
    }, 30000);
    return () => clearInterval(t);
  }, [lastSeen]);
  if (!peerId || !user?._id) {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  const myAvatar = getSafeUrl(
    getAnyAvatarField(user) || user?.profileImage || ""
  );
  const receiverAvatar = getSafeUrl(
    getAnyAvatarField(receiver) || route?.params?.profileImage || ""
  );

  const ensurePhotoPerms = async () => {
    try {
      const { status, canAskAgain } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === "granted" || status === "limited") return status;
      if (!canAskAgain) {
        Alert.alert(
          "Photos access blocked",
          "Enable Photos access in Settings to allow media upload.",
          [{ text: "OK" }]
        );
        return "denied";
      }
      Alert.alert("Permission required", "Please allow Photos access.");
      return "denied";
    } catch {
      Alert.alert("Permission error", "Could not check Photos permission.");
      return "denied";
    }
  };

  const pickFromCamera = useCallback(async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== "granted") {
      return Alert.alert("Permission required", "Please allow Camera access.");
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    const files = result.assets.map(normalizePickerAsset);
    setAttachments((prev) => [...prev, ...files]);
  }, []);

  const pickFromGallery = useCallback(async () => {
    const perm = await ensurePhotoPerms();
    if (perm === "denied") return;
    if (
      perm === "limited" &&
      Platform.OS === "ios" &&
      ImagePicker.presentLimitedLibraryPickerAsync
    ) {
      try {
        await ImagePicker.presentLimitedLibraryPickerAsync();
      } catch { }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    const files = result.assets.map(normalizePickerAsset);
    setAttachments((prev) => [...prev, ...files]);
  }, []);

  const pickDocuments = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "*/*",
          "image/*",
          "video/*",
          "audio/*",
          "application/*",
          "text/*",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!res.canceled && Array.isArray(res.assets)) {
        const files = res.assets.map(normalizePickerAsset);
        setAttachments((prev) => [...prev, ...files]);
      }
    } catch (e) {
      Alert.alert("Error", "Could not open file picker.");
    }
  }, []);

  const openAttachSheet = useCallback(() => {
    const options = ["Gallery", "Camera", "Browse Files", "Cancel"];
    const cancelIndex = 3;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (idx) => {
          if (idx === 0) pickFromGallery();
          if (idx === 1) pickFromCamera();
          if (idx === 2) pickDocuments();
        }
      );
    } else {
      Alert.alert("Add attachment", "Choose how to attach", [
        { text: "Gallery", onPress: pickFromGallery },
        { text: "Camera", onPress: pickFromCamera },
        { text: "Browse Files", onPress: pickDocuments },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [pickFromGallery, pickFromCamera, pickDocuments]);
  useEffect(() => {
    const fetchChat = async () => {
      await apiGet(`/chat/${peerId}`, {}, setChatData);
      let rec = null;
      await apiGet(`/user/${peerId}`, {}, (r) => (rec = r));
      if (!rec)
        await apiGet(`/get-user/${peerId}`, {}, (r) => (rec = r?.data || r));
      setReceiver(rec || null);
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        );
      });
    };
    fetchChat();

    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setPaddingBottom(20)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setPaddingBottom(80)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [peerId]);

  useEffect(() => {
    const sock = io(API_BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      forceNew: true,
    });
    socketRef.current = sock;
    if (user?._id) sock.emit("register", user._id);

    sock.on("update_user_status", ({ userId, online, lastSeen }) => {
      if (String(userId) === String(peerId)) {
        if (online) {
          setIsOnline(true);
          setLastSeen(null);
        }
        if (!online && lastSeen) {
          setIsOnline(false);
          setLastSeen(lastSeen);
        }
      }
    });

    sock.on("user_typing", ({ userId }) => {
      if (String(userId) === String(peerId)) setIsTyping(true);
    });

    sock.on("user_stop_typing", ({ userId }) => {
      if (String(userId) === String(peerId)) setIsTyping(false);
    });
    sock.on("receive_message", (data) => {
      if (
        String(data?.receiverId) === String(user?._id) ||
        String(data?.senderId) === String(user?._id) ||
        String(data?.senderId) === String(peerId) ||
        String(data?.receiverId) === String(peerId)
      ) {
        apiGet(`/chat/${peerId}`, {}, setChatData);
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          );
        });

        if (data && data._id) {
          sock.emit("message_delivered", {
            messageId: data._id,
            to: data.senderId || data.sender,
          });
          sock.emit("message_read", {
            messageId: data._id,
            to: data.senderId || data.sender,
          });
        }
      }
    });

    // Status update for messages (delivered/read)
    sock.on("message_status_update", ({ messageId, delivered, read }) => {
      if (!messageId) return;
      setChatData((prev) =>
        prev?.map((group) => ({
          ...group,
          messages: group.messages.map((m) =>
            m._id === messageId || m.id === messageId
              ? {
                ...m,
                delivered: delivered ?? m.delivered,
                read: read ?? m.read,
              }
              : m
          ),
        }))
      );
    });
    sock.on("user_online", ({ userId }) => {
      if (String(userId) === String(peerId)) setIsOnline(true);
    });
    sock.on("user_offline", ({ userId, lastSeen: ls }) => {
      if (String(userId) === String(peerId)) {
        setIsOnline(false);
        setLastSeen(ls || new Date());
      }
    });

    return () => {
      try {
        sock.disconnect();
      } catch { }
      socketRef.current = null;
    };
  }, [user?._id, peerId]);
  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed && attachments.length === 0) return;

    try {
      const formData = new FormData();

      formData.append("senderId", String(user?._id));
      formData.append("receiverId", String(peerId));

      if (trimmed) formData.append("content", trimmed);
      attachments.forEach((file, index) => {
        const name = file.name || `file-${Date.now()}-${index}`;
        const uri = normalizeFileUriForForm(file.uri);
        let type = guessMimeFromName(name) || "application/octet-stream";
        if (name.endsWith(".xls")) {
          type = "application/vnd.ms-excel";
        } else if (name.endsWith(".xlsx")) {
          type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        formData.append("files", {
          uri,
          name,
          type,
        });
      });



      const auth = await buildAuthHeaders(ctx);

      const res = await fetch(`${API_BASE_URL}/chat/${peerId}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...auth,
        },
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : null;

      if (!res.ok || !data?.success) {
        console.log("❌ UPLOAD FAILED → ", data);
        Alert.alert("Failed", data?.message || "Upload error.");
        return;
      }
      setMessage("");
      setAttachments([]);

      apiGet(`/chat/${peerId}`, {}, setChatData);
      socketRef.current?.emit("send_message", { to: peerId });

      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.log("🔥 UPLOAD ERROR → ", err);
      Alert.alert("Error", "Something went wrong while sending.");
    }
  };


  const emitTyping = () => {
    const sock = socketRef.current;
    if (!sock) return;
    try {
      sock.emit("typing", { userId: user._id, groupId: null, peerId });
    } catch { }
  };
  const emitStopTyping = () => {
    const sock = socketRef.current;
    if (!sock) return;
    try {
      sock.emit("stop_typing", { userId: user._id, groupId: null, peerId });
    } catch { }
  };

  const onChangeMessage = (text) => {
    setMessage(text);
    const now = Date.now();
    lastTypedAtRef.current = now;
    emitTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      const since = Date.now() - lastTypedAtRef.current;
      if (since >= 1200) {
        emitStopTyping();
        setIsTyping(false);
        if (socketRef.current && isOnline) {
          setIsOnline(true);
        }
      }
    }, 1400);
  };
  useEffect(() => {
    if (!chatData || !socketRef.current) return;

    const sock = socketRef.current;
    chatData.forEach((group) => {
      (group.messages || []).forEach((msg) => {
        const fromPeer =
          String(msg?.sender?._id || msg?.sender) === String(peerId) ||
          String(msg?.senderId) === String(peerId);
        const notDelivered = !msg.delivered && fromPeer;
        const notRead = !msg.read && fromPeer;
        if (notDelivered && msg._id) {
          sock.emit("message_delivered", {
            messageId: msg._id,
            to: msg.sender?._id || msg.senderId || peerId,
          });
          setChatData((prev) =>
            prev?.map((g) => ({
              ...g,
              messages: g.messages.map((m) =>
                m._id === msg._id ? { ...m, delivered: true } : m
              ),
            }))
          );
        }
        if (notRead && msg._id) {
          sock.emit("message_read", {
            messageId: msg._id,
            to: msg.sender?._id || msg.senderId || peerId,
          });
          setChatData((prev) =>
            prev?.map((g) => ({
              ...g,
              messages: g.messages.map((m) =>
                m._id === msg._id ? { ...m, read: true } : m
              ),
            }))
          );
        }
      });
    });
  }, [chatData]);
  const renderAvatar = (msg) => {
    const isMe =
      String(msg?.sender?._id || msg?.sender) === String(user?._id) ||
      msg?.sender === "me";
    const uri = isMe ? myAvatar : receiverAvatar;
    return uri ? (
      <Image source={{ uri }} style={styles.msgAvatar} />
    ) : (
      <Ionicons
        name="person-circle-outline"
        size={32}
        color="#888"
        style={{ marginHorizontal: 6 }}
      />
    );
  };

  const openPreview = (items, startIndex) => {
    setPreviewItems(items);
    setPreviewIndex(startIndex);
    setPreviewVisible(true);
  };

const MediaGrid = ({ items, isMine }) => (
  <View style={styles.gridWrap}>
    {items.map((att, i) => {
      const isImg = isImage(att.type, att.url);
      const isVid = isVideo(att.type, att.url);
      const onPress = () => openPreview(items, i);

      // IMAGE BLOCK
      if (isImg) {
        return (
          <Pressable key={i} onPress={onPress} style={styles.gridItem}>
            <Image
              source={{ uri: att.url }}
              style={[
                styles.gridImage,
                isMine ? styles.mediaMine : styles.mediaTheirs,
              ]}
            />

            {/* Download button on image */}
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() =>
                downloadAndOpen(att.url, att.name || `image-${Date.now()}.jpg`)
              }
            >
              <Ionicons name="download-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </Pressable>
        );
      }

      // VIDEO BLOCK
      if (isVid) {
        return (
          <Pressable key={i} onPress={onPress} style={styles.gridItem}>
            <View
              style={[
                styles.gridVideoBox,
                isMine ? styles.mediaMine : styles.mediaTheirs,
              ]}
            >
              <Video
                source={{ uri: att.url }}
                style={styles.gridVideo}
                resizeMode="cover"
                useNativeControls
              />

              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={40} color="#fff" />
              </View>

              {/* Download button on video */}
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() =>
                  downloadAndOpen(att.url, att.name || `video-${Date.now()}.mp4`)
                }
              >
                <Ionicons name="download-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </Pressable>
        );
      }

      return null;
    })}
  </View>
);


  const renderMessage = (msg) => {
    const isMe =
      String(msg?.sender?._id || msg?.sender) === String(user?._id) ||
      msg?.sender === "me";
    const bubbleStyle = isMe ? styles.myMessage : styles.theirMessage;
    const rowStyle = isMe ? styles.myRow : styles.theirRow;
    const textValue = msg.content || msg.text || "";

    const allAtt =
      Array.isArray(msg.attachments) && msg.attachments.length
        ? msg.attachments.map(normalizeServerAttachment).filter(Boolean)
        : [];
    const mediaAtt = allAtt.filter(
      (a) => isImage(a.type, a.url) || isVideo(a.type, a.url)
    );
    const fileAtt = allAtt.filter((a) => {
      const isImg = isImage(a.type, a.url);
      const isVid = isVideo(a.type, a.url);
      return !isImg && !isVid;
    });

    const showLinky = textValue && allAtt.length === 0;

    return (
      <View key={msg._id || msg.id} style={[styles.messageRow, rowStyle]}>
        {!isMe && renderAvatar(msg)}
        <View style={{ maxWidth: "78%" }}>
          {textValue ? (
            <View style={[styles.messageBubble, bubbleStyle]}>
              {showLinky ? (
                <LinkyText text={textValue} />
              ) : (
                <Text style={styles.messageText}>{textValue}</Text>
              )}
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>

                {isMe && (
                  <>
                    {msg.read ? (
                      <Ionicons name="checkmark-done" size={16} color="#34B7F1" style={styles.tickIcon} />
                    ) : msg.delivered ? (
                      <Ionicons name="checkmark-done" size={16} color="gray" style={styles.tickIcon} />
                    ) : (
                      <Ionicons name="checkmark" size={16} color="gray" style={styles.tickIcon} />
                    )}
                  </>
                )}
              </View>

            </View>
          ) : null}

          {mediaAtt.length > 0 && (
            <View style={[styles.messageBubble, bubbleStyle, { padding: 6 }]}>
              <MediaGrid items={mediaAtt} isMine={isMe} />
              <Text
                style={[
                  styles.timeText,
                  { paddingHorizontal: 2, paddingTop: 6 },
                ]}
              >
                {msg.time || new Date(msg.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          )}

          {fileAtt.map((att, idx) => (
            <View
              key={`file-${idx}`}
              style={[
                styles.fileBubble,
                isMe ? styles.myFileBubble : styles.theirFileBubble
              ]}
            >
              <View style={styles.fileRow}>
                <Ionicons name="document-text-outline" size={26} color="#555" />

                <Text style={styles.fileName} numberOfLines={1}>
                  {att.name}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    downloadAndOpen(att.url, att.name || att.url.split("/").pop())
                  }
                >
                  <Ionicons name="download-outline" size={24} color="#075E54" />
                </TouchableOpacity>

              </View>

              {/* Time inside bubble like WhatsApp */}
              <Text style={styles.fileTime}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}



        </View>
        {isMe && renderAvatar(msg)}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "height" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <Ionicons
          name="arrow-back"
          size={30}
          color="white"
          onPress={() => navigation.goBack()}
        />
        {receiverAvatar ? (
          <Image source={{ uri: receiverAvatar }} style={styles.avatar} />
        ) : (
          <Ionicons name="person-circle-outline" size={50} color="white" />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {receiver?.name || route?.params?.name || "User"}
          </Text>
          <Text style={{ fontSize: 12, color: "#fff" }}>
            {isTyping
              ? "Typing..."
              : isOnline
                ? "Online"
                : lastSeen
                  ? `Last seen ${timeAgo(lastSeen)}`
                  : "Last seen recently"}
          </Text>
        </View>
        <Ionicons name="videocam" size={24} color="#fff" style={styles.icon} />
        <Ionicons name="call" size={22} color="#fff" style={styles.icon} />
        <MaterialIcons name="more-vert" size={22} color="#fff" />
      </View>

      {/* Messages */}
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 10, paddingBottom }}
        enableOnAndroid
        onLayout={() => {
          InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            );
          });
        }}
        onContentSizeChange={() =>
          InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            );
          })
        }
      >
        {chatData == null ? (
          <ChatSkeleton />
        ) : chatData.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Ionicons name="chatbubbles-outline" size={40} color="#A0AEC0" />
            <Text style={{ color: "#718096", marginTop: 6 }}>Say hello 👋</Text>
          </View>
        ) : (
          chatData?.map((group) => (
            <View key={group.date}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{group.date}</Text>
              </View>
              {group?.messages?.map(renderMessage)}
            </View>
          ))
        )}
      </KeyboardAwareScrollView>

      {/* Pending attachments preview */}
      {attachments.length > 0 && (
        <View style={styles.previewContainer}>
          {attachments.map((file, idx) => {
            const mediaUrl = file.uri;
            if (isImage(file.type, mediaUrl)) {
              return (
                <View key={idx} style={styles.previewItem}>
                  <Image
                    source={{ uri: mediaUrl }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Ionicons name="close-circle" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              );
            }
            if (isVideo(file.type, mediaUrl)) {
              return (
                <View key={idx} style={styles.previewItem}>
                  <Video
                    source={{ uri: mediaUrl }}
                    style={styles.previewVideo}
                    useNativeControls
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Ionicons name="close-circle" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              );
            }
            return (
              <View key={idx} style={[styles.previewItem, styles.previewFile]}>
                <Ionicons
                  name="document-attach-outline"
                  size={22}
                  color="#333"
                />
                <Text style={styles.previewFileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Ionicons name="close-circle" size={20} color="red" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Composer */}
      <View
        style={[
          styles.inputBar,
          { paddingBottom: Platform.OS === "ios" ? 20 : 10 },
        ]}
      >
        <TouchableOpacity onPress={openAttachSheet}>
          <Ionicons name="attach-outline" size={26} color="#555" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={(txt) => {
            setMessage(txt);
            socketRef.current?.emit("typing", { userId: user._id, peerId });
          }}
          multiline
          onBlur={() =>
            socketRef.current?.emit("stop_typing", { userId: user._id, peerId })
          }
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!message.trim() && attachments.length === 0}
        >
          <Ionicons
            name="send"
            size={22}
            color={
              !message.trim() && attachments.length === 0 ? "#bbb" : "white"
            }
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  !message.trim() && attachments.length === 0
                    ? "#e0e0e0"
                    : "#075E54",
              },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Media/file lightbox */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setPreviewVisible(false)}
              style={styles.modalHeaderBtn}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {previewItems.length > 0 &&
              previewItems[previewIndex] &&
              (() => {
                const current = previewItems[previewIndex];
                const uri = current.url || current.uri;
                if (isImage(current.type, uri)) {
                  return (
                    <Image
                      source={{ uri }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  );
                }
                if (isVideo(current.type, uri)) {
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
                return (
                  <View style={styles.modalFileBox}>
                    <Ionicons
                      name="document-attach-outline"
                      size={48}
                      color="#fff"
                    />

                    <Text style={styles.modalFileName} numberOfLines={1}>
                      {current.name || (uri || "").split("/").pop() || "file"}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        downloadAndOpen(uri, current.name || uri.split("/").pop())
                      }
                    >
                      <Text style={styles.modalOpenBtn}>Download</Text>
                    </TouchableOpacity>

                  </View>

                );
              })()}
          </View>

          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setPreviewIndex((i) => Math.max(0, i - 1))}
              style={styles.modalHeaderBtn}
              disabled={previewIndex <= 0}
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={previewIndex <= 0 ? "#888" : "#fff"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setPreviewIndex((i) => Math.min(previewItems.length - 1, i + 1))
              }
              style={styles.modalHeaderBtn}
              disabled={previewIndex >= previewItems.length - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={26}
                color={
                  previewIndex >= previewItems.length - 1 ? "#888" : "#fff"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#075E54",
    padding: 10,
    paddingTop: 35,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 8 },
  name: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  status: { color: "#ddd", fontSize: 12 },
  icon: { marginHorizontal: 12 },

  dateContainer: {
    alignSelf: "center",
    backgroundColor: "#D1F4CC",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 10,
  },
  dateText: { fontSize: 12, color: "#444" },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 5,
    gap: 4,
  },
  myRow: { justifyContent: "flex-end" },
  theirRow: { justifyContent: "flex-start" },

  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: "25%",
    maxWidth: "80%",
    flexShrink: 1,
    flexWrap: "wrap",
    alignSelf: "flex-start",
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
    borderBottomRightRadius: 0,
    marginTop: 4,
    marginLeft: 50,
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#DCF8C6",
    borderBottomLeftRadius: 0,
    marginTop: 4,
    marginRight: 50,
  },
  messageText: {
    fontSize: 15,
    color: "#111",
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 20,
    wordBreak: "break-word",
    overflow: "hidden",
    minWidth: "80%",
    maxWidth: "80%",
  },

  timeText: {
    fontSize: 11,
    color: "#555",
    alignSelf: "flex-end",
    marginTop: 3,
    paddingTop: 2,
  },

  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 6,
    alignSelf: "flex-end",
  },

  previewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    backgroundColor: "#f8f8f8",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    marginBottom: 65,
  },
  previewItem: { position: "relative", margin: 4 },
  previewImage: { width: 90, height: 90, borderRadius: 8 },
  previewVideo: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  previewFile: {
    width: 160,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  previewFileName: { flex: 1, fontSize: 12, color: "#222" },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 10,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fff",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
  sendBtn: { padding: 10, borderRadius: 20, marginLeft: 6 },

  gridWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridItem: { width: 150, height: 150 },
  gridImage: { width: "100%", height: "100%", borderRadius: 10 },
  gridVideoBox: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  gridVideo: { width: "100%", height: "100%" },
  playOverlay: { position: "absolute", top: "40%", left: "40%", opacity: 0.8 },

  mediaImage: { width: 220, height: 220, borderRadius: 12 },
  mediaVideo: { width: 250, height: 200, backgroundColor: "#000" },
  mediaMine: { alignSelf: "flex-end" },
  mediaTheirs: { alignSelf: "flex-start" },
  fileTile: {
    width: 250,
    height: 80,
    backgroundColor: "#fefefe",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  fileName: { flex: 1, color: "#111" },
  fileOpen: { color: "#0645AD", fontWeight: "600" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  modalHeader: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderBtn: { padding: 6 },
  modalBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  modalImage: { width: "100%", height: "85%" },
  modalVideo: { width: "100%", height: "85%", backgroundColor: "#000" },
  modalFileBox: { alignItems: "center", gap: 8 },
  modalFileName: { color: "#fff", maxWidth: 300 },
  modalOpenBtn: { color: "#66B2FF", fontWeight: "700", marginTop: 8 },
  timeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 3,
  },

  tickIcon: {
    marginLeft: 4,
  },
  fileBubble: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  myFileBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 0,
  },

  theirFileBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 0,
  },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  fileName: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    maxWidth: 150,
  },

  fileTime: {
    fontSize: 10,
    color: "#777",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  downloadBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 20,
    zIndex: 10,
  },


});
