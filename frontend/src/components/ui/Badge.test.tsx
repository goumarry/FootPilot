import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge, { RoleBadge, StatusBadge } from './Badge';

describe('Badge', () => {
  it('affiche le texte enfant', () => {
    render(<Badge>Actif</Badge>);
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('applique la variante green', () => {
    render(<Badge variant="green">OK</Badge>);
    expect(screen.getByText('OK')).toHaveClass('text-green-600');
  });
});

describe('RoleBadge', () => {
  it('affiche "Gestionnaire" pour le rôle GESTIONNAIRE', () => {
    render(<RoleBadge role="GESTIONNAIRE" />);
    expect(screen.getByText('Gestionnaire')).toBeInTheDocument();
  });

  it('affiche "Entraîneur" pour le rôle ENTRAINEUR', () => {
    render(<RoleBadge role="ENTRAINEUR" />);
    expect(screen.getByText('Entraîneur')).toBeInTheDocument();
  });

  it('affiche "Joueur" pour le rôle JOUEUR', () => {
    render(<RoleBadge role="JOUEUR" />);
    expect(screen.getByText('Joueur')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('affiche le label fourni', () => {
    render(<StatusBadge label="Confirmé" variant="success" />);
    expect(screen.getByText('Confirmé')).toBeInTheDocument();
  });

  it('applique la couleur rouge pour la variante error', () => {
    render(<StatusBadge label="Erreur" variant="error" />);
    expect(screen.getByText('Erreur')).toHaveClass('text-red-600');
  });
});
