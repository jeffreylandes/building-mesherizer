import { Polyline } from "react-leaflet";

export type LineType = {
  latSrc: number;
  lngSrc: number;
  latDst: number;
  lngDst: number;
};

type Props = { height: string; width: string; line: LineType };

export function Line(props: Props) {
  const { latSrc, lngSrc, latDst, lngDst } = props.line;
  return (
    <Polyline
      pathOptions={{ color: "black" }}
      positions={[
        [latSrc, lngSrc],
        [latDst, lngDst],
      ]}
    />
  );
}
