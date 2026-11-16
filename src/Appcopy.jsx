import React from "react";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import { carDatabase } from "./carDatabase";
import { carYears } from "./carYears";
import { egyptLocations } from "./egyptLocations";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
useMap,
CircleMarker,
} from "react-leaflet";

const gold = "#d4af37";
const dark = "#111111";

const inputStyle = {
  width: "100%",
  padding: "17px",
  marginTop: "10px",
  border: "1px solid #666",
  borderRadius: "12px",
  background: "#222",
  color: "#fff",
  fontSize: "19px",
  fontWeight: "500",
  minHeight: "58px",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginTop: "22px",
  color: "#d4af37",
  fontWeight: "bold",
  fontSize: "19px",
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
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            left: 0,
            maxHeight: "220px",
            overflowY: "auto",
            background: "#292929",
            border: "1px solid #555",
            borderRadius: "10px",
            zIndex: 100,
          }}
        >
          {filtered.map((item) => (
            <div
              key={item}
              onMouseDown={() => {
                onChange(item);
                setSearch("");
                setOpen(false);
              }}
              style={{
                padding: "12px",
                borderBottom: "1px solid #444",
                cursor: "pointer",
                color: "#fff",
                textAlign: "right",
              }}
            >
              {item.replaceAll("_", " ")}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: "12px", color: "#aaa" }}>
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
        border: "2px solid #d4af37",
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
            fillColor: "#d4af37",
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
export default function App() {
  const [step, setStep] = useState(() => {
  return Number(localStorage.getItem("fahs_step")) || 1;
});
useEffect(() => {
  localStorage.setItem("fahs_step", String(step));
}, [step]);
  const [page, setPage] = useState(() => {
  return localStorage.getItem("fahs_page") || "home";
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
      JSON.stringify(currentInspection)
    );
  } else {
    localStorage.removeItem("fahs_current_inspection");
  }
}, [currentInspection]);
  const [inspectionData, setInspectionData] = useState(() => {
  return currentInspection?.inspectionData || {};
});

const [inspectionPhotos, setInspectionPhotos] = useState(() => {
  return currentInspection?.inspectionPhotos || {};
});
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

    localStorage.setItem("fahs_orders", JSON.stringify(updatedOrders));
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
  localStorage.setItem("fahs_orders", JSON.stringify(orders));
}, [orders]);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

const [governorate, setGovernorate] = useState("");
const [area, setArea] = useState("");
const [location, setLocation] = useState("");
const [landmark, setLandmark] = useState("");
const [notes, setNotes] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapPosition, setMapPosition] = useState([30.0444, 31.2357]);
  const [gpsCoordinates, setGpsCoordinates] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
