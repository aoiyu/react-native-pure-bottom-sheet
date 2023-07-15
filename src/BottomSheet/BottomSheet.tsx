import React, {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { styles } from "./BottomSheet.styles";

export type BottomSheetProps = {
  offsets?: { top?: number; right?: number; bottom?: number; left?: number };
  onOpened?: () => void;
  onClosed?: () => void;
  style?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactElement;
  snap?: SnapStateType;
  defaultSnapTargets?: SnapTargetType[];
};

export type SnapStateType = { index: number; targets?: SnapTargetType[] };

export type SnapTargetType = "min" | "max" | "content";

type PanOffsetType = { x: number; y: number };

const convertSnapTargetToPanOffset = (
  target: SnapTargetType | undefined,
  contentHeight: number,
  sheetHeight: number
): number => {
  switch (target) {
    case "min":
      return sheetHeight;
    case "max":
      return 0;
    case "content":
      return sheetHeight - contentHeight - 48;
    default:
      return sheetHeight; // default close
  }
};

const convertPanOffsetToSnapIndex = (
  panOffset: PanOffsetType,
  targets: SnapTargetType[],
  contentHeight: number,
  sheetHeight: number
): number => {
  let minDiff = Number.MAX_SAFE_INTEGER;
  let minDiffIndex = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < targets.length; i++) {
    const targetValue = convertSnapTargetToPanOffset(
      targets[i],
      contentHeight,
      sheetHeight
    );
    const diff = Math.abs(targetValue - panOffset.y);
    if (diff < minDiff) {
      minDiff = diff;
      minDiffIndex = i;
    }
  }
  return minDiffIndex;
};

export const BottomSheet = (props: BottomSheetProps) => {
  const {
    offsets,
    onOpened,
    onClosed,
    style,
    sheetStyle,
    contentStyle,
    children,
    snap = { index: 0 },
    defaultSnapTargets = ["min", "max"],
  } = props;

  const [snapState, setSnapState] = useState({
    index: snap.index,
    targets: snap.targets ?? defaultSnapTargets,
  });
  useLayoutEffect(() => {
    setSnapState({
      index: snap.index,
      targets: snap.targets ?? defaultSnapTargets,
    });
  }, [snap]);

  const [sheetHeight, setSheetHeight] = useState(0);
  const sheetHeightRef = useRef(0);
  sheetHeightRef.current = sheetHeight;

  const [contentHeight, setContentHeight] = useState(0);
  const contentHeightRef = useRef(0);
  contentHeightRef.current = contentHeight;

  const panAnimation = useRef(
    new Animated.ValueXY({
      x: 0,
      y:
        snapState.targets[snapState.index] === "min"
          ? Dimensions.get("window").height
          : 0,
    })
  ).current; // todo: sheetのレイアウト後に再セットする

  const panOffset = useRef({ x: 0, y: 0 }).current;
  useLayoutEffect(() => {
    const listenerId = panAnimation.addListener((value) => {
      panOffset.x = value.x;
      panOffset.y = value.y <= 0 ? 0 : value.y;
    });
    return () => panAnimation.removeListener(listenerId);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panAnimation.extractOffset();
      },
      onPanResponderStart: (_event, gestureState) => {
        panAnimation.setValue({ x: 0, y: gestureState.dy });
      },
      onPanResponderMove: (_event, gestureState) => {
        // console.debug("pan", panOffset, gestureState.dy);
        if (panOffset.y >= 0) {
          panAnimation.setValue({
            x: 0,
            y: gestureState.dy,
          });
        }
      },
      onPanResponderEnd: (_event, gestureState) => {
        panAnimation.setValue({
          x: 0,
          y: panOffset.y > 0 ? gestureState.dy : 0,
        });
        // console.debug("pan", panOffset);
        setSnapState((prevState) => {
          const index = convertPanOffsetToSnapIndex(
            panOffset,
            prevState.targets,
            contentHeightRef.current,
            sheetHeightRef.current
          );
          console.debug("snap to index", index, prevState.targets[index]);
          return { ...prevState, index: index };
        });
        panAnimation.flattenOffset();
      },
    })
  ).current;

  useEffect(() => {
    const snapTarget = snapState.targets[snapState.index];
    const y = convertSnapTargetToPanOffset(
      snapTarget,
      contentHeight,
      sheetHeight
    );
    Animated.spring(panAnimation, {
      toValue: { x: 0, y: y },
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
    return () => panAnimation.stopAnimation();
  }, [snapState, sheetHeight, contentHeight]);

  /* Backdrop fade animation */
  const fadeAnimation = useRef(new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fadeAnimation.current, {
      toValue: snapState.targets[snapState.index] === "min" ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    return () => fadeAnimation.current.stopAnimation();
  }, [snapState]);

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents={"box-none"}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: fadeAnimation.current },
        ]}
        pointerEvents={"none"}
      />

      <View style={styles.sheetAnchor} pointerEvents={"box-none"}>
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              marginTop: offsets?.top,
              marginRight: offsets?.right,
              marginLeft: offsets?.left,
              marginBottom: offsets?.bottom,
              transform: [
                { translateX: panAnimation.x },
                {
                  translateY: Animated.diffClamp(
                    panAnimation.y,
                    0,
                    Number.MAX_SAFE_INTEGER
                  ),
                },
              ],
            },
            sheetStyle,
          ]}
          onLayout={(e) => {
            setSheetHeight(
              e.nativeEvent.layout.height + (offsets?.bottom ?? 0)
            );
          }}
        >
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={styles.handleIcon} />
          </View>
          {snapState.targets.includes("content") ? (
            <View
              onLayout={(e) => {
                setContentHeight(e.nativeEvent.layout.height);
              }}
            >
              {children}
            </View>
          ) : (
            children
          )}
        </Animated.View>
      </View>
    </View>
  );
};
