# Gatesolve

Gatesolve provides directions for door-to-door deliveries.
Whether you are driving a truck full of soda or delivering a meal,
we can help you find the correct entrance and the way there.

## Data sources

- Route calculations are done based on data from OpenStreetMap with the Planner.js library.
  The OpenStreetMap data is loaded in the Routable Tiles format as provided by Forum Virium Helsinki
  at https://tile.olmap.org/routable-tiles/

- Building entrance data is from OpenStreetMap and the OSM QA tiles as provided at https://tile.olmap.org/osm-qa-tiles/

- Address and POI search is based on OpenStreetMap and other data as provided by Digitransit's Pelias endpoint.

- Background map is based on OpenStreetMap as provided by Digitransit and the HSL map style.

## Getting started

```
yarn
yarn start
```

## Available commands

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn test-e2e`

Launches the test runner for end-to-end tests.
By default, the tests are run against [http://localhost:3000](http://localhost:3000),
so you should run `yarn start` in parallel.
Alternatively, you can set the environment variable `E2E_TEST_URL`, e.g.

```
E2E_TEST_URL=https://app.gatesolve.com yarn test-e2e
```

### `yarn prettier`

Formats the source code using Prettier's default settings.

### `yarn eslint`

Lints the source code using ESLint and our config at `.eslintrc.js`.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Create React App

This project uses [Create React App](https://github.com/facebook/create-react-app).

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
