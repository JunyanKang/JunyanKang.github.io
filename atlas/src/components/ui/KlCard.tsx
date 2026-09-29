import React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

type KlCardProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

export const KlCard = ({ children, ...rest }: KlCardProps) => {
  return React.createElement('kl-card', rest, children);
};
