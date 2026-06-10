import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('affiche le texte enfant', () => {
    render(<Button>Connexion</Button>);
    expect(screen.getByRole('button', { name: /connexion/i })).toBeInTheDocument();
  });

  it('est désactivé quand disabled=true', () => {
    render(<Button disabled>Valider</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('est désactivé et affiche le loader quand loading=true', () => {
    render(<Button loading>Envoi</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // Le composant Loader2 de lucide-react est un svg
    expect(btn.querySelector('svg')).not.toBeNull();
  });

  it('applique la classe w-full quand full=true', () => {
    render(<Button full>Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('applique la variante danger', () => {
    render(<Button variant="danger">Supprimer</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-red-600');
  });
});
