import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter as Router } from "react-router-dom";
import App from "./App";

test("renders something", () => {
  const { getByTestId } = render(
    <Router>
      <App />
    </Router>
  );
  const appElement = getByTestId("app");
  expect(appElement).toBeInTheDocument();
});
