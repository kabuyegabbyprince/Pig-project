export function formatRole(role?: string | null): string {
  if (!role) return "System";
  const r = role.replace(/^ROLE_/, "").toUpperCase();
  switch (r) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "Super Administrator";
    case "PROJECT_MANAGER":
      return "Project Manager (Gebyian)";
    case "CELL_MANAGER":
    case "FIELD_OFFICER":
    case "EMPLOYEE":
    case "REGISTRAR":
      return "Cell Manager";
    case "COOPERATIVE_LEADER":
      return "Cooperative Manager";
    case "COOPERATIVE_MEMBER":
      return "Cooperative Member";
    case "VETERINARIAN":
    case "VET":
      return "Veterinarian";
    case "FINANCE_OFFICER":
    case "FINANCE":
      return "Finance Officer";
    default:
      return role;
  }
}

export function formatModule(entity: string): string {
  const e = (entity || "").toUpperCase();
  switch (e) {
    case "PIG":
    case "PIG_RECEIPT":
    case "LIVESTOCK":
      return "Pig Register";
    case "BENEFICIARY":
      return "Beneficiaries";
    case "DISTRIBUTION":
    case "PIG_DISTRIBUTION":
      return "Pig Distribution";
    case "RETURN":
    case "PIG_RETURN":
      return "Piglet Returns";
    case "VETERINARY":
    case "VETERINARY_RECORD":
    case "VET_VISIT":
      return "Veterinary";
    case "FINANCE":
    case "FINANCE_TRANSACTION":
      return "Finance";
    case "USER":
    case "USER_PROFILE":
    case "USER_SECURITY":
      return "Users";
    case "SETTING":
    case "SYSTEM_SETTING":
      return "System Settings";
    case "AUTH":
    case "LOGIN":
    case "LOGOUT":
      return "Authentication";
    case "REPORT":
    case "EMPLOYEE_REPORT":
      return "Operational Reports";
    case "GALLERY":
      return "Post Gallery";
    case "TEAM":
      return "Post Our Team";
    case "WEBSITE":
      return "Website Content";
    case "TASK":
      return "Tasks";
    case "LOCATION":
    case "DISTRICT":
    case "SECTOR":
    case "CELL":
    case "VILLAGE":
      return "Locations";
    case "STORE_PRODUCT":
      return "Gebyian Stock";
    case "STORE_ORDER":
      return "Gebyian Orders";
    case "COOPERATIVE_STOCK_REPORT":
      return "Coop Stock Reports";
    case "CELL_FEED_SALE":
      return "Animal Food Sales";
    case "COOPERATIVE":
      return "Cooperatives";
    case "COOPERATIVE_MEMBER_REPORT":
      return "Coop Member Reports";
    default:
      return entity.replace(/_/g, " ");
  }
}

