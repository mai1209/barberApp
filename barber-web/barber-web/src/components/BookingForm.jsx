import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/BookingForm.module.css";
import {
  fetchBarbers,
  fetchBarberAppointments,
  createAppointment,
  fetchShopInfo,
  fetchServices,
  setShopSlug,
} from "../services/api";

const formatDateParam = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const minutesToLabel = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_WORKING_RANGE = { start: 8 * 60, end: 22 * 60 };
const DEFAULT_RANGE_LABEL = `${minutesToLabel(DEFAULT_WORKING_RANGE.start)} - ${minutesToLabel(DEFAULT_WORKING_RANGE.end)}`;

const labelToMinutes = (label) => {
  const [hours, minutes] = label.split(":").map(Number);
  return hours * 60 + minutes;
};

const parseTimeFragment = (fragment) => {
  if (!fragment) return null;
  const match = fragment.trim().match(/(\d{1,2})(?::(\d{2}))?/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  )
    return null;
  return hours * 60 + minutes;
};

const parseScheduleRangeLabel = (range) => {
  if (!range) return null;
  const parts = range
    .split(/-|a/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const start = parseTimeFragment(parts[0]);
  const end = parseTimeFragment(parts[1]);
  if (start == null || end == null || end <= start) return null;
  return { start, end };
};

function BookingForm({ shopSlug }) {
  // 1. TODOS LOS USESTATE PRIMERO
  const [slugReady] = useState(() => {
    if (shopSlug) {
      setShopSlug(shopSlug);
      return true;
    }
    return false;
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState(() => new Set());
  const [shopInfo, setShopInfo] = useState(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [email, setEmail] = useState(""); // <-- AGREGAR ESTO
  const [loadingSlots, setLoadingSlots] = useState(false);

  const currentDuration =
    selectedService?.durationMinutes ?? SLOT_INTERVAL_MINUTES;

  // 2. USEMEMO
  const selectedBarberData = useMemo(
    () => barbers.find((b) => b._id === selectedBarber) ?? null,
    [barbers, selectedBarber],
  );

  const workingWindow = useMemo(() => {
    const range =
      selectedBarberData?.scheduleRange || selectedBarberData?.schedule;
    if (!range) return DEFAULT_WORKING_RANGE;
    return parseScheduleRangeLabel(range) ?? DEFAULT_WORKING_RANGE;
  }, [selectedBarberData]);

  // Reemplazá el useMemo de horarios por este:
  const horarioGroups = useMemo(() => {
    const workDays = selectedBarberData?.workDays || [0, 1, 2, 3, 4, 5, 6];
    const currentDayOfWeek = selectedDate.getUTCDay();
    if (!workDays.includes(currentDayOfWeek)) return [];

    const step = currentDuration;

    const buildSlots = (startStr, endStr) => {
      const parse = (t) => {
        const [h, m] = t.trim().split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const start = parse(startStr);
      const end = parse(endStr);
      const slots = [];
      for (let m = start; m <= end; m += step) {
        if (m + step > end) break;
        slots.push(minutesToLabel(m));
      }
      return slots;
    };

    // Turno cortado
    const ranges = selectedBarberData?.scheduleRanges;
    if (ranges && ranges.length > 0) {
      return ranges.map((r) => ({
        label: r.label,
        slots: buildSlots(r.start, r.end),
      }));
    }

    // Horario corrido
    const range = selectedBarberData?.scheduleRange;
    if (!range) return [{ label: "", slots: [] }];
    const parsed = parseScheduleRangeLabel(range);
    if (!parsed) return [];
    return [
      {
        label: "",
        slots: buildSlots(
          minutesToLabel(parsed.start),
          minutesToLabel(parsed.end),
        ),
      },
    ];
  }, [currentDuration, selectedBarberData, selectedDate]);

  // Lista plana para isSlotDisabled
  const allSlots = useMemo(
    () => horarioGroups.flatMap((g) => g.slots),
    [horarioGroups],
  );

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(selectedDate);
  }, [selectedDate]);

  // 3. TODOS LOS USEEFFECT
  useEffect(() => {
    if (!selectedSlot) return;
    if (!allSlots.includes(selectedSlot)) setSelectedSlot(null);
  }, [allSlots, selectedSlot]);

  useEffect(() => {
    if (!slugReady) return;
    (async () => {
      try {
        const res = await fetchShopInfo();
        setShopInfo(res?.shop ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setShopLoading(false);
      }
    })();
  }, [slugReady]);

  useEffect(() => {
    if (!slugReady) return;
    (async () => {
      try {
        const res = await fetchServices();
        const list = res?.services ?? [];
        setServices(list);
        setSelectedService(list[0] ?? null);
      } catch (err) {
        setServicesError("Error al cargar servicios");
      } finally {
        setServicesLoading(false);
      }
    })();
  }, [slugReady]);

  useEffect(() => {
    if (!slugReady) return;
    (async () => {
      try {
        const res = await fetchBarbers();
        console.log("RES BARBEROS:", JSON.stringify(res));
        const list = res.barbers || [];
        setBarbers(list);
        if (list.length > 0) setSelectedBarber(list[0]._id);
      } catch (err) {
        console.error("Error barberos:", err.message, err.status);
      } finally {
        setLoadingBarbers(false);
      }
    })();
  }, [slugReady]);

  const loadSlots = useCallback(async () => {
    if (!selectedBarber || !slugReady) return;
    try {
      setLoadingSlots(true);
      const res = await fetchBarberAppointments(
        selectedBarber,
        formatDateParam(selectedDate),
      );
      const busy = new Set();
      if (res?.appointments) {
        res.appointments.forEach((app) => {
          if (app.status === "cancelled") return;
          const start = new Date(app.startTime);
          const occupiedDuration =
            app.durationMinutes ?? SLOT_INTERVAL_MINUTES;
          for (let o = 0; o < occupiedDuration; o += SLOT_INTERVAL_MINUTES) {
            const slotTime = new Date(start.getTime() + o * 60000);
            const h = slotTime.getHours();
            const m = slotTime.getMinutes();
            busy.add(
              `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
            );
          }
        });
      }
      setOccupiedSlots(busy);
    } catch (err) {
      console.error("Error ocupación:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedBarber, selectedDate, selectedService, slugReady]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await loadSlots();
    })();
    const intervalId = setInterval(() => {
      loadSlots();
    }, 15000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [loadSlots]);

  // 4. CALLBACKS
  const handleDateShift = useCallback((days) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      return next;
    });
  }, []);

  const isSlotDisabled = useCallback(
    (label) => {
      const startMinutes = labelToMinutes(label);

      // Solo bloquear pasados si es hoy
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      if (isToday) {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (startMinutes <= nowMinutes) return true;
      }

      // Bloquear si está ocupado
      const steps = Math.ceil(currentDuration / SLOT_INTERVAL_MINUTES);
      for (let i = 0; i < steps; i++) {
        const checkLabel = minutesToLabel(
          startMinutes + i * SLOT_INTERVAL_MINUTES,
        );
        if (occupiedSlots.has(checkLabel)) return true;
      }
      return false;
    },
    [currentDuration, occupiedSlots, selectedDate],
  );

const handleSubmit = async (e) => {
    e.preventDefault();
    const serviceName = selectedService?.name || "Servicio";
    
    // Detectamos si estamos en localhost
    const isDev = window.location.hostname === "localhost";

    if (!selectedBarber || !selectedSlot) {
      alert("Por favor selecciona barbero y horario");
      return;
    }

    try {
      setSaving(true);
      const y = selectedDate.getFullYear();
      const mo = selectedDate.getMonth();
      const d = selectedDate.getDate();
      const [hh, mm] = selectedSlot.split(":").map(Number);
      const localDate = new Date(y, mo, d, hh, mm, 0, 0);
      const finalDateUTC = localDate.toISOString();

      await createAppointment({
        barberId: selectedBarber,
        customerName: customerName.trim(),
        service: serviceName,
        startTime: finalDateUTC,
        durationMinutes: currentDuration,
        notes: phone.trim(),
        email: email.trim(), 
      });

      // --- MENSAJE PERSONALIZADO ---
      if (isDev) {
        alert("🛠️ [TEST EXITOSO]: Turno creado en Localhost. No te preocupes por el mail real ahora.");
      } else {
        alert("¡Listo! Tu turno fue reservado. Revisá tu email para ver los detalles de la confirmación.");
      }
      // -----------------------------

      setSelectedSlot(null);
      await loadSlots();
    } catch (err) {
      alert("Error: " + (err.details?.error || err.message));
    } finally {
      setSaving(false);
    }
};

  // 5. LOADING STATE
  if (!slugReady || loadingBarbers) {
    return (
      <section className={styles.wrapper}>
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#B89016",
          }}
        >
          Cargando...
        </div>
      </section>
    );
  }

  // 6. RENDER
  return (
    <section className={styles.wrapper}>
      {servicePickerOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setServicePickerOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Seleccionar servicio</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setServicePickerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalList}>
              {services.map((service) => (
                <button
                  type="button"
                  key={service._id}
                  className={`${styles.serviceItem} ${selectedService?._id === service._id ? styles.serviceItemActive : ""}`}
                  onClick={() => {
                    setSelectedService(service);
                    setServicePickerOpen(false);
                  }}
                >
                  <div>
                    <span className={styles.serviceItemTitle}>
                      {service.name}
                    </span>
                    <span className={styles.serviceItemMeta}>
                      {service.durationMinutes} min
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <p className={styles.textCodex}>
          <img className={styles.logo} src="/logo.png" alt="logo" /> BarberApp
          by CODEX®
        </p>
        <h1 className={styles.title}>Nueva Cita</h1>
        <div className={styles.containerTurno}>
          <p className={styles.labelHighlight}>RESERVA TU LUGAR EN: </p>
          <p className={styles.shopBadge}>
            {shopLoading ? "..." : shopInfo?.name || "Barbería"}
          </p>
        </div>
      </header>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Servicio deseado</label>
          <button
            type="button"
            className={`${styles.selector} ${focusedField === "service" ? styles.selectorFocused : ""}`}
            onClick={() => setServicePickerOpen(true)}
          >
            <div>
              <span className={styles.selectorMainText}>
                {selectedService?.name || "Seleccionar servicio"}
              </span>
              <span className={styles.selectorSubText}>
                {currentDuration} minutos de sesión
              </span>
            </div>
            <span className={styles.arrowIcon}>▼</span>
          </button>
        </div>

        <div className={styles.twoColumn}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Nombre</label>
            <input
              className={styles.input}
              placeholder="Tu nombre"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>WhatsApp</label>
      <input
  className={styles.input}
  placeholder="Ej: +54 9 342 000-0000"
  type="tel"
  value={phone}
  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\s\-]/g, ''))}
  required
/>
          </div>
        </div>
        {/* NUEVO CAMPO DE EMAIL */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email (para confirmación)</label>
          <input
            className={styles.input}
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Elegí tu Barbero</label>
          <div className={styles.barberGrid}>
            {barbers.length === 0 ? (
              <p style={{ color: "#666", fontSize: 14 }}>
                No hay barberos disponibles.
              </p>
            ) : (
              barbers.map((b) => (
                <button
                  type="button"
                  key={b._id}
                  className={`${styles.barberChip} ${selectedBarber === b._id ? styles.barberChipSelected : ""}`}
                  onClick={() => {
                    setSelectedBarber(b._id);
                    setSelectedSlot(null);
                  }}
                >
                  <div className={styles.barberAvatar}>
                    {b.fullName.charAt(0)}
                  </div>
                  <div className={styles.barberInfo}>
                    <span className={styles.barberName}>
                      {b.fullName.split(" ")[0]}
                    </span>
                    <span className={styles.barberSchedule}>
                      {b.scheduleRanges && b.scheduleRanges.length > 0
                        ? `${b.scheduleRanges[0].start}-${b.scheduleRanges[0].end} / ${b.scheduleRanges[1]?.start}-${b.scheduleRanges[1]?.end}`
                        : b.scheduleRange || "Sin horario configurado"}{" "}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.scheduleHeader}>
            <label className={styles.label}>Horarios disponibles</label>
            <div className={styles.dateSelector}>
              <button
                type="button"
                onClick={() => handleDateShift(-1)}
                className={styles.dateBtn}
              >
                ‹
              </button>
              <span className={styles.dateText}>
                {formattedDate.split(",")[0]}
              </span>
              <button
                type="button"
                onClick={() => handleDateShift(1)}
                className={styles.dateBtn}
              >
                ›
              </button>
            </div>
          </div>

          {/* ANTES: <div className={styles.timeGrid}> */}
          <div className={styles.timeGridWrapper}>
            {loadingSlots ? (
              <p style={{ color: "#666", fontSize: 14 }}>
                Cargando horarios...
              </p>
            ) : horarioGroups.length === 0 ? (
              <div className={styles.noScheduleMessage}>
                <p>
                  🚫 Este barbero no atiende los días <br />
                  <strong>{formattedDate.split(",")[0]}</strong>
                </p>
                <p className={styles.subtitleError}>
                  Intente seleccionar otra fecha u otro barbero
                </p>
              </div>
            ) : (
              horarioGroups.map((group, gi) => (
                <div key={gi}>
                  {group.label ? (
                    <p className={styles.shiftGroupLabel}>
                      {group.label === "mañana" ? "☀️ Mañana" : "🌙 Tarde"}
                    </p>
                  ) : null}
                  <div className={styles.timeGrid}>
                    {group.slots.map((label) => {
                      const disabled = isSlotDisabled(label);
                      return (
                        <button
                          type="button"
                          key={label}
                          disabled={disabled}
                          className={`${styles.timeChip} ${selectedSlot === label ? styles.timeChipActive : ""} ${disabled ? styles.timeChipDisabled : ""}`}
                          onClick={() => setSelectedSlot(label)}
                        >
                          <span className={styles.timeChipText}>{label}</span>
                          <span className={styles.timeChipDuration}>
                            {currentDuration}min
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          className={styles.submitButton}
          type="submit"
          disabled={saving || !selectedSlot}
        >
          {saving ? "Procesando..." : "Confirmar Reserva"}
        </button>
      </form>
    </section>
  );
}

export default BookingForm;
