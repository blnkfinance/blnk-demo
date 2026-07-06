import type { SVGProps } from "react";

export default function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.438 9.57a.62.62 0 01-.876 0l-1.75-1.751a.62.62 0 01.437-1.057h3.502a.619.619 0 01.438 1.057l-1.751 1.75z"
        fill={props.fill || "#566873"}
      />
    </svg>
  );
}
