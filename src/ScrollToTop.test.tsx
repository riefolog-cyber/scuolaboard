// ScrollToTop.test.tsx — il pulsante compare solo dopo 600 px e riporta in cima.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ScrollToTop from './ScrollToTop.tsx';

var scrollY = 0;

beforeEach(function () {
  scrollY = 0;
  // jsdom non fa scorrere nulla: `scrollY` è un getter e va ridefinito.
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: function () {
      return scrollY;
    },
  });
});

afterEach(function () {
  vi.restoreAllMocks();
});

function scrolla(y: number) {
  scrollY = y;
  window.dispatchEvent(new Event('scroll'));
}

describe('ScrollToTop', function () {
  it('non compare prima dei 600 px di scroll', function () {
    render(<ScrollToTop />);
    expect(screen.queryByRole('button', { name: 'Torna in cima' })).toBeNull();
    act(function () {
      scrolla(300);
    });
    expect(screen.queryByRole('button', { name: 'Torna in cima' })).toBeNull();
  });

  it('compare dopo 600 px e riporta in cima', function () {
    var scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });
    render(<ScrollToTop />);
    act(function () {
      scrolla(900);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Torna in cima' }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ top: 0 });
  });
});
