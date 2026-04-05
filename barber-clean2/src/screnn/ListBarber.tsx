import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchBarbers, Barber, deleteBarber } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import type { Theme } from "../context/ThemeContext";
import { Pencil, Trash2 } from "lucide-react-native";
import { Swipeable } from "react-native-gesture-handler";

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized.length === 3 ? sanitized.repeat(2) : sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = {
  navigation: any;
};

function ListBarber({ navigation }: Props) {
  const { theme } = useTheme();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const openedSwipeableIdRef = useRef<string | null>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const loadBarbers = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await fetchBarbers();
      setBarbers(res.barbers);
      setError("");
    } catch (err: any) {
      setError(err?.message ?? "No pudimos cargar los barberos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  useFocusEffect(
    useCallback(() => {
      loadBarbers();
    }, [loadBarbers]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadBarbers();
  };

  const handleOpenBarber = (barber: Barber) => {
    navigation.navigate("Barber-Home", {
      barberId: barber._id,
      barberName: barber.fullName,
      barber,
    });
  };

  const handleEditBarber = (barber: Barber) => {
    navigation.navigate("Register-Employed", {
      barber,
    });
  };

  const handleDeleteBarber = (barber: Barber) => {
    Alert.alert(
      "Eliminar barbero",
      `Se va a desactivar a ${barber.fullName}. Ya no va a aparecer para cargar turnos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBarber(barber._id);
              setBarbers(prev => prev.filter(item => item._id !== barber._id));
            } catch (err: any) {
              setError(err?.message ?? "No se pudo eliminar el barbero");
            }
          },
        },
      ],
    );
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleSwipeableOpen = (barberId: string) => {
    const previousId = openedSwipeableIdRef.current;
    if (previousId && previousId !== barberId) {
      swipeableRefs.current[previousId]?.close();
    }
    openedSwipeableIdRef.current = barberId;
  };

  const renderRightActions = (barber: Barber) => (
    <Pressable
      style={styles.deleteSwipeAction}
      onPress={() => {
        swipeableRefs.current[barber._id]?.close();
        handleDeleteBarber(barber);
      }}
    >
      <Trash2 color="#fff" size={18} />
      <Text style={styles.deleteSwipeText}>Eliminar</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        >
          <View style={styles.header}>
            <Image style={styles.logo} source={theme.logo} />
            <Text style={[styles.headerSubtitle, { color: theme.primary }]}>EQUIPO PROFESIONAL</Text>
            <Text style={styles.headerTitle}>Barberos</Text>
          </View>

          <View style={styles.mainCard}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {loading && !barbers.length ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 40 }} />
            ) : (
              <View style={styles.listContainer}>
                {barbers.map((barber) => (
                  <Swipeable
                    key={barber._id}
                    ref={ref => {
                      swipeableRefs.current[barber._id] = ref;
                    }}
                    renderRightActions={() => renderRightActions(barber)}
                    overshootRight={false}
                    rightThreshold={36}
                    onSwipeableOpen={() => handleSwipeableOpen(barber._id)}
                    onSwipeableClose={() => {
                      if (openedSwipeableIdRef.current === barber._id) {
                        openedSwipeableIdRef.current = null;
                      }
                    }}
                  >
                    <View style={styles.barberItem}>
                      <View style={styles.barberMainAction}>
                        <View style={styles.barberInfo}>
                          <View style={styles.avatarCircle}>
                            {barber.photoUrl ? (
                              <Image
                                source={{ uri: barber.photoUrl }}
                                style={styles.avatarImage}
                              />
                            ) : (
                              <Text style={styles.avatarText}>
                                {barber.fullName.charAt(0).toUpperCase()}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.barberName} numberOfLines={1}>
                              {barber.fullName}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.barberActions}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.editBtn,
                              { opacity: pressed ? 0.5 : 1 }
                            ]}
                            onPress={() => handleEditBarber(barber)}
                          >
                            <Pencil size={12} color="#888" />
                            <Text style={styles.editBtnText}>Editar</Text>
                          </Pressable>

                          <Pressable
                            style={({ pressed }) => [
                              styles.openBtn,
                              pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                            ]}
                            onPress={() => handleOpenBarber(barber)}
                          >
                            <Text style={styles.openBtnText}>Abrir</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Swipeable>
                ))}
              </View>
            )}

            <Pressable
              style={styles.addBtn}
              onPress={() => navigation.navigate("Register-Employed")}
            >
              <Text style={styles.addBtnText}>+ Agregar nuevo barbero</Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 60 },
    
    header: { 
      marginTop: Platform.OS === 'ios' ? 70 : 20 , 
      paddingHorizontal: 25, 
      alignItems: 'center',
      marginBottom: 20 ,
                                                            
    },
    logo: { width: 50, height: 50, marginBottom: 15, resizeMode: 'contain' },
    headerSubtitle: { 
      color: theme.primary, 
      fontSize: 12, 
      fontWeight: "700", 
      letterSpacing: 2,
      textTransform: 'uppercase'
    },
    headerTitle: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 5 },

    mainCard: { 
      marginHorizontal: 15, 
      backgroundColor: theme.card, 
      borderRadius: 32, 
      padding: 20, 
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.15)
    },

    listContainer: { gap: 12 },

    barberItem: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#2a2a2a",
      overflow: 'hidden'
    },
    barberMainAction: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
    },
    barberInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    barberActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    avatarCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#1a1a1a",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#333",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: theme.primary,
      fontSize: 18,
      fontWeight: "800",
    },
    barberName: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    

    // BOTÓN EDITAR (Sutil)
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 10,
    },
    editBtnText: {
      color: "#888",
      fontSize: 12,
      fontWeight: "600",
    },

    // BOTÓN ABRIR (Principal)
    openBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 3,
    },
    openBtnText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
 

    deleteSwipeAction: {
      width: 90,
      borderRadius: 24,
      marginLeft: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#d64545",
      gap: 4,
    },
    deleteSwipeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "800",
    },

    addBtn: {
      backgroundColor: "transparent",
      paddingVertical: 16,
      borderRadius: 20,
      marginTop: 25,
      borderWidth: 1.5,
      borderColor: hexToRgba(theme.primary, 0.5),
      alignItems: "center",
    },
    addBtnText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    
    errorText: {
      color: "#ff8080",
      textAlign: "center",
      marginBottom: 15,
      fontWeight: '600'
    },
  });

export default ListBarber;
