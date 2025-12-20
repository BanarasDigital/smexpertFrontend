import React, { useEffect, useState, useContext } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Modal,
    TextInput,
    FlatList,
} from "react-native";
import StatusBadge from "./StatusBadge";
import { DataContext } from "../context";

export default function LeadTable({
    leads,
    sortKey,
    sortDir,
    onSort,
    onEdit,
    onDelete,
    fetchLeads
}) {
    const { apiGet, apiPost, user } = useContext(DataContext);

    const [search, setSearch] = useState("");

    const [selected, setSelected] = useState({});
    const [selectAll, setSelectAll] = useState(false);

    const [branches, setBranches] = useState([]);
    const [users, setUsers] = useState([]);

    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const [showBranchList, setShowBranchList] = useState(false);
    const [showUserList, setShowUserList] = useState(false);

    const [assignModal, setAssignModal] = useState(false);
    const [viewModal, setViewModal] = useState(false);

    const [activeLead, setActiveLead] = useState(null);
    const formatEnumLabel = (value = "") => {
        if (!value) return "-";

        return value
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const loadBranches = async () => {
        try {
            const res = await apiGet("/admin/branches");
            const branchList = Array.isArray(res)
                ? res
                : res.branches || [];

            if (branchList.length === 0) {
                return;
            }

            const formatted = branchList.map(b => ({
                label: b.name,
                value: b._id,
            }));
            setBranches(formatted);

        } catch (err) {
            console.log("Branch load error:", err);
        }
    };


    useEffect(() => {
        if (assignModal) {
            loadBranches();
            setShowBranchList(false);
            setShowUserList(false);
        }
    }, [assignModal]);



    const loadUsers = async (branchId) => {
        const res = await apiGet(`/admin/branches/${branchId}/users`);
        if (res?.users) {
            setUsers(res.users.map(u => ({
                label: u.name,
                value: u._id,
            })));
        }
    };

    useEffect(() => { loadBranches(); }, []);

    useEffect(() => {
        if (selectedBranch) {
            loadUsers(selectedBranch);
        } else {
            setUsers([]);
        }
    }, [selectedBranch]);

    const toggleSelect = (id) => {
        setSelected(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSelectAll = () => {
        const all = !selectAll;
        setSelectAll(all);
        const sel = {};
        if (all) leads.forEach(l => (sel[l._id] = true));
        setSelected(sel);
    };

    const clearBulkSelect = () => {
        setSelected({});
        setSelectAll(false);
    };
    const handleBulkAssign = async () => {
        if (user?.user_type !== "admin") {
            console.log("Permission denied — User is not admin:", user?.user_type);
            alert("Only admin can bulk assign leads.");
            return;
        }
        const ids = Object.keys(selected).filter(id => selected[id]);

        if (!ids.length) {
            alert("No leads selected");
            return;
        }

        if (!selectedBranch) {
            alert("Select branch first");
            return;
        }

        if (!selectedUser) {
            alert("Select user");
            return;
        }

        console.log("Sending Bulk Assign Request >>>", {
            leads: ids,
            branchId: selectedBranch,
            userId: selectedUser,
        });
        let res = null;

        try {
            res = await apiPost("/lead/bulk-assign", {
                leads: ids,
                branchId: selectedBranch,
                userId: selectedUser,
            });

            console.log("Raw response received:", res);
        } catch (error) {
            console.log("calling /lead/bulk-assign:", error);
            alert("Server error — please check your backend logs.");
            return;
        }
        if (!res || typeof res !== "object") {
            console.log("NULL/Invalid response from backend:", res);
            alert("Unexpected server response. Check backend implementation.");
            return;
        }
        if (res.success) {
            console.log("Bulk Assign Success — Updated Leads:", res.updatedLeads);

            alert(`Assigned ${res.updatedCount} leads successfully`);
            if (typeof fetchLeads === "function") {
                console.log("🔄 Fetching updated leads from database...");
                await fetchLeads();
            }
            setSelected({});
            setSelectAll(false);
            setAssignModal(false);
        } else {
            console.log("Backend returned failure:", res.message);
            alert(res.message || "Bulk assign failed.");
        }
    };
    const normalizedSearch = search.trim().toLowerCase();

    const filteredLeads = leads.filter(l => {
        if (!normalizedSearch) return true;

        const name = l.personalInfo?.name?.toLowerCase() || "";
        const phone = String(l.personalInfo?.phone || "");
        const email = l.personalInfo?.email?.toLowerCase() || "";
        const city = l.personalInfo?.city?.toLowerCase() || "";
        const state = l.personalInfo?.state?.toLowerCase() || "";
        const pincode = String(l.personalInfo?.pincode || "");
        const source = l.leadSource?.toLowerCase() || "";
        const segment = l.segment?.toLowerCase() || "";

        return (
            name.includes(normalizedSearch) ||
            phone.includes(normalizedSearch) ||
            email.includes(normalizedSearch) ||
            city.includes(normalizedSearch) ||
            state.includes(normalizedSearch) ||
            pincode.includes(normalizedSearch) ||
            source.includes(normalizedSearch) ||
            segment.includes(normalizedSearch)
        );
    });



    const openViewModal = (lead) => {
        setActiveLead(lead);
        setViewModal(true);
    };

    const closeViewModal = () => {
        setViewModal(false);
        setActiveLead(null);
    };
    return (
        <Pressable style={{ flex: 1 }}>
            <Text style={styles.leadHeading}>Lead Details</Text>
            <TextInput
                placeholder="Search by name or phone..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#9CA3AF"
                style={styles.searchBar}
            />
            {Object.values(selected).some(v => v) && (
                <View style={styles.bulkBarWrapper}>
                    <View style={styles.bulkBar}>
                        <Text style={styles.bulkCount}>
                            {Object.values(selected).filter(Boolean).length} selected
                        </Text>

                        <TouchableOpacity
                            style={styles.bulkSendBtn}
                            onPress={() => setAssignModal(true)}
                        >
                            <Text style={styles.bulkSendText}>Assign</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={clearBulkSelect}>
                            <Text style={styles.bulkClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                directionalLockEnabled
            >
                <View style={{ minWidth: 1850 }}>
                    <View style={styles.tableHeader}>
                        <TouchableOpacity
                            style={styles.headerCellSmall}
                            onPress={toggleSelectAll}
                        >
                            <Text style={styles.headerText}>
                                {selectAll ? "☑" : "☐"}
                            </Text>
                        </TouchableOpacity>

                        {[
                            { label: "Name", key: "name" },
                            { label: "Phone", key: "phone" },
                            { label: "Email", key: "email" },
                            { label: "Source", key: "leadSource" },
                            { label: "Segment", key: "segment" },
                            { label: "Status", key: "status" },
                            { label: "Priority", key: "priority" },
                            { label: "Investment", key: "investment" },
                            { label: "Branch", key: "branch" },
                            { label: "Assigned", key: "assignedTo" },
                            { label: "Created", key: "createdAt" },
                            { label: "More" },
                            { label: "Action" },
                        ].map((col, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.headerCell}
                                onPress={() => col.key && onSort(col.key)}
                            >
                                <Text style={styles.headerText}>
                                    {col.label}
                                    {sortKey === col.key
                                        ? sortDir === "asc"
                                            ? " ↑"
                                            : " ↓"
                                        : ""}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>


                    <FlatList
                        data={filteredLeads}
                        keyExtractor={(item) => item._id}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={12}
                        maxToRenderPerBatch={20}
                        windowSize={7}
                        removeClippedSubviews={false} 
                        renderItem={({ item: lead }) => (
                            <View style={styles.tableRow}>
                                <TouchableOpacity
                                    style={styles.cellSmall}
                                    onPress={() => toggleSelect(lead._id)}
                                >
                                    <Text style={styles.checkText}>
                                        {selected[lead._id] ? "☑" : "☐"}
                                    </Text>
                                </TouchableOpacity>

                                <Text style={styles.cell}>{lead.personalInfo?.name}</Text>
                                <Text style={styles.cell}>{lead.personalInfo?.phone}</Text>
                                <Text style={styles.cell}>{lead.personalInfo?.email}</Text>
                                <Text style={styles.cell}>{formatEnumLabel(lead.leadSource)}</Text>
                                <Text style={styles.cell}>{formatEnumLabel(lead.segment)}</Text>

                                <View style={[styles.cell, { paddingVertical: 6 }]}>
                                    <StatusBadge value={lead.status} />
                                </View>

                                <Text style={styles.cell}>{lead.priority}</Text>
                                <Text style={styles.cell}>
                                    {lead.investmentSize?.amount ?? "-"}
                                </Text>

                                <Text style={styles.cell}>{lead.branch?.name}</Text>
                                <Text style={styles.cell}>{lead.assignedTo?.name}</Text>

                                <Text style={styles.cell}>
                                    {new Date(lead.createdAt).toLocaleDateString()}
                                </Text>

                                <TouchableOpacity onPress={() => openViewModal(lead)}>
                                    <Text style={[styles.cell, styles.linkText]}>View</Text>
                                </TouchableOpacity>

                                <View style={[styles.cell, { flexDirection: "row", gap: 6 }]}>
                                    <TouchableOpacity onPress={() => onEdit(lead)}>
                                        <Text style={styles.actionEdit}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onDelete(lead)}>
                                        <Text style={styles.actionDelete}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                </View>
            </ScrollView>


            <Modal transparent visible={assignModal} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>

                        <Text style={styles.modalTitle}>Bulk Assign</Text>
                        <View style={{ marginTop: 10, position: "relative", zIndex: 9999999 }}>
                            <TouchableOpacity
                                style={styles.bulkDropdown}
                                onPress={async () => {
                                    await loadBranches();
                                    setShowBranchList(true);
                                    setShowUserList(false);
                                }}
                            >
                                <Text style={styles.bulkDropdownText}>
                                    {selectedBranch
                                        ? branches.find(b => b.value === selectedBranch)?.label
                                        : "Select Branch"}
                                </Text>
                            </TouchableOpacity>

                            {showBranchList && (
                                <View style={styles.optionContainer}>
                                    {branches.map(b => (
                                        <TouchableOpacity
                                            key={b.value}
                                            onPress={() => {
                                                console.log("Branch selected:", b);
                                                setSelectedBranch(b.value);
                                                setSelectedUser(null);
                                                setShowBranchList(false);
                                            }}
                                        >
                                            <Text style={styles.option}>{b.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>


                        <View style={{ marginTop: 12 }}>
                            <TouchableOpacity
                                style={[styles.bulkDropdown, { opacity: selectedBranch ? 1 : 0.4 }]}
                                disabled={!selectedBranch}
                                onPress={() => {
                                    if (users.length > 0) {
                                        setShowUserList(prev => !prev);
                                        setShowBranchList(false);
                                    }
                                }}
                            >
                                <Text style={styles.bulkDropdownText}>
                                    {!selectedBranch
                                        ? "Select branch first"
                                        : users.length === 0
                                            ? "Loading users..."
                                            : selectedUser
                                                ? users.find(u => u.value === selectedUser)?.label
                                                : "Select User"}
                                </Text>
                            </TouchableOpacity>

                            {showUserList && users.length > 0 && (
                                <View style={styles.optionContainer}>
                                    {users.map(u => (
                                        <TouchableOpacity
                                            key={u.value}
                                            onPress={() => {
                                                setSelectedUser(u.value);
                                                setShowUserList(false);
                                            }}
                                        >
                                            <Text style={styles.option}>{u.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>



                        <TouchableOpacity
                            style={[styles.bulkSendBtn, { marginTop: 20 }]}
                            onPress={handleBulkAssign}
                        >
                            <Text style={styles.bulkSendText}>Assign</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalCloseBtn, { marginTop: 10 }]}
                            onPress={() => setAssignModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>


            <Modal transparent visible={viewModal} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Lead Details</Text>

                        {activeLead && (
                            <ScrollView style={{ maxHeight: 400 }}>
                                <Text style={styles.modalText}>
                                    Name: {activeLead.personalInfo?.name}
                                </Text>
                                <Text style={styles.modalText}>
                                    Phone: {activeLead.personalInfo?.phone}
                                </Text>
                                <Text style={styles.modalText}>
                                    Email: {activeLead.personalInfo?.email}
                                </Text>
                                <Text style={styles.modalText}>
                                    City: {activeLead.personalInfo?.city}
                                </Text>
                                <Text style={styles.modalText}>
                                    Alternate Phone: {activeLead.personalInfo?.alternatePhone}
                                </Text>
                                <Text style={styles.modalText}>
                                    State: {activeLead.personalInfo?.state}
                                </Text>
                                <Text style={styles.modalText}>
                                    Country: {activeLead.personalInfo?.country}
                                </Text>
                                <Text style={styles.modalText}>
                                    Pincode: {activeLead.personalInfo?.pincode}
                                </Text>
                                <Text style={styles.modalText}>
                                    Source: {activeLead.leadSource}
                                </Text>
                                <Text style={styles.modalText}>
                                    Segment: {activeLead.segment}
                                </Text>
                                <Text style={styles.modalText}>
                                    Status: {activeLead.status}
                                </Text>
                                <Text style={styles.modalText}>
                                    Priority: {activeLead.priority}
                                </Text>
                                <Text style={styles.modalText}>
                                    Investment: {activeLead.investmentSize?.amount ?? "-"}
                                </Text>
                                <Text style={styles.modalText}>
                                    Branch: {activeLead.branch?.name}
                                </Text>
                                <Text style={styles.modalText}>
                                    Assigned To: {activeLead.assignedTo?.name}
                                </Text>
                                <Text style={styles.modalText}>
                                    Created: {new Date(activeLead.createdAt).toLocaleString()}
                                </Text>

                                <Text style={[styles.modalText, { marginTop: 10 }]}>
                                    Notes:
                                </Text>

                                {activeLead.notes?.length ? (
                                    activeLead.notes.map((n, i) => (
                                        <View key={i} style={styles.noteBox}>
                                            <Text style={styles.modalText}>Type: {n.type}</Text>
                                            <Text style={styles.modalText}>Content: {n.content}</Text>
                                            <Text style={styles.modalText}>By: {n.addedBy?.name}</Text>
                                            <Text style={styles.modalText}>
                                                At: {new Date(n.addedAt).toLocaleString()}
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.modalText}>No notes available.</Text>
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity onPress={closeViewModal} style={styles.modalCloseBtn}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    leadHeading: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 5,
        color: "#111",
    },
    searchBar: {
        backgroundColor: "#F3F4F6",
        padding: 8,
        marginBottom: 8,
        borderRadius: 6,
        fontSize: 13,
    },

    bulkBarWrapper: {
        position: "absolute",
        top: 0,
        left: 120,
        zIndex: 999999,
    },
    bulkBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 10,
    },
    bulkCount: { fontSize: 12, fontWeight: "700" },
    bulkClose: {
        fontSize: 14,
        paddingHorizontal: 8,
        color: "#EF4444",
        fontWeight: "800",
    },

    bulkDropdown: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#E5E7EB",
        borderRadius: 6,
    },
    bulkDropdownText: { fontSize: 12, fontWeight: "600" },

    bulkSendBtn: {
        paddingHorizontal: 10,
        paddingVertical: 2,
        backgroundColor: "#0A84FF",
        borderRadius: 6,
    },
    bulkSendText: { color: "#fff", fontWeight: "700", paddingVertical: 4, },

    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#E5E7EB",
        borderRadius: 6,
        paddingVertical: 8,
    },
    headerCellSmall: { width: 40, paddingHorizontal: 10 },
    headerCell: { width: 140, paddingHorizontal: 10 },
    headerText: { fontWeight: "700", color: "#374151", fontSize: 12 },

    tableRow: {
        flexDirection: "row",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
    },
    cellSmall: { width: 40, paddingHorizontal: 10 },
    cell: { width: 140, paddingHorizontal: 10, fontSize: 12, gap: 5 },

    linkText: { color: "#0A84FF", fontWeight: "600" },

    optionContainer: {
        position: "absolute",
        top: 40,
        left: 0,
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#d1d5db",
        zIndex: 999999,
        paddingVertical: 6,
    },
    option: { padding: 8, fontSize: 12 },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalBox: {
        backgroundColor: "#fff",
        width: "90%",
        borderRadius: 12,
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 10,
    },
    modalCloseBtn: {
        marginTop: 12,
        backgroundColor: "#0A84FF",
        paddingVertical: 10,
        borderRadius: 8,
    },
    modalCloseText: {
        color: "#fff",
        textAlign: "center",
        fontWeight: "700",
    },
  
});