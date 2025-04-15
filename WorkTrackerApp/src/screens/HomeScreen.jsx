import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  Button,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions";
import { useNavigation } from "@react-navigation/native"; // Import useNavigation

const { width } = Dimensions.get("window");
const isSmallScreen = width < 600; // Adjust breakpoint as needed

const etapas = [
  { backend: "inProgress", display: "Purchase in Progress" },
  { backend: "installed", display: "Installing" },
  { backend: "firstInspectionPending", display: "Inspection Pending" },
  { backend: "coverPending", display: "Cover Pending" },
  { backend: "invoiceFinal", display: "Send Final Invoice" },
  { backend: "paymentReceived", display: "Payment Received" },
  { backend: "finalInspectionPending", display: "Final Inspection Pending" },
  { backend: "maintenance", display: "Maintenance" },
];

const HomeScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation(); // Use useNavigation to get the navigation object

  const { works, loading, error } = useSelector((state) => state.work);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  const animation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  useEffect(() => {
    setFilteredData(
      works.filter((work) =>
        work.propertyAddress.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [works, search]);

  const handleSearch = (text) => {
    setSearch(text);
  };

  const getProgressIndex = (status) =>
    etapas.findIndex((etapa) => etapa.backend === status);

  const getDisplayName = (status) => {
    const etapa = etapas.find((etapa) => etapa.backend === status);
    return etapa ? etapa.display : "Estado desconocido";
  };

  const filteredEtapas = etapas.filter(
    (etapa) =>
      etapa.backend !== "rejectedInspection" && etapa.backend !== "finalRejected"
  );

  // Function to start the pulsing animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 750,
          useNativeDriver: false,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 750,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  };

  useEffect(() => {
    startPulseAnimation();

    return () => {
      animation.stopAnimation();
    };
  }, []);

  const pulseStyle = {
    opacity: animation,
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por Dirección"
        value={search}
        onChangeText={handleSearch}
      />

      {loading && (
        <Text style={styles.loadingText}>Cargando obras...</Text>
      )}
      {error && <Text style={styles.errorText}>Error: {error}</Text>}

      {!loading &&
        !error &&
        filteredData.map(({ idWork, propertyAddress, status }) => (
          <Pressable
            key={idWork}
            style={styles.workItem}
            onPress={() => {
              console.log("Navigating with idWork:", idWork); // Add this line
              navigation.navigate("WorkDetail", { idWork });
            }} // Navigate to WorkDetail screen
          >
            <Text style={styles.addressText}>Address: {propertyAddress}</Text>

            {!isSmallScreen ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground} />
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: `${
                        (getProgressIndex(status) / (filteredEtapas.length - 1)) *
                        100
                      }%`,
                    },
                  ]}
                />

                {filteredEtapas.map((etapa, index) => (
                  <View
                    key={etapa.backend}
                    style={[
                      styles.progressStepContainer,
                      { width: `${100 / filteredEtapas.length}%` },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.progressCircle,
                        getProgressIndex(status) === index
                          ? styles.activeCircle
                          : getProgressIndex(status) > index
                          ? styles.completedCircle
                          : styles.pendingCircle,
                        getProgressIndex(status) === index ? pulseStyle : null,
                      ]}
                    >
                      <Text style={styles.circleText}>{index + 1}</Text>
                    </Animated.View>
                    <Text style={styles.stepText}>{etapa.display}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.mobileStatus}>
                <Text style={styles.mobileStatusText}>
                  Estado actual:{" "}
                  <Text style={styles.currentStatusText}>
                    {getDisplayName(status)}
                  </Text>
                </Text>
              </View>
            )}
          </Pressable>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    color: "blue",
    textAlign: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  workItem: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addressText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    marginTop: 20,
  },
  progressBarBackground: {
    backgroundColor: "#ddd",
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    transform: [{ translateY: -4 }],
  },
  progressBar: {
    backgroundColor: "green",
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: "50%",
    left: 0,
    transform: [{ translateY: -4 }],
  },
  progressStepContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  progressCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "gray",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  activeCircle: {
    backgroundColor: "green",
  },
  completedCircle: {
    backgroundColor: "green",
  },
  pendingCircle: {
    backgroundColor: "gray",
  },
  circleText: {
    color: "white",
    fontWeight: "bold",
  },
  stepText: {
    fontSize: 10,
    color: "gray",
    textAlign: "center",
    marginTop: 35,
    paddingHorizontal: 5,
  },
  mobileStatus: {
    marginTop: 10,
  },
  mobileStatusText: {
    fontSize: 14,
    color: "gray",
  },
  currentStatusText: {
    fontWeight: "bold",
    color: "green",
  },
});

export default HomeScreen;