import type { SVGProps } from "react";

export default function CustomCoinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || 120}
      height={props.height || 120}
      viewBox="0 0 120 120"
      fill="none"
    >
      <path
        d="M60.0001 113.243C89.4053 113.243 113.243 89.4053 113.243 60.0001C113.243 30.5949 89.4053 6.75732 60.0001 6.75732C30.5949 6.75732 6.75732 30.5949 6.75732 60.0001C6.75732 89.4053 30.5949 113.243 60.0001 113.243Z"
        fill="#D95043"
        stroke="#FB6153"
        strokeWidth="4"
      />
      <path
        d="M58.2365 29.3498C59.2879 28.5859 60.7124 28.5859 61.7638 29.3498L88.6056 48.8518C89.6569 49.6157 90.0961 50.9703 89.6945 52.2063L79.4425 83.76C79.0409 84.996 77.8887 85.8332 76.589 85.8332H43.4113C42.1116 85.8332 40.9594 84.996 40.5578 83.76L30.3058 52.2063C29.9042 50.9703 30.3434 49.6157 31.3947 48.8518L58.2365 29.3498Z"
        fill="white"
        stroke="#FB6153"
        strokeWidth="4"
      />
    </svg>
  );
}
