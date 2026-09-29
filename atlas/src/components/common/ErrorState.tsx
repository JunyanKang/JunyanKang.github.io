import { KlButton } from '../ui/KlButton.tsx';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title = 'Something went wrong',
  description = 'We could not load the requested data. Please try again shortly.',
  onRetry
}: ErrorStateProps) => {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '28px 24px' }}>
      <h3 className="card__title">{title}</h3>
      <p className="card__excerpt">{description}</p>
      {onRetry ? (
        <div className="button-row" style={{ justifyContent: 'center', marginTop: '16px' }}>
          <KlButton variant="outline" onClick={onRetry}>
            Retry
          </KlButton>
        </div>
      ) : null}
    </div>
  );
};
