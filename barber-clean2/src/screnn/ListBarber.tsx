import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { fetchBarbers, Barber } from "../services/api";

type Props = {
  navigation: any;
};

function ListBarber({ navigation }: Props) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  const handleRefresh = () => {
    setRefreshing(true);
    loadBarbers();
  };

  const handleOpenBarber = (barber: Barber) => {
    navigation.navigate("Barber-Home", {
      barberId: barber._id,
      barberName: barber.fullName,
    });
  };

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
              tintColor="#B89016"
            />
          }
        >
          {/* Header Unificado */}
          <View style={styles.header}>
            <Image style={styles.logo} source={require("../assets/LogoOrion.png")} />
            <Text style={styles.headerSubtitle}>EQUIPO PROFESIONAL</Text>
            <Text style={styles.headerTitle}>Barberos</Text>
          </View>

          <View style={styles.mainCard}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {loading && !barbers.length ? (
              <ActivityIndicator color="#B89016" style={{ marginVertical: 40 }} />
            ) : (
              <View style={styles.listContainer}>
                {barbers.map((barber) => (
                  <Pressable
                    key={barber._id}
                    style={({ pressed }) => [
                      styles.barberItem,
                      pressed && styles.barberItemPressed
                    ]}
                    onPress={() => handleOpenBarber(barber)}
                  >
                    <View style={styles.barberInfo}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {barber.fullName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.barberName}>{barber.fullName}</Text>
                        <Text style={styles.barberStatus}>En línea • Disponible</Text>
                      </View>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Botón para agregar más abajo */}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { paddingBottom: 60 },
  
  header: { 
    marginTop: Platform.OS === 'ios' ? 70 : 20 , 
    paddingHorizontal: 25, 
    alignItems: 'center',
    marginBottom: 20 
  },
  logo: { width: 50, height: 50, marginBottom: 15, resizeMode: 'contain' },
  headerSubtitle: { 
    color: "#B89016", 
    fontSize: 12, 
    fontWeight: "700", 
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 5 },

  mainCard: { 
    marginHorizontal: 15, 
    backgroundColor: "#1C1C1C", 
    borderRadius: 32, 
    padding: 20, 
    borderWidth: 1,
    borderColor: '#252525'
  },

  listContainer: { gap: 12 },

  barberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#252525",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  barberItemPressed: {
    borderColor: "#B89016",
    backgroundColor: "#2a2a2a",
  },
  barberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  avatarCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  avatarText: {
    color: "#B89016",
    fontSize: 18,
    fontWeight: "800",
  },
  barberName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  barberStatus: {
    color: "#666",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  chevron: {
    color: "#B89016",
    fontSize: 28,
    fontWeight: "300",
  },

  addBtn: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 25,
    borderWidth: 2,
    borderColor: "#B89016",
    alignItems: "center",
  },
  addBtnText: {
    color: "#B89016",
    fontSize: 15,
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
