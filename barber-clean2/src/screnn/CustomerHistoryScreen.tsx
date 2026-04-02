import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  ChevronDown,
  CreditCard,
  Filter,
  Scissors,
  Search,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';
import {
  CustomerHistoryResponse,
  ServiceOption,
  fetchCustomerHistory,
  fetchServices,
} from '../services/api';

type Props = {
  navigation: any;
};

type PickerType = 'barber' | 'service' | 'month' | null;

type PickerOption = {
  key: string;
  label: string;
};

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const TABLE_COLUMNS = [
  { key: 'date', label: 'Fecha', width: 140 },
  { key: 'customer', label: 'Cliente', width: 150 },
  { key: 'barber', label: 'Barbero', width: 120 },
  { key: 'service', label: 'Servicio', width: 170 },
  { key: 'phone', label: 'Teléfono', width: 135 },
  { key: 'payment', label: 'Pago', width: 120 },
  { key: 'price', label: 'Precio', width: 110 },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Cordoba',
  }).format(new Date(value));

const formatMonthYear = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Cordoba',
  }).format(new Date(value));

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(
    sanitized.length === 3 ? sanitized.repeat(2) : sanitized,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hexToPdfRgb = (hex: string) => {
  const sanitized = hex.replace('#', '');
  const normalized = sanitized.length === 3 ? sanitized.repeat(2) : sanitized;
  const bigint = parseInt(normalized, 16);
  return rgb(
    ((bigint >> 16) & 255) / 255,
    ((bigint >> 8) & 255) / 255,
    (bigint & 255) / 255,
  );
};

const sanitizeFilePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const getPaymentLabel = (value: 'all' | 'cash' | 'transfer') => {
  if (value === 'cash') return 'Efectivo';
  if (value === 'transfer') return 'Transferencia';
  return 'Todos';
};

const getPaymentMethodLabel = (value: string) =>
  value === 'transfer' ? 'Transferencia' : 'Efectivo';

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2],
  };
};

const sanitizePdfText = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/[\u202f\u00a0]/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

function CustomerHistoryScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const now = useMemo(() => new Date(), []);

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<CustomerHistoryResponse | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<
    'all' | 'cash' | 'transfer'
  >('all');
  const [selectedBarber, setSelectedBarber] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [activePicker, setActivePicker] = useState<PickerType>(null);

  const monthOptions = useMemo<PickerOption[]>(
    () =>
      MONTH_LABELS.map((label, index) => ({
        key: String(index + 1),
        label: `${label} ${now.getFullYear()}`,
      })),
    [now],
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        const [historyResponse, servicesResponse] = await Promise.all([
          fetchCustomerHistory({
            year: now.getFullYear(),
            month: selectedMonth,
            paymentMethod: paymentFilter === 'all' ? undefined : paymentFilter,
          }),
          fetchServices(),
        ]);
        setData(historyResponse);
        setServices(servicesResponse?.services ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [now, paymentFilter, selectedMonth],
  );

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData]),
  );

  const barberOptions = useMemo<PickerOption[]>(() => {
    const names = (data?.items ?? []).map(item => item.barberName).filter(Boolean);
    return [
      { key: 'all', label: 'Todos los barberos' },
      ...Array.from(new Set(names)).map(name => ({
        key: name,
        label: name,
      })),
    ];
  }, [data]);

  const serviceOptions = useMemo<PickerOption[]>(() => {
    const apiServices = services.map(item => item.name).filter(Boolean);
    const historyServices = (data?.items ?? []).map(item => item.service).filter(Boolean);
    return [
      { key: 'all', label: 'Todos los servicios' },
      ...Array.from(new Set([...apiServices, ...historyServices])).map(name => ({
        key: name,
        label: name,
      })),
    ];
  }, [data, services]);

  const search = searchInput.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return (data?.items ?? []).filter(item => {
      const matchesBarber =
        selectedBarber === 'all' || item.barberName === selectedBarber;
      const matchesService =
        selectedService === 'all' || item.service === selectedService;
      const matchesSearch =
        !search ||
        item.customerName.toLowerCase().includes(search) ||
        item.barberName.toLowerCase().includes(search) ||
        item.service.toLowerCase().includes(search) ||
        String(item.phone || '')
          .toLowerCase()
          .includes(search);

      return matchesBarber && matchesService && matchesSearch;
    });
  }, [data, search, selectedBarber, selectedService]);

  const sortedItems = useMemo(
    () =>
      [...filteredItems].sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ),
    [filteredItems],
  );

  const summary = useMemo(() => {
    const totalRevenue = filteredItems.reduce(
      (acc, item) => acc + Number(item.price || 0),
      0,
    );
    const uniqueClients = new Set(
      filteredItems.map(item => `${item.customerName}|${item.phone || ''}`.toLowerCase()),
    ).size;

    return {
      servicesCount: filteredItems.length,
      uniqueClients,
      totalRevenue,
      cashRevenue: filteredItems
        .filter(item => item.paymentMethod === 'cash')
        .reduce((acc, item) => acc + Number(item.price || 0), 0),
      transferRevenue: filteredItems
        .filter(item => item.paymentMethod === 'transfer')
        .reduce((acc, item) => acc + Number(item.price || 0), 0),
      cashCount: filteredItems.filter(item => item.paymentMethod === 'cash').length,
      transferCount: filteredItems.filter(item => item.paymentMethod === 'transfer')
        .length,
    };
  }, [filteredItems]);

  const activeContextLabel = useMemo(() => {
    if (selectedBarber !== 'all') return `Barbero: ${selectedBarber}`;
    if (selectedService !== 'all') return `Servicio: ${selectedService}`;
    return 'Vista general';
  }, [selectedBarber, selectedService]);

  const hasActiveFilters =
    paymentFilter !== 'all' ||
    selectedBarber !== 'all' ||
    selectedService !== 'all' ||
    Boolean(searchInput.trim());

  const pickerOptions = useMemo(() => {
    if (activePicker === 'barber') return barberOptions;
    if (activePicker === 'service') return serviceOptions;
    if (activePicker === 'month') return monthOptions;
    return [];
  }, [activePicker, barberOptions, monthOptions, serviceOptions]);

  const pickerTitle = useMemo(() => {
    if (activePicker === 'barber') return 'Elegí un barbero';
    if (activePicker === 'service') return 'Elegí un servicio';
    if (activePicker === 'month') return 'Elegí un mes';
    return '';
  }, [activePicker]);

  const selectedBarberLabel =
    barberOptions.find(item => item.key === selectedBarber)?.label ??
    'Todos los barberos';
  const selectedServiceLabel =
    serviceOptions.find(item => item.key === selectedService)?.label ??
    'Todos los servicios';
  const selectedMonthLabel =
    monthOptions.find(item => Number(item.key) === selectedMonth)?.label ??
    `${MONTH_LABELS[selectedMonth - 1]} ${now.getFullYear()}`;

  const handleSelectOption = (option: PickerOption) => {
    if (activePicker === 'barber') {
      setSelectedBarber(option.key);
    } else if (activePicker === 'service') {
      setSelectedService(option.key);
    } else if (activePicker === 'month') {
      setSelectedMonth(Number(option.key));
    }
    setActivePicker(null);
  };

  const clearAllFilters = () => {
    setPaymentFilter('all');
    setSelectedBarber('all');
    setSelectedService('all');
    setSearchInput('');
  };

  const handleExportExcel = async () => {
    const header = [
      'Fecha y hora',
      'Cliente',
      'Barbero',
      'Servicio',
      'Telefono',
      'Metodo de pago',
      'Monto',
    ];
    const rows = sortedItems.map(item => [
      formatDateTime(item.startTime),
      item.customerName,
      item.barberName,
      item.service,
      item.phone || '',
      getPaymentMethodLabel(item.paymentMethod),
      Number(item.price ?? 0),
    ]);

    try {
      const fileDate = `${now.getFullYear()}-${String(selectedMonth).padStart(2, '0')}`;
      const safeContext = sanitizeFilePart(activeContextLabel);
      const fileName = `historial-${fileDate}${safeContext ? `-${safeContext}` : ''}.xlsx`;
      const basePath =
        RNFS.TemporaryDirectoryPath || RNFS.CachesDirectoryPath;
      const filePath = `${basePath}/${fileName}`;

      const summarySheetData = [
        ['Historial de clientes'],
        ['Periodo', selectedMonthLabel],
        ['Vista', activeContextLabel],
        ['Pago', getPaymentLabel(paymentFilter)],
        ['Busqueda', searchInput.trim() || 'Sin filtro'],
        [],
        ['Servicios', summary.servicesCount],
        ['Clientes únicos', summary.uniqueClients],
        ['Ingresos totales', summary.totalRevenue],
        ['Ingresos efectivo', summary.cashRevenue],
        ['Ingresos transferencia', summary.transferRevenue],
        ['Cobros efectivo', summary.cashCount],
        ['Cobros transferencia', summary.transferCount],
      ];

      const detailSheetData = [
        ['Historial filtrado'],
        ['Periodo', selectedMonthLabel],
        ['Vista', activeContextLabel],
        [],
        header,
        ...rows,
        [],
        ['Totales', '', '', '', '', 'Cantidad', summary.servicesCount],
        ['Ingresos', '', '', '', '', 'Monto total', summary.totalRevenue],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
      const worksheet = XLSX.utils.aoa_to_sheet(detailSheetData);

      summarySheet['!cols'] = [
        { wch: 24 },
        { wch: 24 },
      ];

      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 24 },
        { wch: 20 },
        { wch: 26 },
        { wch: 18 },
        { wch: 16 },
        { wch: 14 },
      ];
      worksheet['!rows'] = [
        { hpt: 24 },
        { hpt: 20 },
        { hpt: 20 },
        { hpt: 10 },
        { hpt: 22 },
      ];
      worksheet['!autofilter'] = {
        ref: `A5:G${Math.max(5, rows.length + 5)}`,
      };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial');
      const workbookBase64 = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
      });

      await RNFS.writeFile(filePath, workbookBase64, 'base64');

      await Share.share({
        title: fileName,
        url: `file://${filePath}`,
        message: Platform.OS === 'android' ? `Historial exportado: ${fileName}` : undefined,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPdf = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 842;
      const pageHeight = 595;
      const margin = 28;
      const rowHeight = 24;
      const headerRowHeight = 26;
      const tableStartX = margin;
      const columnWidths = [118, 112, 92, 150, 108, 104, 74];
      const cardGap = 12;
      const cardWidth = (pageWidth - margin * 2 - cardGap * 2) / 3;
      const primaryColor = hexToPdfRgb(theme.primary);
      const panelColor = rgb(0.07, 0.08, 0.1);
      const panelAltColor = rgb(0.09, 0.1, 0.13);
      const textColor = rgb(0.96, 0.97, 0.98);
      const mutedColor = rgb(0.68, 0.71, 0.78);
      const borderColor = rgb(0.16, 0.17, 0.21);
      const cashBg = rgb(0.08, 0.18, 0.11);
      const transferBg = rgb(0.11, 0.08, 0.19);
      const cashText = rgb(0.55, 0.9, 0.63);
      const priceColor = rgb(0.97, 0.63, 0.28);
      const paymentLabel = getPaymentLabel(paymentFilter);
      const themeCardColor = hexToPdfRgb(theme.card);
      const themeSecondaryColor = hexToPdfRgb(theme.secondary);

      let embeddedLogo:
        | Awaited<ReturnType<PDFDocument['embedPng']>>
        | Awaited<ReturnType<PDFDocument['embedJpg']>>
        | null = null;

      const tryEmbedLogo = async () => {
        try {
          if (
            theme.logo &&
            typeof theme.logo === 'object' &&
            'uri' in theme.logo &&
            typeof theme.logo.uri === 'string'
          ) {
            const parsed = parseDataUrl(theme.logo.uri);
            if (parsed) {
              embeddedLogo = parsed.mimeType.includes('png')
                ? await pdfDoc.embedPng(parsed.base64)
                : await pdfDoc.embedJpg(parsed.base64);
              return;
            }
          }

          const resolvedAsset = Image.resolveAssetSource(theme.logo);
          const assetUri = resolvedAsset?.uri;
          if (!assetUri) return;

          const response = await fetch(assetUri);
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const lowerUri = assetUri.toLowerCase();

          if (lowerUri.includes('.png')) {
            embeddedLogo = await pdfDoc.embedPng(bytes);
            return;
          }

          if (
            lowerUri.includes('.jpg') ||
            lowerUri.includes('.jpeg') ||
            lowerUri.includes('image/jpeg')
          ) {
            embeddedLogo = await pdfDoc.embedJpg(bytes);
          }
        } catch (_error) {}
      };

      await tryEmbedLogo();

      const drawPageFrame = (page: any) => {
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: rgb(0.03, 0.03, 0.05),
        });

        page.drawRectangle({
          x: margin,
          y: pageHeight - 68,
          width: pageWidth - margin * 2,
          height: 2,
          color: primaryColor,
        });

        page.drawText(sanitizePdfText('HISTORIAL'), {
          x: margin,
          y: pageHeight - 42,
          size: 18,
          font: fontBold,
          color: primaryColor,
        });

        page.drawText(sanitizePdfText('Servicios y ventas registradas'), {
          x: margin,
          y: pageHeight - 58,
          size: 10,
          font: fontRegular,
          color: mutedColor,
        });

        page.drawText(sanitizePdfText(selectedMonthLabel), {
          x: pageWidth - margin - 120,
          y: pageHeight - 42,
          size: 11,
          font: fontBold,
          color: themeSecondaryColor,
        });

        if (embeddedLogo) {
          const maxWidth = 44;
          const maxHeight = 44;
          const scale = Math.min(
            maxWidth / embeddedLogo.width,
            maxHeight / embeddedLogo.height,
          );
          const width = embeddedLogo.width * scale;
          const height = embeddedLogo.height * scale;

          page.drawRectangle({
            x: pageWidth - margin - 60,
            y: pageHeight - 60,
            width: 52,
            height: 52,
            color: panelColor,
            borderColor: primaryColor,
            borderWidth: 1,
          });

          page.drawImage(embeddedLogo, {
            x: pageWidth - margin - 56 + (44 - width) / 2,
            y: pageHeight - 56 + (44 - height) / 2,
            width,
            height,
          });
        }
      };

      const drawSummaryCard = (
        page: any,
        x: number,
        y: number,
        title: string,
        value: string,
      ) => {
        page.drawRectangle({
          x,
          y,
          width: cardWidth,
          height: 58,
          color: themeCardColor,
          borderColor: primaryColor,
          borderWidth: 1,
        });

        page.drawText(sanitizePdfText(title.toUpperCase()), {
          x: x + 12,
          y: y + 40,
          size: 8,
          font: fontBold,
          color: mutedColor,
        });

        page.drawText(sanitizePdfText(value), {
          x: x + 12,
          y: y + 16,
          size: 17,
          font: fontBold,
          color: textColor,
        });
      };

      const drawFiltersBar = (page: any, y: number) => {
        page.drawRectangle({
          x: margin,
          y,
          width: pageWidth - margin * 2,
          height: 54,
          color: themeCardColor,
          borderColor: primaryColor,
          borderWidth: 1,
        });

        const sections = [
          ['Barbero', selectedBarberLabel],
          ['Servicio', selectedServiceLabel],
          ['Buscar', searchInput.trim() || 'Sin filtro'],
          ['Pago', paymentLabel],
        ];

        const sectionWidth = (pageWidth - margin * 2 - 24) / sections.length;
        sections.forEach(([label, value], index) => {
          const sectionX = margin + 12 + sectionWidth * index;
          page.drawText(sanitizePdfText(label.toUpperCase()), {
            x: sectionX,
            y: y + 36,
            size: 7,
            font: fontBold,
            color: mutedColor,
          });
          page.drawText(sanitizePdfText(value), {
            x: sectionX,
            y: y + 16,
            size: 10,
            font: fontRegular,
            color: textColor,
            maxWidth: sectionWidth - 12,
          });
        });
      };

      const drawTableHeader = (page: any, y: number) => {
        page.drawRectangle({
          x: tableStartX,
          y,
          width: columnWidths.reduce((acc, width) => acc + width, 0),
          height: headerRowHeight,
          color: panelAltColor,
          borderColor,
          borderWidth: 1,
        });

        let currentX = tableStartX;
        TABLE_COLUMNS.forEach((column, index) => {
          page.drawText(sanitizePdfText(column.label.toUpperCase()), {
            x: currentX + 8,
            y: y + 8,
            size: 7,
            font: fontBold,
            color: mutedColor,
          });
          currentX += columnWidths[index];
        });
      };

      const drawPaymentBadge = (
        page: any,
        x: number,
        y: number,
        method: string,
      ) => {
        const isTransfer = method === 'transfer';
        const badgeWidth = isTransfer ? 76 : 50;
        page.drawRectangle({
          x,
          y,
          width: badgeWidth,
          height: 14,
          color: isTransfer ? transferBg : cashBg,
          borderColor: isTransfer ? primaryColor : cashText,
          borderWidth: 0.6,
        });
        page.drawText(sanitizePdfText(getPaymentMethodLabel(method)), {
          x: x + 6,
          y: y + 4,
          size: 7,
          font: fontBold,
          color: isTransfer ? primaryColor : cashText,
        });
      };

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let cursorY = pageHeight - 118;
      let pageNumber = 1;

      drawPageFrame(page);
      drawSummaryCard(page, margin, cursorY, 'Servicios', String(summary.servicesCount));
      drawSummaryCard(
        page,
        margin + cardWidth + cardGap,
        cursorY,
        'Clientes únicos',
        String(summary.uniqueClients),
      );
      drawSummaryCard(
        page,
        margin + (cardWidth + cardGap) * 2,
        cursorY,
        'Ingresos',
        formatCurrency(summary.totalRevenue),
      );

      cursorY -= 74;
      drawFiltersBar(page, cursorY);
      cursorY -= 42;
      drawTableHeader(page, cursorY);
      cursorY -= rowHeight;

      if (!sortedItems.length) {
        page.drawText(
          sanitizePdfText('No hay resultados para exportar con el filtro actual.'),
          {
          x: margin,
          y: cursorY,
          size: 11,
          font: fontRegular,
          color: mutedColor,
          },
        );
      }

      sortedItems.forEach((item, index) => {
        if (cursorY < 72) {
          page.drawText(sanitizePdfText(`Página ${pageNumber}`), {
            x: pageWidth - margin - 42,
            y: 24,
            size: 9,
            font: fontRegular,
            color: mutedColor,
          });
          pageNumber += 1;
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          drawPageFrame(page);
          cursorY = pageHeight - 92;
          drawTableHeader(page, cursorY);
          cursorY -= rowHeight;
        }

        page.drawRectangle({
          x: tableStartX,
          y: cursorY,
          width: columnWidths.reduce((acc, width) => acc + width, 0),
          height: rowHeight,
          color: index % 2 === 0 ? panelColor : panelAltColor,
          borderColor,
          borderWidth: 0.4,
        });

        const values = [
          formatDateTime(item.startTime),
          item.customerName,
          item.barberName,
          item.service,
          item.phone || 'Sin teléfono',
        ];

        let currentX = tableStartX;
        values.forEach((value, valueIndex) => {
          page.drawText(sanitizePdfText(value), {
            x: currentX + 8,
            y: cursorY + 8,
            size: 8,
            font: valueIndex === 1 ? fontBold : fontRegular,
            color: textColor,
            maxWidth: columnWidths[valueIndex] - 12,
          });
          currentX += columnWidths[valueIndex];
        });

        drawPaymentBadge(page, currentX + 8, cursorY + 5, item.paymentMethod);
        currentX += columnWidths[5];

        page.drawText(sanitizePdfText(formatCurrency(item.price)), {
          x: currentX + 8,
          y: cursorY + 8,
          size: 8,
          font: fontBold,
          color: priceColor,
          maxWidth: columnWidths[6] - 10,
        });

        cursorY -= rowHeight;
      });

      page.drawText(sanitizePdfText(`Página ${pageNumber}`), {
        x: pageWidth - margin - 42,
        y: 24,
        size: 9,
        font: fontRegular,
        color: mutedColor,
      });

      const fileDate = `${now.getFullYear()}-${String(selectedMonth).padStart(2, '0')}`;
      const safeContext = sanitizeFilePart(activeContextLabel);
      const fileName = `historial-${fileDate}${safeContext ? `-${safeContext}` : ''}.pdf`;
      const basePath =
        RNFS.TemporaryDirectoryPath || RNFS.CachesDirectoryPath;
      const filePath = `${basePath}/${fileName}`;
      const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });

      await RNFS.writeFile(filePath, pdfBase64, 'base64');

      await Share.share({
        title: fileName,
        url: `file://${filePath}`,
        message:
          Platform.OS === 'android' ? `Historial exportado: ${fileName}` : undefined,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
       

          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>HISTORIAL</Text>
            <Text style={styles.headerTitle}>Servicios y ventas</Text>
            <Text style={styles.headerSubtitle}>
              Accedé al historial completo de servicios y cobros del local.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData(true);
            }}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.summaryRow}>
          <SummaryCard
            styles={styles}
            icon={<Scissors size={15} color={theme.primary} />}
            value={String(summary.servicesCount)}
            label="Servicios"
          />
          <SummaryCard
            styles={styles}
            icon={<Users size={15} color={theme.primary} />}
            value={String(summary.uniqueClients)}
            label="Clientes"
          />
          <SummaryCard
            styles={styles}
            icon={<Banknote size={15} color={theme.primary} />}
            value={formatCurrency(summary.totalRevenue)}
            label="Ingresos"
            compact
          />
        </View>

        <View style={styles.paymentBreakdownRow}>
          <View style={styles.paymentBreakdownCard}>
            <View style={styles.paymentBreakdownTop}>
              <Banknote size={14} color={theme.primary} />
              <Text style={styles.paymentBreakdownLabel}>Efectivo</Text>
            </View>
            <Text style={styles.paymentBreakdownValue}>
              {formatCurrency(summary.cashRevenue)}
            </Text>
            <Text style={styles.paymentBreakdownMeta}>
              {summary.cashCount} cobros
            </Text>
          </View>

          <View style={styles.paymentBreakdownCard}>
            <View style={styles.paymentBreakdownTop}>
              <CreditCard size={14} color={theme.primary} />
              <Text style={styles.paymentBreakdownLabel}>Transferencia</Text>
            </View>
            <Text style={styles.paymentBreakdownValue}>
              {formatCurrency(summary.transferRevenue)}
            </Text>
            <Text style={styles.paymentBreakdownMeta}>
              {summary.transferCount} cobros
            </Text>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.filtersCardHeader}>
            <View>
              <Text style={styles.filtersTitle}>Filtros</Text>
              <Text style={styles.filtersSubtitle}>{activeContextLabel}</Text>
            </View>

            {hasActiveFilters ? (
              <Pressable style={styles.clearButton} onPress={clearAllFilters}>
                <X size={13} color="#C8CFDA" />
                <Text style={styles.clearButtonText}>Limpiar</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.searchFieldWrap}>
            <Search size={16} color="#666" />
            <TextInput
              placeholder="Cliente, teléfono, barbero o servicio"
              placeholderTextColor="#555"
              style={styles.searchField}
              value={searchInput}
              onChangeText={setSearchInput}
            />
            {searchInput.trim() ? (
              <Pressable
                style={styles.inlineClearBtn}
                onPress={() => setSearchInput('')}
              >
                <X size={12} color="#999" />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.controlsGrid}>
            <SelectControl
              label="Barbero"
              value={selectedBarberLabel}
              onPress={() => setActivePicker('barber')}
              styles={styles}
            />
            <SelectControl
              label="Servicio"
              value={selectedServiceLabel}
              onPress={() => setActivePicker('service')}
              styles={styles}
            />
            <SelectControl
              label="Mes"
              value={selectedMonthLabel}
              onPress={() => setActivePicker('month')}
              styles={styles}
              fullWidth
            />
          </View>

          <View style={styles.paymentRow}>
            <PaymentFilterButton
              label="Todos"
              active={paymentFilter === 'all'}
              onPress={() => setPaymentFilter('all')}
              styles={styles}
            />
            <PaymentFilterButton
              label="Efectivo"
              active={paymentFilter === 'cash'}
              icon={<Banknote size={14} color={paymentFilter === 'cash' ? '#08110B' : theme.primary} />}
              onPress={() =>
                setPaymentFilter(current => (current === 'cash' ? 'all' : 'cash'))
              }
              styles={styles}
              cash
            />
            <PaymentFilterButton
              label="Transferencia"
              active={paymentFilter === 'transfer'}
              icon={<CreditCard size={14} color={paymentFilter === 'transfer' ? '#08110B' : theme.primary} />}
              onPress={() =>
                setPaymentFilter(current =>
                  current === 'transfer' ? 'all' : 'transfer',
                )
              }
              styles={styles}
              transfer
            />
          </View>
        </View>

        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsTitle}>Registro del período</Text>
            <Text style={styles.resultsSubtitle}>
              {filteredItems.length} servicios encontrados
            </Text>
          </View>
          <View style={styles.resultsHeaderActions}>
            <View style={styles.exportButtonsRow}>
              <Pressable
                style={[styles.exportButton, styles.exportButtonGhost]}
                onPress={handleExportPdf}
              >
                <Text style={styles.exportButtonText}>Exportar PDF</Text>
              </Pressable>
              <Pressable style={styles.exportButton} onPress={handleExportExcel}>
                <Text style={styles.exportButtonText}>Exportar Excel</Text>
              </Pressable>
            </View>
            <View style={styles.resultsBadge}>
              <Filter size={12} color={theme.primary} />
              <Text style={styles.resultsBadgeText}>{activeContextLabel}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 42 }} />
        ) : filteredItems.length ? (
          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeaderRow}>
                  {TABLE_COLUMNS.map(column => (
                    <View
                      key={column.key}
                      style={[styles.tableHeaderCell, { width: column.width }]}
                    >
                      <Text style={styles.tableHeaderText}>{column.label}</Text>
                    </View>
                  ))}
                </View>

                {filteredItems.map((item, index) => (
                  <View
                    key={item._id}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.tableRowAlt,
                    ]}
                  >
                    <TableCell styles={styles} width={140}>
                      {formatDateTime(item.startTime)}
                    </TableCell>
                    <TableCell styles={styles} width={150} emphasis>
                      {item.customerName}
                    </TableCell>
                    <TableCell styles={styles} width={120}>
                      {item.barberName}
                    </TableCell>
                    <TableCell styles={styles} width={170}>
                      {item.service}
                    </TableCell>
                    <TableCell styles={styles} width={135}>
                      {item.phone || 'Sin teléfono'}
                    </TableCell>
                    <View style={[styles.tableCell, { width: 120 }]}>
                      <View
                        style={[
                          styles.paymentBadge,
                          item.paymentMethod === 'transfer'
                            ? styles.paymentBadgeTransfer
                            : styles.paymentBadgeCash,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentBadgeText,
                            item.paymentMethod === 'transfer'
                              ? styles.paymentBadgeTextTransfer
                              : styles.paymentBadgeTextCash,
                          ]}
                        >
                          {item.paymentMethod === 'transfer'
                            ? 'Transferencia'
                            : 'Efectivo'}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.tableCell,
                        styles.tableCellPrice,
                        { width: 110 },
                      ]}
                    >
                      <Text style={styles.priceText}>
                        {formatCurrency(item.price)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No hay resultados con ese filtro</Text>
            <Text style={styles.emptyText}>
              Probá cambiar barbero, servicio, mes o búsqueda para volver al
              resultado general.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={activePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActivePicker(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => setActivePicker(null)}
              >
                <X size={16} color="#B9C0CE" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            >
              {pickerOptions.map(option => (
                <Pressable
                  key={option.key}
                  style={styles.modalOption}
                  onPress={() => handleSelectOption(option)}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SummaryCard({
  styles,
  icon,
  value,
  label,
  compact = false,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon: React.ReactNode;
  value: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIconWrap}>{icon}</View>
      <Text style={[styles.summaryValue, compact && styles.summaryValueCompact]}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SelectControl({
  label,
  value,
  onPress,
  styles,
  fullWidth = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      style={[styles.selectControl, fullWidth && styles.selectControlFull]}
      onPress={onPress}
    >
      <Text style={styles.selectLabel}>{label}</Text>
      <View style={styles.selectValueRow}>
        <Text style={styles.selectValue} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={15} color="#8E96A8" />
      </View>
    </Pressable>
  );
}

function PaymentFilterButton({
  label,
  active,
  onPress,
  styles,
  icon,
  cash = false,
  transfer = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  icon?: React.ReactNode;
  cash?: boolean;
  transfer?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.paymentButton,
        active && styles.paymentButtonActive,
        cash && active && styles.paymentButtonCash,
        transfer && active && styles.paymentButtonTransfer,
      ]}
      onPress={onPress}
    >
      {icon}
      <Text
        style={[
          styles.paymentButtonText,
          active && styles.paymentButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TableCell({
  styles,
  width,
  children,
  emphasis = false,
}: {
  styles: ReturnType<typeof makeStyles>;
  width: number;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <View style={[styles.tableCell, { width }]}>
      <Text
        style={[styles.tableCellText, emphasis && styles.tableCellTextStrong]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#08080D',
    },
    headerContainer: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 28,
      paddingBottom: 16,
      backgroundColor: '#08080D',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
 
    headerEyebrow: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.8,
      textTransform: 'uppercase',
    },
    headerTitle: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '900',
      marginTop: 4,
    },
    headerSubtitle: {
      color: '#fff',
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
      maxWidth: 280,
    },
    scrollBody: {
      paddingHorizontal: 20,
      paddingBottom: 120,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
      marginBottom: 16,
    },
    paymentBreakdownRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    paymentBreakdownCard: {
      flex: 1,
      backgroundColor: '#101115',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#1D1F28',
      padding: 14,
    },
    paymentBreakdownTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    paymentBreakdownLabel: {
      color: '#CBD2DE',
      fontSize: 12,
      fontWeight: '800',
    },
    paymentBreakdownValue: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
    },
    paymentBreakdownMeta: {
      color: '#70788A',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: '#101115',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#1D1F28',
      padding: 14,
      minHeight: 112,
    },
    summaryIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: hexToRgba(theme.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    summaryValue: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '900',
    },
    summaryValueCompact: {
      fontSize: 15,
      lineHeight: 19,
    },
    summaryLabel: {
      color: '#70788A',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 6,
    },
    filtersCard: {
      backgroundColor: '#101115',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: '#1D1F28',
      padding: 16,
      marginBottom: 18,
    },
    filtersCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    filtersTitle: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
    },
    filtersSubtitle: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: '#151821',
      borderWidth: 1,
      borderColor: '#232633',
    },
    clearButtonText: {
      color: '#C8CFDA',
      fontSize: 12,
      fontWeight: '800',
    },
    searchFieldWrap: {
      height: 50,
      borderRadius: 16,
      backgroundColor: '#0A0C11',
      borderWidth: 1,
      borderColor: '#1D1F28',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    searchField: {
      flex: 1,
      color: '#fff',
      fontSize: 14,
    },
    inlineClearBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#14161D',
    },
    controlsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },
    selectControl: {
      width: '48.5%',
      backgroundColor: '#0A0C11',
      borderWidth: 1,
      borderColor: '#1D1F28',
      borderRadius: 16,
      padding: 12,
    },
    selectControlFull: {
      width: '100%',
    },
    selectLabel: {
      color: '#687083',
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 7,
    },
    selectValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    selectValue: {
      flex: 1,
      color: '#F3F5F8',
      fontSize: 13,
      fontWeight: '700',
    },
    paymentRow: {
      flexDirection: 'row',
      gap: 5,
      marginTop: 14,
    },
    paymentButton: {
      flex: 1,
      height: 40,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: '#0A0C11',
      borderWidth: 1,
      borderColor: '#1D1F28',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    paymentButtonActive: {
      borderColor: '#343948',
    },
    paymentButtonCash: {
      backgroundColor: 'rgba(91, 227, 139, 0.18)',
      borderColor: 'rgba(91, 227, 139, 0.42)',
    },
    paymentButtonTransfer: {
      backgroundColor: hexToRgba(theme.primary, 0.18),
      borderColor: hexToRgba(theme.primary, 0.42),
    },
    paymentButtonText: {
      color: '#8E96A8',
      fontSize: 10,
      fontWeight: '800',
    },
    paymentButtonTextActive: {
      color: '#08110B',
    },
    resultsHeader: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 12,
      marginBottom: 12,
    },
    resultsHeaderActions: {
      width: '100%',
      alignItems: 'stretch',
      gap: 10,
    },
    exportButtonsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'flex-start',
    },
    resultsTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '900',
    },
    resultsSubtitle: {
      color: '#727A8D',
      fontSize: 12,
      marginTop: 4,
    },
    resultsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: '#101115',
      borderWidth: 1,
      borderColor: '#1D1F28',
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    exportButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: '#101115',
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.4),
      alignItems: 'center',
      justifyContent: 'center',
    },
    exportButtonGhost: {
      borderColor: '#1D1F28',
    },
    exportButtonText: {
      color: '#DDE3EE',
      fontSize: 11,
      fontWeight: '800',
    },
    resultsBadgeText: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '800',
      flexShrink: 1,
    },
    tableCard: {
      backgroundColor: '#101115',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: '#1D1F28',
      overflow: 'hidden',
      marginBottom: 10,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#14161D',
      borderBottomWidth: 1,
      borderBottomColor: '#1D1F28',
    },
    tableHeaderCell: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      justifyContent: 'center',
    },
    tableHeaderText: {
      color: '#7C8496',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#171922',
      minHeight: 62,
      backgroundColor: '#101115',
    },
    tableRowAlt: {
      backgroundColor: '#0D0F14',
    },
    tableCell: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    tableCellPrice: {
      alignItems: 'flex-end',
    },
    tableCellText: {
      color: '#9CA5B8',
      fontSize: 12,
      fontWeight: '600',
    },
    tableCellTextStrong: {
      color: '#fff',
      fontWeight: '600',
    },
    paymentBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    paymentBadgeCash: {
      backgroundColor: 'rgba(91, 227, 139, 0.10)',
      borderColor: 'rgba(91, 227, 139, 0.18)',
    },
    paymentBadgeTransfer: {
      backgroundColor: hexToRgba(theme.primary, 0.12),
      borderColor: hexToRgba(theme.primary, 0.24),
    },
    paymentBadgeText: {
      fontSize: 8,
      fontWeight: '600',
    },
    paymentBadgeTextCash: {
      color: '#5BE38B',
    },
    paymentBadgeTextTransfer: {
      color: theme.primary,
    },
    priceText: {
      color: '#F7A047',
      fontSize: 13,
      fontWeight: '900',
    },
    emptyState: {
      backgroundColor: '#101115',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: '#1D1F28',
      padding: 22,
      alignItems: 'center',
      marginTop: 10,
    },
    emptyTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    emptyText: {
      color: '#727A8D',
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 290,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
      padding: 16,
    },
    modalCard: {
      backgroundColor: '#111318',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#222632',
      maxHeight: '72%',
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    modalTitle: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
    },
    modalClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#171A22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalList: {
      paddingBottom: 10,
    },
    modalOption: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#1A1E28',
    },
    modalOptionText: {
      color: '#E6EAF1',
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default CustomerHistoryScreen;
