import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./chatGPTUIComponents";
import "./PageHeader.css";

type PageHeaderProps = {
  title: string;
  backTo?: string;
  children?: ReactNode;
};

function PageHeader({ title, backTo = "/", children }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="page-header-bar">
      <div className="page-header-bar__inner">
        <Button
          type="button"
          onClick={() => navigate(backTo)}
          variant="primary"
          className="page-header-bar__back !bg-gray-600 hover:!bg-gray-700 shrink-0"
        >
          ← Back to Home
        </Button>
        <h1 className="page-header-bar__title">{title}</h1>
        {children ? (
          <div className="page-header-bar__actions">{children}</div>
        ) : null}
      </div>
    </header>
  );
}

export default PageHeader;
