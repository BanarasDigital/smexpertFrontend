import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  LayoutAnimation,
  UIManager,
  Platform,
  ActionSheetIOS,
  Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { DataContext } from "../context";
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ManageGroupMembers({ route, navigation }) {
  const groupId = route?.params?.groupId ?? "";
  const { apiGet, apiPut } = useContext(DataContext);

  const [group, setGroup] = useState(null);
  const [branchUsers, setBranchUsers] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  const [imageUri, setImageUri] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [changes, setChanges] = useState({});
  /** Fetch Group **/
  const fetchGroupData = useCallback(
    async (skipUpdate = false) => {
      try {
        const res = await apiGet(`/group/${groupId}`);
        const g = res?.data?.data || res?.data?.group || res?.data || {};
        if (!skipUpdate && !editMode) {
          setGroup(g);
          setGroupName(g?.name || "");
          setImageUri(g?.groupImage || null);
        } else {
          setGroup(g);
        }
        const membersWithProfile = (g?.members || []).map((m) => ({
          _id: m._id,
          name: m.name,
          phone: m.phone,
          email: m.email,
          profileImage:
            m?.profileImage && m.profileImage.trim() !== ""
              ? m.profileImage
              : "https://via.placeholder.com/80",
        }));

        setCurrentMembers(membersWithProfile);
        const branchId = g?.branch?._id || g?.branchId;
        if (branchId) {
          const branchRes = await apiGet(`/admin/branches/${branchId}/users`);

          const branchUsersWithProfile = (branchRes?.users || []).map((u) => ({
            _id: u._id,
            name: u.name,
            phone: u.phone,
            email: u.email,
            profileImage:
              u?.profileImage && u.profileImage.trim() !== ""
                ? u.profileImage
                : "https://via.placeholder.com/80",
          }));

          setBranchUsers(branchUsersWithProfile);
        }
      } catch (err) {
        console.error("Group fetch error:", err);
        Alert.alert("Error", "Failed to fetch group details.");
      } finally {
        setLoading(false);
      }
    },
    [apiGet, groupId, editMode]
  );

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  /** Pick Image **/
  // ✅ Normalizes file path for Android/Expo
  const normalizeFileUri = (uri) => {
    if (!uri) return "";
    return Platform.OS === "android" ? uri.replace("file://", "") : uri;
  };

  // ✅ Ensure Photo Permissions
  const ensurePhotoPerms = async () => {
    try {
      const { status, canAskAgain } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === "granted" || status === "limited") return status;

      if (!canAskAgain) {
        Alert.alert(
          "Photos access blocked",
          "Enable Photos access in Settings to update your group image.",
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

  // ✅ Upload selected image
  // const uploadGroupImage = async (uri) => {
  //   try {
  //     const safeUri = normalizeFileUri(uri);
  //     const formData = new FormData();
  //     formData.append("groupImage", {
  //       uri: safeUri,
  //       name: "group.jpg",
  //       type: "image/jpeg",
  //     });

  //     setSaving(true);
  //     const res = await apiPut(`/groups/${groupId}/update`, formData, {
  //       "Content-Type": "multipart/form-data",
  //     });
  //     setSaving(false);

  //     if (res?.group) {
  //       setGroup((prev) => ({
  //         ...prev,
  //         groupImage: res.group.groupImage || safeUri,
  //       }));
  //       setImageUri(res.group.groupImage || safeUri);
  //       Alert.alert("Success", "Group image updated successfully!");
  //     } else {
  //       Alert.alert("Error", res?.message || "Failed to upload image.");
  //     }
  //   } catch (error) {
  //     console.error("Upload error:", error);
  //     Alert.alert("Error", "Image upload failed.");
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  // ✅ Pick image from gallery
const pickFromGallery = useCallback(async () => {
  try {
    // ✅ Request permission for both iOS and Android
    const { status, canAskAgain, accessPrivileges } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      if (canAskAgain) {
        Alert.alert(
          "Permission Required",
          "We need access to your photos to select a group image."
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "Please enable photo access in settings to upload images."
        );
      }
      return;
    }

    // ✅ Handle limited library (iOS 14+)
    if (
      Platform.OS === "ios" &&
      accessPrivileges === "limited" &&
      ImagePicker.presentLimitedLibraryPickerAsync
    ) {
      try {
        await ImagePicker.presentLimitedLibraryPickerAsync();
      } catch (err) {
        console.warn("Limited library picker error:", err);
      }
    }

    // ✅ Open Image Gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);

    // ✅ Upload selected image
    // await uploadGroupImage(uri);
  } catch (error) {
    console.error("pickFromGallery error:", error);
    Alert.alert("Error", "Failed to pick image from gallery.");
  }
}, []);


  // ✅ Pick image from camera
  const pickFromCamera = useCallback(async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== "granted") {
      Alert.alert("Permission required", "Please allow Camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    // await uploadGroupImage(uri);
  }, []);

const pickImage = useCallback(() => {
  if (Platform.OS === "ios") {
    // ✅ iOS: Native ActionSheet
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Choose from Gallery", "Take Photo"],
        cancelButtonIndex: 0,
        userInterfaceStyle: "light", 
      },
      async (buttonIndex) => {
        try {
          if (buttonIndex === 1) {
            await pickFromGallery();
          } else if (buttonIndex === 2) {
            await pickFromCamera();
          }
        } catch (err) {
          console.error("Image selection error:", err);
          Alert.alert("Error", "Unable to pick image.");
        }
      }
    );
  } else {
    // ✅ Android: Custom Alert dialog fallback
    Alert.alert("Select Image Source", "Choose an option", [
      { text: "📁 Gallery", onPress: async () => await pickFromGallery() },
      { text: "📷 Camera", onPress: async () => await pickFromCamera() },
      { text: "Cancel", style: "cancel" },
    ]);
  }
}, [pickFromGallery, pickFromCamera]);

  /** Save Changes **/
  const handleSave = async () => {
    if (!groupName.trim()) {
      return Alert.alert("Validation Error", "Please enter a group name");
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", groupName.trim());

      if (imageUri && !imageUri.startsWith("http")) {
        formData.append("groupImage", {
          uri: imageUri,
          name: "group.jpg",
          type: "image/jpeg",
        });
      }

      const res = await apiPut(`/groups/${groupId}/update`, formData, {
        "Content-Type": "multipart/form-data",
      });

      if (res?.success) {
        // ✅ Update UI instantly
        setGroup((prev) => ({
          ...prev,
          name: res.group?.name || groupName,
          groupImage: res.group?.groupImage || imageUri,
        }));

        setGroupName(res.group?.name || groupName);
        setImageUri(res.group?.groupImage || imageUri);

        Alert.alert("Success", "Group updated successfully");

        setEditMode(false);

        // ✅ Fetch latest data AFTER update
        fetchGroupData(true);
      } else {
        throw new Error(res?.error || "Update failed");
      }
    } catch (err) {
      console.error("Group update error:", err);
      Alert.alert("Error", "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  /** Tab Change **/
  const handleTabChange = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  /** ✅ WhatsApp-style Group Header **/
  const GroupTopBar = () => {
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
            {group?.name || "Group"}
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
              {currentMembers
                .slice(0, 3)
                .map((m) => m.name?.split(" ")[0])
                .join(", ")}
              {currentMembers.length > 3 ? "..." : ""}
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

  /** Filter **/
  const filteredMembers = useMemo(
    () =>
      currentMembers.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (u.phone || "").includes(search)
      ),
    [currentMembers, search]
  );

  const filteredBranchUsers = useMemo(
    () =>
      branchUsers.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (u.phone || "").includes(search)
      ),
    [branchUsers, search]
  );

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );

  /** Header content below TopBar **/
  const Header = (
    <>
      <View style={styles.groupCard}>
        {/* Edit Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut
            );
            setEditMode((prev) => !prev);
          }}
        >
          <Ionicons
            name={editMode ? "close-outline" : "create-outline"}
            size={22}
            color="#25D366"
          />
        </TouchableOpacity>

        {/* Group Image */}
        <View style={{ position: "relative" }}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.groupImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="people-circle-outline" size={100} color="#9ca3af" />
          )}

          {editMode && (
            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Ionicons name="camera-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.groupCreated}>You created this group</Text>
        <Text style={styles.memberCount}>
          Group • {currentMembers.length} members
        </Text>

        {editMode ? (
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
            style={styles.groupNameInput}
          />
        ) : (
          <Text style={styles.groupNameDisplay}>{groupName}</Text>
        )}

        {editMode && (
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#888"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder={
            activeTab === "members"
              ? "Search current members..."
              : "Search users to add..."
          }
          placeholderTextColor="#aaa"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => handleTabChange("members")}
          style={[
            styles.tabButton,
            activeTab === "members" && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "members" && styles.activeTabText,
            ]}
          >
            Current Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleTabChange("add")}
          style={[styles.tabButton, activeTab === "add" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "add" && styles.activeTabText,
            ]}
          >
            Add Members
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  /** Member Row **/
  const renderUserItem = (item, tabType) => {
    const isSelected = selectedToAdd.some((u) => u._id === item._id);
    const hasProfile = item?.profileImage && item.profileImage.trim() !== "";
    return (
      <TouchableOpacity style={styles.userRow}>
        {/* Profile image or fallback icon */}
        {hasProfile ? (
          <Image
            source={{ uri: item?.profileImage }}
            style={styles.memberImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person-circle-outline" size={40} color="#25D366" />
        )}
        <Text style={styles.userName}>
          {item.name || item.phone || "Unknown"}
        </Text>
        {tabType === "add" && (
          <Ionicons
            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={isSelected ? "#25D366" : "#ccc"}
          />
        )}
      </TouchableOpacity>
    );
  };

  const data = activeTab === "members" ? filteredMembers : filteredBranchUsers;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {GroupTopBar()}

      <FlatList
        ListHeaderComponent={Header}
        data={data}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const isMember = currentMembers.some((m) => m._id === item._id);
          const toggled = changes[item._id] ?? isMember;
          const hasProfile =
            item?.profileImage && item.profileImage.trim() !== "";
          const isAdmin =
            item.isAdmin ||
            (currentMembers.find((m) => m._id === item._id && m.isAdmin)
              ? true
              : false);

          return (
            <View style={styles.userRow}>
              {hasProfile ? (
                <Image
                  source={{ uri: item.profileImage }}
                  style={styles.memberImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={40}
                  color="#25D366"
                />
              )}

              <Text style={styles.userName}>
                {item.name || item.phone || "Unknown"}
              </Text>

              {/* ✅ Toggle (hidden for admins) */}
              {!isAdmin && (
                <Switch
                  value={toggled}
                  onValueChange={async () => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    const newState = !toggled;
                    setChanges((prev) => ({ ...prev, [item._id]: newState }));

                    try {
                      if (!newState) {
                        const res = await apiPut(`/groups/${groupId}/members`, {
                          membersToRemove: [item._id],
                        });

                        if (res?.success) {
                          console.log(`❌ ${item.name} removed successfully`);
                          Alert.alert(
                            "Removed",
                            `${item.name} removed from group.`
                          );
                          fetchGroupData(true); 
                        } else {
                          throw new Error("Remove failed");
                        }
                      } else {
                        console.log(`🕓 ${item.name} marked for addition`);
                      }
                    } catch (err) {
                      console.error("Toggle update failed:", err);
                      Alert.alert(
                        "Error",
                        "Failed to update member in database."
                      );
                    }
                  }}
                  trackColor={{ false: "#ccc", true: "#25D366" }}
                  thumbColor="#fff"
                />
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeTab === "members"
                ? "No members in this group yet."
                : "No users available to add."}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        extraData={{ activeTab, search, editMode, changes }}
      />

      {/* ✅ Save Changes Button */}
      {Object.keys(changes).length > 0 && (
        <TouchableOpacity
          style={{
            backgroundColor: "#25D366",
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 30,
            alignSelf: "center",
            marginBottom: 20,
            position: "absolute",
            bottom: 20,
          }}
          onPress={async () => {
            try {
              setSaving(true);
              const membersToAdd = Object.keys(changes).filter(
                (id) => changes[id]
              );
              const membersToRemove = Object.keys(changes).filter(
                (id) => !changes[id]
              );
              const res = await apiPut(`/groups/${groupId}/members`, {
                membersToAdd,
                membersToRemove,
              });
              if (res?.success) {
                Alert.alert("Success", "Group members updated successfully!");
                setChanges({});
                fetchGroupData(true);
              } else {
                throw new Error("Save failed");
              }
            } catch (err) {
              console.error("Save members error:", err);
              Alert.alert("Error", "Failed to update members.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** ✅ Styles **/
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#075E54",
    paddingTop: Platform.OS === "ios" ? 50 : 90,
    paddingBottom: 10,
    paddingHorizontal: 12,
    elevation: 4,
  },
  backButton: { marginRight: 10 },
  groupAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 10,
  },
  groupTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 2,
  },
  memberAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#075E54",
  },
  memberNames: {
    color: "#d9fdd3",
    fontSize: 12,
    marginLeft: 5,
    flexShrink: 1,
    fontWeight: "bold",
  },
  icon: { marginLeft: 15 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  groupCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 14,
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  editButton: { position: "absolute", right: 15, top: 15, zIndex: 2 },
  groupImage: { width: 100, height: 100, borderRadius: 50 },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#25D366",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  groupCreated: { marginTop: 10, color: "#555", fontSize: 15 },
  memberCount: { color: "#777", fontSize: 13 },
  groupNameDisplay: {
    marginTop: 8,
    fontSize: 18,
    color: "#111",
    fontWeight: "600",
  },
  groupNameInput: {
    marginTop: 10,
    width: "70%",
    textAlign: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    fontSize: 18,
    color: "#111",
    paddingBottom: 4,
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#25D366",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 10,
    paddingVertical: 8,
  },
  tabButton: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 8 },
  activeTab: { backgroundColor: "#e8f8ef" },
  tabText: { color: "#555", fontSize: 17, fontWeight: "bold" },
  activeTabText: { color: "#25D366", fontWeight: "bold" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#eee",
  },
  userName: { flex: 1, fontSize: 16, color: "#111", fontWeight: "bold" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: { marginTop: 10, color: "#777", fontSize: 15 },
});