const [mapSearchResults, setMapSearchResults] = useState([]);
const [mapSearching, setMapSearching] = useState(false);
const [selectedMapAddress, setSelectedMapAddress] = useState("");
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
const [activeEngineer, setActiveEngineer] = useState(null);
useEffect(() => {
  localStorage.setItem(
    "fahs_engineers",
    JSON.stringify(engineers)
  );
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
        const address = result.address || {};

        const normalizeLocationText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const governorateNames = [
  address.state,
  address.governorate,
  address.state_district,
].filter(Boolean);

const governorateMatch = governorates.find((item) => {
  const normalizedItem = normalizeLocationText(item);

  return governorateNames.some((name) => {
    const normalizedName = normalizeLocationText(name)
      .replace(/^محافظة\s*/, "");

    return (
      normalizedName === normalizedItem ||
      normalizedName.includes(normalizedItem) ||
      normalizedItem.includes(normalizedName)
    );
  });
});

const areaNames = [
  address.city_district,
  address.district,
  address.suburb,
  address.neighbourhood,
  address.neighborhood,
  address.quarter,
  address.city,
  address.town,
  address.municipality,
  address.village,
  address.county,
  address.residential,
].filter(Boolean);

if (governorateMatch) {
  setGovernorate(governorateMatch);

  const normalizedAddressParts = areaNames.map(normalizeLocationText);

  const areaMatch = egyptLocations[governorateMatch].find((item) => {
    const normalizedItem = normalizeLocationText(item);

    return normalizedAddressParts.some(
      (part) =>
        part.length > 2 &&
        (
          part === normalizedItem ||
          part.includes(normalizedItem) ||
          normalizedItem.includes(part)
        )
    );
  });

  setArea(areaMatch || "");
}

        setLocation(
          `${result.display_name || ""}\nخط العرض: ${lat}\nخط الطول: ${lng}`
        );

      } catch (error) {
        setLocation(
          `خط العرض: ${lat} - خط الطول: ${lng}`
        );

        alert("تم تحديد موقعك، لكن تعذر تحويله إلى عنوان تلقائي.");
      }

      setGpsLoading(false);
    },

    (error) => {
      setGpsLoading(false);
      alert("تعذر تحديد موقعك. تأكد من السماح بالوصول للموقع وحاول مرة أخرى.");
    },

    {
      enableHighAccuracy: false,
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
  if (!governorate || !area || !location.trim()) {
    alert("من فضلك اختر المحافظة والمنطقة واكتب العنوان بالتفصيل");
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
    brand,
model,
year,
governorate,
area,
location,
gpsCoordinates,
landmark,
notes,
    service: "فحص شامل للسيارة",
    status: "تم استلام الطلب",
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
    background: "#1b1b1b",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "18px",
  };

  const buttonStyle = {
  width: "100%",
  padding: "17px",
  minHeight: "58px",
  border: "none",
  borderRadius: "14px",
  background: "#d4af37",
  color: "#111",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "24px",
  boxShadow: "0 4px 12px rgba(212,175,55,0.18)",
};

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: dark,
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        paddingBottom: "35px",
      }}
    >
      <header
  style={{
    background: "linear-gradient(135deg, #080808, #202020)",
    borderBottom: "2px solid #d4af37",
    padding: "25px 15px",
    textAlign: "center",
    boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
    }}
  >
    <span style={{ fontSize: "32px" }}>🛡️</span>

    <span
      style={{
        color: "#d4af37",
        fontSize: "34px",
        fontWeight: "bold",
      }}
    >
      فحص
    </span>
  </div>

  <div
    style={{
      color: "#fff",
      fontSize: "17px",
      fontWeight: "bold",
      letterSpacing: "5px",
      marginTop: "5px",
    }}
  >
    FAHS
  </div>

  <p
    style={{
      color: "#bbb",
      fontSize: "14px",
      marginBottom: "0",
      marginTop: "10px",
    }}
  >
    فحص سيارتك في مكانك .. واطمئن على اختيارك
  </p>
</header>

      <main style={{ maxWidth: "600px", margin: "auto", padding: "20px" }}>
       {/* زر القائمة الجانبية */}
