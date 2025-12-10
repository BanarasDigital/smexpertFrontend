import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "./config";
import { replace } from "./navserviceRef";
import Toast from "react-native-toast-message";
import React, { createContext, useState } from "react";

const DataContext = createContext();

const DataProviderFuncComp = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [groupId, setGroupId] = useState(null);

  /*** Check and refresh session before any API call */
  const checkSession = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) {
        replace("Login");
        return null;
      }

      const res = await axios.post(`${API_BASE_URL}/get-access-token/`, {
        refreshToken,
      });

      const freshToken = res?.data?.accessToken || null;

      if (freshToken) {
        setToken(freshToken);

        if (res.data?.my_user) {
          const u = res.data.my_user;
          setUser(u);
          setUserId(u?._id || null);
          setGroupId(u?.groupId || null);
        }

        return freshToken;
      } else {
        setToken(null);
        await AsyncStorage.removeItem("refreshToken");
        replace("Login");
        return null;
      }
    } catch (error) {
      console.log("Session check error:", error?.message);
      setToken(null);
      await AsyncStorage.removeItem("refreshToken");
      replace("Login");
      return null;
    } finally {
      setLoading(false);
    }
  };
  const apiGet = async (
    endpoint,
    params = {},
    setData = null,
    _unused = null,
    showToast = true
  ) => {
    try {
      const freshToken = await checkSession();
      if (!freshToken) return null;

      const res = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${freshToken}` },
        params,
        timeout: 10000,
      });

      const data = res?.data;
      if (typeof setData === "function") setData(data);
      return data;
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong. Please try again.";
      if (showToast) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: message,
        });
      }
      return null;
    }
  };
// 📌 Add this in DataContext *below apiPost*
const apiPostPublic = async (endpoint, body = {}, showToast = true) => {
  try {
    const res = await axios.post(`${API_BASE_URL}${endpoint}`, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });
    return res?.data;
  } catch (error) {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong.";

    if (showToast) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: message,
      });
    }
    return null;
  }
};

  const apiPost = async (
    endpoint,
    body = {},
    setDataUser = false,
    showToast = true
  ) => {
    try {
      const freshToken = await checkSession();
      if (!freshToken) return null;

      const res = await axios.post(`${API_BASE_URL}${endpoint}`, body, {
        headers: {
          Authorization: `Bearer ${freshToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const data = res?.data;

      if (setDataUser && data?.user) {
        setUser(data.user);
        setUserId(data.user._id || null);
        setGroupId(data.user.groupId || null);
      }

      return data;
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong. Please try again.";
      if (showToast) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: message,
        });
      }
      return null;
    }
  };
  const apiPostForm = async (endpoint, formData, showToast = true) => {
    try {
      const freshToken = await checkSession();
      if (!freshToken) return null;
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
        headers: {
          Authorization: `Bearer ${freshToken}`,
          "Content-Type": "multipart/form-data",
        },
      });
      return res?.data;
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || "Something went wrong.";
      if (showToast) Toast.show({ type: "error", text1: "Error", text2: message });
      return null;
    }
  };
  /*** Optional: PUT with session check (used by updateProfile) */
  const apiPut = async (
    endpoint,
    body = {},
    headers = {},
    showToast = true
  ) => {
    try {
      const freshToken = await checkSession();
      if (!freshToken) return null;

      const res = await axios.put(`${API_BASE_URL}${endpoint}`, body, {
        headers: {
          Authorization: `Bearer ${freshToken}`,
          ...headers,
        },
        timeout: 10000,
      });

      return res?.data;
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong. Please try again.";
      if (showToast) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: message,
        });
      }
      return null;
    }
  };

  /*** Register user */
  const registerUser = async (userData) => {
    const res = await apiPost("/register/", userData, true);
    if (res?.user && res?.refreshToken) {
      await AsyncStorage.setItem("refreshToken", res.refreshToken);
      setUser(res.user);
      setUserId(res.user._id || null);
      setGroupId(res.user.groupId || null);
      setToken(res.accessToken || null);
      Toast.show({ type: "success", text1: "Registration Successful" });
      return res.user;
    }
    return null;
  };

  /*** Logout */
const logoutFunc = async () => {
  try {
    await apiPost("/logout/", { userId }, false, false);
  } catch (err) {
    console.log("Logout error:", err);
  } finally {
    setToken(null);
    setUser(null);
    setUserId(null);
    setGroupId(null);
    await AsyncStorage.removeItem("refreshToken");
    navigation.replace("Login");
  }
};

  /*** Create a new group */
  const createGroup = async (groupData) => {
    const res = await apiPost("/create-group", groupData);
    if (res?.success) {
      Toast.show({ type: "success", text1: "Group created successfully" });
    }
    return res;
  };

  /*** Convenience wrappers */
  const getUserGroups = async () => {
    return await apiGet("/get-group-conversation");
  };

  const getUserGroupIds = async () => {
    return await apiGet(`/get-group-userGroup/${userId}`);
  };

  const fetchUserGroups = async (uid) => {
    const targetId = uid || userId;
    if (!targetId) return [];
    try {
      const freshToken = await checkSession();
      if (!freshToken) return [];
      const res = await axios.get(
        `${API_BASE_URL}/groups/by-user/${targetId}`,
        {
          headers: { Authorization: `Bearer ${freshToken}` },
          timeout: 10000,
        }
      );
      return Array.isArray(res.data) ? res.data : res?.data?.data || [];
    } catch {
      return [];
    }
  };

  /*** Profile update (multipart) */
  const updateProfile = async (formData) => {
    const data = await apiPut("/profile/update", formData, {
      "Content-Type": "multipart/form-data",
    });

    if (data?.user) {
      setUser(data.user);
      setUserId(data.user._id || null);
      setGroupId(data.user.groupId || null);
    }

    if (!data) {
      Toast.show({
        type: "error",
        text1: "Profile update failed",
      });
    }

    return data;
  };
   const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
  };
  const apiDelete = async (endpoint, showToast = true) => {
    try {
      const freshToken = await checkSession();
      if (!freshToken) return null;

      const res = await axios.delete(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      return res?.data;
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || "Something went wrong.";
      if (showToast) Toast.show({ type: "error", text1: "Error", text2: message });
      return null;
    }
  };
  return (
    <DataContext.Provider
      value={{
        token,
        setToken,
        user,
        setUser,
        loading,
        setLoading,
        userId,
        setUserId,
        groupId,
        setGroupId,
        checkSession,
        apiGet,
        apiPost,
        fetchUserGroups,
        updateProfile,
        logoutFunc,
        getUserGroupIds,
        getUserGroups,
        apiDelete,
        apiPut,
        getFileUrl,
        apiPostForm,
        apiPostPublic,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export { DataProviderFuncComp, DataContext };
