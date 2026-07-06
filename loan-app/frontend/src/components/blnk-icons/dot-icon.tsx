import type { SVGProps } from "react";

export default function DotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M8 11a2.937 2.937 0 01-1.519-.403 3.15 3.15 0 01-1.078-1.088A2.92 2.92 0 015 8c0-.556.134-1.06.403-1.51a3.047 3.047 0 011.078-1.087A2.937 2.937 0 018 5c.55 0 1.05.134 1.5.403.456.269.819.631 1.088 1.088.275.45.412.953.412 1.509 0 .55-.137 1.053-.412 1.51-.27.45-.632.812-1.088 1.087A2.87 2.87 0 018 11z"
        fill={props.fill || "#566873"}
      />
    </svg>
  );
}
