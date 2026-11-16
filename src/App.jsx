import fahsLogo from "./assets/fahs-logo.png?inline";
import React from "react";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import { carDatabase } from "./carDatabase";
import { carYears } from "./carYears";
import { egyptLocations } from "./egyptLocations";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
useMap,
CircleMarker,
} from "react-leaflet";

const gold = "#0B2F55";
const dark = "#F7F4EF";

const inspectionItems = [
  "فحص خارجي للدهان",
  "فحص داخلي للقوائم والشاسيهات",
  "فحص UV",
  "فحص الموتور والفتيس",
  "فحص نظام التعليق (العفشة)",
  "فحص كنترول السيارة وكنترول الفتيس وكنترول الإيرباج",
  "فحص العداد",
  "فحص الكاوتش والبطارية",
  "فحص كهرباء السيارة والأنوار والتابلوه والمفاتيح",
];

const inputStyle = {
  width: "100%",
  height: "58px",
  padding: "0 18px",
  marginTop: "10px",
  border: "1.5px solid #DCE6ED",
  borderRadius: "18px",
  background: "#F1F3F5",
  color: "#111111",
  fontSize: "18px",
  fontWeight: "600",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginTop: "22px",
  color: "#0B2F55",
  fontWeight: "700",
  fontSize: "18px",
};

function SearchDropdown({ label, value, options, onChange, disabled }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = options.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "relative" }}>
      <label style={labelStyle}>{label}</label>

      <input
        style={inputStyle}
        value={open ? search : value}
        placeholder={`اختر ${label}`}
        disabled={disabled}
        onFocus={() => {
          setSearch("");
          setOpen(true);
        }}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && !disabled && (
        <div
          className="fahs-scroll-list"
          onWheel={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            left: 0,
            maxHeight: "220px",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            touchAction: "pan-y",
            background: "#FFFFFF",
            border: "1px solid #555",
            borderRadius: "10px",
            zIndex: 100,
          }}
        >
          {filtered.map((item) => (
            <div
              key={item}
              onClick={() => {
                onChange(item);
                setSearch("");
                setOpen(false);
              }}
              style={{
                touchAction: "pan-y",
                padding: "12px",
                borderBottom: "1px solid #444",
                cursor: "pointer",
                color: "#0B2F55",
                background: "#FFFFFF",
                fontWeight: 700,
                textAlign: "right",
              }}
            >
              {item.replaceAll("_", " ")}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: "12px", color: "#687987", background: "#FFFFFF" }}>
              لا توجد نتائج
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function LocationMap({ position, setPosition }) {
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        setPosition([
          e.latlng.lat,
          e.latlng.lng
        ]);
      },
    });

    return null;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "300px",
        borderRadius: "14px",
        overflow: "hidden",
        marginTop: "15px",
        border: "2px solid #0B2F55",
      }}
    >
      <MapContainer
        center={position}
        zoom={13}
        style={{
          width: "100%",
          height: "100%",
        }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler />

        <CircleMarker
          center={position}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#0B2F55",
            fillOpacity: 1,
          }}
        />
      </MapContainer>
    </div>
  );
}

function MapClickHandler({ onLocationSelect }) {
  const map = useMapEvents({
    moveend() {
      const center = map.getCenter();

      onLocationSelect([
        center.lat,
        center.lng,
      ]);
    },
  });

  return null;
}
function MapCenterUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  return null;
}

// Store inspection photos in IndexedDB: localStorage is too small for camera images.
const FAHS_PHOTO_DB = "fahs_photo_storage";
const FAHS_PHOTO_STORE = "inspection_photos";
function openFahsPhotoDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB غير مدعوم"));
    const request = indexedDB.open(FAHS_PHOTO_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FAHS_PHOTO_STORE)) db.createObjectStore(FAHS_PHOTO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveFahsPhotos(orderId, photos) {
  if (!orderId) return;
  const db = await openFahsPhotoDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(FAHS_PHOTO_STORE, "readwrite");
    tx.objectStore(FAHS_PHOTO_STORE).put(photos || {}, String(orderId));
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
  db.close();
}
async function loadFahsPhotos(orderId) {
  if (!orderId) return {};
  const db = await openFahsPhotoDB();
  const photos = await new Promise((resolve, reject) => {
    const tx = db.transaction(FAHS_PHOTO_STORE, "readonly");
    const req = tx.objectStore(FAHS_PHOTO_STORE).get(String(orderId));
    req.onsuccess = () => resolve(req.result || {}); req.onerror = () => reject(req.error);
  });
  db.close();
  return photos;
}
function stripPhotosFromOrders(items) {
  return (items || []).map(({ inspectionPhotos, ...item }) => item);
}

export default function App() {
  const [savedDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fahs_order_draft") || "{}"); }
    catch { return {}; }
  });
  const [step, setStep] = useState(() => {
  return Number(localStorage.getItem("fahs_step")) || 1;
});
useEffect(() => {
  localStorage.setItem("fahs_step", String(step));
}, [step]);
  const [page, setPage] = useState(() => {
    const customerSession = localStorage.getItem("fahs_customer_session");
    const engineerSession = localStorage.getItem("fahs_active_engineer");
    const lastPage = localStorage.getItem("fahs_page");
    // Restore authenticated sessions first. If nobody is signed in, preserve
    // the engineer login screen when the app is reopened from the background.
    if (engineerSession) {
      const savedInspection = localStorage.getItem("fahs_current_inspection");
      if (lastPage === "inspection" && savedInspection) return "inspection";
      return "engineerDashboard";
    }
    if (customerSession) return "home";
    if (lastPage === "engineerLogin") return "engineerLogin";
    return "welcome";
  });
const [showReportPage, setShowReportPage] = useState(() => {
  return localStorage.getItem("fahs_show_report") === "true";
});

useEffect(() => {
  localStorage.setItem("fahs_show_report", String(showReportPage));
}, [showReportPage]);

useEffect(() => {
  localStorage.setItem("fahs_page", page);
}, [page]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentInspection, setCurrentInspection] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("fahs_current_inspection")) || null;
  } catch {
    return null;
  }
});
useEffect(() => {
  if (currentInspection) {
    localStorage.setItem(
      "fahs_current_inspection",
      JSON.stringify((({ inspectionPhotos, ...safeInspection }) => safeInspection)(currentInspection))
    );
  } else {
    localStorage.removeItem("fahs_current_inspection");
  }
}, [currentInspection]);
  const [inspectionData, setInspectionData] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("fahs_inspection_data_draft") || "null") || currentInspection?.inspectionData || {};
  } catch {
    return currentInspection?.inspectionData || {};
  }
});

const [inspectionPhotos, setInspectionPhotos] = useState(() => {
  return currentInspection?.inspectionPhotos || {};
});
useEffect(() => {
  let cancelled = false;
  if (currentInspection?.id) {
    loadFahsPhotos(currentInspection.id).then(saved => {
      if (!cancelled && saved && Object.keys(saved).length) setInspectionPhotos(saved);
    }).catch(error => console.warn("تعذر استعادة صور الفحص", error));
  }
  return () => { cancelled = true; };
}, [currentInspection?.id]);
useEffect(() => {
  if (currentInspection?.id) {
    saveFahsPhotos(currentInspection.id, inspectionPhotos).catch(error => {
      console.error("تعذر حفظ صور الفحص", error);
      alert("تعذر حفظ الصورة. تأكد من مساحة التخزين المتاحة ثم حاول مرة أخرى.");
    });
  }
}, [currentInspection?.id, inspectionPhotos]);
useEffect(() => {
  try { localStorage.setItem("fahs_inspection_data_draft", JSON.stringify(inspectionData)); }
  catch (error) { console.warn("تعذر حفظ مسودة بيانات الفحص محلياً", error); }
}, [inspectionData]);
const [expandedOrder, setExpandedOrder] = useState(() => {
  return localStorage.getItem("fahs_expanded_order") || null;
});  const reportRef = useRef(null);
const reportPageScrollRef = useRef(null);

useEffect(() => {
  if (expandedOrder) {
    localStorage.setItem("fahs_expanded_order", expandedOrder);
  } else {
    localStorage.removeItem("fahs_expanded_order");
  }
}, [expandedOrder]);

  useEffect(() => {
  if (!currentInspection) return;

  const updatedInspection = {
    ...currentInspection,
    inspectionData,
    inspectionPhotos
  };

  setCurrentInspection(updatedInspection);

  setOrders(prev => {
    const updatedOrders = prev.map(item =>
      item.id === currentInspection.id
        ? { ...item, inspectionData, inspectionPhotos }
        : item
    );

    localStorage.setItem("fahs_orders", JSON.stringify(stripPhotosFromOrders(updatedOrders)));
    return updatedOrders;
  });
}, [inspectionData, inspectionPhotos]);
const [orders, setOrders] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("fahs_orders") || "[]");
  } catch {
    return [];
  }
});

useEffect(() => {
  try { localStorage.setItem("fahs_orders", JSON.stringify(stripPhotosFromOrders(orders))); }
  catch (error) { console.warn("تعذر حفظ الطلبات محلياً", error); }
}, [orders]);

  const [brand, setBrand] = useState(savedDraft.brand || "");
  const [model, setModel] = useState(savedDraft.model || "");
  const [year, setYear] = useState(savedDraft.year || "");

const [governorate, setGovernorate] = useState("");
const [area, setArea] = useState("");
const [location, setLocation] = useState(savedDraft.location || "");
const [landmark, setLandmark] = useState(savedDraft.landmark || "");
const [notes, setNotes] = useState(savedDraft.notes || "");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapPosition, setMapPosition] = useState(savedDraft.mapPosition || [30.0444, 31.2357]);
  const [gpsCoordinates, setGpsCoordinates] = useState(savedDraft.gpsCoordinates || null);
  const [showMap, setShowMap] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
const [mapSearchResults, setMapSearchResults] = useState([]);
const [mapSearching, setMapSearching] = useState(false);
const [selectedMapAddress, setSelectedMapAddress] = useState("");
useEffect(() => {
  localStorage.setItem("fahs_order_draft", JSON.stringify({
    brand, model, year, location, landmark, notes, mapPosition, gpsCoordinates,
  }));
}, [brand, model, year, location, landmark, notes, mapPosition, gpsCoordinates]);

