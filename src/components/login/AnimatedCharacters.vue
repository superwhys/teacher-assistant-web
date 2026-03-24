<template>
  <div class="animated-characters" :style="containerStyle">
    <div ref="purpleRef" class="character" :style="purpleStyle">
      <div class="eyes" :style="purpleEyesStyle">
        <div ref="purpleLeftEyeRef" class="eyeball" :style="purpleEyeBallStyle">
          <div v-if="!isPurpleBlinking" class="pupil" :style="purpleLeftPupilStyle" />
        </div>
        <div ref="purpleRightEyeRef" class="eyeball" :style="purpleEyeBallStyle">
          <div v-if="!isPurpleBlinking" class="pupil" :style="purpleRightPupilStyle" />
        </div>
      </div>
    </div>

    <div ref="blackRef" class="character" :style="blackStyle">
      <div class="eyes" :style="blackEyesStyle">
        <div ref="blackLeftEyeRef" class="eyeball" :style="blackEyeBallStyle">
          <div v-if="!isBlackBlinking" class="pupil" :style="blackLeftPupilStyle" />
        </div>
        <div ref="blackRightEyeRef" class="eyeball" :style="blackEyeBallStyle">
          <div v-if="!isBlackBlinking" class="pupil" :style="blackRightPupilStyle" />
        </div>
      </div>
    </div>

    <div ref="orangeRef" class="character" :style="orangeStyle">
      <div class="eyes" :style="orangeEyesStyle">
        <div ref="orangeLeftEyeRef" class="pupil" :style="orangeLeftPupilStyle" />
        <div ref="orangeRightEyeRef" class="pupil" :style="orangeRightPupilStyle" />
      </div>
    </div>

    <div ref="yellowRef" class="character" :style="yellowStyle">
      <div class="eyes" :style="yellowEyesStyle">
        <div ref="yellowLeftEyeRef" class="pupil" :style="yellowLeftPupilStyle" />
        <div ref="yellowRightEyeRef" class="pupil" :style="yellowRightPupilStyle" />
      </div>
      <div class="mouth" :style="yellowMouthStyle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from "vue";

/** 动画组件输入参数。 */
interface AnimatedCharactersProps {
  isTyping?: boolean;
  showPassword?: boolean;
  passwordLength?: number;
}

const props = withDefaults(defineProps<AnimatedCharactersProps>(), {
  isTyping: false,
  showPassword: false,
  passwordLength: 0,
});

const mouseX = ref(0);
const mouseY = ref(0);

const isPurpleBlinking = ref(false);
const isBlackBlinking = ref(false);
const isLookingAtEachOther = ref(false);
const isPurplePeeking = ref(false);

const purpleRef = ref<HTMLElement | null>(null);
const blackRef = ref<HTMLElement | null>(null);
const yellowRef = ref<HTMLElement | null>(null);
const orangeRef = ref<HTMLElement | null>(null);

const purpleLeftEyeRef = ref<HTMLElement | null>(null);
const purpleRightEyeRef = ref<HTMLElement | null>(null);
const blackLeftEyeRef = ref<HTMLElement | null>(null);
const blackRightEyeRef = ref<HTMLElement | null>(null);
const orangeLeftEyeRef = ref<HTMLElement | null>(null);
const orangeRightEyeRef = ref<HTMLElement | null>(null);
const yellowLeftEyeRef = ref<HTMLElement | null>(null);
const yellowRightEyeRef = ref<HTMLElement | null>(null);

const isHidingPassword = computed(() => {
  return props.passwordLength > 0 && !props.showPassword;
});

const containerStyle: CSSProperties = {
  width: "550px",
  height: "400px",
  position: "relative",
};

/** 更新鼠标位置以驱动角色视线和形变。 */
function handleMouseMove(event: MouseEvent) {
  mouseX.value = event.clientX;
  mouseY.value = event.clientY;
}

/** 根据角色位置计算脸部偏移和身体倾斜。 */
function calculateBodyPosition(el: HTMLElement | null) {
  if (!el) {
    return { faceX: 0, faceY: 0, bodySkew: 0 };
  }

  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 3;

  const deltaX = mouseX.value - centerX;
  const deltaY = mouseY.value - centerY;

  const faceX = Math.max(-15, Math.min(15, deltaX / 20));
  const faceY = Math.max(-10, Math.min(10, deltaY / 30));
  const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

  return { faceX, faceY, bodySkew };
}

