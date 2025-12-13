// pages/Payment/PaymentUpdate.js — Final Version (No Groups)
import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  Alert, FlatList, Image, KeyboardAvoidingView, Modal,
  Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import { DataContext } from "../../context";
import { useNavigation } from "@react-navigation/native";
const METHODS = ["upi", "cash", "card", "bank", "wallet"];

export default function PaymentUpdate() {
  const { apiGet, apiPostForm, apiDelete } = useContext(DataContext);
  const listRef = useRef(null);
  const navigation = useNavigation();
  // form
  const [imageUri, setImageUri] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [method, setMethod] = useState("upi");

  // data
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // preview & search
  const [preview, setPreview] = useState(null);
  const [query, setQuery] = useState("");

  const formatINR = useCallback(
    (n) => (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
    []
  );

  const loadPayments = useCallback(async () => {
    try {
      const res = await apiGet(`/payments`);
      setPayments(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [apiGet]);

  useFocusEffect(useCallback(() => { loadPayments(); }, [loadPayments]));

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted")
      return Alert.alert("Permission required", "Allow Photo Library access.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9,
    });
    if (!result.canceled && result.assets?.length)
      setImageUri(result.assets[0].uri);
  }, []);

  const sanitizeAmount = useCallback((v) => {
    const clean = v.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : clean;
  }, []);

  const resetForm = useCallback(() => {
    Keyboard.dismiss();
    setImageUri(null); setClientName(""); setClientPhone("");
    setSource(""); setAmount(""); setTxId(""); setMethod("upi");
  }, []);

  const savePayment = useCallback(async () => {
    if (!clientName.trim() || !clientPhone.trim() || !source.trim() ||
      !amount.trim() || !txId.trim() || !method || !imageUri)
      return Alert.alert("Missing info", "All fields including image are required.");
    if (!/^\d{10}$/.test(clientPhone.trim()))
      return Alert.alert("Invalid phone", "Enter a valid 10-digit number.");

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0)
      return Alert.alert("Invalid amount", "Enter a valid amount.");

    const fd = new FormData();
    fd.append("clientName", clientName.trim());
    fd.append("clientPhone", clientPhone.trim());
    fd.append("source", source.trim());
    fd.append("amount", String(amt));
    fd.append("txId", txId.trim());
    fd.append("method", method.trim());
    fd.append("paymentImage", { uri: imageUri, name: "payment.jpg", type: "image/jpeg" });

    try {
      setSaving(true);
      const res = await apiPostForm("/payments", fd);
      if (!res?.success) return Alert.alert("Error", res?.message || "Failed to save payment.");
      resetForm();
      await loadPayments();
      Alert.alert("Success", "Payment saved.");
    } catch {
      Alert.alert("Error", "Failed to save payment.");
    } finally {
      setSaving(false);
    }
  }, [apiPostForm, clientName, clientPhone, source, amount, txId, method, imageUri, loadPayments, resetForm]);

  const deletePayment = useCallback(async (id) => {
    if (!id) return;
    Alert.alert("Delete payment", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const res = await apiDelete(`/payments/${id}`);
            if (!res?.success) return Alert.alert("Error", res?.message || "Failed to delete payment.");
            await loadPayments();
          } catch {
            Alert.alert("Error", "Failed to delete payment.");
          }
        },
      },
    ]);
  }, [apiDelete, loadPayments]);

  //  const buildReceiptHtml = useCallback((item, hideSensitive = false) => {
  //    const details = [
  //      ...(!hideSensitive
  //        ? [
  //            ["Client", item.clientName || "-"],
  //            ["Phone", item.clientPhone ? `+91 ${item.clientPhone}` : "-"],
  //          ]
  //        : []),
  //      ["Source", item.source || "-"],
  //      ["Amount", `₹${formatINR(item.amount)}`],
  //      ["Txn ID", item.txId || "-"],
  //      ["Method", (item.method || "").toUpperCase()],
  //      ["Date", new Date(item.createdAt || Date.now()).toLocaleString()],
  //    ];
  //
  //    return `
  //      <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
  //      <style>
  //        body{font-family:-apple-system,Roboto,Arial;padding:24px;background:#0b1220;}
  //        .card{max-width:760px;margin:0 auto;background:#0f172a;border:1px solid #1f2a44;border-radius:14px;overflow:hidden}
  //        .hero img{width:100%;display:block;border-bottom:1px solid #1f2a44;}
  //        .head{padding:16px 18px;background:#111827;color:#e6eefc;font-weight:800;text-align:center}
  //        .section{padding:18px}
  //        .row{display:flex;justify-content:space-between;color:#e6eefc;margin-top:6px;gap:10px}
  //        .label{color:#9fb1cc}
  //        .value{font-weight:700;word-break:break-word}
  //      </style></head>
  //      <body>
  //        <div class="card">
  //          ${item.imageUrl ? `<div class="hero"><img src="${item.imageUrl}" alt="Receipt"/></div>` : ``}
  //          <div class="head">Payment Receipt</div>
  //          <div class="section">
  //            ${details.map(([k,v])=>`<div class='row'><div class='label'>${k}</div><div class='value'>${v}</div></div>`).join("")}
  //          </div>
  //        </div>
  //      </body></html>`;
  //  }, [formatINR]);
  //
  //  const downloadPayment = useCallback(async (item) => {
  //    try {
  //      const html = buildReceiptHtml(item, false);
  //      const { uri } = await Print.printToFileAsync({ html });
  //      if (await Sharing.isAvailableAsync())
  //        await Sharing.shareAsync(uri, { dialogTitle: "Share Receipt PDF" });
  //    } catch {
  //      Alert.alert("Error", "Could not generate PDF.");
  //    }
  //  }, [buildReceiptHtml]);
  //
  //  const sendPayment = useCallback(async (item) => {
  //    try {
  //      const html = buildReceiptHtml(item, true); // hide sensitive info
  //      const { uri } = await Print.printToFileAsync({ html });
  //      if (await Sharing.isAvailableAsync())
  //        await Sharing.shareAsync(uri, { dialogTitle: "Send Receipt" });
  //      else Alert.alert("Unavailable", "Sharing not available on this device.");
  //    } catch {
  //      Alert.alert("Error", "Could not share receipt.");
  //    }
  //  }, [buildReceiptHtml]);
  // const buildReceiptHtml = useCallback((item, hideSensitive = false) => {
  //   const details = [
  //     ["Client", item.clientName || "-"],
  //     ["Phone", item.clientPhone ? `+91 ${item.clientPhone}` : "-"],
  //     ["Source", item.source || "-"],
  //     ["Amount", `₹${formatINR(item.amount)}`],
  //     ["Transaction ID", item.txId || "-"],
  //     ["Method", (item.method || "").toUpperCase()],
  //     ["Date", new Date(item.createdAt || Date.now()).toLocaleString()],
  //   ];

  //   return `
  //     <html>
  //       <head>
  //         <meta name="viewport" content="width=device-width, initial-scale=1" />
  //         <style>
  //           body {
  //             font-family: -apple-system, Roboto, Arial;
  //             padding: 24px;
  //             background: #0b1220;
  //             color: #e6eefc;
  //           }
  //           .card {
  //             max-width: 760px;
  //             margin: 0 auto;
  //             background: #0f172a;
  //             border: 1px solid #1f2a44;
  //             border-radius: 14px;
  //             overflow: hidden;
  //           }
  //           .hero img {
  //             width: 100%;
  //             height: auto;
  //             display: block;
  //             border-bottom: 1px solid #1f2a44;
  //             object-fit: cover;
  //           }
  //           .head {
  //             padding: 16px 18px;
  //             background: #111827;
  //             color: #e6eefc;
  //             font-weight: 800;
  //             text-align: center;
  //           }
  //           .section { padding: 18px; }
  //           .row {
  //             display: flex;
  //             justify-content: space-between;
  //             color: #e6eefc;
  //             margin-top: 6px;
  //             gap: 10px;
  //           }
  //           .label { color: #9fb1cc; font-size: 14px; }
  //           .value { font-weight: 700; word-break: break-word; }
  //         </style>
  //       </head>
  //       <body>
  //         <div class="card">
  //           ${item.imageUrl ? `<div class="hero"><img src="${item.imageUrl}" alt="Receipt"/></div>` : ""}
  //           <div class="head">Payment Receipt</div>
  //           <div class="section">
  //             ${details.map(([k,v]) => `
  //               <div class='row'>
  //                 <div class='label'>${k}</div>
  //                 <div class='value'>${v}</div>
  //               </div>`).join("")}
  //           </div>
  //         </div>
  //       </body>
  //     </html>`;
  // }, [formatINR]);
  const buildReceiptHtml = useCallback(
    (item) => {
      const details = [
        ["Source", item.source || "-"],
        ["Amount", `₹${formatINR(item.amount)}`],
        ["Transaction ID", item.txId || "-"],
        ["Method", (item.method || "").toUpperCase()],
        ["Date", new Date(item.createdAt || Date.now()).toLocaleString()],
      ];

      return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              font-family: -apple-system, Roboto, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #0b1220;
              color: #e6eefc;
            }
            // .container {
            //   width: 210mm;
            //   min-height: 297mm;
            //   padding: 20mm;
            //   box-sizing: border-box;
            //   background: #0f172a;
            //   display: flex;
            //   flex-direction: column;
            //   justify-content: flex-start;
            //   align-items: center;
            // }
            .card {
              width: 100%;
              border: 1px solid #1f2a44;
              border-radius: 14px;
              overflow: hidden;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            .hero img {
              width: 100%;
              height: 700px;
              display: block;
              border-bottom: 1px solid #1f2a44;
              object-fit: cover;
            }
            .head {
              padding: 16px;
              background: #111827;
              text-align: center;
              color: #e6eefc;
              font-weight: 800;
              font-size: 20px;
            }
            .section {
              padding: 18px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-top: 6px;
              gap: 10px;
              font-size: 14px;
            }
            .label {
              color: #9fb1cc;
              font-weight: 600;
            }
            .value {
              color: #e6eefc;
              font-weight: 700;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              ${item.imageUrl ? `<div class="hero"><img src="${item.imageUrl}" alt="Receipt" /></div>` : ""}
              <div class="head">Payment Receipt</div>
              <div class="section">
                ${details
          .map(
            ([k, v]) => `
                    <div class="row">
                      <div class="label">${k}</div>
                      <div class="value">${v}</div>
                    </div>`
          )
          .join("")}
              </div>
            </div>
          </div>
        </body>
      </html>`;
    },
    [formatINR]
  );


  // ✅ Download / Share PDF
  const downloadPayment = useCallback(async (item) => {
    try {
      const html = buildReceiptHtml(item);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(uri, { dialogTitle: "Share Receipt PDF" });
    } catch {
      Alert.alert("Error", "Could not generate PDF.");
    }
  }, [buildReceiptHtml]);
  // ✅ Generate and Preview PDF before sending
  const previewAndSendPayment = useCallback(async (item) => {
    try {
      const html = buildReceiptHtml(item, true); // hide sensitive data
      const { uri } = await Print.printToFileAsync({ html });

      // Open PDF preview before sending
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        Alert.alert(
          "Preview Receipt",
          "Would you like to preview before sending?",
          [
            {
              text: "Preview",
              onPress: async () => {
                await Sharing.shareAsync(uri, { dialogTitle: "Preview Receipt PDF" });
                // After preview, navigate to chat selection
                navigation.navigate("SelectChat", {
                  pdfUri: uri,
                  meta: {
                    clientName: item.clientName,
                    amount: formatINR(item.amount),
                    txId: item.txId,
                  },
                });
              },
            },
            {
              text: "Send Directly",
              onPress: () => {
                navigation.navigate("SelectChat", {
                  pdfUri: uri,
                  meta: {
                    clientName: item.clientName,
                    amount: formatINR(item.amount),
                    txId: item.txId,
                  },
                });
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        navigation.navigate("SelectChat", { pdfUri: uri });
      }
    } catch (error) {
      console.error("PDF Preview Error:", error);
      Alert.alert("Error", "Could not generate or preview PDF.");
    }
  }, [buildReceiptHtml, navigation, formatINR]);

  // ✅ Send to Chat Page
  const sendPayment = useCallback(
    async (item) => {
      try {
        const receiptHtml = buildReceiptHtml(item, true);
        navigation.navigate("Chats", {
          from: "Payment",
          receiptHtml,
          imageUrl: item.imageUrl || null,
          meta: {
            clientName: item.clientName,
            amount: formatINR(item.amount),
            txId: item.txId,
            method: item.method,
          },
        });
      } catch (err) {
        Alert.alert("Error", "Navigation failed: " + err.message);
      }
    },
    [navigation, buildReceiptHtml, formatINR]
  );
  const openPreview = (item) => setPreview(item);
  const closePreview = () => setPreview(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      (p.clientName || "").toLowerCase().includes(q) ||
      (p.clientPhone || "").toLowerCase().includes(q) ||
      (p.txId || "").toLowerCase().includes(q)
    );
  }, [payments, query]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [filtered]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ref={listRef}
          data={filtered}
          keyExtractor={(i) => i._id}
          refreshing={loading}
          onRefresh={loadPayments}
          contentInsetAdjustmentBehavior="always"
          ListFooterComponent={<View style={{ height: 24 }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowSpace}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(item.clientName || "?")[0]}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.clientName}</Text>
                    <Text style={styles.cardSub}>+91 {item.clientPhone}</Text>
                  </View>
                </View>
                <View style={styles.amountPill}>
                  <Ionicons name="cash-outline" size={16} color="#0f172a" />
                  <Text style={styles.amountPillText}>₹{formatINR(item.amount)}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Meta label="Source" value={item.source} />
                <Meta label="Txn ID" value={item.txId} />
                <Meta label="Method" value={(item.method || "").toUpperCase()} />
              </View>

              {item.imageUrl ? (
                <TouchableOpacity onPress={() => openPreview(item)} style={{ marginTop: 12 }}>
                  <Image source={{ uri: item.imageUrl }} style={styles.bigThumb} />
                </TouchableOpacity>
              ) : null}

              <View style={styles.actionBar}>
                <IconBtn name="eye-outline" label="View" onPress={() => openPreview(item)} />
                <IconBtn name="download-outline" label="Download" onPress={() => downloadPayment(item)} />
                {/* <IconBtn name="send-outline" label="Send" onPress={() => sendPayment(item)} /> */}
                <IconBtn name="trash-outline" label="Delete" onPress={() => deletePayment(item._id)} danger />
              </View>
            </View>
          )}
          ListHeaderComponent={
            <View>
              <Text style={styles.title}>🧾 New Payment</Text>
              <View style={styles.form}>
                <LabeledInput label="Client Name *" value={clientName} onChangeText={setClientName} />
                <LabeledInput label="Client Phone Number *" value={clientPhone} keyboardType="number-pad" maxLength={10} onChangeText={setClientPhone} />
                <Text style={styles.label}>Receipt Image *</Text>
                <View style={styles.imageRow}>
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> :
                    <View style={styles.imgPlaceholder}><Text style={styles.placeholderText}>Preview</Text></View>}
                  <TouchableOpacity onPress={pickImage} style={styles.pickButton}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#dce7ff" />
                    <Text style={styles.pickText}>{imageUri ? "Change File" : "Upload File"}</Text>
                  </TouchableOpacity>
                </View>
                <LabeledInput label="Source Name *" value={source} onChangeText={setSource} />
                <LabeledInput label="Amount (₹) *" value={amount} keyboardType="numeric" onChangeText={(v) => setAmount(sanitizeAmount(v))} />
                <LabeledInput label="Transaction ID *" value={txId} autoCapitalize="characters" onChangeText={setTxId} />
                <Text style={styles.label}>Payment Method *</Text>
                <View style={styles.chipRow}>
                  {METHODS.map((m) => {
                    const active = method === m;
                    return (
                      <TouchableOpacity key={m} style={[styles.chip, active && styles.chipActive]} onPress={() => setMethod(m)}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.toUpperCase()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                  <Secondary onPress={resetForm} text="Reset" />
                  <Primary onPress={savePayment} text={saving ? "Saving…" : "Save Payment"} disabled={saving} />
                </View>
              </View>

              <View style={styles.toolbar}>
                <View style={[styles.search, { flex: 1 }]}>
                  <Ionicons name="search-outline" size={16} color="#9fb1cc" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search client, phone or Txn…"
                    placeholderTextColor="#7a8ca6"
                    style={{ color: "#e6eefc", flex: 1 }}
                  />
                </View>
                <View style={styles.totalPill}><Text style={styles.totalText}>Total: ₹{formatINR(totalAmount)}</Text></View>
              </View>

              <Text style={styles.subTitle}>Saved Payments ({filtered.length})</Text>
            </View>
          }
        />

        {/* Modal View */}
        <Modal visible={!!preview} transparent animationType="slide" onRequestClose={closePreview}>
          <View style={styles.backdrop}>
            <View style={styles.modal}>
              <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
                {preview?.imageUrl ? (
                  <Image source={{ uri: preview.imageUrl }} style={styles.modalImage} />
                ) : (
                  <View style={[styles.imgPlaceholder, { width: "100%", height: 160 }]}><Text style={styles.placeholderText}>No Image</Text></View>
                )}
                <Text style={styles.modalTitle}>Payment Details</Text>
                {[
                  ["Client", preview?.clientName],
                  ["Phone", `+91 ${preview?.clientPhone}`],
                  ["Source", preview?.source],
                  ["Amount", `₹ ${formatINR(preview?.amount)}`],
                  ["Transaction ID", preview?.txId],
                  ["Method", (preview?.method || "").toUpperCase()],
                  ["Date", new Date(preview?.createdAt).toLocaleString()],
                ].map(([k, v]) => (
                  <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 4 }}>
                    <Text style={styles.label}>{k}</Text>
                    <Text style={styles.value}>{v}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Primary onPress={() => downloadPayment(preview)} text="Download PDF" />
                {/* <Secondary onPress={() => sendPayment(preview)} text="Send" /> */}
                {/* <Secondary onPress={() => previewAndSendPayment(preview)} text="Send" /> */}
                <Secondary onPress={closePreview} text="Close" />
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Meta = ({ label, value }) => (
  <View style={styles.metaBox}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue} numberOfLines={1}>{value || "-"}</Text>
  </View>
);
const IconBtn = ({ name, label, onPress, danger }) => (
  <TouchableOpacity onPress={onPress} style={styles.iconAction}>
    <Ionicons name={name} size={18} color={danger ? "#fecaca" : "#dbeafe"} />
    <Text style={styles.iconText}>{label}</Text>
  </TouchableOpacity>
);
const Primary = ({ onPress, text, disabled }) => (
  <TouchableOpacity style={[styles.primaryButton, disabled && { opacity: 0.7 }]} onPress={onPress} disabled={disabled}>
    <Text style={styles.primaryText}>{text}</Text>
  </TouchableOpacity>
);
const Secondary = ({ onPress, text }) => (
  <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
    <Text style={styles.secondaryText}>{text}</Text>
  </TouchableOpacity>
);
const LabeledInput = (props) => (
  <View style={{ marginTop: 6 }}>
    <Text style={styles.label}>{props.label}</Text>
    <TextInput {...props} style={styles.input} placeholderTextColor="#7a8ca6" />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1220" },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", padding: 16 },
  label: { color: "#9fb1cc", fontWeight: "600" },
  form: { paddingHorizontal: 16, paddingBottom: 24 },
  input: { borderWidth: 1, borderColor: "#1f2a44", backgroundColor: "#0f172a", color: "#e6eefc", borderRadius: 8, padding: 10, marginTop: 6 },
  imageRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 },
  pickButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1d4ed8", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  pickText: { color: "#fff", fontWeight: "600" },
  preview: { width: 80, height: 80, borderRadius: 8, borderColor: "#1f2a44", borderWidth: 1 },
  imgPlaceholder: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#7a8ca6" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  chip: { borderWidth: 1, borderColor: "#1f2a44", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#9fb1cc" },
  chipTextActive: { color: "#fff" },
  primaryButton: { flex: 1, backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryButton: { flex: 1, backgroundColor: "#1f2a44", padding: 12, borderRadius: 8, alignItems: "center" },
  secondaryText: { color: "#e6eefc", fontWeight: "600" },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, gap: 6 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1f2a44", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  totalPill: { backgroundColor: "#1e40af", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  totalText: { color: "#fff", fontSize: 16, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 6 },
  subTitle: { color: "#9fb1cc", fontWeight: "700", fontSize: 16, paddingHorizontal: 16, marginTop: 10 },
  card: { backgroundColor: "#0f172a", marginHorizontal: 16, marginTop: 12, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1f2a44" },
  rowSpace: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#dce7ff", fontWeight: "700" },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cardSub: { color: "#9fb1cc", fontSize: 13 },
  amountPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#93c5fd", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  amountPillText: { color: "#0f172a", fontWeight: "700" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaBox: { flex: 1, paddingRight: 8 },
  metaLabel: { color: "#9fb1cc", fontSize: 12 },
  metaValue: { color: "#e6eefc", fontWeight: "600", fontSize: 13 },
  bigThumb: { width: "100%", height: 180, borderRadius: 10, borderColor: "#1f2a44", borderWidth: 1 },
  actionBar: { flexDirection: "row", justifyContent: "space-around", paddingTop: 8 },
  iconAction: { alignItems: "center" },
  iconText: { color: "#dbeafe", fontSize: 12, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { width: "100%", backgroundColor: "#0f172a", borderRadius: 10, padding: 16 },
  modalImage: { width: "100%", height: 180, borderRadius: 10 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center", marginVertical: 8 },
  value: { color: "#e6eefc", fontWeight: "700" },
});
