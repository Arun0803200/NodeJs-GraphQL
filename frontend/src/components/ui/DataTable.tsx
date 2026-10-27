interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({ columns, data, onEdit, onDelete }: Props<T>) {
  if (!data || data.length === 0) {
    return <p className="empty-state">No records found.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="actions-cell">
                  {onEdit && <button className="btn btn-sm btn-secondary" onClick={() => onEdit(row)}>Edit</button>}
                  {onDelete && <button className="btn btn-sm btn-danger" onClick={() => onDelete(row)}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