/** 根据眼睛或瞳孔锚点位置计算瞳孔偏移。 */
function calculatePupilOffset(
  el: HTMLElement | null,
  maxDistance: number,
  forceLookX?: number,
  forceLookY?: number,
) {
  if (forceLookX !== undefined && forceLookY !== undefined) {
    return { x: forceLookX, y: forceLookY };
  }

  if (!el) {
    return { x: 0, y: 0 };
  }

  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const deltaX = mouseX.value - centerX;
  const deltaY = mouseY.value - centerY;
  const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
  const angle = Math.atan2(deltaY, deltaX);

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
}

/** 启动随机眨眼循环。 */
function startBlinkLoop(target: typeof isPurpleBlinking) {
  let blinkTimer: number | null = null;
  let resetTimer: number | null = null;
  let stopped = false;

  const scheduleNext = () => {
    if (stopped) {
      return;
    }

    blinkTimer = window.setTimeout(() => {
      target.value = true;

      resetTimer = window.setTimeout(() => {
        target.value = false;
        scheduleNext();
      }, 150);
    }, Math.random() * 4000 + 3000);
  };

  scheduleNext();

  return () => {
    stopped = true;

    if (blinkTimer !== null) {
      window.clearTimeout(blinkTimer);
    }

    if (resetTimer !== null) {
      window.clearTimeout(resetTimer);
    }
  };
}

/** 触发输入时角色互看的短暂动画。 */
function triggerLookAtEachOther() {
  isLookingAtEachOther.value = true;

  const timer = window.setTimeout(() => {
    isLookingAtEachOther.value = false;
  }, 800);

  return () => {
    window.clearTimeout(timer);
  };
}

/** 启动明文密码状态下的偷看循环。 */
function startPeekLoop() {
  let peekTimer: number | null = null;
  let hideTimer: number | null = null;
  let stopped = false;

  const scheduleNext = () => {
    if (stopped) {
      return;
    }

    peekTimer = window.setTimeout(() => {
      isPurplePeeking.value = true;

      hideTimer = window.setTimeout(() => {
        isPurplePeeking.value = false;
        scheduleNext();
      }, 800);
    }, Math.random() * 3000 + 2000);
  };

  scheduleNext();

  return () => {
    stopped = true;

    if (peekTimer !== null) {
      window.clearTimeout(peekTimer);
    }

    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
    }

    isPurplePeeking.value = false;
  };
}

const purplePos = computed(() => calculateBodyPosition(purpleRef.value));
const blackPos = computed(() => calculateBodyPosition(blackRef.value));
const yellowPos = computed(() => calculateBodyPosition(yellowRef.value));
const orangePos = computed(() => calculateBodyPosition(orangeRef.value));

const purpleForcedPupil = computed(() => {
  if (props.passwordLength > 0 && props.showPassword) {
    return {
      x: isPurplePeeking.value ? 4 : -4,
      y: isPurplePeeking.value ? 5 : -4,
    };
  }

  if (isLookingAtEachOther.value) {
    return { x: 3, y: 4 };
  }

  return undefined;
});

const blackForcedPupil = computed(() => {
  if (props.passwordLength > 0 && props.showPassword) {
    return { x: -4, y: -4 };
  }

  if (isLookingAtEachOther.value) {
    return { x: 0, y: -4 };
  }

  return undefined;
});

const orangeForcedPupil = computed(() => {
  if (props.passwordLength > 0 && props.showPassword) {
    return { x: -5, y: -4 };
  }

  return undefined;
});

const yellowForcedPupil = computed(() => {
  if (props.passwordLength > 0 && props.showPassword) {
    return { x: -5, y: -4 };
  }

  return undefined;
});

const purpleStyle = computed(() => {
  const transform =
    props.passwordLength > 0 && props.showPassword
      ? "skewX(0deg)"
      : props.isTyping || isHidingPassword.value
        ? `skewX(${purplePos.value.bodySkew - 12}deg) translateX(40px)`
        : `skewX(${purplePos.value.bodySkew}deg)`;

  return {
    left: "70px",
    bottom: "0",
    width: "180px",
    height: props.isTyping || isHidingPassword.value ? "440px" : "400px",
    backgroundColor: "#6C3FF5",
    borderRadius: "10px 10px 0 0",
    zIndex: "1",
    transform,
    transformOrigin: "bottom center",
    transition: "all 700ms ease-in-out",
  };
});

