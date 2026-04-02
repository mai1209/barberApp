import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  visible: boolean;
  title: string;
  value: string;
  swatches?: string[];
  onClose: () => void;
  onConfirm: (value: string) => void;
};

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

type BoxLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeHex(value: string) {
  const raw = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw;
  return '#FF1493';
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).replace('#', '');
  const intValue = Number.parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function hsvToHex({ h, s, v }: HsvColor) {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = v - chroma;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = chroma;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = chroma;
  } else if (hue < 180) {
    g = chroma;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = chroma;
  } else if (hue < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return rgbToHex((r + match) * 255, (g + match) * 255, (b + match) * 255);
}

function hexToHsv(hex: string): HsvColor {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export default function ColorPickerModal({
  visible,
  title,
  value,
  swatches = [],
  onClose,
  onConfirm,
}: Props) {
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(value));
  const [squareLayout, setSquareLayout] = useState<BoxLayout>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const [hueLayout, setHueLayout] = useState<BoxLayout>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const squareRef = useRef<View | null>(null);
  const hueRef = useRef<View | null>(null);

  useEffect(() => {
    if (visible) {
      setHsv(hexToHsv(value));
    }
  }, [visible, value]);

  const currentColor = useMemo(() => hsvToHex(hsv), [hsv]);
  const baseHueColor = useMemo(
    () =>
      hsvToHex({
        h: hsv.h,
        s: 1,
        v: 1,
      }),
    [hsv.h],
  );

  const measureTarget = (target: View | null, setter: (layout: BoxLayout) => void) => {
    if (!target) return;
    target.measureInWindow((x, y, width, height) => {
      setter({
        x,
        y,
        width: width || 1,
        height: height || 1,
      });
    });
  };

  const refreshLayouts = () => {
    measureTarget(squareRef.current, setSquareLayout);
    measureTarget(hueRef.current, setHueLayout);
  };

  const updateSquareFromTouch = (x: number, y: number) => {
    setHsv(current => ({
      ...current,
      s: clamp(x / squareLayout.width, 0, 1),
      v: 1 - clamp(y / squareLayout.height, 0, 1),
    }));
  };

  const updateHueFromTouch = (x: number) => {
    setHsv(current => ({
      ...current,
      h: clamp(x / hueLayout.width, 0, 1) * 360,
    }));
  };

  const updateSquareFromPage = (pageX: number, pageY: number) => {
    updateSquareFromTouch(pageX - squareLayout.x, pageY - squareLayout.y);
  };

  const updateHueFromPage = (pageX: number) => {
    updateHueFromTouch(pageX - hueLayout.x);
  };

  const squareResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => {
        updateSquareFromPage(event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
      onPanResponderMove: event => {
        updateSquareFromPage(event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
    }),
  ).current;

  const hueResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => {
        updateHueFromPage(event.nativeEvent.pageX);
      },
      onPanResponderMove: event => {
        updateHueFromPage(event.nativeEvent.pageX);
      },
    }),
  ).current;

  const markerLeft = clamp(hsv.s * squareLayout.width, 0, squareLayout.width);
  const markerTop = clamp((1 - hsv.v) * squareLayout.height, 0, squareLayout.height);
  const hueLeft = clamp((hsv.h / 360) * hueLayout.width, 0, hueLayout.width);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={refreshLayouts}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <View
            ref={squareRef}
            style={styles.squareWrap}
            onLayout={() => refreshLayouts()}
            {...squareResponder.panHandlers}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="whiteOverlay" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="blackOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx="18" fill={baseHueColor} />
              <Rect x="0" y="0" width="100%" height="100%" rx="18" fill="url(#whiteOverlay)" />
              <Rect x="0" y="0" width="100%" height="100%" rx="18" fill="url(#blackOverlay)" />
            </Svg>

            <View
              pointerEvents="none"
              style={[
                styles.pickerMarker,
                {
                  left: markerLeft - 11,
                  top: markerTop - 11,
                },
              ]}
            />
          </View>

          <View
            ref={hueRef}
            style={styles.hueWrap}
            onLayout={() => refreshLayouts()}
            {...hueResponder.panHandlers}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="hueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FF0000" />
                  <Stop offset="17%" stopColor="#FFFF00" />
                  <Stop offset="33%" stopColor="#00FF00" />
                  <Stop offset="50%" stopColor="#00FFFF" />
                  <Stop offset="67%" stopColor="#0000FF" />
                  <Stop offset="83%" stopColor="#FF00FF" />
                  <Stop offset="100%" stopColor="#FF0000" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx="10" fill="url(#hueGradient)" />
            </Svg>

            <View
              pointerEvents="none"
              style={[
                styles.hueMarker,
                {
                  left: hueLeft - 10,
                },
              ]}
            />
          </View>

          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, { backgroundColor: currentColor }]} />
            <Text style={styles.hexText}>{currentColor}</Text>
          </View>

          {swatches.length ? (
            <View style={styles.swatchesWrap}>
              {swatches.map(swatch => (
                <Pressable
                  key={swatch}
                  style={[
                    styles.swatchChip,
                    {
                      backgroundColor: swatch,
                      borderColor: currentColor === swatch ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                      borderWidth: currentColor === swatch ? 2 : 1,
                    },
                  ]}
                  onPress={() => setHsv(hexToHsv(swatch))}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={styles.confirmBtn}
              onPress={() => {
                onConfirm(currentColor);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Hecho</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: '#F4F4F4',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  squareWrap: {
    height: 210,
    borderRadius: 18,
    overflow: 'hidden',
  },
  pickerMarker: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  hueWrap: {
    height: 18,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 16,
  },
  hueMarker: {
    position: 'absolute',
    top: -3,
    width: 20,
    height: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  previewSwatch: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 12,
  },
  hexText: {
    color: '#F3F3F3',
    fontSize: 16,
    fontWeight: '700',
  },
  swatchesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  swatchChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
  },
  cancelText: {
    color: '#E4E4E4',
    fontWeight: '700',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#34C759',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
