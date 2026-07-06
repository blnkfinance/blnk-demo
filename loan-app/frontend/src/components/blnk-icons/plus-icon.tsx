import type { SVGProps } from "react";

export default function PlusIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M8 1.75a6.25 6.25 0 110 12.5 6.25 6.25 0 010-12.5zm0 3.125a.625.625 0 00-.62.552l-.005.073v1.875H5.5a.625.625 0 00-.073 1.246l.073.004h1.875V10.5a.625.625 0 001.246.073l.004-.073V8.625H10.5a.625.625 0 00.073-1.246l-.073-.004H8.625V5.5A.625.625 0 008 4.875z"
        fill={props.fill || "#E6F5FF"}
      />
    </svg>
  );
}