const purpleEyesStyle = computed(() => {
  const left =
    props.passwordLength > 0 && props.showPassword
      ? 20
      : isLookingAtEachOther.value
        ? 55
        : 45 + purplePos.value.faceX;

  const top =
    props.passwordLength > 0 && props.showPassword
      ? 35
      : isLookingAtEachOther.value
        ? 65
        : 40 + purplePos.value.faceY;

  return {
    left: `${left}px`,
    top: `${top}px`,
    gap: "8px",
    transition: "all 700ms ease-in-out",
  };
});

const purpleEyeBallStyle = computed(() => {
  return {
    width: "18px",
    height: isPurpleBlinking.value ? "2px" : "18px",
    backgroundColor: "#ffffff",
    transition: "all 150ms ease",
  };
});

const purpleLeftPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    purpleLeftEyeRef.value,
    5,
    purpleForcedPupil.value?.x,
    purpleForcedPupil.value?.y,
  );

  return {
    width: "7px",
    height: "7px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const purpleRightPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    purpleRightEyeRef.value,
    5,
    purpleForcedPupil.value?.x,
    purpleForcedPupil.value?.y,
  );

  return {
    width: "7px",
    height: "7px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const blackStyle = computed(() => {
  const transform =
    props.passwordLength > 0 && props.showPassword
      ? "skewX(0deg)"
      : isLookingAtEachOther.value
        ? `skewX(${blackPos.value.bodySkew * 1.5 + 10}deg) translateX(20px)`
        : props.isTyping || isHidingPassword.value
          ? `skewX(${blackPos.value.bodySkew * 1.5}deg)`
          : `skewX(${blackPos.value.bodySkew}deg)`;

  return {
    left: "240px",
    bottom: "0",
    width: "120px",
    height: "310px",
    backgroundColor: "#2D2D2D",
    borderRadius: "8px 8px 0 0",
    zIndex: "2",
    transform,
    transformOrigin: "bottom center",
    transition: "all 700ms ease-in-out",
  };
});

const blackEyesStyle = computed(() => {
  const left =
    props.passwordLength > 0 && props.showPassword
      ? 10
      : isLookingAtEachOther.value
        ? 32
        : 26 + blackPos.value.faceX;

  const top =
    props.passwordLength > 0 && props.showPassword
      ? 28
      : isLookingAtEachOther.value
        ? 12
        : 32 + blackPos.value.faceY;

  return {
    left: `${left}px`,
    top: `${top}px`,
    gap: "6px",
    transition: "all 700ms ease-in-out",
  };
});

const blackEyeBallStyle = computed(() => {
  return {
    width: "16px",
    height: isBlackBlinking.value ? "2px" : "16px",
    backgroundColor: "#ffffff",
    transition: "all 150ms ease",
  };
});

const blackLeftPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    blackLeftEyeRef.value,
    4,
    blackForcedPupil.value?.x,
    blackForcedPupil.value?.y,
  );

  return {
    width: "6px",
    height: "6px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const blackRightPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    blackRightEyeRef.value,
    4,
    blackForcedPupil.value?.x,
    blackForcedPupil.value?.y,
  );

  return {
    width: "6px",
    height: "6px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const orangeStyle = computed(() => {
  const transform =
    props.passwordLength > 0 && props.showPassword
      ? "skewX(0deg)"
      : `skewX(${orangePos.value.bodySkew}deg)`;

  return {
    left: "0",
    bottom: "0",
    width: "240px",
    height: "200px",
    backgroundColor: "#FF9B6B",
    borderRadius: "120px 120px 0 0",
    zIndex: "3",
    transform,
    transformOrigin: "bottom center",
    transition: "all 700ms ease-in-out",
  };
});

const orangeEyesStyle = computed(() => {
  const left =
    props.passwordLength > 0 && props.showPassword
      ? 50
      : 82 + orangePos.value.faceX;

  const top =
    props.passwordLength > 0 && props.showPassword
      ? 85
      : 90 + orangePos.value.faceY;

  return {
    left: `${left}px`,
    top: `${top}px`,
    gap: "8px",
    transition: "all 200ms ease-out",
  };
});

const orangeLeftPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    orangeLeftEyeRef.value,
    5,
    orangeForcedPupil.value?.x,
    orangeForcedPupil.value?.y,
  );

  return {
    width: "12px",
    height: "12px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const orangeRightPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    orangeRightEyeRef.value,
    5,
    orangeForcedPupil.value?.x,
    orangeForcedPupil.value?.y,
  );

  return {
    width: "12px",
    height: "12px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const yellowStyle = computed(() => {
  const transform =
    props.passwordLength > 0 && props.showPassword
      ? "skewX(0deg)"
      : `skewX(${yellowPos.value.bodySkew}deg)`;

  return {
    left: "310px",
    bottom: "0",
    width: "140px",
    height: "230px",
    backgroundColor: "#E8D754",
    borderRadius: "70px 70px 0 0",
    zIndex: "4",
    transform,
    transformOrigin: "bottom center",
    transition: "all 700ms ease-in-out",
  };
});

const yellowEyesStyle = computed(() => {
  const left =
    props.passwordLength > 0 && props.showPassword
      ? 20
      : 52 + yellowPos.value.faceX;

  const top =
    props.passwordLength > 0 && props.showPassword
      ? 35
      : 40 + yellowPos.value.faceY;

  return {
    left: `${left}px`,
    top: `${top}px`,
    gap: "6px",
    transition: "all 200ms ease-out",
  };
});

const yellowLeftPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    yellowLeftEyeRef.value,
    5,
    yellowForcedPupil.value?.x,
    yellowForcedPupil.value?.y,
  );

  return {
    width: "12px",
    height: "12px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const yellowRightPupilStyle = computed(() => {
  const offset = calculatePupilOffset(
    yellowRightEyeRef.value,
    5,
    yellowForcedPupil.value?.x,
    yellowForcedPupil.value?.y,
  );

  return {
    width: "12px",
    height: "12px",
    backgroundColor: "#2D2D2D",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 100ms ease-out",
  };
});

const yellowMouthStyle = computed(() => {
  const left =
    props.passwordLength > 0 && props.showPassword
      ? 10
      : 40 + yellowPos.value.faceX;

  const top =
    props.passwordLength > 0 && props.showPassword
      ? 88
      : 88 + yellowPos.value.faceY;

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: "80px",
    height: "4px",
    backgroundColor: "#2D2D2D",
    transition: "all 200ms ease-out",
  };
});

let stopPurpleBlink: (() => void) | null = null;
let stopBlackBlink: (() => void) | null = null;
let stopPeek: (() => void) | null = null;
let stopLookTimer: (() => void) | null = null;

watch(
  () => props.isTyping,
  (value) => {
    if (!value) {
      isLookingAtEachOther.value = false;

      if (stopLookTimer) {
        stopLookTimer();
        stopLookTimer = null;
      }

      return;
    }

    if (stopLookTimer) {
      stopLookTimer();
    }

    stopLookTimer = triggerLookAtEachOther();
  },
);

watch(
  (): [number, boolean] => [props.passwordLength, props.showPassword],
  ([length, show]) => {
    if (stopPeek) {
      stopPeek();
      stopPeek = null;
    }

    if (length > 0 && show) {
      stopPeek = startPeekLoop();
      return;
    }

    isPurplePeeking.value = false;
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("mousemove", handleMouseMove);
  stopPurpleBlink = startBlinkLoop(isPurpleBlinking);
  stopBlackBlink = startBlinkLoop(isBlackBlinking);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", handleMouseMove);

  if (stopPurpleBlink) {
    stopPurpleBlink();
  }

  if (stopBlackBlink) {
    stopBlackBlink();
  }

  if (stopPeek) {
    stopPeek();
  }

  if (stopLookTimer) {
    stopLookTimer();
  }
});
</script>

<style scoped>
.animated-characters {
  user-select: none;
}

.character {
  position: absolute;
  will-change: transform;
}

.eyes {
  position: absolute;
  display: flex;
  pointer-events: none;
}

.eyeball,
.pupil,
.mouth {
  flex-shrink: 0;
  border-radius: 999px;
}

.eyeball {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
