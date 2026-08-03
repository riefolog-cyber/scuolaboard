// LoginScreen.test.jsx — Tests for Login Screen
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import './LoginScreen.tsx';

describe('LoginScreen', () => {
  let $;

  beforeEach(() => {
    $ = {
      loginGoogle: vi.fn(),
    };
  });

  function renderLogin(props = {}) {
    const merged = Object.assign({}, $, props);
    return render(React.createElement(window.SB.LoginScreen, { $: merged }));
  }

  it('renders the SCUOLA BOARD branding', () => {
    renderLogin();
    expect(screen.getByText('SCUOLA')).toBeInTheDocument();
    expect(screen.getByText('BOARD')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    renderLogin();
    expect(screen.getByText('Bacheca digitale interattiva con AI')).toBeInTheDocument();
  });

  it('renders the Google login button', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /Accedi con Google/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls loginGoogle on button click', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /Accedi con Google/i });
    fireEvent.click(btn);
    expect($.loginGoogle).toHaveBeenCalled();
  });

  it('renders feature badges', () => {
    renderLogin();
    expect(screen.getByText('🤖 AI integrata')).toBeInTheDocument();
    expect(screen.getByText('🗳️ Sondaggi')).toBeInTheDocument();
    expect(screen.getByText('🧩 Quiz')).toBeInTheDocument();
    expect(screen.getByText('💬 Commenti')).toBeInTheDocument();
  });

  it('renders security message', () => {
    renderLogin();
    expect(screen.getByText('🔒 Accesso sicuro tramite Google')).toBeInTheDocument();
  });

  it('renders graduation cap emoji', () => {
    renderLogin();
    expect(screen.getByText('🎓')).toBeInTheDocument();
  });
});