<button
  onClick={() => setMenuOpen(!menuOpen)}
  style={{
  position: "fixed",
  top: "20px",
  left: "20px",
  zIndex: 10000,
  background: "#222",
  color: "#d4af37",
  border: "1px solid #d4af37",
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

{/* خلفية القائمة */}
{menuOpen && (
  <div
    onClick={() => setMenuOpen(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      zIndex: 999,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: 0,
        left: "0px",
        right: "auto",
        width: "280px",
        maxWidth: "85%",
        height: "100%",
        background: "#1b1b1b",
        borderLeft: `2px solid ${gold}`,
        padding: "25px 18px",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ color: gold, textAlign: "center" }}>
        🛡️ FAHS
      </h2>

      <hr style={{ borderColor: "#444" }} />

      <button
        onClick={() => {
          setPage("home");
          setMenuOpen(false);
        }}
        style={buttonStyle}
      >
        🏠 الرئيسية
      </button>

      <button
        onClick={() => {
          setPage("orders");
          setMenuOpen(false);
        }}
        style={{
          ...buttonStyle,
          background: "#333",
          color: gold,
          border: `1px solid ${gold}`,
        }}
      >
        📋 طلباتي السابقة
      </button>

      <button
        onClick={() => setMenuOpen(false)}
        style={{
          ...buttonStyle,
          background: "#333",
          color: "#fff",
        }}
      >
        إغلاق القائمة ✕
      </button>
    </div>
  </div>
)}

        <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    margin: "25px 0",
    padding: "15px 10px",
    background: "#1b1b1b",
    border: "1px solid #333",
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
              background: active || completed ? gold : "#333",
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
            background: "#252525",
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

          <p>المحافظة: {order.governorate || "غير محدد"}</p>

<p>المنطقة: {order.area || "غير محدد"}</p>

<p>العنوان: {order.location}</p>

<p>علامة مميزة: {order.landmark || "لم يتم تحديدها"}</p>

          <p>
            الحالة: <span style={{ color: "#d4af37" }}>
              {order.status}
            </span>
          </p>
          {order.status === "تم الفحص" && order.inspectionData && (
  <button
  style={{ ...buttonStyle, width: "100%", marginTop: "10px" }}
  onClick={() => {
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
            {formatValue(data[part])}
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
      background: "#1b1b1b",
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
      background: "#17365d",
      color: "#ffffff",
      border: "1px solid #d4af37",
      borderRadius: "50%",
      fontSize: "25px",
      fontWeight: "bold",
      cursor: "pointer"
    }}
  >
    ←
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
            <div>
              <div style={{
                color: gold,
                fontSize: "27px",
                fontWeight: "bold",
                letterSpacing: "2px"
              }}>
                FAHS
              </div>
              <div style={{
                color: navy,
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                فحص
              </div>
            </div>

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
  ["اسم العميل", order.clientName],
  ["رقم الهاتف", order.phone],
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
            <strong style={{
              color: gold,
              fontSize: "20px"
            }}>
              FAHS
            </strong>

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
    <strong style={{ color: gold, fontSize: "24px" }}>
      FAHS
    </strong>
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

  {/* ختم FAHS الذهبي */}
  <div style={{
    display: "flex",
    justifyContent: "center",
    marginTop: "25px"
  }}>
    <div style={{
      width: "120px",
      height: "75px",
      border: `3px double ${gold}`,
      borderRadius: "10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: gold,
      fontWeight: "bold"
    }}>
      <div style={{ fontSize: "25px" }}>FAHS</div>
      <div style={{ fontSize: "13px" }}>فحص</div>
      <div style={{ fontSize: "10px" }}>تم الفحص الفني</div>
    </div>
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

            <p style={{ color: "#aaa" }}>
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
              <p style={{ color: "#aaa", fontSize: "12px" }}>
                سنوات هذا الموديل غير مسجلة حتى الآن، اكتب سنة الصنع يدويًا.
              </p>
            )}

            <button style={buttonStyle} onClick={nextStep}>
              التالي ←
            </button>
          </section>
        )}

        {page === "home" && step === 2 && (
          <section style={cardStyle}>
            <h2 style={{ color: gold, marginTop: 0 }}>
              موقع الفحص
            </h2>

            <p style={{ color: "#aaa" }}>
  اختر المحافظة والمنطقة واكتب عنوان وجود السيارة
</p>

<label style={labelStyle}>المحافظة</label>

<select
  style={inputStyle}
  value={governorate}
  onChange={(e) => {
    setGovernorate(e.target.value);
    setArea("");
  }}
>
  <option value="">اختر المحافظة</option>

  {governorates.map((item) => (
    <option key={item} value={item}>
      {item}
    </option>
  ))}
</select>

<label style={labelStyle}>المنطقة أو المدينة</label>

<select
  style={inputStyle}
  value={area}
  disabled={!governorate}
  onChange={(e) => setArea(e.target.value)}
>
  <option value="">اختر المنطقة أو المدينة</option>

  {areas.map((item) => (
    <option key={item} value={item}>
      {item}
    </option>
  ))}
</select>

            
<button
  type="button"
  style={buttonStyle}
  onClick={getLocation}
  disabled={gpsLoading}
>
  {gpsLoading ? "جاري تحديد الموقع..." : "📍 تحديد موقعي تلقائيًا"}
</button>
<button
  type="button"
  style={{
    ...buttonStyle,
    marginTop: "12px",
    background: "#17365d",
    color: "#ffffff",
    border: "1px solid #d4af37",
  }}
  onClick={() => setShowMap(true)}
>
  🗺️ اختيار الموقع على الخريطة
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
attribution='&copy; OpenStreetMap'
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"      />

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
        fontSize: "42px",
        pointerEvents: "none",
        filter: "drop-shadow(0 3px 5px #000)",
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
          color: "#222",
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
          style={{
            maxHeight: "230px",
            overflowY: "auto",
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
                color: "#222",
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

    {/* تحديد موقعي الحالي */}
    <button
      type="button"
      onClick={getLocation}
      style={{
        position: "absolute",
        left: "18px",
        bottom: "205px",
        zIndex: 1100,
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: "none",
        background: "#fff",
        fontSize: "23px",
        boxShadow: "0 3px 12px #0004",
      }}
    >
      ◎
    </button>

    {/* بطاقة تأكيد الموقع */}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        background: "#171717",
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
          color: "#d4af37",
          fontSize: "19px",
          fontWeight: "bold",
          marginBottom: "8px",
        }}
      >
        موقع السيارة
      </div>

      <div
        style={{
          color: "#ddd",
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
          background: "#d4af37",
          color: "#111",
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

            setLocation(
              `${result.display_name || ""}\nخط العرض: ${lat}\nخط الطول: ${lng}`
            );

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
          color: "#ccc",
          border: "none",
          fontSize: "15px",
        }}
      >
        رجوع
      </button>
    </div>
  </div>
)}
            <label style={labelStyle}>العنوان بالتفصيل</label>

            <textarea
              style={{ ...inputStyle, minHeight: "90px" }}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="اكتب عنوان وجود السيارة..."
            />

            <label style={labelStyle}>علامة مميزة للمكان</label>

            <input
              style={inputStyle}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="مثال: أمام مول أو بجوار محطة..."
            />

            <label style={labelStyle}>ملاحظات إضافية</label>

            <textarea
              style={{ ...inputStyle, minHeight: "80px" }}
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
                background: "#333",
                color: "#fff",
                marginTop: "0",
              }}
              onClick={() => setStep(1)}
            >
              رجوع
            </button>
          </section>
        )}

        {page === "home" && step === 3 && (
          <section style={cardStyle}>
            <h2 style={{ color: gold, marginTop: 0 }}>
              مراجعة الطلب
            </h2>

            <p style={{ color: "#aaa" }}>
              راجع البيانات قبل تأكيد طلب الفحص
            </p>

            <div style={{ borderBottom: "1px solid #444", padding: "12px 0" }}>
              <h3 style={{ color: gold }}>بيانات السيارة</h3>
              <p>الماركة: {brand.replaceAll("_", " ")}</p>
              <p>الموديل: {model}</p>
              <p>سنة الصنع: {year}</p>
            </div>

            <div style={{ borderBottom: "1px solid #444", padding: "12px 0" }}>
              <h3 style={{ color: gold }}>موقع الفحص</h3>
<p>المحافظة: {governorate}</p>
<p>المنطقة: {area}</p>
<p>العنوان: {location}</p>
<p>علامة مميزة: {landmark || "لم يتم تحديدها"}</p>
<p>ملاحظات: {notes || "لا توجد ملاحظات"}</p>
            </div>

            <div style={{ padding: "12px 0" }}>
              <h3 style={{ color: gold }}>نوع الخدمة</h3>
              <p>فحص شامل للسيارة</p>
            </div>

            <button style={buttonStyle} onClick={confirmOrder}>
              تأكيد الطلب
            </button>

            <button
              style={{
                ...buttonStyle,
                background: "#333",
                color: "#fff",
                marginTop: "0",
              }}
              onClick={() => setStep(2)}
            >
              تعديل البيانات
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
      color: "#d4af37",
      textAlign: "center"
    }}>
      تم استلام طلبك بنجاح
    </h2>

    <p style={{
      color: "#fff",
      textAlign: "center",
      lineHeight: "2"
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
        const idFile = formData.get("idPhoto");

        const newEngineer = {
          id: Date.now(),
          name: formData.get("name"),
          phone: formData.get("phone"),
          nationalId: formData.get("nationalId"),
          governorate: formData.get("governorate"),
          area: formData.get("area"),
          experience: formData.get("experience"),
          specialization: formData.get("specialization"),
          idPhotoName: idFile?.name || "",
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
        ["nationalId", "الرقم القومي"],
        ["governorate", "المحافظة"],
        ["area", "المنطقة"],
        ["experience", "سنوات الخبرة"],
        ["specialization", "التخصص"],
      ].map(([name, label]) => (
        <div key={name} style={{ marginBottom: "15px" }}>
          <label style={{ color: gold }}>{label}</label>
          <input
            name={name}
            required
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "7px",
              borderRadius: "10px",
              border: "1px solid #aaa",
              background: "#333",
              color: "#fff",
              boxSizing: "border-box",
            }}
          />
        </div>
      ))}

      <label style={{ color: gold }}>
        صورة البطاقة الشخصية
      </label>

      <input
        type="file"
        name="idPhoto"
        accept="image/*"
        required
        style={{ display: "block", margin: "15px 0" }}
      />

      <button type="submit" style={buttonStyle}>
        إرسال طلب الانضمام
      </button>
    </form>
  </section>
)}
{page === "home" && (
  <div style={{ textAlign: "center", margin: "25px 0" }}>
    <button
      style={{
        ...buttonStyle,
        background: "#182638",
        border: `1px solid ${gold}`,
        color: gold,
        width: "100%",
      }}
      onClick={() => setPage("engineerRegister")}
    >
      👨‍🔧 انضم لفريق مهندسي FAHS
    </button>
    <button
  style={{
    ...buttonStyle,
    background: "#182638",
    border: "1px solid gold",
    color: "gold",
    width: "100%",
    marginTop: "12px",
  }}
  onClick={() => setPage("engineerLogin")}
>
  دخول مهندسي FAHS
</button>
    <button
  style={{
    ...buttonStyle,
    background: "#182638",
    border: "1px solid gold",
    color: "gold",
    width: "100%",
    marginTop: "12px"
  }}
  onClick={() => setPage("admin")}
>
  ⚙️ لوحة إدارة FAHS
</button>
  </div>
)}{page === "engineerPending" && (
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
      background: "#333",
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
      onClick={() => setPage("home")}
    >
      العودة للرئيسية
    </button>
  </section>
)}{page === "admin" && (
  <section style={cardStyle}>
    <h2 style={{ color: "gold", textAlign: "center" }}>
      لوحة تحكم إدارة FAHS
    </h2>

    <h3 style={{ color: "#fff" }}>
      طلبات انضمام المهندسين: {engineers.length}
    </h3>

    {engineers.length === 0 ? (
      <p style={{ color: "#aaa", textAlign: "center" }}>
        لا توجد طلبات حالياً
      </p>
    ) : (
      engineers.map((eng) => (
        <div
          key={eng.id}
          style={{
            background: "#333",
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
    <h2 style={{ color: "gold", textAlign: "center" }}>
      دخول مهندسي FAHS
    </h2>

    <input
      type="tel"
      placeholder="رقم الموبايل"
      value={engineerPhone}
      onChange={(e) => setEngineerPhone(e.target.value)}
      style={{
        width: "100%",
        padding: "14px",
        margin: "15px 0",
        boxSizing: "border-box",
      }}
    />

    <button
      style={buttonStyle}
      onClick={() => {
        const engineer = engineers.find(
          (eng) =>
            eng.phone === engineerPhone &&
            eng.status === "مقبول"
        );

        if (engineer) {
          setActiveEngineer(engineer);
          setPage("engineerDashboard");
        } else {
          alert("رقم الهاتف غير مسجل أو الحساب غير معتمد");
        }
      }}
    >
      تسجيل الدخول
    </button>

    <button
      style={buttonStyle}
      onClick={() => setPage("home")}
    >
      العودة للرئيسية
    </button>
  </section>
)}
{page === "inspection" && (
  <section style={cardStyle}>
    <h2 style={{ color: "gold", textAlign: "center" }}>
      FAHS - فحص السيارة
    </h2>

    <p style={{ color: "white", textAlign: "center" }}>
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
      background: "#222",
      padding: "12px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
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
  "حوض الشنطة"
].map((part) => (
  <div
    key={part}
    style={{
      background: "#222",
      padding: "12px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
      textAlign: "right"
    }}
  >
    <strong>{part}</strong>

    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {["فابريكا", "استعدال", "رش", "قطع ولحام"].map((choice) => (
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

          const compressedPhoto = canvas.toDataURL("image/jpeg", 0.7);

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
      background: "#222",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
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
      background: "#222",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
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
      background: "#222",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
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
      background: "#222",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
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
      background: "#222",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
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
      background: "#222",
      padding: "15px",
      marginTop: "10px",
      borderRadius: "8px",
      color: "white",
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
    background: "#222",
    color: "white",
    border: "1px solid #555",
    textAlign: "right",
    fontSize: "16px",
  }}
/>
<button
  style={{
    ...buttonStyle,
    background: "#15803d",
    color: "white",
    width: "100%",
    marginTop: "20px"
  }}
  onClick={() => {
    if (!window.confirm("هل أنت متأكد من إنهاء الفحص وإرسال التقرير؟")) return;
if (!currentInspection) {
  alert("حدث خطأ: بيانات طلب الفحص غير موجودة. ارجع إلى الطلب وحاول مرة أخرى.");
  return;
}
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

      localStorage.setItem("fahs_orders", JSON.stringify(updatedOrders));
      return updatedOrders;
    });

    alert("تم حفظ تقرير الفحص بنجاح");
    setPage("engineerDashboard");
  }}
>
  إنهاء الفحص وإرسال التقرير
</button>
  </section>
)}
{page === "engineerDashboard" && (
  <section style={cardStyle}>
    <h2 style={{ color: "gold", textAlign: "center" }}>
      لوحة تحكم مهندس FAHS
    </h2>

    <h3 style={{ color: "white", textAlign: "center" }}>
      أهلاً م. {activeEngineer?.name}
    </h3>

    <div style={{
      background: "#182638",
      padding: "15px",
      borderRadius: "12px",
      marginTop: "20px"
    }}>
      <h3 style={{ color: "gold" }}>طلبات الفحص الجديدة</h3>

      <p style={{ color: "white" }}>
        عدد الطلبات: {orders.length}
      </p>

      {orders.length === 0 ? (
        <p style={{ color: "#ccc" }}>
          لا توجد طلبات فحص حالياً
        </p>
      ) : (
        orders.map((order, index) => (
          <div key={order.id || index} style={{
            border: "1px solid gold",
            padding: "12px",
            marginTop: "10px",
            borderRadius: "8px",
            color: "white"
          }}>
            <p>السيارة: {order.brand || ""} {order.model || ""}</p>
            <p>الموديل: {order.year || "غير محدد"}</p>
            <p>المحافظة: {order.governorate || "غير محدد"}</p>
            <p>المنطقة: {order.area || "غير محدد"}</p>
            <p style={{ color: "gold" }}>
  الحالة: {order.status || "طلب جديد"}
</p>

{(
  !order.status ||
  order.status === "طلب جديد" ||
  order.status === "تم استلام الطلب"
) && (  <button
    style={{
      ...buttonStyle,
      background: "green",
      color: "white",
      width: "100%",
      marginTop: "10px"
    }}
    onClick={() => {
      setOrders(prev =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                status: "مقبول",
                engineerId: activeEngineer?.id
              }
            : item
        )
      );
      alert("تم قبول طلب الفحص بنجاح");
    }}
  >
    قبول طلب الفحص
  </button>
)}
{order.status === "مقبول" && (
  <button
    style={{
      ...buttonStyle,
      background: "#1976D2",
      color: "white",
      width: "100%",
      marginTop: "10px"
    }}
    onClick={() => {
      const address = [
        order.location,
        order.landmark,
        order.area,
        order.governorate
      ].filter(Boolean).join(" ");

      const mapUrl =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(address);

      window.open(mapUrl, "_blank");

      setOrders(prev =>
        prev.map((item, i) =>
          i === index
            ? { ...item, status: "وصل المهندس" }
            : item
        )
      );
    }}
  >
    📍 الانتقال إلى مكان الفحص
  </button>
)}
{order.status === "وصل المهندس" && (
  <button
    style={{
      ...buttonStyle,
      background: "#198754",
      color: "white",
      width: "100%",
      marginTop: "10px"
    }}
    onClick={() => {
      setOrders(prev =>
        prev.map((item, i) =>
          i === index
            ? { ...item, status: "تم تأكيد الوصول" }
            : item
        )
      );
      alert("تم تأكيد الوصول بنجاح");
    }}
  >
    ✅ تأكيد الوصول لمكان الفحص
  </button>
)}
{order.status === "تم تأكيد الوصول" && (
  <button
    style={{
      ...buttonStyle,
      background: "#1565c0",
      color: "white",
      width: "100%",
      marginTop: "10px"
    }}
    onClick={() => {
  setCurrentInspection(order);
setInspectionData(order.inspectionData || {});
setInspectionPhotos(order.inspectionPhotos || {});
  setOrders(prev =>
    prev.map((item, i) =>
      i === index
        ? { ...item, status: "الفحص جاري" }
        : item
    )
  );
  setPage("inspection");
}}
  >
    🔍 بدء الفحص
  </button>
)}
{order.status === "الفحص جاري" && (
  <button
    style={{
      ...buttonStyle,
      background: "#d99b00",
      color: "#222",
      width: "100%",
      marginTop: "10px"
    }}
    onClick={() => {
      setCurrentInspection(order);
      setInspectionData(order.inspectionData || {});
      setInspectionPhotos(order.inspectionPhotos || {});
      setPage("inspection");
    }}
  >
    🔄 استكمال الفحص
  </button>
)}
          {["مقبول", "في الطريق", "وصل المهندس"].includes(order.status) && (
  <button
    style={{
      ...buttonStyle,
      background: "#c62828",
      color: "white",
      width: "100%",
      marginTop: "10px"
    }}
    onClick={() => {
      if (window.confirm("هل أنت متأكد من إلغاء طلب الفحص؟")) {
        setOrders(prev =>
          prev.map((item, i) =>
            i === index
              ? { ...item, status: "ملغي" }
              : item
          )
        );
        alert("تم إلغاء طلب الفحص");
      }
    }}
  >
    إلغاء طلب الفحص
  </button>
)}
          </div>
        ))
      )}
    </div>

    <button
      style={buttonStyle}
      onClick={() => {
        setActiveEngineer(null);
        setEngineerPhone("");
        setPage("home");
      }}
    >
      تسجيل الخروج
    </button>
  </section>
)}

</main>

      <footer
        style={{
          textAlign: "center",
          color: "#777",
          fontSize: "12px",
          padding: "20px",
        }}
      >
        FAHS © 2026 - جميع الحقوق محفوظة
      </footer>
    </div>
  );
}