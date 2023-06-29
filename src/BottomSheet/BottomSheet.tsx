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
  View,
  ViewStyle,
} from "react-native";
import { styles } from "./BottomSheet.styles";

export type BottomSheetProps = {
  visible: boolean;
  offsets?: { top?: number; right?: number; bottom?: number; left?: number };
  onOpened?: () => void;
  onClosed?: () => void;
  style?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  children: ReactElement;
};

export const BottomSheet = (props: BottomSheetProps) => {
  const { visible, offsets, onOpened, onClosed, style, sheetStyle, children } =
    props;

  const [containerLayout, setContainerLayout] = useState({
    width: 0,
    height: 0,
  });
  const containerLayoutRef = useRef({
    width: 0,
    height: 0,
  });
  containerLayoutRef.current.width = containerLayout.width;
  containerLayoutRef.current.height = containerLayout.height;

  const panAnimation = useRef(
    new Animated.ValueXY({ x: 0, y: Dimensions.get("window").height })
  ).current;
  const panOffset = useRef({ x: 0, y: 0 }).current;

  useLayoutEffect(() => {
    const listenerId = panAnimation.addListener((value) => {
      panOffset.x = -value.x;
      panOffset.y = -value.y;
    });
    return () => panAnimation.removeListener(listenerId);
  }, []);

  const handleOnOpened = useRef<BottomSheetProps["onClosed"]>();
  handleOnOpened.current = onOpened;
  const handleOnClosed = useRef<BottomSheetProps["onClosed"]>();
  handleOnClosed.current = onClosed;

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
        panAnimation.setValue({ x: 0, y: gestureState.dy });
      },
      onPanResponderEnd: (_event, gestureState) => {
        panAnimation.setValue({ x: 0, y: gestureState.dy });
        const threshold = containerLayoutRef.current.height / 2;
        if (-panOffset.y + 24 > threshold || gestureState.vy > 2) {
          Animated.spring(panAnimation, {
            toValue: { x: 0, y: Dimensions.get("window").height },
            overshootClamping: true,
            useNativeDriver: false,
          }).start(handleOnClosed.current);
        } else {
          Animated.spring(panAnimation, {
            toValue: { x: 0, y: 0 },
            overshootClamping: true,
            useNativeDriver: false,
          }).start();
        }
        panAnimation.flattenOffset();
      },
    })
  ).current;

  useEffect(() => {
    Animated.spring(panAnimation, {
      toValue: { x: 0, y: visible ? 0 : Dimensions.get("window").height },
      overshootClamping: true,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  const bottomCoverHeight = Dimensions.get("window").height;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          position: "absolute",
          top: offsets?.top ?? 0,
          right: offsets?.right ?? 0,
          bottom: offsets?.bottom ?? 0,
          left: offsets?.left ?? 0,
          transform: panAnimation.getTranslateTransform(),
        },
        style,
      ]}
    >
      <View
        style={[styles.sheetContainer, sheetStyle]}
        onLayout={(e) => {
          setContainerLayout({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          });
        }}
      >
        <View style={styles.handleContainer} {...panResponder.panHandlers}>
          <View style={styles.handleIcon} />
        </View>
        {children}
      </View>
      <View
        style={[
          styles.bottomCover,
          {
            position: "absolute",
            bottom: -bottomCoverHeight,
            right: 0,
            left: 0,
            height: bottomCoverHeight,
          },
        ]}
      />
    </Animated.View>
  );
};