export function formatActivity(action: string, entity: string): string {
  const a = (action || "").toUpperCase();
  const e = (entity || "").toUpperCase();

  if (e === "AUTH" || a === "LOGIN") return "User Logged In";
  if (a === "LOGOUT") return "User Logged Out";

  if (e === "PIG_RECEIPT" || (e === "PIG" && a === "CREATED")) return "Pig Registration & Receipt";
  if (e === "PIG" && a === "UPDATED") return "Pig Receipt Updated";
  if (e === "PIG" && a === "DELETED") return "Pig Receipt Record Deleted";

  if (e === "BENEFICIARY" && a === "CREATED") return "Beneficiary Registered";
  if (e === "BENEFICIARY" && a === "UPDATED") return "Beneficiary Updated";

  if (e.includes("DISTRIBUTION") || a === "DISTRIBUTED") return "Pig Distributed";
  if (e.includes("RETURN") || a === "RETURNED") return "Piglet Return Recorded";

  if (e.includes("VET") || a === "EXAMINED") return "Veterinary Exam Recorded";

  if (e.includes("FINANCE") || a === "POSTED") return "Financial Transaction Recorded";
  if (e.includes("FINANCE") && a === "APPROVED") return "Financial Transaction Approved";

  if (e === "USER" && a === "CREATED") return "New User Created";
  if (e === "USER" && a === "DELETED") return "User Deactivated / Deleted";
  if (e === "USER_PROFILE" && a === "UPDATED") return "Profile Details Updated";
  if (e === "USER_SECURITY") return "Password Security Changed";

  if (e.includes("SETTING")) {
    if (a === "RESET") return "System Setting Reset";
    return a === "CREATED" ? "System Setting Created" : "System Setting Updated";
  }

  if (e === "STORE_PRODUCT") {
    if (a === "CREATED") return "Stock Product Added";
    if (a === "UPDATED") return "Stock Product Updated";
    if (a === "PRICING_AND_DISCOUNT_UPDATED") return "Stock Price & Discount Updated";
    if (a === "STOCK_UPDATED") return "Stock Quantity Updated";
    if (a === "PUBLISHED") return "Stock Product Published";
    if (a === "UNPUBLISHED") return "Stock Product Hidden";
    if (a === "DELETED") return "Stock Product Deleted";
  }
  if (e === "STORE_ORDER") {
    if (a === "ORDER_PLACED") return "New Gebyian Order Placed";
    return "Order Status Updated";
  }
  if (e === "CELL_FEED_SALE") {
    if (a === "CELL_FEED_SALE_RECORDED") return "Animal Food Sale Recorded";
    if (a === "CELL_FEED_SALE_VERIFIED") return "Animal Food Sale Verified";
    if (a === "CELL_FEED_SALE_REJECTED") return "Animal Food Sale Rejected";
  }
  if (e === "COOPERATIVE") {
    if (a === "CREATED") return "Cooperative Created";
    if (a === "MANAGER_CHANGED") return "Cooperative Manager Assigned";
  }
  if (e === "COOPERATIVE_MEMBER_REPORT") {
    if (a === "SUBMITTED") return "Member Report Sent to Manager";
    if (a === "REVIEWED") return "Member Report Reviewed";
    if (a === "ESCALATED_TO_CELL") return "Member Report Escalated to Cell Manager";
  }

  return `${a.charAt(0) + a.slice(1).toLowerCase()} ${formatModule(entity)}`;
}

export function getRecordReference(log: {
  entityId: string;
  entity: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previousValue?: any;
}): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nv = log.newValue as Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pv = log.previousValue as Record<string, any> | null;

  if (nv?.orderNumber) return nv.orderNumber;
  if (nv?.saleNumber) return nv.saleNumber;
  if (nv?.tagNumber) return nv.tagNumber;
  if (nv?.beneficiaryNumber) return nv.beneficiaryNumber;
  if (nv?.transactionId) return nv.transactionId;
  if (nv?.email) return nv.email;
  if (nv?.name) return nv.name;
  if (nv?.tags && Array.isArray(nv.tags) && nv.tags.length > 0) {
    return nv.tags[0];
  }
  if (pv?.name) return pv.name;
  if (pv?.email) return pv.email;
  if (pv?.tagNumber) return pv.tagNumber;

  return log.entityId || "N/A";
}

