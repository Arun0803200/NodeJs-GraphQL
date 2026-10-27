interface Props {
  type: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
}

export function Alert({ type, message, onDismiss }: Props) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      {onDismiss && <button className="alert-dismiss" onClick={onDismiss}>&times;</button>}
    </div>
  );
}
