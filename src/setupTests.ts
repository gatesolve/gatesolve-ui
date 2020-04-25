// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/extend-expect";

// jest.mock('mapbox-gl');

// For @urbica/react-map-gl
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global.process as any).browser = true;

// For mapbox-gl-js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window.URL as any).createObjectURL = (): void => {};
