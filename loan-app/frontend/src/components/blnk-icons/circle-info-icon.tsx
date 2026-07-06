import type { SVGProps } from "react";

export default function CircleInfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      height={16}
      width={16}
      {...props}
    >
      <path
        d="M8 16a8 8 0 1 0 0 -16 8 8 0 1 0 0 16zm-1.25 -5.5h0.75v-2h-0.75c-0.415625 0 -0.75 -0.334375 -0.75 -0.75s0.334375 -0.75 0.75 -0.75h1.5c0.415625 0 0.75 0.334375 0.75 0.75v2.75h0.25c0.415625 0 0.75 0.334375 0.75 0.75s-0.334375 0.75 -0.75 0.75h-2.5c-0.415625 0 -0.75 -0.334375 -0.75 -0.75s0.334375 -0.75 0.75 -0.75zm1.25 -6.5a1 1 0 1 1 0 2 1 1 0 1 1 0 -2z"
        fill={props.fill || "#566873"}
        strokeWidth="0.0313"
      />
    </svg>
  );
}
