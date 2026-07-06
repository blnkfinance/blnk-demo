import type { SVGProps } from "react";

export default function EllipsisHorizontalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3.883 6.823a1.177 1.177 0 110 2.354 1.177 1.177 0 010-2.354zm4.117 0a1.176 1.176 0 110 2.353 1.176 1.176 0 010-2.353zm4.118 0a1.176 1.176 0 110 2.353 1.176 1.176 0 010-2.353z"
        fill={props.fill || "#566873"}
      />
    </svg>
  );
}
