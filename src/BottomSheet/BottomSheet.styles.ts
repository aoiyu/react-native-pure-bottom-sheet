import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {},
  backdrop: {
    backgroundColor: "#00000070",
  },
  sheetAnchor: {
    height: "100%",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    flexShrink: 1,
    flexGrow: 1,
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
  },
  handleContainer: {
    width: "100%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "whitesmoke",
  },
  handleIcon: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: "gray",
    overflow: "hidden",
  },
});