useEffect(() => {
  if (!mapSearch.trim()) {
    setMapSearchResults([]);
    return;
  }

  const timer = setTimeout(async () => {
    setMapSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=eg&limit=5&addressdetails=1&accept-language=ar&q=${encodeURIComponent(mapSearch)}`
      );

      const results = await response.json();
      setMapSearchResults(results);
    } catch (error) {
      console.error("Map search error:", error);
      setMapSearchResults([]);
    }

    setMapSearching(false);
  }, 600);

  return () => clearTimeout(timer);
}, [mapSearch]);
// FAHS Engineers System

const [engineers, setEngineers] = useState(() => {
  
  try {
    return JSON.parse(
      localStorage.getItem("fahs_engineers") || "[]"
    );
  } catch {
    return [];
  }
});
const [engineerPhone, setEngineerPhone] = useState("");
const [engineerPassword, setEngineerPassword] = useState("");
const [engineerLoginBusy, setEngineerLoginBusy] = useState(false);
const [customerAccounts, setCustomerAccounts] = useState(() => {
  try { return JSON.parse(localStorage.getItem("fahs_customers") || "[]"); }
  catch { return []; }
});
const [activeCustomer, setActiveCustomer] = useState(() => {
  try { return JSON.parse(localStorage.getItem("fahs_customer_session") || "null"); }
  catch { return null; }
});
const [customerName, setCustomerName] = useState("");
const [customerPhone, setCustomerPhone] = useState("");
const [customerPassword, setCustomerPassword] = useState("");
const [customerEmail, setCustomerEmail] = useState("");
const [customerAuthMode, setCustomerAuthMode] = useState("login");
const [customerCode, setCustomerCode] = useState("");
const [customerOtpBusy, setCustomerOtpBusy] = useState(false);
const [pendingCustomer, setPendingCustomer] = useState(null);
const [authError, setAuthError] = useState("");
const normalizeEgyptPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^01[0125]\d{8}$/.test(digits)) return `+2${digits}`;
  if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^00201[0125]\d{8}$/.test(digits)) return `+${digits.slice(2)}`;
  return null;
};

const requestCustomerOtp = async (mode) => {
  setAuthError("");
  if (!isSupabaseConfigured || !supabase) {
    setAuthError("الاتصال بقاعدة البيانات غير مُعد. راجع إعدادات Supabase أولاً.");
    return;
  }
  const phone = normalizeEgyptPhone(mode === "register" ? customerPhone : customerPhone);
  if (!phone) {
    setAuthError("اكتب رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.");
    return;
  }
  if (mode === "register" && !customerName.trim()) {
    setAuthError("اكتب الاسم قبل إرسال رمز التحقق.");
    return;
  }
  if (mode === "register" && customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    setAuthError("اكتب بريد إلكتروني صحيح أو اتركه فارغًا.");
    return;
  }
  setCustomerOtpBusy(true);
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: mode === "register",
        channel: "sms",
        ...(mode === "register" ? { data: { name: customerName.trim(), email: customerEmail.trim() || null, role: "customer" } } : {})
      }
    });
    if (error) throw error;
    setPendingCustomer({ name: customerName.trim(), phone, email: customerEmail.trim(), mode });
    setCustomerCode("");
    setCustomerAuthMode(mode);
    setPage("customerVerify");
    setAuthError("تم طلب رمز SMS. أدخل الرمز الذي وصلك على هاتفك.");
  } catch (error) {
    console.error("Customer OTP request failed:", error);
    setAuthError(error.message || "تعذر إرسال رمز التحقق. راجع إعدادات مزود SMS في Supabase.");
  } finally {
    setCustomerOtpBusy(false);
  }
};

const verifyCustomerOtp = async () => {
  if (!pendingCustomer || !customerCode.trim()) {
    setAuthError("اكتب رمز التحقق المرسل إلى هاتفك.");
    return;
  }
  if (!supabase) {
    setAuthError("الاتصال بقاعدة البيانات غير مُعد.");
    return;
  }
  setCustomerOtpBusy(true);
  setAuthError("");
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: pendingCustomer.phone,
      token: customerCode.trim(),
      type: "sms"
    });
    if (error) throw error;
    if (!data?.user) throw new Error("لم يتم تأكيد هوية الحساب.");

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, auth_user_id, name, phone, email, status")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();
    if (customerError) throw customerError;

    const account = {
      id: customer?.id || null,
      auth_user_id: data.user.id,
      name: customer?.name || data.user.user_metadata?.name || pendingCustomer.name || "عميل FAHS",
      phone: customer?.phone || data.user.phone || pendingCustomer.phone,
      email: customer?.email || data.user.user_metadata?.email || pendingCustomer.email || ""
    };
    setActiveCustomer(account);
    setPendingCustomer(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerCode("");
    setCustomerPhone("");
    setAuthError("");
    setPage("home");
    setStep(1);
  } catch (error) {
    console.error("Customer OTP verification failed:", error);
    setAuthError(error.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
  } finally {
    setCustomerOtpBusy(false);
  }
};

useEffect(() => { localStorage.setItem("fahs_customers", JSON.stringify(customerAccounts)); }, [customerAccounts]);
useEffect(() => {
  if (activeCustomer) localStorage.setItem("fahs_customer_session", JSON.stringify(activeCustomer));
  else localStorage.removeItem("fahs_customer_session");
}, [activeCustomer]);

const [activeEngineer, setActiveEngineer] = useState(() => {
  try { return JSON.parse(localStorage.getItem("fahs_active_engineer") || "null"); }
  catch { return null; }
});
const [engineerView, setEngineerView] = useState("all");
const [adminDistributionMode, setAdminDistributionMode] = useState(() => localStorage.getItem("fahs_distribution_mode") || "manual");
useEffect(() => { localStorage.setItem("fahs_distribution_mode", adminDistributionMode); }, [adminDistributionMode]);
useEffect(() => {
  if (activeEngineer) localStorage.setItem("fahs_active_engineer", JSON.stringify(activeEngineer));
  else localStorage.removeItem("fahs_active_engineer");
}, [activeEngineer]);
useEffect(() => {
  // Keep non-secret local engineer data only; never persist passwords in localStorage.
  const safeEngineers = engineers.map(({ password, ...engineer }) => engineer);
  localStorage.setItem("fahs_engineers", JSON.stringify(safeEngineers));
}, [engineers]);
  const brands = Object.keys(carDatabase);
  const governorates = Object.keys(egyptLocations);

const areas = governorate
  ? egyptLocations[governorate] || []
  : [];

  const models = brand ? carDatabase[brand] || [] : [];

  const yearRange =
    brand && model && model !== "موديل آخر"
      ? carYears[brand]?.[model]
      : null;

  const availableYears = yearRange
    ? Array.from(
        { length: yearRange[1] - yearRange[0] + 1 },
        (_, index) => String(yearRange[1] - index)
      )
    : [];

  // السعر الحالي موحد لجميع السيارات
  const inspectionPrice = 1500;

  const getLocation = async () => {
  if (!navigator.geolocation) {
    alert("المتصفح لا يدعم تحديد الموقع");
    return;
  }

  setGpsLoading(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setMapPosition([lat, lng]);
      setGpsCoordinates({ lat, lng });

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`
        );

        if (!response.ok) {
          throw new Error("Geocoding failed");
        }

        const result = await response.json();
        const address = result.display_name || "تم تحديد الموقع بنجاح";
        setLocation(address);
        setSelectedMapAddress(address);
      } catch (error) {
        setLocation("تم تحديد الموقع، لكن تعذر جلب العنوان تلقائيًا.");
        alert("تم تحديد موقعك، لكن تعذر تحويله إلى عنوان تلقائي.");
      }

      setGpsLoading(false);
    },
    (error) => {
      setGpsLoading(false);
      alert("تعذر تحديد موقعك. تأكد من السماح بالوصول للموقع وحاول مرة أخرى.");
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
};

  const nextStep = () => {
    if (step === 1) {
      if (!brand || !model || !year) {
        alert("من فضلك أكمل بيانات السيارة");
        return;
      }
    }

    if (step === 2) {
      if (!gpsCoordinates || !location.trim()) {
        alert("من فضلك حدد موقع السيارة على الخريطة أو باستخدام تحديد الموقع تلقائيًا");
        return;
      }
    }

    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const confirmOrder = () => {
  const newOrder = {
    id: "FAHS-" + Date.now(),
    date: new Date().toLocaleString("ar-EG"),
    // حفظ بيانات الحساب مع الطلب حتى تظهر في تقرير العميل لاحقاً
    clientName: activeCustomer?.name || "",
    phone: activeCustomer?.phone || "",
    customerEmail: activeCustomer?.email || "",
    brand,
    model,
    year,
    inspectionPrice,
    governorate: "",
    area: "",
    location,
    gpsCoordinates,
landmark,
notes,
    service: "فحص شامل للسيارة",
    status: "طلب جديد",
    assignedEngineerId: null,
    distributionMode: localStorage.getItem("fahs_distribution_mode") || "manual",
  };

  const savedOrders = JSON.parse(
    localStorage.getItem("fahs_orders") || "[]"
  );

  savedOrders.unshift(newOrder);
setOrders(savedOrders);
  localStorage.setItem(
    "fahs_orders",
    JSON.stringify(savedOrders)
  );

setStep(4);
  setBrand("");
  setModel("");
  setYear("");
  setLocation("");
  setGpsCoordinates(null);
  setLandmark("");
  setNotes("");
  setMapPosition([30.0444, 31.2357]);
};

  const cardStyle = {
    background: "transparent",
    border: "none",
    borderRadius: "0",
    padding: "16px 10px",
    marginBottom: "18px",
    color: "#0B2F55",
    boxShadow: "none",
  };

  const buttonStyle = {
  width: "100%",
  padding: "14px",
  minHeight: "52px",
  border: "none",
  borderRadius: "14px",
  background: "#0B2F55",
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "24px",
  boxShadow: "0 4px 12px rgba(11,47,85,0.12)",
};

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#F7F4EF",
        color: "#111111",
        fontFamily: "Cairo, Arial, sans-serif",
        paddingBottom: "35px",
      }}
    >
      <style>{`
        html, body, #root { max-width: 100%; overflow-x: hidden; background: #F7F4EF; }
        body, button, input, select, textarea { font-family: Cairo, Arial, sans-serif !important; }
        main { width: 100%; max-width: 600px; box-sizing: border-box; overflow-x: hidden; }
        main section, main div { box-sizing: border-box; }
        main h1, main h2 { font-size: 1em; }
        main h3, main h4 { font-size: 0.96em; }
        main p, main label, main button, main input, main select, main textarea,
        nav button, section small, section span, main li { font-size: 0.92em; }
        main input, main select, main textarea { max-width: 100%; min-height: 52px !important; border-radius: 18px !important; box-sizing: border-box !important; }
        main input, main select, main textarea { background: #fff !important; color: #111111 !important; border: 1.5px solid #D8D2CA !important; padding: 0 18px !important; font-weight: 600 !important; }
        main input::placeholder, main textarea::placeholder { color: #777777 !important; opacity: 1; }
        main input::placeholder, main textarea::placeholder { color: #777777 !important; opacity: 1; }
        /* FAHS engineer inspection report: readable cards and native choice controls */
        .fahs-inspection-form { color: #0B2F55 !important; }
        .fahs-inspection-form h2, .fahs-inspection-form h3,
        .fahs-inspection-form strong, .fahs-inspection-form label,
        .fahs-inspection-form p { color: #0B2F55 !important; }
        .fahs-inspection-form > div { color: #0B2F55 !important; }
        .fahs-inspection-form input[type="checkbox"],
        .fahs-inspection-form input[type="radio"] {
          appearance: auto !important; -webkit-appearance: auto !important;
          width: 22px !important; height: 22px !important;
          min-height: 22px !important; min-width: 22px !important;
          padding: 0 !important; margin: 0 0 0 7px !important;
          border: initial !important; border-radius: 4px !important;
          background: initial !important; accent-color: #0B2F55 !important;
          vertical-align: middle !important; flex: 0 0 auto !important;
        }
        .fahs-inspection-form input[type="radio"] { border-radius: 50% !important; }
        .fahs-inspection-form input[type="number"],
        .fahs-inspection-form textarea { color: #111111 !important; background: #FFFFFF !important; }
        .fahs-inspection-form textarea { min-height: 120px !important; padding: 12px !important; }
        .fahs-inspection-form label { display: inline-flex; align-items: center; gap: 5px; color: #0B2F55 !important; }
        .fahs-scroll-list {
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior-y: contain !important;
          touch-action: pan-y !important;
          pointer-events: auto !important;
        }
        .fahs-scroll-list > * { touch-action: pan-y; }
        button { -webkit-tap-highlight-color: transparent; }
        @media (max-width: 480px) {
          header { min-height: 0 !important; }
          main { padding-top: 10px !important; }
        }
      `}</style>
      <header
        style={{
          position: "relative",
          background: "linear-gradient(135deg,#F4EFE7 0%,#FBF9F5 58%,#EDE6DC 100%)",
          borderBottom: "2px solid #0B2F55",
          padding: "5px 12px 8px",
          textAlign: "center",
          boxShadow: "0 3px 12px rgba(11,47,85,0.08)",
          minHeight: "0",
        }}
      >
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"76px",lineHeight:1}}>
          <img src={fahsLogo} alt="FAHS فحص" style={{display:"block",width:"min(260px, 72vw)",maxHeight:"82px",height:"auto",objectFit:"contain"}} />
        </div>
        <p style={{ color: "#111111", fontSize: "12px", fontWeight:700, margin: "2px 0", lineHeight: 1.35 }}>إفحص سيارتك في مكانك قبل الشراء</p>
        <p style={{ color: "#222222", fontSize: "10px", margin: "1px 0", lineHeight: 1.3 }}>مع أفضل مهندسين متخصصين وأحدث الأجهزة</p>
        <p style={{ color: "#0B2F55", fontSize: "10px", fontWeight: "700", margin: "2px 0 0", lineHeight: 1.25 }}>مع FAHS أنت في أمان 🛡️</p>
      </header>

      <main style={{ width: "100%", maxWidth: "600px", margin: "auto", padding: "14px", boxSizing: "border-box", overflowX: "hidden" }}>
       {/* زر القائمة الجانبية */}
