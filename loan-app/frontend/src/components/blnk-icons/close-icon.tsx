import type { SVGProps } from "react";

export default function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 8.16l2.9 2.9a.82.82 0 101.16-1.16L8.16 7l2.9-2.9A.82.82 0 009.9 2.94L7 5.84l-2.9-2.9A.82.82 0 102.94 4.1L5.84 7l-2.9 2.9a.82.82 0 101.16 1.16L7 8.16z"
        fill={props.fill ?? "#566873"}
      />
    </svg>
  );
}
