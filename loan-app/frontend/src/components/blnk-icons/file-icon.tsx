import type { SVGProps } from "react";

export default function FileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      fill="none"
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <path
        fill={props.fill || "#566873"}
        d="M8 1.75v4.063a.937.937 0 00.848.933l.09.004H13V13a1.25 1.25 0 01-1.156 1.247l-.094.003h-7.5a1.25 1.25 0 01-1.247-1.156L3 13V3a1.25 1.25 0 011.156-1.247l.094-.003H8zm1.25.027c.202.043.39.135.548.269l.077.07 2.759 2.759c.146.146.254.327.313.525l.026.1H9.25V1.777z"
      />
    </svg>
  );
}
