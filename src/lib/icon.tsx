import { ImageResponse } from "next/og";

/**
 * App-ikonene tegnes som rektangler i stedet for tekst, slik at vi slipper å
 * laste inn en font for å generere dem.
 */
export function renderIcon(size: number): ImageResponse {
  const unit = size / 16;
  const steps = [3, 5, 7, 9, 11];

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: unit * 0.35,
          background: "#059669",
          borderRadius: size * 0.18,
          paddingBottom: unit * 3,
        }}
      >
        {steps.map((height, index) => (
          <div
            key={index}
            style={{
              width: unit * 1.9,
              height: unit * height * 0.72,
              background: "#ffffff",
              borderRadius: unit * 0.25,
              opacity: 0.55 + index * 0.11,
            }}
          />
        ))}
      </div>
    ),
    { width: size, height: size },
  );
}
