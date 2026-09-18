import { ImageResponse } from "next/og";

/**
 * App-ikonene tegnes som rektangler i stedet for tekst, slik at vi slipper å
 * laste inn en font for å generere dem.
 *
 * Stavene står inntil hverandre og har samme farge, slik at de leses som én
 * sammenhengende trapp framfor et stolpediagram. Det tåler også 16 piksler i
 * en nettleserfane, der strektegningen på forsiden ville blitt grøt.
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
          gap: 0,
          background: "#059669",
          borderRadius: size * 0.18,
          paddingBottom: unit * 3,
        }}
      >
        {steps.map((height, index) => (
          <div
            key={index}
            style={{
              width: unit * 2,
              height: unit * height * 0.78,
              background: "#ffffff",
              borderTopLeftRadius: unit * 0.3,
              borderTopRightRadius:
                index === steps.length - 1 ? unit * 0.3 : 0,
            }}
          />
        ))}
      </div>
    ),
    { width: size, height: size },
  );
}
