import React, { useContext, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput,
    Linking,
    Modal,
    Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { DataContext } from "../context";
import { API_BASE_URL } from "../config";
import LeadFormModal from "../component/LeadFormModal";
import LeadTable from "../component/LeadTable";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
const STATUS_STYLES = {
    new: { bg: "#E5F3FF", text: "#0A84FF", label: "New" },
    in_progress: { bg: "#EDE9FE", text: "#5B21B6", label: "In Progress" },
    interested: { bg: "#DCFCE7", text: "#166534", label: "Interested" },
    follow_up: { bg: "#FEF3C7", text: "#92400E", label: "Follow Up" },
    converted: { bg: "#D1FAE5", text: "#047857", label: "Converted" },
    dropped: { bg: "#FEE2E2", text: "#B91C1C", label: "Dropped" },
    unassigned: { bg: "#F3F4F6", text: "#4B5563", label: "Unassigned" },
    not_interested: { bg: "#F3F4F6", text: "#3a000dff", label: "Not Interested" },
};
const STATUS_ROWS = [
    ["new", "in_progress", "interested"],
    ["follow_up", "converted", "dropped"],
    ["unassigned", "not_interested"],
];

const PAGE_SIZE = 20;
const OptionModal = ({ visible, title, options, selected, onSelect, onClose }) => (
    <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{title}</Text>

                <ScrollView style={{ maxHeight: 280 }}>
                    {options.map((op, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => {
                                onSelect(op.value);
                                onClose();
                            }}
                            style={styles.modalOption}
                        >
                            <Text
                                style={{
                                    color: selected === op.value ? "#0A84FF" : "#111827",
                                    fontWeight: selected === op.value ? "700" : "500",
                                }}
                            >
                                {op.label}
                            </Text>
                        </TouchableOpacity>
                    ))}

                </ScrollView>

                <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                    <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

export default function LeadPage({ navigation }) {
    const { apiGet, apiPostForm, apiPost, apiPut, apiDelete, checkSession } = useContext(DataContext);

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [selectedSource, setSelectedSource] = useState("");
    const [selectedSegment, setSelectedSegment] = useState("");

    const [statusFilter, setStatusFilter] = useState("");

    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState("createdAt");
    const [sortDir, setSortDir] = useState("desc");

    const [expanded, setExpanded] = useState({});
    const [viewMode, setViewMode] = useState("dashboard");

    const [formVisible, setFormVisible] = useState(false);
    const [formMode, setFormMode] = useState("add");
    const [showExportBranchList, setShowExportBranchList] = useState(false);
    const [showExportUserList, setShowExportUserList] = useState(false);

    const [saving, setSaving] = useState(false);
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [branchList, setBranchList] = useState([]);
    const [userList, setUserList] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([])
    const [exportBranch, setExportBranch] = useState(null);
    const [exportAssignedTo, setExportAssignedTo] = useState(null);
    const [branchModalVisible, setBranchModalVisible] = useState(false);
    const [assignedModalVisible, setAssignedModalVisible] = useState(false);
    const [formState, setFormState] = useState({
        id: undefined,
        name: "",
        phone: "",
        alternatePhone: "",
        email: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        leadSource: "google",
        segment: "stock_equity",
        status: "new",
        priority: "medium",
        investmentAmount: "",
        branchId: undefined,
        assignedToId: undefined,
    });

    const resetForm = () =>
        setFormState({
            id: undefined,
            name: "",
            phone: "",
            alternatePhone: "",
            email: "",
            city: "",
            state: "",
            country: "India",
            pincode: "",
            leadSource: "google",
            segment: "stock_equity",
            status: "new",
            priority: "medium",
            investmentAmount: "",
            branchId: undefined,
            assignedToId: undefined,
        });


    const [sourceModalVisible, setSourceModalVisible] = useState(false);
    const [segmentModalVisible, setSegmentModalVisible] = useState(false);
    const normalizeAssignedTo = (at) => {
        if (
            at === null ||
            at === undefined ||
            at === "" ||
            (Array.isArray(at) && at.length === 0) ||
            (typeof at === "object" &&
                !Array.isArray(at) &&
                Object.keys(at).length === 0)
        ) {
            return null;
        }

        return at;
    };


    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await apiGet("/get-lead");

            let list =
                res?.leads ||
                res?.data?.leads ||
                res?.data ||
                [];
            list = list.map(l => ({
                ...l,
                assignedTo: normalizeAssignedTo(l.assignedTo)
            }));

            setLeads(list);
        } catch {
            Alert.alert("Error", "Unable to load leads.");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchLeads();
        }, [])
    );

    const fetchExportData = async () => {
        try {
            const token = await checkSession();
            if (!token) return;
            const branchRes = await apiGet("/admin/branches");
            const branchList = Array.isArray(branchRes)
                ? branchRes
                : branchRes.branches || [];

            setBranchList(branchList);
            let allUsers = [];
            for (const branch of branchList) {
                const res = await apiGet(`/admin/branches/${branch._id}/users`);
                if (res?.users) {
                    allUsers.push(
                        ...res.users.map(u => ({
                            ...u,
                            branchId: branch._id,
                        }))
                    );
                }
            }

            setUserList(allUsers);
            setFilteredUsers(allUsers);
        } catch (err) {
            console.log("EXPORT FILTER LOAD ERROR:", err);
        }
    };
    useEffect(() => {
        fetchExportData();
    }, []);
    useEffect(() => {
        if (exportBranch === "all") {
            setFilteredUsers(userList);
        } else {
            const users = userList.filter(u => u.branchId === exportBranch);
            setFilteredUsers(users);
            setExportAssignedTo("all");
        }
    }, [exportBranch, userList]);
    // const handleImport = async () => {
    //     try {
    //         const pick = await DocumentPicker.getDocumentAsync({
    //             type: [
    //                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    //                 "application/vnd.ms-excel",
    //             ],
    //             copyToCacheDirectory: true,
    //         });

    //         if (pick.canceled) return;

    //         const file = pick.assets?.[0];
    //         if (!file) {
    //             Alert.alert("Error", "No file selected.");
    //             return;
    //         }
    //         const fileUri = file.uri;

    //         const formData = new FormData();
    //         formData.append("file", {
    //             uri: fileUri,
    //             name: file.name || "import.xlsx",
    //             type:
    //                 file.mimeType ||
    //                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    //         });
    //         const json = await apiPostForm("/lead/import", formData);

    //         if (!json?.success) {
    //             return Alert.alert(
    //                 "Import Failed",
    //                 json?.message || "Something went wrong"
    //             );
    //         }

    //         Alert.alert(
    //             "Import Summary",
    //             `Imported: ${json.imported}\nDuplicates: ${json.duplicates}\nFailed: ${json.failed}`
    //         );

    //         fetchLeads();
    //     } catch (err) {
    //         console.log("IMPORT ERROR:", err);
    //         Alert.alert("Error", "Failed to import leads.");
    //     }
    // };
    const handleImport = async () => {
        try {
            const pick = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel",
                ],
                copyToCacheDirectory: true,
            });

            if (pick.canceled) return;

            const file = pick.assets?.[0];
            if (!file?.uri) {
                Alert.alert("Error", "No file selected.");
                return;
            }
            const fileUri =
                Platform.OS === "android" && !file.uri.startsWith("file://")
                    ? `file://${file.uri}`
                    : file.uri;

            const formData = new FormData();
            formData.append("file", {
                uri: fileUri,
                name: file.name || "import.xlsx",
                type:
                    file.mimeType ||
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const json = await apiPostForm("/lead/import", formData);

            if (!json?.success) {
                Alert.alert("Import Failed", json?.message || "Something went wrong");
                return;
            }
            if (json.imported === 0 && json.duplicates > 0) {
                Alert.alert(
                    "No New Leads Imported",
                    "All leads already exist in the system."
                );
                return;
            }

            Alert.alert(
                "Import Summary",
                `Imported: ${json.imported}
Duplicates: ${json.duplicates}
Failed: ${json.failed}`,
                [
                    {
                        text: "OK",
                        onPress: async () => {
                            if (Array.isArray(json.leads) && json.leads.length > 0) {
                                setLeads(prev => [
                                    ...json.leads,
                                    ...prev.filter(
                                        p => !json.leads.some(n => n._id === p._id)
                                    ),
                                ]);
                            } else {
                                await fetchLeads();
                            }
                        },
                    },
                ]
            );

        } catch (err) {
            console.log("IMPORT ERROR:", err);
            Alert.alert("Error", "Failed to import leads.");
        }
    };

    const handleTemplate = async () => {
        try {
            const token = await checkSession();
            if (!token) {
                Alert.alert("Session expired", "Please login again.");
                return;
            }

            const downloadUrl = `${API_BASE_URL}/lead/export/template`;

            const fileUri = FileSystem.documentDirectory + "lead-template.xlsx";

            const { uri } = await FileSystem.downloadAsync(downloadUrl, fileUri, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("Downloaded", "Template saved: " + uri);
            }
        } catch (err) {
            console.log("TEMPLATE ERROR:", err);
            Alert.alert("Error", "Template download failed.");
        }
    };
    const handleExportFiltered = async () => {
        try {
            const token = await checkSession();
            if (!token) {
                Alert.alert("Session expired", "Please login again.");
                return;
            }
            let filename = "leads.xlsx";

            const branchObj = branchList.find(b => b._id === exportBranch);
            const userObj = filteredUsers.find(u => u._id === exportAssignedTo);

            if (branchObj && userObj) {
                filename = `${branchObj.name}_${userObj.name}.leads.xlsx`;
            } else if (branchObj) {
                filename = `${branchObj.name}.leads.xlsx`;
            } else if (userObj) {
                filename = `${userObj.name}.leads.xlsx`;
            }
            filename = filename.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");

            const params = `?branchId=${exportBranch}&assignedTo=${exportAssignedTo}`;
            const downloadUrl = `${API_BASE_URL}/lead/export${params}`;

            const fileUri = FileSystem.documentDirectory + filename;

            const { uri } = await FileSystem.downloadAsync(downloadUrl, fileUri, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("Exported", "File saved: " + uri);
            }

        } catch (err) {
            console.log("EXPORT ERROR:", err);
            Alert.alert("Error", "Export failed. Try again.");
        }
    };
    const openAddForm = () => {
        resetForm();
        setFormMode("add");
        setFormVisible(true);
    };
    const openEditForm = (lead) => {
        setFormState({
            id: lead._id,
            name: lead.personalInfo?.name || "",
            phone: lead.personalInfo?.phone || "",
            alternatePhone: lead.personalInfo?.alternatePhone || "",
            email: lead.personalInfo?.email || "",
            city: lead.personalInfo?.city || "",
            state: lead.personalInfo?.state || "",
            country: lead.personalInfo?.country || "India",
            pincode: lead.personalInfo?.pincode || "",
            leadSource: lead.leadSource,
            segment: lead.segment,
            status: lead.status,
            priority: lead.priority,
            investmentAmount: lead.investmentSize?.amount
                ? String(lead.investmentSize.amount)
                : "",
            branchId: lead.branch?._id,
            assignedToId: lead.assignedTo?._id,
        });

        setFormMode("edit");
        setFormVisible(true);
    };


    const handleSaveLead = async () => {
        if (!formState.name || !formState.phone)
            return Alert.alert("Validation", "Name and phone are required.");

        const payload = {
            leadSource: formState.leadSource,
            segment: formState.segment,
            status: formState.status,
            priority: formState.priority,
            personalInfo: {
                name: formState.name,
                phone: formState.phone,
                alternatePhone: formState.alternatePhone || undefined,
                email: formState.email || undefined,
                city: formState.city || undefined,
                state: formState.state || undefined,
                country: formState.country || "India",
                pincode: formState.pincode || undefined,
            },
            investmentSize: {
                amount: formState.investmentAmount
                    ? Number(formState.investmentAmount)
                    : undefined,
            },
            branch: formState.branchId || undefined,
            assignedTo: formState.assignedToId || undefined,
        };


        try {
            setSaving(true);
            let res;
            if (formState.id)
                res = await apiPut(`/${formState.id}`, payload);
            else
                res = await apiPost("/create-lead", payload);

            if (!res?.success)
                return Alert.alert("Error", res?.message || "Could not save lead.");

            setFormVisible(false);
            resetForm();
            fetchLeads();
        } catch {
            Alert.alert("Error", "Something went wrong");
        } finally {
            setSaving(false);
        }
    };


    const handleDeleteLead = (lead) => {
        Alert.alert("Delete Lead?", lead.personalInfo?.name ?? "", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    const res = await apiDelete(`/${lead._id}`);
                    if (res?.success) fetchLeads();
                },
            },
        ]);
    };

    const toggleExpand = (id) =>
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    const onSortColumn = (key) => {
        if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir("asc");
        }
    };
    const isUnassigned = (lead) => {
        const at = lead.assignedTo;
        if (!at || at === "" || (Array.isArray(at) && at.length === 0)) return true;
        if (typeof at === "object" && !Array.isArray(at)) {
            if (Object.keys(at).length === 0) return true;
            if (at._id && !at.name) return true;
        }
        return false;
    };
    const processedLeads = useMemo(() => {
        let arr = [...leads];
        if (search.trim()) {
            const q = search.toLowerCase();
            arr = arr.filter((l) =>
                `${l.personalInfo?.name ?? ""} ${l.personalInfo?.phone ?? ""} ${l.personalInfo?.email ?? ""}`
                    .toLowerCase()
                    .includes(q)
            );
        }
        if (selectedSource) arr = arr.filter((l) => l.leadSource === selectedSource);
        if (selectedSegment) arr = arr.filter((l) => l.segment === selectedSegment);
        if (statusFilter) {
            arr = arr.filter((lead) => {
                const unassigned = isUnassigned(lead);

                if (statusFilter === "unassigned") {
                    return unassigned;
                }

                if (unassigned) return false;

                return lead.status === statusFilter;
            });
        }
        arr.sort((a, b) => {
            const dir = sortDir === "asc" ? 1 : -1;

            const getVal = (lead) => {
                switch (sortKey) {
                    case "name":
                        return lead.personalInfo?.name ?? "";
                    case "phone":
                        return lead.personalInfo?.phone ?? "";
                    case "leadSource":
                        return lead.leadSource ?? "";
                    case "segment":
                        return lead.segment ?? "";
                    case "status":
                        return lead.status ?? "";
                    case "priority":
                        return lead.priority ?? "";
                    case "investment":
                        return lead.investmentSize?.amount ?? 0;
                    default:
                        return lead.createdAt;
                }
            };

            const av = getVal(a);
            const bv = getVal(b);

            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });

        return arr;
    }, [leads, search, selectedSource, selectedSegment, statusFilter, sortKey, sortDir]);


    useEffect(() => setPage(1), [search, selectedSource, selectedSegment, statusFilter, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(processedLeads.length / PAGE_SIZE));

    const pageData = useMemo(
        () => processedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [processedLeads, page]
    );
    const statusCounts = useMemo(() => {
        const counts = { new: 0, in_progress: 0, interested: 0, follow_up: 0, converted: 0, dropped: 0, not_interested: 0, unassigned: 0 };
        leads.forEach(lead => {
            if (isUnassigned(lead)) {
                counts.unassigned++;
            } else if (lead.status !== "unassigned" && counts[lead.status] !== undefined) {
                counts[lead.status]++;
            }
        });
        return counts;
    }, [leads]);




    const renderAnalyticsRows = () => (
        <View style={{ marginTop: 10, marginBottom: 8 }}>
            {STATUS_ROWS.map((row, idx) => (
                <View key={idx} style={styles.analyticsRow}>
                    {row.map((key) => {
                        const cfg = STATUS_STYLES[key];
                        const active = statusFilter === key;
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.analyticsCard,
                                    active && {
                                        borderColor: cfg.text,
                                        backgroundColor: cfg.bg,
                                    },
                                ]}
                                onPress={() =>
                                    setStatusFilter((prev) => (prev === key ? "" : key))
                                }
                            >
                                <Text
                                    style={[
                                        styles.analyticsTitle,
                                        active && { color: cfg.text },
                                    ]}
                                >
                                    {cfg.label}
                                </Text>

                                <Text
                                    style={[
                                        styles.analyticsNumber,
                                        active && { color: cfg.text },
                                    ]}
                                >
                                    {statusCounts[key]}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
    const renderPagination = () =>
        processedLeads.length > PAGE_SIZE ? (
            <View style={styles.paginationRow}>
                <TouchableOpacity
                    style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}
                    disabled={page === 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                    <Text style={styles.pageBtnText}>Prev</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                    Page {page} / {totalPages}
                </Text>

                <TouchableOpacity
                    style={[styles.pageBtn, page === totalPages && { opacity: 0.4 }]}
                    disabled={page === totalPages}
                    onPress={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                >
                    <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
            </View>
        ) : null;
    const renderDashboardView = () => (
        <>
            <Text style={styles.pageHeading}>LEAD MANAGEMENT</Text>

            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => navigation?.goBack?.()}
                    style={styles.backBtn}
                >
                    <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>

                <View style={styles.totalLeadBox}>
                    <Text style={styles.totalLeadLabel}>TOTAL LEADS</Text>
                    <Text style={styles.totalLeadNumber}>{leads.length}</Text>
                </View>

                <TouchableOpacity
                    style={styles.leadTableToggle}
                    onPress={() => setViewMode("table")}
                >
                    <Text style={styles.leadTableToggleText}>Lead Table</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.toolbarRow}>
                <TouchableOpacity style={styles.toolbarBtn} onPress={handleImport}>
                    <Text style={styles.toolbarBtnText}>Import</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.toolbarBtn}
                    onPress={() => setExportModalVisible(true)}
                >
                    <Text style={styles.toolbarBtnText}>Export</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolbarBtn} onPress={handleTemplate}>
                    <Text style={styles.toolbarBtnText}>Template</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.toolbarBtnPrimary}
                    onPress={openAddForm}
                >
                    <Text style={styles.toolbarBtnPrimaryText}>+ Add Lead</Text>
                </TouchableOpacity>
            </View>

            <TextInput
                style={styles.searchInput}
                placeholder="Search by name, phone or email..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
            />

            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={styles.filterCard}
                    onPress={() => setSourceModalVisible(true)}
                >
                    <Text style={styles.filterCardLabel}>Lead Source</Text>
                    <Text style={styles.filterCardValue}>{selectedSource || "All"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.filterCard}
                    onPress={() => setSegmentModalVisible(true)}
                >
                    <Text style={styles.filterCardLabel}>Segment</Text>
                    <Text style={styles.filterCardValue}>{selectedSegment || "All"}</Text>
                </TouchableOpacity>
            </View>

            {renderAnalyticsRows()}

            {loading ? (
                <ActivityIndicator style={{ marginTop: 30 }} />
            ) : (
                <>
                    <LeadTable
                        leads={pageData}
                        fetchLeads={fetchLeads}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={onSortColumn}
                        onEdit={openEditForm}
                        onDelete={handleDeleteLead}
                        expanded={expanded}
                        toggleExpand={toggleExpand}
                    />

                    {renderPagination()}
                </>
            )}
        </>
    );
    const renderFullTableView = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.fullTableTopBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setViewMode("dashboard")}
                >
                    <Text style={styles.backBtnText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>


            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} />
            ) : (
                <>
                    <LeadTable
                        leads={pageData}
                        lead={leads}
                        fetchLeads={fetchLeads}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={onSortColumn}
                        onEdit={openEditForm}
                        onDelete={handleDeleteLead}
                        expanded={expanded}
                        toggleExpand={toggleExpand}
                    />
                    {renderPagination()}
                </>
            )}
        </View>
    );
    return (
        <View style={styles.container}>
            {viewMode === "dashboard" ? (
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
                    {renderDashboardView()}
                </ScrollView>
            ) : (
                renderFullTableView()
            )}

            <LeadFormModal
                visible={formVisible}
                mode={formMode}
                formState={formState}
                setFormState={setFormState}
                onClose={() => {
                    setFormVisible(false);
                    resetForm();
                }}
                onSubmit={handleSaveLead}
                loading={saving}
            />

            {/* MODALS */}
            <OptionModal
                visible={sourceModalVisible}
                title="Select Lead Source"
                selected={selectedSource}
                onSelect={setSelectedSource}
                onClose={() => setSourceModalVisible(false)}
                options={[
                    { label: "All", value: "" },

                    { label: "Google", value: "google" },
                    { label: "Facebook", value: "fb" },
                    { label: "Instagram", value: "ig" },

                    { label: "Website", value: "website" },
                    { label: "Referral", value: "referral" },
                    { label: "Cold Call", value: "cold_call" },

                    { label: "LinkedIn", value: "linkedin" },
                    { label: "Twitter", value: "twitter" },

                    { label: "Other", value: "other" },
                ]}

            />

            <OptionModal
                visible={segmentModalVisible}
                title="Select Segment"
                selected={selectedSegment}
                onSelect={setSelectedSegment}
                onClose={() => setSegmentModalVisible(false)}
                options={[
                    { label: "All", value: "" },

                    { label: "Stock Equity", value: "stock_equity" },
                    { label: "Stock Future", value: "stock_future" },
                    { label: "Bank Nifty Option", value: "bank_nifty_option" },

                    { label: "Commodity", value: "commodity" },
                    { label: "Forex", value: "forex" },
                    { label: "Crypto", value: "crypto" },

                    { label: "Mutual Funds", value: "mutual_funds" },

                    { label: "Other", value: "other" },
                ]}

            />
            <Modal visible={exportModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Export Leads</Text>

                        {/* BRANCH DROPDOWN */}
                        <View style={{ marginTop: 10, position: "relative", zIndex: 99999 }}>
                            <Text style={styles.label}>Branch</Text>

                            <TouchableOpacity
                                style={styles.bulkDropdown}
                                onPress={() => {
                                    setShowExportBranchList(prev => !prev);
                                    setShowExportUserList(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.bulkDropdownText,
                                        exportBranch === null ? { color: "#9CA3AF" } : { color: "#9CA3AF" }
                                    ]}
                                >
                                    {exportBranch === null
                                        ? "Select Branch"
                                        : branchList.find(b => b._id === exportBranch)?.name}
                                </Text>
                            </TouchableOpacity>

                            {showExportBranchList && (
                                <View style={styles.optionContainer}>
                                    {branchList.map(b => (
                                        <TouchableOpacity
                                            key={b._id}
                                            onPress={() => {
                                                setExportBranch(b._id);
                                                setExportAssignedTo(null);
                                                setShowExportBranchList(false);
                                            }}
                                        >
                                            <Text style={styles.option}>{b.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* USER DROPDOWN */}
                        <View style={{ marginTop: 12, position: "relative", zIndex: 99998 }}>
                            <Text style={styles.label}>Assigned User</Text>

                            <TouchableOpacity
                                style={[
                                    styles.bulkDropdown,
                                    exportBranch === null ? { opacity: 0.4 } : {}
                                ]}
                                disabled={exportBranch === null}
                                onPress={() => {
                                    if (filteredUsers.length > 0) {
                                        setShowExportUserList(prev => !prev);
                                        setShowExportBranchList(false);
                                    }
                                }}
                            >
                                <Text
                                    style={[
                                        styles.bulkDropdownText,
                                        exportAssignedTo === null ? { color: "#9CA3AF" } : { color: "#9CA3AF" }
                                    ]}
                                >
                                    {exportBranch === null
                                        ? "Select Branch First"
                                        : exportAssignedTo === null
                                            ? "Select User"
                                            : filteredUsers.find(u => u._id === exportAssignedTo)?.name}
                                </Text>
                            </TouchableOpacity>

                            {showExportUserList && filteredUsers.length > 0 && (
                                <View style={styles.optionContainer}>
                                    {filteredUsers.map(u => (
                                        <TouchableOpacity
                                            key={u._id}
                                            onPress={() => {
                                                setExportAssignedTo(u._id);
                                                setShowExportUserList(false);
                                            }}
                                        >
                                            <Text style={styles.option}>{u.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* DOWNLOAD BUTTON */}
                        <TouchableOpacity
                            style={[styles.toolbarBtnPrimary, { marginTop: 20 }]}
                            onPress={() => {
                                setExportModalVisible(false);
                                handleExportFiltered();
                            }}
                        >
                            <Text style={styles.toolbarBtnPrimaryText}>Download</Text>
                        </TouchableOpacity>

                        {/* CANCEL BUTTON */}
                        <TouchableOpacity
                            style={[styles.modalCloseBtn, { marginTop: 12 }]}
                            onPress={() => setExportModalVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <OptionModal
                visible={branchModalVisible}
                title="Select Branch"
                selected={exportBranch}
                onSelect={(value) => {
                    setExportBranch(value);
                    setExportAssignedTo(null);
                }}
                onClose={() => setBranchModalVisible(false)}
                options={[
                    { label: "Select Branch", value: null },
                    ...branchList.map(b => ({
                        label: b.name,
                        value: b._id
                    }))
                ]}
            />

            <OptionModal
                visible={assignedModalVisible}
                title="Select Assigned User"
                selected={exportAssignedTo}
                onSelect={(value) => setExportAssignedTo(value)}
                onClose={() => setAssignedModalVisible(false)}
                options={[
                    { label: "Select User", value: null },
                    ...filteredUsers.map(u => ({
                        label: u.name,
                        value: u._id
                    }))
                ]}
            />

        </View>
    );
}
const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#F5F7FB" },

    pageHeading: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
        marginBottom: 14,
        textTransform: "uppercase",
    },

    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },

    backBtn: {
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 16,
        borderRadius: 14,
        height: 44,
        justifyContent: "center",
    },
    backBtnText: {
        fontSize: 14, fontWeight: "700", color: "#111827", justifyContent: "center",
        alignItems: "center",
    },

    totalLeadBox: {
        backgroundColor: "#000",
        paddingHorizontal: 16,
        borderRadius: 14,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    totalLeadLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
    totalLeadNumber: { fontSize: 16, color: "#fff", fontWeight: "800" },

    leadTableToggle: {
        paddingHorizontal: 14,
        backgroundColor: "#111827",
        borderRadius: 14,
        height: 44,
        justifyContent: "center",
    },
    leadTableToggleText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
    },

    toolbarRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
    },
    toolbarBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#E5E7EB",
        borderRadius: 999,
    },
    toolbarBtnText: { fontSize: 12, fontWeight: "600", color: "#111827" },

    toolbarBtnPrimary: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: "#0A84FF",
        borderRadius: 999,
    },
    toolbarBtnPrimaryText: { fontSize: 12, color: "#fff", fontWeight: "700" },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 4
    },
    bulkDropdown: {
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    bulkDropdownText: {
        fontSize: 14,
        fontWeight: "700"
    },
    optionContainer: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        marginTop: 8,
        maxHeight: 200,
        paddingVertical: 6
    },
    option: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        color: "#111827"
    }
    ,
    searchInput: {
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 10,
    },

    filterRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 10,
    },
    filterCard: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    filterCardLabel: { fontSize: 12, color: "#6B7280" },
    filterCardValue: { marginTop: 4, fontSize: 14, fontWeight: "700" },

    analyticsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 8,
    },
    analyticsCard: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    analyticsTitle: { fontSize: 12, fontWeight: "600" },
    analyticsNumber: { fontSize: 18, fontWeight: "800", marginTop: 4 },

    paginationRow: {
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
    },
    pageBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: "#111827",
        borderRadius: 999,
    },
    pageBtnText: { color: "#fff", fontSize: 12 },
    pageInfo: { fontSize: 12, color: "#4B5563" },

    modalOverlay: {
        flex: 1,
        backgroundColor: "#00000066",
        justifyContent: "center",
        alignItems: "center",
    },
    modalBox: {
        backgroundColor: "#fff",
        width: "80%",
        borderRadius: 16,
        padding: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#EEE",
    },
    modalCloseBtn: {
        backgroundColor: "#E5E7EB",
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
    },
    modalCloseText: { textAlign: "center", fontWeight: "600" },

    fullTableTopBar: {
        width: "100%",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#F5F7FB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        marginLeft: -15,
    },
    backBtn: {
        backgroundColor: "#0A84FF",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 6,
    },
    backBtnText: {
        color: "#fff",
        fontWeight: "700",
    },

});