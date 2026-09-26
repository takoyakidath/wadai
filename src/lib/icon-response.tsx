import { ImageResponse } from "next/og";

export function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  // maskable アイコンは端末側でクロップされるため、内側に安全マージンを持たせる。
  const emojiSize = maskable ? size * 0.42 : size * 0.55;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
        }}
      >
        <span style={{ fontSize: emojiSize }}>🎲</span>
      </div>
    ),
    { width: size, height: size },
  );
}