export function formatChangeDescription(log: {
  action: string;
  entity: string;
  entityId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previousValue?: any;
}): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nv = log.newValue as Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pv = log.previousValue as Record<string, any> | null;
  const action = (log.action || "").toUpperCase();
  const entity = (log.entity || "").toUpperCase();

  if (entity === "AUTH") {
    return nv?.email ? `Successful authentication for account: ${nv.email}` : "User signed into the system";
  }

  if (entity === "PIG_RECEIPT" || entity === "PIG") {
    if (action === "CREATED") {
      const qty = nv?.quantity || nv?.count || 1;
      const tag = nv?.tagNumber ? ` (Tag: ${nv.tagNumber})` : "";
      return `Registered ${qty} pig(s) received into inventory stock${tag}`;
    }
    if (action === "UPDATED") {
      return `Modified pig batch receipt count to ${nv?.newCount || nv?.quantity || "updated"}`;
    }
    if (action === "DELETED") {
      return `Removed incorrect pig receipt batch (${pv?.deletedQuantity || pv?.count || "record"} pigs)`;
    }
  }

  if (entity === "BENEFICIARY") {
    if (action === "CREATED") {
      return `Enrolled beneficiary: ${nv?.fullName || "Family"} (${nv?.beneficiaryNumber || log.entityId})`;
    }
    if (action === "UPDATED") {
      return `Updated registered location / details for beneficiary ${log.entityId}`;
    }
  }

  if (entity.includes("DISTRIBUTION") || action === "DISTRIBUTED") {
    return `Completed distribution of pig asset to beneficiary (Cycle obligation: 2 piglets)`;
  }

  if (entity.includes("RETURN") || action === "RETURNED") {
    const qty = nv?.quantity || 1;
    return `Recorded ${qty} piglet(s) physically returned under revolving agreement`;
  }

  if (entity.includes("VET") || action === "EXAMINED") {
    const diag = nv?.diagnosis ? ` - Diagnosis: ${nv.diagnosis}` : "";
    const health = nv?.healthStatus ? ` [Status: ${nv.healthStatus}]` : "";
    return `Clinical veterinary inspection performed${health}${diag}`;
  }

  if (entity.includes("FINANCE")) {
    const amt = nv?.amount ? ` of ${Number(nv.amount).toLocaleString()} RWF` : "";
    const type = nv?.type ? ` [${nv.type}]` : "";
    return `${action === "APPROVED" ? "Approved" : "Recorded"} financial transaction${amt}${type}`;
  }

  if (entity === "USER") {
    if (action === "CREATED") {
      return `Created new user account: ${nv?.name || ""} (${nv?.email || ""}) with role ${formatRole(nv?.role)}`;
    }
    if (action === "DELETED") {
      return `Deactivated user account: ${pv?.name || pv?.email || log.entityId}`;
    }
  }

  if (entity === "USER_PROFILE") {
    return "Updated personal profile information (name or phone number)";
  }

  if (entity === "USER_SECURITY") {
    return "Updated account credentials / password changed";
  }

  if (entity.includes("SETTING")) {
    if (action === "RESET") return `Restored system setting '${log.entityId}' to factory default value`;
    return `Configured system setting '${log.entityId}' to value '${nv?.value ?? ""}'`;
  }

  if (entity === "STORE_PRODUCT") {
    const prodName = nv?.name || pv?.name || log.entityId;
    if (action === "CREATED") {
      return `Added stock product "${prodName}" (${nv?.stock ?? 0} units at ${Number(nv?.price || 0).toLocaleString()} RWF)`;
    }
    if (action === "UPDATED" || action === "PRICING_AND_DISCOUNT_UPDATED") {
      return `Updated "${prodName}" — stock: ${nv?.stock ?? "unchanged"}, price: ${Number(nv?.price || 0).toLocaleString()} RWF`;
    }
    if (action === "STOCK_UPDATED") {
      return `Adjusted stock for "${prodName}" from ${pv?.stock ?? "?"} to ${nv?.stock ?? "?"} units`;
    }
    if (action === "PUBLISHED" || action === "UNPUBLISHED") {
      return `${action === "PUBLISHED" ? "Published" : "Hidden"} "${prodName}" on Gebyian Website`;
    }
    if (action === "DELETED") {
      return `Deleted stock product "${prodName}" (had ${pv?.stock ?? 0} units at ${Number(pv?.price || 0).toLocaleString()} RWF)`;
    }
  }

  if (entity === "COOPERATIVE") {
    if (action === "CREATED") {
      return `Created cooperative "${nv?.name || ""}" in ${nv?.cellName || "cell"} (max ${nv?.maxMembers ?? 15} members)`;
    }
    if (action === "MANAGER_CHANGED") {
      return `Assigned ${nv?.leaderName || "member"} as Cooperative Manager for "${nv?.cooperativeName || ""}"`;
    }
  }

  if (entity === "COOPERATIVE_MEMBER_REPORT") {
    if (action === "SUBMITTED") {
      return `Submitted ${nv?.reportType || "report"} (${nv?.animalCount ?? 1} animal(s)) to Cooperative Manager`;
    }
    return `Updated member report status to ${nv?.status || action}`;
  }

  // Fallback
  if (nv && typeof nv === "object") {
    const keys = Object.keys(nv).filter((k) => typeof nv[k] !== "object").slice(0, 3);
    if (keys.length > 0) {
      return keys.map((k) => `${k}: ${nv[k]}`).join(", ");
    }
  }

  return `${action} record in ${formatModule(entity)}`;
}
