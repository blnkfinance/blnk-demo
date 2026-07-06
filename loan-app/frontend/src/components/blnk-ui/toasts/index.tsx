import type { ReactNode } from "react";
import ToastCreatedIcon from "@/components/blnk-icons/toast-created-icon";
import ToastFailedIcon from "@/components/blnk-icons/toast-failed-icon";

type ToastContentProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

function ToastContent({
  title,
  description,
  action,
  icon,
}: ToastContentProps & { icon: ReactNode }) {
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <div
      className={`flex gap-4 bg-platform-main-bg ${description ? "items-start" : "items-center"}`}
    >
      <div>{icon}</div>
      <div>
        <h1
          className={`text-sm font-medium text-platform-primary-text ${
            description ? "mb-2" : "mb-0 leading-[120%]"
          }`}
        >
          {capitalizedTitle}
        </h1>
        {description ? (
          <p className="text-sm font-normal leading-tight text-platform-nav-text">
            {description}
          </p>
        ) : null}
        {action}
      </div>
    </div>
  );
}

export function SuccessToast({ title, description, action }: ToastContentProps) {
  return (
    <ToastContent
      title={title}
      description={description}
      action={action}
      icon={<ToastCreatedIcon />}
    />
  );
}

export function FailureToast({ title, description, action }: ToastContentProps) {
  return (
    <ToastContent
      title={title}
      description={description}
      action={action}
      icon={<ToastFailedIcon />}
    />
  );
}
