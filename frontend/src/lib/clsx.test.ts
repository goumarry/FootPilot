import { describe, it, expect } from 'vitest';
import { clsx } from './clsx';

describe('clsx', () => {
  it('joint plusieurs classes avec un espace', () => {
    expect(clsx('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('filtre les valeurs falsy', () => {
    expect(clsx('foo', undefined, null, false, 'bar')).toBe('foo bar');
  });

  it('retourne une chaîne vide si tout est falsy', () => {
    expect(clsx(undefined, null, false)).toBe('');
  });

  it('retourne la classe seule si un seul argument', () => {
    expect(clsx('solo')).toBe('solo');
  });
});
