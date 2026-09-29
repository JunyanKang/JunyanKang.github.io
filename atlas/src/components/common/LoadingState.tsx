import { KlSpinner } from '../ui/KlSpinner.tsx';

export const LoadingState = ({ message = 'Loading content…' }: { message?: string }) => {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '36px 28px' }}>
      <KlSpinner style={{ marginBottom: '16px' }} />
      <p className="card__excerpt">{message}</p>
    </div>
  );
};