<button
  onClick={() => setMenuOpen((open) => !open)}
  style={{
  position: "fixed",
  top: "20px",
  left: "20px",
  zIndex: 10000,
  background: "#FFFFFF",
  color: "#0B2F55",
  border: "1.5px solid #0B2F55",
  borderRadius: "10px",
  width: "48px",
  height: "48px",
  fontSize: "24px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}}
>
  ☰
</button>

{/* قائمة منفصلة للعميل والمهندس */}
{menuOpen && (
  <div onClick={() => setMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.26)",zIndex:9999}}>
    <nav onClick={(e) => e.stopPropagation()} style={{position:"absolute",top:0,left:0,width:"min(280px,72vw)",height:"100dvh",overflowY:"auto",boxSizing:"border-box",padding:"22px 14px",background:"#FFFFFF",borderRight:`2px solid ${gold}`,direction:"rtl",boxShadow:"8px 0 28px rgba(0,0,0,0.18)"}}>
      <div style={{textAlign:"center",padding:"16px 8px 20px",borderBottom:"1px solid #DCE3E9",background:"#FFFFFF"}}>
        <img src={fahsLogo} alt="FAHS فحص" style={{ display: "block", width: "190px", maxWidth: "100%", height: "auto", margin: "0 auto 8px", objectFit: "contain" }} />
        <div style={{fontSize:12,color:"#0B2F55",marginTop:8,fontWeight:700}}>🛡️ مع FAHS أنت في أمان</div>
        {activeEngineer && <p style={{fontSize:13,color:"#0B2F55"}}>م. {activeEngineer.name}</p>}
      </div>
      {(activeEngineer ? [
        ["🏠 الرئيسية", "available"],
        ["📋 طلبات مقبولة", "accepted"],
        ["📑 طلبات مكتملة", "completed"],
        ["👤 الحساب الشخصي", "engineerProfile"],
        ["💬 تواصل مع الإدارة", "contact"]
      ] : (activeCustomer ? [
        ["🏠 الرئيسية", "home"],
        ["📋 طلباتي السابقة", "orders"],
        ["👤 حسابي الشخصي", "customerProfile"],
        ["☎️ تواصل معنا", "contact"],
        ["🚪 تسجيل الخروج", "logout"]
      ] : [
        ["👤 العميل - تسجيل الدخول", "welcome"],
        ["👨‍🔧 مهندسين FAHS", "engineerLogin"],
        ["🛡️ لوحة الإدارة", "admin"],
        ["☎️ تواصل معنا", "contact"]
      ])).map(([label, target]) => (
        <button key={target} type="button" onClick={() => {
          setMenuOpen(false);
          if (target === "logout") {
            setActiveEngineer(null);
            setActiveCustomer(null);
            setEngineerPhone("");
            setEngineerPassword("");
            setCustomerPhone("");
            setCustomerPassword("");
            setBrand("");
            setModel("");
            setYear("");
            setLocation("");
            setLandmark("");
            setNotes("");
            setMapPosition([30.0444, 31.2357]);
            setGpsCoordinates(null);
            setSelectedMapAddress("");
            setMapSearch("");
            setMapSearchResults([]);
            setGovernorate("");
            setArea("");
            setShowMap(false);
            setStep(1);
            localStorage.removeItem("fahs_order_draft");
            localStorage.removeItem("fahs_page");
            localStorage.removeItem("fahs_show_report");
            localStorage.removeItem("fahs_report_scroll");
            localStorage.setItem("fahs_step", "1");
            setShowReportPage(false);
            setExpandedOrder(null);
            setPage("welcome");
            return;
          }
          if (["available","accepted","completed"].includes(target)) {setEngineerView(target);setPage("engineerDashboard");window.scrollTo(0,0);return;}
          if (target === "home") {setStep(1);setPage("home");window.scrollTo(0, 0);return;}
          setPage(target);
        }} style={{...buttonStyle,marginTop:12,minHeight:48,padding:"12px",fontSize:15,textAlign:"right",background: ((activeEngineer && page === "engineerDashboard" && engineerView === target) || page === target) ? gold : "#FFFFFF",color:((activeEngineer && page === "engineerDashboard" && engineerView === target) || page === target) ? "#FFFFFF" : "#0B2F55",border:`1px solid ${gold}`,boxShadow:"none"}}>{label}</button>
      ))}
      <button type="button" onClick={() => setMenuOpen(false)} style={{...buttonStyle,background:"#EAF1F7",color:"#0B2F55",border:"1.5px solid #B8C9D8",boxShadow:"0 2px 8px rgba(11,47,85,0.10)",marginTop:16,minHeight:50,fontSize:16,fontWeight:800}}>✕ إغلاق القائمة</button>
    </nav>
  </div>
)}

        {page === "home" && !activeEngineer && (
        <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    margin: "8px 0 2px",
    padding: "4px 10px",
    background: "#F7F4EF",
    border: "1px solid #F7F4EF",
    borderRadius: "15px",
  }}
>
  {["بيانات السيارة", "موقع الفحص", "مراجعة الطلب"].map(
    (title, index) => {
      const active = step === index + 1;
      const completed = step > index + 1;

      return (
        <div
          key={title}
          style={{
            flex: 1,
            textAlign: "center",
            color: active || completed ? gold : "#777",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              margin: "0 auto 8px",
              borderRadius: "50%",
              background: active || completed ? gold : "#FFFFFF",
              color: active || completed ? "#111" : "#aaa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            {completed ? "✓" : index + 1}
          </div>

          <div style={{ fontSize: "14px", fontWeight: "bold" }}>
            {title}
          </div>

          <div
            style={{
              height: "3px",
              background: active || completed ? gold : "#444",
              borderRadius: "5px",
              marginTop: "10px",
            }}
          />
        </div>
      );
    }
  )}
</div>
        )}
{page === "welcome" && !activeCustomer && !activeEngineer && (
  <section style={{...cardStyle, textAlign:"center", marginTop:24, background:"transparent", border:"none", borderRadius:0, boxShadow:"none", padding:"16px 10px"}}>
    <input type="tel" dir="rtl" placeholder="رقم الموبايل" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} style={{...inputStyle,textAlign:"right",direction:"rtl"}}/>
    {authError && <p style={{color:"#b91c1c",fontWeight:700}}>{authError}</p>}
    <button style={buttonStyle} disabled={customerOtpBusy} onClick={()=>requestCustomerOtp("login")}>{customerOtpBusy ? "جاري الإرسال..." : "إرسال رمز التأكيد SMS"}</button>
    <button style={{...buttonStyle,marginTop:10,background:"#FFFFFF",color:gold,border:`1px solid ${gold}`}} onClick={()=>{setAuthError("");setCustomerAuthMode("register");setPage("customerRegister");}}>مستخدم جديد</button>
  </section>
)}
{page === "customerRegister" && (
  <section style={cardStyle}>
    <h2 style={{color:gold,textAlign:"center"}}>إنشاء حساب جديد</h2>
    <input style={{...inputStyle,textAlign:"right",direction:"rtl"}} placeholder="الاسم" value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
    <input style={{...inputStyle,textAlign:"right",direction:"rtl"}} placeholder="رقم الموبايل" type="tel" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
    <input style={{...inputStyle,textAlign:"right",direction:"rtl"}} placeholder="البريد الإلكتروني" type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)}/>
    {authError && <p style={{color:"#b91c1c",fontWeight:700}}>{authError}</p>}
    <button style={buttonStyle} disabled={customerOtpBusy} onClick={()=>requestCustomerOtp("register")}>{customerOtpBusy ? "جاري الإرسال..." : "إرسال رمز التأكيد SMS"}</button>
    <button style={{...buttonStyle,background:"#E8EEF5",color:gold}} onClick={()=>{setAuthError("");setPage("welcome");}}>رجوع</button>
  </section>
)}
{page === "customerVerify" && pendingCustomer && (
  <section style={cardStyle}>
    <h2 style={{color:gold,textAlign:"center"}}>تأكيد رقم الموبايل</h2>
    <p style={{color:"#263746",textAlign:"center"}}>أدخل رمز التأكيد للمتابعة.</p>
    <div style={{padding:14,background:"#EAF4FA",borderRadius:10,textAlign:"center",color:gold,fontSize:14,fontWeight:"700"}}>تم إرسال الرمز إلى {pendingCustomer.phone}</div>
    <input style={{...inputStyle,textAlign:"center",direction:"ltr"}} placeholder="رمز التأكيد" value={customerCode} onChange={e=>setCustomerCode(e.target.value)} inputMode="numeric"/>
    {authError && <p style={{color:"#b91c1c",textAlign:"center"}}>{authError}</p>}
    <button style={buttonStyle} disabled={customerOtpBusy} onClick={verifyCustomerOtp}>{customerOtpBusy ? "جاري التحقق..." : "تأكيد الرمز والدخول"}</button>
  </section>
)}
{page === "customerForgot" && (
  <section style={cardStyle}><h2 style={{color:gold}}>استرجاع كلمة المرور</h2><p style={{color:"#ddd"}}>الاسترجاع التجريبي متاح بعد ربط خدمة التحقق الفعلية. تواصل مع الدعم لإعادة ضبط الحساب.</p><button style={buttonStyle} onClick={()=>setPage("welcome")}>العودة لتسجيل الدخول</button></section>
)}
{page === "customerProfile" && (
  <section style={cardStyle}><h2 style={{color:gold}}>👤 حسابي الشخصي</h2>
    <p>الاسم: {activeCustomer?.name || "—"}</p><p>رقم الموبايل: {activeCustomer?.phone || "—"}</p>
    <button style={buttonStyle} onClick={() => setPage("home")}>العودة للرئيسية</button>
  </section>
)}
{page === "engineerProfile" && (
  <section style={{...cardStyle,background:"#FFFFFF",border:"1px solid #E3DED5",borderRadius:16,padding:20,boxShadow:"0 4px 14px rgba(11,47,85,.06)"}}><h2 style={{color:"#C49A36",textAlign:"right"}}>👤 الحساب الشخصي</h2>
    <p style={{color:"#0B2F55"}}>الاسم: {activeEngineer?.name || "غير محدد"}</p>
    <p style={{color:"#0B2F55"}}>الهاتف: {activeEngineer?.phone || "غير محدد"}</p>
    <p style={{color:"#0B2F55"}}>حالة الاعتماد: {activeEngineer?.status || "غير محدد"}</p>
    <button style={{...buttonStyle,background:"#A52A2A",color:"#FFFFFF",marginTop:18}} onClick={() => {setActiveEngineer(null);setEngineerPhone("");setEngineerPassword("");setEngineerView("available");setPage("welcome");window.scrollTo(0,0);}}>تسجيل الخروج</button>
  </section>
)}
{page === "contact" && (
  <section style={cardStyle}><h2 style={{color:gold}}>☎️ تواصل معنا</h2>
    <p>سيتم إضافة وسائل التواصل الرسمية مع فريق FAHS قبل إطلاق التطبيق.</p>
    <button style={buttonStyle} onClick={() => setPage(activeEngineer ? "engineerDashboard" : "home")}>رجوع</button>
  </section>
)}
{page === "privacy" && (
  <section style={cardStyle}><h2 style={{color:gold}}>🔒 سياسة الخصوصية</h2>
    <p>سيتم نشر سياسة الخصوصية المعتمدة قبل إطلاق التطبيق. هذه الصفحة لا تمثل سياسة نهائية.</p>
    <button style={buttonStyle} onClick={() => setPage("home")}>رجوع</button>
  </section>
)}
{page === "orders" && (
    <section style={cardStyle}>
    <h2 style={{ color: gold, marginTop: 0 }}>
      📋 طلباتي
    </h2>

    {orders.length === 0 ? (
      <p style={{ color: "#aaa", textAlign: "center" }}>
        لا توجد طلبات فحص حتى الآن
      </p>
    ) : (
      orders.map((order) => {
        const isExpanded = expandedOrder === order.id;
        return ( <div
          key={order.id}
          style={{
            background: "#FFFFFF",
            border: "1px solid #444",
            borderRadius: "12px",
            padding: "15px",
            marginBottom: "15px",
          }}
        >

          <h3 style={{ color: gold }}>
            {order.id}
          </h3>

          <p>تاريخ الطلب: {order.date}</p>

          <p>
            السيارة: {order.brand?.replaceAll("_", " ")}{" "}
            {order.model}
          </p>

          <p>سنة الصنع: {order.year}</p>
          <p style={{ color: gold, fontWeight: "bold" }}>سعر الفحص: {(order.inspectionPrice ?? 1500).toLocaleString("en-US")} جنيه</p>

          <p>الموقع: {order.location || "غير محدد"}</p>

          <p>العنوان بالتفصيل: {order.landmark || "لم يتم إضافته"}</p>

          <p>
            الحالة: <span style={{ color: "#0B2F55" }}>
              {order.status}
            </span>
          </p>
          {order.status === "تم الفحص" && order.inspectionData && (
  <button
  style={{ ...buttonStyle, width: "100%", marginTop: "10px" }}
  onClick={async () => {
    try {
      const savedPhotos = await loadFahsPhotos(order.id);
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, inspectionPhotos: savedPhotos } : item));
    } catch (error) { console.warn("تعذر تحميل صور التقرير", error); }
    setExpandedOrder(order.id);
    setShowReportPage(true);
  }}
>
  📄 عرض تقرير الفحص
</button>
)}


{expandedOrder === order.id && order.inspectionData && (() => {
  const data = order.inspectionData || {};
  const photos = order.inspectionPhotos || {};
  const linkedCustomer = customerAccounts.find(account =>
    String(account.phone || "").replace(/\D/g, "") === String(order.phone || "").replace(/\D/g, "")
  ) || (activeCustomer && String(activeCustomer.phone || "").replace(/\D/g, "") === String(order.phone || "").replace(/\D/g, "") ? activeCustomer : null);
  const reportCustomerName = linkedCustomer?.name || order.clientName || "—";
  const reportCustomerPhone = linkedCustomer?.phone || order.phone || "—";

  const exteriorParts = [
    "الإكصدام الأمامي",
    "الكبوت",
    "الرفرف الأمامي يمين",
    "الباب الأمامي يمين",
    "الباب الخلفي يمين",
    "الرفرف الخلفي يمين",
    "الإكصدام الخلفي",
    "الرفرف الخلفي يسار",
    "الباب الخلفي يسار",
    "الباب الأمامي يسار",
    "الرفرف الأمامي يسار",
    "العتب الخارجي يمين",
    "العتب الخارجي يسار",
    "السقف",
    "الشنطة"
  ];

  const chassisParts = [
    "الشاسيه الأمامي يمين",
    "الشاسيه الأمامي يسار",
    "الشاسيه الخلفي يمين",
    "الشاسيه الخلفي يسار",
    "القائم الأمامي يمين",
    "العتب الداخلي الأمامي يمين",
    "القائم الأوسط يمين",
    "العتب الداخلي الخلفي يمين",
    "القائم الخلفي يمين",
    "القائم الأمامي يسار",
    "العتب الداخلي الأمامي يسار",
    "القائم الأوسط يسار",
    "العتب الداخلي الخلفي يسار",
    "القائم الخلفي يسار",
    "أرضية السيارة",
    "حوض الموتور",
    "حوض الشنطة"
  ];

  const mechanicalParts = [
    "الموتور",
    "الفتيس",
    "نظام التبريد",
    "طنابير أمامي",
    "تيل أمامي",
    "طنابير خلفي",
    "تيل خلفي",
    "العفشة الأمامية",
    "العفشة الخلفية",
    "التكييف"
  ];

  const tires = [
    "كاوتش أمامي يمين",
    "كاوتش أمامي يسار",
    "كاوتش خلفي يمين",
    "كاوتش خلفي يسار"
  ];

  const electricalParts = [
    "كنترول السيارة",
    "كنترول الفتيس",
    "الإيرباج",
    "الإضاءة الأمامية",
    "الإضاءة الخلفية",
    "الزجاج الكهربائي",
    "المرايات الكهربائية",
    "الكاسيت والسماعات",
    "حساسات السيارة",
    "كاميرا السيارة",
    "السنتر لوك",
    "البطارية"
  ];
const allParts = [...exteriorParts, ...chassisParts];
  const formatValue = (value) => {
    if (Array.isArray(value)) return value.join("، ");
    if (typeof value === "boolean") return value ? "نعم" : "لا";
    if (value && typeof value === "object") return JSON.stringify(value);
    return value || "لم يتم تسجيل نتيجة";
  };

  const hasValue = (value) =>
    value !== undefined &&
    value !== null &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0);

  const isProblem = (value) => {
    const text = String(formatValue(value)).toLowerCase();

    return [
      "سيئ",
      "سيئة",
      "غير سليم",
      "لا يعمل",
      "لا تعمل",
      "يوجد أعطال",
      "يوجد تسريب",
      "تحتاج تغيير",
      "تحتاج مراجعة",
      "يحتاج صيانة",
      "متوسط",
      "رش",
      "استعدال",
      "قطع أو لحام",
      "تم الفك من قبل"
    ].some(word => text.includes(word.toLowerCase()));
  };

  const statusColor = (value) => {
  if (!hasValue(value)) return "#64748b";

  const result = String(formatValue(value)).trim();

  // أخضر: فابريكا أو سليم
  if (
    result.includes("فابريكا") ||
result.includes("سليم") ||
result.includes("لا يوجد أعطال") ||
result === "جيدة"
  ) {
    return "#15803d";
  }

  // برتقالي: متوسط
  if (result.includes("متوسط")) {
    return "#ea580c";
  }

  // أحمر: أي نتيجة أخرى
  return "#dc2626";
};

  const findings = [...exteriorParts, ...chassisParts]
    .filter(part => hasValue(data[part]) && isProblem(data[part]))
    .map(part => `${part}: ${formatValue(data[part])}`);

  const electricalFindings = electricalParts
    .filter(part => hasValue(data[part]) && isProblem(data[part]));

  const mechanicalFindings = mechanicalParts
    .filter(part => hasValue(data[part]) && isProblem(data[part]));

  const tireFindings = tires
    .filter(tire => hasValue(data[tire]) && isProblem(data[tire]));

  const recommendationWords = [
  "غير سليم",
  "لا يعمل",
  "لا تعمل",
  "يوجد أعطال",
  "يوجد تسريب",
  "تحتاج تغيير",
  "يحتاج صيانة",
  "قطع ولحام",
  "استعدال",
  "رش",
  "دهان",
  "تم الفك من قبل"
];

const recommendations = [
  ...new Set([
    ...allParts,
    ...mechanicalParts,
    ...tires,
    ...electricalParts
  ])
]
  .filter(part => hasValue(data[part]))
  .filter(part =>
    recommendationWords.some(word =>
      String(formatValue(data[part])).includes(word)
    )
  )
  .map(part => `${part}: ${formatValue(data[part])}`);

  const gold = "#c49a36";
  const navy = "#17365d";
  const blue = "#2864a5";

  const sectionTitle = {
  background: navy,
  color: "#ffffff",
  padding: "8px 10px",
  borderRight: `4px solid ${gold}`,
  fontSize: "15px",
  margin: "8px 0 6px",
  fontWeight: "bold",
  textAlign: "center",
  lineHeight: "1.5"
};

  const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "11px",
  tableLayout: "fixed"
};

const cellStyle = {
  border: "1px solid #d7dee8",
  padding: "7px",
  textAlign: "right",
  verticalAlign: "middle",
  lineHeight: "1.6",
  fontSize: "12px",
  fontWeight: "bold"
};

  const renderPartGrid = (parts) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "7px"
  }}>
    {parts.map(part => (
      <div key={part} style={{
        border: "1px solid #d7dee8",
        borderRight: `3px solid ${gold}`,
        padding: "6px",
        minHeight: "30px",
        background: "#ffffff",
        fontSize: "13px",
fontWeight: "bold",
        lineHeight: "1.5"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "6px"
        }}>
          <span>{part}</span>
          <strong style={{
            color: statusColor(data[part]),
            textAlign: "left"
          }}>
            ({formatValue(data[part])})
          </strong>
        </div>

        {(photos[part] || []).length > 0 && (
          <div style={{
            display: "flex",
            gap: "5px",
            marginTop: "5px",
            flexWrap: "wrap"
          }}>
            {photos[part].slice(0, 2).map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={part}
                style={{
                  width: "45px",
                  height: "32px",
                  objectFit: "cover",
                  border: "1px solid #cbd5e1"
                }}
              />
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
);

  const reportPageStyle = {
    width: "100%",
maxWidth: "210mm",
    height: "auto",
    padding: "8mm",
    margin: "0 auto",
    background: "#ffffff",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Ctext x='300' y='220' text-anchor='middle' font-family='Arial' font-size='115' font-weight='bold' fill='%23c49a36' fill-opacity='0.09' transform='rotate(-25 300 200)'%3EFAHS%3C/text%3E%3C/svg%3E")`,
backgroundRepeat: "no-repeat",
backgroundPosition: "center",
backgroundSize: "350mm auto",
    color: "#202b3c",
    direction: "rtl",
    textAlign: "right",
    fontFamily: "Arial, Tahoma, sans-serif",
    boxSizing: "border-box",
    overflow: "visible",
    position: "relative"
  };

  return (
  <div
  ref={reportPageScrollRef}
  onScroll={(e) => {
  localStorage.setItem("fahs_report_scroll", e.currentTarget.scrollTop);
}}
    style={showReportPage ? {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100dvh",
      overflowY: "auto",
      background: "#FFFFFF",
      padding: "12px",
      boxSizing: "border-box",
      zIndex: 99999
    } : {}}
  >
     {showReportPage && (
  <button
    onClick={() => {
      setShowReportPage(false);
      setExpandedOrder(null);
    }}
    style={{
      display: "flex",
      position: "fixed",
top: "12px",
left: "12px",
right: "auto",
zIndex: 100000,
      alignItems: "center",
      justifyContent: "center",
alignSelf: "flex-start",
marginRight: "auto",
marginLeft: "0",
      width: "42px",
      height: "42px",
      marginBottom: "12px",
      background: "#FFFFFF",
      color: "#0B2F55",
      border: "1px solid #0B2F55",
      borderRadius: "50%",
      fontSize: "25px",
      fontWeight: "bold",
      cursor: "pointer"
    }}
  >
    <svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true"><path d="M15 4L7 12l8 8" fill="none" stroke="#0B2F55" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </button>
)}

      <div
        ref={reportRef}
        style={{
  display: showReportPage ? "block" : "none",
  background: "#e5e7eb",
  padding: "10px",
  direction: "rtl",
  zoom: 0.80,
}}
      >

        {/* الصفحة الأولى */}

        <div
          className="fahs-report-page"
          style={reportPageStyle}
        >

          <div style={{
            borderBottom: `3px solid ${gold}`,
            paddingBottom: "7px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <img src={fahsLogo} alt="FAHS فحص" style={{ width: "105px", height: "auto", objectFit: "contain" }} />

            <div style={{ textAlign: "left" }}>
              <div style={{
                color: navy,
                fontWeight: "bold",
                fontSize: "15px"
              }}>
                تقرير الفحص الفني
              </div>
              <div style={{
                color: blue,
                fontSize: "12px",
                marginTop: "4px"
              }}>
                رقم التقرير: FAHS-{order.id}
              </div>
            </div>
          </div>

          <h3 style={sectionTitle}>
            بيانات العميل و السياره
          </h3>

          <table style={tableStyle}>
            <tbody>
              {[
  ["اسم العميل", reportCustomerName],
  ["رقم الهاتف", reportCustomerPhone],
  ["الماركة", order.brand],
  ["الموديل", order.model],
  ["سنة الصنع", order.year],
  ["تاريخ الفحص", order.inspectionDateTime
  ? new Date(order.inspectionDateTime).toLocaleDateString("ar-EG")
  : "—"],
  ["وقت الفحص", order.inspectionDateTime
  ? new Date(order.inspectionDateTime).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit"
    })
  : "—"]
]
              .map(([label, value]) => (
                <tr key={label}>
                  <td style={{
                    ...cellStyle,
                    background: "#edf2f8",
                    color: navy,
                    fontWeight: "bold",
                    width: "32%",
minWidth: "95px",
whiteSpace: "nowrap"
                  }}>
                    {label}
                  </td>
                  <td style={{
  ...cellStyle,
  fontSize: "13px",
  fontWeight: "bold"
}}>
  {value || "—"}
</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={sectionTitle}>
            أولاً: فحص أجزاء السيارة الخارجية
          </h3>

          {renderPartGrid(exteriorParts)}


          <div style={{
            position: "static",
            bottom: "7mm",
            left: "8mm",
            right: "8mm",
            borderTop: `2px solid ${gold}`,
            paddingTop: "5px",
            display: "flex",
            justifyContent: "space-between",
            color: navy,
            fontSize: "12px"
          }}>
            <span>FAHS | فحص</span>
            <span>الصفحة 1 من 3</span>
          </div>

        </div>

        {/* الصفحة الثانية */}

        <div
          className="fahs-report-page"
          style={{
            ...reportPageStyle,
            marginTop: "10px"
          }}
        >

          <div style={{
            borderBottom: `3px solid ${gold}`,
            paddingBottom: "6px",
            display: "flex",
            justifyContent: "space-between"
          }}>
            <img src={fahsLogo} alt="FAHS فحص" style={{ width: "90px", height: "auto", objectFit: "contain" }} />

            <strong style={{
              color: navy,
              fontSize: "13px"
            }}>
              تفاصيل الفحص الفني
            </strong>
          </div>
          <h3 style={sectionTitle}>
            ثانياً: فحص الشاسيه والقوائم
          </h3>

          {renderPartGrid(chassisParts)}

          <h3 style={sectionTitle}>
            ثالثاً: ملخص الأنظمة الرئيسية
          </h3>

          <table style={tableStyle}>
            <thead>
              <tr style={{
                background: "#e8eef5",
                color: navy
              }}>
                <th style={cellStyle}>النظام</th>
                <th style={cellStyle}>الحالة</th>
                <th style={cellStyle}>ملاحظات</th>
              </tr>
            </thead>

            <tbody>
              {mechanicalParts.map(part => (
                <tr key={part}>
                  <td style={cellStyle}>{part}</td>

                  <td style={{
                    ...cellStyle,
                    color: statusColor(data[part]),
                    fontWeight: "bold"
                  }}>
                    {formatValue(data[part])}
                  </td>

                  <td style={cellStyle}>
                    {data[part + " - التسريب"] ||
                      (data[part + " - يحتاج صيانة"]
                        ? "يحتاج صيانة"
                        : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={sectionTitle}>
            رابعاً: حالة الإطارات
          </h3>

          <table style={tableStyle}>
            <thead>
              <tr style={{
                background: "#e8eef5",
                color: navy
              }}>
                <th style={cellStyle}>الإطار</th>
                <th style={cellStyle}>الحالة</th>
                <th style={cellStyle}>سنة الإنتاج</th>
              </tr>
            </thead>

            <tbody>
              {tires.map(tire => (
                <tr key={tire}>
                  <td style={cellStyle}>{tire}</td>
                  <td style={{
                    ...cellStyle,
                    color: statusColor(data[tire]),
                    fontWeight: "bold"
                  }}>
                    {formatValue(data[tire])}
                  </td>
                  <td style={cellStyle}>
                    {data[tire + " - سنة الإنتاج"] || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>


          <div style={{
            position: "static",
            bottom: "7mm",
            left: "8mm",
            right: "8mm",
            borderTop: `2px solid ${gold}`,
            paddingTop: "5px",
            display: "flex",
            justifyContent: "space-between",
            color: navy,
            fontSize: "12px"
          }}>
            <span>FAHS | فحص</span>
            <span>الصفحة 2 من 3</span>
          </div>
        </div>  
        {/* الصفحة الثالثة */}
<div
  className="fahs-report-page"
  style={{
    ...reportPageStyle,
    marginTop: "10px"
  }}
>
  <div style={{
    borderBottom: `3px solid ${gold}`,
    paddingBottom: "8px",
    display: "flex",
    justifyContent: "space-between"
  }}>
    <img src={fahsLogo} alt="FAHS فحص" style={{ width: "100px", height: "auto", objectFit: "contain" }} />
    <strong style={{ color: navy, fontSize: "15px" }}>
      النتائج النهائية للفحص
    </strong>
  </div>

  <h3 style={sectionTitle}>ملاحظات الكهرباء</h3>

  {electricalFindings.length > 0 ? (
    <table style={tableStyle}>
      <tbody>
        {electricalFindings.map(part => (
          <tr key={part}>
            <td style={cellStyle}>{part}</td>
            <td style={{
              ...cellStyle,
              color: "#b91c1c",
              fontWeight: "bold"
            }}>
              {formatValue(data[part])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p style={{
      background: "#ecfdf5",
      color: "#15803d",
      padding: "12px"
    }}>
      لا توجد ملاحظات كهربائية مسجلة.
    </p>
  )}

  <h3 style={sectionTitle}>ملاحظات المهندس</h3>

  <div style={{
  border: "1px solid #cbd5e1",
  padding: "14px",
  minHeight: "75px",
  whiteSpace: "pre-wrap",
  fontSize: "15px",
  lineHeight: "1.8",
  fontWeight: "bold",
  color: "#17365d"
}}>
    {data["ملاحظات المهندس"] || "لا توجد ملاحظات إضافية."}
  </div>

  <h3 style={sectionTitle}>صور الفحص والملاحظات</h3>
  {Object.entries(photos).filter(([, photoList]) => Array.isArray(photoList) && photoList.length > 0).length > 0 ? (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "8px 0", direction: "rtl" }}>
      {Object.entries(photos).filter(([, photoList]) => Array.isArray(photoList) && photoList.length > 0).flatMap(([part, photoList]) =>
        photoList.map((photo, index) => (
          <div key={`${part}-${index}`} style={{ border: "1px solid #d7dee8", padding: "7px", background: "#fff", breakInside: "avoid" }}>
            <div style={{ color: navy, fontWeight: "bold", fontSize: "12px", marginBottom: "5px" }}>{part === "ملاحظات المهندس" ? "صورة مرفقة بملاحظات المهندس" : `بند الفحص: ${part}`}</div>
            <img src={photo} alt={`${part} ${index + 1}`} style={{ width: "100%", height: "auto", maxHeight: "190px", objectFit: "contain", display: "block" }} />
          </div>
        ))
      )}
    </div>
  ) : (
    <p style={{ color: "#64748b", fontSize: "12px" }}>لا توجد صور مرفقة بالفحص.</p>
  )}

  <h3 style={sectionTitle}>الملاحظات والتوصيات</h3>

  {recommendations.length > 0 ? (
  <div style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "5px 12px",
    fontSize: "12px",
    margin: "8px 0",
    direction: "rtl"
  }}>
    {recommendations.map((item, index) => (
      <div key={index} style={{
  padding: "7px",
  borderBottom: "1px solid #d7dee8",
  lineHeight: "1.8",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#17365d"
}}>
       {(() => {
  const [part, ...resultParts] = item.split(": ");
  const result = resultParts.join(": ");

  return (
    <>
      {part}:{" "}
      <span
        style={{
          color: statusColor(result),
          fontWeight: "bold"
        }}
      >
        ({result})
      </span>
    </>
  );
})()}
      </div>
    ))}
  </div>
) : (
  <p>لا توجد ملاحظات أو أعطال مسجلة.</p>
)}

  {/* ختم FAHS المعتمد */}
  <div style={{ display: "flex", justifyContent: "center", marginTop: "22px" }}>
    <img src={fahsLogo} alt="ختم FAHS فحص" style={{ width: "145px", height: "auto", objectFit: "contain" }} />
  </div>

  <div style={{
    position: "static",
    bottom: "7mm",
    left: "8mm",
    right: "8mm",
    borderTop: `2px solid ${gold}`,
    paddingTop: "5px",
    display: "flex",
    justifyContent: "space-between",
    color: navy,
    fontSize: "9px"
  }}>
    <span>FAHS | فحص</span>
    <span>الصفحة 3 من 3</span>
  </div>

</div>    
      </div>
      
      

      {/* زر الطباعة */}

      <button
        onClick={() => {
          const report = reportRef.current;

          if (!report) {
            alert("التقرير غير موجود");
            return;
          }

          const printWindow = window.open("", "_blank");

          if (!printWindow) {
            alert("يرجى السماح بفتح النوافذ المنبثقة");
            return;
          }

          const styles = `
            @page {
              size: A4 portrait;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html, body {
              margin: 0;
              padding: 0;
              direction: rtl;
              font-family: Arial, Tahoma, sans-serif;
              color: #202b3c;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .fahs-report-page {
  width: 210mm;
  min-height: 0;
  height: auto;
  margin: 0;
  page-break-after: auto;
  break-after: auto;
  overflow: visible;
  position: relative;
}

            .fahs-report-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            img {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          `;

          printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
              <head>
                <meta charset="UTF-8">
                <title>FAHS-${order.id}</title>
                <style>${styles}</style>
              </head>
              <body>
                ${report.innerHTML}
              </body>
            </html>
          `);

          printWindow.document.close();

          setTimeout(() => {
  printWindow.focus();
}, 1000);
        }}
        style={{
          display: "block",
          width: "220px",
          padding: "12px",
          margin: "20px auto",
          background: "#c49a36",
          color: "#17365d",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        📄 عرض التقرير PDF
      </button>

    </div>
  );
})()}
        </div>
          );
        })
      )}

    <button
  style={buttonStyle}
  onClick={() => {
    setShowReportPage(false);
    setExpandedOrder(null);
    setPage("home");
    window.scrollTo(0, 0);
  }}
>
  العودة للرئيسية
</button>
  </section>
)}
        {page === "home" && step === 1 && (
          <section style={cardStyle}>
            <h2 style={{ color: gold, marginTop: 0 }}>
              بيانات السيارة
            </h2>

            <p style={{ color: "#687987", fontWeight: 600 }}>
              اختر بيانات السيارة المطلوب فحصها
            </p>

            <SearchDropdown
              label="ماركة السيارة"
              value={brand}
              options={brands}
              onChange={(value) => {
                setBrand(value);
                setModel("");
                setYear("");
              }}
            />

            <SearchDropdown
              label="موديل السيارة"
              value={model}
              options={models}
              disabled={!brand}
              onChange={(value) => {
                setModel(value);
                setYear("");
              }}
            />

            <label style={labelStyle}>سنة الصنع</label>

            {yearRange && model !== "موديل آخر" ? (
              <select
                style={inputStyle}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">اختر سنة الصنع</option>
                {availableYears.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                style={inputStyle}
                value={year}
                placeholder="اكتب سنة الصنع"
                onChange={(e) => setYear(e.target.value)}
              />
            )}

            {!yearRange && model && model !== "موديل آخر" && (
              <p style={{ color: "#687987", fontSize: "13px", fontWeight: 600 }}>
                سنوات هذا الموديل غير مسجلة حتى الآن، اكتب سنة الصنع يدويًا.
              </p>
            )}

            {brand && model && year && (
              <div style={{
                marginTop: "18px",
                padding: "16px",
                border: "1px solid #0B2F55",
                borderRadius: "12px",
                background: "#F1F3F5",
                textAlign: "center",
              }}>
                <div style={{ color: "#0B2F55", fontSize: "14px" }}>سعر الفحص الشامل</div>
                <div style={{ color: "#0B2F55", fontSize: "26px", fontWeight: "bold", marginTop: "5px" }}>
                  {inspectionPrice.toLocaleString("en-US")} جنيه
                </div>
                <div style={{ color: "#0B2F55", fontSize: "14px", fontWeight: "bold", marginTop: "14px" }}>ويشمل الفحص:</div>
                <ul style={{ color: "#183247", textAlign: "right", fontSize: "14px", fontWeight: 600, lineHeight: 2, margin: "8px 0 0", paddingRight: "22px" }}>
                  {inspectionItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}

            <button style={buttonStyle} onClick={nextStep}>
              التالي ←
            </button>
          </section>
        )}

        {page === "home" && step === 2 && (
          <section style={{...cardStyle, width: "100%", maxWidth: "100%", overflow: "hidden", padding: "0px 10px 16px"}}>
            <h2 style={{ color: gold, marginTop: 0, marginBottom: "8px", fontSize: "21px", lineHeight: 1.4, fontWeight: 800, textAlign: "center" }}>
              موقع الفحص
            </h2>

            <p style={{ color: "#183247", fontSize: "16px", lineHeight: 1.5, fontWeight: 700, margin: "0 0 14px", textAlign: "center" }}>
              حدد موقع السيارة على الخريطة
            </p>

            <button
              type="button"
              style={{
                ...buttonStyle,
                width: "100%",
                maxWidth: "520px",
                minHeight: "64px",
                padding: "14px 18px",
                margin: "14px auto 20px",
                display: "block",
                background: "#0B2F55",
                color: "#FFFFFF",
                border: "1px solid #0B2F55",
                borderRadius: "12px",
                fontSize: "17px",
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(11,47,85,0.12)",
              }}
              onClick={() => setShowMap(true)}
            >
              ⌖ اختيار الموقع على الخريطة
            </button>

{showMap && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100dvh",
      zIndex: 99999,
      background: "#111",
      direction: "rtl",
    }}
  >
    {/* الخريطة */}
    <MapContainer
      center={mapPosition}
      zoom={16}
      zoomControl={false}
      style={{
        height: "100%",
        width: "100%",
      }}
    >
      <TileLayer
  attribution='&copy; OpenStreetMap contributors'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

      <MapCenterUpdater position={mapPosition} />

      <MapClickHandler
        onLocationSelect={(coords) => {
          setMapPosition(coords);
          setGpsCoordinates({
            lat: coords[0],
            lng: coords[1],
          });
        }}
      />
    </MapContainer>

    {/* علامة الموقع الثابتة */}
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -100%)",
        zIndex: 1000,
        fontSize: "38px",
        pointerEvents: "none",
        filter: "drop-shadow(0 3px 7px #0008)",
      }}
    >
      📍
    </div>

    {/* شريط البحث */}
    <div
      style={{
        position: "absolute",
        top: "18px",
        left: "15px",
        right: "15px",
        zIndex: 1100,
        background: "#ffffff",
        borderRadius: "16px",
        padding: "12px",
        boxShadow: "0 4px 18px #0004",
      }}
    >
      <input
        value={mapSearch}
        onChange={(e) => setMapSearch(e.target.value)}
        placeholder="ابحث عن عنوان أو منطقة أو مكان..."
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          fontSize: "16px",
          padding: "10px",
          direction: "rtl",
          color: "#111111",
          background: "#fff",
          boxSizing: "border-box",
        }}
      />

      {mapSearching && (
        <div style={{ color: "#777", padding: "8px" }}>
          جاري البحث...
        </div>
      )}

      {mapSearchResults.length > 0 && (
        <div
          className="fahs-scroll-list"
          onWheel={(event) => event.stopPropagation()}
          style={{
            maxHeight: "230px",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
            touchAction: "pan-y",
          }}
        >
          {mapSearchResults.map((result) => (
            <div
              key={result.place_id}
              onClick={() => {
                const coords = [
                  Number(result.lat),
                  Number(result.lon),
                ];

                setMapPosition(coords);

                setGpsCoordinates({
                  lat: coords[0],
                  lng: coords[1],
                });

                setSelectedMapAddress(result.display_name);
                setLocation(result.display_name);

fetch(
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords[0]}&lon=${coords[1]}&accept-language=ar`
)
  .then((response) => response.json())
  .then((data) => {
    const address = data.address || {};

    const normalize = (value) =>
      String(value || "")
        .replace(/محافظة|قسم|مركز/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/\s+/g, "")
        .trim();

    const governorateNames = [
      address.state,
      address.governorate,
      address.state_district,
    ].filter(Boolean);

    const matchedGovernorate = governorates.find((item) =>
      governorateNames.some(
        (name) => normalize(name).includes(normalize(item)) ||
          normalize(item).includes(normalize(name))
      )
    );

    if (matchedGovernorate) {
      setGovernorate(matchedGovernorate);

      const areaNames = [
        address.city_district,
        address.city,
        address.town,
        address.suburb,
        address.quarter,
        address.neighbourhood,
        address.village,
        address.county,
      ].filter(Boolean);

      const matchedArea = egyptLocations[matchedGovernorate].find(
        (item) =>
          areaNames.some(
            (name) =>
              normalize(name).includes(normalize(item)) ||
              normalize(item).includes(normalize(name))
          )
      );

      setArea(matchedArea || "");
    }
  })
  .catch((error) => {
    console.log("Location lookup error:", error);
  });
                setMapSearch(result.display_name);
                setMapSearchResults([]);
              }}
              style={{
                padding: "13px 8px",
                borderTop: "1px solid #eee",
                color: "#111111",
                background: "#FFFFFF",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              📍 {result.display_name}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* زر تحديد موقعي الحالي - بجوار موضع السهم أسفل يسار الخريطة */}
    <button
      type="button"
      onClick={getLocation}
      style={{
        position: "absolute",
        left: "22px",
        right: "auto",
        bottom: "34%",
        top: "auto",
        zIndex: 1300,
        width: "58px",
        height: "58px",
        borderRadius: "50%",
        border: "3px solid #FFFFFF",
        background: "#0B2F55",
        color: "#FFFFFF",
        fontSize: "29px",
        fontWeight: 900,
        boxShadow: "0 4px 14px rgba(0,0,0,0.38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      aria-label="تحديد موقعي الحالي"
      title="تحديد موقعي الحالي تلقائيًا"
    >
      {gpsLoading ? "…" : (
        <span style={{ position: "relative", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#FFFFFF", fontSize: "30px", lineHeight: 1 }}>⌖</span>
          <span style={{ position: "absolute", width: "10px", height: "10px", borderRadius: "50%", background: "#E53935", border: "2px solid #FFFFFF", top: "10px", left: "10px" }} />
        </span>
      )}
    </button>

    {/* بطاقة تأكيد الموقع */}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        background: "#F7F4EF",
        borderRadius: "22px 22px 0 0",
        padding: "22px 18px",
        boxShadow: "0 -4px 20px #0004",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "5px",
          borderRadius: "10px",
          background: "#777",
          margin: "0 auto 18px",
        }}
      />

      <div
        style={{
          color: "#0B2F55",
          fontSize: "19px",
          fontWeight: "bold",
          marginBottom: "8px",
        }}
      >
        موقع السيارة
      </div>

      <div
        style={{
          color: "#222222",
          fontSize: "14px",
          marginBottom: "18px",
          lineHeight: 1.7,
        }}
      >
        {selectedMapAddress ||
          "حرّك الخريطة حتى يصبح المكان المطلوب تحت العلامة"}
      </div>

      <button
        type="button"
        style={{
          ...buttonStyle,
          background: "#0B2F55",
          color: "#FFFFFF",
          fontWeight: "bold",
        }}
        onClick={async () => {
          try {
            const [lat, lng] = mapPosition;

            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`
            );

            if (!response.ok) {
              throw new Error("Address lookup failed");
            }

            const result = await response.json();

            setLocation(result.display_name || "تم تحديد الموقع بنجاح");

            setSelectedMapAddress(result.display_name || "");
            setGpsCoordinates({ lat, lng });
            setShowMap(false);
          } catch (error) {
            alert("تعذر تحديد العنوان. حاول مرة أخرى.");
          }
        }}
      >
        تأكيد موقع السيارة
      </button>

      <button
        type="button"
        onClick={() => setShowMap(false)}
        style={{
          width: "100%",
          marginTop: "10px",
          padding: "12px",
          background: "transparent",
          color: "#0B2F55",
          border: "none",
          fontSize: "15px",
        }}
      >
        رجوع
      </button>
    </div>
  </div>
)}
            <label style={{ ...labelStyle, fontSize: "15px", marginTop: "16px", marginBottom: "4px" }}>الموقع الذي تم تحديده</label>

            <div
              style={{
                ...inputStyle,
                minHeight: "54px",
                height: "auto",
                padding: "10px 13px",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontSize: "14px",
                fontWeight: 600,
                color: location ? "#111111" : "#777777",
                display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
              }}
            >
              {location || "لم يتم تحديد الموقع بعد"}
            </div>

            <label style={{ ...labelStyle, fontSize: "15px", marginTop: "15px", marginBottom: "3px" }}>اسم الشارع / المنطقة / المحافظة (اختياري)</label>

            <textarea
              style={{ ...inputStyle, minHeight: "62px", height: "62px", fontSize: "14px", padding: "18px 13px 8px", lineHeight: 1.5, fontWeight: 500, textAlign: "center", direction: "rtl", resize: "vertical" }}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="اكتب اسم الشارع / المنطقة / المحافظة..."
            />

            <label style={{ ...labelStyle, fontSize: "15px", marginTop: "14px", marginBottom: "3px" }}>ملاحظات إضافية</label>

            <textarea
              style={{ ...inputStyle, minHeight: "62px", height: "62px", fontSize: "14px", padding: "18px 13px 8px", lineHeight: 1.5, fontWeight: 500, textAlign: "center", direction: "rtl", resize: "vertical" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
            />

            <button style={buttonStyle} onClick={nextStep}>
              مراجعة الطلب ←
            </button>

            <button
              style={{
                ...buttonStyle,
                background: "#EAF1F7",
                color: "#0B2F55",
                border: "1px solid #D4E0E9",
                marginTop: "12px",
                boxShadow: "0 3px 10px rgba(11,47,85,0.07)",
              }}
              onClick={() => setStep(1)}
            >
              رجوع
            </button>
          </section>
        )}

        {page === "home" && step === 3 && (
          <section style={cardStyle}>
            <h2 style={{ color: "#0B2F55", marginTop: 0 }}>
              مراجعة الطلب
            </h2>

            <p style={{ color: "#111111", fontWeight: 600, margin: "8px 0 14px", lineHeight: 1.8 }}>
              راجع البيانات قبل تأكيد طلب الفحص
            </p>

            <div style={{ margin: "16px 0", padding: "14px 16px", background: "#EEF1F4", border: "1px solid #D7DEE5", borderRadius: "16px", boxShadow: "0 2px 8px rgba(11,47,85,0.045)", textAlign: "right" }}>
              <h3 style={{ color: "#0B2F55", marginTop: 0, marginBottom: 10 }}>بيانات السيارة</h3>
              <p style={{color:"#111111",margin:"7px 0",lineHeight:1.8}}>الماركة: {brand.replaceAll("_", " ")}</p>
              <p style={{color:"#111111",margin:"7px 0",lineHeight:1.8}}>الموديل: {model}</p>
              <p style={{color:"#111111",margin:"7px 0",lineHeight:1.8}}>سنة الصنع: {year}</p>
            </div>

            <div style={{ margin: "16px 0", padding: "14px 16px", background: "#EEF1F4", border: "1px solid #D7DEE5", borderRadius: "16px", boxShadow: "0 2px 8px rgba(11,47,85,0.045)", textAlign: "right" }}>
              <h3 style={{ color: "#0B2F55", marginTop: 0, marginBottom: 10 }}>موقع الفحص</h3>
              <p style={{color:"#111111",margin:"7px 0",lineHeight:1.8}}>الموقع: {location || "غير محدد"}</p>
              <p style={{color:"#111111",margin:"7px 0",lineHeight:1.8}}>العنوان بالتفصيل: {landmark || "لم يتم إضافته"}</p>
              <p style={{color:"#111111",margin:"7px 0",lineHeight:1.8}}>ملاحظات: {notes || "لا توجد ملاحظات"}</p>
            </div>

            <div style={{ margin: "16px 0", padding: "14px 16px", background: "#EEF1F4", border: "1px solid #D7DEE5", borderRadius: "16px", boxShadow: "0 2px 8px rgba(11,47,85,0.045)", textAlign: "right" }}>
              <h3 style={{ color: "#0B2F55", marginTop: 0, marginBottom: 10 }}>نوع الخدمة</h3>
              <p style={{ color: "#111111", fontWeight: "bold", marginBottom: "8px" }}>فحص شامل للسيارة</p>
              <div style={{ color: "#111111", fontSize: "14px", fontWeight: 600, lineHeight: 2, margin: "10px 0 14px", padding: "10px 12px", background: "#F7F8FA", borderRadius: "12px", border: "1px solid #D7DEE5" }}>
                {inspectionItems.map((item, index) => <div key={index} style={{color:"#183247",fontSize:"14px",fontWeight:600,lineHeight:1.9}}>• {item}</div>)}
              </div>
              <p style={{ color: "#0B2F55", fontWeight: "bold", fontSize: "16px", marginTop: "12px", marginBottom: 0 }}>
                سعر الفحص: {inspectionPrice.toLocaleString("en-US")} جنيه
              </p>
            </div>

            <button style={{...buttonStyle, marginTop: 22, marginBottom: 18}} onClick={confirmOrder}>
              تأكيد الطلب
            </button>

            <button
              type="button"
              style={{
                ...buttonStyle,
                background: "#E8EEF5",
                color: "#0B2F55",
                border: "2px solid #0B2F55",
                marginTop: "0px",
                marginBottom: "8px",
                fontWeight: 800,
                boxShadow: "none",
              }}
              onClick={() => setStep(2)}
            >
              ✎ تعديل البيانات
            </button>
          </section>
        )}
        {page === "home" && step === 4 && (
  <section style={cardStyle}>
    <div style={{
      fontSize: "75px",
      color: "#22c55e",
      textAlign: "center",
      marginBottom: "20px"
    }}>
      ✓
    </div>

    <h2 style={{
      color: "#0B2F55",
      textAlign: "center"
    }}>
      تم استلام طلبك بنجاح
    </h2>

    <p style={{
      color: "#0B2F55",
      fontSize: "16px",
      fontWeight: 800,
      textAlign: "center",
      lineHeight: 2,
      margin: "14px 0 24px",
      padding: "16px 16px",
      background: "#E7F0F7",
      border: "1px solid #C7D8E6",
      borderRadius: "14px"
    }}>
      شكراً لاستخدامك تطبيق فحص FAHS
      <br />
      سيتم التواصل معك لتأكيد موعد الفحص.
    </p>

    <button
      style={buttonStyle}
      onClick={() => setStep(1)}
    >
      العودة للبداية
    </button>
  </section>
)}
{page === "home" && step === 5 && (
  <section style={cardStyle}>
    <h2 style={{ color: gold, textAlign: "center" }}>
      تفاصيل طلب الفحص
    </h2>

    <div style={{
      borderBottom: "1px solid #555",
      padding: "12px 0",
      color: "#fff",
      lineHeight: "2"
    }}>
      <p>رقم الطلب: {orders[orders.length - 1]?.id || "—"}</p>
      <p>الماركة: {brand}</p>
      <p>الموديل: {model}</p>
      <p>سنة الصنع: {year}</p>
      <p>العنوان: {location}</p>
      <p>علامة مميزة: {landmark || "لم يتم تحديدها"}</p>
      <p>ملاحظات: {notes || "لا توجد ملاحظات"}</p>
    </div>

    <h3 style={{ color: gold, textAlign: "center" }}>
      حالة الطلب
    </h3>

    <p style={{ color: "#fff", textAlign: "center" }}>
      في انتظار تعيين مهندس فحص
    </p>

    <button
      style={buttonStyle}
      onClick={() => setStep(1)}
    >
      العودة للبداية
    </button>
  </section>
)}
     {page === "engineerRegister" && (
  <section style={cardStyle}>
    <h2 style={{ color: gold, textAlign: "center" }}>
      تسجيل مهندس جديد
    </h2>

    <form
      onSubmit={(e) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const engineerPasswordValue = String(formData.get("password") || "");
        if (!/^(?=.*[A-Za-z\u0600-\u06FF]{4,})(?=(?:.*\d){2,}).+$/.test(engineerPasswordValue)) {
          alert("كلمة المرور يجب أن تحتوي على 4 حروف ورقمين على الأقل");
          return;
        }

        const newEngineer = {
          id: Date.now(),
          name: formData.get("name"),
          phone: formData.get("phone"),
          password: formData.get("password"),

          specialization: formData.get("specialization"),
          status: "طلب جديد",
          date: new Date().toLocaleString("ar-EG"),
        };

        setEngineers((prev) => [...prev, newEngineer]);

        setPage("engineerPending");
      }}
    >
      {[
        ["name", "الاسم بالكامل"],
        ["phone", "رقم الموبايل"],
        ["password", "كلمة المرور (4 حروف ورقمان على الأقل)"],
        ["specialization", "تخصص الفحص"],
      ].map(([name, label]) => (
        <div key={name} style={{ marginBottom: "15px" }}>
          <label style={{ color: gold }}>{label}</label>
          {name === "specialization" ? (
            <select name={name} required defaultValue="" style={{width:"100%",padding:"14px",marginTop:"7px",borderRadius:"10px",border:"1px solid #aaa",background:"#FFFFFF",color:"#0B2F55",boxSizing:"border-box"}}>
              <option value="" disabled>اختر تخصص الفحص</option>
              <option value="صاج خارجي وداخلي وشاسيه وقوائم">صاج خارجي وداخلي وشاسيه وقوائم</option>
              <option value="ميكانيكا وعفشة">ميكانيكا وعفشة</option>
              <option value="كهرباء وكمبيوتر السيارة">كهرباء وكمبيوتر السيارة</option>
            </select>
          ) : (
            <input name={name} type={name === "password" ? "password" : "text"} required style={{width:"100%",padding:"14px",marginTop:"7px",borderRadius:"10px",border:"1px solid #aaa",background:"#FFFFFF",color:"#0B2F55",boxSizing:"border-box"}} />
          )}
        </div>
      ))}

      <button type="submit" style={buttonStyle}>
        إرسال طلب الانضمام
      </button>
    </form>
  </section>
)}
{page === "engineerPending" && (
  <section style={cardStyle}>
    <h2 style={{ color: "gold", textAlign: "center" }}>
      تم استلام طلب الانضمام بنجاح
    </h2>

    <p style={{ color: "#fff", textAlign: "center" }}>
      أهلاً بك في فريق FAHS
    </p>

    <div style={{
      textAlign: "center",
      padding: "20px",
      background: "#FFFFFF",
      borderRadius: "12px",
      marginTop: "20px"
    }}>
      <h3 style={{ color: "gold" }}>
        🟡 طلبك قيد المراجعة
      </h3>

      <p style={{ color: "#fff" }}>
        تم إرسال بياناتك بنجاح إلى إدارة FAHS.
      </p>

      <p style={{ color: "#fff" }}>
        سيتم التواصل معك لتحديد موعد المقابلة الشخصية والاختبار العملي.
      </p>
    </div>

    <button
      style={buttonStyle}
      onClick={() => { setActiveEngineer(null); setActiveCustomer(null); setPage("welcome"); window.scrollTo(0, 0); }}
    >
      العودة لصفحة الدخول
    </button>
  </section>
)}{page === "admin" && (
  <section style={cardStyle}>
    <h2 style={{ color: "gold", textAlign: "center" }}>
      لوحة تحكم إدارة FAHS
    </h2>

    <div style={{background:"#EEF1F4",border:"1px solid #D7DEE5",borderRadius:14,padding:14,marginBottom:18,color:"#0B2F55"}}>
      <h3 style={{marginTop:0}}>طريقة توزيع طلبات الفحص</h3>
      <select value={adminDistributionMode} onChange={e=>setAdminDistributionMode(e.target.value)} style={{...inputStyle,marginTop:4}}>
        <option value="manual">يدوي: الإدارة تختار المهندس</option>
        <option value="automatic">تلقائي: النظام يوزع الطلب</option>
        <option value="hybrid">مختلط: تلقائي مع تدخل الإدارة</option>
      </select>
      <p style={{fontSize:13,marginBottom:0}}>هذا الاختيار يُحفظ محلياً في هذه النسخة التجريبية.</p>
    </div>
    <h3 style={{color:"#0B2F55"}}>طلبات الفحص الواردة: {orders.length}</h3>
    {orders.length === 0 ? <p style={{color:"#687987"}}>لا توجد طلبات فحص حالياً</p> : orders.map((order,index)=>(
      <div key={order.id} style={{background:"#EEF1F4",border:"1px solid #D7DEE5",borderRadius:14,padding:14,marginBottom:12,color:"#142536",textAlign:"right"}}>
        <h3 style={{color:"#0B2F55",marginTop:0}}>{order.id}</h3>
        <p>السيارة: {order.brand} {order.model} - {order.year}</p>
        <p>الموقع: {order.location || "غير محدد"}</p>
        <p>السعر: {order.inspectionPrice} جنيه</p>
        <p>الحالة: {order.status}</p>
        <label style={{display:"block",fontWeight:700,color:"#0B2F55"}}>تعيين مهندس للطلب</label>
        <select value={order.assignedEngineerId || ""} onChange={e=>{const engineerId=e.target.value;setOrders(prev=>prev.map((item,i)=>i===index?{...item,assignedEngineerId:engineerId||null,status:engineerId?"تم تعيين مهندس":"طلب جديد"}:item));}} style={{...inputStyle,marginTop:6}}>
          <option value="">لم يتم التعيين</option>
          {engineers.filter(e=>e.status==="مقبول").map(e=><option key={e.id} value={e.id}>{e.name} - {e.phone}</option>)}
        </select>
      </div>
    ))}
    <h3 style={{ color: "#0B2F55" }}>طلبات انضمام المهندسين: {engineers.length}</h3>

    {engineers.length === 0 ? (
      <p style={{ color: "#aaa", textAlign: "center" }}>
        لا توجد طلبات حالياً
      </p>
    ) : (
      engineers.map((eng) => (
        <div
          key={eng.id}
          style={{
            background: "#FFFFFF",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "15px",
            color: "#fff"
          }}
        >
          <h3 style={{ color: "gold" }}>{eng.name}</h3>

          <p>رقم الهاتف: {eng.phone}</p>
          <p>المحافظة: {eng.governorate}</p>
          <p>المنطقة: {eng.area}</p>
          <p>سنوات الخبرة: {eng.experience}</p>
          <p>التخصص: {eng.specialization}</p>

          <p>
            الحالة: {eng.status}
          </p>

          {eng.status === "طلب جديد" && (
            <>
              <button
                style={buttonStyle}
                onClick={() => {
                  setEngineers(prev =>
                    prev.map(item =>
                      item.id === eng.id
                        ? { ...item, status: "مقبول" }
                        : item
                    )
                  );
                }}
              >
                قبول المهندس
              </button>

              <button
                style={{
                  ...buttonStyle,
                  background: "#b22222",
                  color: "#fff"
                }}
                onClick={() => {
                  setEngineers(prev =>
                    prev.map(item =>
                      item.id === eng.id
                        ? { ...item, status: "مرفوض" }
                        : item
                    )
                  );
                }}
              >
                رفض الطلب
              </button>
            </>
          )}
        </div>
      )
    ))}

    <button
      style={buttonStyle}
      onClick={() => setPage("home")}
    >
      العودة للرئيسية
    </button>
  </section>
)} {page === "engineerLogin" && (
  <section style={cardStyle}>
    <h2 style={{ color: "#0B2F55", textAlign: "center" }}>
      دخول مهندسي FAHS
    </h2>

    <input
      type="tel"
      placeholder="رقم الموبايل"
      dir="rtl"
      value={engineerPhone}
      onChange={(e) => setEngineerPhone(e.target.value)}
      style={{...inputStyle, marginTop: 8, textAlign: "right", direction: "rtl"}}
    />

    <input
      type="password"
      placeholder="كلمة المرور"
      value={engineerPassword}
      onChange={(e) => setEngineerPassword(e.target.value)}
      style={{...inputStyle, marginTop: 8}}
    />
    <button type="button" style={{background:"transparent",border:0,color:"#0B2F55",fontWeight:700,marginTop:8,textDecoration:"underline"}} onClick={()=>alert("استرجاع كلمة مرور المهندس تجريبي حاليًا، وسيتم تفعيله مع خدمة التحقق.")}>نسيت كلمة المرور؟</button>
    <button
      style={{...buttonStyle, opacity: engineerLoginBusy ? 0.7 : 1}}
      disabled={engineerLoginBusy}
      onClick={async () => {
        const phone = String(engineerPhone || "").trim();
        const password = String(engineerPassword || "");
        if (!phone || !password) { alert("اكتب رقم الموبايل وكلمة المرور"); return; }
        if (!isSupabaseConfigured || !supabase) { alert("تعذر الاتصال بالنظام. راجع إعدادات Supabase."); return; }
        setEngineerLoginBusy(true);
        try {
          // The Edge Function resolves the phone privately, then authenticates with Supabase Auth.
          const { data, error } = await supabase.functions.invoke("engineer-phone-login", {
            body: { phone, password }
          });
          if (error) {
            let message = error.message || "تعذر تسجيل الدخول";
            try { const body = await error.context?.json?.(); if (body?.error) message = body.error; } catch {}
            throw new Error(message);
          }
          if (!data?.access_token || !data?.refresh_token) throw new Error(data?.error || "بيانات الدخول غير صحيحة أو الحساب غير معتمد");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token
          });
          if (sessionError) throw sessionError;
          const { data: authData, error: userError } = await supabase.auth.getUser();
          if (userError || !authData?.user) throw userError || new Error("تعذر التحقق من الحساب");
          const { data: engineer, error: engineerError } = await supabase
            .from("engineers").select("*").eq("auth_user_id", authData.user.id).maybeSingle();
          if (engineerError) throw engineerError;
          if (!engineer || engineer.status !== "مقبول") {
            await supabase.auth.signOut();
            throw new Error("الحساب غير موجود ضمن المهندسين المعتمدين. تواصل مع الإدارة.");
          }
          setActiveEngineer(engineer);
          setEngineerView("available");
          setEngineerPassword("");
          setPage("engineerDashboard");
        } catch (error) {
          console.error("Engineer login error:", error);
          alert(error.message || "تعذر تسجيل الدخول. راجع رقم الموبايل وكلمة المرور.");
        } finally {
          setEngineerLoginBusy(false);
        }
      }}
    >
      {engineerLoginBusy ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
    </button>

    <button
      type="button"
      style={{...buttonStyle, marginTop: 14, background: "#FFFFFF", color: gold, border: `1px solid ${gold}`}}
      onClick={() => { setPage("engineerRegister"); window.scrollTo(0, 0); }}
    >
      👨‍🔧 FAHS — تسجيل مهندس جديد
    </button>
    <button
      style={{...buttonStyle, marginTop: 14}}
      onClick={() => { setPage("welcome"); window.scrollTo(0, 0); }}
    >
      العودة للرئيسية
    </button>
  </section>
)}
{page === "inspection" && (
  <section className="fahs-inspection-form" style={cardStyle}>
    <h2 style={{ color: "gold", textAlign: "center" }}>
      FAHS - فحص السيارة
    </h2>

    <p style={{ color: "#0B2F55", textAlign: "center", fontWeight: 700 }}>
      شاشة الفحص الفني للسيارة
    </p>
    <h3 style={{ color: "gold", textAlign: "right" }}>
  أولاً: الفحص الخارجي
</h3>

{[
  "الإكصدام الأمامي",
  "الكبوت",
  "الرفرف الأمامي يمين",
  "الباب الأمامي يمين",
  "الباب الخلفي يمين",
  "الرفرف الخلفي يمين",
  "الإكصدام الخلفي",
  "الرفرف الخلفي يسار",
  "الباب الخلفي يسار",
  "الباب الأمامي يسار",
  "الرفرف الأمامي يسار",
  "العتب الخارجي يمين",
"العتب الخارجي يسار",
  "السقف",
  "الشنطة"
].map((part) => (
  <div
    key={part}
    style={{
      background: "#FFFFFF",
      padding: "12px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>{part}</strong>

    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {["فابريكا", "دهان", "تم الفك من قبل"].map((choice) => (
        <label key={choice}>
          <input
            type="checkbox"
            checked={(inspectionData[part] || []).includes(choice)}
            onChange={(e) => {
              setInspectionData((prev) => {
                const oldChoices = prev[part] || [];
                const newChoices = e.target.checked
                  ? [...oldChoices, choice]
                  : oldChoices.filter((item) => item !== choice);

                return { ...prev, [part]: newChoices };
              });
            }}
          />
          {choice}
        </label>
      ))}
    </div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  ثانياً: فحص الشاسيه والقوائم
</h3>

{[
  "الشاسيه الأمامي يمين",
  "الشاسيه الأمامي يسار",
  "الشاسيه الخلفي يمين",
  "الشاسيه الخلفي يسار",

  "القائم الأمامي يمين",
  "العتب الداخلي الأمامي يمين",
  "القائم الأوسط يمين",
  "العتب الداخلي الخلفي يمين",
  "القائم الخلفي يمين",

  "القائم الأمامي يسار",
  "العتب الداخلي الأمامي يسار",
  "القائم الأوسط يسار",
  "العتب الداخلي الخلفي يسار",
  "القائم الخلفي يسار",

  "أرضية السيارة",
  "حوض الموتور",
  "حوض الشنطة",
  "الستارة الأمامية",
  "الستارة الخلفية"
].map((part) => (
  <div
    key={part}
    style={{
      background: "#FFFFFF",
      padding: "12px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>{part}</strong>

    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {["فابريكا", "استعدال", "رش", "قطع ولحام", "فك وتغيير"].map((choice) => (
        <label key={choice}>
          <input
            type="checkbox"
            checked={(inspectionData[part] || []).includes(choice)}
            onChange={(e) => {
              setInspectionData((prev) => {
                const oldChoices = prev[part] || [];
                const newChoices = e.target.checked
                  ? [...oldChoices, choice]
                  : oldChoices.filter((item) => item !== choice);

                return { ...prev, [part]: newChoices };
              });
            }}
          />
          {choice}
        </label>
      ))}
    </div>
    <div style={{ marginTop: "12px", textAlign: "right" }}>
  <label style={{
    display: "inline-block",
    background: "#b58b00",
    color: "black",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer"
  }}>
    📷 تصوير الجزء

    <input
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      style={{ display: "none" }}
      onChange={(e) => {
  const files = Array.from(e.target.files || []);

  files.forEach((file) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const maxSize = 1200;

          const ratio = Math.min(
            maxSize / img.width,
            maxSize / img.height,
            1
          );

          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedPhoto = canvas.toDataURL("image/jpeg", 0.62);
          if (compressedPhoto.length > 2_500_000) {
            alert("حجم الصورة ما زال كبيراً. حاول تصوير الجزء مرة أخرى.");
            return;
          }

          setInspectionPhotos((prev) => ({
            ...prev,
            [part]: [...(prev[part] || []), compressedPhoto]
          }));
        } catch (error) {
          console.error("Photo error:", error);
          alert("حدث خطأ أثناء معالجة الصورة");
        }
      };

      img.onerror = () => {
        alert("تعذر قراءة الصورة، حاول التصوير مرة أخرى");
      };

      img.src = reader.result;
    };

    reader.onerror = () => {
      alert("تعذرت قراءة ملف الصورة");
    };

    reader.readAsDataURL(file);
  });

  e.target.value = "";
}}
    />
  </label>

  <div style={{
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "10px"
  }}>
    {(inspectionPhotos[part] || []).map((photo, index) => (
      <div key={index}>
        <img
          src={photo}
          alt={part}
          style={{
            width: "100px",
            height: "80px",
            objectFit: "cover",
            borderRadius: "6px"
          }}
        />

        <button
          type="button"
          onClick={() => {
            setInspectionPhotos((prev) => ({
              ...prev,
              [part]: prev[part].filter((_, i) => i !== index)
            }));
          }}
        >
          حذف
        </button>
      </div>
    ))}
  </div>
</div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  ثالثاً: فحص الصالون
</h3>

{["الكراسي", "التابلوه", "السقف الداخلي"].map((part) => (
  <div
    key={part}
    style={{
      background: "#FFFFFF",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>{part}</strong>

    <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
      {["جيد", "متوسط", "سيئ"].map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            name={part}
            checked={inspectionData[part] === choice}
            onChange={() =>
              setInspectionData((prev) => ({
                ...prev,
                [part]: choice
              }))
            }
          />
          {choice}
        </label>
      ))}
    </div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  رابعاً: الفحص الميكانيكي
</h3>

{["الموتور", "الفتيس", "نظام التبريد"].map((part) => (
  <div
    key={part}
    style={{
      background: "#FFFFFF",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>حالة {part}</strong>

    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
      {["جيد", "متوسط", "سيئ"].map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            name={part}
            checked={inspectionData[part] === choice}
            onChange={() =>
              setInspectionData((prev) => ({
                ...prev,
                [part]: choice
              }))
            }
          />
          {choice}
        </label>
      ))}
    </div>

    <label style={{ display: "block", marginTop: "10px" }}>
      <input
        type="checkbox"
        checked={inspectionData[part + " - يحتاج صيانة"] || false}
        onChange={(e) =>
          setInspectionData((prev) => ({
            ...prev,
            [part + " - يحتاج صيانة"]: e.target.checked
          }))
        }
      />
      يحتاج صيانة
    </label>

    <div style={{ marginTop: "10px" }}>
      {["يوجد تسريب", "لا يوجد تسريب"].map((choice) => (
        <label key={choice} style={{ marginRight: "12px" }}>
          <input
            type="radio"
            name={part + " - التسريب"}
            checked={inspectionData[part + " - التسريب"] === choice}
            onChange={() =>
              setInspectionData((prev) => ({
                ...prev,
                [part + " - التسريب"]: choice
              }))
            }
          />
          {choice}
        </label>
      ))}
    </div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  خامساً: فحص الفرامل
</h3>

{[
  "طنابير أمامي",
  "تيل أمامي",
  "طنابير خلفي",
  "تيل خلفي"
].map((part) => (
  <div
    key={part}
    style={{
      background: "#FFFFFF",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>{part}</strong>

    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
      {["جيد", "متوسط", "تحتاج تغيير"].map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            name={part}
            checked={inspectionData[part] === choice}
            onChange={() =>
              setInspectionData((prev) => ({
                ...prev,
                [part]: choice
              }))
            }
          />
          {choice}
        </label>
      ))}
    </div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  سادساً: فحص العفشة
</h3>

{["العفشة الأمامية", "العفشة الخلفية"].map((part) => (
  <div
    key={part}
    style={{
      background: "#FFFFFF",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>{part}</strong>

    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
      {[
        "جيدة",
        "متوسطة وتحتاج مراجعة",
        "سيئة وتحتاج تغيير"
      ].map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            name={part}
            checked={inspectionData[part] === choice}
            onChange={() =>
              setInspectionData((prev) => ({
                ...prev,
                [part]: choice
              }))
            }
          />
          {choice}
        </label>
      ))}
    </div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  سابعاً: الفحص الكهربائي
</h3>

{[
  { part: "كنترول السيارة", choices: ["يوجد أعطال", "لا يوجد أعطال"] },
  { part: "كنترول الفتيس", choices: ["يوجد أعطال", "لا يوجد أعطال"] },
  { part: "الإيرباج", choices: ["سليم", "غير سليم", "يحتاج صيانة"] },
  { part: "التكييف", choices: ["جيد", "متوسط", "لا يعمل"] },
  { part: "الإضاءة الأمامية", choices: ["سليم", "تحتاج مراجعة"] },
  { part: "الإضاءة الخلفية", choices: ["سليم", "تحتاج مراجعة"] },
  { part: "الزجاج الكهربائي", choices: ["سليم", "يحتاج صيانة"] },
  { part: "المرايات الكهربائية", choices: ["تعمل", "لا تعمل"] },
  { part: "الكاسيت والسماعات", choices: ["يعمل", "لا يعمل", "يحتاج صيانة"] },
  { part: "حساسات السيارة", choices: ["تعمل", "لا تعمل", "لا يوجد"] },
  { part: "كاميرا السيارة", choices: ["تعمل", "لا تعمل", "لا يوجد"] },
  { part: "السنتر لوك", choices: ["يعمل", "لا يعمل", "يحتاج صيانة"] },
  { part: "البطارية", choices: ["جيدة", "متوسطة", "سيئة"] }
].map(({ part, choices }) => (
  <div
    key={part}
    style={{
      background: "#FFFFFF",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>{part}</strong>

    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
      {choices.map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            name={part}
            checked={inspectionData[part] === choice}
            onChange={() =>
              setInspectionData((prev) => ({
                ...prev,
                [part]: choice
              }))
            }
          />
          {choice}
        </label>
      ))}
    </div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  ثامناً: فحص الإطارات
</h3>

{[
  "كاوتش أمامي يمين",
  "كاوتش أمامي يسار",
  "كاوتش خلفي يمين",
  "كاوتش خلفي يسار"
].map((tire) => (
  <div
    key={tire}
    style={{
      background: "#FFFFFF",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "#0B2F55",
      textAlign: "right"
    }}
  >
    <strong>{tire}</strong>

    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
      {["جيد", "متوسط", "سيئ"].map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            name={tire}
            checked={inspectionData[tire] === choice}
            onChange={() =>
              setInspectionData((prev) => ({
                ...prev,
                [tire]: choice
              }))
            }
          />
          {choice}
        </label>
      ))}
    </div>

    <div style={{ marginTop: "12px" }}>
      <label>
        سنة الإنتاج:
        <input
          type="number"
          min="1990"
          max="2099"
          placeholder="مثال: 2023"
          value={inspectionData[tire + " - سنة الإنتاج"] || ""}
          onChange={(e) =>
            setInspectionData((prev) => ({
              ...prev,
              [tire + " - سنة الإنتاج"]: e.target.value
            }))
          }
          style={{ marginRight: "10px", width: "100px" }}
        />
      </label>
    </div>
  </div>
))}
<h3 style={{ color: "gold", textAlign: "right", marginTop: "25px" }}>
  ملاحظات المهندس
</h3>

<textarea
  placeholder="اكتب أي ملاحظات إضافية عن حالة السيارة..."
  value={inspectionData["ملاحظات المهندس"] || ""}
  onChange={(e) =>
    setInspectionData((prev) => ({
      ...prev,
      "ملاحظات المهندس": e.target.value
    }))
  }
  style={{
    width: "90%",
    display: "block",
    margin: "10px auto 0",
    minHeight: "120px",
    padding: "12px",
    borderRadius: "8px",
    background: "#FFFFFF",
    color: "#0B2F55",
    border: "1px solid #555",
    textAlign: "right",
    fontSize: "16px",
  }}
/>
<button
  style={{
    ...buttonStyle,
    background: "#15803d",
    color: "#0B2F55",
    width: "100%",
    marginTop: "20px"
  }}
  onClick={() => {
    if (!window.confirm("هل أنت متأكد من إنهاء الفحص وإرسال التقرير؟")) return;
if (!currentInspection) {
  alert("حدث خطأ: بيانات طلب الفحص غير موجودة. ارجع إلى الطلب وحاول مرة أخرى.");
  return;
}
    saveFahsPhotos(currentInspection.id, inspectionPhotos).catch(error => console.error("تعذر حفظ الصور قبل إرسال التقرير", error));
    setOrders(prev => {
      const updatedOrders = prev.map(item =>
        item.id === currentInspection.id
          ? {
              ...item,
              status: "تم الفحص",
inspectionData: inspectionData,
inspectionPhotos: inspectionPhotos,
inspectionDateTime: new Date().toISOString()
            }
          : item
      );

      localStorage.setItem("fahs_orders", JSON.stringify(stripPhotosFromOrders(updatedOrders)));
      return updatedOrders;
    });

    alert("تم حفظ تقرير الفحص بنجاح");
    localStorage.removeItem("fahs_inspection_data_draft");
    setPage("engineerDashboard");
  }}
>
  إنهاء الفحص وإرسال التقرير
</button>
  </section>
)}
{page === "engineerDashboard" && activeEngineer && (() => {
  const availableOrders = orders.filter(o => (!o.status || ["طلب جديد","تم استلام الطلب","تم تعيين مهندس"].includes(o.status)) && (!o.assignedEngineerId || o.assignedEngineerId === activeEngineer?.id));
  const acceptedStatuses = ["مقبول","في الطريق","وصل المهندس","تم تأكيد الوصول","الفحص جاري"];
  const acceptedOrders = orders.filter(o => o.engineerId === activeEngineer?.id && acceptedStatuses.includes(o.status));
  const completedOrders = orders.filter(o => o.engineerId === activeEngineer?.id && o.status === "تم الفحص");
  const shownOrders = engineerView === "available" ? availableOrders : engineerView === "accepted" ? acceptedOrders : completedOrders;
  const pageTitle = engineerView === "available" ? "الرئيسية" : engineerView === "accepted" ? "طلبات مقبولة" : "طلبات مكتملة";
  const countTitle = engineerView === "available" ? "الطلبات المتاحة" : engineerView === "accepted" ? "الطلبات المقبولة" : "الطلبات المكتملة";
  return <section style={{...cardStyle,padding:"12px 4px",color:"#0B2F55"}}>
    <div style={{textAlign:"center",margin:"4px 0 18px"}}>
      <h2 style={{color:"#C49A36",fontSize:23,margin:"0 0 8px"}}>{pageTitle}</h2>
      <h3 style={{color:"#0B2F55",fontSize:18,margin:0}}>أهلاً م. <span style={{color:"#C49A36",fontWeight:800}}>{activeEngineer?.name}</span></h3>
    </div>
    <div style={{background:"rgba(11,47,85,.88)",border:"1px solid #C49A36",borderRadius:16,padding:"15px 12px",textAlign:"center",color:"#FFFFFF",marginBottom:20,boxShadow:"0 3px 12px rgba(11,47,85,.10)"}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:5}}>{countTitle}</div>
      <div style={{fontSize:30,fontWeight:900,color:"#F2C94C",lineHeight:1.2}}>{shownOrders.length}</div>
    </div>
    {shownOrders.length === 0 ? <div style={{background:"#FFFFFF",border:"1px solid #E5E0D7",borderRadius:14,padding:22,textAlign:"center",color:"#657080"}}>لا توجد طلبات في هذه الصفحة حالياً</div> : shownOrders.map(order => <div key={order.id} style={{background:"#FFFFFF",border:"1px solid #D8C58A",borderRadius:14,padding:15,marginBottom:13,color:"#0B2F55",boxShadow:"0 3px 10px rgba(11,47,85,.05)"}}>
      <p style={{margin:"4px 0 8px",fontWeight:800}}>السيارة: {order.brand || ""} {order.model || ""}</p>
      <p style={{margin:"5px 0"}}>الموديل: {order.year || "غير محدد"}</p>
      <p style={{margin:"5px 0"}}>سعر الفحص: {(order.inspectionPrice ?? 1500).toLocaleString("en-US")} جنيه</p>
      <p style={{margin:"5px 0"}}>المحافظة: {order.governorate || "غير محدد"}</p>
      <p style={{margin:"5px 0"}}>المنطقة: {order.area || "غير محدد"}</p>
      <p style={{margin:"8px 0",color:"#A47B16",fontWeight:700}}>الحالة: {order.status || "طلب جديد"}</p>
      {engineerView === "available" && <button style={{...buttonStyle,background:"#15803D",color:"#FFFFFF"}} onClick={() => {setOrders(prev=>prev.map(item=>item.id===order.id?{...item,status:"مقبول",engineerId:activeEngineer?.id}:item));}}>قبول طلب الفحص</button>}
      {engineerView === "accepted" && order.status === "مقبول" && <button style={{...buttonStyle,background:"#1976D2",color:"#FFFFFF"}} onClick={() => {const address=[order.location,order.landmark,order.area,order.governorate].filter(Boolean).join(" ");window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(address),"_blank");setOrders(prev=>prev.map(item=>item.id===order.id?{...item,status:"وصل المهندس"}:item));}}>📍 الانتقال إلى مكان الفحص</button>}
      {engineerView === "accepted" && order.status === "وصل المهندس" && <button style={{...buttonStyle,background:"#198754",color:"#FFFFFF"}} onClick={() => setOrders(prev=>prev.map(item=>item.id===order.id?{...item,status:"تم تأكيد الوصول"}:item))}>تأكيد الوصول لمكان الفحص</button>}
      {engineerView === "accepted" && order.status === "تم تأكيد الوصول" && <button style={{...buttonStyle,background:"#1565C0",color:"#FFFFFF"}} onClick={() => {setCurrentInspection(order);setInspectionData(order.inspectionData||{});setInspectionPhotos(order.inspectionPhotos||{});setOrders(prev=>prev.map(item=>item.id===order.id?{...item,status:"الفحص جاري"}:item));setPage("inspection");}}>بدء الفحص</button>}
      {engineerView === "accepted" && order.status === "الفحص جاري" && <button style={{...buttonStyle,background:"#C49A36",color:"#FFFFFF"}} onClick={() => {setCurrentInspection(order);setInspectionData(order.inspectionData||{});setInspectionPhotos(order.inspectionPhotos||{});setPage("inspection");}}>استكمال الفحص</button>}
      {engineerView === "completed" && <button style={{...buttonStyle,background:"#0B2F55",color:"#FFFFFF"}} onClick={async () => {try { const savedPhotos = await loadFahsPhotos(order.id); setOrders(prev => prev.map(item => item.id === order.id ? { ...item, inspectionPhotos: savedPhotos } : item)); } catch (error) { console.warn("تعذر تحميل صور التقرير", error); } setExpandedOrder(order.id);setShowReportPage(true);setPage("orders");window.scrollTo(0,0);}}>📄 التقرير (عرض فقط)</button>}
    </div>)}
  </section>;
})()}


</main>

      <footer
        style={{
          textAlign: "center",
          color: "#0B2F55",
          fontSize: "12px",
          padding: "20px",
          background: "#F7F4EF",
        }}
      >
        <img src={fahsLogo} alt="FAHS فحص" style={{display:"block",width:"125px",maxWidth:"55%",height:"auto",margin:"0 auto 8px",objectFit:"contain"}} />
        <div>FAHS © 2026 - جميع الحقوق محفوظة</div>
      </footer>
    </div>
  );
}