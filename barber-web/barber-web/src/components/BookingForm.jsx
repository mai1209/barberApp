import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/BookingForm.module.css";
import style from "../styles/LandingPage.module.css";

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
const SHOP_TZ = "America/Argentina/Cordoba";
const DEFAULT_BOOKING_BANNER = "/logo.png";

function formatTimeInShopTZ(value) {
  const parts = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SHOP_TZ,
  }).formatToParts(new Date(value));
  const hh = parts.find((part) => part.type === "hour")?.value ?? "00";
  const mm = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hh}:${mm}`;
}
const formatPrice = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatBookingDateLabel = (date) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: SHOP_TZ,
  }).format(date);

const getPublicPaymentOptions = (shopInfo) => {
  const settings = shopInfo?.paymentSettings || {};
  const options = [];

  if (settings.cashEnabled !== false) {
    options.push({
      value: "cash",
      label: "Efectivo / transferencia en el local",
      helper:
        "Reservás ahora y pagás presencialmente en la barbería cuando llegás a tu turno.",
    });
  }

  if (settings.advancePaymentEnabled && settings.mercadoPagoReady) {
    const value =
      settings.advanceType === "fixed"
        ? formatPrice(settings.advanceValue || 0)
        : `${Number(settings.advanceValue || 0)}%`;

    options.push({
      value: "transfer",
      label:
        settings.advanceMode === "full"
          ? "Transferencia adelantada"
          : "Transferencia adelantada",
      helper:
        settings.advanceMode === "full"
          ? "Pagás el turno completo online con Mercado Pago antes de confirmar la reserva."
          : `Pagás ${value} online con Mercado Pago para reservar con seña.`,
    });
  }

  return options;
};

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

const normalizeScheduleRanges = (input) => {
  if (!Array.isArray(input)) return [];
  return input.filter((item) => item?.start?.trim() && item?.end?.trim());
};

const normalizeOverrideValidFrom = (value) => {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "1970-01-01";
};

const resolveBarberScheduleForDate = (barber, date) => {
  if (!barber) return { scheduleRange: null, scheduleRanges: [] };

  const weekday = date.getDay();
  const override =
    barber.dayScheduleOverrides
      ?.filter((item) => Number(item.day) === weekday)
      .map((item) => ({
        ...item,
        validFrom: normalizeOverrideValidFrom(item.validFrom),
        useBase: Boolean(item.useBase),
      }))
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] ?? null;

  if (override) {
    if (override.useBase) {
      return {
        scheduleRange: barber.scheduleRange ?? null,
        scheduleRanges: normalizeScheduleRanges(barber.scheduleRanges),
      };
    }

    const scheduleRanges = normalizeScheduleRanges(override.scheduleRanges);
    return {
      scheduleRange: scheduleRanges.length
        ? null
        : (override.scheduleRange ?? null),
      scheduleRanges,
    };
  }

  return {
    scheduleRange: barber.scheduleRange ?? null,
    scheduleRanges: normalizeScheduleRanges(barber.scheduleRanges),
  };
};

function BookingForm({ shopSlug, onNotFound }) {
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
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [email, setEmail] = useState(""); // <-- AGREGAR ESTO
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedBarberSchedule, setSelectedBarberSchedule] = useState(null);
  const [paymentResultMessage, setPaymentResultMessage] = useState("");
  const [shopUnavailable, setShopUnavailable] = useState(false);
  const [closedDayNotice, setClosedDayNotice] = useState("");

  const currentDuration =
    selectedService?.durationMinutes ?? SLOT_INTERVAL_MINUTES;

  // 2. USEMEMO
  const selectedBarberData = useMemo(
    () => barbers.find((b) => b._id === selectedBarber) ?? null,
    [barbers, selectedBarber],
  );

  const paymentOptions = useMemo(
    () => getPublicPaymentOptions(shopInfo),
    [shopInfo],
  );

  const resolvedBarberSchedule = useMemo(
    () =>
      selectedBarberSchedule ||
      resolveBarberScheduleForDate(selectedBarberData, selectedDate),
    [selectedBarberData, selectedDate, selectedBarberSchedule],
  );

  const horarioGroups = useMemo(() => {
    const workDays = selectedBarberData?.workDays || [0, 1, 2, 3, 4, 5, 6];
    const currentDayOfWeek = selectedDate.getDay();
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
    const ranges = resolvedBarberSchedule.scheduleRanges;
    if (ranges && ranges.length > 0) {
      return ranges.map((r) => ({
        label: r.label,
        slots: buildSlots(r.start, r.end),
      }));
    }

    // Horario corrido
    const range = resolvedBarberSchedule.scheduleRange;
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
  }, [
    currentDuration,
    resolvedBarberSchedule,
    selectedBarberData,
    selectedDate,
  ]);

  // Lista plana para isSlotDisabled
  const allSlots = useMemo(
    () => horarioGroups.flatMap((g) => g.slots),
    [horarioGroups],
  );

  const formattedDate = useMemo(
    () => formatBookingDateLabel(selectedDate),
    [selectedDate],
  );

  const desktopBannerSrc =
    shopInfo?.themeConfig?.bannerDataUrl || DEFAULT_BOOKING_BANNER;
  const mobileBannerSrc =
    shopInfo?.themeConfig?.mobileBannerDataUrl ||
    shopInfo?.themeConfig?.bannerDataUrl ||
    DEFAULT_BOOKING_BANNER;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment_result");

    if (!paymentResult) return;

    if (paymentResult === "success") {
      setPaymentResultMessage("Pago aprobado. Tu turno ya quedó reservado.");
    } else if (paymentResult === "pending") {
      setPaymentResultMessage(
        "Tu pago quedó pendiente. Apenas se confirme, tu reserva se actualizará.",
      );
    } else if (paymentResult === "failure") {
      setPaymentResultMessage(
        "El pago no se completó. Si querés, podés intentar otra vez.",
      );
    }

    params.delete("payment_result");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  // 3. TODOS LOS USEEFFECT
  useEffect(() => {
    if (!selectedSlot) return;
    if (!allSlots.includes(selectedSlot)) setSelectedSlot(null);
  }, [allSlots, selectedSlot]);

  useEffect(() => {
    if (!paymentOptions.length) return;
    const currentOption = paymentOptions.find(
      (item) => item.value === paymentMethod,
    );
    if (!currentOption) {
      setPaymentMethod(paymentOptions[0].value);
    }
  }, [paymentMethod, paymentOptions]);

  useEffect(() => {
    if (!slugReady || shopUnavailable) return;
    (async () => {
      try {
        const res = await fetchShopInfo();
        setShopInfo(res?.shop ?? null);
      } catch (err) {
        console.error(err);
        if (err?.status === 404) {
          setShopUnavailable(true);
          onNotFound?.();
        }
      } finally {
        setShopLoading(false);
      }
    })();
  }, [onNotFound, shopUnavailable, slugReady]);

  useEffect(() => {
    if (!slugReady || shopUnavailable) return;
    (async () => {
      try {
        const res = await fetchServices();
        const list = res?.services ?? [];
        setServices(list);
        setSelectedService(list[0] ?? null);
      } catch (err) {
        console.error("Error servicios:", err?.message, err?.status);
        if (err?.status === 404) {
          setShopUnavailable(true);
          onNotFound?.();
        }
      } finally {
      }
    })();
  }, [onNotFound, shopUnavailable, slugReady]);

  useEffect(() => {
    if (!slugReady || shopUnavailable) return;
    (async () => {
      try {
        const res = await fetchBarbers();
        const list = res.barbers || [];
        setBarbers(list);
        if (list.length > 0) setSelectedBarber(list[0]._id);
      } catch (err) {
        console.error("Error barberos:", err.message, err.status);
        if (err?.status === 404) {
          setShopUnavailable(true);
          onNotFound?.();
        }
      } finally {
        setLoadingBarbers(false);
      }
    })();
  }, [onNotFound, shopUnavailable, slugReady]);

  const loadSlots = useCallback(async () => {
    if (!selectedBarber || !slugReady || shopUnavailable) return;
    try {
      setLoadingSlots(true);
      const res = await fetchBarberAppointments(
        selectedBarber,
        formatDateParam(selectedDate),
      );
      if (res?.shopClosure?.isClosed) {
        setClosedDayNotice(
          res.shopClosure.message ||
            "Este día el local permanecerá cerrado. Elegí otro turno disponible.",
        );
      } else if (res?.barberClosure?.isClosed) {
        setClosedDayNotice(
          res.barberClosure.message ||
            "Este barbero no atenderá ese día. Elegí otro profesional o seleccioná otra fecha.",
        );
      } else {
        setClosedDayNotice("");
      }
      const busy = new Set();
      if (res?.appointments) {
        res.appointments.forEach((app) => {
          if (app.status === "cancelled") return;
          const startLabel = formatTimeInShopTZ(app.startTime);
          const [baseHour, baseMinute] = startLabel.split(":").map(Number);
          const startMinutes = baseHour * 60 + baseMinute;
          const occupiedDuration = app.durationMinutes ?? SLOT_INTERVAL_MINUTES;
          for (let o = 0; o < occupiedDuration; o += SLOT_INTERVAL_MINUTES) {
            busy.add(minutesToLabel(startMinutes + o));
          }
        });
      }
      if (res?.resolvedSchedule) {
        setSelectedBarberSchedule({
          scheduleRange: res.resolvedSchedule.scheduleRange ?? null,
          scheduleRanges: normalizeScheduleRanges(
            res.resolvedSchedule.scheduleRanges,
          ),
        });
      } else {
        setSelectedBarberSchedule(null);
      }
      setOccupiedSlots(busy);
    } catch (err) {
      console.error("Error ocupación:", err);
      if (err?.status === 404) {
        setShopUnavailable(true);
        onNotFound?.();
      }
    } finally {
      setLoadingSlots(false);
    }
  }, [onNotFound, selectedBarber, selectedDate, shopUnavailable, slugReady]);

  useEffect(() => {
    if (!selectedBarber) {
      setSelectedBarberSchedule(null);
      setClosedDayNotice("");
    }
  }, [selectedBarber]);

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

      const response = await createAppointment({
        barberId: selectedBarber,
        customerName: customerName.trim(),
        service: serviceName,
        startTime: finalDateUTC,
        durationMinutes: currentDuration,
        servicePrice: selectedService?.price ?? 0,
        notes: phone.trim(),
        email: email.trim(),
        paymentMethod,
      });

      if (
        response?.payment?.requiresRedirect &&
        response?.payment?.checkoutUrl
      ) {
        window.location.assign(response.payment.checkoutUrl);
        return;
      }

      if (paymentMethod === "transfer") {
        throw new Error(
          "La reserva se creó, pero Mercado Pago no devolvió un link de pago. Revisá la configuración del checkout y volvé a intentar.",
        );
      }

      // --- MENSAJE PERSONALIZADO ---
      if (isDev) {
        alert(
          "🛠️ [TEST EXITOSO]: Turno creado en Localhost. No te preocupes por el mail real ahora.",
        );
      } else {
        alert(
          "¡Listo! Tu turno fue reservado. Revisá tu email para ver los detalles de la confirmación.",
        );
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
      {paymentResultMessage ? (
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto 18px",
            background: "rgba(255, 20, 147, 0.12)",
            border: "1px solid rgba(255, 20, 147, 0.28)",
            color: "#FFD6EC",
            padding: "14px 16px",
            borderRadius: 18,
            fontWeight: 600,
          }}
        >
          {paymentResultMessage}
        </div>
      ) : null}

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
                      {service.durationMinutes} min ·{" "}
                      {formatPrice(service.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className={style.nav}>
        <div className={style.navLogo}>
          <span className={style.navLogoScissors}>
            <img src="" alt="" />
          </span>
          <span className={style.navLogoText}>BarberAppByCodex</span>
        </div>
        <a
          href="https://www.letsbuilditcodex.com/"
          target="_blank"
          rel="noreferrer"
        >
          <span className={style.navBadge}>by CODEX®</span>
        </a>
      </nav>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardHero}>
          <div className={styles.shopHeroText}>
            <p className={styles.shopHeroEyebrow}>Reservá tu turno en</p>
            <h2 className={styles.shopHeroName}>
              {shopLoading
                ? "Cargando barbería..."
                : shopInfo?.name || "Barbería"}
            </h2>
            <p className={styles.shopHeroSubtitle}>
              Elegí servicio, horario y forma de pago para confirmar tu visita.
            </p>
          </div>
          <div className={styles.shopHeroMedia}>
            <picture>
              <source media="(max-width: 768px)" srcSet={mobileBannerSrc} />
              <img
                className={styles.shopHeroBanner}
                src={desktopBannerSrc}
                alt=""
                aria-hidden="true"
              />
            </picture>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Servicio deseado</label>
          <button
            type="button"
            className={styles.selector}
            onClick={() => setServicePickerOpen(true)}
          >
            <div>
              <span className={styles.selectorMainText}>
                {selectedService?.name || "Seleccionar servicio"}
              </span>
              <span className={styles.selectorSubText}>
                {currentDuration} minutos ·{" "}
                {selectedService ? formatPrice(selectedService.price) : "..."}
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
              onChange={(e) =>
                setPhone(e.target.value.replace(/[^0-9+\s-]/g, ""))
              }
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

        {paymentOptions.length ? (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>¿Cómo preferís pagar?</label>
            <div className={styles.paymentMethodRow}>
              {paymentOptions.map((option) => (
                <div className={style.containerMetodo}>
                  <button
                    type="button"
                    key={option.value}
                    className={`${styles.paymentMethodChip} ${paymentMethod === option.value ? styles.paymentMethodChipActive : ""}`}
                    onClick={() => setPaymentMethod(option.value)}
                  >
                    <span className={styles.paymentMethodChipTitle}>
                      {option.label}
                    </span>
                  </button>
                  <div className={styles.paymentMethodChipHelper}>
                    <img
                      className={styles.infoicon}
                      src="/infoicon.png"
                      alt="info"
                    />
                    {option.helper}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

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
                    {b.photoUrl ? (
                      <img
                        src={b.photoUrl}
                        alt={b.fullName}
                        className={styles.barberAvatarImage}
                      />
                    ) : (
                      b.fullName.charAt(0)
                    )}
                  </div>
                  <div className={styles.barberInfo}>
                    <span className={styles.barberName}>
                      {b.fullName.split(" ")[0]}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.scheduleHeader}>
            <label className={`${styles.label} ${styles.scheduleHeaderLabel}`}>
              Horarios
              <br />
              disponibles
            </label>
            <div className={styles.dateSelector}>
              <button
                type="button"
                onClick={() => handleDateShift(-1)}
                className={styles.dateBtn}
              >
                ‹
              </button>
              <span className={styles.dateText}>{formattedDate}</span>
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
            ) : closedDayNotice ? (
              <div className={styles.noScheduleMessage}>
                <p>
                  <strong>No disponible este día</strong>
                </p>
                <p>{closedDayNotice}</p>
                <p className={styles.subtitleError}>
                  Elegí otra fecha para reservar tu turno.
                </p>
              </div>
            ) : horarioGroups.length === 0 ? (
              <div className={styles.noScheduleMessage}>
                <p>
                  🚫 Este barbero no atiende los días <br />
                  <strong>{formattedDate}</strong>
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
          disabled={saving || !selectedSlot || Boolean(closedDayNotice)}
        >
          {saving ? "Procesando..." : "Confirmar Reserva"}
        </button>
        {paymentMethod === "transfer" ? (
          <p className={styles.submitHint}>
            Al confirmar te vamos a redirigir a Mercado Pago para completar el
            pago.
          </p>
        ) : null}
      </form>
    </section>
  );
}

export default BookingForm;
