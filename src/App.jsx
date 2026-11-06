import { useState, useEffect } from "react";
import { carDatabase } from "./carDatabase";
import { carYears } from "./carYears";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  CircleMarker
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
          attribution='&copy; OpenStreetMap'
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
export default function App() {
  const [step, setStep] = useState(1);
  const [page, setPage] = useState("home");

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

  const [location, setLocation] = useState("");
  const [mapPosition, setMapPosition] = useState([30.0444, 31.2357]);
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  const [gpsLoading, setGpsLoading] = useState(false);

  const brands = Object.keys(carDatabase);

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

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("خاصية تحديد الموقع غير متاحة على جهازك");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setMapPosition([lat, lng]);
setLocation(`خط العرض: ${lat} - خط الطول: ${lng}`);
        setGpsLoading(false);
      },
      () => {
        alert("لم نتمكن من تحديد موقعك. تأكد من السماح بالوصول للموقع.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const nextStep = () => {
    if (step === 1) {
      if (!brand || !model || !year) {
        alert("من فضلك أكمل بيانات السيارة");
        return;
      }
    }

    if (step === 2 && !location.trim()) {
      alert("من فضلك أدخل موقع الفحص");
      return;
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
    location,
    landmark,
    notes,
    mapPosition,
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

  alert("تم حفظ طلبك بنجاح. رقم الطلب: " + newOrder.id);

  setStep(1);
  setBrand("");
  setModel("");
  setYear("");
  setLocation("");
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
        {page === "home" && (
  <button
    onClick={() => setPage("orders")}
    style={{
      ...buttonStyle,
      marginTop: "5px",
      background: "#222",
      color: gold,
      border: `1px solid ${gold}`,
    }}
  >
    📋 طلباتي السابقة
  </button>
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
      orders.map((order) => (
        <div
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

          <p>موقع الفحص: {order.location}</p>

          <p>
            الحالة: <span style={{ color: "#d4af37" }}>
              {order.status}
            </span>
          </p>
        </div>
      ))
    )}

    <button
      style={buttonStyle}
      onClick={() => setPage("home")}
    >
      العودة للرئيسية
    </button>
  </section>
)}
        {step === 1 && (
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

        {step === 2 && (
          <section style={cardStyle}>
            <h2 style={{ color: gold, marginTop: 0 }}>
              موقع الفحص
            </h2>

            <p style={{ color: "#aaa" }}>
              حدد المكان الذي توجد فيه السيارة
            </p>

            <button
              style={{
                ...buttonStyle,
                marginTop: "10px",
                background: "#333",
                color: gold,
                border: `1px solid ${gold}`,
              }}
              onClick={getLocation}
              disabled={gpsLoading}
            >
              {gpsLoading ? "جاري تحديد الموقع..." : "📍 تحديد موقعي الحالي"}
            </button>
            <LocationMap
  position={mapPosition}
  setPosition={setMapPosition}
/>

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
                marginTop: "10px",
              }}
              onClick={() => setStep(1)}
            >
              رجوع
            </button>
          </section>
        )}

        {step === 3 && (
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
                marginTop: "10px",
              }}
              onClick={() => setStep(2)}
            >
              تعديل البيانات
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