import type { SVGProps } from "react";

export default function CopyIcon(props: SVGProps<SVGSVGElement>) {
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.125 1.75A1.25 1.25 0 004.875 3v1.25h1.25V3H13v6.875h-1.25v1.25H13a1.25 1.25 0 001.25-1.25V3A1.25 1.25 0 0013 1.75H6.125zM3 4.875a1.25 1.25 0 00-1.25 1.25V13A1.25 1.25 0 003 14.25h6.875a1.25 1.25 0 001.25-1.25V6.125a1.25 1.25 0 00-1.25-1.25H3z"
        fill={props.fill || "#566873"}
      />
    </svg>
  );
}
