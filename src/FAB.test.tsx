// FAB.test.jsx — Tests for Floating Action Button
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import FAB from './FAB.tsx';

describe('FAB', () => {
  let $: any;

  beforeEach(() => {
    $ = {
      simulaSt: false,
      isProf: true,
      setEditMode: () => {},
      setForm: () => {},
      setShowModal: () => {},
    };
  });

  function renderFAB(props = {}) {
    const merged = Object.assign({}, $, props);
    return render(React.createElement(FAB, { $: merged }));
  }

  it('renders the + button when simulaSt is false', () => {
    renderFAB();
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toBe('+');
  });

  it('hides when simulaSt is true', () => {
    const { container } = renderFAB({ simulaSt: true });
    expect(container.firstChild).toBeNull();
  });

  it('has correct title for prof', () => {
    renderFAB({ isProf: true });
    expect(screen.getByTitle('Nuova card')).toBeInTheDocument();
  });

  it('has correct title for student', () => {
    renderFAB({ isProf: false });
    expect(screen.getByTitle('Proponi card')).toBeInTheDocument();
  });

  it('calls form and modal setup on click', () => {
    let modalShown = false;
    renderFAB({
      setShowModal: (v: any) => {
        modalShown = v;
      },
    });
    fireEvent.click(screen.getByRole('button'));
    expect(modalShown).toBe(true);
  });
});
