window.Input = {
  left: false,
  right: false,
  touchAxis: 0,
  isTouching: false,
  onStart: null,
  onJump: null,
  onRestart: null,
  onPauseToggle: null,

  getAxis() {
    let keyboardAxis = (this.right ? 1 : 0) - (this.left ? 1 : 0);
    if (this.isTouching) {
      return this.touchAxis;
    }
    return keyboardAxis;
  }
};

function setKey(code, pressed) {
  if (code === "ArrowLeft" || code === "KeyA") Input.left = pressed;
  if (code === "ArrowRight" || code === "KeyD") Input.right = pressed;
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyW", "KeyA", "KeyD", "Enter"].includes(event.code)) {
    event.preventDefault();
  }

  // Audio start on first interaction
  if (window.soundManager) window.soundManager.init();

  if (event.code === "Enter" || event.code === "Space") {
    if (Input.onStart) {
      const handled = Input.onStart();
      if (handled) return;
    }
  }

  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    if (Input.onJump) Input.onJump();
  }

  if (event.code === "KeyR") {
    if (Input.onRestart) Input.onRestart();
  }

  if (event.code === "KeyP" || event.code === "Escape") {
    if (Input.onPauseToggle) Input.onPauseToggle();
  }

  setKey(event.code, true);
});

window.addEventListener("keyup", (event) => {
  setKey(event.code, false);
});

// Touch and Pointer Button bindings
function bindDirectionButton(id, direction) {
  const button = document.getElementById(id);
  if (!button) return;

  const press = (event) => {
    event.preventDefault();
    if (window.soundManager) window.soundManager.init();
    Input[direction] = true;
  };

  const release = (event) => {
    event.preventDefault();
    Input[direction] = false;
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

bindDirectionButton("leftButton", "left");
bindDirectionButton("rightButton", "right");

const jumpBtn = document.getElementById("jumpButton");
if (jumpBtn) {
  jumpBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (window.soundManager) window.soundManager.init();
    if (Input.onJump) Input.onJump();
  });
}

// Canvas Touch Drag Steering
let touchStartX = 0;
const canvas = document.getElementById("gameCanvas");

if (canvas) {
  canvas.addEventListener("pointerdown", (e) => {
    if (window.soundManager) window.soundManager.init();
    Input.isTouching = true;
    touchStartX = e.clientX;
    Input.touchAxis = 0;
  });

  window.addEventListener("pointermove", (e) => {
    if (!Input.isTouching) return;
    const dx = e.clientX - touchStartX;
    const maxDrag = Math.min(150, window.innerWidth * 0.25);
    Input.touchAxis = Math.max(-1, Math.min(1, dx / maxDrag));
  });

  const stopTouch = () => {
    Input.isTouching = false;
    Input.touchAxis = 0;
  };

  window.addEventListener("pointerup", stopTouch);
  window.addEventListener("pointercancel", stopTouch);
}
