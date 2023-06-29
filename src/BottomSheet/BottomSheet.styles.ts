import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {},
  sheetContainer: {
    height: "100%",
    paddingTop: 48,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: "hidden",
    backgroundColor: "white",
  },
  handleContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    zIndex: 1,
  },
  handleIcon: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: "white",
    overflow: "hidden",
  },
  bottomCover: {
    backgroundColor: "white",
  },
});
