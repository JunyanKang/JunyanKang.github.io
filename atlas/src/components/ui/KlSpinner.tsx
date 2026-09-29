import React from 'react';
import type { HTMLAttributes } from 'react';

type KlSpinnerProps = HTMLAttributes<HTMLElement>;

export const KlSpinner = (props: KlSpinnerProps) => {
  return React.createElement('kl-spinner', props);
};
