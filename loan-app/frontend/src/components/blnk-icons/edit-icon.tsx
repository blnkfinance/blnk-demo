import type { SVGProps } from "react";

export default function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path
        d="M10.828 10.828a.547.547 0 01.064 1.09l-.064.004H7a.547.547 0 01-.064-1.09L7 10.828h3.828zM9.24 2.826a1.367 1.367 0 012 1.862l-.067.071-5.958 5.96a.818.818 0 01-.175.133l-.066.033-2.08.946a.548.548 0 01-.747-.67l.022-.055.946-2.08a.82.82 0 01.117-.187l.049-.054 5.96-5.96z"
        fill={props.fill || "#566873"}
      />
    </svg>
  );
}
