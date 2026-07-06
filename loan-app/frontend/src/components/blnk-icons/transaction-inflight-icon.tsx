import type { SVGProps } from "react";

export default function TransactionInflightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width ?? 14}
      height={props.height ?? 14}
      viewBox="0 0 14 14"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.835 1C3.61242 1 1 3.61242 1 6.835C1 10.0576 3.61242 12.67 6.835 12.67C10.0576 12.67 12.67 10.0576 12.67 6.835C12.67 3.61242 10.0576 1 6.835 1ZM6.835 2.66714C4.53316 2.66714 2.66714 4.53316 2.66714 6.835C2.66714 7.9858 3.1341 9.02834 3.88788 9.78209C3.96604 9.86028 4.07205 9.90421 4.18259 9.90421C4.29313 9.90421 4.39914 9.86028 4.4773 9.78209L7.12971 7.12971C7.20787 7.05155 7.25179 6.94554 7.25179 6.835V3.08393C7.25179 2.85375 7.06518 2.66714 6.835 2.66714Z"
        fill={props.fill || "#FFCB2C"}
      />
    </svg>
  );
}
