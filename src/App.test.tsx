import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders something', () => {
  const { getByTestId } = render(<App />);
  const appElement = getByTestId("app");
  expect(appElement).toBeInTheDocument();
});
