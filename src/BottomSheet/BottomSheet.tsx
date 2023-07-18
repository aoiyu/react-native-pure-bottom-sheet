import React, {
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
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

export type SnapStateType = {
  index: number;
  targets?: SnapTargetType[];
};

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
      return sheetHeight - contentHeight;
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
  const [contentHeight, setContentHeight] = useState(0);

  const panAnimation = useRef(
    new Animated.ValueXY({
      x: 0,
      y:
        snapState.targets[snapState.index] === "min"
          ? Dimensions.get("window").height
          : 0,
    })
  ).current;

  const panOffset = useRef({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const listenerId = panAnimation.addListener((value) => {
      panOffset.current = value;
    });
    return () => panAnimation.removeListener(listenerId);
  }, []);

  const handleOnPanResponderReleased = useCallback(() => {
    const index = convertPanOffsetToSnapIndex(
      { ...panOffset.current },
      snapState.targets,
      contentHeight,
      sheetHeight
    );
    Animated.timing(panAnimation, {
      toValue: {
        x: 0,
        y: convertSnapTargetToPanOffset(
          snapState.targets[index],
          contentHeight,
          sheetHeight
        ),
      },
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start((r) => {
      if (r.finished) {
        setSnapState((prevState) => ({
          ...prevState,
          index: index,
        }));
      }
    });
    panAnimation.flattenOffset();
  }, [snapState, contentHeight, sheetHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderStart: () => {
          panAnimation.stopAnimation();
          panAnimation.extractOffset();
        },
        onPanResponderMove: (_event, gestureState) => {
          panAnimation.setValue({ x: 0, y: gestureState.dy });
          if (panOffset.current.y < 0) {
            panAnimation.setOffset({ x: 0, y: -gestureState.dy });
          }
        },
        onPanResponderRelease: handleOnPanResponderReleased,
        onPanResponderTerminate: handleOnPanResponderReleased,
      }),
    [handleOnPanResponderReleased]
  );

  useLayoutEffect(() => {
    const snapTarget = snapState.targets[snapState.index];
    Animated.timing(panAnimation, {
      toValue: {
        x: 0,
        y: convertSnapTargetToPanOffset(snapTarget, contentHeight, sheetHeight),
      },
      easing: Easing.out(Easing.exp),
      duration: 500,
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
            if (snapState.targets[snapState.index] === "min") {
              panOffset.current.y = e.nativeEvent.layout.height;
            }
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
                setContentHeight(e.nativeEvent.layout.height + 48);
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  panAnimation.setValue({ x: 0, y: 100 });
                }}
              >
                <Text>translateY add</Text>
              </TouchableOpacity>
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
