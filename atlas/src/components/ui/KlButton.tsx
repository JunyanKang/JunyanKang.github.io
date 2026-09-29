import React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

type KlButtonProps = HTMLAttributes<HTMLElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children?: ReactNode;
};

export const KlButton = ({ children, disabled, ...rest }: KlButtonProps) => {
  const props = disabled ? { ...rest, disabled: true } : rest;
  return React.createElement('kl-button', props, children);
};
